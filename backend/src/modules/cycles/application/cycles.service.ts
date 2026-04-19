import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AcademicCycleRepository,
  CYCLES_HISTORY_PAGE_SIZE,
} from '@modules/cycles/infrastructure/academic-cycle.repository';
import { AuthSettingsService } from '@modules/auth/application/auth-settings.service';
import { AcademicCycle } from '@modules/cycles/domain/academic-cycle.entity';
import { plainToInstance } from 'class-transformer';
import {
  CyclesHistoryItemDto,
  CyclesHistoryResponseDto,
} from '@modules/cycles/dto/cycles-history.dto';
import { CycleFormDto } from '@modules/cycles/dto/cycle-form.dto';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { ENROLLMENT_CACHE_KEYS } from '@modules/enrollments/domain/enrollment.constants';

const CYCLE_ACTIVE_CACHE_GROUP = 'cache:cycle-active:*';

@Injectable()
export class CyclesService {
  private readonly logger = new Logger(CyclesService.name);

  constructor(
    private readonly academicCycleRepository: AcademicCycleRepository,
    private readonly authSettingsService: AuthSettingsService,
    private readonly cacheService: RedisCacheService,
  ) {}

  async findAll(): Promise<AcademicCycle[]> {
    return await this.academicCycleRepository.findAll();
  }

  async findOne(id: string): Promise<AcademicCycle> {
    const cycle = await this.academicCycleRepository.findById(id);
    if (!cycle) {
      this.logger.warn({
        message: 'Consulta de ciclo inexistente',
        cycleId: id,
        timestamp: new Date().toISOString(),
      });
      throw new NotFoundException('El ciclo académico solicitado no existe.');
    }
    return cycle;
  }

  async getActiveCycle(): Promise<AcademicCycle> {
    let activeCycleId: string;
    try {
      activeCycleId = await this.authSettingsService.getActiveCycleId();
    } catch {
      throw new NotFoundException(
        'No se ha podido identificar el ciclo activo del sistema.',
      );
    }

    const cycle = await this.findOne(activeCycleId);

    const endOfDay = new Date(cycle.endDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    if (endOfDay < new Date()) {
      this.logger.warn({
        message: 'Ciclo vigente expirado — transición lazy a histórico',
        cycleId: cycle.id,
        code: cycle.code,
        endDate: cycle.endDate,
        timestamp: new Date().toISOString(),
      });
      try {
        await this.authSettingsService.clearActiveCycleId();
      } catch (clearError) {
        this.logger.error({
          message:
            'No se pudo limpiar ACTIVE_CYCLE_ID tras detectar expiración',
          cycleId: cycle.id,
          error:
            clearError instanceof Error
              ? clearError.message
              : 'Error desconocido',
          timestamp: new Date().toISOString(),
        });
      }
      throw new NotFoundException(
        'El ciclo académico vigente ha concluido. Configure un nuevo ciclo para continuar.',
      );
    }

    return cycle;
  }

  async updateActiveCycle(dto: CycleFormDto): Promise<AcademicCycle> {
    const cycle = await this.getActiveCycle();

    if (new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior a la fecha de fin.',
      );
    }

    const codeConflict = await this.academicCycleRepository.findByCode(
      dto.code,
      cycle.id,
    );
    if (codeConflict) {
      throw new ConflictException('Ya existe un ciclo con ese código.');
    }

    const overlapping = await this.academicCycleRepository.findOverlapping(
      dto.startDate,
      dto.endDate,
      cycle.id,
    );
    if (overlapping) {
      throw new ConflictException(
        `Las fechas se solapan con el ciclo "${overlapping.code}".`,
      );
    }

    this.logger.warn({
      message:
        'Edición del ciclo vigente — cachés de dashboard y eventos quedan vigentes hasta expirar su TTL',
      cycleId: cycle.id,
      before: {
        code: cycle.code,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
      },
      after: {
        code: dto.code,
        startDate: dto.startDate,
        endDate: dto.endDate,
      },
      timestamp: new Date().toISOString(),
    });

    cycle.code = dto.code;
    cycle.startDate = new Date(dto.startDate);
    cycle.endDate = new Date(dto.endDate);
    const saved = await this.academicCycleRepository.saveCycle(cycle);

    await Promise.all([
      this.cacheService.invalidateGroup(
        ENROLLMENT_CACHE_KEYS.GLOBAL_DASHBOARD_GROUP,
      ),
      this.cacheService.invalidateGroup(CYCLE_ACTIVE_CACHE_GROUP),
    ]);

    return saved;
  }

  async createHistoricalCycle(dto: CycleFormDto): Promise<AcademicCycle> {
    if (new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior a la fecha de fin.',
      );
    }
    const codeConflict = await this.academicCycleRepository.findByCode(
      dto.code,
    );
    if (codeConflict) {
      throw new ConflictException('Ya existe un ciclo con ese código.');
    }
    const overlapping = await this.academicCycleRepository.findOverlapping(
      dto.startDate,
      dto.endDate,
    );
    if (overlapping) {
      throw new ConflictException(
        `Las fechas se solapan con el ciclo "${overlapping.code}".`,
      );
    }
    return this.academicCycleRepository.createCycle({
      code: dto.code,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
    });
  }

  async updateHistoricalCycle(
    id: string,
    dto: CycleFormDto,
  ): Promise<AcademicCycle> {
    const cycle = await this.findOne(id);
    let activeCycleId: string | null = null;
    try {
      activeCycleId = await this.authSettingsService.getActiveCycleId();
    } catch {
      // no active cycle configured
    }
    if (activeCycleId && cycle.id === activeCycleId) {
      throw new BadRequestException(
        'No se puede editar el ciclo activo desde esta sección.',
      );
    }
    if (new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior a la fecha de fin.',
      );
    }
    const codeConflict = await this.academicCycleRepository.findByCode(
      dto.code,
      id,
    );
    if (codeConflict) {
      throw new ConflictException('Ya existe un ciclo con ese código.');
    }
    const overlapping = await this.academicCycleRepository.findOverlapping(
      dto.startDate,
      dto.endDate,
      id,
    );
    if (overlapping) {
      throw new ConflictException(
        `Las fechas se solapan con el ciclo "${overlapping.code}".`,
      );
    }
    cycle.code = dto.code;
    cycle.startDate = new Date(dto.startDate);
    cycle.endDate = new Date(dto.endDate);
    return this.academicCycleRepository.saveCycle(cycle);
  }

  async getHistory(page: number): Promise<CyclesHistoryResponseDto> {
    let activeCycleId: string | null = null;
    try {
      activeCycleId = await this.authSettingsService.getActiveCycleId();
    } catch {
      this.logger.warn({
        message: 'No se pudo obtener ACTIVE_CYCLE_ID; historial sin exclusión',
      });
    }

    const pageSize = CYCLES_HISTORY_PAGE_SIZE;
    const [rawItems, totalItems] =
      await this.academicCycleRepository.findHistoryPaginated(
        activeCycleId,
        page,
        pageSize,
      );

    return {
      items: plainToInstance(CyclesHistoryItemDto, rawItems, {
        excludeExtraneousValues: true,
      }),
      currentPage: page,
      pageSize,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize),
    };
  }
}

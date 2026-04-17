import { Injectable, NotFoundException, Logger } from '@nestjs/common';
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

@Injectable()
export class CyclesService {
  private readonly logger = new Logger(CyclesService.name);

  constructor(
    private readonly academicCycleRepository: AcademicCycleRepository,
    private readonly authSettingsService: AuthSettingsService,
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
    try {
      const activeCycleId = await this.authSettingsService.getActiveCycleId();
      return await this.findOne(activeCycleId);
    } catch (error) {
      this.logger.error({
        message: 'Error al determinar el ciclo activo',
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString(),
      });
      throw new NotFoundException(
        'No se ha podido identificar el ciclo activo del sistema.',
      );
    }
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

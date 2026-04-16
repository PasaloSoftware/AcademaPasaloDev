import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Evaluation } from '@modules/evaluations/domain/evaluation.entity';
import { CreateEvaluationDto } from '@modules/evaluations/dto/create-evaluation.dto';
import { ReorderEvaluationsDto } from '@modules/evaluations/dto/reorder-evaluations.dto';
import { EvaluationRepository } from '@modules/evaluations/infrastructure/evaluation.repository';
import { CourseCycleRepository } from '@modules/courses/infrastructure/course-cycle.repository';
import { CourseCycleProfessorRepository } from '@modules/courses/infrastructure/course-cycle-professor.repository';
import { CourseCycleAllowedEvaluationTypeRepository } from '@modules/courses/infrastructure/course-cycle-allowed-evaluation-type.repository';
import { AcademicCycleRepository } from '@modules/cycles/infrastructure/academic-cycle.repository';
import { ROLE_CODES } from '@common/constants/role-codes.constants';
import { ACCESS_MESSAGES } from '@common/constants/access-messages.constants';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { COURSE_CACHE_KEYS } from '@modules/courses/domain/course.constants';
import { technicalSettings } from '@config/technical-settings';
import { DataSource } from 'typeorm';
import { EVALUATION_TYPE_CODES } from '@modules/evaluations/domain/evaluation.constants';
import { EvaluationType } from '@modules/evaluations/domain/evaluation-type.entity';
import {
  parseBusinessWindowEndToUtc,
  parseBusinessWindowStartToUtc,
  toBusinessDayEndUtc,
  toBusinessDayStartUtc,
} from '@common/utils/peru-time.util';

@Injectable()
export class EvaluationsService {
  private readonly logger = new Logger(EvaluationsService.name);
  private readonly COURSE_CYCLE_EXISTS_CACHE_TTL =
    technicalSettings.cache.courses.courseCycleExistsCacheTtlSeconds;

  constructor(
    private readonly dataSource: DataSource,
    private readonly evaluationRepository: EvaluationRepository,
    private readonly courseCycleRepository: CourseCycleRepository,
    private readonly courseCycleProfessorRepository: CourseCycleProfessorRepository,
    private readonly courseCycleAllowedEvaluationTypeRepository: CourseCycleAllowedEvaluationTypeRepository,
    private readonly academicCycleRepository: AcademicCycleRepository,
    private readonly cacheService: RedisCacheService,
  ) {}

  async findAllTypes(): Promise<EvaluationType[]> {
    return await this.evaluationRepository.findAcademicTypes();
  }

  async create(dto: CreateEvaluationDto): Promise<Evaluation> {
    const evaluationTypeId = dto.evaluationTypeId.trim();
    if (evaluationTypeId.length === 0) {
      throw new BadRequestException('El tipo de evaluacion es obligatorio.');
    }

    const evaluation = await this.dataSource.transaction(async (manager) => {
      const courseCycle = await this.courseCycleRepository.findById(
        dto.courseCycleId,
        manager,
      );
      if (!courseCycle) {
        throw new NotFoundException('La instancia de curso-ciclo no existe.');
      }

      const academicCycle = await this.academicCycleRepository.findById(
        courseCycle.academicCycleId,
        manager,
      );
      if (!academicCycle) {
        throw new NotFoundException('El ciclo academico vinculado no existe.');
      }

      const evalStart = parseBusinessWindowStartToUtc(
        dto.startDate,
        'startDate',
      );
      const evalEnd = parseBusinessWindowEndToUtc(dto.endDate, 'endDate');
      const cycleStart = toBusinessDayStartUtc(academicCycle.startDate);
      const cycleEnd = toBusinessDayEndUtc(academicCycle.endDate);

      if (evalStart < cycleStart || evalEnd > cycleEnd) {
        throw new BadRequestException(
          'Las fechas de la evaluacion deben estar dentro del rango del ciclo academico.',
        );
      }

      if (evalStart > evalEnd) {
        throw new BadRequestException(
          'La fecha de inicio no puede ser posterior a la fecha de fin.',
        );
      }

      const allowedTypes =
        await this.courseCycleAllowedEvaluationTypeRepository.findActiveByCourseCycleId(
          dto.courseCycleId,
          manager,
        );

      if (allowedTypes.length === 0) {
        throw new BadRequestException(
          'El curso-ciclo no tiene estructura de evaluacion activa.',
        );
      }

      const isAllowedType = allowedTypes.some(
        (item) => String(item.evaluationTypeId) === evaluationTypeId,
      );

      if (!isAllowedType) {
        throw new BadRequestException(
          'El tipo de evaluacion no esta permitido para este curso-ciclo.',
        );
      }

      const nextDisplayOrder =
        (await this.evaluationRepository.findMaxDisplayOrderByCourseCycle(
          dto.courseCycleId,
          manager,
        )) + 1;

      return await this.evaluationRepository.create(
        {
          courseCycleId: dto.courseCycleId,
          evaluationTypeId,
          number: dto.number,
          displayOrder: nextDisplayOrder,
          startDate: evalStart,
          endDate: evalEnd,
        },
        manager,
      );
    });

    await this.cacheService.invalidateIndex(
      COURSE_CACHE_KEYS.CONTENT_BY_CYCLE_INDEX(dto.courseCycleId),
    );

    this.logger.log({
      message: 'Evaluacion academica creada exitosamente',
      evaluationId: evaluation.id,
      courseCycleId: dto.courseCycleId,
      typeId: evaluationTypeId,
      timestamp: new Date().toISOString(),
    });

    return evaluation;
  }

  async findByCourseCycle(
    courseCycleId: string,
    requesterUserId?: string,
    requesterActiveRole?: string,
  ): Promise<Evaluation[]> {
    if (
      requesterActiveRole === ROLE_CODES.PROFESSOR &&
      requesterUserId !== undefined
    ) {
      const isAssigned =
        await this.courseCycleProfessorRepository.canProfessorReadCourseCycle(
          courseCycleId,
          requesterUserId,
        );

      if (!isAssigned) {
        await this.assertCourseCycleExists(courseCycleId);

        throw new ForbiddenException(
          ACCESS_MESSAGES.COURSE_EVALUATIONS_FORBIDDEN,
        );
      }
    } else {
      await this.assertCourseCycleExists(courseCycleId);
    }

    const evaluations =
      await this.evaluationRepository.findByCourseCycle(courseCycleId);
    return this.filterOutBankEvaluations(evaluations);
  }

  async reorderByCourseCycle(
    courseCycleId: string,
    dto: ReorderEvaluationsDto,
  ): Promise<Evaluation[]> {
    await this.assertCourseCycleExists(courseCycleId);

    if (!(await this.evaluationRepository.hasDisplayOrderColumn())) {
      throw new BadRequestException(
        'La base de datos aun no esta preparada para reordenar evaluaciones. Ejecute el script backend/db/2026-04-15_add_evaluation_display_order.sql.',
      );
    }

    const visibleEvaluations = this.filterOutBankEvaluations(
      await this.evaluationRepository.findByCourseCycle(courseCycleId),
    );

    if (visibleEvaluations.length === 0) {
      throw new BadRequestException(
        'El curso-ciclo no tiene evaluaciones academicas para reordenar.',
      );
    }

    const expectedIds = visibleEvaluations.map((evaluation) =>
      String(evaluation.id),
    );
    const requestedIds = dto.evaluationIds.map((id) => String(id));

    if (expectedIds.length !== requestedIds.length) {
      throw new BadRequestException(
        'Debe enviar exactamente todas las evaluaciones academicas visibles del curso-ciclo.',
      );
    }

    const expectedSet = new Set(expectedIds);
    const hasUnknownIds = requestedIds.some((id) => !expectedSet.has(id));
    if (hasUnknownIds) {
      throw new BadRequestException(
        'La lista contiene evaluaciones que no pertenecen al curso-ciclo indicado.',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      let nextOrder = 1;
      for (const evaluationId of requestedIds) {
        await this.evaluationRepository.updateDisplayOrder(
          evaluationId,
          nextOrder,
          manager,
        );
        nextOrder += 1;
      }
    });

    await this.cacheService.invalidateIndex(
      COURSE_CACHE_KEYS.CONTENT_BY_CYCLE_INDEX(courseCycleId),
    );

    this.logger.log({
      message: 'Evaluaciones reordenadas exitosamente',
      courseCycleId,
      evaluationIds: requestedIds,
      timestamp: new Date().toISOString(),
    });

    return this.filterOutBankEvaluations(
      await this.evaluationRepository.findByCourseCycle(courseCycleId),
    );
  }

  private async assertCourseCycleExists(courseCycleId: string): Promise<void> {
    const existsKey = COURSE_CACHE_KEYS.COURSE_CYCLE_EXISTS(courseCycleId);
    const cachedExists = await this.cacheService.get<boolean>(existsKey);
    if (cachedExists !== null) {
      if (!cachedExists) {
        throw new NotFoundException('Ciclo del curso no encontrado');
      }
      return;
    }

    const cycle = await this.courseCycleRepository.findById(courseCycleId);
    const exists = cycle !== null;
    await this.cacheService.set(
      existsKey,
      exists,
      this.COURSE_CYCLE_EXISTS_CACHE_TTL,
    );
    if (!exists) {
      throw new NotFoundException('Ciclo del curso no encontrado');
    }
  }

  private filterOutBankEvaluations(evaluations: Evaluation[]): Evaluation[] {
    return (evaluations || []).filter(
      (evaluation) =>
        String(evaluation.evaluationType?.code || '')
          .trim()
          .toUpperCase() !== EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS,
    );
  }
}

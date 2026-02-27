import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ClassEventRepository } from '@modules/events/infrastructure/class-event.repository';
import { ClassEventProfessorRepository } from '@modules/events/infrastructure/class-event-professor.repository';
import { ClassEventRecordingStatusRepository } from '@modules/events/infrastructure/class-event-recording-status.repository';
import { EvaluationRepository } from '@modules/evaluations/infrastructure/evaluation.repository';
import {
  CourseCycleCategoryMetaRow,
  CourseCycleRepository,
} from '@modules/courses/infrastructure/course-cycle.repository';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { ClassEvent } from '@modules/events/domain/class-event.entity';
import { User } from '@modules/users/domain/user.entity';
import { technicalSettings } from '@config/technical-settings';
import { getEpoch } from '@common/utils/date.util';
import {
  CategoryCycleContext,
  DiscoveryLayer,
  GlobalSessionGroup,
} from '@modules/events/interfaces/class-event.interfaces';
import {
  ClassEventAccess,
  ClassEventStatus,
  CLASS_EVENT_CACHE_KEYS,
  CLASS_EVENT_RECORDING_STATUS_CODES,
  CLASS_EVENT_STATUS,
} from '@modules/events/domain/class-event.constants';
import { AuthSettingsService } from '@modules/auth/application/auth-settings.service';
import { ClassEventsPermissionService } from '@modules/events/application/class-events-permission.service';

@Injectable()
export class ClassEventsService {
  private readonly logger = new Logger(ClassEventsService.name);
  private readonly EVENT_CACHE_TTL =
    technicalSettings.cache.events.classEventsCacheTtlSeconds;
  private readonly CALENDAR_LOCK_TIMEOUT_SECONDS =
    technicalSettings.cache.events.calendarLockTimeoutSeconds;
  private readonly CYCLE_ACTIVE_CACHE_TTL =
    technicalSettings.cache.events.cycleActiveCacheTtlSeconds;
  private readonly RECORDING_STATUS_CACHE_TTL =
    technicalSettings.cache.events.recordingStatusCatalogCacheTtlSeconds;

  private getRecordingStatusCacheKey(code: string): string {
    return `cache:class-event-recording-status:code:${code}`;
  }

  private getCalendarLockKey(
    courseTypeId: string,
    academicCycleId: string,
  ): string {
    return `calendar-lock:ct:${courseTypeId}:ac:${academicCycleId}`;
  }

  private async acquireCalendarLock(
    manager: EntityManager,
    courseTypeId: string,
    academicCycleId: string,
  ): Promise<string> {
    const lockKey = this.getCalendarLockKey(courseTypeId, academicCycleId);
    const rawRows: unknown = await manager.query(
      'SELECT GET_LOCK(?, ?) AS acquired',
      [lockKey, this.CALENDAR_LOCK_TIMEOUT_SECONDS],
    );
    const rows = Array.isArray(rawRows)
      ? (rawRows as Array<{ acquired?: number | string | null }>)
      : [];
    const acquiredRaw = rows?.[0]?.acquired;
    const acquired = acquiredRaw === 1 || acquiredRaw === '1';
    if (!acquired) {
      throw new ConflictException(
        'Otro proceso está planificando horarios en este grupo académico. Inténtalo nuevamente.',
      );
    }
    return lockKey;
  }

  private async releaseCalendarLock(
    manager: EntityManager,
    lockKey: string,
  ): Promise<void> {
    await manager.query('SELECT RELEASE_LOCK(?) AS released', [lockKey]);
  }

  constructor(
    private readonly dataSource: DataSource,
    private readonly classEventRepository: ClassEventRepository,
    private readonly classEventProfessorRepository: ClassEventProfessorRepository,
    private readonly classEventRecordingStatusRepository: ClassEventRecordingStatusRepository,
    private readonly evaluationRepository: EvaluationRepository,
    private readonly courseCycleRepository: CourseCycleRepository,
    private readonly authSettingsService: AuthSettingsService,
    private readonly permissionService: ClassEventsPermissionService,
    private readonly cacheService: RedisCacheService,
  ) {}

  async createEvent(
    evaluationId: string,
    sessionNumber: number,
    title: string,
    topic: string,
    startDatetime: Date,
    endDatetime: Date,
    liveMeetingUrl: string,
    creatorUser: User,
  ): Promise<ClassEvent> {
    const evaluation =
      await this.evaluationRepository.findByIdWithCycle(evaluationId);
    if (!evaluation) {
      throw new NotFoundException('Evaluación no encontrada');
    }
    await this.permissionService.assertMutationAllowedForEvaluation(
      creatorUser,
      evaluation,
    );

    this.validateEventDates(
      startDatetime,
      endDatetime,
      evaluation.startDate,
      evaluation.endDate,
    );

    const courseTypeId = evaluation.courseCycle?.course?.courseTypeId;
    const academicCycleId = evaluation.courseCycle?.academicCycleId;
    if (!courseTypeId || !academicCycleId) {
      throw new InternalServerErrorException(
        'No se pudo resolver la categoría o ciclo académico del curso',
      );
    }

    const categoryCycleContext: CategoryCycleContext = {
      courseTypeId,
      academicCycleId,
    };

    const created = await this.dataSource.transaction(async (manager) => {
      const lockKey = await this.acquireCalendarLock(
        manager,
        courseTypeId,
        academicCycleId,
      );

      try {
        const overlap = await this.classEventRepository.findOverlap(
          evaluation.courseCycleId,
          startDatetime,
          endDatetime,
          undefined,
          manager,
        );

        if (overlap) {
          throw new ConflictException(
            `El horario ya está ocupado por la sesión ${overlap.sessionNumber} de ${overlap.evaluation.evaluationType.name}${overlap.evaluation.number}`,
          );
        }

        const notAvailableStatusId = await this.getRecordingStatusIdByCode(
          CLASS_EVENT_RECORDING_STATUS_CODES.NOT_AVAILABLE,
          manager,
        );

        const existingSession =
          await this.classEventRepository.findByEvaluationAndSessionNumber(
            evaluationId,
            sessionNumber,
            manager,
          );

        if (existingSession) {
          throw new ConflictException(
            `Ya existe la sesión ${sessionNumber} para esta evaluación`,
          );
        }

        const classEvent = await this.classEventRepository.create(
          {
            evaluationId,
            sessionNumber,
            title,
            topic,
            startDatetime,
            endDatetime,
            liveMeetingUrl,
            recordingStatusId: notAvailableStatusId,
            isCancelled: false,
            createdBy: creatorUser.id,
            createdAt: new Date(),
            updatedAt: null,
          },
          manager,
        );

        await this.classEventProfessorRepository.assignProfessor(
          classEvent.id,
          creatorUser.id,
          manager,
        );

        return classEvent;
      } finally {
        await this.releaseCalendarLock(manager, lockKey);
      }
    });

    await this.invalidateEventCache(
      evaluationId,
      undefined,
      categoryCycleContext,
    );
    return created;
  }

  async getEventsByEvaluation(
    evaluationId: string,
    userId: string,
  ): Promise<ClassEvent[]> {
    const isAuthorized = await this.permissionService.checkUserAuthorization(
      userId,
      evaluationId,
    );
    if (!isAuthorized) {
      throw new ForbiddenException('No tienes acceso a esta evaluación');
    }

    const cacheKey = CLASS_EVENT_CACHE_KEYS.EVALUATION_LIST(evaluationId);
    const cached = await this.cacheService.get<ClassEvent[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const events =
      await this.classEventRepository.findByEvaluationId(evaluationId);

    await this.cacheService.set(cacheKey, events, this.EVENT_CACHE_TTL);

    return events;
  }

  async getEventDetail(eventId: string, userId: string): Promise<ClassEvent> {
    const event = await this.classEventRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException('Evento de clase no encontrado');
    }

    const isAuthorized = await this.permissionService.checkUserAuthorization(
      userId,
      event.evaluationId,
    );
    if (!isAuthorized) {
      throw new ForbiddenException('No tienes acceso a este evento');
    }

    return event;
  }

  async updateEvent(
    eventId: string,
    user: User,
    title?: string,
    topic?: string,
    startDatetime?: Date,
    endDatetime?: Date,
    liveMeetingUrl?: string,
    recordingUrl?: string,
  ): Promise<ClassEvent> {
    const event = await this.classEventRepository.findByIdSimple(eventId);
    if (!event) {
      throw new NotFoundException('Evento de clase no encontrado');
    }

    this.permissionService.validateEventOwnership(event.createdBy, user);
    const evaluation = await this.evaluationRepository.findByIdWithCycle(
      event.evaluationId,
    );
    if (!evaluation) {
      throw new NotFoundException('Evaluación no encontrada');
    }
    await this.permissionService.assertMutationAllowedForEvaluation(
      user,
      evaluation,
    );

    const updateData: Partial<ClassEvent> = {};
    if (title !== undefined) updateData.title = title;
    if (topic !== undefined) updateData.topic = topic;
    if (startDatetime !== undefined) updateData.startDatetime = startDatetime;
    if (endDatetime !== undefined) updateData.endDatetime = endDatetime;
    if (liveMeetingUrl !== undefined)
      updateData.liveMeetingUrl = liveMeetingUrl;
    if (recordingUrl !== undefined) updateData.recordingUrl = recordingUrl;

    if (recordingUrl !== undefined) {
      const readyStatusId = await this.getRecordingStatusIdByCode(
        CLASS_EVENT_RECORDING_STATUS_CODES.READY,
      );
      updateData.recordingStatusId = readyStatusId;
    }

    const courseTypeId = evaluation.courseCycle?.course?.courseTypeId;
    const academicCycleId = evaluation.courseCycle?.academicCycleId;
    if (!courseTypeId || !academicCycleId) {
      throw new InternalServerErrorException(
        'No se pudo resolver la categoría o ciclo académico del curso',
      );
    }
    const categoryCycleContext: CategoryCycleContext = {
      courseTypeId,
      academicCycleId,
    };

    let updated: ClassEvent;
    if (startDatetime || endDatetime) {
      const finalStart = startDatetime || event.startDatetime;
      const finalEnd = endDatetime || event.endDatetime;

      this.validateEventDates(
        finalStart,
        finalEnd,
        evaluation.startDate,
        evaluation.endDate,
      );

      updated = await this.dataSource.transaction(async (manager) => {
        const lockKey = await this.acquireCalendarLock(
          manager,
          courseTypeId,
          academicCycleId,
        );

        try {
          const overlap = await this.classEventRepository.findOverlap(
            evaluation.courseCycleId,
            finalStart,
            finalEnd,
            eventId,
            manager,
          );

          if (overlap) {
            throw new ConflictException(
              `No es posible actualizar el horario. Existe un cruce con la sesión ${overlap.sessionNumber} de ${overlap.evaluation.evaluationType.name}${overlap.evaluation.number}`,
            );
          }

          return await this.classEventRepository.update(
            eventId,
            updateData,
            manager,
          );
        } finally {
          await this.releaseCalendarLock(manager, lockKey);
        }
      });
    } else {
      updated = await this.classEventRepository.update(eventId, updateData);
    }

    await this.invalidateEventCache(
      event.evaluationId,
      eventId,
      categoryCycleContext,
    );

    return updated;
  }

  async cancelEvent(eventId: string, user: User): Promise<void> {
    const event = await this.classEventRepository.findByIdSimple(eventId);
    if (!event) {
      throw new NotFoundException('Evento de clase no encontrado');
    }

    if (event.isCancelled) {
      throw new BadRequestException('El evento ya está cancelado');
    }

    this.permissionService.validateEventOwnership(event.createdBy, user);
    const evaluation = await this.evaluationRepository.findByIdWithCycle(
      event.evaluationId,
    );
    if (!evaluation) {
      throw new NotFoundException('Evaluación no encontrada');
    }
    await this.permissionService.assertMutationAllowedForEvaluation(
      user,
      evaluation,
    );

    await this.classEventRepository.cancelEvent(eventId);

    await this.invalidateEventCache(event.evaluationId, eventId);
  }

  async assignProfessor(
    eventId: string,
    professorUserId: string,
  ): Promise<void> {
    const event = await this.classEventRepository.findByIdSimple(eventId);
    if (!event) {
      throw new NotFoundException('Evento de clase no encontrado');
    }

    await this.classEventProfessorRepository.assignProfessor(
      eventId,
      professorUserId,
    );

    await this.invalidateEventCache(event.evaluationId, eventId);
  }

  async removeProfessor(
    eventId: string,
    professorUserId: string,
  ): Promise<void> {
    const event = await this.classEventRepository.findByIdSimple(eventId);
    if (!event) {
      throw new NotFoundException('Evento de clase no encontrado');
    }

    if (event.createdBy === professorUserId) {
      throw new BadRequestException(
        'No se puede remover al creador del evento',
      );
    }

    const isAssigned =
      await this.classEventProfessorRepository.isProfessorAssigned(
        eventId,
        professorUserId,
      );
    if (!isAssigned) {
      throw new NotFoundException('El profesor no está asignado a este evento');
    }

    await this.classEventProfessorRepository.revokeProfessor(
      eventId,
      professorUserId,
    );

    await this.invalidateEventCache(event.evaluationId, eventId);
  }

  calculateEventStatus(event: ClassEvent): ClassEventStatus {
    if (event.isCancelled) {
      return CLASS_EVENT_STATUS.CANCELADA;
    }

    const nowTime = getEpoch(new Date());
    const startTime = getEpoch(event.startDatetime);
    const endTime = getEpoch(event.endDatetime);

    if (nowTime < startTime) {
      return CLASS_EVENT_STATUS.PROGRAMADA;
    }
    if (nowTime >= startTime && nowTime < endTime) {
      return CLASS_EVENT_STATUS.EN_CURSO;
    }
    return CLASS_EVENT_STATUS.FINALIZADA;
  }

  canJoinLive(): Promise<boolean> {
    return Promise.resolve(false);
  }

  canWatchRecording(): Promise<boolean> {
    return Promise.resolve(false);
  }

  getEventAccess(): ClassEventAccess {
    return {
      canJoinLive: false,
      canWatchRecording: false,
      canCopyLiveLink: false,
      canCopyRecordingLink: false,
    };
  }

  canAccessMeetingLink(): Promise<boolean> {
    return Promise.resolve(false);
  }

  async checkUserAuthorizationForUser(
    user: User,
    evaluationId: string,
  ): Promise<boolean> {
    return await this.permissionService.checkUserAuthorizationForUser(
      user,
      evaluationId,
    );
  }

  async checkUserAuthorization(
    userId: string,
    evaluationId: string,
  ): Promise<boolean> {
    return await this.permissionService.checkUserAuthorization(
      userId,
      evaluationId,
    );
  }

  async getMySchedule(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<ClassEvent[]> {
    const cacheKey = CLASS_EVENT_CACHE_KEYS.MY_SCHEDULE(
      userId,
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0],
    );

    const cached = await this.cacheService.get<ClassEvent[]>(cacheKey);
    if (cached) return cached;

    const events = await this.classEventRepository.findByUserAndRange(
      userId,
      start,
      end,
    );

    await this.cacheService.set(cacheKey, events, this.EVENT_CACHE_TTL);
    await Promise.all([
      this.cacheService.addToIndex(
        CLASS_EVENT_CACHE_KEYS.USER_SCHEDULE_INDEX(userId),
        cacheKey,
        this.EVENT_CACHE_TTL,
      ),
      this.cacheService.addToIndex(
        CLASS_EVENT_CACHE_KEYS.GLOBAL_SCHEDULE_INDEX,
        cacheKey,
        this.EVENT_CACHE_TTL,
      ),
    ]);
    return events;
  }

  async getDiscoveryLayers(courseCycleId: string): Promise<DiscoveryLayer[]> {
    const sourceCourseCycle =
      await this.courseCycleRepository.findFullById(courseCycleId);
    if (!sourceCourseCycle) {
      throw new NotFoundException('Curso no encontrado');
    }

    const activeCycleId = await this.authSettingsService.getActiveCycleId();
    if (sourceCourseCycle.academicCycleId !== activeCycleId) {
      throw new BadRequestException(
        'El curso no está activo en el ciclo actual',
      );
    }

    const courseTypeId = sourceCourseCycle.course?.courseTypeId;
    if (!courseTypeId) {
      throw new InternalServerErrorException(
        'No se pudo resolver la categoría del curso',
      );
    }

    const cacheKey = CLASS_EVENT_CACHE_KEYS.DISCOVERY_LAYERS(
      courseCycleId,
      courseTypeId,
      activeCycleId,
    );
    const cached = await this.cacheService.get<DiscoveryLayer[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const layers =
      await this.courseCycleRepository.findSiblingLayersByCategoryAndCycle(
        courseCycleId,
        activeCycleId,
      );

    await this.cacheService.set(cacheKey, layers, this.EVENT_CACHE_TTL);
    await this.cacheService.addToIndex(
      CLASS_EVENT_CACHE_KEYS.CATEGORY_CYCLE_INDEX(courseTypeId, activeCycleId),
      cacheKey,
      this.EVENT_CACHE_TTL,
    );
    return layers;
  }

  private validateAndResolveGlobalSessionsGroup(
    metadataRows: CourseCycleCategoryMetaRow[],
    requestedCourseCycleIds: string[],
  ): { courseTypeId: string; academicCycleId: string } {
    if (metadataRows.length !== requestedCourseCycleIds.length) {
      throw new NotFoundException('Uno o más cursos no fueron encontrados');
    }

    const base = metadataRows[0];
    const hasDifferentGroup = metadataRows.some(
      (row) =>
        row.courseTypeId !== base.courseTypeId ||
        row.academicCycleId !== base.academicCycleId,
    );
    if (hasDifferentGroup) {
      throw new BadRequestException(
        'Todos los cursos deben pertenecer a la misma categoría y ciclo académico',
      );
    }

    return {
      courseTypeId: base.courseTypeId,
      academicCycleId: base.academicCycleId,
    };
  }

  private async resolveCategoryCycleGroupByEvaluationId(
    evaluationId: string,
  ): Promise<string | null> {
    const evaluation =
      await this.evaluationRepository.findByIdWithCycle(evaluationId);
    if (!evaluation) {
      return null;
    }

    const courseTypeId = evaluation.courseCycle?.course?.courseTypeId;
    const academicCycleId = evaluation.courseCycle?.academicCycleId;
    if (!courseTypeId || !academicCycleId) {
      return null;
    }

    return CLASS_EVENT_CACHE_KEYS.CATEGORY_CYCLE_GROUP(
      courseTypeId,
      academicCycleId,
    );
  }

  private resolveCategoryCycleGroupByContext(
    context?: CategoryCycleContext,
  ): string | null {
    if (!context?.courseTypeId || !context.academicCycleId) {
      return null;
    }
    return CLASS_EVENT_CACHE_KEYS.CATEGORY_CYCLE_GROUP(
      context.courseTypeId,
      context.academicCycleId,
    );
  }

  private resolveCategoryCycleIndexByContext(
    context?: CategoryCycleContext,
  ): string | null {
    if (!context?.courseTypeId || !context.academicCycleId) {
      return null;
    }
    return CLASS_EVENT_CACHE_KEYS.CATEGORY_CYCLE_INDEX(
      context.courseTypeId,
      context.academicCycleId,
    );
  }

  private async resolveCategoryCycleIndexByEvaluationId(
    evaluationId: string,
  ): Promise<string | null> {
    const evaluation =
      await this.evaluationRepository.findByIdWithCycle(evaluationId);
    if (!evaluation) {
      return null;
    }

    const courseTypeId = evaluation.courseCycle?.course?.courseTypeId;
    const academicCycleId = evaluation.courseCycle?.academicCycleId;
    if (!courseTypeId || !academicCycleId) {
      return null;
    }

    return CLASS_EVENT_CACHE_KEYS.CATEGORY_CYCLE_INDEX(
      courseTypeId,
      academicCycleId,
    );
  }

  async getGlobalSessions(
    courseCycleIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<GlobalSessionGroup[]> {
    const uniqueCourseCycleIds = [...new Set(courseCycleIds)];
    if (uniqueCourseCycleIds.length === 0) {
      return [];
    }

    const metadataRows =
      await this.courseCycleRepository.findCategoryMetadataByIds(
        uniqueCourseCycleIds,
      );
    const { courseTypeId, academicCycleId } =
      this.validateAndResolveGlobalSessionsGroup(
        metadataRows,
        uniqueCourseCycleIds,
      );

    const orderedCourseCycleIds = [...uniqueCourseCycleIds].sort();
    const cacheKey = CLASS_EVENT_CACHE_KEYS.GLOBAL_SESSIONS(
      courseTypeId,
      academicCycleId,
      startDate.toISOString(),
      endDate.toISOString(),
      orderedCourseCycleIds.join(','),
    );
    const cached = await this.cacheService.get<GlobalSessionGroup[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const rows =
      await this.classEventRepository.findGlobalSessionsByCourseCyclesAndRange(
        uniqueCourseCycleIds,
        startDate,
        endDate,
      );

    const grouped = new Map<string, GlobalSessionGroup>();
    for (const row of rows) {
      const existing = grouped.get(row.courseCycleId);
      if (existing) {
        existing.sessions.push({
          eventId: row.eventId,
          evaluationId: row.evaluationId,
          sessionNumber: row.sessionNumber,
          title: row.title,
          topic: row.topic,
          startDatetime: row.startDatetime,
          endDatetime: row.endDatetime,
        });
        continue;
      }

      grouped.set(row.courseCycleId, {
        courseCycleId: row.courseCycleId,
        courseId: row.courseId,
        courseCode: row.courseCode,
        courseName: row.courseName,
        primaryColor: row.primaryColor,
        secondaryColor: row.secondaryColor,
        sessions: [
          {
            eventId: row.eventId,
            evaluationId: row.evaluationId,
            sessionNumber: row.sessionNumber,
            title: row.title,
            topic: row.topic,
            startDatetime: row.startDatetime,
            endDatetime: row.endDatetime,
          },
        ],
      });
    }

    const groupedSessions = [...grouped.values()];
    await this.cacheService.set(
      cacheKey,
      groupedSessions,
      this.EVENT_CACHE_TTL,
    );
    await this.cacheService.addToIndex(
      CLASS_EVENT_CACHE_KEYS.CATEGORY_CYCLE_INDEX(
        courseTypeId,
        academicCycleId,
      ),
      cacheKey,
      this.EVENT_CACHE_TTL,
    );
    return groupedSessions;
  }

  async isCycleActive(evaluationId: string): Promise<boolean> {
    const cacheKey = `cache:cycle-active:${evaluationId}`;
    const cached = await this.cacheService.get<boolean>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const evaluation =
      await this.evaluationRepository.findByIdWithCycle(evaluationId);
    if (!evaluation) {
      return false;
    }

    const now = new Date();
    const cycleStart = new Date(evaluation.courseCycle.academicCycle.startDate);
    const cycleEnd = new Date(evaluation.courseCycle.academicCycle.endDate);

    const isActive = now >= cycleStart && now <= cycleEnd;

    await this.cacheService.set(
      cacheKey,
      isActive,
      this.CYCLE_ACTIVE_CACHE_TTL,
    );

    return isActive;
  }

  private async invalidateEventCache(
    evaluationId: string,
    eventId?: string,
    categoryCycleContext?: CategoryCycleContext,
  ): Promise<void> {
    const deleteOps: Promise<unknown>[] = [
      this.cacheService.del(
        CLASS_EVENT_CACHE_KEYS.EVALUATION_LIST(evaluationId),
      ),
    ];
    if (eventId) {
      deleteOps.push(
        this.cacheService.del(CLASS_EVENT_CACHE_KEYS.DETAIL(eventId)),
      );
    }
    await Promise.all(deleteOps);

    const categoryCycleGroup =
      this.resolveCategoryCycleGroupByContext(categoryCycleContext) ??
      (await this.resolveCategoryCycleGroupByEvaluationId(evaluationId));
    const categoryCycleIndex =
      this.resolveCategoryCycleIndexByContext(categoryCycleContext) ??
      (await this.resolveCategoryCycleIndexByEvaluationId(evaluationId));
    const affectedUserIds =
      await this.classEventRepository.findAffectedScheduleUserIdsByEvaluation(
        evaluationId,
      );
    const uniqueAffectedUserIds = [...new Set(affectedUserIds)];

    const invalidateOps: Promise<unknown>[] = [];
    if (categoryCycleIndex) {
      invalidateOps.push(this.cacheService.invalidateIndex(categoryCycleIndex));
    } else if (categoryCycleGroup) {
      invalidateOps.push(this.cacheService.invalidateGroup(categoryCycleGroup));
    }
    const userInvalidationThreshold = 100;
    if (uniqueAffectedUserIds.length > userInvalidationThreshold) {
      invalidateOps.push(
        this.cacheService.invalidateIndex(
          CLASS_EVENT_CACHE_KEYS.GLOBAL_SCHEDULE_INDEX,
        ),
      );
    } else {
      for (const userId of uniqueAffectedUserIds) {
        invalidateOps.push(
          this.cacheService.invalidateIndex(
            CLASS_EVENT_CACHE_KEYS.USER_SCHEDULE_INDEX(userId),
          ),
        );
      }
    }

    if (invalidateOps.length > 0) {
      await Promise.all(invalidateOps);
    }
  }

  private async getRecordingStatusIdByCode(
    code: string,
    manager?: import('typeorm').EntityManager,
  ): Promise<string> {
    const cacheKey = this.getRecordingStatusCacheKey(code);
    const cached = await this.cacheService.get<string>(cacheKey);
    if (cached) {
      return cached;
    }

    const status = await this.classEventRecordingStatusRepository.findByCode(
      code,
      manager,
    );
    if (!status) {
      throw new InternalServerErrorException(
        `Estado de grabación ${code} no configurado`,
      );
    }

    await this.cacheService.set(
      cacheKey,
      status.id,
      this.RECORDING_STATUS_CACHE_TTL,
    );
    return status.id;
  }

  private validateEventDates(
    startDatetime: Date,
    endDatetime: Date,
    evaluationStart: Date,
    evaluationEnd: Date,
  ): void {
    const startTime = getEpoch(startDatetime);
    const endTime = getEpoch(endDatetime);
    const evalStartTime = getEpoch(evaluationStart);
    const evalEndTime = getEpoch(evaluationEnd);

    if (endTime <= startTime) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    if (startTime < evalStartTime || startTime > evalEndTime) {
      throw new BadRequestException(
        'La fecha de inicio debe estar dentro del rango de la evaluación',
      );
    }

    if (endTime < evalStartTime || endTime > evalEndTime) {
      throw new BadRequestException(
        'La fecha de fin debe estar dentro del rango de la evaluación',
      );
    }
  }
}

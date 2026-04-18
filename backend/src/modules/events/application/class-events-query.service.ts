import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ClassEventRepository } from '@modules/events/infrastructure/class-event.repository';
import { EvaluationRepository } from '@modules/evaluations/infrastructure/evaluation.repository';
import {
  CourseCycleCategoryMetaRow,
  CourseCycleRepository,
} from '@modules/courses/infrastructure/course-cycle.repository';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { ClassEvent } from '@modules/events/domain/class-event.entity';
import { technicalSettings } from '@config/technical-settings';
import {
  DiscoveryLayer,
  GlobalSessionGroup,
} from '@modules/events/interfaces/class-event.interfaces';
import { CLASS_EVENT_CACHE_KEYS } from '@modules/events/domain/class-event.constants';
import { AuthSettingsService } from '@modules/auth/application/auth-settings.service';
import {
  toBusinessDayEndUtc,
  toBusinessDayStartUtc,
} from '@common/utils/peru-time.util';

@Injectable()
export class ClassEventsQueryService {
  private readonly EVENT_CACHE_TTL =
    technicalSettings.cache.events.classEventsCacheTtlSeconds;
  private readonly CYCLE_ACTIVE_CACHE_TTL =
    technicalSettings.cache.events.cycleActiveCacheTtlSeconds;

  constructor(
    private readonly classEventRepository: ClassEventRepository,
    private readonly evaluationRepository: EvaluationRepository,
    private readonly courseCycleRepository: CourseCycleRepository,
    private readonly authSettingsService: AuthSettingsService,
    private readonly cacheService: RedisCacheService,
  ) {}

  async getMySchedule(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<ClassEvent[]> {
    const cacheKey = CLASS_EVENT_CACHE_KEYS.MY_SCHEDULE(
      userId,
      start.toISOString(),
      end.toISOString(),
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

    await Promise.all([
      this.cacheService.set(cacheKey, layers, this.EVENT_CACHE_TTL),
      this.cacheService.addToIndex(
        CLASS_EVENT_CACHE_KEYS.CATEGORY_CYCLE_INDEX(
          courseTypeId,
          activeCycleId,
        ),
        cacheKey,
        this.EVENT_CACHE_TTL,
      ),
    ]);
    return layers;
  }

  async getGlobalSessions(
    params: {
      courseCycleIds?: string[];
      courseTypeCode?: string;
      cycleLevelId?: string;
    },
    startDate: Date,
    endDate: Date,
  ): Promise<GlobalSessionGroup[]> {
    let uniqueCourseCycleIds: string[];
    let courseTypeId: string;
    let groupKey: string;

    if (params.courseCycleIds && params.courseCycleIds.length > 0) {
      uniqueCourseCycleIds = [...new Set(params.courseCycleIds)];
      const metadataRows =
        await this.courseCycleRepository.findCategoryMetadataByIds(
          uniqueCourseCycleIds,
        );
      const resolved = this.validateAndResolveGlobalSessionsGroup(
        metadataRows,
        uniqueCourseCycleIds,
      );
      courseTypeId = resolved.courseTypeId;
      groupKey = resolved.academicCycleId;
    } else if (params.courseTypeCode && params.cycleLevelId) {
      const { courseCycleIds: resolvedIds, courseTypeId: resolvedTypeId } =
        await this.courseCycleRepository.findIdsByCourseTypeCodeAndCycleLevelId(
          params.courseTypeCode,
          params.cycleLevelId,
        );
      if (resolvedIds.length === 0) return [];
      uniqueCourseCycleIds = resolvedIds;
      courseTypeId = resolvedTypeId!;
      groupKey = params.cycleLevelId;
    } else {
      throw new BadRequestException(
        'Debe proporcionar courseCycleIds o la combinación courseTypeCode + cycleLevelId',
      );
    }

    const orderedCourseCycleIds = [...uniqueCourseCycleIds].sort();
    const cacheKey = CLASS_EVENT_CACHE_KEYS.GLOBAL_SESSIONS(
      courseTypeId,
      groupKey,
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
    await Promise.all([
      this.cacheService.set(cacheKey, groupedSessions, this.EVENT_CACHE_TTL),
      this.cacheService.addToIndex(
        CLASS_EVENT_CACHE_KEYS.CATEGORY_CYCLE_INDEX(courseTypeId, groupKey),
        cacheKey,
        this.EVENT_CACHE_TTL,
      ),
    ]);
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
    const cycleStart = toBusinessDayStartUtc(
      evaluation.courseCycle.academicCycle.startDate,
    );
    const cycleEnd = toBusinessDayEndUtc(
      evaluation.courseCycle.academicCycle.endDate,
    );

    const isActive = now >= cycleStart && now <= cycleEnd;

    await this.cacheService.set(
      cacheKey,
      isActive,
      this.CYCLE_ACTIVE_CACHE_TTL,
    );

    return isActive;
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
}

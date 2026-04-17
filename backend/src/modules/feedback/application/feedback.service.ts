import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { CreateTestimonyDto } from '@modules/feedback/dto/create-testimony.dto';
import { FeatureTestimonyDto } from '@modules/feedback/dto/feature-testimony.dto';
import {
  CourseTestimony,
  PhotoSource,
} from '@modules/feedback/domain/course-testimony.entity';
import { CourseTestimonyRepository } from '@modules/feedback/infrastructure/course-testimony.repository';
import { EnrollmentRepository } from '@modules/enrollments/infrastructure/enrollment.repository';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { technicalSettings } from '@config/technical-settings';
import {
  AdminFeedbackListItemDto,
  AdminFeedbackListQueryDto,
  AdminFeedbackListResponseDto,
  AdminFeedbackStatsDto,
} from '@modules/feedback/dto/admin-feedback-list.dto';

const FEEDBACK_ADMIN_PAGE_SIZE = 6;

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);
  private readonly CACHE_TTL =
    technicalSettings.cache.feedback.publicFeaturedTestimoniesCacheTtlSeconds;
  private readonly MAX_PUBLIC_VISIBLE =
    technicalSettings.feedback.maxPublicVisibleTestimonies;

  constructor(
    private readonly testimonyRepo: CourseTestimonyRepository,
    private readonly enrollmentRepo: EnrollmentRepository,
    private readonly cacheService: RedisCacheService,
  ) {}

  async createTestimony(
    userId: string,
    dto: CreateTestimonyDto,
  ): Promise<CourseTestimony> {
    const enrollment = await this.enrollmentRepo.findActiveByUserAndCourseCycle(
      userId,
      dto.courseCycleId,
    );
    if (!enrollment) {
      throw new ForbiddenException(
        'No puedes opinar sobre un curso en el que no estas matriculado actualmente.',
      );
    }

    const now = new Date();
    const testimony = await this.testimonyRepo.create({
      userId,
      courseCycleId: dto.courseCycleId,
      rating: Number(dto.rating),
      comment: dto.comment,
      photoSource: PhotoSource.NONE,
      photoUrl: null,
      isActive: false,
      createdAt: now,
      updatedAt: now,
    });

    this.logger.log({
      message: 'Nuevo testimonio creado',
      userId,
      courseCycleId: dto.courseCycleId,
      testimonyId: testimony.id,
    });

    return testimony;
  }

  async featureTestimony(
    adminId: string,
    testimonyId: string,
    dto: FeatureTestimonyDto,
  ): Promise<CourseTestimony> {
    const testimony = await this.testimonyRepo.findById(testimonyId);
    if (!testimony) {
      throw new NotFoundException('Testimonio no encontrado.');
    }

    const now = new Date();

    if (dto.isActive && !testimony.isActive) {
      const activeCount = await this.testimonyRepo.countActive();
      if (activeCount >= this.MAX_PUBLIC_VISIBLE) {
        throw new BadRequestException(
          `Solo se permiten ${this.MAX_PUBLIC_VISIBLE} testimonios visibles en publico.`,
        );
      }
    }

    testimony.isActive = dto.isActive;
    testimony.updatedAt = now;
    const updatedTestimony = await this.testimonyRepo.save(testimony);

    await this.invalidatePublicCache();

    this.logger.log({
      message: 'Visibilidad de testimonio actualizada',
      adminId,
      testimonyId,
      isActive: dto.isActive,
    });

    return updatedTestimony;
  }

  async getPublicTestimonies(): Promise<CourseTestimony[]> {
    const cacheKey = this.getPublicCacheKey();

    const cached = await this.cacheService.get<CourseTestimony[]>(cacheKey);
    if (cached) return cached;

    const items = await this.testimonyRepo.findActivePublic(
      this.MAX_PUBLIC_VISIBLE,
    );

    await this.cacheService.set(cacheKey, items, this.CACHE_TTL);

    return items;
  }

  async getAdminTestimonies(
    query: AdminFeedbackListQueryDto,
  ): Promise<AdminFeedbackListResponseDto> {
    const { page = 1, ...filters } = query;
    const pageSize = FEEDBACK_ADMIN_PAGE_SIZE;

    const [[items, totalItems], rawStats] = await Promise.all([
      this.testimonyRepo.findAdminPaginated(filters, page, pageSize),
      this.testimonyRepo.getAdminAggregates(filters),
    ]);

    const total = Number(rawStats?.total ?? 0);
    const average =
      total > 0 ? parseFloat(Number(rawStats?.average ?? 0).toFixed(2)) : 0;

    const toPercent = (count: string | undefined): number =>
      total > 0
        ? parseFloat(((Number(count ?? 0) / total) * 100).toFixed(2))
        : 0;

    const stats: AdminFeedbackStatsDto = {
      total,
      average,
      distribution: {
        1: toPercent(rawStats?.r1),
        2: toPercent(rawStats?.r2),
        3: toPercent(rawStats?.r3),
        4: toPercent(rawStats?.r4),
        5: toPercent(rawStats?.r5),
      },
    };

    const mappedItems = items.map((t) => ({
      id: t.id,
      rating: t.rating,
      comment: t.comment,
      isActive: t.isActive,
      createdAt: t.createdAt,
      courseCycleId: t.courseCycleId,
      courseId: t.courseCycle?.courseId ?? '',
      courseName: t.courseCycle?.course?.name ?? '',
      user: {
        id: t.user?.id ?? '',
        firstName: t.user?.firstName ?? '',
        lastName1: t.user?.lastName1 ?? null,
        lastName2: t.user?.lastName2 ?? null,
        profilePhotoUrl: t.user?.profilePhotoUrl ?? null,
        careerName: t.user?.career?.name ?? null,
      },
    }));

    return {
      items: plainToInstance(AdminFeedbackListItemDto, mappedItems, {
        excludeExtraneousValues: true,
      }),
      currentPage: page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
      stats,
    };
  }

  private getPublicCacheKey(): string {
    return 'cache:feedback:public:all';
  }

  private async invalidatePublicCache(): Promise<void> {
    const key = this.getPublicCacheKey();
    await this.cacheService.del(key);
  }
}

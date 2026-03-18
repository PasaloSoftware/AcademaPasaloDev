import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateTestimonyDto } from '@modules/feedback/dto/create-testimony.dto';
import { FeatureTestimonyDto } from '@modules/feedback/dto/feature-testimony.dto';
import {
  CourseTestimony,
  PhotoSource,
} from '@modules/feedback/domain/course-testimony.entity';
import { FeaturedTestimony } from '@modules/feedback/domain/featured-testimony.entity';
import { CourseTestimonyRepository } from '@modules/feedback/infrastructure/course-testimony.repository';
import { FeaturedTestimonyRepository } from '@modules/feedback/infrastructure/featured-testimony.repository';
import { EnrollmentRepository } from '@modules/enrollments/infrastructure/enrollment.repository';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { technicalSettings } from '@config/technical-settings';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);
  private readonly CACHE_TTL =
    technicalSettings.cache.feedback.publicFeaturedTestimoniesCacheTtlSeconds;

  constructor(
    private readonly testimonyRepo: CourseTestimonyRepository,
    private readonly featuredRepo: FeaturedTestimonyRepository,
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
  ): Promise<FeaturedTestimony> {
    const testimony = await this.testimonyRepo.findById(testimonyId);
    if (!testimony) {
      throw new NotFoundException('Testimonio no encontrado.');
    }

    let featured = await this.featuredRepo.findByTestimonyId(testimonyId);
    const now = new Date();

    if (featured) {
      featured.isActive = dto.isActive;
      featured.displayOrder = dto.displayOrder;
      featured.updatedAt = now;
      featured = await this.featuredRepo.save(featured);
    } else {
      featured = await this.featuredRepo.create({
        courseCycleId: testimony.courseCycleId,
        courseTestimonyId: testimony.id,
        displayOrder: dto.displayOrder,
        isActive: dto.isActive,
        createdAt: now,
        updatedAt: now,
      });
    }

    await this.invalidatePublicCache(testimony.courseCycleId);

    this.logger.log({
      message: 'Testimonio actualizado en destacados',
      adminId,
      testimonyId,
      isActive: dto.isActive,
    });

    return featured;
  }

  async getPublicTestimonies(
    courseCycleId: string,
  ): Promise<FeaturedTestimony[]> {
    const cacheKey = this.getPublicCacheKey(courseCycleId);

    const cached = await this.cacheService.get<FeaturedTestimony[]>(cacheKey);
    if (cached) return cached;

    const items = await this.featuredRepo.findActiveByCycle(courseCycleId);

    await this.cacheService.set(cacheKey, items, this.CACHE_TTL);

    return items;
  }

  async getAllTestimoniesAdmin(
    courseCycleId: string,
  ): Promise<CourseTestimony[]> {
    return await this.testimonyRepo.findByCycleId(courseCycleId);
  }

  private getPublicCacheKey(cycleId: string): string {
    return `cache:feedback:public:cycle:${cycleId}`;
  }

  private async invalidatePublicCache(cycleId: string): Promise<void> {
    const key = this.getPublicCacheKey(cycleId);
    await this.cacheService.del(key);
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FeedbackService } from '@modules/feedback/application/feedback.service';
import { CourseTestimonyRepository } from '@modules/feedback/infrastructure/course-testimony.repository';
import { EnrollmentRepository } from '@modules/enrollments/infrastructure/enrollment.repository';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import {
  PhotoSource,
  CourseTestimony,
} from '@modules/feedback/domain/course-testimony.entity';
import { Enrollment } from '@modules/enrollments/domain/enrollment.entity';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let testimonyRepo: CourseTestimonyRepository;
  let enrollmentRepo: EnrollmentRepository;
  let cacheService: RedisCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        {
          provide: CourseTestimonyRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findByCycleId: jest.fn(),
            save: jest.fn(),
            countActive: jest.fn(),
            findActivePublic: jest.fn(),
          },
        },
        {
          provide: EnrollmentRepository,
          useValue: {
            findActiveByUserAndCourseCycle: jest.fn(),
          },
        },
        {
          provide: RedisCacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(null),
            del: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
    testimonyRepo = module.get<CourseTestimonyRepository>(
      CourseTestimonyRepository,
    );
    enrollmentRepo = module.get<EnrollmentRepository>(EnrollmentRepository);
    cacheService = module.get<RedisCacheService>(RedisCacheService);
  });

  describe('createTestimony', () => {
    const mockDto = {
      courseCycleId: '100',
      rating: 5,
      comment: 'Excelente curso',
    };

    it('should create testimony successfully if enrolled', async () => {
      jest
        .spyOn(enrollmentRepo, 'findActiveByUserAndCourseCycle')
        .mockResolvedValue({ id: '1' } as Enrollment);
      jest
        .spyOn(testimonyRepo, 'create')
        .mockResolvedValue({ id: 'test1' } as CourseTestimony);

      const result = await service.createTestimony('user1', mockDto);

      expect(
        enrollmentRepo.findActiveByUserAndCourseCycle,
      ).toHaveBeenCalledWith('user1', '100');
      expect(testimonyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user1',
          courseCycleId: '100',
          rating: 5,
          comment: 'Excelente curso',
          photoSource: PhotoSource.NONE,
          photoUrl: null,
          isActive: false,
        }),
      );
      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException if user is NOT enrolled', async () => {
      jest
        .spyOn(enrollmentRepo, 'findActiveByUserAndCourseCycle')
        .mockResolvedValue(null);

      await expect(service.createTestimony('user1', mockDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('featureTestimony (Admin)', () => {
    const featureDto = { isActive: true };

    it('should activate testimony when limit is not reached', async () => {
      const testimony = {
        id: 't1',
        isActive: false,
        courseCycleId: '100',
      } as CourseTestimony;
      jest.spyOn(testimonyRepo, 'findById').mockResolvedValue(testimony);
      jest.spyOn(testimonyRepo, 'countActive').mockResolvedValue(2);
      jest
        .spyOn(testimonyRepo, 'save')
        .mockResolvedValue({ ...testimony, isActive: true });

      const result = await service.featureTestimony('admin1', 't1', featureDto);

      expect(testimonyRepo.save).toHaveBeenCalled();
      expect(result.isActive).toBe(true);
      expect(cacheService.del).toHaveBeenCalled();
    });

    it('should allow deactivation without validating limit', async () => {
      const testimony = {
        id: 't1',
        isActive: true,
        courseCycleId: '100',
      } as CourseTestimony;
      jest.spyOn(testimonyRepo, 'findById').mockResolvedValue(testimony);
      jest
        .spyOn(testimonyRepo, 'save')
        .mockResolvedValue({ ...testimony, isActive: false });

      const result = await service.featureTestimony('admin1', 't1', {
        isActive: false,
      });

      expect(result.isActive).toBe(false);
      expect(cacheService.del).toHaveBeenCalled();
    });

    it('should throw NotFound if testimony does not exist', async () => {
      jest.spyOn(testimonyRepo, 'findById').mockResolvedValue(null);

      await expect(
        service.featureTestimony('admin1', '999', featureDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequest when active limit is reached', async () => {
      jest.spyOn(testimonyRepo, 'findById').mockResolvedValue({
        id: 't1',
        isActive: false,
      } as CourseTestimony);
      jest.spyOn(testimonyRepo, 'countActive').mockResolvedValue(3);

      await expect(
        service.featureTestimony('admin1', 't1', featureDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPublicTestimonies', () => {
    it('should return from cache if available', async () => {
      const cached = [{ id: 'f1' }] as CourseTestimony[];
      jest.spyOn(cacheService, 'get').mockResolvedValue(cached);

      const result = await service.getPublicTestimonies();

      expect(result).toEqual(cached);
      expect(cacheService.get).toHaveBeenCalled();
    });

    it('should return from DB and set cache if not available', async () => {
      const items = [{ id: 'f1' }] as CourseTestimony[];
      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(testimonyRepo, 'findActivePublic').mockResolvedValue(items);

      const result = await service.getPublicTestimonies();

      expect(result).toEqual(items);
      expect(testimonyRepo.findActivePublic).toHaveBeenCalledWith(3);
      expect(cacheService.set).toHaveBeenCalled();
    });
  });
});

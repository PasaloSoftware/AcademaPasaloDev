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
import { AdminFeedbackListQueryDto } from '@modules/feedback/dto/admin-feedback-list.dto';

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
            findAdminPaginated: jest.fn(),
            getAdminAggregates: jest.fn(),
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

  describe('getAdminTestimonies', () => {
    const mockItem = {
      id: '1',
      rating: 5,
      comment: 'Excelente',
      isActive: false,
      createdAt: new Date('2024-01-01'),
      courseCycleId: '10',
      photoUrl: null,
      photoSource: PhotoSource.NONE,
      updatedAt: null,
      userId: 'u1',
      user: {
        id: 'u1',
        firstName: 'Ana',
        lastName1: 'Garcia',
        lastName2: null,
        profilePhotoUrl: null,
        career: { id: 1, name: 'Derecho' },
      },
      courseCycle: {
        id: '10',
        course: { name: 'Matematicas' },
      },
    } as unknown as CourseTestimony;

    it('should return paginated list with pagination metadata', async () => {
      jest
        .spyOn(testimonyRepo, 'findAdminPaginated')
        .mockResolvedValue([[mockItem], 10]);
      jest.spyOn(testimonyRepo, 'getAdminAggregates').mockResolvedValue({
        total: '10',
        average: '4.50',
        r1: '0',
        r2: '0',
        r3: '1',
        r4: '4',
        r5: '5',
      });

      const query = new AdminFeedbackListQueryDto();
      query.page = 1;

      const result = await service.getAdminTestimonies(query);

      expect(result.currentPage).toBe(1);
      expect(result.pageSize).toBe(6);
      expect(result.totalItems).toBe(10);
      expect(result.totalPages).toBe(2);
      expect(result.items).toHaveLength(1);
    });

    it('should map item fields including courseName and careerName', async () => {
      jest
        .spyOn(testimonyRepo, 'findAdminPaginated')
        .mockResolvedValue([[mockItem], 1]);
      jest.spyOn(testimonyRepo, 'getAdminAggregates').mockResolvedValue({
        total: '1',
        average: '5.00',
        r1: '0',
        r2: '0',
        r3: '0',
        r4: '0',
        r5: '1',
      });

      const query = new AdminFeedbackListQueryDto();
      const result = await service.getAdminTestimonies(query);

      const item = result.items[0];
      expect(item.courseName).toBe('Matematicas');
      expect(item.user.careerName).toBe('Derecho');
      expect(item.user.firstName).toBe('Ana');
    });

    it('should return all stats zeroed when no testimonies exist', async () => {
      jest
        .spyOn(testimonyRepo, 'findAdminPaginated')
        .mockResolvedValue([[], 0]);
      jest.spyOn(testimonyRepo, 'getAdminAggregates').mockResolvedValue({
        total: '0',
        average: null,
        r1: '0',
        r2: '0',
        r3: '0',
        r4: '0',
        r5: '0',
      });

      const query = new AdminFeedbackListQueryDto();
      const result = await service.getAdminTestimonies(query);

      expect(result.stats.total).toBe(0);
      expect(result.stats.average).toBe(0);
      expect(result.stats.distribution[1]).toBe(0);
      expect(result.stats.distribution[5]).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.items).toHaveLength(0);
    });

    it('should compute distribution percentages correctly', async () => {
      jest
        .spyOn(testimonyRepo, 'findAdminPaginated')
        .mockResolvedValue([[], 4]);
      jest.spyOn(testimonyRepo, 'getAdminAggregates').mockResolvedValue({
        total: '4',
        average: '4.00',
        r1: '0',
        r2: '0',
        r3: '0',
        r4: '2',
        r5: '2',
      });

      const query = new AdminFeedbackListQueryDto();
      const result = await service.getAdminTestimonies(query);

      expect(result.stats.distribution[4]).toBe(50);
      expect(result.stats.distribution[5]).toBe(50);
      expect(result.stats.distribution[1]).toBe(0);
    });

    it('should pass filters to repo methods', async () => {
      jest
        .spyOn(testimonyRepo, 'findAdminPaginated')
        .mockResolvedValue([[], 0]);
      jest.spyOn(testimonyRepo, 'getAdminAggregates').mockResolvedValue({
        total: '0',
        average: null,
        r1: '0',
        r2: '0',
        r3: '0',
        r4: '0',
        r5: '0',
      });

      const query = new AdminFeedbackListQueryDto();
      query.page = 2;
      query.rating = 5;
      query.isActive = true;

      await service.getAdminTestimonies(query);

      expect(testimonyRepo.findAdminPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ rating: 5, isActive: true }),
        2,
        6,
      );
      expect(testimonyRepo.getAdminAggregates).toHaveBeenCalledWith(
        expect.objectContaining({ rating: 5, isActive: true }),
      );
    });
  });
});

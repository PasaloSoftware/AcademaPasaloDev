import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CoursesService } from '../src/modules/courses/application/courses.service';
import { RedisCacheService } from '../src/infrastructure/cache/redis-cache.service';
import { CourseCycleRepository } from '../src/modules/courses/infrastructure/course-cycle.repository';
import { CourseCycleProfessorRepository } from '../src/modules/courses/infrastructure/course-cycle-professor.repository';
import { CourseCycleAllowedEvaluationTypeRepository } from '../src/modules/courses/infrastructure/course-cycle-allowed-evaluation-type.repository';
import { EvaluationRepository } from '../src/modules/evaluations/infrastructure/evaluation.repository';
import { CourseRepository } from '../src/modules/courses/infrastructure/course.repository';
import { CourseTypeRepository } from '../src/modules/courses/infrastructure/course-type.repository';
import { CycleLevelRepository } from '../src/modules/courses/infrastructure/cycle-level.repository';
import { CyclesService } from '../src/modules/cycles/application/cycles.service';
import { MediaAccessMembershipDispatchService } from '../src/modules/media-access/application/media-access-membership-dispatch.service';
import { CourseCycleDriveProvisioningService } from '../src/modules/media-access/application/course-cycle-drive-provisioning.service';
import { StorageService } from '../src/infrastructure/storage/storage.service';
import { MaterialFolderRepository } from '../src/modules/materials/infrastructure/material-folder.repository';
import { MaterialRepository } from '../src/modules/materials/infrastructure/material.repository';
import { FileResourceRepository } from '../src/modules/materials/infrastructure/file-resource.repository';
import { MaterialCatalogRepository } from '../src/modules/materials/infrastructure/material-catalog.repository';

describe('Courses Content Logic (Integration)', () => {
  let coursesService: CoursesService;
  let cacheService: RedisCacheService;
  let courseCycleRepository: CourseCycleRepository;
  let evaluationRepository: EvaluationRepository;
  let courseCycleProfessorRepository: CourseCycleProfessorRepository;

  const mockCycleId = 'cycle-123';
  const mockUserId = 'user-abc';

  const mockFullCycle = {
    id: mockCycleId,
    course: { name: 'Fisica I', code: 'FIS101' },
    academicCycle: {
      code: '2026-1',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-07-01'),
    },
  };

  const mockEvaluations = [
    {
      id: 'ev-1',
      number: 1,
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-03-02'),
      evaluationType: { code: 'PC', name: 'PRACTICA CALIFICADA' },
      enrollmentEvaluations: [],
    },
    {
      id: 'ev-2',
      number: 2,
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-02'),
      evaluationType: { code: 'EX', name: 'EXAMEN' },
      enrollmentEvaluations: [
        {
          isActive: true,
          accessStartDate: new Date('2026-06-01'),
          accessEndDate: new Date('2026-06-02'),
        },
      ],
    },
  ];

  const mockProfessors = [
    { id: 'prof-1', firstName: 'Juan', lastName1: 'Perez' },
    { id: 'prof-2', firstName: 'Maria', lastName1: 'Garcia' },
  ];

  const mockAssignments = [
    { professor: mockProfessors[0] },
    { professor: mockProfessors[1] },
  ];

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        {
          provide: DataSource,
          useValue: { transaction: jest.fn() },
        },
        {
          provide: CourseRepository,
          useValue: {},
        },
        {
          provide: CourseTypeRepository,
          useValue: {},
        },
        {
          provide: CycleLevelRepository,
          useValue: {},
        },
        {
          provide: CourseCycleRepository,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: mockCycleId }),
            findFullById: jest.fn().mockResolvedValue(mockFullCycle),
          },
        },
        {
          provide: CourseCycleProfessorRepository,
          useValue: {
            findByCourseCycleId: jest.fn().mockResolvedValue(mockAssignments),
            canProfessorReadCourseCycle: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: CourseCycleAllowedEvaluationTypeRepository,
          useValue: {
            findActiveByCourseCycleId: jest.fn(),
            findActiveWithTypeByCourseCycleId: jest.fn(),
            replaceAllowedTypes: jest.fn(),
          },
        },
        {
          provide: EvaluationRepository,
          useValue: {
            findAllWithUserAccess: jest.fn().mockResolvedValue(mockEvaluations),
            findByCourseCycle: jest.fn().mockResolvedValue(mockEvaluations),
            findTypeByCode: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: CyclesService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: RedisCacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(null),
            addToIndex: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: MediaAccessMembershipDispatchService,
          useValue: {
            enqueueGrantForUserEvaluations: jest.fn(),
            enqueueRevokeForUserEvaluations: jest.fn(),
            enqueueGrantForUserCourseCycles: jest.fn(),
            enqueueRevokeForUserCourseCycles: jest.fn(),
          },
        },
        {
          provide: CourseCycleDriveProvisioningService,
          useValue: {},
        },
        {
          provide: StorageService,
          useValue: {},
        },
        {
          provide: MaterialFolderRepository,
          useValue: {},
        },
        {
          provide: MaterialRepository,
          useValue: {},
        },
        {
          provide: FileResourceRepository,
          useValue: {},
        },
        {
          provide: MaterialCatalogRepository,
          useValue: {},
        },
      ],
    }).compile();

    coursesService = moduleRef.get<CoursesService>(CoursesService);
    cacheService = moduleRef.get<RedisCacheService>(RedisCacheService);
    courseCycleRepository = moduleRef.get<CourseCycleRepository>(
      CourseCycleRepository,
    );
    evaluationRepository =
      moduleRef.get<EvaluationRepository>(EvaluationRepository);
    courseCycleProfessorRepository =
      moduleRef.get<CourseCycleProfessorRepository>(
        CourseCycleProfessorRepository,
      );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getProfessorsByCourseCycle', () => {
    it('should return professors from repository and set cache', async () => {
      const result =
        await coursesService.getProfessorsByCourseCycle(mockCycleId);

      expect(result).toHaveLength(2);
      expect(result[0].firstName).toBe('Juan');
      expect(
        courseCycleProfessorRepository.findByCourseCycleId,
      ).toHaveBeenCalledWith(mockCycleId);
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should return professors from cache if available', async () => {
      (cacheService.get as jest.Mock).mockResolvedValue(mockProfessors);

      const result =
        await coursesService.getProfessorsByCourseCycle(mockCycleId);

      expect(result).toEqual(mockProfessors);
      expect(
        courseCycleProfessorRepository.findByCourseCycleId,
      ).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if cycle does not exist', async () => {
      (courseCycleRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        coursesService.getProfessorsByCourseCycle('invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCourseContent', () => {
    it('should calculate LOCKED status correctly when user has no access', async () => {
      const result = await coursesService.getCourseContent(
        mockCycleId,
        mockUserId,
      );
      const parcial = result.evaluations.find((e) => e.id === 'ev-1');

      expect(parcial).toBeDefined();
      expect(parcial?.evaluationTypeCode).toBe('PC');
      expect(parcial?.shortName).toBe('PC1');
      expect(parcial?.fullName).toBe('Practica Calificada 1');
      expect(parcial?.label).toBe('Bloqueado');
    });

    it('should grant professors full access on assigned course cycle', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-01T00:00:00.000Z'));

      const result = await coursesService.getCourseContent(
        mockCycleId,
        mockUserId,
        'PROFESSOR',
      );
      const parcial = result.evaluations.find((e) => e.id === 'ev-1');
      const finalExam = result.evaluations.find((e) => e.id === 'ev-2');

      expect(parcial?.fullName).toBe('Practica Calificada 1');
      expect(parcial?.label).toBe('Completado');
      expect(finalExam?.shortName).toBe('EX2');
      expect(finalExam?.label).toBe('Próximamente');
      expect(
        courseCycleProfessorRepository.canProfessorReadCourseCycle,
      ).toHaveBeenCalledWith(mockCycleId, mockUserId);
      expect(evaluationRepository.findByCourseCycle).toHaveBeenCalledWith(
        mockCycleId,
      );
      expect(evaluationRepository.findAllWithUserAccess).not.toHaveBeenCalled();
    });

    it('should calculate STATUS based on current time vs access dates', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-01T00:00:00.000Z'));

      const result = await coursesService.getCourseContent(
        mockCycleId,
        mockUserId,
      );
      const finalExam = result.evaluations.find((e) => e.id === 'ev-2');

      expect(finalExam?.label).toBe('Próximamente');

      jest.useFakeTimers().setSystemTime(new Date('2026-06-01T12:00:00.000Z'));
      const resultInProgress = await coursesService.getCourseContent(
        mockCycleId,
        mockUserId,
      );
      const finalInProgress = resultInProgress.evaluations.find(
        (e) => e.id === 'ev-2',
      );
      expect(finalInProgress?.label).toBe('En curso');

      jest.useFakeTimers().setSystemTime(new Date('2026-07-01T00:00:00.000Z'));
      const resultExpired = await coursesService.getCourseContent(
        mockCycleId,
        mockUserId,
      );
      const finalExpired = resultExpired.evaluations.find(
        (e) => e.id === 'ev-2',
      );
      expect(finalExpired?.label).toBe('Completado');
    });

    it('should use CACHE if available and skip DB calls', async () => {
      const cachedData = {
        cycle: mockFullCycle,
        evaluations: mockEvaluations,
      };
      (cacheService.get as jest.Mock).mockResolvedValue(cachedData);

      await coursesService.getCourseContent(mockCycleId, mockUserId);

      expect(cacheService.get).toHaveBeenCalled();
      expect(evaluationRepository.findAllWithUserAccess).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if cycle does not exist', async () => {
      (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue(null);

      await expect(
        coursesService.getCourseContent('invalid-id', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

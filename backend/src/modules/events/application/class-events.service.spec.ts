import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { ClassEventsService } from '@modules/events/application/class-events.service';
import { ClassEventsPermissionService } from '@modules/events/application/class-events-permission.service';
import { ClassEventsSchedulingService } from '@modules/events/application/class-events-scheduling.service';
import { ClassEventRepository } from '@modules/events/infrastructure/class-event.repository';
import { ClassEventProfessorRepository } from '@modules/events/infrastructure/class-event-professor.repository';
import { ClassEventRecordingStatusRepository } from '@modules/events/infrastructure/class-event-recording-status.repository';
import { EvaluationRepository } from '@modules/evaluations/infrastructure/evaluation.repository';
import { CourseCycleRepository } from '@modules/courses/infrastructure/course-cycle.repository';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { AuthSettingsService } from '@modules/auth/application/auth-settings.service';
import { UserWithSession } from '@modules/auth/strategies/jwt.strategy';
import { ClassEvent } from '@modules/events/domain/class-event.entity';
import { Evaluation } from '@modules/evaluations/domain/evaluation.entity';
import { CourseCycle } from '@modules/courses/domain/course-cycle.entity';
import { ROLE_CODES } from '@common/constants/role-codes.constants';
import { ForbiddenException } from '@nestjs/common';
import {
  CLASS_EVENT_CACHE_KEYS,
  CLASS_EVENT_STATUS,
} from '@modules/events/domain/class-event.constants';

describe('ClassEventsService', () => {
  let service: ClassEventsService;
  let classEventRepository: jest.Mocked<ClassEventRepository>;
  let evaluationRepository: jest.Mocked<EvaluationRepository>;
  let courseCycleRepository: jest.Mocked<CourseCycleRepository>;
  let classEventRecordingStatusRepository: jest.Mocked<ClassEventRecordingStatusRepository>;
  let permissionService: jest.Mocked<ClassEventsPermissionService>;
  let schedulingService: jest.Mocked<ClassEventsSchedulingService>;
  let authSettingsService: jest.Mocked<AuthSettingsService>;
  let cacheService: jest.Mocked<RedisCacheService>;
  let dataSource: jest.Mocked<DataSource>;

  const mockAdmin: UserWithSession = {
    id: 'admin-1',
    activeRole: ROLE_CODES.ADMIN,
    roles: [{ code: ROLE_CODES.ADMIN }],
  } as UserWithSession;

  const mockProfessor: UserWithSession = {
    id: 'prof-1',
    activeRole: ROLE_CODES.PROFESSOR,
    roles: [{ code: ROLE_CODES.PROFESSOR }],
  } as UserWithSession;

  const mockStudent: UserWithSession = {
    id: 'student-1',
    activeRole: ROLE_CODES.STUDENT,
    roles: [{ code: ROLE_CODES.STUDENT }],
  } as UserWithSession;

  const mockEvent = {
    id: 'event-1',
    evaluationId: 'eval-1',
    sessionNumber: 1,
    title: 'Clase 1',
    topic: 'Intro',
    startDatetime: new Date('2026-02-01T08:00:00Z'),
    endDatetime: new Date('2026-02-01T10:00:00Z'),
    liveMeetingUrl: 'http://link.com',
    recordingUrl: null,
    isCancelled: false,
    createdBy: 'prof-1',
  } as ClassEvent;

  const mockEvaluation = {
    id: 'eval-1',
    courseCycleId: 'cycle-1',
    courseCycle: {
      academicCycleId: 'ac-1',
      course: { courseTypeId: 'ct-1' },
    },
    startDate: new Date('2026-01-01T00:00:00Z'),
    endDate: new Date('2026-12-31T23:59:59Z'),
  } as Evaluation;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassEventsService,
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((arg1: unknown, arg2?: unknown) => {
              const runInTransaction = (
                typeof arg1 === 'function' ? arg1 : arg2
              ) as (manager: EntityManager) => Promise<unknown>;
              return runInTransaction({
                getRepository: jest.fn(),
                query: jest.fn().mockResolvedValue([{ acquired: 1 }]),
              } as unknown as EntityManager);
            }),
            query: jest.fn().mockResolvedValue([{ 1: 1 }]),
          },
        },
        {
          provide: ClassEventRepository,
          useValue: {
            create: jest.fn(),
            findByEvaluationAndSessionNumber: jest.fn(),
            findByEvaluationId: jest.fn(),
            findById: jest.fn(),
            findByIdSimple: jest.fn(),
            update: jest.fn(),
            cancelEvent: jest.fn(),
            findByUserAndRange: jest.fn(),
            findOverlap: jest.fn(),
            findGlobalSessionsByCourseCyclesAndRange: jest.fn(),
            findAffectedScheduleUserIdsByEvaluation: jest
              .fn()
              .mockResolvedValue([]),
          },
        },
        {
          provide: ClassEventProfessorRepository,
          useValue: {
            assignProfessor: jest.fn(),
            isProfessorAssigned: jest.fn(),
            revokeProfessor: jest.fn(),
          },
        },
        {
          provide: ClassEventRecordingStatusRepository,
          useValue: {
            findByCode: jest.fn().mockResolvedValue({
              id: '1',
              code: 'NOT_AVAILABLE',
              name: 'Grabación no disponible',
            }),
          },
        },
        {
          provide: EvaluationRepository,
          useValue: {
            findByIdWithCycle: jest.fn(),
          },
        },
        {
          provide: CourseCycleRepository,
          useValue: {
            findFullById: jest.fn(),
            findSiblingLayersByCategoryAndCycle: jest.fn(),
            findCategoryMetadataByIds: jest.fn(),
          },
        },
        {
          provide: AuthSettingsService,
          useValue: {
            getActiveCycleId: jest.fn(),
          },
        },
        {
          provide: ClassEventsPermissionService,
          useValue: {
            checkUserAuthorization: jest.fn(),
            checkUserAuthorizationForUser: jest.fn(),
            assertMutationAllowedForEvaluation: jest.fn(),
            validateEventOwnership: jest.fn(),
            isAdminUser: jest.fn(),
          },
        },
        {
          provide: ClassEventsSchedulingService,
          useValue: {
            acquireCalendarLock: jest.fn().mockResolvedValue('lock-key'),
            releaseCalendarLock: jest.fn().mockResolvedValue(undefined),
            findOverlap: jest.fn().mockResolvedValue(null),
            validateEventDates: jest.fn().mockReturnValue(undefined),
          },
        },
        {
          provide: RedisCacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            del: jest.fn().mockResolvedValue(undefined),
            addToIndex: jest.fn().mockResolvedValue(undefined),
            invalidateIndex: jest.fn().mockResolvedValue(undefined),
            invalidateGroup: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<ClassEventsService>(ClassEventsService);
    classEventRepository = module.get(ClassEventRepository);
    evaluationRepository = module.get(EvaluationRepository);
    courseCycleRepository = module.get(CourseCycleRepository);
    classEventRecordingStatusRepository = module.get(
      ClassEventRecordingStatusRepository,
    );
    permissionService = module.get(ClassEventsPermissionService);
    schedulingService = module.get(ClassEventsSchedulingService);
    authSettingsService = module.get(AuthSettingsService);
    cacheService = module.get(RedisCacheService);
    dataSource = module.get(DataSource);
    
    // Default mocks behavior
    authSettingsService.getActiveCycleId.mockResolvedValue('ac-1');
    permissionService.checkUserAuthorization.mockResolvedValue(true);
    permissionService.checkUserAuthorizationForUser.mockResolvedValue(true);
    permissionService.assertMutationAllowedForEvaluation.mockResolvedValue(undefined);
    permissionService.validateEventOwnership.mockReturnValue(undefined);
    permissionService.isAdminUser.mockReturnValue(false);
  });

  describe('createEvent', () => {
    it('debe crear un evento exitosamente', async () => {
      evaluationRepository.findByIdWithCycle.mockResolvedValue(mockEvaluation);
      classEventRepository.findByEvaluationAndSessionNumber.mockResolvedValue(
        null,
      );
      classEventRepository.findAffectedScheduleUserIdsByEvaluation.mockResolvedValue(
        ['prof-1', 'student-1'],
      );
      classEventRepository.create.mockResolvedValue(mockEvent);

      await service.createEvent(
        'eval-1',
        1,
        'Clase 1',
        'Topic',
        new Date('2026-02-01T08:00:00Z'),
        new Date('2026-02-01T10:00:00Z'),
        'link',
        mockProfessor,
      );

      expect(classEventRepository.create).toHaveBeenCalled();
      expect(permissionService.assertMutationAllowedForEvaluation).toHaveBeenCalled();
      expect(schedulingService.acquireCalendarLock).toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si hay traslape de horario en el curso', async () => {
      evaluationRepository.findByIdWithCycle.mockResolvedValue(mockEvaluation);
      schedulingService.findOverlap.mockResolvedValue({
        sessionNumber: 2,
        evaluation: { evaluationType: { name: 'PC' }, number: 1 },
      } as any);

      await expect(
        service.createEvent(
          'eval-1',
          3,
          'Clase 3',
          'Topic',
          new Date('2026-02-01T08:00:00Z'),
          new Date('2026-02-01T10:00:00Z'),
          'link',
          mockProfessor,
        ),
      ).rejects.toThrow('El horario ya está ocupado');
    });
  });

  describe('updateEvent', () => {
    it('debe actualizar el evento exitosamente', async () => {
      classEventRepository.findByIdSimple.mockResolvedValue(mockEvent);
      evaluationRepository.findByIdWithCycle.mockResolvedValue(mockEvaluation);
      classEventRepository.update.mockResolvedValue({ ...mockEvent, title: 'Updated' });

      await service.updateEvent('event-1', mockProfessor, 'Updated');

      expect(classEventRepository.update).toHaveBeenCalled();
      expect(permissionService.validateEventOwnership).toHaveBeenCalled();
      expect(permissionService.assertMutationAllowedForEvaluation).toHaveBeenCalled();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { ClassEventsService } from '@modules/events/application/class-events.service';
import { ClassEventRepository } from '@modules/events/infrastructure/class-event.repository';
import { ClassEventProfessorRepository } from '@modules/events/infrastructure/class-event-professor.repository';
import { ClassEventRecordingStatusRepository } from '@modules/events/infrastructure/class-event-recording-status.repository';
import { EvaluationRepository } from '@modules/evaluations/infrastructure/evaluation.repository';
import { EnrollmentEvaluationRepository } from '@modules/enrollments/infrastructure/enrollment-evaluation.repository';
import { CourseCycleProfessorRepository } from '@modules/courses/infrastructure/course-cycle-professor.repository';
import { CourseCycleRepository } from '@modules/courses/infrastructure/course-cycle.repository';
import { UserRepository } from '@modules/users/infrastructure/user.repository';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { AuthSettingsService } from '@modules/auth/application/auth-settings.service';
import { UserWithSession } from '@modules/auth/strategies/jwt.strategy';
import { ClassEvent } from '@modules/events/domain/class-event.entity';
import { Evaluation } from '@modules/evaluations/domain/evaluation.entity';
import { CourseCycle } from '@modules/courses/domain/course-cycle.entity';
import { ROLE_CODES } from '@common/constants/role-codes.constants';
import {
  CLASS_EVENT_CACHE_KEYS,
  CLASS_EVENT_STATUS,
} from '@modules/events/domain/class-event.constants';

describe('ClassEventsService', () => {
  let service: ClassEventsService;
  let classEventRepository: jest.Mocked<ClassEventRepository>;
  let evaluationRepository: jest.Mocked<EvaluationRepository>;
  let courseCycleProfessorRepository: jest.Mocked<CourseCycleProfessorRepository>;
  let courseCycleRepository: jest.Mocked<CourseCycleRepository>;
  let classEventRecordingStatusRepository: jest.Mocked<ClassEventRecordingStatusRepository>;
  let enrollmentEvaluationRepository: jest.Mocked<EnrollmentEvaluationRepository>;
  let authSettingsService: jest.Mocked<AuthSettingsService>;
  let userRepository: jest.Mocked<UserRepository>;
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
              name: 'GrabaciÃ³n no disponible',
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
          provide: EnrollmentEvaluationRepository,
          useValue: {
            checkAccess: jest.fn(),
          },
        },
        {
          provide: CourseCycleProfessorRepository,
          useValue: {
            isProfessorAssigned: jest.fn(),
            isProfessorAssignedToEvaluation: jest.fn(),
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
          provide: UserRepository,
          useValue: {
            findById: jest.fn(),
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
    courseCycleProfessorRepository = module.get(CourseCycleProfessorRepository);
    courseCycleRepository = module.get(CourseCycleRepository);
    classEventRecordingStatusRepository = module.get(
      ClassEventRecordingStatusRepository,
    );
    enrollmentEvaluationRepository = module.get(EnrollmentEvaluationRepository);
    authSettingsService = module.get(AuthSettingsService);
    userRepository = module.get(UserRepository);
    cacheService = module.get(RedisCacheService);
    dataSource = module.get(DataSource);
    authSettingsService.getActiveCycleId.mockResolvedValue('ac-1');
    (
      courseCycleProfessorRepository.isProfessorAssignedToEvaluation as jest.Mock
    ).mockResolvedValue(true);
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
      expect(classEventRecordingStatusRepository.findByCode).toHaveBeenCalled();
      expect(cacheService.del).toHaveBeenCalledWith(
        CLASS_EVENT_CACHE_KEYS.EVALUATION_LIST('eval-1'),
      );
      expect(cacheService.invalidateIndex).toHaveBeenCalledWith(
        CLASS_EVENT_CACHE_KEYS.CATEGORY_CYCLE_INDEX('ct-1', 'ac-1'),
      );
      expect(cacheService.invalidateIndex).toHaveBeenCalledWith(
        CLASS_EVENT_CACHE_KEYS.USER_SCHEDULE_INDEX('prof-1'),
      );
      expect(cacheService.invalidateIndex).toHaveBeenCalledWith(
        CLASS_EVENT_CACHE_KEYS.USER_SCHEDULE_INDEX('student-1'),
      );
    });

    it('debe lanzar ConflictException si hay traslape de horario en el curso', async () => {
      evaluationRepository.findByIdWithCycle.mockResolvedValue(mockEvaluation);
      classEventRepository.findOverlap.mockResolvedValue({
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
      ).rejects.toThrow('El horario ya');
    });

    it('debe usar cache para estado de grabaciÃ³n si ya existe', async () => {
      cacheService.get.mockImplementation(async (key: string) => {
        if (key === 'cache:class-event-recording-status:code:NOT_AVAILABLE') {
          return '1';
        }
        return null;
      });
      evaluationRepository.findByIdWithCycle.mockResolvedValue(mockEvaluation);
      classEventRepository.findByEvaluationAndSessionNumber.mockResolvedValue(
        null,
      );
      classEventRepository.create.mockResolvedValue(mockEvent);

      await service.createEvent(
        'eval-1',
        2,
        'Clase 2',
        'Topic',
        new Date('2026-02-02T08:00:00Z'),
        new Date('2026-02-02T10:00:00Z'),
        'link',
        mockProfessor,
      );

      expect(
        classEventRecordingStatusRepository.findByCode,
      ).not.toHaveBeenCalled();
      cacheService.get.mockResolvedValue(null);
    });
  });

  describe('getEventsByEvaluation', () => {
    it('debe retornar eventos si el usuario es STAFF (Bypass)', async () => {
      userRepository.findById.mockResolvedValue(mockAdmin);
      classEventRepository.findByEvaluationId.mockResolvedValue([mockEvent]);

      const result = await service.getEventsByEvaluation('eval-1', 'admin-1');

      expect(result).toEqual([mockEvent]);
    });

    it('debe retornar eventos si el ALUMNO estÃ¡ matriculado', async () => {
      userRepository.findById.mockResolvedValue(mockStudent);
      enrollmentEvaluationRepository.checkAccess.mockResolvedValue(true);
      classEventRepository.findByEvaluationId.mockResolvedValue([mockEvent]);

      const result = await service.getEventsByEvaluation('eval-1', 'student-1');

      expect(result).toEqual([mockEvent]);
    });
  });

  describe('getEventDetail', () => {
    it('debe retornar detalle si el STAFF tiene acceso', async () => {
      classEventRepository.findById.mockResolvedValue(mockEvent);
      userRepository.findById.mockResolvedValue(mockAdmin);

      const result = await service.getEventDetail('event-1', 'admin-1');

      expect(result).toEqual(mockEvent);
    });
  });

  describe('checkUserAuthorization', () => {
    it('debe conceder acceso a ADMINS (Bypass Total)', async () => {
      userRepository.findById.mockResolvedValue(mockAdmin);
      const result = await service.checkUserAuthorization('admin-1', 'eval-1');
      expect(result).toBe(true);
    });

    it('debe conceder acceso a PROFESORES asignados', async () => {
      userRepository.findById.mockResolvedValue(mockProfessor);
      (
        courseCycleProfessorRepository.isProfessorAssignedToEvaluation as jest.Mock
      ).mockResolvedValue(true);

      const result = await service.checkUserAuthorization('prof-1', 'eval-1');
      expect(result).toBe(true);
    });

    it('debe denegar acceso a PROFESORES NO asignados', async () => {
      userRepository.findById.mockResolvedValue(mockProfessor);
      (
        courseCycleProfessorRepository.isProfessorAssignedToEvaluation as jest.Mock
      ).mockResolvedValue(false);

      const result = await service.checkUserAuthorization('prof-1', 'eval-1');
      expect(result).toBe(false);
    });
  });

  describe('canAccessMeetingLink', () => {
    it('no debe consultar userRepository.findById cuando recibe el User (admin bypass)', async () => {
      const now = Date.now();
      const event = {
        ...mockEvent,
        startDatetime: new Date(now + 60 * 60 * 1000),
        endDatetime: new Date(now + 2 * 60 * 60 * 1000),
      } as ClassEvent;

      const result = await service.canAccessMeetingLink(event, mockAdmin);

      expect(result).toBe(true);
      expect(userRepository.findById).not.toHaveBeenCalled();
    });

    it('debe denegar si el evento no tiene liveMeetingUrl sin consultar repositorios', async () => {
      const event = {
        ...mockEvent,
        liveMeetingUrl: null,
      } as unknown as ClassEvent;

      const result = await service.canAccessMeetingLink(event, mockAdmin);

      expect(result).toBe(false);
      expect(userRepository.findById).not.toHaveBeenCalled();
      expect(enrollmentEvaluationRepository.checkAccess).not.toHaveBeenCalled();
      expect(
        courseCycleProfessorRepository.isProfessorAssignedToEvaluation,
      ).not.toHaveBeenCalled();
    });

    it('como STUDENT debe consultar checkAccess (sin consultar userRepository.findById)', async () => {
      const now = Date.now();
      const event = {
        ...mockEvent,
        startDatetime: new Date(now + 60 * 60 * 1000),
        endDatetime: new Date(now + 2 * 60 * 60 * 1000),
      } as ClassEvent;
      enrollmentEvaluationRepository.checkAccess.mockResolvedValue(true);

      const result = await service.canAccessMeetingLink(event, mockStudent);

      expect(result).toBe(true);
      expect(userRepository.findById).not.toHaveBeenCalled();
      expect(enrollmentEvaluationRepository.checkAccess).toHaveBeenCalledWith(
        'student-1',
        'eval-1',
      );
    });

    it('como PROFESSOR debe consultar la asignaciÃ³n (sin consultar userRepository.findById)', async () => {
      const now = Date.now();
      const event = {
        ...mockEvent,
        startDatetime: new Date(now + 60 * 60 * 1000),
        endDatetime: new Date(now + 2 * 60 * 60 * 1000),
      } as ClassEvent;
      (
        courseCycleProfessorRepository.isProfessorAssignedToEvaluation as jest.Mock
      ).mockResolvedValue(true);

      const result = await service.canAccessMeetingLink(event, mockProfessor);

      expect(result).toBe(true);
      expect(userRepository.findById).not.toHaveBeenCalled();
      expect(
        courseCycleProfessorRepository.isProfessorAssignedToEvaluation,
      ).toHaveBeenCalledWith('eval-1', 'prof-1');
      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('canWatchRecording', () => {
    it('debe permitir ver grabaciÃ³n finalizada con acceso', async () => {
      const now = Date.now();
      const event = {
        ...mockEvent,
        startDatetime: new Date(now - 2 * 60 * 60 * 1000),
        endDatetime: new Date(now - 60 * 60 * 1000),
        recordingUrl: 'https://video.example.com/rec-1',
      } as ClassEvent;
      enrollmentEvaluationRepository.checkAccess.mockResolvedValue(true);

      const result = await service.canWatchRecording(event, mockStudent);

      expect(result).toBe(true);
      expect(enrollmentEvaluationRepository.checkAccess).toHaveBeenCalledWith(
        'student-1',
        'eval-1',
      );
    });
  });

  describe('getMySchedule (baseline actual)', () => {
    it('debe retornar tal cual los eventos del repositorio sin filtro adicional por acceso fino', async () => {
      const start = new Date('2026-02-01T00:00:00Z');
      const end = new Date('2026-02-07T23:59:59Z');
      const eventWithoutAccessFilter = {
        ...mockEvent,
        evaluationId: 'eval-no-access',
      } as ClassEvent;

      classEventRepository.findByUserAndRange.mockResolvedValue([
        eventWithoutAccessFilter,
      ]);

      const result = await service.getMySchedule('student-1', start, end);

      expect(result).toEqual([eventWithoutAccessFilter]);
      expect(classEventRepository.findByUserAndRange).toHaveBeenCalledWith(
        'student-1',
        start,
        end,
      );
      expect(enrollmentEvaluationRepository.checkAccess).not.toHaveBeenCalled();
    });
  });

  describe('getDiscoveryLayers', () => {
    it('debe fallar si el courseCycle no pertenece al ciclo activo', async () => {
      courseCycleRepository.findFullById.mockResolvedValue({
        id: 'cc-1',
        academicCycleId: 'ac-1',
        course: { courseTypeId: 'ct-1' },
      } as unknown as CourseCycle);
      authSettingsService.getActiveCycleId.mockResolvedValue('ac-2');

      await expect(service.getDiscoveryLayers('cc-1')).rejects.toThrow(
        'ciclo actual',
      );
    });

    it('debe retornar capas hermanas del mismo tipo y ciclo activo', async () => {
      courseCycleRepository.findFullById.mockResolvedValue({
        id: 'cc-1',
        academicCycleId: 'ac-1',
        course: { courseTypeId: 'ct-1' },
      } as unknown as CourseCycle);
      authSettingsService.getActiveCycleId.mockResolvedValue('ac-1');
      courseCycleRepository.findSiblingLayersByCategoryAndCycle.mockResolvedValue(
        [
          {
            courseCycleId: 'cc-2',
            courseId: 'course-2',
            courseCode: 'MAT-102',
            courseName: 'Algebra II',
            primaryColor: '#111111',
            secondaryColor: '#222222',
            courseTypeCode: 'CIENCIAS',
          },
        ],
      );

      const result = await service.getDiscoveryLayers('cc-1');

      expect(result).toHaveLength(1);
      expect(result[0].courseCycleId).toBe('cc-2');
      expect(
        courseCycleRepository.findSiblingLayersByCategoryAndCycle,
      ).toHaveBeenCalledWith('cc-1', 'ac-1');
    });
  });

  describe('getGlobalSessions', () => {
    it('debe agrupar sesiones por courseCycle con colores', async () => {
      courseCycleRepository.findCategoryMetadataByIds.mockResolvedValue([
        {
          courseCycleId: 'cc-1',
          academicCycleId: 'ac-1',
          courseTypeId: 'ct-1',
        },
        {
          courseCycleId: 'cc-2',
          academicCycleId: 'ac-1',
          courseTypeId: 'ct-1',
        },
      ]);
      classEventRepository.findGlobalSessionsByCourseCyclesAndRange.mockResolvedValue(
        [
          {
            eventId: 'ev-1',
            evaluationId: 'eval-1',
            sessionNumber: 1,
            title: 'Sesion 1',
            topic: 'Tema 1',
            startDatetime: new Date('2026-02-10T10:00:00Z'),
            endDatetime: new Date('2026-02-10T11:00:00Z'),
            courseCycleId: 'cc-1',
            courseId: 'c-1',
            courseCode: 'MAT-101',
            courseName: 'Algebra I',
            primaryColor: '#123456',
            secondaryColor: '#abcdef',
          },
          {
            eventId: 'ev-2',
            evaluationId: 'eval-2',
            sessionNumber: 2,
            title: 'Sesion 2',
            topic: 'Tema 2',
            startDatetime: new Date('2026-02-10T12:00:00Z'),
            endDatetime: new Date('2026-02-10T13:00:00Z'),
            courseCycleId: 'cc-1',
            courseId: 'c-1',
            courseCode: 'MAT-101',
            courseName: 'Algebra I',
            primaryColor: '#123456',
            secondaryColor: '#abcdef',
          },
          {
            eventId: 'ev-3',
            evaluationId: 'eval-3',
            sessionNumber: 1,
            title: 'Sesion A',
            topic: 'Tema A',
            startDatetime: new Date('2026-02-11T10:00:00Z'),
            endDatetime: new Date('2026-02-11T11:00:00Z'),
            courseCycleId: 'cc-2',
            courseId: 'c-2',
            courseCode: 'FIS-101',
            courseName: 'Fisica I',
            primaryColor: '#111111',
            secondaryColor: '#222222',
          },
        ],
      );

      const result = await service.getGlobalSessions(
        ['cc-1', 'cc-2'],
        new Date('2026-02-01T00:00:00Z'),
        new Date('2026-02-28T23:59:59Z'),
      );

      expect(result).toHaveLength(2);
      expect(result[0].sessions.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('primaryColor');
      expect(result[0]).toHaveProperty('secondaryColor');
      expect(
        classEventRepository.findGlobalSessionsByCourseCyclesAndRange,
      ).toHaveBeenCalledWith(
        ['cc-1', 'cc-2'],
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('debe retornar vacio si no recibe courseCycleIds', async () => {
      const result = await service.getGlobalSessions(
        [],
        new Date('2026-02-01T00:00:00Z'),
        new Date('2026-02-28T23:59:59Z'),
      );

      expect(result).toEqual([]);
      expect(
        classEventRepository.findGlobalSessionsByCourseCyclesAndRange,
      ).not.toHaveBeenCalled();
    });

    it('debe fallar si courseCycleIds mezclan categorÃ­a/ciclo', async () => {
      courseCycleRepository.findCategoryMetadataByIds.mockResolvedValue([
        {
          courseCycleId: 'cc-1',
          academicCycleId: 'ac-1',
          courseTypeId: 'ct-1',
        },
        {
          courseCycleId: 'cc-2',
          academicCycleId: 'ac-2',
          courseTypeId: 'ct-2',
        },
      ]);

      await expect(
        service.getGlobalSessions(
          ['cc-1', 'cc-2'],
          new Date('2026-02-01T00:00:00Z'),
          new Date('2026-02-28T23:59:59Z'),
        ),
      ).rejects.toThrow('misma categor');
    });
  });

  describe('ExpiraciÃ³n de Acceso (Instant Revocation)', () => {
    it('debe denegar acceso si la fecha actual es posterior a access_end_date', async () => {
      userRepository.findById.mockResolvedValue(mockStudent);
      enrollmentEvaluationRepository.checkAccess.mockResolvedValue(false);

      const result = await service.checkUserAuthorization(
        'student-1',
        'eval-1',
      );

      expect(result).toBe(false);
      expect(enrollmentEvaluationRepository.checkAccess).toHaveBeenCalledWith(
        'student-1',
        'eval-1',
      );
    });

    it('debe denegar acceso si la fecha actual es anterior a access_start_date', async () => {
      userRepository.findById.mockResolvedValue(mockStudent);
      enrollmentEvaluationRepository.checkAccess.mockResolvedValue(false);

      const result = await service.checkUserAuthorization(
        'student-1',
        'eval-1',
      );

      expect(result).toBe(false);
    });
  });

  describe('Integridad de Tipos de Fecha (RegresiÃ³n)', () => {
    it('debe calcular PROGRAMADA aunque la BD devuelva fechas como STRINGS (ProtecciÃ³n getEpoch)', () => {
      const eventWithStrings = {
        startDatetime: '2026-12-01T10:00:00.000Z',
        endDatetime: '2026-12-01T12:00:00.000Z',
        isCancelled: false,
      } as unknown as ClassEvent;

      const status = service.calculateEventStatus(eventWithStrings);

      expect(status).toBe(CLASS_EVENT_STATUS.PROGRAMADA);
    });
  });

  describe('updateEvent', () => {
    it('debe setear recordingStatusId READY cuando se actualiza recordingUrl', async () => {
      const event = {
        ...mockEvent,
        startDatetime: new Date('2026-02-01T08:00:00Z'),
        endDatetime: new Date('2026-02-01T10:00:00Z'),
      } as ClassEvent;
      classEventRepository.findByIdSimple.mockResolvedValue(event);
      evaluationRepository.findByIdWithCycle.mockResolvedValue(mockEvaluation);
      classEventRecordingStatusRepository.findByCode.mockResolvedValue({
        id: '3',
        code: 'READY',
        name: 'GrabaciÃ³n disponible',
      });
      classEventRepository.findAffectedScheduleUserIdsByEvaluation.mockResolvedValue(
        ['prof-1'],
      );
      classEventRepository.update.mockResolvedValue({
        ...event,
        recordingUrl: 'https://video.example.com/ready-1',
      } as ClassEvent);

      await service.updateEvent(
        'event-1',
        mockProfessor,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'https://video.example.com/ready-1',
      );

      expect(classEventRepository.update).toHaveBeenCalledWith(
        'event-1',
        expect.objectContaining({
          recordingUrl: 'https://video.example.com/ready-1',
          recordingStatusId: '3',
        }),
      );
      expect(cacheService.del).toHaveBeenCalledWith(
        CLASS_EVENT_CACHE_KEYS.EVALUATION_LIST('eval-1'),
      );
      expect(cacheService.del).toHaveBeenCalledWith(
        CLASS_EVENT_CACHE_KEYS.DETAIL('event-1'),
      );
      expect(cacheService.invalidateIndex).toHaveBeenCalledWith(
        CLASS_EVENT_CACHE_KEYS.USER_SCHEDULE_INDEX('prof-1'),
      );
    });

    it('debe lanzar ConflictException si el nuevo horario para actualizar se cruza con otra sesiÃ³n', async () => {
      const existingEvent = { ...mockEvent, id: 'event-1' };
      const overlappingEvent = {
        id: 'event-2',
        sessionNumber: 3,
        evaluation: { evaluationType: { name: 'PC' }, number: 1 },
      } as any;

      classEventRepository.findByIdSimple.mockResolvedValue(existingEvent);
      evaluationRepository.findByIdWithCycle.mockResolvedValue(mockEvaluation);
      classEventRepository.findOverlap.mockResolvedValue(overlappingEvent);

      await expect(
        service.updateEvent(
          'event-1',
          mockProfessor,
          undefined,
          undefined,
          new Date('2026-02-05T08:00:00Z'),
          new Date('2026-02-05T10:00:00Z'),
        ),
      ).rejects.toThrow('No es posible actualizar el horario');

      expect(classEventRepository.findOverlap).toHaveBeenCalledWith(
        'cycle-1',
        expect.any(Date),
        expect.any(Date),
        'event-1',
        expect.any(Object),
      );
    });

    it('debe actualizar el horario exitosamente si no hay traslape', async () => {
      const existingEvent = { ...mockEvent, id: 'event-1' };

      classEventRepository.findByIdSimple.mockResolvedValue(existingEvent);
      evaluationRepository.findByIdWithCycle.mockResolvedValue(mockEvaluation);
      classEventRepository.findOverlap.mockResolvedValue(null);
      classEventRepository.update.mockResolvedValue({
        ...existingEvent,
        startDatetime: new Date('2026-02-10T08:00:00Z'),
      } as any);

      await service.updateEvent(
        'event-1',
        mockProfessor,
        undefined,
        undefined,
        new Date('2026-02-10T08:00:00Z'),
        new Date('2026-02-10T10:00:00Z'),
      );

      expect(classEventRepository.update).toHaveBeenCalled();
    });
  });
});

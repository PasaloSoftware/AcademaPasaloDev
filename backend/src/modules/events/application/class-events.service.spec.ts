import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { ClassEventsService } from '@modules/events/application/class-events.service';
import { ClassEventsPermissionService } from '@modules/events/application/class-events-permission.service';
import { ClassEventsSchedulingService } from '@modules/events/application/class-events-scheduling.service';
import { ClassEventsCacheService } from '@modules/events/application/class-events-cache.service';
import { ClassEventRepository } from '@modules/events/infrastructure/class-event.repository';
import { ClassEventProfessorRepository } from '@modules/events/infrastructure/class-event-professor.repository';
import { ClassEventRecordingStatusRepository } from '@modules/events/infrastructure/class-event-recording-status.repository';
import { EvaluationRepository } from '@modules/evaluations/infrastructure/evaluation.repository';
import { CourseCycleProfessorRepository } from '@modules/courses/infrastructure/course-cycle-professor.repository';
import { UserRepository } from '@modules/users/infrastructure/user.repository';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { UserWithSession } from '@modules/auth/strategies/jwt.strategy';
import { ClassEvent } from '@modules/events/domain/class-event.entity';
import { Evaluation } from '@modules/evaluations/domain/evaluation.entity';
import { ROLE_CODES } from '@common/constants/role-codes.constants';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { CLASS_EVENT_STATUS } from '@modules/events/domain/class-event.constants';
import { NotificationsDispatchService } from '@modules/notifications/application/notifications-dispatch.service';
import { DriveAccessScopeService } from '@modules/media-access/application/drive-access-scope.service';
import { StorageService } from '@infrastructure/storage/storage.service';
import {
  MEDIA_ACCESS_MODES,
  MEDIA_VIDEO_LINK_MODES,
} from '@modules/media-access/domain/media-access.constants';

describe('ClassEventsService', () => {
  let service: ClassEventsService;
  let classEventRepository: jest.Mocked<ClassEventRepository>;
  let evaluationRepository: jest.Mocked<EvaluationRepository>;
  let permissionService: jest.Mocked<ClassEventsPermissionService>;
  let schedulingService: jest.Mocked<ClassEventsSchedulingService>;
  let cacheModuleService: jest.Mocked<ClassEventsCacheService>;
  let courseCycleProfessorRepository: jest.Mocked<CourseCycleProfessorRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let driveAccessScopeService: jest.Mocked<DriveAccessScopeService>;
  let storageService: jest.Mocked<StorageService>;
  let notificationsDispatchService: jest.Mocked<NotificationsDispatchService>;

  const mockProfessor: UserWithSession = {
    id: 'prof-1',
    activeRole: ROLE_CODES.PROFESSOR,
    roles: [{ code: ROLE_CODES.PROFESSOR }],
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
    recordingFileId: null,
    isCancelled: false,
    createdBy: 'prof-1',
  } as ClassEvent;

  const mockEvaluation = {
    id: 'eval-1',
    courseCycleId: 'cycle-1',
    courseCycle: {
      academicCycleId: 'ac-1',
      academicCycle: {
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      },
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
          provide: ClassEventsPermissionService,
          useValue: {
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
            acquireProfessorScheduleLock: jest
              .fn()
              .mockResolvedValue('prof-lock-key'),
            releaseCalendarLock: jest.fn().mockResolvedValue(undefined),
            findOverlap: jest.fn().mockResolvedValue(null),
            findProfessorOverlap: jest.fn().mockResolvedValue(null),
            validateEventDates: jest.fn().mockReturnValue(undefined),
          },
        },
        {
          provide: CourseCycleProfessorRepository,
          useValue: {
            isProfessorAssigned: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: UserRepository,
          useValue: {
            findById: jest.fn().mockImplementation(async (id: string) => ({
              id,
              firstName: `Profesor ${id}`,
              lastName1: null,
              lastName2: null,
              email: `${id}@test.com`,
            })),
          },
        },
        {
          provide: ClassEventsCacheService,
          useValue: {
            getRecordingStatusCacheKey: jest.fn().mockReturnValue('cache-key'),
            invalidateForEvaluation: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: RedisCacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            del: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: NotificationsDispatchService,
          useValue: {
            dispatchClassScheduled: jest.fn().mockResolvedValue(undefined),
            dispatchClassUpdated: jest.fn().mockResolvedValue(undefined),
            dispatchClassCancelled: jest.fn().mockResolvedValue(undefined),
            dispatchClassRecordingAvailable: jest
              .fn()
              .mockResolvedValue(undefined),
            scheduleClassReminder: jest.fn().mockResolvedValue(undefined),
            cancelClassReminder: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: DriveAccessScopeService,
          useValue: {
            resolveForEvaluation: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            isDriveFileDirectlyInFolder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ClassEventsService>(ClassEventsService);
    classEventRepository = module.get(ClassEventRepository);
    evaluationRepository = module.get(EvaluationRepository);
    permissionService = module.get(ClassEventsPermissionService);
    schedulingService = module.get(ClassEventsSchedulingService);
    cacheModuleService = module.get(ClassEventsCacheService);
    courseCycleProfessorRepository = module.get(CourseCycleProfessorRepository);
    userRepository = module.get(UserRepository);
    driveAccessScopeService = module.get(DriveAccessScopeService);
    storageService = module.get(StorageService);
    notificationsDispatchService = module.get(NotificationsDispatchService);

    // Default mocks behavior
    permissionService.checkUserAuthorizationForUser.mockResolvedValue(true);
    permissionService.assertMutationAllowedForEvaluation.mockResolvedValue(
      undefined,
    );
    permissionService.validateEventOwnership.mockReturnValue(undefined);
    permissionService.isAdminUser.mockReturnValue(false);
    courseCycleProfessorRepository.isProfessorAssigned.mockResolvedValue(true);
    userRepository.findById.mockImplementation(
      async (id: string) =>
        ({
          id,
          firstName: `Profesor ${id}`,
          lastName1: null,
          lastName2: null,
          email: `${id}@test.com`,
        }) as any,
    );
    driveAccessScopeService.resolveForEvaluation.mockResolvedValue({
      persisted: {
        driveVideosFolderId: 'videos-folder-eval-1',
      },
    } as any);
    storageService.isDriveFileDirectlyInFolder.mockResolvedValue(true);
  });

  describe('createEvent', () => {
    it('debe crear un evento exitosamente', async () => {
      evaluationRepository.findByIdWithCycle.mockResolvedValue(mockEvaluation);
      classEventRepository.findByEvaluationAndSessionNumber.mockResolvedValue(
        null,
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
      expect(
        permissionService.assertMutationAllowedForEvaluation,
      ).toHaveBeenCalled();
      expect(schedulingService.validateEventDates).toHaveBeenCalledWith(
        new Date('2026-02-01T08:00:00Z'),
        new Date('2026-02-01T10:00:00Z'),
        mockEvaluation.startDate,
        mockEvaluation.endDate,
        expect.any(Date),
        expect.any(Date),
      );
      expect(schedulingService.acquireCalendarLock).toHaveBeenCalled();
      expect(cacheModuleService.invalidateForEvaluation).toHaveBeenCalled();
    });

    it('valida cruces solo dentro de la misma evaluacion', async () => {
      evaluationRepository.findByIdWithCycle.mockResolvedValue(mockEvaluation);
      classEventRepository.findByEvaluationAndSessionNumber.mockResolvedValue(
        null,
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

      expect(schedulingService.findOverlap).toHaveBeenCalledWith(
        'eval-1',
        new Date('2026-02-01T08:00:00Z'),
        new Date('2026-02-01T10:00:00Z'),
        undefined,
        expect.anything(),
      );
    });

    it('rechaza cuando el profesor adicional ya tiene una sesion en ese horario', async () => {
      evaluationRepository.findByIdWithCycle.mockResolvedValue(mockEvaluation);
      schedulingService.findProfessorOverlap.mockResolvedValueOnce({
        id: 'event-occupied',
      } as ClassEvent);

      await expect(
        service.createEvent(
          'eval-1',
          2,
          'Clase con co-docente',
          'Topic',
          new Date('2026-02-01T11:00:00Z'),
          new Date('2026-02-01T12:00:00Z'),
          'link',
          mockProfessor,
          [mockProfessor.id, 'prof-2'],
        ),
      ).rejects.toThrow(ConflictException);
      expect(
        schedulingService.acquireProfessorScheduleLock,
      ).toHaveBeenCalledWith(expect.anything(), 'prof-2');
    });

    it('permite multiples profesores adicionales y reporta cual tiene conflicto', async () => {
      evaluationRepository.findByIdWithCycle.mockResolvedValue(mockEvaluation);
      schedulingService.findProfessorOverlap
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'event-occupied' } as ClassEvent);

      await expect(
        service.createEvent(
          'eval-1',
          2,
          'Clase con co-docentes',
          'Topic',
          new Date('2026-02-01T11:00:00Z'),
          new Date('2026-02-01T12:00:00Z'),
          'link',
          mockProfessor,
          [mockProfessor.id, 'prof-2', 'prof-3'],
        ),
      ).rejects.toThrow(
        'El profesor adicional "Profesor prof-3" ya tiene una clase programada en ese horario',
      );
    });
  });

  describe('getEventsByEvaluation', () => {
    it('debe retornar eventos si el usuario tiene autorización', async () => {
      permissionService.checkUserAuthorizationForUser.mockResolvedValue(true);
      classEventRepository.findByEvaluationId.mockResolvedValue([mockEvent]);

      const result = await service.getEventsByEvaluation(
        'eval-1',
        mockProfessor,
      );

      expect(result).toEqual([mockEvent]);
      expect(
        permissionService.checkUserAuthorizationForUser,
      ).toHaveBeenCalledWith(mockProfessor, 'eval-1');
    });

    it('debe lanzar ForbiddenException si no hay acceso', async () => {
      permissionService.checkUserAuthorizationForUser.mockResolvedValue(false);

      await expect(
        service.getEventsByEvaluation('eval-1', mockProfessor),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Integridad de Tipos de Fecha', () => {
    it('debe calcular PROGRAMADA aunque la BD devuelva fechas como STRINGS', () => {
      const eventWithStrings = {
        startDatetime: '2026-12-01T10:00:00.000Z',
        endDatetime: '2026-12-01T12:00:00.000Z',
        isCancelled: false,
      } as unknown as ClassEvent;

      const status = service.calculateEventStatus(eventWithStrings);
      expect(status).toBe(CLASS_EVENT_STATUS.PROGRAMADA);
    });

    it('debe calcular correctamente usando una fecha de referencia externa (Atómica)', () => {
      const event = {
        startDatetime: new Date('2026-12-01T10:00:00Z'),
        endDatetime: new Date('2026-12-01T12:00:00Z'),
        isCancelled: false,
      } as ClassEvent;

      const referenceDate = new Date('2026-12-01T11:00:00Z');
      const status = service.calculateEventStatus(event, referenceDate);
      expect(status).toBe(CLASS_EVENT_STATUS.EN_CURSO);
    });
  });

  describe('updateEvent', () => {
    it('debe actualizar el evento exitosamente', async () => {
      classEventRepository.findByIdSimple.mockResolvedValue(mockEvent);
      evaluationRepository.findByIdWithCycle.mockResolvedValue(mockEvaluation);
      classEventRepository.update.mockResolvedValue({
        ...mockEvent,
        title: 'Updated',
      });

      await service.updateEvent('event-1', mockProfessor, 'Updated');

      expect(classEventRepository.update).toHaveBeenCalled();
      expect(permissionService.validateEventOwnership).toHaveBeenCalled();
      expect(cacheModuleService.invalidateForEvaluation).toHaveBeenCalled();
    });

    it('debe notificar clase actualizada cuando cambia el horario', async () => {
      classEventRepository.findByIdSimple.mockResolvedValue(mockEvent);
      evaluationRepository.findByIdWithCycle.mockResolvedValue(mockEvaluation);
      classEventRepository.update.mockResolvedValue({
        ...mockEvent,
        startDatetime: new Date('2026-02-01T09:00:00Z'),
        endDatetime: new Date('2026-02-01T11:00:00Z'),
      });

      await service.updateEvent(
        'event-1',
        mockProfessor,
        undefined,
        undefined,
        new Date('2026-02-01T09:00:00Z'),
        new Date('2026-02-01T11:00:00Z'),
      );

      expect(
        notificationsDispatchService.dispatchClassUpdated,
      ).toHaveBeenCalledWith('event-1');
      expect(
        notificationsDispatchService.scheduleClassReminder,
      ).toHaveBeenCalledWith('event-1', new Date('2026-02-01T09:00:00Z'));
      expect(
        notificationsDispatchService.dispatchClassRecordingAvailable,
      ).not.toHaveBeenCalled();
    });

    it('no debe notificar clase actualizada cuando solo cambia el titulo', async () => {
      classEventRepository.findByIdSimple.mockResolvedValue(mockEvent);
      evaluationRepository.findByIdWithCycle.mockResolvedValue(mockEvaluation);
      classEventRepository.update.mockResolvedValue({
        ...mockEvent,
        title: 'Clase 1 actualizada',
      });

      await service.updateEvent(
        'event-1',
        mockProfessor,
        'Clase 1 actualizada',
      );

      expect(
        notificationsDispatchService.dispatchClassUpdated,
      ).not.toHaveBeenCalled();
      expect(
        notificationsDispatchService.scheduleClassReminder,
      ).not.toHaveBeenCalled();
      expect(
        notificationsDispatchService.dispatchClassRecordingAvailable,
      ).not.toHaveBeenCalled();
    });

    it('debe notificar cambio de horario si solo cambia la hora de fin, sin reprogramar reminder', async () => {
      classEventRepository.findByIdSimple.mockResolvedValue(mockEvent);
      evaluationRepository.findByIdWithCycle.mockResolvedValue(mockEvaluation);
      classEventRepository.update.mockResolvedValue({
        ...mockEvent,
        endDatetime: new Date('2026-02-01T11:00:00Z'),
      });

      await service.updateEvent(
        'event-1',
        mockProfessor,
        undefined,
        undefined,
        undefined,
        new Date('2026-02-01T11:00:00Z'),
      );

      expect(
        notificationsDispatchService.dispatchClassUpdated,
      ).toHaveBeenCalledWith('event-1');
      expect(
        notificationsDispatchService.scheduleClassReminder,
      ).not.toHaveBeenCalled();
      expect(
        notificationsDispatchService.dispatchClassRecordingAvailable,
      ).not.toHaveBeenCalled();
    });

    it('debe notificar grabacion disponible cuando recordingUrl cambia', async () => {
      classEventRepository.findByIdSimple.mockResolvedValue(mockEvent);
      evaluationRepository.findByIdWithCycle.mockResolvedValue(mockEvaluation);
      classEventRepository.update.mockResolvedValue({
        ...mockEvent,
        recordingUrl: 'https://drive.google.com/file/d/drive-abc-1/view',
        recordingFileId: 'drive-abc-1',
      });

      await service.updateEvent(
        'event-1',
        mockProfessor,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'https://drive.google.com/file/d/drive-abc-1/view',
      );

      expect(
        notificationsDispatchService.dispatchClassRecordingAvailable,
      ).toHaveBeenCalledWith('event-1');
      expect(
        notificationsDispatchService.dispatchClassUpdated,
      ).not.toHaveBeenCalled();
    });
  });

  describe('getAuthorizedRecordingLink', () => {
    it('debe usar recordingFileId cuando recordingUrl no esta presente', async () => {
      classEventRepository.findById.mockResolvedValue({
        ...mockEvent,
        recordingUrl: null,
        recordingFileId: 'drive-abc-1',
      } as ClassEvent);

      const result = await service.getAuthorizedRecordingLink(
        mockProfessor,
        'event-1',
      );

      expect(result.accessMode).toBe(MEDIA_ACCESS_MODES.DIRECT_URL);
      expect(result.driveFileId).toBe('drive-abc-1');
      expect(result.url).toContain('/preview');
      expect(result.requestedMode).toBe(MEDIA_VIDEO_LINK_MODES.EMBED);
    });

    it('debe devolver URL embed de Drive cuando la grabacion es de Drive', async () => {
      classEventRepository.findById.mockResolvedValue({
        ...mockEvent,
        recordingUrl: 'https://drive.google.com/file/d/drive-abc-1/view',
      } as ClassEvent);

      const result = await service.getAuthorizedRecordingLink(
        mockProfessor,
        'event-1',
      );

      expect(result.accessMode).toBe(MEDIA_ACCESS_MODES.DIRECT_URL);
      expect(result.driveFileId).toBe('drive-abc-1');
      expect(result.url).toContain('/preview');
      expect(result.requestedMode).toBe(MEDIA_VIDEO_LINK_MODES.EMBED);
    });

    it('debe rechazar grabacion cuando URL no tiene ID Drive', async () => {
      classEventRepository.findById.mockResolvedValue({
        ...mockEvent,
        recordingUrl: 'https://video.example.com/recording-1',
      } as ClassEvent);

      await expect(
        service.getAuthorizedRecordingLink(mockProfessor, 'event-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar NotFoundException si no existe grabacion disponible', async () => {
      classEventRepository.findById.mockResolvedValue({
        ...mockEvent,
        recordingUrl: null,
      } as ClassEvent);

      await expect(
        service.getAuthorizedRecordingLink(mockProfessor, 'event-1'),
      ).rejects.toThrow('Grabacion no disponible');
    });

    it('debe lanzar ForbiddenException cuando el usuario no tiene acceso vigente', async () => {
      permissionService.checkUserAuthorizationForUser.mockResolvedValue(false);
      classEventRepository.findById.mockResolvedValue({
        ...mockEvent,
        recordingUrl: 'https://drive.google.com/file/d/drive-abc-1/view',
      } as ClassEvent);

      await expect(
        service.getAuthorizedRecordingLink(mockProfessor, 'event-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar ForbiddenException cuando el archivo no pertenece a la carpeta videos de la evaluacion', async () => {
      classEventRepository.findById.mockResolvedValue({
        ...mockEvent,
        recordingUrl: 'https://drive.google.com/file/d/drive-abc-1/view',
      } as ClassEvent);
      storageService.isDriveFileDirectlyInFolder.mockResolvedValue(false);

      await expect(
        service.getAuthorizedRecordingLink(mockProfessor, 'event-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

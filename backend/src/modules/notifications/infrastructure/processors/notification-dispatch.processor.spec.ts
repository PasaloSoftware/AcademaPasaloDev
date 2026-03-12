import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { Job, UnrecoverableError } from 'bullmq';
import { NotificationDispatchProcessor } from './notification-dispatch.processor';
import { NotificationRepository } from '@modules/notifications/infrastructure/notification.repository';
import { NotificationTypeRepository } from '@modules/notifications/infrastructure/notification-type.repository';
import { UserNotificationRepository } from '@modules/notifications/infrastructure/user-notification.repository';
import { NotificationRecipientsService } from '@modules/notifications/application/notification-recipients.service';
import { SettingsService } from '@modules/settings/application/settings.service';
import { NotificationType } from '@modules/notifications/domain/notification-type.entity';
import { Notification } from '@modules/notifications/domain/notification.entity';
import {
  NOTIFICATION_JOB_NAMES,
  NOTIFICATION_TYPE_CODES,
  NOTIFICATION_MESSAGES,
  NOTIFICATION_ENTITY_TYPES,
} from '@modules/notifications/domain/notification.constants';
import { technicalSettings } from '@config/technical-settings';
import {
  NotificationIntegrityError,
  NotificationTargetNotFoundError,
} from '@modules/notifications/domain/notification.errors';

const mockNotificationRepo = {
  create: jest.fn(),
  deleteOlderThan: jest.fn(),
};

const mockNotificationTypeRepo = {
  findByCode: jest.fn(),
};

const mockUserNotifRepo = {
  bulkCreate: jest.fn(),
  invalidateUnreadCountForUsers: jest.fn(),
  invalidateAllUnreadCounts: jest.fn(),
};

const mockRecipientsService = {
  resolveClassEventContext: jest.fn(),
  resolveMaterialContext: jest.fn(),
};

const mockSettingsService = {
  getString: jest.fn(),
};

const savedNotif = { id: '99' } as Notification;

const mockManager = {
  create: jest.fn(),
  save: jest.fn(),
  insert: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn(),
  getRepository: jest.fn(),
};

const mockClassEventEntityRepo = {
  findOne: jest.fn(),
};

function makeJob<T>(name: string, data: T, id = 'job-1'): Job<T> {
  return { id, name, data } as unknown as Job<T>;
}

describe('NotificationDispatchProcessor', () => {
  let processor: NotificationDispatchProcessor;

  const notifType = {
    id: '10',
    code: 'CLASS_SCHEDULED',
    name: 'Nueva clase',
  } as NotificationType;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockManager.create.mockReturnValue({});
    mockManager.save.mockResolvedValue(savedNotif);
    mockManager.insert.mockResolvedValue(undefined);
    mockClassEventEntityRepo.findOne.mockResolvedValue({
      id: 'evt-2',
      isCancelled: false,
    });
    mockDataSource.transaction.mockImplementation(
      async (cb: (manager: typeof mockManager) => Promise<unknown>) =>
        cb(mockManager),
    );
    mockDataSource.getRepository.mockReturnValue(mockClassEventEntityRepo);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDispatchProcessor,
        { provide: DataSource, useValue: mockDataSource },
        { provide: NotificationRepository, useValue: mockNotificationRepo },
        {
          provide: NotificationTypeRepository,
          useValue: mockNotificationTypeRepo,
        },
        { provide: UserNotificationRepository, useValue: mockUserNotifRepo },
        {
          provide: NotificationRecipientsService,
          useValue: mockRecipientsService,
        },
        { provide: SettingsService, useValue: mockSettingsService },
      ],
    }).compile();

    processor = module.get(NotificationDispatchProcessor);

    mockNotificationTypeRepo.findByCode.mockResolvedValue(notifType);
  });

  describe('process - enrutamiento por job.name', () => {
    it('ignora jobs con nombre desconocido sin lanzar error', async () => {
      const job = makeJob('unknown-job', {});
      await expect(processor.process(job)).resolves.toBeUndefined();
    });
  });

  describe('handleDispatch - tipo desconocido', () => {
    it('lanza UnrecoverableError para tipo de dispatch no reconocido', async () => {
      const job = makeJob(NOTIFICATION_JOB_NAMES.DISPATCH, {
        type: 'UNKNOWN_TYPE' as typeof NOTIFICATION_TYPE_CODES.CLASS_SCHEDULED,
        classEventId: 'evt-x',
      });

      await expect(processor.process(job)).rejects.toBeInstanceOf(
        UnrecoverableError,
      );
    });
  });

  describe('handleDispatch - NEW_MATERIAL / MATERIAL_UPDATED', () => {
    it.each([
      NOTIFICATION_TYPE_CODES.NEW_MATERIAL,
      NOTIFICATION_TYPE_CODES.MATERIAL_UPDATED,
    ] as const)(
      'crea la notificacion y la distribuye en transaccion para %s',
      async (type) => {
        const payload = {
          type,
          materialId: 'mat-1',
          folderId: 'folder-1',
        } as const;

        mockRecipientsService.resolveMaterialContext.mockResolvedValue({
          materialId: 'mat-1',
          folderId: 'folder-1',
          classEventId: 'evt-9',
          evaluationId: 'eval-1',
          sessionNumber: 2,
          materialDisplayName: 'Guia de estudios',
          courseCycleId: 'cycle-1',
          evaluationLabel: 'PC1',
          courseName: 'Matematicas',
          recipientUserIds: ['u1', 'u2'],
        });

        const job = makeJob(NOTIFICATION_JOB_NAMES.DISPATCH, payload);
        await processor.process(job);

        expect(
          mockRecipientsService.resolveMaterialContext,
        ).toHaveBeenCalledWith('mat-1', 'folder-1');
        expect(mockNotificationTypeRepo.findByCode).toHaveBeenCalledWith(type);
        expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
        expect(mockManager.create).toHaveBeenCalledWith(
          Notification,
          expect.objectContaining({
            notificationTypeId: notifType.id,
            title: NOTIFICATION_MESSAGES[type].title,
            message:
              type === NOTIFICATION_TYPE_CODES.NEW_MATERIAL
                ? "Se publico 'Guia de estudios' de la clase 2 de la PC1 del curso Matematicas."
                : "Se actualizo 'Guia de estudios' de la clase 2 de la PC1 del curso Matematicas.",
            entityType: NOTIFICATION_ENTITY_TYPES.MATERIAL,
            entityId: 'mat-1',
          }),
        );
        expect(mockManager.insert).toHaveBeenCalledWith(
          expect.anything(),
          expect.arrayContaining([
            expect.objectContaining({
              userId: 'u1',
              notificationId: savedNotif.id,
            }),
            expect.objectContaining({
              userId: 'u2',
              notificationId: savedNotif.id,
            }),
          ]),
        );
        expect(
          mockUserNotifRepo.invalidateUnreadCountForUsers,
        ).toHaveBeenCalledWith(['u1', 'u2']);
      },
    );

    it('no crea notificacion cuando recipientUserIds esta vacio', async () => {
      const payload = {
        type: NOTIFICATION_TYPE_CODES.NEW_MATERIAL,
        materialId: 'mat-1',
        folderId: 'folder-1',
      } as const;

      mockRecipientsService.resolveMaterialContext.mockResolvedValue({
        materialId: 'mat-1',
        folderId: 'folder-1',
        classEventId: 'evt-9',
        evaluationId: 'eval-1',
        sessionNumber: 2,
        materialDisplayName: 'Guia',
        courseCycleId: 'cycle-1',
        evaluationLabel: 'PC1',
        courseName: 'Matematicas',
        recipientUserIds: [],
      });

      const job = makeJob(NOTIFICATION_JOB_NAMES.DISPATCH, payload);
      await processor.process(job);

      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('convierte target faltante en UnrecoverableError', async () => {
      const payload = {
        type: NOTIFICATION_TYPE_CODES.NEW_MATERIAL,
        materialId: 'mat-1',
        folderId: 'folder-1',
      } as const;
      mockRecipientsService.resolveMaterialContext.mockRejectedValue(
        new NotificationTargetNotFoundError('material inexistente'),
      );

      const job = makeJob(NOTIFICATION_JOB_NAMES.DISPATCH, payload);

      await expect(processor.process(job)).rejects.toBeInstanceOf(
        UnrecoverableError,
      );
    });
  });

  describe('handleDispatch - CLASS_SCHEDULED / CLASS_UPDATED / CLASS_CANCELLED / CLASS_RECORDING_AVAILABLE', () => {
    const classContext = {
      classEventId: 'evt-1',
      evaluationId: 'eval-1',
      sessionNumber: 1,
      classTitle: 'Clase de Algebra',
      startDatetime: new Date('2026-03-01T14:00:00Z'),
      courseCycleId: 'cycle-1',
      evaluationLabel: 'PC1',
      courseName: 'Matematicas',
      recipientUserIds: ['u1', 'u2', 'u3'],
    };

    it.each([
      NOTIFICATION_TYPE_CODES.CLASS_SCHEDULED,
      NOTIFICATION_TYPE_CODES.CLASS_UPDATED,
      NOTIFICATION_TYPE_CODES.CLASS_CANCELLED,
      NOTIFICATION_TYPE_CODES.CLASS_RECORDING_AVAILABLE,
    ] as const)('crea y distribuye en transaccion para %s', async (type) => {
      mockRecipientsService.resolveClassEventContext.mockResolvedValue(
        classContext,
      );
      mockNotificationTypeRepo.findByCode.mockResolvedValue({
        ...notifType,
        code: type,
      });

      const job = makeJob(NOTIFICATION_JOB_NAMES.DISPATCH, {
        type,
        classEventId: 'evt-1',
      });
      await processor.process(job);

      expect(
        mockRecipientsService.resolveClassEventContext,
      ).toHaveBeenCalledWith('evt-1');
      expect(mockNotificationTypeRepo.findByCode).toHaveBeenCalledWith(type);
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(mockManager.create).toHaveBeenCalledWith(
        Notification,
        expect.objectContaining({
          message: expect.any(String),
          entityType: NOTIFICATION_ENTITY_TYPES.CLASS_EVENT,
          entityId: 'evt-1',
        }),
      );
      expect(mockManager.insert).toHaveBeenCalledWith(
        expect.anything(),
        classContext.recipientUserIds.map((userId) =>
          expect.objectContaining({ userId, notificationId: savedNotif.id }),
        ),
      );
      expect(
        mockUserNotifRepo.invalidateUnreadCountForUsers,
      ).toHaveBeenCalledWith(classContext.recipientUserIds);
    });

    it('no crea notificacion si recipientUserIds esta vacio', async () => {
      mockRecipientsService.resolveClassEventContext.mockResolvedValue({
        ...classContext,
        recipientUserIds: [],
      });

      const job = makeJob(NOTIFICATION_JOB_NAMES.DISPATCH, {
        type: NOTIFICATION_TYPE_CODES.CLASS_SCHEDULED,
        classEventId: 'evt-1',
      });
      await processor.process(job);

      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('convierte errores de integridad en UnrecoverableError', async () => {
      mockRecipientsService.resolveClassEventContext.mockRejectedValue(
        new NotificationIntegrityError('ACTIVE faltante'),
      );

      const job = makeJob(NOTIFICATION_JOB_NAMES.DISPATCH, {
        type: NOTIFICATION_TYPE_CODES.CLASS_SCHEDULED,
        classEventId: 'evt-1',
      });

      await expect(processor.process(job)).rejects.toBeInstanceOf(
        UnrecoverableError,
      );
    });
  });

  describe('handleClassReminder', () => {
    const classContext = {
      classEventId: 'evt-2',
      evaluationId: 'eval-2',
      sessionNumber: 5,
      classTitle: 'Clase de Fisica',
      startDatetime: new Date('2026-03-10T09:00:00Z'),
      courseCycleId: 'cycle-2',
      evaluationLabel: 'PC2',
      courseName: 'Fisica',
      recipientUserIds: ['u4', 'u5'],
    };

    it('usa reminderMinutes del payload y crea la notificacion en transaccion', async () => {
      mockRecipientsService.resolveClassEventContext.mockResolvedValue(
        classContext,
      );
      mockNotificationTypeRepo.findByCode.mockResolvedValue({
        ...notifType,
        code: NOTIFICATION_TYPE_CODES.CLASS_REMINDER,
      });

      const job = makeJob(NOTIFICATION_JOB_NAMES.CLASS_REMINDER, {
        classEventId: 'evt-2',
        reminderMinutes: 60,
      });
      await processor.process(job);

      const expectedMsg =
        'Tienes la clase 5 de la PC2 del curso Fisica en 60 minutos.';
      expect(mockManager.create).toHaveBeenCalledWith(
        Notification,
        expect.objectContaining({ message: expectedMsg }),
      );
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(mockClassEventEntityRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'evt-2' },
        select: { id: true, isCancelled: true },
      });
    });

    it('no crea notificacion si no hay destinatarios', async () => {
      mockRecipientsService.resolveClassEventContext.mockResolvedValue({
        ...classContext,
        recipientUserIds: [],
      });

      const job = makeJob(NOTIFICATION_JOB_NAMES.CLASS_REMINDER, {
        classEventId: 'evt-2',
        reminderMinutes: 60,
      });
      await processor.process(job);

      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('incluye a todos los destinatarios en la insercion masiva', async () => {
      mockRecipientsService.resolveClassEventContext.mockResolvedValue(
        classContext,
      );
      mockNotificationTypeRepo.findByCode.mockResolvedValue({
        ...notifType,
        code: NOTIFICATION_TYPE_CODES.CLASS_REMINDER,
      });

      const job = makeJob(NOTIFICATION_JOB_NAMES.CLASS_REMINDER, {
        classEventId: 'evt-2',
        reminderMinutes: 1440,
      });
      await processor.process(job);

      expect(mockManager.insert).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([
          expect.objectContaining({ userId: 'u4' }),
          expect.objectContaining({ userId: 'u5' }),
        ]),
      );
      expect(
        mockUserNotifRepo.invalidateUnreadCountForUsers,
      ).toHaveBeenCalledWith(classContext.recipientUserIds);
    });

    it('omite el reminder cuando la clase ya fue cancelada', async () => {
      mockClassEventEntityRepo.findOne.mockResolvedValue({
        id: 'evt-2',
        isCancelled: true,
      });

      const job = makeJob(NOTIFICATION_JOB_NAMES.CLASS_REMINDER, {
        classEventId: 'evt-2',
        reminderMinutes: 60,
      });
      await processor.process(job);

      expect(
        mockRecipientsService.resolveClassEventContext,
      ).not.toHaveBeenCalled();
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('handleCleanup', () => {
    it('ejecuta la limpieza con retencion leida de settings', async () => {
      mockSettingsService.getString.mockResolvedValue('90');
      mockNotificationRepo.deleteOlderThan.mockResolvedValue(42);

      const job = makeJob(NOTIFICATION_JOB_NAMES.CLEANUP, {});
      await processor.process(job);

      expect(mockNotificationRepo.deleteOlderThan).toHaveBeenCalledWith(
        expect.any(Date),
        technicalSettings.notifications.cleanupBatchSize,
      );
      expect(mockUserNotifRepo.invalidateAllUnreadCounts).toHaveBeenCalled();
    });

    it('usa el valor por defecto si settings.getString lanza error', async () => {
      mockSettingsService.getString.mockRejectedValue(new Error('not found'));
      mockNotificationRepo.deleteOlderThan.mockResolvedValue(0);

      const job = makeJob(NOTIFICATION_JOB_NAMES.CLEANUP, {});
      await processor.process(job);

      expect(mockNotificationRepo.deleteOlderThan).toHaveBeenCalledWith(
        expect.any(Date),
        technicalSettings.notifications.cleanupBatchSize,
      );
      expect(
        mockUserNotifRepo.invalidateAllUnreadCounts,
      ).not.toHaveBeenCalled();
    });

    it('lanza UnrecoverableError si retentionDays esta por debajo del minimo seguro', async () => {
      const tooLow = technicalSettings.notifications.retentionMinSafeDays - 1;
      mockSettingsService.getString.mockResolvedValue(String(tooLow));

      const job = makeJob(NOTIFICATION_JOB_NAMES.CLEANUP, {});
      await expect(processor.process(job)).rejects.toBeInstanceOf(
        UnrecoverableError,
      );

      expect(mockNotificationRepo.deleteOlderThan).not.toHaveBeenCalled();
    });
  });

  describe('resolveNotificationTypeOrFail', () => {
    it('lanza UnrecoverableError si el tipo no existe en BD', async () => {
      mockNotificationTypeRepo.findByCode.mockResolvedValue(null);
      mockRecipientsService.resolveClassEventContext.mockResolvedValue({
        classEventId: 'evt-1',
        classTitle: 'Clase',
        startDatetime: new Date(),
        courseCycleId: 'cycle-1',
        courseName: 'Curso',
        recipientUserIds: ['u1'],
      });

      const job = makeJob(NOTIFICATION_JOB_NAMES.DISPATCH, {
        type: NOTIFICATION_TYPE_CODES.CLASS_SCHEDULED,
        classEventId: 'evt-1',
      });

      await expect(processor.process(job)).rejects.toBeInstanceOf(
        UnrecoverableError,
      );
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationsDispatchService } from './notifications-dispatch.service';
import { SettingsService } from '@modules/settings/application/settings.service';
import { QUEUES } from '@infrastructure/queue/queue.constants';
import {
  NOTIFICATION_JOB_NAMES,
  NOTIFICATION_TYPE_CODES,
} from '@modules/notifications/domain/notification.constants';
import { technicalSettings } from '@config/technical-settings';

const mockSettingsService = {
  getString: jest.fn(),
};

const mockJob = {
  remove: jest.fn(),
};

const mockQueue: Partial<Queue> = {
  add: jest.fn(),
  getJob: jest.fn(),
};

describe('NotificationsDispatchService', () => {
  let service: NotificationsDispatchService;

  beforeEach(async () => {
    jest.clearAllMocks();
    (mockQueue.add as jest.Mock).mockResolvedValue({});
    (mockQueue.getJob as jest.Mock).mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsDispatchService,
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: getQueueToken(QUEUES.NOTIFICATIONS), useValue: mockQueue },
      ],
    }).compile();

    service = module.get(NotificationsDispatchService);
  });

  describe('dispatchNewMaterial', () => {
    it('encola el job con el tipo, datos y jobId correctos', async () => {
      await service.dispatchNewMaterial('mat-1', 'folder-1');

      expect(mockQueue.add).toHaveBeenCalledWith(
        NOTIFICATION_JOB_NAMES.DISPATCH,
        {
          type: NOTIFICATION_TYPE_CODES.NEW_MATERIAL,
          materialId: 'mat-1',
          folderId: 'folder-1',
        },
        {
          jobId: 'new-material-mat-1',
          removeOnComplete: true,
        },
      );
    });

    it('no propaga el error si la queue falla', async () => {
      (mockQueue.add as jest.Mock).mockRejectedValue(new Error('Redis down'));

      await expect(
        service.dispatchNewMaterial('m1', 'f1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('dispatchMaterialUpdated', () => {
    it('encola el job MATERIAL_UPDATED sin jobId fijo', async () => {
      await service.dispatchMaterialUpdated('mat-9', 'folder-9');

      expect(mockQueue.add).toHaveBeenCalledWith(
        NOTIFICATION_JOB_NAMES.DISPATCH,
        {
          type: NOTIFICATION_TYPE_CODES.MATERIAL_UPDATED,
          materialId: 'mat-9',
          folderId: 'folder-9',
        },
        {
          jobId: undefined,
          removeOnComplete: true,
        },
      );
    });
  });

  describe('dispatchClassScheduled', () => {
    it('encola el job CLASS_SCHEDULED con jobId estable', async () => {
      await service.dispatchClassScheduled('event-1');

      expect(mockQueue.add).toHaveBeenCalledWith(
        NOTIFICATION_JOB_NAMES.DISPATCH,
        {
          type: NOTIFICATION_TYPE_CODES.CLASS_SCHEDULED,
          classEventId: 'event-1',
        },
        {
          jobId: 'class-scheduled-event-1',
          removeOnComplete: true,
        },
      );
    });
  });

  describe('dispatchClassUpdated', () => {
    it('encola el job CLASS_UPDATED sin jobId fijo', async () => {
      await service.dispatchClassUpdated('event-2');

      expect(mockQueue.add).toHaveBeenCalledWith(
        NOTIFICATION_JOB_NAMES.DISPATCH,
        {
          type: NOTIFICATION_TYPE_CODES.CLASS_UPDATED,
          classEventId: 'event-2',
        },
        {
          jobId: undefined,
          removeOnComplete: true,
        },
      );
    });
  });

  describe('dispatchClassCancelled', () => {
    it('encola el job CLASS_CANCELLED con jobId estable', async () => {
      await service.dispatchClassCancelled('event-3');

      expect(mockQueue.add).toHaveBeenCalledWith(
        NOTIFICATION_JOB_NAMES.DISPATCH,
        {
          type: NOTIFICATION_TYPE_CODES.CLASS_CANCELLED,
          classEventId: 'event-3',
        },
        {
          jobId: 'class-cancelled-event-3',
          removeOnComplete: true,
        },
      );
    });
  });

  describe('dispatchClassRecordingAvailable', () => {
    it('encola el job CLASS_RECORDING_AVAILABLE sin jobId fijo', async () => {
      await service.dispatchClassRecordingAvailable('event-30');

      expect(mockQueue.add).toHaveBeenCalledWith(
        NOTIFICATION_JOB_NAMES.DISPATCH,
        {
          type: NOTIFICATION_TYPE_CODES.CLASS_RECORDING_AVAILABLE,
          classEventId: 'event-30',
        },
        {
          jobId: undefined,
          removeOnComplete: true,
        },
      );
    });
  });

  describe('dispatchDeletionRequestApproved', () => {
    it('encola el job con jobId estable', async () => {
      await service.dispatchDeletionRequestApproved('req-1');

      expect(mockQueue.add).toHaveBeenCalledWith(
        NOTIFICATION_JOB_NAMES.DISPATCH,
        {
          type: NOTIFICATION_TYPE_CODES.DELETION_REQUEST_APPROVED,
          requestId: 'req-1',
        },
        {
          jobId: 'deletion-approved-req-1',
          removeOnComplete: true,
        },
      );
    });
  });

  describe('dispatchDeletionRequestRejected', () => {
    it('encola el job con jobId estable', async () => {
      await service.dispatchDeletionRequestRejected('req-2', 'motivo');

      expect(mockQueue.add).toHaveBeenCalledWith(
        NOTIFICATION_JOB_NAMES.DISPATCH,
        {
          type: NOTIFICATION_TYPE_CODES.DELETION_REQUEST_REJECTED,
          requestId: 'req-2',
          adminComment: 'motivo',
        },
        {
          jobId: 'deletion-rejected-req-2',
          removeOnComplete: true,
        },
      );
    });
  });

  describe('dispatchAuditExportReady', () => {
    it('encola el job AUDIT_EXPORT_READY con jobId estable', async () => {
      await service.dispatchAuditExportReady(
        'user-1',
        'export-job-1',
        'reporte-auditoria-masivo_2026-03-14_18-00-00.zip',
        '2026-03-14T23:00:00.000Z',
        3,
      );

      expect(mockQueue.add).toHaveBeenCalledWith(
        NOTIFICATION_JOB_NAMES.DISPATCH,
        {
          type: NOTIFICATION_TYPE_CODES.AUDIT_EXPORT_READY,
          requestedByUserId: 'user-1',
          exportJobId: 'export-job-1',
          artifactName: 'reporte-auditoria-masivo_2026-03-14_18-00-00.zip',
          artifactExpiresAt: '2026-03-14T23:00:00.000Z',
          estimatedFileCount: 3,
        },
        {
          jobId: 'audit-export-ready-export-job-1',
          removeOnComplete: true,
        },
      );
    });
  });

  describe('scheduleClassReminder', () => {
    it('omite el reminder si el delay calculado es menor al umbral minimo', async () => {
      mockSettingsService.getString.mockResolvedValue('30');
      const startDatetime = new Date(Date.now() + 60 * 1000);

      await service.scheduleClassReminder('event-1', startDatetime);

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('encola el reminder con reminderMinutes, jobId y delay calculado', async () => {
      mockSettingsService.getString.mockResolvedValue('30');
      const thirtyOneMinutesFromNow = Date.now() + 31 * 60 * 1000;
      const startDatetime = new Date(thirtyOneMinutesFromNow + 30 * 60 * 1000);

      await service.scheduleClassReminder('event-5', startDatetime);

      expect(mockQueue.add).toHaveBeenCalledWith(
        NOTIFICATION_JOB_NAMES.CLASS_REMINDER,
        { classEventId: 'event-5', reminderMinutes: 30 },
        expect.objectContaining({
          jobId: 'class-reminder-event-5',
          delay: expect.any(Number),
          removeOnComplete: true,
        }),
      );
    });

    it('omite el reminder si reminderMinutes esta fuera del rango permitido', async () => {
      mockSettingsService.getString.mockResolvedValue('5');
      const startDatetime = new Date(Date.now() + 60 * 60 * 1000);

      await service.scheduleClassReminder('event-4', startDatetime);

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('usa el valor por defecto si SettingsService lanza error', async () => {
      mockSettingsService.getString.mockRejectedValue(new Error('not found'));
      const defaultMinutes =
        technicalSettings.notifications.reminderDefaultMinutes;
      const startDatetime = new Date(
        Date.now() + (defaultMinutes + 5) * 60 * 1000,
      );

      await service.scheduleClassReminder('event-6', startDatetime);

      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('usa el valor por defecto si getString devuelve texto no numerico', async () => {
      mockSettingsService.getString.mockResolvedValue('invalid');
      const defaultMinutes =
        technicalSettings.notifications.reminderDefaultMinutes;
      const startDatetime = new Date(
        Date.now() + (defaultMinutes + 5) * 60 * 1000,
      );

      await service.scheduleClassReminder('event-7', startDatetime);

      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('elimina el job existente antes de encolar uno nuevo', async () => {
      mockSettingsService.getString.mockResolvedValue('30');
      (mockQueue.getJob as jest.Mock).mockResolvedValue(mockJob);
      mockJob.remove.mockResolvedValue(undefined);
      const startDatetime = new Date(Date.now() + 35 * 60 * 1000);

      await service.scheduleClassReminder('event-8', startDatetime);

      expect(mockJob.remove).toHaveBeenCalledTimes(1);
      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('elimina el reminder existente si el nuevo horario ya no alcanza el umbral minimo', async () => {
      mockSettingsService.getString.mockResolvedValue('30');
      (mockQueue.getJob as jest.Mock).mockResolvedValue(mockJob);
      mockJob.remove.mockResolvedValue(undefined);
      const startDatetime = new Date(Date.now() + 60 * 1000);

      await service.scheduleClassReminder('event-12', startDatetime);

      expect(mockQueue.getJob).toHaveBeenCalledWith('class-reminder-event-12');
      expect(mockJob.remove).toHaveBeenCalledTimes(1);
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('elimina el reminder existente si la configuracion de reminder queda fuera de rango', async () => {
      mockSettingsService.getString.mockResolvedValue('5');
      (mockQueue.getJob as jest.Mock).mockResolvedValue(mockJob);
      mockJob.remove.mockResolvedValue(undefined);
      const startDatetime = new Date(Date.now() + 60 * 60 * 1000);

      await service.scheduleClassReminder('event-13', startDatetime);

      expect(mockQueue.getJob).toHaveBeenCalledWith('class-reminder-event-13');
      expect(mockJob.remove).toHaveBeenCalledTimes(1);
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('cancelClassReminder', () => {
    it('elimina el job si existe', async () => {
      (mockQueue.getJob as jest.Mock).mockResolvedValue(mockJob);
      mockJob.remove.mockResolvedValue(undefined);

      await service.cancelClassReminder('event-10');

      expect(mockQueue.getJob).toHaveBeenCalledWith('class-reminder-event-10');
      expect(mockJob.remove).toHaveBeenCalledTimes(1);
    });

    it('no falla si el job no existe', async () => {
      (mockQueue.getJob as jest.Mock).mockResolvedValue(null);

      await expect(
        service.cancelClassReminder('event-11'),
      ).resolves.toBeUndefined();
    });

    it('no propaga el error si getJob lanza', async () => {
      (mockQueue.getJob as jest.Mock).mockRejectedValue(new Error('fail'));

      await expect(service.cancelClassReminder('e1')).resolves.toBeUndefined();
    });
  });
});

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES } from '@infrastructure/queue/queue.constants';
import { technicalSettings } from '@config/technical-settings';
import { SettingsService } from '@modules/settings/application/settings.service';
import {
  NOTIFICATION_JOB_NAMES,
  NOTIFICATION_SYSTEM_SETTING_KEYS,
  NOTIFICATION_TYPE_CODES,
} from '@modules/notifications/domain/notification.constants';
import { DispatchPayload } from '@modules/notifications/interfaces';

@Injectable()
export class NotificationsDispatchService {
  private readonly logger = new Logger(NotificationsDispatchService.name);

  constructor(
    @InjectQueue(QUEUES.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
    private readonly settingsService: SettingsService,
  ) {}

  async dispatchNewMaterial(
    materialId: string,
    folderId: string,
  ): Promise<void> {
    try {
      await this.enqueueDispatchJob(
        {
          type: NOTIFICATION_TYPE_CODES.NEW_MATERIAL,
          materialId,
          folderId,
        },
        `new-material-${materialId}`,
      );
    } catch (error) {
      this.logger.warn({
        context: NotificationsDispatchService.name,
        message: 'No se pudo encolar la notificacion NEW_MATERIAL',
        materialId,
        folderId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async dispatchMaterialUpdated(
    materialId: string,
    folderId: string,
  ): Promise<void> {
    try {
      await this.enqueueDispatchJob({
        type: NOTIFICATION_TYPE_CODES.MATERIAL_UPDATED,
        materialId,
        folderId,
      });
    } catch (error) {
      this.logger.warn({
        context: NotificationsDispatchService.name,
        message: 'No se pudo encolar la notificacion MATERIAL_UPDATED',
        materialId,
        folderId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async dispatchClassScheduled(classEventId: string): Promise<void> {
    try {
      await this.enqueueDispatchJob(
        {
          type: NOTIFICATION_TYPE_CODES.CLASS_SCHEDULED,
          classEventId,
        },
        `class-scheduled-${classEventId}`,
      );
    } catch (error) {
      this.logger.warn({
        context: NotificationsDispatchService.name,
        message: 'No se pudo encolar la notificacion CLASS_SCHEDULED',
        classEventId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async dispatchClassUpdated(classEventId: string): Promise<void> {
    try {
      await this.enqueueDispatchJob({
        type: NOTIFICATION_TYPE_CODES.CLASS_UPDATED,
        classEventId,
      });
    } catch (error) {
      this.logger.warn({
        context: NotificationsDispatchService.name,
        message: 'No se pudo encolar la notificacion CLASS_UPDATED',
        classEventId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async dispatchClassCancelled(
    classEventId: string,
    options?: { sessionNumber?: number },
  ): Promise<void> {
    try {
      await this.enqueueDispatchJob(
        {
          type: NOTIFICATION_TYPE_CODES.CLASS_CANCELLED,
          classEventId,
          classSnapshot:
            options?.sessionNumber !== undefined
              ? { sessionNumber: options.sessionNumber }
              : undefined,
        },
        `class-cancelled-${classEventId}`,
      );
    } catch (error) {
      this.logger.warn({
        context: NotificationsDispatchService.name,
        message: 'No se pudo encolar la notificacion CLASS_CANCELLED',
        classEventId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async dispatchClassRecordingAvailable(classEventId: string): Promise<void> {
    try {
      await this.enqueueDispatchJob({
        type: NOTIFICATION_TYPE_CODES.CLASS_RECORDING_AVAILABLE,
        classEventId,
      });
    } catch (error) {
      this.logger.warn({
        context: NotificationsDispatchService.name,
        message: 'No se pudo encolar la notificacion CLASS_RECORDING_AVAILABLE',
        classEventId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async dispatchDeletionRequestApproved(requestId: string): Promise<void> {
    try {
      await this.enqueueDispatchJob(
        {
          type: NOTIFICATION_TYPE_CODES.DELETION_REQUEST_APPROVED,
          requestId,
        },
        `deletion-approved-${requestId}`,
      );
    } catch (error) {
      this.logger.warn({
        context: NotificationsDispatchService.name,
        message: 'No se pudo encolar la notificacion DELETION_REQUEST_APPROVED',
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async dispatchDeletionRequestRejected(
    requestId: string,
    adminComment?: string,
  ): Promise<void> {
    try {
      await this.enqueueDispatchJob(
        {
          type: NOTIFICATION_TYPE_CODES.DELETION_REQUEST_REJECTED,
          requestId,
          adminComment,
        },
        `deletion-rejected-${requestId}`,
      );
    } catch (error) {
      this.logger.warn({
        context: NotificationsDispatchService.name,
        message: 'No se pudo encolar la notificacion DELETION_REQUEST_REJECTED',
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async dispatchAuditExportReady(
    requestedByUserId: string,
    exportJobId: string,
    artifactName: string,
    artifactExpiresAt: string,
    estimatedFileCount: number,
  ): Promise<void> {
    try {
      await this.enqueueDispatchJob(
        {
          type: NOTIFICATION_TYPE_CODES.AUDIT_EXPORT_READY,
          requestedByUserId,
          exportJobId,
          artifactName,
          artifactExpiresAt,
          estimatedFileCount,
        },
        `audit-export-ready-${exportJobId}`,
      );
    } catch (error) {
      this.logger.warn({
        context: NotificationsDispatchService.name,
        message: 'No se pudo encolar la notificacion AUDIT_EXPORT_READY',
        requestedByUserId,
        exportJobId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async scheduleClassReminder(
    classEventId: string,
    startDatetime: Date,
  ): Promise<void> {
    try {
      const jobId = `class-reminder-${classEventId}`;
      const existingJob = await this.notificationsQueue.getJob(jobId);

      let reminderMinutes: number;
      try {
        const raw = await this.settingsService.getString(
          NOTIFICATION_SYSTEM_SETTING_KEYS.REMINDER_MINUTES,
        );
        const parsed = parseInt(raw, 10);
        reminderMinutes = Number.isFinite(parsed)
          ? parsed
          : technicalSettings.notifications.reminderDefaultMinutes;
      } catch {
        reminderMinutes =
          technicalSettings.notifications.reminderDefaultMinutes;
        this.logger.warn({
          context: NotificationsDispatchService.name,
          message:
            'No se encontro NOTIFICATION_REMINDER_MINUTES en system_setting al encolar reminder, usando valor por defecto',
          defaultValue: reminderMinutes,
        });
      }

      const minMinutes = technicalSettings.notifications.reminderMinMinutes;
      const maxMinutes = technicalSettings.notifications.reminderMaxMinutes;

      if (reminderMinutes < minMinutes || reminderMinutes > maxMinutes) {
        if (existingJob) {
          await existingJob.remove();
        }
        this.logger.error({
          context: NotificationsDispatchService.name,
          message:
            'Recordatorio omitido: NOTIFICATION_REMINDER_MINUTES esta fuera del rango permitido',
          reminderMinutes,
          minMinutes,
          maxMinutes,
          classEventId,
        });
        return;
      }

      const delayMs =
        startDatetime.getTime() - reminderMinutes * 60 * 1000 - Date.now();

      if (delayMs < technicalSettings.notifications.reminderMinEnqueueMs) {
        if (existingJob) {
          await existingJob.remove();
        }
        this.logger.log({
          context: NotificationsDispatchService.name,
          message:
            'Recordatorio de clase omitido: el delay calculado esta por debajo del umbral minimo',
          classEventId,
          delayMs,
          thresholdMs: technicalSettings.notifications.reminderMinEnqueueMs,
        });
        return;
      }

      if (existingJob) {
        await existingJob.remove();
      }

      await this.notificationsQueue.add(
        NOTIFICATION_JOB_NAMES.CLASS_REMINDER,
        { classEventId, reminderMinutes },
        { jobId, delay: delayMs, removeOnComplete: true },
      );
    } catch (error) {
      this.logger.warn({
        context: NotificationsDispatchService.name,
        message: 'No se pudo encolar el recordatorio de clase',
        classEventId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async cancelClassReminder(classEventId: string): Promise<void> {
    try {
      const jobId = `class-reminder-${classEventId}`;
      const existingJob = await this.notificationsQueue.getJob(jobId);
      if (existingJob) {
        await existingJob.remove();
      }
    } catch (error) {
      this.logger.warn({
        context: NotificationsDispatchService.name,
        message: 'No se pudo cancelar el recordatorio de clase',
        classEventId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async enqueueDispatchJob(
    payload: DispatchPayload,
    jobId?: string,
  ): Promise<void> {
    await this.notificationsQueue.add(
      NOTIFICATION_JOB_NAMES.DISPATCH,
      payload,
      {
        jobId,
        removeOnComplete: true,
      },
    );
  }
}

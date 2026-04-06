import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Job, UnrecoverableError } from 'bullmq';
import { QUEUES } from '@infrastructure/queue/queue.constants';
import { technicalSettings } from '@config/technical-settings';
import { SettingsService } from '@modules/settings/application/settings.service';
import { AuditExportReadyNotificationService } from '@modules/notifications/application/audit-export-ready-notification.service';
import { NotificationRepository } from '@modules/notifications/infrastructure/notification.repository';
import { NotificationTypeRepository } from '@modules/notifications/infrastructure/notification-type.repository';
import { UserNotificationRepository } from '@modules/notifications/infrastructure/user-notification.repository';
import { NotificationRecipientsService } from '@modules/notifications/application/notification-recipients.service';
import { Notification } from '@modules/notifications/domain/notification.entity';
import { UserNotification } from '@modules/notifications/domain/user-notification.entity';
import { DeletionRequest } from '@modules/materials/domain/deletion-request.entity';
import { Material } from '@modules/materials/domain/material.entity';
import { ClassEvent } from '@modules/events/domain/class-event.entity';
import {
  NOTIFICATION_JOB_NAMES,
  NOTIFICATION_MESSAGES,
  NOTIFICATION_SYSTEM_SETTING_KEYS,
  NOTIFICATION_TYPE_CODES,
  NOTIFICATION_ENTITY_TYPES,
  NotificationTypeCode,
} from '@modules/notifications/domain/notification.constants';

import {
  DispatchPayload,
  DispatchClassPayload,
  DispatchMaterialPayload,
  DispatchDeletionReviewPayload,
  DispatchAuditExportReadyPayload,
  ClassReminderPayload,
} from '@modules/notifications/interfaces';
import {
  NotificationIntegrityError,
  NotificationTargetNotFoundError,
} from '@modules/notifications/domain/notification.errors';

@Processor(QUEUES.NOTIFICATIONS, {
  lockDuration: technicalSettings.notifications.workerLockDurationMs,
})
export class NotificationDispatchProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationDispatchProcessor.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationRepository: NotificationRepository,
    private readonly notificationTypeRepository: NotificationTypeRepository,
    private readonly userNotificationRepository: UserNotificationRepository,
    private readonly recipientsService: NotificationRecipientsService,
    private readonly settingsService: SettingsService,
    private readonly auditExportReadyNotificationService: AuditExportReadyNotificationService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case NOTIFICATION_JOB_NAMES.DISPATCH:
        await this.handleDispatch(job as Job<DispatchPayload>);
        break;

      case NOTIFICATION_JOB_NAMES.CLASS_REMINDER:
        await this.handleClassReminder(job as Job<ClassReminderPayload>);
        break;

      case NOTIFICATION_JOB_NAMES.CLEANUP:
        await this.handleCleanup(job.name);
        break;

      default:
        this.logger.warn({
          context: NotificationDispatchProcessor.name,
          message: 'Job recibido con nombre desconocido, ignorado',
          jobName: job.name,
          jobId: job.id,
        });
    }
  }

  @OnWorkerEvent('error')
  onWorkerError(error: Error): void {
    this.logger.warn({
      context: NotificationDispatchProcessor.name,
      message: 'Worker notifications emitio error',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  private async handleDispatch(job: Job<DispatchPayload>): Promise<void> {
    const { type } = job.data;

    this.logger.log({
      context: NotificationDispatchProcessor.name,
      message: 'Procesando job de dispatch de notificacion',
      jobId: job.id,
      type,
    });

    if (type === NOTIFICATION_TYPE_CODES.NEW_MATERIAL) {
      await this.handleNewMaterial(job.data);
      return;
    }

    if (type === NOTIFICATION_TYPE_CODES.MATERIAL_UPDATED) {
      await this.handleMaterialUpdated(job.data);
      return;
    }

    if (
      type === NOTIFICATION_TYPE_CODES.CLASS_SCHEDULED ||
      type === NOTIFICATION_TYPE_CODES.CLASS_UPDATED ||
      type === NOTIFICATION_TYPE_CODES.CLASS_CANCELLED ||
      type === NOTIFICATION_TYPE_CODES.CLASS_RECORDING_AVAILABLE
    ) {
      await this.handleClassEvent(job.data);
      return;
    }

    if (
      type === NOTIFICATION_TYPE_CODES.DELETION_REQUEST_APPROVED ||
      type === NOTIFICATION_TYPE_CODES.DELETION_REQUEST_REJECTED
    ) {
      await this.handleDeletionReview(job.data);
      return;
    }

    if (type === NOTIFICATION_TYPE_CODES.AUDIT_EXPORT_READY) {
      await this.handleAuditExportReady(job.data);
      return;
    }

    const msg = `Error de integridad: tipo de notificacion desconocido '${String(
      type,
    )}' recibido en el job de dispatch`;
    this.logger.error({
      context: NotificationDispatchProcessor.name,
      message: msg,
      jobId: job.id,
      type,
    });
    throw new UnrecoverableError(msg);
  }

  private async handleNewMaterial(
    payload: DispatchMaterialPayload,
  ): Promise<void> {
    await this.handleMaterialDispatch(
      payload,
      NOTIFICATION_TYPE_CODES.NEW_MATERIAL,
    );
  }

  private async handleMaterialUpdated(
    payload: DispatchMaterialPayload,
  ): Promise<void> {
    await this.handleMaterialDispatch(
      payload,
      NOTIFICATION_TYPE_CODES.MATERIAL_UPDATED,
    );
  }

  private async handleMaterialDispatch(
    payload: DispatchMaterialPayload,
    expectedType:
      | typeof NOTIFICATION_TYPE_CODES.NEW_MATERIAL
      | typeof NOTIFICATION_TYPE_CODES.MATERIAL_UPDATED,
  ): Promise<void> {
    const { materialId, folderId } = payload;

    const context = await this.resolveMaterialContextOrFail(
      materialId,
      folderId,
    );

    if (context.recipientUserIds.length === 0) {
      this.logger.log({
        context: NotificationDispatchProcessor.name,
        message:
          'NEW_MATERIAL: sin destinatarios para este material, job completado sin insertar notificacion',
        materialId,
        folderId,
      });
      return;
    }

    const notificationType =
      await this.resolveNotificationTypeOrFail(expectedType);

    const template = NOTIFICATION_MESSAGES[expectedType];
    const title = template.title;
    const message = this.buildMaterialMessage(expectedType, context);

    const notificationData: Partial<Notification> = {
      notificationTypeId: notificationType.id,
      title,
      message,
      entityType: NOTIFICATION_ENTITY_TYPES.MATERIAL,
      entityId: context.materialId,
      createdAt: new Date(),
    };

    const notificationId = await this.dataSource.transaction(
      async (manager) => {
        const entity = manager.create(Notification, notificationData);
        const saved = await manager.save(entity);

        await manager.insert(
          UserNotification,
          context.recipientUserIds.map((userId) => ({
            userId,
            notificationId: saved.id,
            isRead: false,
            readAt: null as Date | null,
          })),
        );

        return saved.id;
      },
    );

    await this.invalidateUnreadCountSafely(context.recipientUserIds);

    this.logger.log({
      context: NotificationDispatchProcessor.name,
      message: `${expectedType}: notificación creada y distribuida`,
      notificationId,
      materialId,
      folderId,
      recipientCount: context.recipientUserIds.length,
    });
  }

  private async handleClassEvent(payload: DispatchClassPayload): Promise<void> {
    const { type, classEventId, classSnapshot } = payload;

    const context = await this.resolveClassEventContextOrFail(
      classEventId,
      classSnapshot?.sessionNumber,
    );

    if (context.recipientUserIds.length === 0) {
      this.logger.log({
        context: NotificationDispatchProcessor.name,
        message:
          'Notificacion de clase: sin destinatarios, job completado sin insertar notificacion',
        classEventId,
        type,
      });
      return;
    }

    const notificationType = await this.resolveNotificationTypeOrFail(type);

    const template = NOTIFICATION_MESSAGES[type];
    const message = this.buildClassEventMessage(type, context);

    const notificationData: Partial<Notification> = {
      notificationTypeId: notificationType.id,
      title: template.title,
      message,
      entityType: NOTIFICATION_ENTITY_TYPES.CLASS_EVENT,
      entityId: classEventId,
      createdAt: new Date(),
    };

    const notificationId = await this.dataSource.transaction(
      async (manager) => {
        const entity = manager.create(Notification, notificationData);
        const saved = await manager.save(entity);

        await manager.insert(
          UserNotification,
          context.recipientUserIds.map((userId) => ({
            userId,
            notificationId: saved.id,
            isRead: false,
            readAt: null as Date | null,
          })),
        );

        return saved.id;
      },
    );

    await this.invalidateUnreadCountSafely(context.recipientUserIds);

    this.logger.log({
      context: NotificationDispatchProcessor.name,
      message: 'Notificacion de clase creada y distribuida',
      notificationId,
      classEventId,
      type,
      recipientCount: context.recipientUserIds.length,
    });
  }

  private async handleClassReminder(
    job: Job<ClassReminderPayload>,
  ): Promise<void> {
    const { classEventId, reminderMinutes } = job.data;

    this.logger.log({
      context: NotificationDispatchProcessor.name,
      message: 'Procesando recordatorio de clase',
      jobId: job.id,
      classEventId,
      reminderMinutes,
    });

    const classEvent = await this.dataSource.getRepository(ClassEvent).findOne({
      where: { id: classEventId },
      select: { id: true, isCancelled: true },
    });
    if (!classEvent) {
      const msg = `No existe el class_event ${classEventId} para recordatorio`;
      this.logger.error({
        context: NotificationDispatchProcessor.name,
        message: msg,
        classEventId,
      });
      throw new UnrecoverableError(msg);
    }

    if (classEvent.isCancelled) {
      this.logger.log({
        context: NotificationDispatchProcessor.name,
        message: 'CLASS_REMINDER omitido: la clase ya se encuentra cancelada',
        classEventId,
      });
      return;
    }

    const context = await this.resolveClassEventContextOrFail(classEventId);

    if (context.recipientUserIds.length === 0) {
      this.logger.log({
        context: NotificationDispatchProcessor.name,
        message:
          'CLASS_REMINDER: sin destinatarios, job completado sin insertar notificacion',
        classEventId,
      });
      return;
    }

    const notificationType = await this.resolveNotificationTypeOrFail(
      NOTIFICATION_TYPE_CODES.CLASS_REMINDER,
    );

    const template =
      NOTIFICATION_MESSAGES[NOTIFICATION_TYPE_CODES.CLASS_REMINDER];
    const message = this.buildClassReminderMessage(context, reminderMinutes);

    const notificationData: Partial<Notification> = {
      notificationTypeId: notificationType.id,
      title: template.title,
      message,
      entityType: NOTIFICATION_ENTITY_TYPES.CLASS_EVENT,
      entityId: classEventId,
      createdAt: new Date(),
    };

    const notificationId = await this.dataSource.transaction(
      async (manager) => {
        const entity = manager.create(Notification, notificationData);
        const saved = await manager.save(entity);

        await manager.insert(
          UserNotification,
          context.recipientUserIds.map((userId) => ({
            userId,
            notificationId: saved.id,
            isRead: false,
            readAt: null as Date | null,
          })),
        );

        return saved.id;
      },
    );

    await this.invalidateUnreadCountSafely(context.recipientUserIds);

    this.logger.log({
      context: NotificationDispatchProcessor.name,
      message: 'CLASS_REMINDER: notificación creada y distribuida',
      notificationId,
      classEventId,
      reminderMinutes,
      recipientCount: context.recipientUserIds.length,
    });
  }

  private async handleAuditExportReady(
    payload: DispatchAuditExportReadyPayload,
  ): Promise<void> {
    await this.auditExportReadyNotificationService.createReadyNotification(
      payload,
    );
  }

  private async handleDeletionReview(
    payload: DispatchDeletionReviewPayload,
  ): Promise<void> {
    const request = await this.dataSource
      .getRepository(DeletionRequest)
      .findOne({
        where: { id: payload.requestId },
      });

    if (!request) {
      const msg = `No existe la solicitud de eliminación ${payload.requestId} para notificación`;
      this.logger.error({
        context: NotificationDispatchProcessor.name,
        message: msg,
        requestId: payload.requestId,
        type: payload.type,
      });
      throw new UnrecoverableError(msg);
    }

    const material = await this.dataSource.getRepository(Material).findOne({
      where: { id: request.entityId },
    });
    const materialLabel = material?.displayName || `ID ${request.entityId}`;

    const notificationType = await this.resolveNotificationTypeOrFail(
      payload.type,
    );
    const template = NOTIFICATION_MESSAGES[payload.type];
    const message =
      payload.type === NOTIFICATION_TYPE_CODES.DELETION_REQUEST_REJECTED
        ? NOTIFICATION_MESSAGES[
            NOTIFICATION_TYPE_CODES.DELETION_REQUEST_REJECTED
          ].message(materialLabel, payload.adminComment)
        : NOTIFICATION_MESSAGES[
            NOTIFICATION_TYPE_CODES.DELETION_REQUEST_APPROVED
          ].message(materialLabel);

    const notificationData: Partial<Notification> = {
      notificationTypeId: notificationType.id,
      title: template.title,
      message,
      entityType: NOTIFICATION_ENTITY_TYPES.DELETION_REQUEST,
      entityId: request.id,
      createdAt: new Date(),
    };

    const notificationId = await this.dataSource.transaction(
      async (manager) => {
        const entity = manager.create(Notification, notificationData);
        const saved = await manager.save(entity);

        await manager.insert(UserNotification, [
          {
            userId: request.requestedById,
            notificationId: saved.id,
            isRead: false,
            readAt: null as Date | null,
          },
        ]);

        return saved.id;
      },
    );

    await this.invalidateUnreadCountSafely([request.requestedById]);

    this.logger.log({
      context: NotificationDispatchProcessor.name,
      message: 'Notificación de revisión de solicitud creada y distribuida',
      notificationId,
      requestId: request.id,
      type: payload.type,
      recipientUserId: request.requestedById,
    });
  }

  private async handleCleanup(jobName: string): Promise<void> {
    this.logger.log({
      context: NotificationDispatchProcessor.name,
      job: jobName,
      message: 'Iniciando proceso de limpieza de notificaciones antiguas',
    });

    let retentionDays: number;
    try {
      const raw = await this.settingsService.getString(
        NOTIFICATION_SYSTEM_SETTING_KEYS.CLEANUP_RETENTION_DAYS,
      );
      const parsed = parseInt(raw, 10);
      retentionDays = Number.isFinite(parsed)
        ? parsed
        : technicalSettings.notifications.retentionDefaultDays;

      if (
        retentionDays < technicalSettings.notifications.retentionMinSafeDays
      ) {
        const msg = `Error de seguridad: Se intento configurar una retención menor a ${technicalSettings.notifications.retentionMinSafeDays} dias`;
        this.logger.error({
          context: NotificationDispatchProcessor.name,
          message: msg,
          valueReceived: retentionDays,
        });
        throw new UnrecoverableError(msg);
      }
    } catch (error) {
      if (error instanceof UnrecoverableError) throw error;

      retentionDays = technicalSettings.notifications.retentionDefaultDays;
      this.logger.warn({
        context: NotificationDispatchProcessor.name,
        job: jobName,
        message:
          'No se encontró NOTIFICATION_CLEANUP_RETENTION_DAYS en system_setting, usando valor por defecto',
        defaultValue: retentionDays,
      });
    }

    const cutOffDate = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000,
    );

    const totalDeleted = await this.notificationRepository.deleteOlderThan(
      cutOffDate,
      technicalSettings.notifications.cleanupBatchSize,
    );

    if (totalDeleted > 0) {
      await this.invalidateAllUnreadCountsSafely();
    }

    this.logger.log({
      context: NotificationDispatchProcessor.name,
      job: jobName,
      message: 'Limpieza de notificaciones completada',
      totalDeleted,
      retentionDays,
      cutOffDate: cutOffDate.toISOString(),
    });
  }

  private async resolveNotificationTypeOrFail(code: NotificationTypeCode) {
    const notificationType =
      await this.notificationTypeRepository.findByCode(code);

    if (!notificationType) {
      const msg = `Crítico: No existe el notification_type con código '${code}' en la base de datos`;
      this.logger.error({
        context: NotificationDispatchProcessor.name,
        message: msg,
        code,
      });
      throw new UnrecoverableError(
        `Error de integridad: notification_type '${code}' no configurado`,
      );
    }

    return notificationType;
  }

  private formatDatetime(date: Date): string {
    return date.toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private async invalidateUnreadCountSafely(userIds: string[]): Promise<void> {
    try {
      await this.userNotificationRepository.invalidateUnreadCountForUsers(
        userIds,
      );
    } catch (error) {
      this.logger.warn({
        context: NotificationDispatchProcessor.name,
        message:
          'No se pudo invalidar el cache de unread-count luego de crear notificaciones',
        userIds,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async invalidateAllUnreadCountsSafely(): Promise<void> {
    try {
      await this.userNotificationRepository.invalidateAllUnreadCounts();
    } catch (error) {
      this.logger.warn({
        context: NotificationDispatchProcessor.name,
        message:
          'No se pudo invalidar globalmente el cache de unread-count luego del cleanup',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async resolveClassEventContextOrFail(
    classEventId: string,
    sessionNumberSnapshot?: number,
  ) {
    try {
      return await this.recipientsService.resolveClassEventContext(
        classEventId,
        sessionNumberSnapshot,
      );
    } catch (error) {
      if (
        error instanceof NotificationTargetNotFoundError ||
        error instanceof NotificationIntegrityError
      ) {
        this.logger.error({
          context: NotificationDispatchProcessor.name,
          message: error.message,
          classEventId,
        });
        throw new UnrecoverableError(error.message);
      }
      throw error;
    }
  }

  private async resolveMaterialContextOrFail(
    materialId: string,
    folderId: string,
  ) {
    try {
      return await this.recipientsService.resolveMaterialContext(
        materialId,
        folderId,
      );
    } catch (error) {
      if (
        error instanceof NotificationTargetNotFoundError ||
        error instanceof NotificationIntegrityError
      ) {
        this.logger.error({
          context: NotificationDispatchProcessor.name,
          message: error.message,
          materialId,
          folderId,
        });
        throw new UnrecoverableError(error.message);
      }
      throw error;
    }
  }

  private buildMaterialMessage(
    type:
      | typeof NOTIFICATION_TYPE_CODES.NEW_MATERIAL
      | typeof NOTIFICATION_TYPE_CODES.MATERIAL_UPDATED,
    context: {
      materialDisplayName: string;
      sessionNumber: number | null;
      evaluationLabel: string;
      courseName: string;
    },
  ): string {
    const action =
      type === NOTIFICATION_TYPE_CODES.NEW_MATERIAL
        ? 'Se publicó'
        : 'Se actualizó';
    const scopeLabel =
      context.sessionNumber !== null
        ? `de la clase ${context.sessionNumber} de la ${context.evaluationLabel}`
        : `de la ${context.evaluationLabel}`;
    return `${action} '${context.materialDisplayName}' ${scopeLabel} del curso ${context.courseName}.`;
  }

  private buildClassEventMessage(
    type:
      | typeof NOTIFICATION_TYPE_CODES.CLASS_SCHEDULED
      | typeof NOTIFICATION_TYPE_CODES.CLASS_UPDATED
      | typeof NOTIFICATION_TYPE_CODES.CLASS_CANCELLED
      | typeof NOTIFICATION_TYPE_CODES.CLASS_RECORDING_AVAILABLE,
    context: {
      sessionNumber: number;
      evaluationLabel: string;
      courseName: string;
      startDatetime: Date;
    },
  ): string {
    const sessionLabel = this.buildSessionLabel(
      context.sessionNumber,
      context.evaluationLabel,
      context.courseName,
    );
    const fechaFormateada = this.formatDatetime(context.startDatetime);

    if (type === NOTIFICATION_TYPE_CODES.CLASS_SCHEDULED) {
      return `${sessionLabel} ha sido programada para el ${fechaFormateada}.`;
    }
    if (type === NOTIFICATION_TYPE_CODES.CLASS_UPDATED) {
      return `El horario de ${this.lowercaseLeadingArticle(sessionLabel)} ha sido actualizado. Revisa los detalles mas recientes en la plataforma.`;
    }
    if (type === NOTIFICATION_TYPE_CODES.CLASS_CANCELLED) {
      return `${sessionLabel} programada para el ${fechaFormateada} ha sido cancelada.`;
    }

    return `La grabación de ${this.lowercaseLeadingArticle(sessionLabel)} ya está disponible.`;
  }

  private buildClassReminderMessage(
    context: {
      sessionNumber: number;
      evaluationLabel: string;
      courseName: string;
    },
    reminderMinutes: number,
  ): string {
    const sessionLabel = this.buildSessionLabel(
      context.sessionNumber,
      context.evaluationLabel,
      context.courseName,
    );
    return `Tienes ${this.lowercaseLeadingArticle(sessionLabel)} en ${reminderMinutes} minutos.`;
  }

  private buildSessionLabel(
    sessionNumber: number,
    evaluationLabel: string,
    courseName: string,
  ): string {
    return `La clase ${sessionNumber} de la ${evaluationLabel} del curso ${courseName}`;
  }

  private lowercaseLeadingArticle(value: string): string {
    return value.startsWith('La ') ? `la ${value.slice(3)}` : value;
  }
}

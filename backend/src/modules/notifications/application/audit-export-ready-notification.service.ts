import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { NotificationTypeRepository } from '@modules/notifications/infrastructure/notification-type.repository';
import { UserNotificationRepository } from '@modules/notifications/infrastructure/user-notification.repository';
import { Notification } from '@modules/notifications/domain/notification.entity';
import { UserNotification } from '@modules/notifications/domain/user-notification.entity';
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_MESSAGES,
  NOTIFICATION_TYPE_CODES,
} from '@modules/notifications/domain/notification.constants';

export type AuditExportReadyNotificationPayload = {
  requestedByUserId: string;
  exportJobId: string;
  artifactName: string;
  artifactExpiresAt: string;
  estimatedFileCount: number;
};

@Injectable()
export class AuditExportReadyNotificationService {
  private readonly logger = new Logger(
    AuditExportReadyNotificationService.name,
  );

  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationTypeRepository: NotificationTypeRepository,
    private readonly userNotificationRepository: UserNotificationRepository,
  ) {}

  async createReadyNotification(
    payload: AuditExportReadyNotificationPayload,
  ): Promise<void> {
    const notificationType = await this.notificationTypeRepository.findByCode(
      NOTIFICATION_TYPE_CODES.AUDIT_EXPORT_READY,
    );

    if (!notificationType) {
      throw new Error(
        "notification_type 'AUDIT_EXPORT_READY' no configurado en la base de datos",
      );
    }

    const template =
      NOTIFICATION_MESSAGES[NOTIFICATION_TYPE_CODES.AUDIT_EXPORT_READY];
    const notificationId = await this.dataSource.transaction(
      async (manager) => {
        const entity = manager.create(Notification, {
          notificationTypeId: notificationType.id,
          title: template.title,
          message: template.message(
            payload.artifactName,
            payload.estimatedFileCount,
          ),
          entityType: NOTIFICATION_ENTITY_TYPES.AUDIT_EXPORT,
          entityId: payload.exportJobId,
          createdAt: new Date(),
        });
        const saved = await manager.save(entity);

        await manager.insert(UserNotification, {
          userId: payload.requestedByUserId,
          notificationId: saved.id,
          isRead: false,
          readAt: null as Date | null,
        });

        return saved.id;
      },
    );

    await this.invalidateUnreadCountSafely(payload.requestedByUserId);

    this.logger.log({
      context: AuditExportReadyNotificationService.name,
      message: 'Notificacion de exportacion de auditoria creada y distribuida',
      notificationId,
      exportJobId: payload.exportJobId,
      requestedByUserId: payload.requestedByUserId,
      artifactName: payload.artifactName,
      artifactExpiresAt: payload.artifactExpiresAt,
    });
  }

  private async invalidateUnreadCountSafely(userId: string): Promise<void> {
    try {
      await this.userNotificationRepository.invalidateUnreadCountForUsers([
        userId,
      ]);
    } catch (error) {
      this.logger.warn({
        context: AuditExportReadyNotificationService.name,
        message:
          'No se pudo invalidar el cache de unread-count luego de crear la notificacion de exportacion de auditoria',
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

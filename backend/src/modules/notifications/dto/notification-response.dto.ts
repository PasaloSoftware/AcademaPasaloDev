import { InternalServerErrorException } from '@nestjs/common';
import { UserNotification } from '@modules/notifications/domain/user-notification.entity';

export type NotificationTargetDto = {
  materialId: string | null;
  classEventId: string | null;
  evaluationId: string | null;
  courseCycleId: string | null;
  folderId: string | null;
  auditExportJobId: string | null;
};

export class NotificationResponseDto {
  notificationId: string;
  type: string;
  typeName: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  target: NotificationTargetDto | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;

  static fromEntity(
    un: UserNotification,
    target: NotificationTargetDto | null = null,
  ): NotificationResponseDto {
    if (!un.notification || !un.notification.notificationType) {
      throw new InternalServerErrorException(
        'fromEntity requiere que las relaciones notification y notificationType esten cargadas',
      );
    }

    return {
      notificationId: un.notificationId,
      type: un.notification.notificationType.code,
      typeName: un.notification.notificationType.name,
      title: un.notification.title,
      message: un.notification.message,
      entityType: un.notification.entityType,
      entityId: un.notification.entityId,
      target,
      isRead: un.isRead,
      readAt: un.readAt,
      createdAt: un.notification.createdAt,
    };
  }
}

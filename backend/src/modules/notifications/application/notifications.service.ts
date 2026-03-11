import {
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES } from '@infrastructure/queue/queue.constants';
import { JobScheduler } from '@infrastructure/queue/queue.interfaces';
import { technicalSettings } from '@config/technical-settings';
import { UserNotificationRepository } from '@modules/notifications/infrastructure/user-notification.repository';
import { UserNotification } from '@modules/notifications/domain/user-notification.entity';
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_JOB_NAMES,
} from '@modules/notifications/domain/notification.constants';
import {
  NotificationResponseDto,
  NotificationTargetDto,
} from '@modules/notifications/dto/notification-response.dto';
import { MaterialRepository } from '@modules/materials/infrastructure/material.repository';
import { ClassEventRepository } from '@modules/events/infrastructure/class-event.repository';

@Injectable()
export class NotificationsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly userNotificationRepository: UserNotificationRepository,
    private readonly materialRepository: MaterialRepository,
    private readonly classEventRepository: ClassEventRepository,
    @InjectQueue(QUEUES.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (technicalSettings.queue.enableRepeatSchedulers) {
      await this.setupCleanupScheduler();
    }
    this.validateReminderSettings();
  }

  private validateReminderSettings(): void {
    const { reminderDefaultMinutes, reminderMinMinutes, reminderMaxMinutes } =
      technicalSettings.notifications;

    if (
      reminderDefaultMinutes < reminderMinMinutes ||
      reminderDefaultMinutes > reminderMaxMinutes
    ) {
      this.logger.error({
        context: NotificationsService.name,
        message:
          'reminderDefaultMinutes esta fuera del rango permitido [min, max]. Revise technical-settings.ts.',
        reminderDefaultMinutes,
        reminderMinMinutes,
        reminderMaxMinutes,
      });
    }
  }

  private async setupCleanupScheduler(): Promise<void> {
    const jobName = NOTIFICATION_JOB_NAMES.CLEANUP;
    const cronPattern = technicalSettings.notifications.cleanupCronPattern;

    const schedulers =
      (await this.notificationsQueue.getJobSchedulers()) as unknown as JobScheduler[];
    const existing = schedulers.find((s) => s.name === jobName);

    if (existing) {
      const currentPattern = existing.cron ?? existing.pattern;

      if (currentPattern !== cronPattern) {
        this.logger.log({
          context: NotificationsService.name,
          message:
            'Detectado cambio en el patron de horario del cleanup. Actualizando Redis...',
          oldPattern: currentPattern,
          newPattern: cronPattern,
        });

        await this.notificationsQueue.removeJobScheduler(jobName);
        await this.notificationsQueue.add(
          jobName,
          {},
          { repeat: { pattern: cronPattern } },
        );
      } else {
        this.logger.debug({
          context: NotificationsService.name,
          message:
            'Scheduler de cleanup ya registrado con el patron actual. Sin cambios.',
          pattern: cronPattern,
        });
      }
    } else {
      await this.notificationsQueue.add(
        jobName,
        {},
        { repeat: { pattern: cronPattern } },
      );

      this.logger.log({
        context: NotificationsService.name,
        message: 'Tarea repetitiva de limpieza de notificaciones registrada',
        job: jobName,
        pattern: cronPattern,
      });
    }
  }

  async getMyNotifications(
    userId: string,
    onlyUnread: boolean,
    limit: number,
    offset: number,
  ): Promise<UserNotification[]> {
    return await this.userNotificationRepository.findByUserPaginated(
      userId,
      onlyUnread,
      limit,
      offset,
    );
  }

  async getMyNotificationResponses(
    userId: string,
    onlyUnread: boolean,
    limit: number,
    offset: number,
  ): Promise<NotificationResponseDto[]> {
    const userNotifications = await this.getMyNotifications(
      userId,
      onlyUnread,
      limit,
      offset,
    );
    const targetMap = await this.resolveTargets(userNotifications);

    return userNotifications.map((un) =>
      NotificationResponseDto.fromEntity(
        un,
        targetMap.get(un.notificationId) ?? null,
      ),
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await this.userNotificationRepository.countUnread(userId);
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const userNotification = await this.userNotificationRepository.findOne(
      userId,
      notificationId,
    );

    if (!userNotification) {
      throw new NotFoundException(
        'La notificacion no existe o no pertenece al usuario',
      );
    }

    if (userNotification.isRead) {
      return;
    }

    await this.userNotificationRepository.markAsRead(userId, notificationId);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.userNotificationRepository.markAllAsRead(userId);
  }

  private async resolveTargets(
    userNotifications: UserNotification[],
  ): Promise<Map<string, NotificationTargetDto>> {
    const materialIds = userNotifications
      .filter(
        (un) =>
          un.notification?.entityType === NOTIFICATION_ENTITY_TYPES.MATERIAL,
      )
      .map((un) => String(un.notification.entityId || '').trim())
      .filter((id) => id.length > 0);

    const classEventIds = userNotifications
      .filter(
        (un) =>
          un.notification?.entityType === NOTIFICATION_ENTITY_TYPES.CLASS_EVENT,
      )
      .map((un) => String(un.notification.entityId || '').trim())
      .filter((id) => id.length > 0);

    const [materialTargets, classEventTargets] = await Promise.all([
      this.materialRepository.findNotificationTargetsByIds([
        ...new Set(materialIds),
      ]),
      this.classEventRepository.findNotificationTargetsByIds([
        ...new Set(classEventIds),
      ]),
    ]);

    const materialTargetMap = new Map(
      materialTargets.map((row) => [
        row.materialId,
        {
          materialId: row.materialId,
          classEventId: row.classEventId,
          evaluationId: row.evaluationId,
          courseCycleId: row.courseCycleId,
          folderId: row.folderId,
        } satisfies NotificationTargetDto,
      ]),
    );
    const classEventTargetMap = new Map(
      classEventTargets.map((row) => [
        row.classEventId,
        {
          materialId: null,
          classEventId: row.classEventId,
          evaluationId: row.evaluationId,
          courseCycleId: row.courseCycleId,
          folderId: null,
        } satisfies NotificationTargetDto,
      ]),
    );

    const targetMap = new Map<string, NotificationTargetDto>();
    for (const un of userNotifications) {
      const entityType = un.notification?.entityType;
      const entityId = String(un.notification?.entityId || '').trim();
      if (!entityId) {
        continue;
      }

      if (entityType === NOTIFICATION_ENTITY_TYPES.MATERIAL) {
        const target = materialTargetMap.get(entityId);
        if (target) {
          targetMap.set(un.notificationId, target);
        }
        continue;
      }

      if (entityType === NOTIFICATION_ENTITY_TYPES.CLASS_EVENT) {
        const target = classEventTargetMap.get(entityId);
        if (target) {
          targetMap.set(un.notificationId, target);
        }
      }
    }

    return targetMap;
  }
}

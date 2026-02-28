import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationType } from '@modules/notifications/domain/notification-type.entity';
import { NOTIFICATION_CACHE_KEYS } from '@modules/notifications/domain/notification.constants';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { technicalSettings } from '@config/technical-settings';

@Injectable()
export class NotificationTypeRepository {
  private static readonly CACHE_TTL_SECONDS =
    technicalSettings.notifications.notificationTypeCacheTtlSeconds;

  constructor(
    @InjectRepository(NotificationType)
    private readonly repository: Repository<NotificationType>,
    private readonly cacheService: RedisCacheService,
  ) {}

  async findByCode(code: string): Promise<NotificationType | null> {
    const cacheKey = NOTIFICATION_CACHE_KEYS.TYPE_BY_CODE(code);
    const cached = await this.cacheService.get<NotificationType>(cacheKey);

    if (cached) {
      return cached;
    }

    const notificationType = await this.repository.findOne({ where: { code } });

    if (notificationType) {
      await this.cacheService.set(
        cacheKey,
        notificationType,
        NotificationTypeRepository.CACHE_TTL_SECONDS,
      );
    }

    return notificationType;
  }
}

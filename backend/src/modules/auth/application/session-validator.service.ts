import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UserSessionRepository } from '@modules/auth/infrastructure/user-session.repository';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { SessionStatusService } from '@modules/auth/application/session-status.service';
import { UserSession } from '@modules/auth/domain/user-session.entity';
import {
  SECURITY_MESSAGES,
  SESSION_STATUS_CODES,
} from '@modules/auth/interfaces/security.constants';
import { createHash } from 'crypto';
import { getEpoch } from '@common/utils/date.util';
import { technicalSettings } from '@config/technical-settings';

@Injectable()
export class SessionValidatorService {
  private readonly logger = new Logger(SessionValidatorService.name);
  private static readonly LAST_ACTIVITY_UPDATE_WINDOW_MS =
    technicalSettings.auth.session.lastActivityUpdateWindowMinutes * 60 * 1000;

  constructor(
    private readonly userSessionRepository: UserSessionRepository,
    private readonly sessionStatusService: SessionStatusService,
    private readonly cacheService: RedisCacheService,
  ) {}

  async validateRefreshTokenSession(
    userId: string,
    deviceId: string,
    refreshToken: string,
  ): Promise<UserSession> {
    const refreshTokenHash = this.hashRefreshToken(refreshToken);

    const isBlacklisted = await this.cacheService.get(
      `blacklist:refresh:${refreshTokenHash}`,
    );
    if (isBlacklisted) {
      this.logger.warn({
        level: 'warn',
        context: SessionValidatorService.name,
        message: 'Intento de uso de refresh token revocado',
        userId,
        deviceId,
      });
      throw new UnauthorizedException(SECURITY_MESSAGES.REVOKED_TOKEN);
    }

    const session =
      await this.userSessionRepository.findByRefreshTokenHash(refreshTokenHash);

    if (!session || session.userId !== userId) {
      throw new UnauthorizedException(SECURITY_MESSAGES.INVALID_SESSION);
    }

    if (session.deviceId !== deviceId) {
      throw new UnauthorizedException(SECURITY_MESSAGES.UNAUTHORIZED_DEVICE);
    }

    if (getEpoch(session.expiresAt) < getEpoch(new Date())) {
      const revokedStatusId = await this.sessionStatusService.getIdByCode(
        SESSION_STATUS_CODES.REVOKED,
      );
      await this.userSessionRepository.update(session.id, {
        isActive: false,
        sessionStatusId: revokedStatusId,
      });
      throw new UnauthorizedException(SECURITY_MESSAGES.INVALID_SESSION);
    }

    const activeStatusId = await this.sessionStatusService.getIdByCode(
      SESSION_STATUS_CODES.ACTIVE,
    );
    if (session.sessionStatusId !== activeStatusId || !session.isActive) {
      throw new UnauthorizedException(SECURITY_MESSAGES.INVALID_SESSION);
    }

    await this.touchLastActivityIfNeeded(session);

    return session;
  }

  async validateSession(
    sessionId: string,
    userId: string,
    deviceId: string,
  ): Promise<UserSession> {
    const session =
      await this.userSessionRepository.findByIdWithUser(sessionId);

    if (!session || session.userId !== userId) {
      throw new UnauthorizedException(SECURITY_MESSAGES.INVALID_SESSION);
    }

    const activeStatusId = await this.sessionStatusService.getIdByCode(
      SESSION_STATUS_CODES.ACTIVE,
    );

    if (
      !session.isActive ||
      session.sessionStatusId !== activeStatusId ||
      getEpoch(session.expiresAt) < getEpoch(new Date())
    ) {
      throw new UnauthorizedException(SECURITY_MESSAGES.INVALID_SESSION);
    }

    if (session.deviceId !== deviceId) {
      this.logger.warn({
        level: 'warn',
        context: SessionValidatorService.name,
        message: 'Intento de uso de sesión con dispositivo diferente',
        sessionId: session.id,
        expectedDeviceId: session.deviceId,
        providedDeviceId: deviceId,
      });
      throw new UnauthorizedException(SECURITY_MESSAGES.UNAUTHORIZED_DEVICE);
    }

    await this.touchLastActivityIfNeeded(session);
    return session;
  }

  private async touchLastActivityIfNeeded(session: UserSession): Promise<void> {
    const now = new Date();
    const lastActivityAt = session.lastActivityAt;

    if (lastActivityAt instanceof Date) {
      if (
        now.getTime() - lastActivityAt.getTime() <
        SessionValidatorService.LAST_ACTIVITY_UPDATE_WINDOW_MS
      ) {
        return;
      }
    }

    await this.userSessionRepository.updateLastActivity(session.id, now);
    session.lastActivityAt = now;
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

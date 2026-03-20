import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { UserSessionRepository } from '@modules/auth/infrastructure/user-session.repository';
import { SessionStatusRepository } from '@modules/auth/infrastructure/session-status.repository';
import {
  IDENTITY_INVALIDATION_REASONS,
  SESSION_STATUS_CODES,
  type IdentityInvalidationReason,
} from '@modules/auth/interfaces/security.constants';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { COURSE_CACHE_KEYS } from '@modules/courses/domain/course.constants';

@Injectable()
export class IdentitySecurityService {
  private readonly logger = new Logger(IdentitySecurityService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly userSessionRepository: UserSessionRepository,
    private readonly sessionStatusRepository: SessionStatusRepository,
    private readonly cacheService: RedisCacheService,
  ) {}

  async invalidateUserIdentity(
    userId: string,
    options?: {
      revokeSessions?: boolean;
      reason?: IdentityInvalidationReason;
      manager?: EntityManager;
      professorCacheContext?: {
        courseCycleIds: string[];
        evaluationIds: string[];
      };
    },
  ): Promise<void> {
    const revokeSessions = options?.revokeSessions ?? false;
    const reason = options?.reason ?? IDENTITY_INVALIDATION_REASONS.UNSPECIFIED;
    const manager = options?.manager;
    const professorCacheContext =
      options?.professorCacheContext ??
      (await this.resolveProfessorCacheContext(userId, manager));

    const activeSessions =
      await this.userSessionRepository.findActiveSessionsByUserId(
        userId,
        manager,
      );

    if (revokeSessions && activeSessions.length > 0) {
      const revokedStatus = await this.sessionStatusRepository.findByCode(
        SESSION_STATUS_CODES.REVOKED,
        manager,
      );
      if (!revokedStatus) {
        throw new InternalServerErrorException(
          'Configuración de estado de sesión incompleta',
        );
      }

      await this.userSessionRepository.deactivateActiveSessionsByUserId(
        userId,
        revokedStatus.id,
        manager,
      );
    }

    await Promise.all([
      this.cacheService.del(`cache:user:profile:${userId}`),
      this.invalidateProfessorCacheKeys(userId, professorCacheContext),
    ]);

    this.logger.log({
      level: 'info',
      context: IdentitySecurityService.name,
      message: 'Invalidación de identidad ejecutada',
      userId,
      revokeSessions,
      sessionsAffected: activeSessions.length,
      reason,
    });
  }

  private async resolveProfessorCacheContext(
    userId: string,
    manager?: EntityManager,
  ): Promise<{ courseCycleIds: string[]; evaluationIds: string[] }> {
    const executor = manager ?? this.dataSource;
    const [courseCycleRows, evaluationRows] = await Promise.all([
      executor.query<Array<{ courseCycleId: string }>>(
        `
          SELECT DISTINCT ccp.course_cycle_id AS courseCycleId
          FROM course_cycle_professor ccp
          WHERE ccp.professor_user_id = ?
            AND ccp.revoked_at IS NULL
        `,
        [userId],
      ),
      executor.query<Array<{ evaluationId: string }>>(
        `
          SELECT DISTINCT ev.id AS evaluationId
          FROM evaluation ev
          INNER JOIN course_cycle_professor ccp
            ON ccp.course_cycle_id = ev.course_cycle_id
          WHERE ccp.professor_user_id = ?
            AND ccp.revoked_at IS NULL
        `,
        [userId],
      ),
    ]);

    return {
      courseCycleIds: courseCycleRows
        .map((row) => String(row.courseCycleId || '').trim())
        .filter((id) => id.length > 0),
      evaluationIds: evaluationRows
        .map((row) => String(row.evaluationId || '').trim())
        .filter((id) => id.length > 0),
    };
  }

  private async invalidateProfessorCacheKeys(
    userId: string,
    context: { courseCycleIds: string[]; evaluationIds: string[] },
  ): Promise<void> {
    const keys = [
      ...context.courseCycleIds.map((courseCycleId) =>
        COURSE_CACHE_KEYS.PROFESSOR_ASSIGNMENT_COURSE_CYCLE(
          courseCycleId,
          userId,
        ),
      ),
      ...context.courseCycleIds.map((courseCycleId) =>
        COURSE_CACHE_KEYS.PROFESSORS_LIST(courseCycleId),
      ),
      ...context.evaluationIds.map((evaluationId) =>
        COURSE_CACHE_KEYS.PROFESSOR_ASSIGNMENT(evaluationId, userId),
      ),
    ];

    const uniqueKeys = [...new Set(keys)];
    if (uniqueKeys.length === 0) {
      return;
    }

    await this.cacheService.delMany(uniqueKeys);
  }
}

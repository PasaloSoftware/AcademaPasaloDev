import { InternalServerErrorException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IdentitySecurityService } from '@modules/users/application/identity-security.service';
import { UserSessionRepository } from '@modules/auth/infrastructure/user-session.repository';
import { SessionStatusRepository } from '@modules/auth/infrastructure/session-status.repository';
import {
  IDENTITY_INVALIDATION_REASONS,
  SESSION_STATUS_CODES,
} from '@modules/auth/interfaces/security.constants';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { COURSE_CACHE_KEYS } from '@modules/courses/domain/course.constants';
import { DataSource } from 'typeorm';

describe('IdentitySecurityService', () => {
  let service: IdentitySecurityService;

  const userSessionRepositoryMock = {
    findActiveSessionsByUserId: jest.fn(),
    deactivateActiveSessionsByUserId: jest.fn(),
  };

  const sessionStatusRepositoryMock = {
    findByCode: jest.fn(),
  };

  const cacheServiceMock = {
    del: jest.fn(),
    delMany: jest.fn(),
  };

  const dataSourceMock = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        IdentitySecurityService,
        {
          provide: UserSessionRepository,
          useValue: userSessionRepositoryMock,
        },
        {
          provide: SessionStatusRepository,
          useValue: sessionStatusRepositoryMock,
        },
        { provide: DataSource, useValue: dataSourceMock },
        { provide: RedisCacheService, useValue: cacheServiceMock },
      ],
    }).compile();

    service = moduleRef.get(IdentitySecurityService);
  });

  it('invalidacion sensible sin revocacion limpia cache de perfil', async () => {
    userSessionRepositoryMock.findActiveSessionsByUserId.mockResolvedValue([
      { id: 's1' },
      { id: 's2' },
    ]);
    dataSourceMock.query
      .mockResolvedValueOnce([{ courseCycleId: 'cc-1' }])
      .mockResolvedValueOnce([{ evaluationId: 'ev-1' }]);

    await service.invalidateUserIdentity('10', {
      revokeSessions: false,
      reason: IDENTITY_INVALIDATION_REASONS.SENSITIVE_UPDATE,
    });

    expect(
      userSessionRepositoryMock.deactivateActiveSessionsByUserId,
    ).not.toHaveBeenCalled();
    expect(cacheServiceMock.del).toHaveBeenCalledTimes(1);
    expect(cacheServiceMock.del).toHaveBeenCalledWith('cache:user:profile:10');
    expect(cacheServiceMock.delMany).toHaveBeenCalledWith([
      COURSE_CACHE_KEYS.PROFESSOR_ASSIGNMENT_COURSE_CYCLE('cc-1', '10'),
      COURSE_CACHE_KEYS.PROFESSORS_LIST('cc-1'),
      COURSE_CACHE_KEYS.PROFESSOR_ASSIGNMENT('ev-1', '10'),
    ]);
  });

  it('baneo revoca sesiones activas y limpia cache de perfil', async () => {
    const revokedId = 'revoked-status-id';
    userSessionRepositoryMock.findActiveSessionsByUserId.mockResolvedValue([
      { id: 's1' },
    ]);
    sessionStatusRepositoryMock.findByCode.mockResolvedValue({ id: revokedId });
    dataSourceMock.query
      .mockResolvedValueOnce([{ courseCycleId: 'cc-1' }])
      .mockResolvedValueOnce([{ evaluationId: 'ev-1' }]);

    await service.invalidateUserIdentity('10', {
      revokeSessions: true,
      reason: IDENTITY_INVALIDATION_REASONS.USER_BANNED,
    });

    expect(sessionStatusRepositoryMock.findByCode).toHaveBeenCalledWith(
      SESSION_STATUS_CODES.REVOKED,
      undefined,
    );
    expect(
      userSessionRepositoryMock.deactivateActiveSessionsByUserId,
    ).toHaveBeenCalledWith('10', revokedId, undefined);
    expect(cacheServiceMock.del).toHaveBeenCalledWith('cache:user:profile:10');
    expect(cacheServiceMock.delMany).toHaveBeenCalledWith([
      COURSE_CACHE_KEYS.PROFESSOR_ASSIGNMENT_COURSE_CYCLE('cc-1', '10'),
      COURSE_CACHE_KEYS.PROFESSORS_LIST('cc-1'),
      COURSE_CACHE_KEYS.PROFESSOR_ASSIGNMENT('ev-1', '10'),
    ]);
  });

  it('si no existe estado REVOKED lanza error de configuracion', async () => {
    userSessionRepositoryMock.findActiveSessionsByUserId.mockResolvedValue([
      { id: 's1' },
    ]);
    sessionStatusRepositoryMock.findByCode.mockResolvedValue(null);
    dataSourceMock.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await expect(
      service.invalidateUserIdentity('10', { revokeSessions: true }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});

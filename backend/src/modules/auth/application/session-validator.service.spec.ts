import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { SessionStatusService } from '@modules/auth/application/session-status.service';
import { SessionValidatorService } from '@modules/auth/application/session-validator.service';
import { UserSessionRepository } from '@modules/auth/infrastructure/user-session.repository';
import { SESSION_STATUS_CODES } from '@modules/auth/interfaces/security.constants';
import { PhotoSource } from '@modules/users/domain/user.entity';

describe('SessionValidatorService', () => {
  let service: SessionValidatorService;
  let userSessionRepository: jest.Mocked<UserSessionRepository>;
  let sessionStatusService: jest.Mocked<SessionStatusService>;
  let cacheService: jest.Mocked<RedisCacheService>;

  const buildSession = (overrides: Record<string, unknown> = {}) => ({
    id: 's1',
    userId: 'u1',
    deviceId: 'device-1',
    refreshTokenHash: 'hash',
    refreshTokenJti: 'jti-1',
    sessionStatusId: 'active-id',
    activeRoleId: '1',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    lastActivityAt: new Date(Date.now() - 6 * 60 * 1000),
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ipAddress: '127.0.0.1',
    latitude: null,
    longitude: null,
    user: {
      id: 'u1',
      email: 'user@test.com',
      firstName: 'User',
      lastName1: null,
      lastName2: null,
      phone: null,
      career: null,
      profilePhotoUrl: null,
      photoSource: PhotoSource.NONE,
      lastActiveRoleId: '1',
      lastActiveRole: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: null,
      roles: [],
    },
    ...overrides,
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        SessionValidatorService,
        {
          provide: UserSessionRepository,
          useValue: {
            findByRefreshTokenHash: jest.fn(),
            findByIdWithUser: jest.fn(),
            update: jest.fn(),
            updateLastActivity: jest.fn(),
          },
        },
        {
          provide: SessionStatusService,
          useValue: {
            getIdByCode: jest.fn(),
          },
        },
        {
          provide: RedisCacheService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(SessionValidatorService);
    userSessionRepository = moduleRef.get(UserSessionRepository);
    sessionStatusService = moduleRef.get(SessionStatusService);
    cacheService = moduleRef.get(RedisCacheService);

    jest.clearAllMocks();
    cacheService.get.mockResolvedValue(null as never);
    sessionStatusService.getIdByCode.mockResolvedValue('active-id' as never);
  });

  it('actualiza lastActivityAt solo cuando supera la ventana', async () => {
    const session = buildSession();
    userSessionRepository.findByIdWithUser.mockResolvedValue(session as never);
    userSessionRepository.updateLastActivity.mockResolvedValue(
      undefined as never,
    );

    await service.validateSession('s1', 'u1', 'device-1');

    expect(userSessionRepository.updateLastActivity).toHaveBeenCalledTimes(1);
    expect(userSessionRepository.updateLastActivity).toHaveBeenCalledWith(
      's1',
      expect.any(Date),
    );
  });

  it('omite el update de lastActivityAt dentro de la ventana', async () => {
    const session = buildSession({
      lastActivityAt: new Date(Date.now() - 2 * 60 * 1000),
    });
    userSessionRepository.findByIdWithUser.mockResolvedValue(session as never);

    await service.validateSession('s1', 'u1', 'device-1');

    expect(userSessionRepository.updateLastActivity).not.toHaveBeenCalled();
  });

  it('aplica la misma politica al validar refresh token', async () => {
    const session = buildSession();
    userSessionRepository.findByRefreshTokenHash.mockResolvedValue(
      session as never,
    );
    userSessionRepository.updateLastActivity.mockResolvedValue(
      undefined as never,
    );

    await service.validateRefreshTokenSession(
      'u1',
      'device-1',
      'refresh-token',
    );

    expect(cacheService.get).toHaveBeenCalledWith(
      `blacklist:refresh:${service.hashRefreshToken('refresh-token')}`,
    );
    expect(sessionStatusService.getIdByCode).toHaveBeenCalledWith(
      SESSION_STATUS_CODES.ACTIVE,
    );
    expect(userSessionRepository.updateLastActivity).toHaveBeenCalledWith(
      's1',
      expect.any(Date),
    );
  });

  it('mantiene rechazo por dispositivo no autorizado', async () => {
    const session = buildSession({ deviceId: 'device-a' });
    userSessionRepository.findByIdWithUser.mockResolvedValue(session as never);

    await expect(
      service.validateSession('s1', 'u1', 'device-b'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(userSessionRepository.updateLastActivity).not.toHaveBeenCalled();
  });
});

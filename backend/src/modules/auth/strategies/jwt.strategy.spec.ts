import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from '@modules/auth/strategies/jwt.strategy';
import { SessionValidatorService } from '@modules/auth/application/session-validator.service';
import { JwtPayload } from '@modules/auth/interfaces/jwt-payload.interface';
import { PhotoSource, User } from '@modules/users/domain/user.entity';
import { ROLE_CODES } from '@common/constants/role-codes.constants';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const configServiceMock = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') {
        return 'unit-test-secret';
      }
      return undefined;
    }),
  };

  const sessionValidatorServiceMock = {
    validateSession: jest.fn(),
  };

  const payload: JwtPayload = {
    sub: '10',
    email: 'user@test.com',
    roles: [ROLE_CODES.STUDENT],
    activeRole: ROLE_CODES.STUDENT,
    sessionId: '777',
    deviceId: 'device-1',
  };

  const buildUser = (overrides?: Partial<User>): User => {
    return {
      id: '10',
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
      ...overrides,
    };
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: configServiceMock },
        {
          provide: SessionValidatorService,
          useValue: sessionValidatorServiceMock,
        },
      ],
    }).compile();

    strategy = moduleRef.get(JwtStrategy);
  });

  it('devuelve siempre el usuario fresco validado en BD', async () => {
    const activeUser = buildUser();
    sessionValidatorServiceMock.validateSession.mockResolvedValue({
      user: activeUser,
    });

    const result = await strategy.validate(payload);

    expect(sessionValidatorServiceMock.validateSession).toHaveBeenCalledWith(
      payload.sessionId,
      payload.sub,
      payload.deviceId,
    );
    expect(result).toBe(activeUser);
    expect(result.sessionId).toBe(payload.sessionId);
    expect(result.activeRole).toBe(payload.activeRole);
    expect(result.deviceId).toBe(payload.deviceId);
  });

  it('bloquea inmediatamente cuando el usuario esta inactivo', async () => {
    const inactiveUser = buildUser({ isActive: false });
    sessionValidatorServiceMock.validateSession.mockResolvedValue({
      user: inactiveUser,
    });

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('retorna usuario activo con contexto de sesion', async () => {
    const activeUser = buildUser();
    sessionValidatorServiceMock.validateSession.mockResolvedValue({
      user: activeUser,
    });

    const result = await strategy.validate(payload);

    expect(result.id).toBe(activeUser.id);
    expect(result.sessionId).toBe(payload.sessionId);
    expect(result.activeRole).toBe(payload.activeRole);
    expect(result.deviceId).toBe(payload.deviceId);
  });

  it('si la sesion no tiene usuario asociado, deniega el acceso', async () => {
    sessionValidatorServiceMock.validateSession.mockResolvedValue({
      user: null,
    });

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

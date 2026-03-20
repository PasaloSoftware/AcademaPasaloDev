import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { SessionConflictService } from '@modules/auth/application/session-conflict.service';
import { UserSessionRepository } from '@modules/auth/infrastructure/user-session.repository';
import { SecurityEventService } from '@modules/auth/application/security-event.service';
import { SessionStatusService } from '@modules/auth/application/session-status.service';
import {
  CONCURRENT_DECISIONS,
  SECURITY_EVENT_CODES,
  SESSION_STATUS_CODES,
} from '@modules/auth/interfaces/security.constants';

describe('SessionConflictService', () => {
  let service: SessionConflictService;

  const userSessionRepositoryMock = {
    findByRefreshTokenJtiForUpdate: jest.fn(),
    findOtherActiveSession: jest.fn(),
    findByIdForUpdate: jest.fn(),
    update: jest.fn(),
    findSessionsByUserAndStatus: jest.fn(),
    deactivateSessionsByIds: jest.fn(),
  };

  const securityEventServiceMock = {
    logEvent: jest.fn(),
  };

  const sessionStatusServiceMock = {
    getIdByCode: jest.fn(),
  };

  const dataSourceMock = {
    transaction: jest.fn((cb: (manager: unknown) => Promise<unknown>) =>
      cb({}),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        SessionConflictService,
        { provide: DataSource, useValue: dataSourceMock },
        {
          provide: UserSessionRepository,
          useValue: userSessionRepositoryMock,
        },
        {
          provide: SecurityEventService,
          useValue: securityEventServiceMock,
        },
        {
          provide: SessionStatusService,
          useValue: sessionStatusServiceMock,
        },
      ],
    }).compile();

    service = moduleRef.get(SessionConflictService);
  });

  it('registra outcome y estados finales al conservar la sesion existente', async () => {
    sessionStatusServiceMock.getIdByCode.mockImplementation((code: string) => {
      if (code === SESSION_STATUS_CODES.ACTIVE) return 'active-id';
      if (code === SESSION_STATUS_CODES.PENDING_CONCURRENT_RESOLUTION)
        return 'pending-id';
      if (code === SESSION_STATUS_CODES.REVOKED) return 'revoked-id';
      return null;
    });
    userSessionRepositoryMock.findByRefreshTokenJtiForUpdate.mockResolvedValue({
      id: 'new-session',
      userId: 'user-1',
      deviceId: 'device-1',
      sessionStatusId: 'pending-id',
    });
    userSessionRepositoryMock.findOtherActiveSession.mockResolvedValue({
      id: 'existing-session',
    });
    userSessionRepositoryMock.findByIdForUpdate.mockResolvedValue({
      id: 'existing-session',
    });
    userSessionRepositoryMock.update.mockResolvedValue(undefined);
    securityEventServiceMock.logEvent.mockResolvedValue(undefined);

    const result = await service.resolveConcurrentSession({
      userId: 'user-1',
      deviceId: 'device-1',
      refreshTokenJti: 'jti-1',
      decision: CONCURRENT_DECISIONS.KEEP_EXISTING,
      ipAddress: '127.0.0.1',
      userAgent: 'jest-agent',
    });

    expect(result.keptSessionId).toBeNull();
    expect(securityEventServiceMock.logEvent).toHaveBeenCalledWith(
      'user-1',
      SECURITY_EVENT_CODES.CONCURRENT_SESSION_RESOLVED,
      expect.objectContaining({
        decision: CONCURRENT_DECISIONS.KEEP_EXISTING,
        outcome: 'NEW_SESSION_REVOKED',
        newSessionId: 'new-session',
        newSessionStatus: SESSION_STATUS_CODES.REVOKED,
        existingSessionId: 'existing-session',
        existingSessionStatus: SESSION_STATUS_CODES.ACTIVE,
      }),
      expect.anything(),
    );
  });
});

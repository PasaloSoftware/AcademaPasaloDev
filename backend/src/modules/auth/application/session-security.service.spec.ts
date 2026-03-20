import { Test } from '@nestjs/testing';
import { SessionSecurityService } from '@modules/auth/application/session-security.service';
import { SecurityEventService } from '@modules/auth/application/security-event.service';
import {
  LOCATION_SOURCES,
  SECURITY_EVENT_CODES,
} from '@modules/auth/interfaces/security.constants';
import { RequestMetadata } from '@modules/auth/interfaces/request-metadata.interface';

describe('SessionSecurityService', () => {
  let service: SessionSecurityService;

  const securityEventServiceMock = {
    logEvent: jest.fn(),
    countEventsByCode: jest.fn(),
  };

  const metadata: RequestMetadata = {
    ipAddress: '127.0.0.1',
    userAgent: 'jest-agent',
    deviceId: 'device-1',
    city: 'Lima',
    country: 'PE',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        SessionSecurityService,
        {
          provide: SecurityEventService,
          useValue: securityEventServiceMock,
        },
      ],
    }).compile();

    service = moduleRef.get(SessionSecurityService);
  });

  it('incluye metadata de ubicacion en LOGIN_SUCCESS', async () => {
    securityEventServiceMock.logEvent.mockResolvedValue(undefined);

    await service.logSessionCreationEvents({
      userId: 'user-1',
      metadata,
      session: { id: 'session-1', deviceId: metadata.deviceId } as never,
      locationSource: LOCATION_SOURCES.IP,
      isNewDevice: false,
      activeRoleCode: 'ADMIN',
      sessionStatus: 'ACTIVE',
      anomaly: {
        isAnomalous: false,
        anomalyType: null,
        previousSessionId: null,
        distanceKm: null,
        timeDifferenceMinutes: null,
      },
      isConcurrent: false,
      existingSession: null,
      manager: {} as never,
    });

    expect(securityEventServiceMock.logEvent).toHaveBeenCalledWith(
      'user-1',
      SECURITY_EVENT_CODES.LOGIN_SUCCESS,
      {
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        deviceId: metadata.deviceId,
        activeRoleCode: 'ADMIN',
        sessionStatus: 'ACTIVE',
        locationSource: LOCATION_SOURCES.IP,
        city: metadata.city,
        country: metadata.country,
        sessionId: 'session-1',
      },
      expect.anything(),
    );
  });
});

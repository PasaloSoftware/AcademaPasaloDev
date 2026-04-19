import { Test, TestingModule } from '@nestjs/testing';
import { AuthSettingsService } from './auth-settings.service';
import { SettingsService } from '@modules/settings/application/settings.service';
import { SystemSettingRepository } from '@modules/settings/infrastructure/system-setting.repository';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

describe('AuthSettingsService', () => {
  let service: AuthSettingsService;
  let settingsService: jest.Mocked<SettingsService>;
  let settingRepo: jest.Mocked<Pick<SystemSettingRepository, 'updateByKey'>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthSettingsService,
        {
          provide: SettingsService,
          useValue: {
            getString: jest.fn(),
            getPositiveInt: jest.fn(),
            invalidateCache: jest.fn(),
            invalidateAllCache: jest.fn(),
          },
        },
        {
          provide: SystemSettingRepository,
          useValue: {
            updateByKey: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthSettingsService>(AuthSettingsService);
    settingsService = module.get(SettingsService);
    settingRepo = module.get(SystemSettingRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // getActiveCycleId
  // ─────────────────────────────────────────────
  describe('getActiveCycleId', () => {
    it('retorna el ID del ciclo activo cuando el setting tiene valor', async () => {
      settingsService.getString.mockResolvedValue('42');

      const result = await service.getActiveCycleId();

      expect(result).toBe('42');
      expect(settingsService.getString).toHaveBeenCalledWith('ACTIVE_CYCLE_ID');
    });

    it('propaga el error si getString lanza', async () => {
      settingsService.getString.mockRejectedValue(
        new InternalServerErrorException('Configuración del sistema incompleta'),
      );

      await expect(service.getActiveCycleId()).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('lanza NotFoundException si ACTIVE_CYCLE_ID está vacío', async () => {
      settingsService.getString.mockResolvedValue('');

      await expect(service.getActiveCycleId()).rejects.toThrow(NotFoundException);
    });

    it('el mensaje de NotFoundException indica que no hay ciclo activo', async () => {
      settingsService.getString.mockResolvedValue('');

      await expect(service.getActiveCycleId()).rejects.toThrow(
        'No hay ciclo académico activo configurado.',
      );
    });
  });

  // ─────────────────────────────────────────────
  // clearActiveCycleId
  // ─────────────────────────────────────────────
  describe('clearActiveCycleId', () => {
    it('llama a updateByKey con ACTIVE_CYCLE_ID vacío', async () => {
      settingRepo.updateByKey.mockResolvedValue({
        settingKey: 'ACTIVE_CYCLE_ID',
        settingValue: '',
      } as never);
      settingsService.invalidateCache.mockResolvedValue(undefined);

      await service.clearActiveCycleId();

      expect(settingRepo.updateByKey).toHaveBeenCalledWith('ACTIVE_CYCLE_ID', '');
    });

    it('invalida el caché después de actualizar la BD', async () => {
      settingRepo.updateByKey.mockResolvedValue({
        settingKey: 'ACTIVE_CYCLE_ID',
        settingValue: '',
      } as never);
      settingsService.invalidateCache.mockResolvedValue(undefined);

      await service.clearActiveCycleId();

      expect(settingsService.invalidateCache).toHaveBeenCalledWith(
        'ACTIVE_CYCLE_ID',
      );
    });

    it('invalida el caché estrictamente después de actualizar la BD', async () => {
      const callOrder: string[] = [];
      settingRepo.updateByKey.mockImplementation(() => {
        callOrder.push('updateByKey');
        return Promise.resolve({ settingKey: 'ACTIVE_CYCLE_ID', settingValue: '' } as never);
      });
      settingsService.invalidateCache.mockImplementation(() => {
        callOrder.push('invalidateCache');
        return Promise.resolve();
      });

      await service.clearActiveCycleId();

      expect(callOrder).toEqual(['updateByKey', 'invalidateCache']);
    });

    it('lanza InternalServerErrorException si la clave no existe en BD', async () => {
      settingRepo.updateByKey.mockResolvedValue(null);

      await expect(service.clearActiveCycleId()).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('no invalida caché si updateByKey retorna null', async () => {
      settingRepo.updateByKey.mockResolvedValue(null);

      await expect(service.clearActiveCycleId()).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(settingsService.invalidateCache).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // getRefreshTokenTtlDays
  // ─────────────────────────────────────────────
  describe('getRefreshTokenTtlDays', () => {
    it('retorna el TTL de refresh token en días desde technicalSettings', async () => {
      const result = await service.getRefreshTokenTtlDays();

      expect(result).toBe(7);
      expect(settingsService.getPositiveInt).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // getAccessTokenTtlMinutes
  // ─────────────────────────────────────────────
  describe('getAccessTokenTtlMinutes', () => {
    it('retorna el TTL de access token en minutos desde technicalSettings', async () => {
      const result = await service.getAccessTokenTtlMinutes();

      expect(result).toBe(180);
      expect(settingsService.getPositiveInt).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // getSessionExpirationWarningMinutes
  // ─────────────────────────────────────────────
  describe('getSessionExpirationWarningMinutes', () => {
    it('retorna los minutos de advertencia de expiración desde technicalSettings', async () => {
      const result = await service.getSessionExpirationWarningMinutes();

      expect(result).toBe(10);
      expect(settingsService.getPositiveInt).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // getGeoGpsTimeWindowMinutes
  // ─────────────────────────────────────────────
  describe('getGeoGpsTimeWindowMinutes', () => {
    it('retorna la ventana de tiempo GPS desde el setting', async () => {
      settingsService.getPositiveInt.mockResolvedValue(10);

      const result = await service.getGeoGpsTimeWindowMinutes();

      expect(result).toBe(10);
      expect(settingsService.getPositiveInt).toHaveBeenCalledWith(
        'GEO_GPS_ANOMALY_TIME_WINDOW_MINUTES',
      );
    });
  });

  // ─────────────────────────────────────────────
  // getGeoGpsDistanceKm
  // ─────────────────────────────────────────────
  describe('getGeoGpsDistanceKm', () => {
    it('retorna la distancia umbral GPS desde el setting', async () => {
      settingsService.getPositiveInt.mockResolvedValue(5);

      const result = await service.getGeoGpsDistanceKm();

      expect(result).toBe(5);
      expect(settingsService.getPositiveInt).toHaveBeenCalledWith(
        'GEO_GPS_ANOMALY_DISTANCE_KM',
      );
    });
  });

  // ─────────────────────────────────────────────
  // getGeoIpTimeWindowMinutes
  // ─────────────────────────────────────────────
  describe('getGeoIpTimeWindowMinutes', () => {
    it('retorna la ventana de tiempo IP desde el setting', async () => {
      settingsService.getPositiveInt.mockResolvedValue(30);

      const result = await service.getGeoIpTimeWindowMinutes();

      expect(result).toBe(30);
      expect(settingsService.getPositiveInt).toHaveBeenCalledWith(
        'GEO_IP_ANOMALY_TIME_WINDOW_MINUTES',
      );
    });
  });

  // ─────────────────────────────────────────────
  // getGeoIpDistanceKm
  // ─────────────────────────────────────────────
  describe('getGeoIpDistanceKm', () => {
    it('retorna la distancia umbral IP desde el setting', async () => {
      settingsService.getPositiveInt.mockResolvedValue(100);

      const result = await service.getGeoIpDistanceKm();

      expect(result).toBe(100);
      expect(settingsService.getPositiveInt).toHaveBeenCalledWith(
        'GEO_IP_ANOMALY_DISTANCE_KM',
      );
    });
  });

  // ─────────────────────────────────────────────
  // invalidateCache
  // ─────────────────────────────────────────────
  describe('invalidateCache', () => {
    it('invalida un setting específico via SettingsService', () => {
      service.invalidateCache('ACTIVE_CYCLE_ID');

      expect(settingsService.invalidateCache).toHaveBeenCalledWith(
        'ACTIVE_CYCLE_ID',
      );
    });
  });

  // ─────────────────────────────────────────────
  // invalidateAllCache
  // ─────────────────────────────────────────────
  describe('invalidateAllCache', () => {
    it('invalida todo el caché via SettingsService', () => {
      service.invalidateAllCache();

      expect(settingsService.invalidateAllCache).toHaveBeenCalled();
    });
  });
});

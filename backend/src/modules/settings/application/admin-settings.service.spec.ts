import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { AdminSettingsService } from './admin-settings.service';
import { CyclesService } from '@modules/cycles/application/cycles.service';
import { SettingsService } from '@modules/settings/application/settings.service';
import { SystemSettingRepository } from '@modules/settings/infrastructure/system-setting.repository';
import { AcademicCycle } from '@modules/cycles/domain/academic-cycle.entity';

const mockCyclesService = {
  getActiveCycle: jest.fn(),
};

const mockSettingsService = {
  getPositiveInt: jest.fn(),
  invalidateCache: jest.fn(),
};

const mockSettingRepo = {
  updateByKey: jest.fn(),
};

const makeCycle = (startDate: Date, endDate: Date): AcademicCycle =>
  ({
    id: '10',
    code: 'CYCLE_2024_1',
    startDate,
    endDate,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as AcademicCycle;

const NOW = Date.now();
const cycleInProgress = makeCycle(
  new Date(NOW - 86400000 * 30),
  new Date(NOW + 86400000 * 30),
);

describe('AdminSettingsService', () => {
  let service: AdminSettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminSettingsService,
        { provide: CyclesService, useValue: mockCyclesService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: SystemSettingRepository, useValue: mockSettingRepo },
      ],
    }).compile();

    service = module.get<AdminSettingsService>(AdminSettingsService);
  });

  afterEach(() => jest.clearAllMocks());

  const setupSettingsMocks = (gpsTime = 30, gpsDistance = 10, logDays = 30) => {
    mockSettingsService.getPositiveInt
      .mockResolvedValueOnce(gpsTime)
      .mockResolvedValueOnce(gpsDistance)
      .mockResolvedValueOnce(logDays);
  };

  describe('getBundle', () => {
    it('devuelve bundle completo con ciclo y umbrales cuando todo está configurado', async () => {
      setupSettingsMocks(30, 10, 30);
      mockCyclesService.getActiveCycle.mockResolvedValue(cycleInProgress);

      const result = await service.getBundle();

      expect(result.geoGpsThresholds).toEqual({ timeWindowMinutes: 30, distanceKm: 10 });
      expect(result.logRetention).toEqual({ days: 30 });
      expect(result.currentCycle).not.toBeNull();
      expect(result.currentCycle!.id).toBe('10');
      expect(result.currentCycle!.code).toBe('CYCLE_2024_1');
    });

    it('fetchea settings en paralelo (3 llamadas a getPositiveInt)', async () => {
      setupSettingsMocks();
      mockCyclesService.getActiveCycle.mockResolvedValue(cycleInProgress);

      await service.getBundle();

      expect(mockSettingsService.getPositiveInt).toHaveBeenCalledTimes(3);
      expect(mockSettingsService.getPositiveInt).toHaveBeenCalledWith(
        'GEO_GPS_ANOMALY_TIME_WINDOW_MINUTES',
      );
      expect(mockSettingsService.getPositiveInt).toHaveBeenCalledWith(
        'GEO_GPS_ANOMALY_DISTANCE_KM',
      );
      expect(mockSettingsService.getPositiveInt).toHaveBeenCalledWith(
        'AUDIT_CLEANUP_RETENTION_DAYS',
      );
    });

    it('progressPercent está entre 0 y 100 cuando now está dentro del ciclo', async () => {
      setupSettingsMocks();
      mockCyclesService.getActiveCycle.mockResolvedValue(cycleInProgress);

      const result = await service.getBundle();

      expect(result.currentCycle!.progressPercent).toBeGreaterThan(0);
      expect(result.currentCycle!.progressPercent).toBeLessThan(100);
    });

    it('progressPercent es 0 cuando el ciclo aún no ha iniciado', async () => {
      setupSettingsMocks();
      const future = new Date(NOW + 86400000 * 10);
      const farFuture = new Date(NOW + 86400000 * 40);
      mockCyclesService.getActiveCycle.mockResolvedValue(makeCycle(future, farFuture));

      const result = await service.getBundle();

      expect(result.currentCycle!.progressPercent).toBe(0);
    });

    it('progressPercent es 100 cuando el ciclo ya terminó', async () => {
      setupSettingsMocks();
      const past = new Date(NOW - 86400000 * 40);
      const lessPast = new Date(NOW - 86400000 * 2);
      mockCyclesService.getActiveCycle.mockResolvedValue(makeCycle(past, lessPast));

      const result = await service.getBundle();

      expect(result.currentCycle!.progressPercent).toBe(100);
    });

    it('progressPercent es 0 cuando start === end y es un día futuro (ciclo de 1 día aún no iniciado)', async () => {
      setupSettingsMocks();
      const futureDay = new Date(NOW + 86400000 * 5);
      mockCyclesService.getActiveCycle.mockResolvedValue(makeCycle(futureDay, futureDay));

      const result = await service.getBundle();

      expect(result.currentCycle!.progressPercent).toBe(0);
    });

    it('progressPercent es 0 cuando endDate < startDate', async () => {
      setupSettingsMocks();
      const later = new Date(NOW);
      const earlier = new Date(NOW - 86400000 * 5);
      mockCyclesService.getActiveCycle.mockResolvedValue(makeCycle(later, earlier));

      const result = await service.getBundle();

      expect(result.currentCycle!.progressPercent).toBe(0);
    });

    it('progressPercent tiene máximo 2 decimales', async () => {
      setupSettingsMocks();
      mockCyclesService.getActiveCycle.mockResolvedValue(cycleInProgress);

      const result = await service.getBundle();

      const str = String(result.currentCycle!.progressPercent);
      const decimals = str.includes('.') ? str.split('.')[1].length : 0;
      expect(decimals).toBeLessThanOrEqual(2);
    });

    it('currentCycle es null si getActiveCycle lanza error; settings siguen devolviéndose', async () => {
      setupSettingsMocks(20, 15, 60);
      mockCyclesService.getActiveCycle.mockRejectedValue(new Error('Sin ciclo'));

      const result = await service.getBundle();

      expect(result.currentCycle).toBeNull();
      expect(result.geoGpsThresholds).toEqual({ timeWindowMinutes: 20, distanceKm: 15 });
      expect(result.logRetention).toEqual({ days: 60 });
    });
  });

  describe('updateBundle', () => {
    beforeEach(() => {
      mockSettingRepo.updateByKey.mockResolvedValue({ settingKey: 'k', settingValue: 'v' });
      mockSettingsService.invalidateCache.mockResolvedValue(undefined);
      setupSettingsMocks();
      mockCyclesService.getActiveCycle.mockResolvedValue(cycleInProgress);
    });

    it('actualiza solo timeWindowMinutes y no toca otras claves', async () => {
      await service.updateBundle('admin-1', {
        geoGpsThresholds: { timeWindowMinutes: 45 },
      });

      expect(mockSettingRepo.updateByKey).toHaveBeenCalledTimes(1);
      expect(mockSettingRepo.updateByKey).toHaveBeenCalledWith(
        'GEO_GPS_ANOMALY_TIME_WINDOW_MINUTES',
        '45',
      );
      expect(mockSettingsService.invalidateCache).toHaveBeenCalledWith(
        'GEO_GPS_ANOMALY_TIME_WINDOW_MINUTES',
      );
    });

    it('actualiza solo distanceKm y no toca otras claves', async () => {
      await service.updateBundle('admin-1', {
        geoGpsThresholds: { distanceKm: 20 },
      });

      expect(mockSettingRepo.updateByKey).toHaveBeenCalledTimes(1);
      expect(mockSettingRepo.updateByKey).toHaveBeenCalledWith(
        'GEO_GPS_ANOMALY_DISTANCE_KM',
        '20',
      );
    });

    it('actualiza solo logRetention.days', async () => {
      await service.updateBundle('admin-1', { logRetention: { days: 90 } });

      expect(mockSettingRepo.updateByKey).toHaveBeenCalledTimes(1);
      expect(mockSettingRepo.updateByKey).toHaveBeenCalledWith(
        'AUDIT_CLEANUP_RETENTION_DAYS',
        '90',
      );
      expect(mockSettingsService.invalidateCache).toHaveBeenCalledWith(
        'AUDIT_CLEANUP_RETENTION_DAYS',
      );
    });

    it('actualiza los 3 campos cuando el body está completo', async () => {
      await service.updateBundle('admin-1', {
        geoGpsThresholds: { timeWindowMinutes: 20, distanceKm: 15 },
        logRetention: { days: 60 },
      });

      expect(mockSettingRepo.updateByKey).toHaveBeenCalledTimes(3);
      expect(mockSettingsService.invalidateCache).toHaveBeenCalledTimes(3);
    });

    it('no llama a updateByKey ni invalidateCache si el body está vacío', async () => {
      await service.updateBundle('admin-1', {});

      expect(mockSettingRepo.updateByKey).not.toHaveBeenCalled();
      expect(mockSettingsService.invalidateCache).not.toHaveBeenCalled();
    });

    it('guarda valores como string en updateByKey', async () => {
      await service.updateBundle('admin-1', {
        geoGpsThresholds: { timeWindowMinutes: 60 },
      });

      const [, valueArg] = mockSettingRepo.updateByKey.mock.calls[0] as [string, string];
      expect(typeof valueArg).toBe('string');
      expect(valueArg).toBe('60');
    });

    it('devuelve bundle actualizado con los nuevos valores reflejados', async () => {
      const result = await service.updateBundle('admin-1', {
        logRetention: { days: 90 },
      });

      expect(result).toHaveProperty('geoGpsThresholds');
      expect(result).toHaveProperty('logRetention');
      expect(result).toHaveProperty('currentCycle');
    });

    it('lanza InternalServerErrorException si updateByKey devuelve null (clave ausente en BD)', async () => {
      mockSettingRepo.updateByKey.mockResolvedValue(null);

      await expect(
        service.updateBundle('admin-1', {
          geoGpsThresholds: { timeWindowMinutes: 30 },
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('no invalida caché si updateByKey falla (clave ausente)', async () => {
      mockSettingRepo.updateByKey.mockResolvedValue(null);

      await expect(
        service.updateBundle('admin-1', {
          geoGpsThresholds: { distanceKm: 15 },
        }),
      ).rejects.toThrow(InternalServerErrorException);

      expect(mockSettingsService.invalidateCache).not.toHaveBeenCalled();
    });
  });
});

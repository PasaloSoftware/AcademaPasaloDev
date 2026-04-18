import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CyclesService } from '@modules/cycles/application/cycles.service';
import { SettingsService } from '@modules/settings/application/settings.service';
import { SystemSettingRepository } from '@modules/settings/infrastructure/system-setting.repository';
import {
  AdminSettingsResponseDto,
  CurrentCycleDto,
  UpdateAdminSettingsDto,
} from '@modules/settings/dto/admin-settings.dto';

const GPS_TIME_KEY = 'GEO_GPS_ANOMALY_TIME_WINDOW_MINUTES';
const GPS_DISTANCE_KEY = 'GEO_GPS_ANOMALY_DISTANCE_KM';
const LOG_RETENTION_KEY = 'AUDIT_CLEANUP_RETENTION_DAYS';

@Injectable()
export class AdminSettingsService {
  private readonly logger = new Logger(AdminSettingsService.name);

  constructor(
    private readonly cyclesService: CyclesService,
    private readonly settingsService: SettingsService,
    private readonly settingRepo: SystemSettingRepository,
  ) {}

  async getBundle(): Promise<AdminSettingsResponseDto> {
    const [gpsTime, gpsDistance, logDays] = await Promise.all([
      this.settingsService.getPositiveInt(GPS_TIME_KEY),
      this.settingsService.getPositiveInt(GPS_DISTANCE_KEY),
      this.settingsService.getPositiveInt(LOG_RETENTION_KEY),
    ]);

    let currentCycle: CurrentCycleDto | null = null;
    try {
      const cycle = await this.cyclesService.getActiveCycle();
      currentCycle = {
        id: cycle.id,
        code: cycle.code,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        progressPercent: this.calcProgress(cycle.startDate, cycle.endDate),
      };
    } catch {
      this.logger.warn({
        message:
          'No se pudo obtener el ciclo vigente para el bundle de settings',
      });
    }

    return {
      currentCycle,
      geoGpsThresholds: { timeWindowMinutes: gpsTime, distanceKm: gpsDistance },
      logRetention: { days: logDays },
    };
  }

  async updateBundle(
    adminId: string,
    dto: UpdateAdminSettingsDto,
  ): Promise<AdminSettingsResponseDto> {
    const keysUpdated: string[] = [];

    if (dto.geoGpsThresholds?.timeWindowMinutes !== undefined) {
      await this.persistSetting(
        GPS_TIME_KEY,
        String(dto.geoGpsThresholds.timeWindowMinutes),
        adminId,
      );
      keysUpdated.push(GPS_TIME_KEY);
    }

    if (dto.geoGpsThresholds?.distanceKm !== undefined) {
      await this.persistSetting(
        GPS_DISTANCE_KEY,
        String(dto.geoGpsThresholds.distanceKm),
        adminId,
      );
      keysUpdated.push(GPS_DISTANCE_KEY);
    }

    if (dto.logRetention?.days !== undefined) {
      await this.persistSetting(
        LOG_RETENTION_KEY,
        String(dto.logRetention.days),
        adminId,
      );
      keysUpdated.push(LOG_RETENTION_KEY);
    }

    this.logger.log({
      message: 'Settings admin actualizados',
      adminId,
      keysUpdated,
    });

    return this.getBundle();
  }

  private async persistSetting(
    key: string,
    value: string,
    adminId: string,
  ): Promise<void> {
    const updated = await this.settingRepo.updateByKey(key, value);
    if (!updated) {
      this.logger.error({
        message: 'Clave de configuración no encontrada en BD',
        key,
        adminId,
      });
      throw new InternalServerErrorException(
        'Error de configuración del sistema: clave no encontrada.',
      );
    }
    await this.settingsService.invalidateCache(key);
  }

  private calcProgress(start: Date, end: Date): number {
    const startMs = new Date(start).setHours(0, 0, 0, 0);
    const endMs = new Date(end).setHours(23, 59, 59, 999);
    const nowMs = Date.now();

    if (endMs <= startMs) return 0;
    if (nowMs <= startMs) return 0;
    if (nowMs >= endMs) return 100;

    return parseFloat(
      (((nowMs - startMs) / (endMs - startMs)) * 100).toFixed(2),
    );
  }
}

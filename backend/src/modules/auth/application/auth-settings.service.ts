import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SettingsService } from '@modules/settings/application/settings.service';
import { SystemSettingRepository } from '@modules/settings/infrastructure/system-setting.repository';
import { technicalSettings } from '@config/technical-settings';

@Injectable()
export class AuthSettingsService {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly settingRepo: SystemSettingRepository,
  ) {}

  async getActiveCycleId(): Promise<string> {
    const value = await this.settingsService.getString('ACTIVE_CYCLE_ID');
    if (!value) {
      throw new NotFoundException('No hay ciclo académico activo configurado.');
    }
    return value;
  }

  async clearActiveCycleId(): Promise<void> {
    const updated = await this.settingRepo.updateByKey('ACTIVE_CYCLE_ID', '');
    if (!updated) {
      throw new InternalServerErrorException(
        'No se pudo limpiar ACTIVE_CYCLE_ID: clave no encontrada en la configuración.',
      );
    }
    await this.settingsService.invalidateCache('ACTIVE_CYCLE_ID');
  }

  getRefreshTokenTtlDays(): Promise<number> {
    return Promise.resolve(technicalSettings.auth.tokens.refreshTokenTtlDays);
  }

  getAccessTokenTtlMinutes(): Promise<number> {
    return Promise.resolve(technicalSettings.auth.tokens.accessTokenTtlMinutes);
  }

  getSessionExpirationWarningMinutes(): Promise<number> {
    return Promise.resolve(
      technicalSettings.auth.tokens.sessionExpirationWarningMinutes,
    );
  }

  async getGeoGpsTimeWindowMinutes(): Promise<number> {
    return await this.settingsService.getPositiveInt(
      'GEO_GPS_ANOMALY_TIME_WINDOW_MINUTES',
    );
  }

  async getGeoGpsDistanceKm(): Promise<number> {
    return await this.settingsService.getPositiveInt(
      'GEO_GPS_ANOMALY_DISTANCE_KM',
    );
  }

  async getGeoIpTimeWindowMinutes(): Promise<number> {
    return await this.settingsService.getPositiveInt(
      'GEO_IP_ANOMALY_TIME_WINDOW_MINUTES',
    );
  }

  async getGeoIpDistanceKm(): Promise<number> {
    return await this.settingsService.getPositiveInt(
      'GEO_IP_ANOMALY_DISTANCE_KM',
    );
  }

  invalidateCache(key: string) {
    return this.settingsService.invalidateCache(key);
  }

  invalidateAllCache() {
    return this.settingsService.invalidateAllCache();
  }
}

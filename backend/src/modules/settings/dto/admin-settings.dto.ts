import { Type } from 'class-transformer';
import {
  IsInt,
  IsObject,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdateGeoGpsThresholdsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  timeWindowMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  distanceKm?: number;
}

export class UpdateLogRetentionDto {
  @IsOptional()
  @IsInt()
  @Min(7)
  @Max(730)
  days?: number;
}

export class UpdateAdminSettingsDto {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateGeoGpsThresholdsDto)
  geoGpsThresholds?: UpdateGeoGpsThresholdsDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateLogRetentionDto)
  logRetention?: UpdateLogRetentionDto;
}

export class CurrentCycleDto {
  id: string;
  code: string;
  startDate: Date;
  endDate: Date;
  progressPercent: number;
}

export class GeoGpsThresholdsDto {
  timeWindowMinutes: number;
  distanceKm: number;
}

export class LogRetentionDto {
  days: number;
}

export class AdminSettingsResponseDto {
  currentCycle: CurrentCycleDto | null;
  geoGpsThresholds: GeoGpsThresholdsDto;
  logRetention: LogRetentionDto;
}

import { Expose, Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { AUDIT_SOURCES, type AuditSource } from '../interfaces/audit.constants';
import { ROLE_CODES } from '@common/constants/role-codes.constants';

export class AuditBaseQueryDto {
  @Expose()
  @IsOptional()
  @IsISO8601({}, { message: 'startDate debe ser una fecha ISO-8601 valida' })
  startDate?: string;

  @Expose()
  @IsOptional()
  @IsISO8601({}, { message: 'endDate debe ser una fecha ISO-8601 valida' })
  endDate?: string;

  @Expose()
  @IsOptional()
  @IsString()
  userId?: string;

  @Expose()
  @IsOptional()
  @IsEnum(AUDIT_SOURCES, {
    message: `source debe ser uno de: ${Object.values(AUDIT_SOURCES).join(', ')}`,
  })
  source?: AuditSource;

  @Expose()
  @IsOptional()
  @IsString()
  actionCode?: string;
}

export class AuditHistoryQueryDto extends AuditBaseQueryDto {
  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined) {
      return undefined;
    }
    if (typeof value !== 'string' && typeof value !== 'number') {
      return value;
    }
    const parsed = Number(String(value));
    return Number.isInteger(parsed) ? parsed : value;
  })
  @IsInt({ message: 'limit debe ser un entero' })
  @Min(1, { message: 'limit debe ser mayor o igual a 1' })
  @Max(100, { message: 'limit no puede ser mayor a 100' })
  limit?: number;
}

export class AuditExportQueryDto extends AuditBaseQueryDto {}

export class AuditPanelBaseQueryDto {
  @Expose()
  @IsOptional()
  @IsISO8601({}, { message: 'startDate debe ser una fecha ISO-8601 valida' })
  startDate?: string;

  @Expose()
  @IsOptional()
  @IsISO8601({}, { message: 'endDate debe ser una fecha ISO-8601 valida' })
  endDate?: string;

  @Expose()
  @IsOptional()
  @IsEnum(AUDIT_SOURCES, {
    message: `source debe ser uno de: ${Object.values(AUDIT_SOURCES).join(', ')}`,
  })
  source?: AuditSource;

  @Expose()
  @IsOptional()
  @IsEnum(ROLE_CODES, {
    message: `roleCode debe ser uno de: ${Object.values(ROLE_CODES).join(', ')}`,
  })
  roleCode?: string;

  @Expose()
  @IsOptional()
  @IsString({ message: 'userSearch debe ser un texto' })
  userSearch?: string;
}

export class AuditPanelQueryDto extends AuditPanelBaseQueryDto {
  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined) {
      return undefined;
    }
    if (typeof value !== 'string' && typeof value !== 'number') {
      return value;
    }
    const parsed = Number(String(value));
    return Number.isInteger(parsed) ? parsed : value;
  })
  @IsInt({ message: 'page debe ser un entero' })
  @Min(1, { message: 'page debe ser mayor o igual a 1' })
  page?: number;
}

export class AuditPanelExportQueryDto extends AuditPanelBaseQueryDto {}

export class AuditSecurityExportQueryDto {
  @Expose()
  @IsOptional()
  @IsISO8601({}, { message: 'startDate debe ser una fecha ISO-8601 valida' })
  startDate?: string;

  @Expose()
  @IsOptional()
  @IsISO8601({}, { message: 'endDate debe ser una fecha ISO-8601 valida' })
  endDate?: string;

  @Expose()
  @IsOptional()
  @IsEnum(ROLE_CODES, {
    message: `roleCode debe ser uno de: ${Object.values(ROLE_CODES).join(', ')}`,
  })
  roleCode?: string;

  @Expose()
  @IsOptional()
  @IsString({ message: 'userSearch debe ser un texto' })
  userSearch?: string;
}

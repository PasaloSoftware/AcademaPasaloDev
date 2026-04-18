import { Expose, Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class GlobalSessionsByFiltersQueryDto {
  @Expose()
  @IsDateString()
  @MaxLength(40)
  startDate: string;

  @Expose()
  @IsDateString()
  @MaxLength(40)
  endDate: string;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    const normalized = String(value).trim();
    if (!normalized || normalized.toUpperCase() === 'ALL') return undefined;
    return normalized;
  })
  @IsString()
  @MaxLength(20)
  academicCycleId?: string;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    const normalized = String(value).trim().toUpperCase();
    if (!normalized || normalized === 'ALL') return undefined;
    return normalized;
  })
  @IsString()
  @IsIn(['CIENCIAS', 'LETRAS', 'FACULTAD'])
  courseTypeCode?: string;

  @Expose()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (Array.isArray(value)) {
      const normalized = value
        .map((item) => String(item).trim())
        .filter((item) => item.length > 0);
      return normalized.length > 0 ? normalized : undefined;
    }
    const normalized = String(value)
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    return normalized.length > 0 ? normalized : undefined;
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  courseIds?: string[];
}

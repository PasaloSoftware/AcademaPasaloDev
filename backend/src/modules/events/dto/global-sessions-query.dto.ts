import { Expose, Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class GlobalSessionsQueryDto {
  @Expose()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (Array.isArray(value)) {
      const filtered = value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      return filtered.length > 0 ? filtered : undefined;
    }
    if (typeof value !== 'string') return undefined;
    const split = value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    return split.length > 0 ? split : undefined;
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  courseCycleIds?: string[];

  @Expose()
  @IsOptional()
  @IsString()
  @IsIn(['CIENCIAS', 'LETRAS', 'FACULTAD'])
  courseTypeCode?: string;

  @Expose()
  @IsOptional()
  @IsNumberString({ no_symbols: true })
  @MaxLength(2)
  cycleLevelId?: string;

  @Expose()
  @IsDateString()
  @MaxLength(40)
  startDate: string;

  @Expose()
  @IsDateString()
  @MaxLength(40)
  endDate: string;
}

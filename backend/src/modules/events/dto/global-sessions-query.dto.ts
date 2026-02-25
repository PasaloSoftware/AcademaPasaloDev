import { Expose, Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsString,
  MaxLength,
} from 'class-validator';

export class GlobalSessionsQueryDto {
  @Expose()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
    if (typeof value !== 'string') {
      return [];
    }
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  courseCycleIds: string[];

  @Expose()
  @IsDateString()
  @MaxLength(40)
  startDate: string;

  @Expose()
  @IsDateString()
  @MaxLength(40)
  endDate: string;
}

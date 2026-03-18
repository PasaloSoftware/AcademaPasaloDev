import {
  IsInt,
  IsMimeType,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

const trimStringIfNeeded = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return value.trim();
  }
  return value;
};

export class StartClassEventRecordingUploadDto {
  @Transform(({ value }) => trimStringIfNeeded(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @IsMimeType()
  mimeType: string;

  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024 * 1024)
  sizeBytes: number;
}

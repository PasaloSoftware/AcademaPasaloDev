import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const trimStringIfNeeded = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return value.trim();
  }
  return value;
};

export class HeartbeatClassEventRecordingUploadDto {
  @Transform(({ value }) => trimStringIfNeeded(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  uploadToken: string;
}

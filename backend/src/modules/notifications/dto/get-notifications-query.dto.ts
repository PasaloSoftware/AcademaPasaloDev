import { Expose, Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { technicalSettings } from '@config/technical-settings';

export class GetNotificationsQueryDto {
  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined) return undefined;
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'onlyUnread debe ser "true" o "false"' })
  onlyUnread?: boolean;

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
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = technicalSettings.notifications.defaultPageLimit;

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
  @IsInt()
  @Min(0)
  offset: number = 0;
}

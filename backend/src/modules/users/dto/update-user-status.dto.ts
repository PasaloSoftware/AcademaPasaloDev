import { IsBoolean, IsDefined } from 'class-validator';

export class UpdateUserStatusDto {
  @IsDefined()
  @IsBoolean()
  isActive: boolean;
}

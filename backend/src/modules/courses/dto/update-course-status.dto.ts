import { IsBoolean, IsDefined } from 'class-validator';

export class UpdateCourseStatusDto {
  @IsBoolean()
  @IsDefined()
  isActive: boolean;
}

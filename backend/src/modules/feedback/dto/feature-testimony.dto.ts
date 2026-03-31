import { IsNotEmpty, IsBoolean } from 'class-validator';

export class FeatureTestimonyDto {
  @IsNotEmpty()
  @IsBoolean()
  isActive: boolean;
}

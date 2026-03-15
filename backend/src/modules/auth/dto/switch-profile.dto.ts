import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SwitchProfileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  roleId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  deviceId: string;
}

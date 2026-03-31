import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateMaterialDisplayNameDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  displayName: string;
}

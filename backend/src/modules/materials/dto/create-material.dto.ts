import {
  IsDateString,
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
  IsDefined,
  IsNumberString,
} from 'class-validator';

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @MaxLength(20)
  materialFolderId: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @MaxLength(255)
  displayName: string;

  @IsDateString()
  @IsOptional()
  visibleFrom?: string;

  @IsDateString()
  @IsOptional()
  visibleUntil?: string;

  @IsOptional()
  @IsNumberString()
  classEventId?: string;
}

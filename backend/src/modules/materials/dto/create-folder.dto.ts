import {
  IsDateString,
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
  IsDefined,
} from 'class-validator';

export class CreateFolderDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @MaxLength(20)
  evaluationId: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  parentFolderId?: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @MaxLength(255)
  name: string;

  @IsDateString()
  @IsOptional()
  visibleFrom?: string;

  @IsDateString()
  @IsOptional()
  visibleUntil?: string;
}

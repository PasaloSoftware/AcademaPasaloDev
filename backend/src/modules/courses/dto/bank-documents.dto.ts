import { Expose } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  IsArray,
} from 'class-validator';

export class UploadBankDocumentDto {
  @Expose()
  @IsNotEmpty()
  @IsString()
  @MaxLength(32)
  evaluationTypeCode: string;

  @Expose()
  @IsNotEmpty()
  @IsNumberString()
  evaluationNumber: string;

  @Expose()
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  displayName: string;
}

export class UploadBankDocumentResponseDto {
  @Expose()
  courseCycleId: string;

  @Expose()
  bankEvaluationId: string;

  @Expose()
  evaluationId: string | null;

  @Expose()
  evaluationTypeId: string;

  @Expose()
  evaluationTypeCode: string;

  @Expose()
  evaluationTypeName: string;

  @Expose()
  evaluationNumber: number;

  @Expose()
  folderId: string;

  @Expose()
  folderName: string;

  @Expose()
  materialId: string;

  @Expose()
  fileResourceId: string;

  @Expose()
  currentVersionId: string;

  @Expose()
  displayName: string;

  @Expose()
  originalName: string;

  @Expose()
  mimeType: string;

  @Expose()
  sizeBytes: string;

  @Expose()
  storageProvider: string;

  @Expose()
  driveFileId: string | null;

  @Expose()
  downloadPath: string;

  @Expose()
  authorizedViewPath: string;

  @Expose()
  lastModifiedAt: Date;
}

export class UpdateBankFolderDto {
  @Expose()
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  groupName: string;

  @Expose()
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique((value: string) => String(value || '').trim().toUpperCase())
  @IsString({ each: true })
  @MaxLength(32, { each: true })
  @Matches(/^[A-Za-z0-9_-]+\d+$/, {
    each: true,
    message: 'Cada item debe usar formato tipo codigo+numero, por ejemplo PD1',
  })
  items?: string[];
}

export class UpdateBankFolderResponseDto {
  @Expose()
  courseCycleId: string;

  @Expose()
  bankEvaluationId: string;

  @Expose()
  evaluationTypeId: string;

  @Expose()
  evaluationTypeCode: string;

  @Expose()
  evaluationTypeName: string;

  @Expose()
  groupName: string;

  @Expose()
  items: string[];

  @Expose()
  hasAcademicEvaluations: boolean;
}

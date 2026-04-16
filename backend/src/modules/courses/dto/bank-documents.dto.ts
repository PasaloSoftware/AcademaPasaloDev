import { Expose } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumberString,
  IsString,
  MaxLength,
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

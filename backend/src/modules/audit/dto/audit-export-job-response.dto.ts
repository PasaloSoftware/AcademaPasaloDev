import { AuditExportStatus } from '@modules/audit/interfaces/audit.constants';

export class AuditExportJobResponseDto {
  jobId: string;
  status: AuditExportStatus;
  mode: 'sync' | 'async';
  totalRows: number;
  thresholdRows: number;
  rowsPerFile: number;
  estimatedFileCount: number;
  artifactTtlSeconds: number;
}

export class AuditExportJobStatusDto {
  jobId: string;
  status: AuditExportStatus;
  progress: number;
  totalRows: number;
  estimatedFileCount: number;
  readyForDownload: boolean;
  artifactName: string | null;
  artifactExpiresAt: string | null;
  errorMessage: string | null;
}

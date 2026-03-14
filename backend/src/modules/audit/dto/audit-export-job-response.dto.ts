export class AuditExportJobResponseDto {
  jobId: string;
  status: 'queued' | 'processing' | 'ready' | 'failed' | 'expired';
  mode: 'sync' | 'async';
  totalRows: number;
  thresholdRows: number;
  rowsPerFile: number;
  estimatedFileCount: number;
  artifactTtlSeconds: number;
}

export class AuditExportJobStatusDto {
  jobId: string;
  status: 'queued' | 'processing' | 'ready' | 'failed' | 'expired';
  progress: number;
  totalRows: number;
  estimatedFileCount: number;
  readyForDownload: boolean;
  artifactName: string | null;
  artifactExpiresAt: string | null;
  errorMessage: string | null;
}

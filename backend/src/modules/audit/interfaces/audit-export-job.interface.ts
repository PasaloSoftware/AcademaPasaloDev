import { AuditHistoryFilters } from './audit-export.interface';

export type AuditExportJobPayload = {
  requestedByUserId: string;
  filters: AuditHistoryFilters;
  requestedAtIso: string;
  totalRows: number;
  estimatedFileCount: number;
};

export type AuditExportCleanupPayload = {
  exportJobId: string;
};

export type AuditExportJobProgress = {
  stage:
    | 'queued'
    | 'counted'
    | 'processing'
    | 'ready'
    | 'failed'
    | 'expired';
  progress: number;
  totalRows: number;
  estimatedFileCount: number;
  artifactName?: string | null;
  artifactStorageKey?: string | null;
  artifactExpiresAt?: string | null;
  errorMessage?: string | null;
};

export type AuditPreparedDownload = {
  fileName: string;
  mimeType: string;
  stream: NodeJS.ReadableStream;
  onComplete?: () => Promise<void>;
};

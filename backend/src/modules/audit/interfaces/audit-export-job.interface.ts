import { AuditHistoryFilters } from './audit-export.interface';
import { AuditExportStatus } from './audit.constants';

export type AuditExportJobPayload = {
  requestedByUserId: string;
  filters: AuditHistoryFilters;
  requestedAtIso: string;
  totalRows: number;
  estimatedFileCount: number;
  lockToken: string;
};

export type AuditExportCleanupPayload = {
  exportJobId: string;
};

export type AuditExportJobProgress = {
  stage: AuditExportStatus;
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
  onFinish?: () => Promise<void>;
  onAbort?: () => Promise<void>;
};

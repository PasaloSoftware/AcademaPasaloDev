import { AuditSource } from './audit.constants';

export type AuditHistoryFilters = {
  startDate?: string;
  endDate?: string;
  userId?: string;
  source?: AuditSource;
  actionCode?: string;
  limit?: number;
};

export type ParsedAuditHistoryFilters = {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  source?: AuditSource;
  actionCode?: string;
};

export type AuditExportMode = 'sync' | 'async';

export type AuditExportPlan = {
  mode: AuditExportMode;
  totalRows: number;
  thresholdRows: number;
  rowsPerFile: number;
  estimatedFileCount: number;
  artifactTtlSeconds: number;
};

import { AuditSource } from '../interfaces/audit.constants';

export class UnifiedAuditHistoryDto {
  id: string;
  datetime: Date;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  actionCode: string;
  actionName: string;
  source: AuditSource;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

import { AuditSource } from '../interfaces/audit.constants';

export class AuditPanelItemDto {
  id: string;
  datetime: Date;
  userName: string;
  userRole: string;
  actionName: string;
  source: AuditSource;
  sourceLabel: string;
}

export class AuditPanelResponseDto {
  items: AuditPanelItemDto[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export class AuditLogDetailDto {
  id: string;
  datetime: Date;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  actionCode: string;
  actionName: string;
  source: AuditSource;
}

export class SecurityEventMetadataDto {
  deviceId?: string;
  locationSource?: string;
  city?: string;
  country?: string;
  activeRoleCode?: string;
  sessionStatus?: string;
  newSessionId?: string;
  existingSessionId?: string;
  existingDeviceId?: string;
}

export class SecurityEventDetailDto {
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
  metadata?: SecurityEventMetadataDto;
}

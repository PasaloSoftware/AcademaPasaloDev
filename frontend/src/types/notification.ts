export interface NotificationTarget {
  materialId: string | null;
  classEventId: string | null;
  evaluationId: string | null;
  courseCycleId: string | null;
  folderId: string | null;
  auditExportJobId: string | null;
}

export interface NotificationItem {
  notificationId: string;
  type: string;
  typeName: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  target: NotificationTarget | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface UnreadCountResponse {
  count: number;
}

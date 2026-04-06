export interface DispatchClassPayload {
  type:
    | (typeof import('@modules/notifications/domain/notification.constants').NOTIFICATION_TYPE_CODES)['CLASS_SCHEDULED']
    | (typeof import('@modules/notifications/domain/notification.constants').NOTIFICATION_TYPE_CODES)['CLASS_UPDATED']
    | (typeof import('@modules/notifications/domain/notification.constants').NOTIFICATION_TYPE_CODES)['CLASS_CANCELLED']
    | (typeof import('@modules/notifications/domain/notification.constants').NOTIFICATION_TYPE_CODES)['CLASS_RECORDING_AVAILABLE'];
  classEventId: string;
  classSnapshot?: {
    sessionNumber?: number;
  };
}

export interface DispatchMaterialPayload {
  type:
    | (typeof import('@modules/notifications/domain/notification.constants').NOTIFICATION_TYPE_CODES)['NEW_MATERIAL']
    | (typeof import('@modules/notifications/domain/notification.constants').NOTIFICATION_TYPE_CODES)['MATERIAL_UPDATED'];
  materialId: string;
  folderId: string;
}

export interface DispatchDeletionReviewPayload {
  type:
    | (typeof import('@modules/notifications/domain/notification.constants').NOTIFICATION_TYPE_CODES)['DELETION_REQUEST_APPROVED']
    | (typeof import('@modules/notifications/domain/notification.constants').NOTIFICATION_TYPE_CODES)['DELETION_REQUEST_REJECTED'];
  requestId: string;
  adminComment?: string;
}

export interface DispatchAuditExportReadyPayload {
  type: (typeof import('@modules/notifications/domain/notification.constants').NOTIFICATION_TYPE_CODES)['AUDIT_EXPORT_READY'];
  requestedByUserId: string;
  exportJobId: string;
  artifactName: string;
  artifactExpiresAt: string;
  estimatedFileCount: number;
}

export type DispatchPayload =
  | DispatchClassPayload
  | DispatchMaterialPayload
  | DispatchDeletionReviewPayload
  | DispatchAuditExportReadyPayload;

export interface ClassReminderPayload {
  classEventId: string;
  reminderMinutes: number;
}

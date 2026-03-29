export const AUDIT_SOURCES = {
  SECURITY: 'SECURITY',
  AUDIT: 'AUDIT',
} as const;

export type AuditSource = (typeof AUDIT_SOURCES)[keyof typeof AUDIT_SOURCES];

export const AUDIT_JOB_NAMES = {
  CLEANUP_OLD_LOGS: 'cleanup-old-logs',
  GENERATE_EXPORT: 'generate-audit-export',
  EXPIRE_EXPORT_ARTIFACT: 'expire-audit-export-artifact',
} as const;

export const AUDIT_JOB_IDS = {
  EXPORT_LOCK_KEY: 'lock:audit-export-global',
} as const;

export const AUDIT_EXPORT_STATUS = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
  EXPIRED: 'expired',
} as const;

export type AuditExportStatus =
  (typeof AUDIT_EXPORT_STATUS)[keyof typeof AUDIT_EXPORT_STATUS];

export const AUDIT_QUEUE_STATES = {
  ACTIVE: 'active',
  FAILED: 'failed',
  WAITING: 'waiting',
  WAITING_CHILDREN: 'waiting-children',
  DELAYED: 'delayed',
  PRIORITIZED: 'prioritized',
} as const;

export const AUDIT_ACTION_CODES = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_ANOMALY: 'LOGIN_ANOMALY',
  FILE_UPLOAD: 'FILE_UPLOAD',
  CLASS_RECORDING_PUBLISHED: 'CLASS_RECORDING_PUBLISHED',
  FILE_EDIT: 'FILE_EDIT',
  FILE_DELETE_REQUEST: 'FILE_DELETE_REQUEST',
  FILE_ARCHIVE: 'FILE_ARCHIVE',
  CONTENT_DISABLE: 'CONTENT_DISABLE',
  FILE_DELETE: 'FILE_DELETE',
  USER_ADMIN_EDIT: 'USER_ADMIN_EDIT',
  AUDIT_CLEANUP_EXECUTED: 'AUDIT_CLEANUP_EXECUTED',
} as const;

export const AUDIT_ENTITY_TYPES = {
  MATERIAL: 'material',
  FOLDER: 'material_folder',
  DELETION_REQUEST: 'deletion_request',
  USER: 'user',
  SYSTEM: 'system',
} as const;

export const AUDIT_SYSTEM_SETTING_KEYS = {
  AUDIT_CLEANUP_RETENTION_DAYS: 'AUDIT_CLEANUP_RETENTION_DAYS',
} as const;

export const AUDIT_LABELS = {
  SOURCE_SECURITY: 'SEGURIDAD',
  SOURCE_AUDIT: 'AUDITORIA',
  UNKNOWN_USER: 'Usuario Desconocido',
  UNKNOWN_ROLE: 'Sin Rol',
  UNKNOWN_ACTION: 'Accion no definida',
  NOT_AVAILABLE: 'N/A',
} as const;

export const AUDIT_EXCEL_CONFIG = {
  SHEET_NAME: 'Historial',
  LOCALE_ES_PE: 'es-PE',
  TIME_ZONE: 'America/Lima',
  HEADER_FILL_COLOR: 'FF2D5F9E',
  HEADER_FONT_COLOR: 'FFFFFFFF',
  COLUMNS: {
    DATETIME: 'FECHA Y HORA',
    USER_NAME: 'USUARIO',
    USER_EMAIL: 'CORREO',
    USER_ROLE: 'ROL',
    ACTION_NAME: 'ACCION',
    ACTION_CODE: 'CODIGO',
    SOURCE: 'FUENTE',
    IP: 'IP',
    USER_AGENT: 'NAVEGADOR',
  },
} as const;

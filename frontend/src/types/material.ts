// ============================================
// MATERIAL TYPES - Materiales de Sesiones de Clase
// ============================================

export interface MaterialFolder {
  id: string;
  name: string;
  visibleFrom: string | null;
}

export interface FolderMaterial {
  id: string;
  displayName: string;
  fileVersionId: string;
  createdAt: string;
  classEventId: string | null;
}

export interface FolderContentsResponse {
  folders: MaterialFolder[];
  materials: FolderMaterial[];
  totalMaterials: number;
  subfolderMaterialCount: Record<string, number>;
}

export interface FileResource {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: string;
  storageProvider: string;
  checksumHash: string;
  storageKey: string;
  storageUrl: string | null;
  createdAt: string;
}

export interface FileVersion {
  id: string;
  fileResourceId: string;
  versionNumber: number;
  storageUrl: string | null;
  createdAt: string;
  createdById: string;
}

export interface ClassEventMaterial {
  id: string;
  materialFolderId: string;
  classEventId: string | null;
  fileResourceId: string;
  fileVersionId: string;
  displayName: string;
  visibleFrom: string | null;
  visibleUntil: string | null;
  createdAt: string;
  isPendingDeletion?: boolean;
  fileResource: FileResource;
  fileVersion: FileVersion;
}

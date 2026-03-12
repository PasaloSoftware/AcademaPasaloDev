export type MaterialVersionHistoryItemDto = {
  versionId: string;
  versionNumber: number;
  isCurrent: boolean;
  createdAt: Date;
  createdBy: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName1: string | null;
    lastName2: string | null;
  } | null;
  file: {
    resourceId: string;
    originalName: string;
    mimeType: string;
    sizeBytes: string;
    storageProvider: string;
    driveFileId: string | null;
    storageUrl: string | null;
  };
};

export type MaterialVersionHistoryDto = {
  materialId: string;
  currentVersionId: string | null;
  currentVersionNumber: number | null;
  versions: MaterialVersionHistoryItemDto[];
};

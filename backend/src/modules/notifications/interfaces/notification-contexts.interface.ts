export interface ClassEventContext {
  classEventId: string;
  evaluationId: string;
  sessionNumber: number;
  classTitle: string;
  startDatetime: Date;
  courseCycleId: string;
  evaluationLabel: string;
  courseName: string;
  recipientUserIds: string[];
}

export interface MaterialContext {
  materialId: string;
  folderId: string;
  classEventId: string | null;
  evaluationId: string;
  sessionNumber: number | null;
  materialDisplayName: string;
  courseCycleId: string;
  evaluationLabel: string;
  courseName: string;
  recipientUserIds: string[];
}

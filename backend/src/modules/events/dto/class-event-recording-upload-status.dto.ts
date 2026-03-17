import {
  ClassEventRecordingStatusCode,
  CLASS_EVENT_RECORDING_STATUS_CODES,
} from '@modules/events/domain/class-event.constants';

export type ClassEventRecordingUploadMode = 'initial' | 'replacement';

export class ClassEventRecordingUploadStatusDto {
  classEventId: string;
  recordingStatus: ClassEventRecordingStatusCode;
  hasActiveRecordingUpload: boolean;
  activeUploadMode: ClassEventRecordingUploadMode | null;
  uploadExpiresAt: string | null;
  resumableSessionUrl: string | null;

  static idle(input: {
    classEventId: string;
    recordingStatus?: ClassEventRecordingStatusCode | null;
  }): ClassEventRecordingUploadStatusDto {
    return {
      classEventId: input.classEventId,
      recordingStatus:
        input.recordingStatus || CLASS_EVENT_RECORDING_STATUS_CODES.NOT_AVAILABLE,
      hasActiveRecordingUpload: false,
      activeUploadMode: null,
      uploadExpiresAt: null,
      resumableSessionUrl: null,
    };
  }
}

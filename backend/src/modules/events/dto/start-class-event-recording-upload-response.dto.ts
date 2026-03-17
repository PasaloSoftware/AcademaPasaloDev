import { ClassEventRecordingUploadStatusDto } from '@modules/events/dto/class-event-recording-upload-status.dto';

export class StartClassEventRecordingUploadResponseDto extends ClassEventRecordingUploadStatusDto {
  uploadToken: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  resumableSessionUrl: string;
}

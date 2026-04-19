import { ClassEventStatus } from '@modules/events/domain/class-event.constants';

export class AdminDayWidgetScheduleItemDto {
  id: string;
  sessionNumber: number;
  title: string;
  startDatetime: Date;
  endDatetime: Date;
  liveMeetingUrl: string | null;
  isCancelled: boolean;
  sessionStatus: ClassEventStatus;
  courseName: string;
  courseCode: string;
}


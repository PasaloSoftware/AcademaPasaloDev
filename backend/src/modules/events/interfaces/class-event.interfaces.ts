import { CalendarDiscoveryLayerRow } from '@modules/courses/infrastructure/course-cycle.repository';

export type DiscoveryLayer = CalendarDiscoveryLayerRow;

export type GlobalSessionItem = {
  eventId: string;
  evaluationId: string;
  sessionNumber: number;
  title: string;
  topic: string;
  startDatetime: Date;
  endDatetime: Date;
};

export type GlobalSessionGroup = {
  courseCycleId: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  sessions: GlobalSessionItem[];
};

export type CategoryCycleContext = {
  courseTypeId: string;
  academicCycleId: string;
};

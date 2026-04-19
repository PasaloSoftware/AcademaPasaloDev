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

export type GlobalFilterCatalogCycle = {
  id: string;
  code: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
};

export type GlobalFilterCatalogUnit = {
  code: string;
  name: string;
};

export type GlobalFilterCatalogCourseCycle = {
  courseCycleId: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  academicCycleId: string;
  academicCycleCode: string;
  courseTypeCode: string;
  courseTypeName: string;
};

export type GlobalFilterCatalog = {
  cycles: GlobalFilterCatalogCycle[];
  units: GlobalFilterCatalogUnit[];
  courseCycles: GlobalFilterCatalogCourseCycle[];
};

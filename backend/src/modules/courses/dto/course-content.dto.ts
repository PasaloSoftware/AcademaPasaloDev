import { Expose, Type } from 'class-transformer';
import type { StudentEvaluationLabel } from '@modules/courses/domain/student-course.constants';

export class CourseEvaluationDto {
  @Expose()
  id: string;

  @Expose()
  evaluationTypeCode: string;

  @Expose()
  shortName: string;

  @Expose()
  fullName: string;

  @Expose()
  label: StudentEvaluationLabel;
}

export class CourseContentResponseDto {
  @Expose()
  courseCycleId: string;

  @Expose()
  courseName: string;

  @Expose()
  courseCode: string;

  @Expose()
  cycleCode: string;

  @Expose()
  isCurrentCycle: boolean;

  @Expose()
  @Type(() => CourseEvaluationDto)
  evaluations: CourseEvaluationDto[];
}

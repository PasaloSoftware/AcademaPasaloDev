import { Expose, Type } from 'class-transformer';

export class EnrollmentOptionEvaluationDto {
  @Expose()
  id: string;

  @Expose()
  evaluationTypeCode: string;

  @Expose()
  shortName: string;

  @Expose()
  fullName: string;
}

export class EnrollmentOptionHistoricalCycleDto {
  @Expose()
  courseCycleId: string;

  @Expose()
  academicCycleCode: string;
}

export class EnrollmentOptionsResponseDto {
  @Expose()
  baseCourseCycleId: string;

  @Expose()
  courseId: string;

  @Expose()
  courseCode: string;

  @Expose()
  courseName: string;

  @Expose()
  academicCycleCode: string;

  @Expose()
  @Type(() => EnrollmentOptionEvaluationDto)
  evaluations: EnrollmentOptionEvaluationDto[];

  @Expose()
  @Type(() => EnrollmentOptionHistoricalCycleDto)
  historicalCycles: EnrollmentOptionHistoricalCycleDto[];
}

export class CourseCycleSelectorOptionDto {
  @Expose()
  courseCycleId: string;

  @Expose()
  academicCycleCode: string;
}

export class EnrollmentCourseCycleOptionsResponseDto {
  @Expose()
  courseId: string;

  @Expose()
  courseCode: string;

  @Expose()
  courseName: string;

  @Expose()
  @Type(() => CourseCycleSelectorOptionDto)
  currentCycle: CourseCycleSelectorOptionDto | null;

  @Expose()
  @Type(() => CourseCycleSelectorOptionDto)
  historicalCycles: CourseCycleSelectorOptionDto[];
}

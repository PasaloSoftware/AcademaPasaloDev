import { Expose, Type } from 'class-transformer';

export class AdminUserCourseRelationDto {
  @Expose()
  relationId: string;

  @Expose()
  courseId: string;

  @Expose()
  courseCycleId: string;

  @Expose()
  courseCode: string;

  @Expose()
  courseName: string;

  @Expose()
  academicCycleCode: string;

  @Expose()
  enrollmentTypeCode?: 'FULL' | 'PARTIAL';

  @Expose()
  evaluationIds?: string[];

  @Expose()
  historicalCourseCycleIds?: string[];
}

export class AdminCourseOptionDto {
  @Expose()
  courseId: string;

  @Expose()
  courseCode: string;

  @Expose()
  courseName: string;
}

export class AdminUserPersonalInfoDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName1: string | null;

  @Expose()
  lastName2: string | null;

  @Expose()
  email: string;

  @Expose()
  phone: string | null;

  @Expose()
  careerId: number | null;

  @Expose()
  careerName: string | null;

  @Expose()
  roles: string[];

  @Expose()
  isActive: boolean;

  @Expose()
  profilePhotoUrl: string | null;
}

export class AdminUserDetailResponseDto {
  @Expose()
  @Type(() => AdminUserPersonalInfoDto)
  personalInfo: AdminUserPersonalInfoDto;

  @Expose()
  @Type(() => AdminUserCourseRelationDto)
  enrolledCourses: AdminUserCourseRelationDto[];

  @Expose()
  @Type(() => AdminUserCourseRelationDto)
  teachingCourses: AdminUserCourseRelationDto[];
}

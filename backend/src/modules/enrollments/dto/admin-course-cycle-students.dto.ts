import { Expose, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class AdminCourseCycleStudentsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}

export class AdminCourseCycleStudentItemDto {
  @Expose()
  enrollmentId: string;

  @Expose()
  userId: string;

  @Expose()
  fullName: string;

  @Expose()
  email: string;
}

export class AdminCourseCycleStudentsResponseDto {
  @Expose()
  @Type(() => AdminCourseCycleStudentItemDto)
  items: AdminCourseCycleStudentItemDto[];

  @Expose()
  page: number;

  @Expose()
  pageSize: number;

  @Expose()
  totalItems: number;

  @Expose()
  totalPages: number;
}

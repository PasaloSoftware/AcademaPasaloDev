import { Expose, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AdminFeedbackListQueryDto {
  @Expose()
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  page?: number = 1;

  @Expose()
  @IsOptional()
  @IsNumberString({ no_symbols: true })
  courseCycleId?: string;

  @Expose()
  @IsOptional()
  @IsNumberString({ no_symbols: true })
  courseId?: string;

  @Expose()
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  careerId?: number;

  @Expose()
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @Expose()
  @Transform(({ value }: { value: unknown }): boolean | undefined => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

export class AdminFeedbackAuthorDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName1: string | null;

  @Expose()
  lastName2: string | null;

  @Expose()
  profilePhotoUrl: string | null;

  @Expose()
  careerName: string | null;
}

export class AdminFeedbackListItemDto {
  @Expose()
  id: string;

  @Expose()
  rating: number;

  @Expose()
  comment: string;

  @Expose()
  isActive: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  courseCycleId: string;

  @Expose()
  courseId: string;

  @Expose()
  courseName: string;

  @Expose()
  @Type(() => AdminFeedbackAuthorDto)
  user: AdminFeedbackAuthorDto;
}

export class AdminFeedbackStatsDto {
  total: number;
  average: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export class AdminFeedbackListResponseDto {
  items: AdminFeedbackListItemDto[];
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  stats: AdminFeedbackStatsDto;
}

import { Expose, Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export const ADMIN_USER_STATUS_FILTERS = ['ACTIVE', 'INACTIVE'] as const;
export type AdminUserStatusFilter = (typeof ADMIN_USER_STATUS_FILTERS)[number];

export class AdminUsersListQueryDto {
  @Expose()
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @Expose()
  @IsOptional()
  @IsString()
  roles?: string;

  @Expose()
  @IsOptional()
  @IsString()
  search?: string;

  @Expose()
  @IsOptional()
  @IsString()
  careerIds?: string;

  @Expose()
  @Transform(({ value }) =>
    value == null || String(value).trim() === ''
      ? undefined
      : String(value).trim().toUpperCase(),
  )
  @IsOptional()
  @IsIn(ADMIN_USER_STATUS_FILTERS)
  status?: AdminUserStatusFilter;
}

export class AdminUsersListItemDto {
  @Expose()
  id: string;

  @Expose()
  fullName: string;

  @Expose()
  email: string;

  @Expose()
  roles: string[];

  @Expose()
  careerId: number | null;

  @Expose()
  careerName: string | null;

  @Expose()
  isActive: boolean;
}

export class AdminUsersListResponseDto {
  @Expose()
  @Type(() => AdminUsersListItemDto)
  items: AdminUsersListItemDto[];

  @Expose()
  currentPage: number;

  @Expose()
  pageSize: number;

  @Expose()
  totalItems: number;

  @Expose()
  totalPages: number;
}

export class AdminUsersRoleFilterOptionDto {
  @Expose()
  code: string;

  @Expose()
  label: string;
}

export class AdminUsersStatusFilterOptionDto {
  @Expose()
  code: AdminUserStatusFilter;

  @Expose()
  label: string;
}

import { Expose, Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CyclesHistoryQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  page?: number = 1;
}

export class CyclesHistoryItemDto {
  @Expose()
  id: string;

  @Expose()
  code: string;

  @Expose()
  startDate: Date;

  @Expose()
  endDate: Date;
}

export class CyclesHistoryResponseDto {
  items: CyclesHistoryItemDto[];
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

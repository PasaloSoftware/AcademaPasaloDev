import { Expose } from 'class-transformer';

export class AdminDashboardStatsDto {
  @Expose()
  activeStudents: number;

  @Expose()
  teachers: number;

  @Expose()
  courses: number;
}

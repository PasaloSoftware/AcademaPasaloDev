import { Expose, Type } from 'class-transformer';

export class PublicCourseCatalogProfessorDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName1: string | null;

  @Expose()
  profilePhotoUrl: string | null;
}

export class PublicCourseCatalogItemDto {
  @Expose()
  courseCycleId: string;

  @Expose()
  courseId: string;

  @Expose()
  code: string;

  @Expose()
  name: string;

  @Expose()
  categoryCode: string;

  @Expose()
  categoryName: string;

  @Expose()
  cycleLabel: string;

  @Expose()
  headerColor: string | null;

  @Expose()
  freeClassUrl: string | null;

  @Expose()
  @Type(() => PublicCourseCatalogProfessorDto)
  professors: PublicCourseCatalogProfessorDto[];
}

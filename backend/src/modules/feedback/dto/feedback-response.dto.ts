import { Expose, Type } from 'class-transformer';

export class TestimonyAuthorDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName1: string;

  @Expose()
  profilePhotoUrl: string | null;
}

export class TestimonyResponseDto {
  @Expose()
  id: string;

  @Expose()
  rating: number;

  @Expose()
  comment: string;

  @Expose()
  photoUrl: string | null;

  @Expose()
  photoSource: string;

  @Expose()
  isActive: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  @Type(() => TestimonyAuthorDto)
  user: TestimonyAuthorDto;
}

export class PublicTestimonyAuthorDto {
  @Expose()
  firstName: string;

  @Expose()
  lastName1: string;

  @Expose()
  profilePhotoUrl: string | null;

  @Expose()
  careerName: string | null;
}

export class PublicTestimonyResponseDto {
  @Expose()
  id: string;

  @Expose()
  rating: number;

  @Expose()
  comment: string;

  @Expose()
  createdAt: Date;

  @Expose()
  @Type(() => PublicTestimonyAuthorDto)
  user: PublicTestimonyAuthorDto;

  @Expose()
  courseName: string;
}

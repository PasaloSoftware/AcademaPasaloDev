import { Expose, Transform, Type } from 'class-transformer';
import { PhotoSource } from '@modules/users/domain/user.entity';

class RoleDto {
  @Expose()
  code: string;

  @Expose()
  name: string;
}

export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName1: string | null;

  @Expose()
  lastName2: string | null;

  @Expose()
  phone: string | null;

  @Expose()
  careerId: number | null;

  @Expose()
  @Transform(({ obj }: { obj: unknown }) => {
    if (!obj || typeof obj !== 'object') return null;

    const career = (obj as { career?: unknown }).career;
    if (!career || typeof career !== 'object') return null;

    const name = (career as { name?: unknown }).name;
    return typeof name === 'string' ? name : null;
  })
  careerName: string | null;

  @Expose()
  profilePhotoUrl: string | null;

  @Expose()
  photoSource: PhotoSource;

  @Expose()
  @Type(() => RoleDto)
  roles: RoleDto[];

  @Expose()
  lastActiveRoleId: string | null;

  @Expose()
  createdAt: string;

  @Expose()
  updatedAt: string | null;
}

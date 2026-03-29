import { Expose, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDefined,
  IsEmail,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PhotoSource } from '@modules/users/domain/user.entity';
import { AdminStudentEnrollmentInputDto } from '@modules/users/dto/admin-user-onboarding.dto';

export class AdminEditPersonalInfoDto {
  @IsOptional()
  @IsEmail({}, { message: 'El email debe ser válido' })
  @MaxLength(255, { message: 'El email excede el tamaño máximo permitido' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'El nombre debe ser un texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El nombre excede el tamaño máximo permitido' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, {
    message: 'El nombre solo puede contener letras',
  })
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El apellido excede el tamaño máximo permitido' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, {
    message: 'El apellido solo puede contener letras',
  })
  lastName1?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El apellido excede el tamaño máximo permitido' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, {
    message: 'El apellido solo puede contener letras',
  })
  lastName2?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'El teléfono excede el tamaño máximo permitido' })
  @Matches(/^\+?[0-9\s\-()]+$/, {
    message: 'El teléfono debe contener solo números y caracteres válidos',
  })
  phone?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'careerId debe ser un entero' })
  @Min(1, { message: 'careerId debe ser mayor o igual a 1' })
  @Max(2147483647, { message: 'careerId excede el rango permitido' })
  careerId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'La URL de foto excede el tamaño máximo permitido',
  })
  profilePhotoUrl?: string | null;

  @IsOptional()
  @IsIn([PhotoSource.GOOGLE, PhotoSource.UPLOADED, PhotoSource.NONE], {
    message: 'El origen de la foto debe ser google, uploaded o none',
  })
  photoSource?: PhotoSource;
}

export class AdminEditStudentStateDto {
  @IsArray()
  @ArrayUnique((item: AdminStudentEnrollmentInputDto) => item.courseCycleId)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => AdminStudentEnrollmentInputDto)
  enrollments: AdminStudentEnrollmentInputDto[];
}

export class AdminEditProfessorStateDto {
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Matches(/^\d+$/, {
    each: true,
    message: 'courseCycleIds debe contener solo strings numericos',
  })
  @MaxLength(20, { each: true })
  courseCycleIds: string[];
}

export class AdminUserEditDto {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AdminEditPersonalInfoDto)
  personalInfo?: AdminEditPersonalInfoDto;

  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @MaxLength(32, { each: true })
  roleCodesFinal: string[];

  @IsDefined()
  @ValidateNested()
  @Type(() => AdminEditStudentStateDto)
  studentStateFinal: AdminEditStudentStateDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => AdminEditProfessorStateDto)
  professorStateFinal: AdminEditProfessorStateDto;
}

export class AdminUserEditDeltaDto {
  @Expose()
  added: string[];

  @Expose()
  removed: string[];
}

export class AdminUserEditResponseDto {
  @Expose()
  userId: string;

  @Expose()
  rolesFinal: string[];

  @Expose()
  enrollmentsChanged: {
    cancelledEnrollmentIds: string[];
    createdEnrollmentIds: string[];
    baseCourseCycleIdsFinal: string[];
  };

  @Expose()
  @Type(() => AdminUserEditDeltaDto)
  professorCourseCyclesChanged: AdminUserEditDeltaDto;

  @Expose()
  eventProfessorAssignmentsChanged: {
    assignedCount: number;
    revokedCount: number;
  };
}

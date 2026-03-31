import { Expose, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDefined,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { CreateUserDto } from '@modules/users/dto/create-user.dto';

export class AdminStudentEnrollmentInputDto {
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  @Matches(/^\d+$/, {
    message: 'courseCycleId debe ser un string numerico',
  })
  @MaxLength(20)
  courseCycleId: string;

  @IsString()
  @IsDefined()
  @IsIn(['FULL', 'PARTIAL'])
  enrollmentTypeCode: string;

  @IsArray()
  @IsOptional()
  @ArrayUnique()
  @ArrayMaxSize(80)
  @IsString({ each: true })
  @Matches(/^\d+$/, {
    each: true,
    message: 'evaluationIds debe contener solo strings numericos',
  })
  @MaxLength(20, { each: true })
  evaluationIds?: string[];

  @IsArray()
  @IsOptional()
  @ArrayUnique()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Matches(/^\d+$/, {
    each: true,
    message: 'historicalCourseCycleIds debe contener solo strings numericos',
  })
  @MaxLength(20, { each: true })
  historicalCourseCycleIds?: string[];
}

export class AdminProfessorAssignmentInputDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @Matches(/^\d+$/, {
    each: true,
    message: 'courseCycleIds debe contener solo strings numericos',
  })
  @MaxLength(20, { each: true })
  courseCycleIds: string[];
}

export class AdminUserOnboardingDto extends CreateUserDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @MaxLength(32, { each: true })
  roleCodes: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminStudentEnrollmentInputDto)
  studentEnrollment?: AdminStudentEnrollmentInputDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminProfessorAssignmentInputDto)
  professorAssignments?: AdminProfessorAssignmentInputDto;
}

export class AdminUserOnboardingResponseDto {
  @Expose()
  userId: string;

  @Expose()
  enrollmentId: string | null;

  @Expose()
  assignedRoleCodes: string[];

  @Expose()
  professorCourseCycleIds: string[];
}

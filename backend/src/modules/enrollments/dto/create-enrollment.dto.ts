import {
  ArrayMaxSize,
  ArrayUnique,
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsDefined,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateEnrollmentDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @Matches(/^\d+$/, {
    message: 'userId debe ser un string numerico',
  })
  @MaxLength(20)
  userId: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @Matches(/^\d+$/, {
    message: 'courseCycleId debe ser un string numerico',
  })
  @MaxLength(20)
  courseCycleId: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @MaxLength(32)
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

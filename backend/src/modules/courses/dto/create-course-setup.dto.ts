import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCourseDto } from '@modules/courses/dto/create-course.dto';

export class CourseSetupEvaluationDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  evaluationTypeId: string;

  @IsInt()
  @Type(() => Number)
  number: number;

  @IsDateString()
  @IsDefined()
  startDate: string;

  @IsDateString()
  @IsDefined()
  endDate: string;
}

export class CourseSetupNewEvaluationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsDefined()
  name: string;

  @IsInt()
  @Type(() => Number)
  @IsDefined()
  number: number;

  @IsDateString()
  @IsDefined()
  startDate: string;

  @IsDateString()
  @IsDefined()
  endDate: string;
}

export class CourseSetupMaterialsRootDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsDefined()
  name: string;

  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  @IsOptional()
  subfolderNames?: string[];
}

export class CourseSetupMaterialsTemplateDto {
  @IsBoolean()
  @IsOptional()
  applyToEachEvaluation?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CourseSetupMaterialsRootDto)
  roots: CourseSetupMaterialsRootDto[];
}

export class CourseSetupBankFolderDto {
  @IsString()
  @IsOptional()
  evaluationTypeId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  newEvaluationTypeName?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsDefined()
  groupName: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  @IsDefined()
  items: string[];
}

export class CreateCourseSetupDto {
  @ValidateNested()
  @Type(() => CreateCourseDto)
  @IsDefined()
  course: CreateCourseDto;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  academicCycleId: string;

  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @IsOptional()
  allowedEvaluationTypeIds?: string[];

  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => CourseSetupEvaluationDto)
  @IsOptional()
  evaluationsToCreate?: CourseSetupEvaluationDto[];

  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => CourseSetupNewEvaluationDto)
  @IsOptional()
  newEvaluationsToCreate?: CourseSetupNewEvaluationDto[];

  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @IsOptional()
  professorUserIds?: string[];

  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CourseSetupBankFolderDto)
  @IsOptional()
  bankFoldersToCreate?: CourseSetupBankFolderDto[];

  @ValidateNested()
  @Type(() => CourseSetupMaterialsTemplateDto)
  @IsDefined()
  materialsTemplate: CourseSetupMaterialsTemplateDto;
}

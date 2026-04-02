import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsDateString,
  IsDefined,
  Min,
  MaxLength,
  IsUrl,
  IsOptional,
  IsArray,
} from 'class-validator';

export class CreateClassEventDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @MaxLength(20)
  evaluationId: string;

  @IsInt()
  @Min(1)
  @IsDefined()
  sessionNumber: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsDefined()
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @IsDefined()
  topic: string;

  @IsDateString()
  @IsDefined()
  startDatetime: string;

  @IsDateString()
  @IsDefined()
  endDatetime: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl()
  @MaxLength(500)
  @IsDefined()
  liveMeetingUrl: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(20, { each: true })
  professorUserIds?: string[];
}

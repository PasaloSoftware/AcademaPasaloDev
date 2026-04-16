import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDefined,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class ReorderEvaluationsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(20, { each: true })
  @IsDefined()
  evaluationIds: string[];
}

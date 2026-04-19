import { IsDateString, IsDefined } from 'class-validator';

export class UpdateEvaluationDto {
  @IsDateString()
  @IsDefined()
  startDate: string;

  @IsDateString()
  @IsDefined()
  endDate: string;
}

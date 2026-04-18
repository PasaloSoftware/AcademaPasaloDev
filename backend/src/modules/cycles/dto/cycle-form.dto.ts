import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CycleFormDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

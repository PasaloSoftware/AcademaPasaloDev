import {
  IsDateString,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CycleFormDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message:
      'El código solo puede contener letras, números, guiones (-) y guiones bajos (_). Sin espacios ni caracteres especiales.',
  })
  code: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

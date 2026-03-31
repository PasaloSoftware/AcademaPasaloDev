import {
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsString,
  MinLength,
  MaxLength,
  IsNumberString,
} from 'class-validator';

export class CreateTestimonyDto {
  @IsNotEmpty()
  @IsNumberString()
  courseCycleId: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  comment: string;
}

import {
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
  IsUrl,
} from 'class-validator';

export class UpdateClassEventDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  topic?: string;

  @IsDateString()
  @IsOptional()
  startDatetime?: string;

  @IsDateString()
  @IsOptional()
  endDatetime?: string;

  @IsString()
  @IsOptional()
  @IsUrl({}, { message: 'El enlace de la clase debe ser una URL valida' })
  @MaxLength(500)
  liveMeetingUrl?: string;

  @IsString()
  @IsOptional()
  @IsUrl({}, { message: 'La URL de la grabacion debe ser valida' })
  @MaxLength(500)
  recordingUrl?: string;
}

import { Expose } from 'class-transformer';

export class EvaluationTypeResponseDto {
  @Expose()
  id: string;

  @Expose()
  code: string;

  @Expose()
  name: string;
}

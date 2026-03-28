import { Expose } from 'class-transformer';

export class CareerCatalogItemDto {
  @Expose()
  id: number;

  @Expose()
  name: string;
}

import { Injectable } from '@nestjs/common';
import { CareerRepository } from '@modules/users/infrastructure/career.repository';

export type CareerCatalogItem = {
  id: number;
  name: string;
};

@Injectable()
export class CareersCatalogService {
  constructor(private readonly careerRepository: CareerRepository) {}

  async listCareers(): Promise<CareerCatalogItem[]> {
    const careers = await this.careerRepository.findAll();
    return careers.map((career) => ({
      id: career.id,
      name: career.name,
    }));
  }
}

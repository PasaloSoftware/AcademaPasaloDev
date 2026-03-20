import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaterialVersion } from '@modules/materials/domain/material-version.entity';

@Injectable()
export class MaterialVersionRepository {
  constructor(
    @InjectRepository(MaterialVersion)
    private readonly ormRepository: Repository<MaterialVersion>,
  ) {}

  async create(version: Partial<MaterialVersion>): Promise<MaterialVersion> {
    const newVersion = this.ormRepository.create(version);
    return await this.ormRepository.save(newVersion);
  }

  async findLatestByMaterialId(
    materialId: string,
  ): Promise<MaterialVersion | null> {
    return await this.ormRepository.findOne({
      where: { materialId },
      order: { versionNumber: 'DESC' },
    });
  }
}

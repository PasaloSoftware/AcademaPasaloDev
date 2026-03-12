import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaterialVersion } from '@modules/materials/domain/material-version.entity';

export type MaterialVersionHistoryRow = {
  versionId: string;
  versionNumber: number;
  createdAt: Date;
  createdById: string | null;
  createdByEmail: string | null;
  createdByFirstName: string | null;
  createdByLastName1: string | null;
  createdByLastName2: string | null;
  fileResourceId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: string;
  storageProvider: string;
  storageKey: string;
  storageUrl: string | null;
};

@Injectable()
export class MaterialVersionHistoryRepository {
  constructor(
    @InjectRepository(MaterialVersion)
    private readonly ormRepository: Repository<MaterialVersion>,
  ) {}

  async findByMaterialId(
    materialId: string,
  ): Promise<MaterialVersionHistoryRow[]> {
    return await this.ormRepository
      .createQueryBuilder('mv')
      .innerJoin('mv.fileResource', 'fr')
      .leftJoin('mv.createdBy', 'u')
      .where('mv.materialId = :materialId', { materialId })
      .orderBy('mv.versionNumber', 'DESC')
      .select('mv.id', 'versionId')
      .addSelect('mv.versionNumber', 'versionNumber')
      .addSelect('mv.createdAt', 'createdAt')
      .addSelect('u.id', 'createdById')
      .addSelect('u.email', 'createdByEmail')
      .addSelect('u.firstName', 'createdByFirstName')
      .addSelect('u.lastName1', 'createdByLastName1')
      .addSelect('u.lastName2', 'createdByLastName2')
      .addSelect('fr.id', 'fileResourceId')
      .addSelect('fr.originalName', 'originalName')
      .addSelect('fr.mimeType', 'mimeType')
      .addSelect('fr.sizeBytes', 'sizeBytes')
      .addSelect('fr.storageProvider', 'storageProvider')
      .addSelect('fr.storageKey', 'storageKey')
      .addSelect('fr.storageUrl', 'storageUrl')
      .getRawMany<MaterialVersionHistoryRow>();
  }
}

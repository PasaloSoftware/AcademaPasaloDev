import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, In, IsNull } from 'typeorm';
import { MaterialFolder } from '@modules/materials/domain/material-folder.entity';

@Injectable()
export class MaterialFolderRepository {
  constructor(
    @InjectRepository(MaterialFolder)
    private readonly ormRepository: Repository<MaterialFolder>,
  ) {}

  async create(
    folder: Partial<MaterialFolder>,
    manager?: EntityManager,
  ): Promise<MaterialFolder> {
    const repo = manager
      ? manager.getRepository(MaterialFolder)
      : this.ormRepository;
    const newFolder = repo.create(folder);
    return await repo.save(newFolder);
  }

  async save(
    folder: MaterialFolder,
    manager?: EntityManager,
  ): Promise<MaterialFolder> {
    const repo = manager
      ? manager.getRepository(MaterialFolder)
      : this.ormRepository;
    return await repo.save(folder);
  }

  async findById(id: string): Promise<MaterialFolder | null> {
    return await this.ormRepository.findOne({
      where: { id },
      relations: {
        folderStatus: true,
        parentFolder: true,
      },
    });
  }

  async findRootsByEvaluation(
    evaluationId: string,
    statusId: string,
  ): Promise<MaterialFolder[]> {
    return await this.ormRepository.find({
      where: {
        evaluationId,
        parentFolderId: IsNull(),
        folderStatusId: statusId,
      },
      order: { name: 'ASC' },
    });
  }

  async findSubFolders(
    parentFolderId: string,
    statusId: string,
  ): Promise<MaterialFolder[]> {
    return await this.ormRepository.find({
      where: {
        parentFolderId,
        folderStatusId: statusId,
      },
      order: { name: 'ASC' },
    });
  }

  async findByParentFolderIds(
    parentFolderIds: string[],
    statusId: string,
  ): Promise<MaterialFolder[]> {
    if (parentFolderIds.length === 0) {
      return [];
    }

    return await this.ormRepository.find({
      where: {
        parentFolderId: In(parentFolderIds),
        folderStatusId: statusId,
      },
      order: { name: 'ASC' },
    });
  }
}

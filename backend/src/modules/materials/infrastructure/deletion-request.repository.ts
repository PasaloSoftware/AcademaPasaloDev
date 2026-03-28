import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { DeletionRequest } from '@modules/materials/domain/deletion-request.entity';

@Injectable()
export class DeletionRequestRepository {
  constructor(
    @InjectRepository(DeletionRequest)
    private readonly ormRepository: Repository<DeletionRequest>,
  ) {}

  async create(
    request: Partial<DeletionRequest>,
    manager?: EntityManager,
  ): Promise<DeletionRequest> {
    const repo = manager
      ? manager.getRepository(DeletionRequest)
      : this.ormRepository;
    const newRequest = repo.create(request);
    return await repo.save(newRequest);
  }

  async findById(id: string): Promise<DeletionRequest | null> {
    return await this.ormRepository.findOne({
      where: { id },
      relations: {
        requestedBy: true,
        deletionRequestStatus: true,
      },
    });
  }

  async findByStatusId(statusId: string): Promise<DeletionRequest[]> {
    return await this.ormRepository.find({
      where: { deletionRequestStatusId: statusId },
      relations: {
        requestedBy: true,
        deletionRequestStatus: true,
      },
      order: { createdAt: 'ASC' },
    });
  }

  async findPendingByMaterialId(
    materialId: string,
    pendingStatusId: string,
    manager?: EntityManager,
  ): Promise<DeletionRequest | null> {
    const repo = manager
      ? manager.getRepository(DeletionRequest)
      : this.ormRepository;
    return await repo.findOne({
      where: {
        entityType: 'material',
        entityId: materialId,
        deletionRequestStatusId: pendingStatusId,
      },
    });
  }

  async existsPendingByMaterialId(
    materialId: string,
    pendingStatusId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const pending = await this.findPendingByMaterialId(
      materialId,
      pendingStatusId,
      manager,
    );
    return !!pending;
  }

  async findPendingMaterialIds(
    materialIds: string[],
    pendingStatusId: string,
    manager?: EntityManager,
  ): Promise<string[]> {
    if (materialIds.length === 0) {
      return [];
    }

    const repo = manager
      ? manager.getRepository(DeletionRequest)
      : this.ormRepository;

    const rows = await repo
      .createQueryBuilder('dr')
      .select('dr.entityId', 'entityId')
      .where('dr.entityType = :entityType', { entityType: 'material' })
      .andWhere('dr.deletionRequestStatusId = :pendingStatusId', {
        pendingStatusId,
      })
      .andWhere('dr.entityId IN (:...materialIds)', { materialIds })
      .getRawMany<{ entityId: string }>();

    return rows.map((row) => String(row.entityId));
  }
}

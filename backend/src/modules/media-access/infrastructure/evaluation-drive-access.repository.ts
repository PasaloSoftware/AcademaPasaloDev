import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { EvaluationDriveAccess } from '@modules/media-access/domain/evaluation-drive-access.entity';

@Injectable()
export class EvaluationDriveAccessRepository {
  constructor(
    @InjectRepository(EvaluationDriveAccess)
    private readonly ormRepository: Repository<EvaluationDriveAccess>,
  ) {}

  async findByEvaluationId(
    evaluationId: string,
  ): Promise<EvaluationDriveAccess | null> {
    return await this.ormRepository.findOne({ where: { evaluationId } });
  }

  async upsertByEvaluationId(
    payload: {
      evaluationId: string;
      scopeKey: string;
      viewerGroupEmail: string;
      driveScopeFolderId?: string | null;
      driveVideosFolderId?: string | null;
      driveDocumentsFolderId?: string | null;
      viewerGroupId?: string | null;
      isActive?: boolean;
    },
    manager?: EntityManager,
  ): Promise<EvaluationDriveAccess> {
    const repo = manager
      ? manager.getRepository(EvaluationDriveAccess)
      : this.ormRepository;

    const now = new Date();
    const existing = await repo.findOne({
      where: { evaluationId: payload.evaluationId },
    });

    if (existing) {
      existing.scopeKey = payload.scopeKey;
      existing.viewerGroupEmail = payload.viewerGroupEmail;
      existing.driveScopeFolderId = payload.driveScopeFolderId ?? null;
      existing.driveVideosFolderId = payload.driveVideosFolderId ?? null;
      existing.driveDocumentsFolderId = payload.driveDocumentsFolderId ?? null;
      existing.viewerGroupId = payload.viewerGroupId ?? null;
      existing.isActive = payload.isActive ?? true;
      existing.updatedAt = now;
      return await repo.save(existing);
    }

    const created = repo.create({
      evaluationId: payload.evaluationId,
      scopeKey: payload.scopeKey,
      viewerGroupEmail: payload.viewerGroupEmail,
      driveScopeFolderId: payload.driveScopeFolderId ?? null,
      driveVideosFolderId: payload.driveVideosFolderId ?? null,
      driveDocumentsFolderId: payload.driveDocumentsFolderId ?? null,
      viewerGroupId: payload.viewerGroupId ?? null,
      isActive: payload.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
    return await repo.save(created);
  }
}


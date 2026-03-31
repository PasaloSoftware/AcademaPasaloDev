import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EvaluationDriveAccessRepository } from '@modules/media-access/infrastructure/evaluation-drive-access.repository';
import {
  DriveEvaluationScopeNames,
  DriveScopeNamingService,
} from '@modules/media-access/application/drive-scope-naming.service';
import { EvaluationDriveAccess } from '@modules/media-access/domain/evaluation-drive-access.entity';
import { EvaluationDriveAccessProvisioningService } from '@modules/media-access/application/evaluation-drive-access-provisioning.service';
import { DriveScopeProvisioningService } from '@modules/media-access/application/drive-scope-provisioning.service';
import { Evaluation } from '@modules/evaluations/domain/evaluation.entity';
import { Repository } from 'typeorm';

export type DriveEvaluationScopeResolution = {
  names: DriveEvaluationScopeNames;
  persisted: EvaluationDriveAccess | null;
};

@Injectable()
export class DriveAccessScopeService {
  private readonly logger = new Logger(DriveAccessScopeService.name);
  private readonly verifiedEvaluationIds = new Set<string>();

  constructor(
    private readonly namingService: DriveScopeNamingService,
    private readonly repository: EvaluationDriveAccessRepository,
    @InjectRepository(Evaluation)
    private readonly evaluationRepository: Repository<Evaluation>,
    private readonly provisioningService: EvaluationDriveAccessProvisioningService,
    private readonly driveScopeProvisioningService: DriveScopeProvisioningService,
  ) {}

  async resolveForEvaluation(
    evaluationId: string,
  ): Promise<DriveEvaluationScopeResolution> {
    const names = await this.buildContextualNames(evaluationId);
    let persisted = await this.repository.findByEvaluationId(
      names.evaluationId,
    );

    if (this.requiresProvisioning(persisted)) {
      this.logger.warn({
        message: 'Scope Drive incompleto o inactivo; se reprovisionara',
        evaluationId: names.evaluationId,
        scopeKey: names.scopeKey,
      });
      persisted = await this.provisioningService.provisionByEvaluationId(
        names.evaluationId,
      );
      this.verifiedEvaluationIds.add(names.evaluationId);
      return { names, persisted };
    }

    if (!this.verifiedEvaluationIds.has(names.evaluationId)) {
      persisted = await this.ensurePersistedScopeMatchesNaming(
        names,
        persisted,
      );
      this.verifiedEvaluationIds.add(names.evaluationId);
    }

    return { names, persisted };
  }

  private async buildContextualNames(
    evaluationId: string,
  ): Promise<DriveEvaluationScopeNames> {
    const normalizedEvaluationId = String(evaluationId || '').trim();
    const evaluation = await this.evaluationRepository.findOne({
      where: { id: normalizedEvaluationId },
      relations: {
        evaluationType: true,
        courseCycle: {
          course: true,
          academicCycle: true,
        },
      },
    });
    if (!evaluation) {
      throw new NotFoundException(
        'Evaluacion no encontrada para resolver scope',
      );
    }

    return this.namingService.buildForEvaluation({
      evaluationId: normalizedEvaluationId,
      courseCycleId: String(evaluation.courseCycleId || '').trim(),
      courseCode: String(evaluation.courseCycle?.course?.code || '').trim(),
      cycleCode: String(
        evaluation.courseCycle?.academicCycle?.code || '',
      ).trim(),
      evaluationTypeCode: String(evaluation.evaluationType?.code || '').trim(),
      evaluationNumber: Number(evaluation.number),
    });
  }

  private requiresProvisioning(
    persisted: EvaluationDriveAccess | null,
  ): boolean {
    if (!persisted || !persisted.isActive) {
      return true;
    }

    return (
      !String(persisted.driveScopeFolderId || '').trim() ||
      !String(persisted.driveDocumentsFolderId || '').trim() ||
      !String(persisted.driveVideosFolderId || '').trim() ||
      !String(persisted.driveArchivedFolderId || '').trim()
    );
  }

  private async ensurePersistedScopeMatchesNaming(
    names: DriveEvaluationScopeNames,
    persisted: EvaluationDriveAccess,
  ): Promise<EvaluationDriveAccess> {
    const scopeFolderId = String(persisted.driveScopeFolderId || '').trim();
    if (!scopeFolderId) {
      return await this.provisioningService.provisionByEvaluationId(
        names.evaluationId,
      );
    }

    try {
      const metadata =
        await this.driveScopeProvisioningService.getDriveFolderMetadata(
          scopeFolderId,
        );
      const persistedFolderName = String(metadata.name || '').trim();
      if (persistedFolderName === names.baseFolderName) {
        return persisted;
      }

      this.logger.warn({
        message:
          'Scope Drive persistido apunta a una carpeta con naming legado; se reprovisionara',
        evaluationId: names.evaluationId,
        expectedScopeFolderName: names.baseFolderName,
        persistedScopeFolderName: persistedFolderName,
        persistedScopeFolderId: scopeFolderId,
      });
      return await this.provisioningService.provisionByEvaluationId(
        names.evaluationId,
      );
    } catch (error) {
      this.logger.warn({
        message:
          'No se pudo verificar metadata del scope Drive persistido; se reprovisionara',
        evaluationId: names.evaluationId,
        persistedScopeFolderId: scopeFolderId,
        error: error instanceof Error ? error.message : String(error),
      });
      return await this.provisioningService.provisionByEvaluationId(
        names.evaluationId,
      );
    }
  }
}

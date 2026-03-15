import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { QUEUES } from '@infrastructure/queue/queue.constants';
import {
  AUDIT_QUEUE_STATES,
  AUDIT_EXPORT_STATUS,
  AUDIT_JOB_NAMES,
} from '@modules/audit/interfaces/audit.constants';
import { AuditService } from './audit.service';
import { AuditHistoryFilters } from '@modules/audit/interfaces/audit-export.interface';
import {
  AuditExportJobResponseDto,
  AuditExportJobStatusDto,
} from '@modules/audit/dto/audit-export-job-response.dto';
import {
  AuditExportJobPayload,
  AuditExportJobProgress,
  AuditPreparedDownload,
} from '@modules/audit/interfaces/audit-export-job.interface';
import { AuditExportArtifactsService } from './audit-export-artifacts.service';
import { AuditExportCoordinatorService } from './audit-export-coordinator.service';
import { randomUUID } from 'crypto';
import { technicalSettings } from '@config/technical-settings';

@Injectable()
export class AuditExportJobsService {
  private readonly logger = new Logger(AuditExportJobsService.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly auditExportArtifacts: AuditExportArtifactsService,
    private readonly auditExportCoordinator: AuditExportCoordinatorService,
    @InjectQueue(QUEUES.AUDIT) private readonly auditQueue: Queue,
  ) {}

  async requestExport(
    requestedByUserId: string,
    filters: AuditHistoryFilters,
  ): Promise<AuditPreparedDownload | AuditExportJobResponseDto> {
    const lockToken = randomUUID();
    await this.auditExportCoordinator.acquireExportLock(lockToken);
    let shouldReleaseLock = true;
    let syncRefreshTimer: NodeJS.Timeout | undefined;
    let syncLockRefreshError: Error | undefined;

    try {
      const plan = await this.auditService.getExportPlan(filters);

      this.logger.log({
        context: AuditExportJobsService.name,
        message: 'Plan de exportacion de auditoria resuelto',
        requestedByUserId,
        mode: plan.mode,
        totalRows: plan.totalRows,
        estimatedFileCount: plan.estimatedFileCount,
      });

      if (plan.mode === 'sync') {
        const refreshLock = async () => {
          if (syncLockRefreshError) {
            throw syncLockRefreshError;
          }
          await this.auditExportCoordinator.refreshExportLock(lockToken);
        };
        await refreshLock();
        syncRefreshTimer = setInterval(() => {
          void this.auditExportCoordinator
            .refreshExportLock(lockToken)
            .catch((error: unknown) => {
              syncLockRefreshError =
                error instanceof Error ? error : new Error(String(error));
            });
        }, technicalSettings.audit.exportLockRefreshIntervalMs);
        syncRefreshTimer.unref?.();
        const prepared = await this.auditService.prepareSyncExport(
          filters,
          refreshLock,
        );
        if (syncLockRefreshError) {
          throw syncLockRefreshError;
        }
        if (syncRefreshTimer) {
          clearInterval(syncRefreshTimer);
        }
        await this.auditExportCoordinator.releaseExportLock(lockToken);
        shouldReleaseLock = false;
        return {
          fileName: prepared.fileName,
          mimeType: prepared.mimeType,
          stream: this.auditExportArtifacts.createReadStream(prepared.filePath),
          onFinish: async () => {
            await this.auditExportArtifacts.deleteFileIfExists(
              prepared.filePath,
            );
          },
          onAbort: async () => {
            await this.auditExportArtifacts.deleteFileIfExists(
              prepared.filePath,
            );
          },
        };
      }

      const jobId = randomUUID();
      const payload: AuditExportJobPayload = {
        requestedByUserId,
        filters,
        requestedAtIso: new Date().toISOString(),
        totalRows: plan.totalRows,
        estimatedFileCount: plan.estimatedFileCount,
        lockToken,
      };

      const progress: AuditExportJobProgress = {
        stage: AUDIT_EXPORT_STATUS.QUEUED,
        progress: 0,
        totalRows: plan.totalRows,
        estimatedFileCount: plan.estimatedFileCount,
        artifactName: null,
        artifactStorageKey: null,
        artifactExpiresAt: null,
        errorMessage: null,
      };

      const job = await this.auditQueue.add(
        AUDIT_JOB_NAMES.GENERATE_EXPORT,
        payload,
        {
          jobId,
        },
      );
      await job.updateProgress(progress);
      shouldReleaseLock = false;

      this.logger.log({
        context: AuditExportJobsService.name,
        message: 'Job de exportacion masiva de auditoria encolado',
        requestedByUserId,
        jobId: String(job.id),
        totalRows: plan.totalRows,
        estimatedFileCount: plan.estimatedFileCount,
      });

      return {
        jobId: String(job.id),
        status: AUDIT_EXPORT_STATUS.QUEUED,
        mode: plan.mode,
        totalRows: plan.totalRows,
        thresholdRows: plan.thresholdRows,
        rowsPerFile: plan.rowsPerFile,
        estimatedFileCount: plan.estimatedFileCount,
        artifactTtlSeconds: plan.artifactTtlSeconds,
      };
    } catch (error) {
      if (syncRefreshTimer) {
        clearInterval(syncRefreshTimer);
      }
      if (shouldReleaseLock) {
        await this.auditExportCoordinator.releaseExportLock(lockToken);
      }
      throw error;
    }
  }

  async getExportJobStatus(
    jobId: string,
    requestedByUserId: string,
  ): Promise<AuditExportJobStatusDto> {
    const job = await this.auditQueue.getJob(jobId);
    if (!job || job.name !== AUDIT_JOB_NAMES.GENERATE_EXPORT) {
      throw new NotFoundException('El job de exportacion no existe');
    }

    this.ensureJobOwnership(job, requestedByUserId);
    const rawProgress = await this.normalizeAndExpireProgress(job);
    const state = await job.getState();
    const status = this.resolveStatus(state, rawProgress.stage);

    return {
      jobId: String(job.id),
      status,
      progress: rawProgress.progress,
      totalRows: rawProgress.totalRows,
      estimatedFileCount: rawProgress.estimatedFileCount,
      readyForDownload: status === AUDIT_EXPORT_STATUS.READY,
      artifactName: rawProgress.artifactName ?? null,
      artifactExpiresAt: rawProgress.artifactExpiresAt ?? null,
      errorMessage: rawProgress.errorMessage ?? null,
    };
  }

  async downloadExportJob(
    jobId: string,
    requestedByUserId: string,
  ): Promise<AuditPreparedDownload> {
    const job = await this.auditQueue.getJob(jobId);
    if (!job || job.name !== AUDIT_JOB_NAMES.GENERATE_EXPORT) {
      throw new NotFoundException('El job de exportacion no existe');
    }

    this.ensureJobOwnership(job, requestedByUserId);
    const progress = await this.normalizeAndExpireProgress(job);
    const status = this.resolveStatus(await job.getState(), progress.stage);

    if (status === AUDIT_EXPORT_STATUS.EXPIRED) {
      throw new GoneException(
        'El reporte de auditoria ya expiro y debe generarse nuevamente',
      );
    }

    if (status !== AUDIT_EXPORT_STATUS.READY || !progress.artifactStorageKey) {
      throw new ConflictException(
        'El reporte de auditoria todavia no esta listo para descarga',
      );
    }

    let artifactPath: string;
    try {
      artifactPath = await this.auditExportArtifacts.assertArtifactExists(
        progress.artifactStorageKey,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        await job.updateProgress({
          ...progress,
          stage: AUDIT_EXPORT_STATUS.EXPIRED,
          progress: 100,
          artifactStorageKey: null,
        });
        throw new GoneException(
          'El reporte de auditoria ya expiro y debe generarse nuevamente',
        );
      }
      throw error;
    }

    this.logger.log({
      context: AuditExportJobsService.name,
      message: 'Descarga de artefacto de auditoria autorizada',
      requestedByUserId,
      jobId: String(job.id),
      artifactName: progress.artifactName,
    });

    return {
      fileName: progress.artifactName ?? 'reporte-auditoria-masivo.zip',
      mimeType: 'application/zip',
      stream: this.auditExportArtifacts.createReadStream(artifactPath),
      onFinish: async () => {
        await job.updateProgress({
          ...progress,
          stage: AUDIT_EXPORT_STATUS.EXPIRED,
          progress: 100,
        });
        await this.auditExportArtifacts.deleteArtifactByStorageKey(
          progress.artifactStorageKey,
        );
        await job.updateProgress({
          ...progress,
          stage: AUDIT_EXPORT_STATUS.EXPIRED,
          progress: 100,
          artifactStorageKey: null,
        });
      },
      onAbort: async () => undefined,
    };
  }

  private async normalizeAndExpireProgress(
    job: Job,
  ): Promise<AuditExportJobProgress> {
    const progress = this.normalizeProgress(job.progress);
    if (
      progress.stage === AUDIT_EXPORT_STATUS.EXPIRED &&
      progress.artifactStorageKey
    ) {
      await this.auditExportArtifacts.deleteArtifactByStorageKey(
        progress.artifactStorageKey,
      );
      const sanitizedExpiredProgress: AuditExportJobProgress = {
        ...progress,
        artifactStorageKey: null,
      };
      await job.updateProgress(sanitizedExpiredProgress);
      return sanitizedExpiredProgress;
    }

    if (
      progress.stage === AUDIT_EXPORT_STATUS.READY &&
      progress.artifactExpiresAt &&
      new Date(progress.artifactExpiresAt).getTime() <= Date.now()
    ) {
      await this.auditExportArtifacts.deleteArtifactByStorageKey(
        progress.artifactStorageKey,
      );
      const expiredProgress: AuditExportJobProgress = {
        ...progress,
        stage: AUDIT_EXPORT_STATUS.EXPIRED,
        artifactStorageKey: null,
      };
      await job.updateProgress(expiredProgress);
      return expiredProgress;
    }

    return progress;
  }

  private normalizeProgress(progress: unknown): AuditExportJobProgress {
    if (!progress || typeof progress !== 'object') {
      return {
        stage: AUDIT_EXPORT_STATUS.QUEUED,
        progress: 0,
        totalRows: 0,
        estimatedFileCount: 1,
        artifactName: null,
        artifactStorageKey: null,
        artifactExpiresAt: null,
        errorMessage: null,
      };
    }

    const value = progress as Partial<AuditExportJobProgress>;
    return {
      stage: value.stage ?? AUDIT_EXPORT_STATUS.QUEUED,
      progress: Number(value.progress ?? 0),
      totalRows: Number(value.totalRows ?? 0),
      estimatedFileCount: Number(value.estimatedFileCount ?? 1),
      artifactName: value.artifactName ?? null,
      artifactStorageKey: value.artifactStorageKey ?? null,
      artifactExpiresAt: value.artifactExpiresAt ?? null,
      errorMessage: value.errorMessage ?? null,
    };
  }

  private ensureJobOwnership(job: Job, requestedByUserId: string): void {
    const payload = job.data as Partial<AuditExportJobPayload>;
    if (payload.requestedByUserId !== requestedByUserId) {
      throw new ForbiddenException(
        'No tienes permisos para consultar este reporte de auditoria',
      );
    }
  }

  private resolveStatus(
    state: string,
    progressStage: AuditExportJobProgress['stage'],
  ): AuditExportJobStatusDto['status'] {
    if (progressStage === AUDIT_EXPORT_STATUS.READY) {
      return AUDIT_EXPORT_STATUS.READY;
    }
    if (progressStage === AUDIT_EXPORT_STATUS.EXPIRED) {
      return AUDIT_EXPORT_STATUS.EXPIRED;
    }
    if (
      progressStage === AUDIT_EXPORT_STATUS.FAILED ||
      state === AUDIT_QUEUE_STATES.FAILED
    ) {
      return AUDIT_EXPORT_STATUS.FAILED;
    }
    if (state === AUDIT_QUEUE_STATES.ACTIVE) {
      return AUDIT_EXPORT_STATUS.PROCESSING;
    }
    return AUDIT_EXPORT_STATUS.QUEUED;
  }
}

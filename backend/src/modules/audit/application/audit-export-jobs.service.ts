import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { QUEUES } from '@infrastructure/queue/queue.constants';
import {
  AUDIT_EXPORT_STATUS,
  AUDIT_JOB_IDS,
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

@Injectable()
export class AuditExportJobsService {
  constructor(
    private readonly auditService: AuditService,
    private readonly auditExportArtifacts: AuditExportArtifactsService,
    @InjectQueue(QUEUES.AUDIT) private readonly auditQueue: Queue,
  ) {}

  async requestExport(
    requestedByUserId: string,
    filters: AuditHistoryFilters,
  ): Promise<AuditPreparedDownload | AuditExportJobResponseDto> {
    const plan = await this.auditService.getExportPlan(filters);

    if (plan.mode === 'sync') {
      const prepared = await this.auditService.prepareSyncExport(filters);
      return {
        fileName: prepared.fileName,
        mimeType: prepared.mimeType,
        stream: this.auditExportArtifacts.createReadStream(prepared.filePath),
        onComplete: async () => {
          await this.auditExportArtifacts.deleteFileIfExists(prepared.filePath);
        },
      };
    }

    const existingJob = await this.auditQueue.getJob(AUDIT_JOB_IDS.EXPORT_SINGLETON);
    if (existingJob) {
      const state = await existingJob.getState();
      if (
        state === 'active' ||
        state === 'waiting' ||
        state === 'waiting-children' ||
        state === 'delayed' ||
        state === 'prioritized'
      ) {
        throw new ConflictException(
          'Ya existe una exportacion de auditoria en proceso. Intenta nuevamente en unos minutos.',
        );
      }

      await existingJob.remove();
    }

    const payload: AuditExportJobPayload = {
      requestedByUserId,
      filters,
      requestedAtIso: new Date().toISOString(),
      totalRows: plan.totalRows,
      estimatedFileCount: plan.estimatedFileCount,
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

    const job = await this.auditQueue.add(AUDIT_JOB_NAMES.GENERATE_EXPORT, payload, {
      jobId: AUDIT_JOB_IDS.EXPORT_SINGLETON,
    });
    await job.updateProgress(progress);

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

    if (status !== AUDIT_EXPORT_STATUS.READY || !progress.artifactStorageKey) {
      throw new ConflictException(
        'El reporte de auditoria todavia no esta listo para descarga',
      );
    }

    const artifactPath = await this.auditExportArtifacts.assertArtifactExists(
      progress.artifactStorageKey,
    );

    return {
      fileName: progress.artifactName ?? 'reporte-auditoria-masivo.zip',
      mimeType: 'application/zip',
      stream: this.auditExportArtifacts.createReadStream(artifactPath),
      onComplete: async () => {
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
    };
  }

  private async normalizeAndExpireProgress(
    job: Job,
  ): Promise<AuditExportJobProgress> {
    const progress = this.normalizeProgress(job.progress);
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
    if (progressStage === AUDIT_EXPORT_STATUS.FAILED || state === 'failed') {
      return AUDIT_EXPORT_STATUS.FAILED;
    }
    if (state === 'active') {
      return AUDIT_EXPORT_STATUS.PROCESSING;
    }
    return AUDIT_EXPORT_STATUS.QUEUED;
  }
}

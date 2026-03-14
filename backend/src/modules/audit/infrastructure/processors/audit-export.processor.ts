import { InjectQueue, OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { QUEUES } from '@infrastructure/queue/queue.constants';
import {
  AUDIT_EXPORT_STATUS,
  AUDIT_JOB_NAMES,
} from '@modules/audit/interfaces/audit.constants';
import {
  AuditExportCleanupPayload,
  AuditExportJobPayload,
  AuditExportJobProgress,
} from '@modules/audit/interfaces/audit-export-job.interface';
import { technicalSettings } from '@config/technical-settings';
import { Queue } from 'bullmq';
import { AuditService } from '@modules/audit/application/audit.service';
import { AuditExportArtifactsService } from '@modules/audit/application/audit-export-artifacts.service';

@Injectable()
@Processor(QUEUES.AUDIT)
export class AuditExportProcessor extends WorkerHost {
  private readonly logger = new Logger(AuditExportProcessor.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly auditExportArtifacts: AuditExportArtifactsService,
    @InjectQueue(QUEUES.AUDIT) private readonly auditQueue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === AUDIT_JOB_NAMES.GENERATE_EXPORT) {
      await this.handleGenerateExport(job as Job<AuditExportJobPayload>);
      return;
    }

    if (job.name === AUDIT_JOB_NAMES.EXPIRE_EXPORT_ARTIFACT) {
      await this.handleExpireArtifact(job as Job<AuditExportCleanupPayload>);
      return;
    }

    if (job.name === AUDIT_JOB_NAMES.CLEANUP_OLD_LOGS) {
      return;
    }

    throw new UnrecoverableError(`Job de auditoria no soportado: ${String(job.name)}`);
  }

  @OnWorkerEvent('error')
  onWorkerError(error: Error): void {
    this.logger.warn({
      context: AuditExportProcessor.name,
      message: 'Worker audit export emitio error',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  private async handleGenerateExport(
    job: Job<AuditExportJobPayload>,
  ): Promise<void> {
    await job.updateProgress({
      stage: AUDIT_EXPORT_STATUS.PROCESSING,
      progress: 1,
      totalRows: job.data.totalRows,
      estimatedFileCount: job.data.estimatedFileCount,
      artifactName: null,
      artifactStorageKey: null,
      artifactExpiresAt: null,
      errorMessage: null,
    } satisfies AuditExportJobProgress);

    try {
      const artifact = await this.auditService.generateAsyncExportArtifact(
        job.data.filters,
        job.data.totalRows,
        technicalSettings.audit.exportRowsPerFile,
        String(job.id),
        async (progressValue, estimatedFileCount) => {
          await job.updateProgress({
            stage: AUDIT_EXPORT_STATUS.PROCESSING,
            progress: progressValue,
            totalRows: job.data.totalRows,
            estimatedFileCount,
            artifactName: null,
            artifactStorageKey: null,
            artifactExpiresAt: null,
            errorMessage: null,
          } satisfies AuditExportJobProgress);
        },
      );

      await job.updateProgress({
        stage: AUDIT_EXPORT_STATUS.READY,
        progress: 100,
        totalRows: job.data.totalRows,
        estimatedFileCount: artifact.estimatedFileCount,
        artifactName: artifact.artifactName,
        artifactStorageKey: artifact.artifactStorageKey,
        artifactExpiresAt: artifact.artifactExpiresAt,
        errorMessage: null,
      } satisfies AuditExportJobProgress);

      await this.auditQueue.add(
        AUDIT_JOB_NAMES.EXPIRE_EXPORT_ARTIFACT,
        { exportJobId: String(job.id) },
        {
          delay: technicalSettings.audit.exportArtifactTtlSeconds * 1000,
          jobId: `expire-${String(job.id)}-${Date.now()}`,
        },
      );
    } catch (error) {
      await job.updateProgress({
        stage: AUDIT_EXPORT_STATUS.FAILED,
        progress: 100,
        totalRows: job.data.totalRows,
        estimatedFileCount: job.data.estimatedFileCount,
        artifactName: null,
        artifactStorageKey: null,
        artifactExpiresAt: null,
        errorMessage:
          error instanceof Error ? error.message : 'Error generando exportacion',
      } satisfies AuditExportJobProgress);
      throw error;
    }
  }

  private async handleExpireArtifact(
    job: Job<AuditExportCleanupPayload>,
  ): Promise<void> {
    const exportJob = await this.auditQueue.getJob(job.data.exportJobId);
    if (!exportJob || exportJob.name !== AUDIT_JOB_NAMES.GENERATE_EXPORT) {
      return;
    }

    const progress = exportJob.progress as Partial<AuditExportJobProgress>;
    if (
      progress.stage !== AUDIT_EXPORT_STATUS.READY ||
      !progress.artifactStorageKey
    ) {
      return;
    }

    await this.auditExportArtifacts.deleteArtifactByStorageKey(
      progress.artifactStorageKey,
    );

    await exportJob.updateProgress({
      stage: AUDIT_EXPORT_STATUS.EXPIRED,
      progress: 100,
      totalRows: Number(progress.totalRows ?? 0),
      estimatedFileCount: Number(progress.estimatedFileCount ?? 1),
      artifactName: progress.artifactName ?? null,
      artifactStorageKey: null,
      artifactExpiresAt: progress.artifactExpiresAt ?? null,
      errorMessage: null,
    } satisfies AuditExportJobProgress);
  }
}

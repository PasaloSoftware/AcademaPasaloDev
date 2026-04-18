import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
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
import { AuditExportCoordinatorService } from '@modules/audit/application/audit-export-coordinator.service';
import { AuditExportReadyNotificationService } from '@modules/notifications/application/audit-export-ready-notification.service';

@Injectable()
@Processor(QUEUES.AUDIT)
export class AuditExportProcessor extends WorkerHost {
  private readonly logger = new Logger(AuditExportProcessor.name);

  private formatUnknownError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Error no identificado';
  }

  constructor(
    private readonly auditService: AuditService,
    private readonly auditExportArtifacts: AuditExportArtifactsService,
    private readonly auditExportCoordinator: AuditExportCoordinatorService,
    private readonly auditExportReadyNotificationService: AuditExportReadyNotificationService,
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

    throw new UnrecoverableError(
      `Job de auditoria no soportado: ${String(job.name)}`,
    );
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
    this.logger.log({
      context: AuditExportProcessor.name,
      message: 'Iniciando job de exportacion masiva de auditoria',
      jobId: String(job.id),
      totalRows: job.data.totalRows,
      estimatedFileCount: job.data.estimatedFileCount,
    });

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

    let refreshTimer: NodeJS.Timeout | undefined;
    let refreshFailure: Error | undefined;
    let generatedArtifact:
      | {
          artifactName: string;
          artifactStorageKey: string;
          artifactExpiresAt: string;
          estimatedFileCount: number;
        }
      | undefined;

    try {
      await this.auditExportCoordinator.refreshExportLock(job.data.lockToken);
      refreshTimer = setInterval(() => {
        void this.auditExportCoordinator
          .refreshExportLock(job.data.lockToken)
          .catch((error: unknown) => {
            refreshFailure =
              error instanceof Error
                ? error
                : new Error(this.formatUnknownError(error));
          });
      }, technicalSettings.audit.exportLockRefreshIntervalMs);
      refreshTimer.unref?.();
      generatedArtifact = await this.auditService.generateAsyncExportArtifact(
        job.data.filters,
        job.data.totalRows,
        technicalSettings.audit.exportRowsPerFile,
        String(job.id),
        job.data.exportTemplate,
        async (progressValue, estimatedFileCount) => {
          if (refreshFailure) {
            throw refreshFailure;
          }
          await this.auditExportCoordinator.refreshExportLock(
            job.data.lockToken,
          );
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
        async () => {
          if (refreshFailure) {
            throw refreshFailure;
          }
          await this.auditExportCoordinator.refreshExportLock(
            job.data.lockToken,
          );
        },
      );
      if (refreshFailure) {
        throw refreshFailure;
      }
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }

      await job.updateProgress({
        stage: AUDIT_EXPORT_STATUS.READY,
        progress: 100,
        totalRows: job.data.totalRows,
        estimatedFileCount: generatedArtifact.estimatedFileCount,
        artifactName: generatedArtifact.artifactName,
        artifactStorageKey: generatedArtifact.artifactStorageKey,
        artifactExpiresAt: generatedArtifact.artifactExpiresAt,
        errorMessage: null,
      } satisfies AuditExportJobProgress);

      this.logger.log({
        context: AuditExportProcessor.name,
        message: 'Job de exportacion masiva de auditoria finalizado',
        jobId: String(job.id),
        artifactName: generatedArtifact.artifactName,
        estimatedFileCount: generatedArtifact.estimatedFileCount,
      });

      await this.auditExportCoordinator.releaseExportLock(job.data.lockToken);
      try {
        await this.auditExportReadyNotificationService.createReadyNotification({
          requestedByUserId: job.data.requestedByUserId,
          exportJobId: String(job.id),
          artifactName: generatedArtifact.artifactName,
          artifactExpiresAt: generatedArtifact.artifactExpiresAt,
          estimatedFileCount: generatedArtifact.estimatedFileCount,
        });
      } catch (notificationError) {
        this.logger.warn({
          context: AuditExportProcessor.name,
          message:
            'No se pudo crear la notificacion de reporte de auditoria listo; el reporte seguira disponible para descarga',
          jobId: String(job.id),
          requestedByUserId: job.data.requestedByUserId,
          error:
            notificationError instanceof Error
              ? notificationError.message
              : String(notificationError),
        });
      }

      try {
        await this.auditQueue.add(
          AUDIT_JOB_NAMES.EXPIRE_EXPORT_ARTIFACT,
          { exportJobId: String(job.id) },
          {
            delay: technicalSettings.audit.exportArtifactTtlSeconds * 1000,
            jobId: `expire-${String(job.id)}-${Date.now()}`,
          },
        );
      } catch (error) {
        this.logger.error({
          context: AuditExportProcessor.name,
          message:
            'No se pudo programar la expiracion diferida del artefacto de auditoria; se usara expiracion por TTL en lectura',
          jobId: String(job.id),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } catch (error) {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
      this.logger.error({
        context: AuditExportProcessor.name,
        message: 'Fallo la generacion del export masivo de auditoria',
        jobId: String(job.id),
        error: error instanceof Error ? error.message : String(error),
      });
      try {
        if (generatedArtifact?.artifactStorageKey) {
          try {
            await this.auditExportArtifacts.deleteArtifactByStorageKey(
              generatedArtifact.artifactStorageKey,
            );
          } catch (cleanupError) {
            this.logger.error({
              context: AuditExportProcessor.name,
              message:
                'No se pudo limpiar el artefacto temporal tras fallar el export masivo de auditoria',
              jobId: String(job.id),
              artifactStorageKey: generatedArtifact.artifactStorageKey,
              error:
                cleanupError instanceof Error
                  ? cleanupError.message
                  : String(cleanupError),
            });
          }
        }

        try {
          await job.updateProgress({
            stage: AUDIT_EXPORT_STATUS.FAILED,
            progress: 100,
            totalRows: job.data.totalRows,
            estimatedFileCount: job.data.estimatedFileCount,
            artifactName: null,
            artifactStorageKey: null,
            artifactExpiresAt: null,
            errorMessage:
              error instanceof Error
                ? error.message
                : 'Error generando exportacion',
          } satisfies AuditExportJobProgress);
        } catch (progressError) {
          this.logger.error({
            context: AuditExportProcessor.name,
            message:
              'No se pudo persistir el estado FAILED del export masivo de auditoria',
            jobId: String(job.id),
            error:
              progressError instanceof Error
                ? progressError.message
                : String(progressError),
          });
        }
      } finally {
        await this.auditExportCoordinator.releaseExportLock(job.data.lockToken);
      }
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

    this.logger.log({
      context: AuditExportProcessor.name,
      message: 'Artefacto temporal de auditoria expirado y eliminado',
      exportJobId: job.data.exportJobId,
      cleanupJobId: String(job.id),
    });
  }
}

import { InjectQueue } from '@nestjs/bullmq';
import {
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { technicalSettings } from '@config/technical-settings';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { Job, Queue } from 'bullmq';
import { QUEUES } from '@infrastructure/queue/queue.constants';
import {
  AUDIT_JOB_IDS,
  AUDIT_JOB_NAMES,
  AUDIT_QUEUE_STATES,
} from '@modules/audit/interfaces/audit.constants';
import { AuditExportPlan } from '@modules/audit/interfaces/audit-export.interface';

@Injectable()
export class AuditExportCoordinatorService {
  private readonly logger = new Logger(AuditExportCoordinatorService.name);
  private readonly releaseRetryDelayMs = 100;
  private readonly releaseRetryAttempts = 3;
  private readonly releaseFailureFallbackTtlSeconds = 60;

  constructor(
    private readonly cacheService: RedisCacheService,
    @InjectQueue(QUEUES.AUDIT) private readonly auditQueue: Queue,
  ) {}

  private formatUnknownError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Error no identificado';
  }

  async acquireExportLock(lockToken: string): Promise<void> {
    let lockAcquired = false;

    try {
      lockAcquired = await this.cacheService.setIfNotExists(
        AUDIT_JOB_IDS.EXPORT_LOCK_KEY,
        lockToken,
        technicalSettings.audit.exportLockTtlSeconds,
      );
      if (!lockAcquired) {
        throw new ConflictException(
          'Ya existe una exportacion de auditoria en proceso. Intenta nuevamente en unos minutos.',
        );
      }

      const hasQueuedOrActiveExport = await this.hasQueuedOrActiveExportJob();
      if (hasQueuedOrActiveExport) {
        throw new ConflictException(
          'Ya existe una exportacion de auditoria en proceso. Intenta nuevamente en unos minutos.',
        );
      }
    } catch (error) {
      if (lockAcquired) {
        await this.releaseExportLockQuietly(lockToken);
      }

      if (error instanceof ConflictException) {
        throw error;
      }

      throw new ServiceUnavailableException(
        'No se pudo coordinar el bloqueo global del export de auditoria',
      );
    }
  }

  async refreshExportLock(lockToken: string): Promise<void> {
    try {
      const renewed = await this.cacheService.expireIfValueMatches(
        AUDIT_JOB_IDS.EXPORT_LOCK_KEY,
        lockToken,
        technicalSettings.audit.exportLockTtlSeconds,
      );
      if (!renewed) {
        this.logger.error({
          context: AuditExportCoordinatorService.name,
          message: 'Se perdio el lock global del export de auditoria',
          lockToken,
        });
        throw new ConflictException(
          'Se perdio el lock global del export de auditoria durante la ejecucion',
        );
      }
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      this.logger.error({
        context: AuditExportCoordinatorService.name,
        message:
          'Fallo tecnico al renovar el lock global del export de auditoria',
        lockToken,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new ServiceUnavailableException(
        'No se pudo renovar el lock global del export de auditoria',
      );
    }
  }

  async releaseExportLock(lockToken: string): Promise<boolean> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.releaseRetryAttempts; attempt += 1) {
      try {
        const released = await this.cacheService.delIfValueMatches(
          AUDIT_JOB_IDS.EXPORT_LOCK_KEY,
          lockToken,
        );
        if (released) {
          return true;
        }

        this.logger.warn({
          context: AuditExportCoordinatorService.name,
          message:
            'El lock global del export de auditoria ya no pertenecia al proceso al intentar liberarlo',
          lockToken,
          attempt,
        });
        return true;
      } catch (error) {
        lastError = error;
        if (attempt < this.releaseRetryAttempts) {
          await this.delay(this.releaseRetryDelayMs);
        }
      }
    }

    try {
      const shortened = await this.cacheService.expireIfValueMatches(
        AUDIT_JOB_IDS.EXPORT_LOCK_KEY,
        lockToken,
        this.releaseFailureFallbackTtlSeconds,
      );
      if (shortened) {
        this.logger.error({
          context: AuditExportCoordinatorService.name,
          message:
            'No se pudo liberar el lock global del export de auditoria; se acorto su TTL como fallback',
          lockToken,
          fallbackTtlSeconds: this.releaseFailureFallbackTtlSeconds,
          error: this.formatUnknownError(lastError),
        });
        return false;
      }
    } catch (fallbackError) {
      lastError = fallbackError;
    }

    this.logger.error({
      context: AuditExportCoordinatorService.name,
      message:
        'No se pudo liberar ni acortar el TTL del lock global del export de auditoria',
      lockToken,
      error: this.formatUnknownError(lastError),
    });
    return false;
  }

  buildExportPlan(totalRows: number): AuditExportPlan {
    const thresholdRows = technicalSettings.audit.exportSyncThresholdRows;
    const rowsPerFile = technicalSettings.audit.exportRowsPerFile;

    return {
      mode: totalRows >= thresholdRows ? 'async' : 'sync',
      totalRows,
      thresholdRows,
      rowsPerFile,
      estimatedFileCount:
        totalRows === 0 ? 1 : Math.ceil(totalRows / rowsPerFile),
      artifactTtlSeconds: technicalSettings.audit.exportArtifactTtlSeconds,
    };
  }

  private async hasQueuedOrActiveExportJob(): Promise<boolean> {
    const jobs = await this.auditQueue.getJobs(
      [
        AUDIT_QUEUE_STATES.ACTIVE,
        AUDIT_QUEUE_STATES.WAITING,
        AUDIT_QUEUE_STATES.WAITING_CHILDREN,
        AUDIT_QUEUE_STATES.DELAYED,
        AUDIT_QUEUE_STATES.PRIORITIZED,
      ],
      0,
      -1,
    );

    return jobs.some((job) => this.isActiveAuditExportJob(job));
  }

  private isActiveAuditExportJob(job: Job): boolean {
    return job.name === AUDIT_JOB_NAMES.GENERATE_EXPORT;
  }

  private async releaseExportLockQuietly(lockToken: string): Promise<void> {
    try {
      await this.cacheService.delIfValueMatches(
        AUDIT_JOB_IDS.EXPORT_LOCK_KEY,
        lockToken,
      );
    } catch {
      this.logger.warn({
        context: AuditExportCoordinatorService.name,
        message:
          'No se pudo liberar de forma compensatoria el lock global del export de auditoria',
        lockToken,
      });
    }
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

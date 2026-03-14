import { ConflictException, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { technicalSettings } from '@config/technical-settings';
import { QUEUES } from '@infrastructure/queue/queue.constants';
import {
  AUDIT_JOB_IDS,
  AUDIT_JOB_NAMES,
} from '@modules/audit/interfaces/audit.constants';
import { AuditExportPlan } from '@modules/audit/interfaces/audit-export.interface';

@Injectable()
export class AuditExportCoordinatorService {
  constructor(
    @InjectQueue(QUEUES.AUDIT) private readonly auditQueue: Queue,
  ) {}

  async ensureNoExportInProgress(): Promise<void> {
    const hasRunningExport = await this.hasExportInProgress();

    if (!hasRunningExport) {
      return;
    }

    throw new ConflictException(
      'Ya existe una exportacion de auditoria en proceso. Intenta nuevamente en unos minutos.',
    );
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

  private async hasExportInProgress(): Promise<boolean> {
    const job = await this.auditQueue.getJob(AUDIT_JOB_IDS.EXPORT_SINGLETON);
    if (!job || !this.isActiveAuditExportJob(job)) {
      return false;
    }

    const state = await job.getState();
    return (
      state === 'active' ||
      state === 'waiting' ||
      state === 'waiting-children' ||
      state === 'delayed' ||
      state === 'prioritized'
    );
  }

  private isActiveAuditExportJob(job: Job): boolean {
    return job.name === AUDIT_JOB_NAMES.GENERATE_EXPORT;
  }
}

import {
  Injectable,
  Logger,
  InternalServerErrorException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { stream as ExcelStream } from 'exceljs';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AuditLogRepository } from '@modules/audit/infrastructure/audit-log.repository';
import { AuditActionRepository } from '@modules/audit/infrastructure/audit-action.repository';
import { AuditLog } from '@modules/audit/domain/audit-log.entity';
import { UnifiedAuditHistoryDto } from '@modules/audit/dto/unified-audit-history.dto';
import { AuditExportRepository } from '@modules/audit/infrastructure/audit-export.repository';
import { QUEUES } from '@infrastructure/queue/queue.constants';
import { JobScheduler } from '@infrastructure/queue/queue.interfaces';
import { technicalSettings } from '@config/technical-settings';
import {
  AUDIT_SOURCES,
  AUDIT_LABELS,
  AUDIT_EXCEL_CONFIG,
  AUDIT_JOB_NAMES,
} from '@modules/audit/interfaces/audit.constants';
import {
  AuditExportPlan,
  AuditHistoryFilters,
  ParsedAuditHistoryFilters,
} from '@modules/audit/interfaces/audit-export.interface';
import { AuditExportArtifactsService } from './audit-export-artifacts.service';
import type { EntityManager } from 'typeorm';
import { AuditExportCoordinatorService } from './audit-export-coordinator.service';
import * as path from 'path';

@Injectable()
export class AuditService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuditService.name);
  private readonly actionIdCache = new Map<string, string>();

  constructor(
    private readonly auditLogRepository: AuditLogRepository,
    private readonly auditActionRepository: AuditActionRepository,
    private readonly auditExportRepository: AuditExportRepository,
    private readonly auditExportCoordinator: AuditExportCoordinatorService,
    private readonly auditExportArtifacts: AuditExportArtifactsService,
    @InjectQueue(QUEUES.AUDIT) private readonly auditQueue: Queue,
  ) {}

  async onApplicationBootstrap() {
    if (!technicalSettings.queue.enableRepeatSchedulers) {
      return;
    }
    await this.setupRepeatableJobs();
  }

  private parseHistoryFilters(filters: AuditHistoryFilters): ParsedAuditHistoryFilters {
    return {
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      userId: filters.userId,
      source: filters.source,
      actionCode: filters.actionCode,
    };
  }

  async setupRepeatableJobs() {
    const jobName = AUDIT_JOB_NAMES.CLEANUP_OLD_LOGS;
    const cronPattern = technicalSettings.audit.cleanupCronPattern;

    const schedulers =
      (await this.auditQueue.getJobSchedulers()) as unknown as JobScheduler[];
    const existingScheduler = schedulers.find((s) => s.name === jobName);

    if (existingScheduler) {
      const currentPattern =
        existingScheduler.cron || existingScheduler.pattern;

      if (currentPattern !== cronPattern) {
        this.logger.log({
          context: AuditService.name,
          message:
            'Detectado cambio en el patrón de horario. Actualizando Redis...',
          oldPattern: currentPattern,
          newPattern: cronPattern,
        });

        await this.auditQueue.removeJobScheduler(jobName);
        await this.auditQueue.add(
          jobName,
          {},
          {
            repeat: { pattern: cronPattern },
          },
        );
      }
    } else {
      await this.auditQueue.add(
        jobName,
        {},
        {
          repeat: { pattern: cronPattern },
        },
      );

      this.logger.log({
        context: AuditService.name,
        message: 'Tarea repetitiva de limpieza registrada por primera vez',
        job: jobName,
        pattern: cronPattern,
      });
    }
  }

  async logAction(
    userId: string,
    actionCode: string,
    manager?: EntityManager,
  ): Promise<AuditLog> {
    let actionId = this.actionIdCache.get(actionCode);

    if (!actionId) {
      const action = await this.auditActionRepository.findByCode(
        actionCode,
        manager,
      );

      if (!action) {
        this.logger.error({
          context: AuditService.name,
          message:
            'Crítico: El código de acción de auditoría no está configurado en la BD',
          actionCode,
          userId,
        });
        throw new InternalServerErrorException(
          'Error de integridad: Código de auditoría no válido',
        );
      }

      actionId = action.id;
      this.actionIdCache.set(actionCode, actionId);
    }

    const log = await this.auditLogRepository.create(
      {
        userId,
        auditActionId: actionId,
        eventDatetime: new Date(),
      },
      manager,
    );

    return log;
  }

  async getUnifiedHistory(
    filters: AuditHistoryFilters,
    maxAllowedLimit = 100,
  ): Promise<UnifiedAuditHistoryDto[]> {
    const parsedFilters = this.parseHistoryFilters(filters);
    const safeLimit = filters.limit
      ? Math.min(filters.limit, maxAllowedLimit)
      : 50;
    return await this.auditExportRepository.findUnifiedHistory(
      parsedFilters,
      safeLimit,
    );
  }

  async countUnifiedHistory(filters: AuditHistoryFilters): Promise<number> {
    const parsedFilters = this.parseHistoryFilters(filters);
    return await this.auditExportRepository.countUnifiedHistory(parsedFilters);
  }

  async getExportPlan(filters: AuditHistoryFilters): Promise<AuditExportPlan> {
    await this.auditExportCoordinator.ensureNoExportInProgress();
    const totalRows = await this.countUnifiedHistory(filters);
    return this.auditExportCoordinator.buildExportPlan(totalRows);
  }

  async prepareSyncExport(filters: AuditHistoryFilters): Promise<{
    fileName: string;
    filePath: string;
    mimeType: string;
  }> {
    const now = new Date();
    const fileName = this.auditExportArtifacts.buildSyncFileName(now);
    const filePath = await this.auditExportArtifacts.createSyncTempFile(fileName);

    await this.writeWorkbookToFile(filters, filePath);

    return {
      fileName,
      filePath,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  async generateAsyncExportArtifact(
    filters: AuditHistoryFilters,
    totalRows: number,
    rowsPerFile: number,
    jobId: string,
    onProgress?: (progress: number, estimatedFileCount: number) => Promise<void>,
  ): Promise<{
    artifactName: string;
    artifactStorageKey: string;
    artifactExpiresAt: string;
    estimatedFileCount: number;
  }> {
    const workspace = await this.auditExportArtifacts.createWorkspace(jobId);
    const estimatedFileCount =
      totalRows === 0 ? 1 : Math.ceil(totalRows / rowsPerFile);
    const generatedFiles: Array<{ filePath: string; entryName: string }> = [];

    try {
      for (let partIndex = 0; partIndex < estimatedFileCount; partIndex += 1) {
        const offset = partIndex * rowsPerFile;
        const remaining = totalRows - offset;
        const maxRows =
          totalRows === 0 ? 0 : Math.min(rowsPerFile, Math.max(remaining, 0));
        const partName = this.auditExportArtifacts.buildAsyncPartFileName(
          partIndex + 1,
          estimatedFileCount,
        );
        const partPath = path.join(workspace, partName);

        await this.writeWorkbookToFile(filters, partPath, { offset, maxRows });
        generatedFiles.push({ filePath: partPath, entryName: partName });

        if (onProgress) {
          await onProgress(
            Math.min(
              99,
              Math.round(((partIndex + 1) / estimatedFileCount) * 100),
            ),
            estimatedFileCount,
          );
        }
      }

      const now = new Date();
      const artifact = await this.auditExportArtifacts.reserveArtifact(
        this.auditExportArtifacts.buildAsyncZipName(now),
      );
      await this.auditExportArtifacts.zipFiles(generatedFiles, artifact.filePath);

      return {
        artifactName: artifact.fileName,
        artifactStorageKey: artifact.storageKey,
        artifactExpiresAt: new Date(
          now.getTime() + technicalSettings.audit.exportArtifactTtlSeconds * 1000,
        ).toISOString(),
        estimatedFileCount,
      };
    } finally {
      await this.auditExportArtifacts.deleteDirectoryIfExists(workspace);
    }
  }

  private async writeWorkbookToFile(
    filters: AuditHistoryFilters,
    filePath: string,
    options?: { offset?: number; maxRows?: number },
  ): Promise<void> {
    const parsedFilters = this.parseHistoryFilters(filters);
    const offsetStart = Math.max(0, options?.offset ?? 0);
    const maxRows = options?.maxRows;
    const pageSize = Math.min(5000, maxRows && maxRows > 0 ? maxRows : 5000);

    const workbook = new ExcelStream.xlsx.WorkbookWriter({
      filename: filePath,
      useStyles: true,
      useSharedStrings: false,
    });
    const worksheet = workbook.addWorksheet(AUDIT_EXCEL_CONFIG.SHEET_NAME);

    worksheet.columns = [
      {
        header: AUDIT_EXCEL_CONFIG.COLUMNS.DATETIME,
        key: 'datetime',
        width: 25,
      },
      {
        header: AUDIT_EXCEL_CONFIG.COLUMNS.USER_NAME,
        key: 'userName',
        width: 30,
      },
      {
        header: AUDIT_EXCEL_CONFIG.COLUMNS.USER_EMAIL,
        key: 'userEmail',
        width: 35,
      },
      {
        header: AUDIT_EXCEL_CONFIG.COLUMNS.USER_ROLE,
        key: 'userRole',
        width: 20,
      },
      {
        header: AUDIT_EXCEL_CONFIG.COLUMNS.ACTION_NAME,
        key: 'actionName',
        width: 35,
      },
      {
        header: AUDIT_EXCEL_CONFIG.COLUMNS.ACTION_CODE,
        key: 'actionCode',
        width: 25,
      },
      { header: AUDIT_EXCEL_CONFIG.COLUMNS.SOURCE, key: 'source', width: 15 },
      { header: AUDIT_EXCEL_CONFIG.COLUMNS.IP, key: 'ipAddress', width: 20 },
      {
        header: AUDIT_EXCEL_CONFIG.COLUMNS.USER_AGENT,
        key: 'userAgent',
        width: 50,
      },
    ];

    worksheet.getRow(1).font = {
      bold: true,
      color: { argb: AUDIT_EXCEL_CONFIG.HEADER_FONT_COLOR },
    };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: AUDIT_EXCEL_CONFIG.HEADER_FILL_COLOR },
    };
    worksheet.getRow(1).commit();

    let offset = offsetStart;
    let writtenRows = 0;

    while (true) {
      const remainingRows =
        maxRows == null ? pageSize : Math.max(0, maxRows - writtenRows);
      if (maxRows != null && remainingRows === 0) {
        break;
      }

      const batch = await this.auditExportRepository.findUnifiedHistory(
        parsedFilters,
        Math.min(pageSize, remainingRows || pageSize),
        offset,
      );

      if (!batch.length) {
        break;
      }

      for (const row of batch) {
        worksheet
          .addRow({
            ...row,
            source:
              row.source === AUDIT_SOURCES.SECURITY
                ? AUDIT_LABELS.SOURCE_SECURITY
                : AUDIT_LABELS.SOURCE_AUDIT,
            datetime: row.datetime.toLocaleString(AUDIT_EXCEL_CONFIG.LOCALE_ES_PE),
          })
          .commit();
      }

      writtenRows += batch.length;
      offset += batch.length;
    }

    worksheet.commit();
    await workbook.commit();
  }
}

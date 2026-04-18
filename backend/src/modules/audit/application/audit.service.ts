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
  AuditExportCursor,
  AuditHistoryFilters,
  ParsedAuditHistoryFilters,
} from '@modules/audit/interfaces/audit-export.interface';
import { AuditExportArtifactsService } from './audit-export-artifacts.service';
import type { EntityManager } from 'typeorm';
import { AuditExportCoordinatorService } from './audit-export-coordinator.service';
import * as path from 'path';
import {
  parseBusinessWindowEndToUtc,
  parseBusinessWindowStartToUtc,
} from '@common/utils/peru-time.util';

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

  private parseHistoryFilters(
    filters: AuditHistoryFilters,
  ): ParsedAuditHistoryFilters {
    return {
      startDate: filters.startDate
        ? parseBusinessWindowStartToUtc(filters.startDate, 'startDate')
        : undefined,
      endDate: filters.endDate
        ? parseBusinessWindowEndToUtc(filters.endDate, 'endDate')
        : undefined,
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
            'Detectado cambio en el patron de horario. Actualizando Redis...',
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
            'Critico: El codigo de accion de auditoria no esta configurado en la BD',
          actionCode,
          userId,
        });
        throw new InternalServerErrorException(
          'Error de integridad: Codigo de auditoria no valido',
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
    const totalRows = await this.countUnifiedHistory(filters);
    return this.auditExportCoordinator.buildExportPlan(totalRows);
  }

  async prepareSyncExport(
    filters: AuditHistoryFilters,
    onBatchProcessed?: () => Promise<void>,
  ): Promise<{
    fileName: string;
    filePath: string;
    mimeType: string;
  }> {
    const now = new Date();
    const fileName = this.auditExportArtifacts.buildSyncFileName(now);
    const filePath =
      await this.auditExportArtifacts.createSyncTempFile(fileName);

    try {
      await this.writeWorkbookToFile(filters, filePath, {
        onBatchProcessed,
      });
    } catch (error) {
      await this.auditExportArtifacts.deleteFileIfExists(filePath);
      throw error;
    }

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
    onProgress?: (
      progress: number,
      estimatedFileCount: number,
    ) => Promise<void>,
    onBatchProcessed?: () => Promise<void>,
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
    let cursor: AuditExportCursor | undefined;
    let artifactFilePath: string | undefined;

    try {
      this.logger.log({
        context: AuditService.name,
        message: 'Iniciando generacion asincrona de artefacto de auditoria',
        jobId,
        totalRows,
        rowsPerFile,
        estimatedFileCount,
      });

      for (let partIndex = 0; partIndex < estimatedFileCount; partIndex += 1) {
        const remaining = totalRows - partIndex * rowsPerFile;
        const maxRows =
          totalRows === 0 ? 0 : Math.min(rowsPerFile, Math.max(remaining, 0));
        const partName = this.auditExportArtifacts.buildAsyncPartFileName(
          partIndex + 1,
          estimatedFileCount,
        );
        const partPath = path.join(workspace, partName);

        cursor = await this.writeWorkbookToFile(filters, partPath, {
          cursor,
          maxRows,
          onBatchProcessed,
        });
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
      artifactFilePath = artifact.filePath;
      await this.auditExportArtifacts.zipFiles(
        generatedFiles,
        artifact.filePath,
      );

      this.logger.log({
        context: AuditService.name,
        message: 'Artefacto asincrono de auditoria generado exitosamente',
        jobId,
        artifactName: artifact.fileName,
        storageKey: artifact.storageKey,
        estimatedFileCount,
      });

      return {
        artifactName: artifact.fileName,
        artifactStorageKey: artifact.storageKey,
        artifactExpiresAt: new Date(
          now.getTime() +
            technicalSettings.audit.exportArtifactTtlSeconds * 1000,
        ).toISOString(),
        estimatedFileCount,
      };
    } catch (error) {
      if (artifactFilePath) {
        await this.auditExportArtifacts.deleteFileIfExists(artifactFilePath);
      }
      throw error;
    } finally {
      await this.auditExportArtifacts.deleteDirectoryIfExists(workspace);
    }
  }

  private async writeWorkbookToFile(
    filters: AuditHistoryFilters,
    filePath: string,
    options?: {
      cursor?: AuditExportCursor;
      maxRows?: number;
      onBatchProcessed?: () => Promise<void>;
    },
  ): Promise<AuditExportCursor | undefined> {
    const parsedFilters = this.parseHistoryFilters(filters);
    const maxRows = options?.maxRows;
    const pageSize = Math.min(
      technicalSettings.audit.exportReadBatchSize,
      maxRows && maxRows > 0
        ? maxRows
        : technicalSettings.audit.exportReadBatchSize,
    );

    const workbook = new ExcelStream.xlsx.WorkbookWriter({
      filename: filePath,
      useStyles: true,
      useSharedStrings: false,
    });
    const worksheet = workbook.addWorksheet(AUDIT_EXCEL_CONFIG.SHEET_NAME);

    worksheet.columns = [
      {
        header: AUDIT_EXCEL_CONFIG.COLUMNS.ID,
        key: 'id',
        width: 20,
      },
      {
        header: AUDIT_EXCEL_CONFIG.COLUMNS.DATETIME,
        key: 'datetime',
        width: 25,
      },
      {
        header: AUDIT_EXCEL_CONFIG.COLUMNS.USER_ID,
        key: 'userId',
        width: 18,
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

    let writtenRows = 0;
    let cursor = options?.cursor;
    let lastCursor = cursor;

    while (true) {
      const remainingRows =
        maxRows == null ? pageSize : Math.max(0, maxRows - writtenRows);
      if (maxRows != null && remainingRows === 0) {
        break;
      }

      const batch = await this.auditExportRepository.findUnifiedHistoryChunk(
        parsedFilters,
        Math.min(pageSize, remainingRows || pageSize),
        cursor,
      );

      if (!batch.length) {
        break;
      }

      for (const row of batch) {
        worksheet
          .addRow({
            ...row,
            userId: row.userId ?? '',
            userName:
              row.userName === AUDIT_LABELS.UNKNOWN_USER ? '' : row.userName,
            userEmail:
              row.userEmail === AUDIT_LABELS.NOT_AVAILABLE ? ''
              : row.userEmail,
            userRole:
              row.userRole === AUDIT_LABELS.UNKNOWN_ROLE ? '' : row.userRole,
            actionName:
              row.actionName === AUDIT_LABELS.UNKNOWN_ACTION
                ? ''
                : row.actionName,
            actionCode:
              row.actionCode === AUDIT_LABELS.UNKNOWN_ACTION
                ? ''
                : row.actionCode,
            ipAddress:
              row.ipAddress === AUDIT_LABELS.NOT_AVAILABLE ? '' : row.ipAddress,
            userAgent:
              row.userAgent === AUDIT_LABELS.NOT_AVAILABLE ? ''
              : row.userAgent,
            source:
              row.source === AUDIT_SOURCES.SECURITY
                ? AUDIT_LABELS.SOURCE_SECURITY
                : AUDIT_LABELS.SOURCE_AUDIT,
            datetime: this.formatExcelDatetime(row.datetime),
          })
          .commit();

        lastCursor = {
          datetime: row.datetime,
          sourceRank: row.source === AUDIT_SOURCES.SECURITY ? 2 : 1,
          entityId: Number(String(row.id).split('-')[1]),
        };
      }

      writtenRows += batch.length;
      cursor = lastCursor;

      if (options?.onBatchProcessed) {
        await options.onBatchProcessed();
      }
    }

    worksheet.commit();
    await workbook.commit();
    return lastCursor;
  }

  private formatExcelDatetime(date: Date): string {
    return date.toLocaleString(AUDIT_EXCEL_CONFIG.LOCALE_ES_PE, {
      timeZone: AUDIT_EXCEL_CONFIG.TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }
}

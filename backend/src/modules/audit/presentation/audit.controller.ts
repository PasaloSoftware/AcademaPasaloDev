import {
  Controller,
  Get,
  HttpStatus,
  Logger,
  Query,
  UseGuards,
  Res,
  Param,
} from '@nestjs/common';
import * as express from 'express';
import { Readable } from 'stream';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { ResponseMessage } from '@common/decorators/response-message.decorator';
import { ROLE_CODES } from '@common/constants/role-codes.constants';
import {
  AuditExportQueryDto,
  AuditHistoryQueryDto,
} from '@modules/audit/dto/audit-query.dto';
import { AuditExportJobsService } from '@modules/audit/application/audit-export-jobs.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@modules/users/domain/user.entity';
import { AuditExportJobStatusDto } from '@modules/audit/dto/audit-export-job-response.dto';
import { AuditService } from '@modules/audit/application/audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  private readonly logger = new Logger(AuditController.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly auditExportJobsService: AuditExportJobsService,
  ) {}

  @Get('history')
  @Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.ADMIN)
  @ResponseMessage('Historial de auditoria recuperado exitosamente')
  async getHistory(@Query() query: AuditHistoryQueryDto) {
    return await this.auditService.getUnifiedHistory(query);
  }

  @Get('export')
  @Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.ADMIN)
  async exportHistory(
    @Res() res: express.Response,
    @CurrentUser() user: User,
    @Query() query: AuditExportQueryDto,
  ): Promise<void> {
    const result = await this.auditExportJobsService.requestExport(
      user.id,
      query,
    );

    if ('stream' in result) {
      res.set({
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
      });

      this.attachResponseCleanup(
        res,
        result.stream,
        {
          downloadKind: 'sync',
          requestedByUserId: user.id,
          fileName: result.fileName,
        },
        result.onFinish,
        result.onAbort,
      );
      result.stream.pipe(res);
      return;
    }

    res.status(HttpStatus.ACCEPTED).json({
      statusCode: HttpStatus.ACCEPTED,
      message: 'Exportacion masiva de auditoria encolada exitosamente',
      data: result,
      timestamp: new Date().toISOString(),
    });
  }

  @Get('export-jobs/:id')
  @Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.ADMIN)
  @ResponseMessage('Estado del job de exportacion recuperado exitosamente')
  async getExportJobStatus(
    @CurrentUser() user: User,
    @Param('id') jobId: string,
  ): Promise<AuditExportJobStatusDto> {
    return await this.auditExportJobsService.getExportJobStatus(jobId, user.id);
  }

  @Get('export-jobs/:id/download')
  @Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.ADMIN)
  async downloadExportJob(
    @CurrentUser() user: User,
    @Param('id') jobId: string,
    @Res() res: express.Response,
  ): Promise<void> {
    const result = await this.auditExportJobsService.downloadExportJob(
      jobId,
      user.id,
    );

    res.set({
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename="${result.fileName}"`,
    });

    this.attachResponseCleanup(
      res,
      result.stream,
      {
        downloadKind: 'async',
        requestedByUserId: user.id,
        jobId,
        fileName: result.fileName,
      },
      result.onFinish,
      result.onAbort,
    );
    result.stream.pipe(res);
  }

  private attachResponseCleanup(
    res: express.Response,
    stream: NodeJS.ReadableStream,
    logContext: {
      downloadKind: 'sync' | 'async';
      requestedByUserId: string;
      fileName: string;
      jobId?: string;
    },
    onFinish?: () => Promise<void>,
    onAbort?: () => Promise<void>,
  ): void {
    if (!onFinish && !onAbort) {
      return;
    }

    let cleanupResolved = false;
    let streamFailed = false;
    const runCleanup = async (
      handler: (() => Promise<void>) | undefined,
      failureMessage: string,
    ): Promise<void> => {
      if (cleanupResolved || !handler) {
        return;
      }

      cleanupResolved = true;
      await handler().catch((error: unknown) => {
        this.logger.error({
          context: AuditController.name,
          message: failureMessage,
          ...logContext,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    };

    res.once('finish', () => {
      if (streamFailed) {
        return;
      }
      void runCleanup(
        onFinish,
        'Fallo el cleanup post-descarga del export de auditoria',
      );
    });
    res.once('close', () => {
      if (!res.writableFinished) {
        void runCleanup(
          onAbort,
          'Fallo el cleanup por aborto del export de auditoria',
        );
      }
    });
    (stream as Readable).once('error', (error: unknown) => {
      streamFailed = true;
      this.logger.error({
        context: AuditController.name,
        message: 'Fallo el stream del export de auditoria',
        ...logContext,
        error: error instanceof Error ? error.message : String(error),
      });
      void runCleanup(
        onAbort,
        'Fallo el cleanup por error de stream del export de auditoria',
      );
      if (res.writableFinished) {
        return;
      }

      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'No se pudo transmitir el archivo del reporte de auditoria',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.destroy(error instanceof Error ? error : new Error(String(error)));
    });
  }
}

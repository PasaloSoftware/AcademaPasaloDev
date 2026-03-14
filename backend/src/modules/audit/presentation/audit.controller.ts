import {
  Controller,
  Get,
  HttpStatus,
  Query,
  UseGuards,
  Res,
  Param,
} from '@nestjs/common';
import * as express from 'express';
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
    const result = await this.auditExportJobsService.requestExport(user.id, query);

    if ('stream' in result) {
      res.set({
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
      });

      this.attachResponseCleanup(res, result.onComplete);
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

    this.attachResponseCleanup(res, result.onComplete);
    result.stream.pipe(res);
  }

  private attachResponseCleanup(
    res: express.Response,
    onComplete?: () => Promise<void>,
  ): void {
    if (!onComplete) {
      return;
    }

    let handled = false;
    const runCleanup = async () => {
      if (handled) {
        return;
      }
      handled = true;
      await onComplete();
    };

    res.once('finish', () => {
      void runCleanup();
    });
    res.once('close', () => {
      void runCleanup();
    });
  }
}

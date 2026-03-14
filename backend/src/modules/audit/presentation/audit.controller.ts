import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import * as express from 'express';
import { AuditService } from '@modules/audit/application/audit.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { ResponseMessage } from '@common/decorators/response-message.decorator';
import { ROLE_CODES } from '@common/constants/role-codes.constants';
import {
  AuditExportQueryDto,
  AuditHistoryQueryDto,
} from '@modules/audit/dto/audit-query.dto';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

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
    @Query() query: AuditExportQueryDto,
  ) {
    const buffer = await this.auditService.exportHistoryToExcel(query);

    const filename = `reporte-auditoria-${new Date().toISOString().split('T')[0]}.xlsx`;

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=${filename}`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}

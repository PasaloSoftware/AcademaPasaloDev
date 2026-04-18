import { AuditController } from './audit.controller';
import { AuditExportJobsService } from '@modules/audit/application/audit-export-jobs.service';
import { AuditService } from '@modules/audit/application/audit.service';
import { AuditPanelQueryDto } from '@modules/audit/dto/audit-query.dto';
import {
  AuditLogDetailDto,
  AuditPanelResponseDto,
  SecurityEventDetailDto,
} from '@modules/audit/dto/audit-panel.dto';
import { AUDIT_SOURCES } from '@modules/audit/interfaces/audit.constants';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter } from 'events';

describe('AuditController', () => {
  let controller: AuditController;

  beforeEach(() => {
    controller = new AuditController(
      {} as AuditService,
      {} as AuditExportJobsService,
    );
  });

  describe('getAuditPanel', () => {
    let panelController: AuditController;
    let mockAuditService: { getAuditPanel: jest.Mock };

    const emptyPanelResponse: AuditPanelResponseDto = {
      items: [],
      totalItems: 0,
      totalPages: 1,
      currentPage: 1,
    };

    beforeEach(() => {
      mockAuditService = {
        getAuditPanel: jest
          .fn()
          .mockResolvedValue(emptyPanelResponse),
      };
      panelController = new AuditController(
        mockAuditService as unknown as AuditService,
        {} as AuditExportJobsService,
      );
    });

    it('should delegate to the service with all provided filters and the page number', async () => {
      const query: AuditPanelQueryDto = {
        source: AUDIT_SOURCES.SECURITY,
        roleCode: 'ADMIN',
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        page: 2,
      };

      await panelController.getAuditPanel(query);

      expect(mockAuditService.getAuditPanel).toHaveBeenCalledWith(
        {
          source: AUDIT_SOURCES.SECURITY,
          roleCode: 'ADMIN',
          startDate: '2026-03-01',
          endDate: '2026-03-31',
        },
        2,
      );
    });

    it('should default to page 1 when the query carries no page', async () => {
      await panelController.getAuditPanel({});

      expect(mockAuditService.getAuditPanel).toHaveBeenCalledWith({}, 1);
    });

    it('should strip the page field before forwarding filters to the service', async () => {
      await panelController.getAuditPanel({
        source: AUDIT_SOURCES.AUDIT,
        page: 3,
      });

      const [filters] = mockAuditService.getAuditPanel.mock.calls[0] as [
        Record<string, unknown>,
        number,
      ];
      expect(filters).not.toHaveProperty('page');
    });

    it('should return the service response as-is', async () => {
      const serviceResponse: AuditPanelResponseDto = {
        items: [
          {
            id: 'aud-1',
            datetime: new Date('2026-03-14T15:00:00.000Z'),
            userName: 'Ana Torres',
            userRole: 'Estudiante',
            actionName: 'Subida de archivo',
            source: AUDIT_SOURCES.AUDIT,
            sourceLabel: 'AUDITORÍA',
          },
        ],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
      };
      mockAuditService.getAuditPanel.mockResolvedValue(serviceResponse);

      const result = await panelController.getAuditPanel({ page: 1 });

      expect(result).toBe(serviceResponse);
    });

    it('should forward only source when no roleCode or dates are provided', async () => {
      await panelController.getAuditPanel({ source: AUDIT_SOURCES.AUDIT });

      expect(mockAuditService.getAuditPanel).toHaveBeenCalledWith(
        { source: AUDIT_SOURCES.AUDIT },
        1,
      );
    });
  });

  describe('getAuditLogDetail', () => {
    let detailController: AuditController;
    let mockAuditService: { getPanelDetail: jest.Mock };

    const mockAuditDetail: AuditLogDetailDto = {
      id: 'aud-7',
      datetime: new Date('2026-03-14T15:00:00.000Z'),
      userId: '7',
      userName: 'Ana Torres',
      userEmail: 'ana@test.com',
      userRole: 'Estudiante',
      actionCode: 'FILE_UPLOAD',
      actionName: 'Subida de archivo',
      source: AUDIT_SOURCES.AUDIT,
    };

    const mockSecurityDetail: SecurityEventDetailDto = {
      id: 'sec-3',
      datetime: new Date('2026-03-14T12:00:00.000Z'),
      userId: '3',
      userName: 'Carlos Ruiz',
      userEmail: 'carlos@test.com',
      userRole: 'Admin',
      actionCode: 'LOGIN',
      actionName: 'Login',
      source: AUDIT_SOURCES.SECURITY,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    beforeEach(() => {
      mockAuditService = {
        getPanelDetail: jest.fn().mockResolvedValue(mockAuditDetail),
      };
      detailController = new AuditController(
        mockAuditService as unknown as AuditService,
        {} as AuditExportJobsService,
      );
    });

    it('should delegate to getPanelDetail with the route id param', async () => {
      await detailController.getAuditLogDetail('aud-7');

      expect(mockAuditService.getPanelDetail).toHaveBeenCalledWith('aud-7');
    });

    it('should return the audit log detail as-is for aud-* ids', async () => {
      const result = await detailController.getAuditLogDetail('aud-7');

      expect(result).toBe(mockAuditDetail);
    });

    it('should return the security event detail as-is for sec-* ids', async () => {
      mockAuditService.getPanelDetail.mockResolvedValue(mockSecurityDetail);

      const result = await detailController.getAuditLogDetail('sec-3');

      expect(result).toBe(mockSecurityDetail);
    });

    it('should propagate NotFoundException when the record is not found', async () => {
      mockAuditService.getPanelDetail.mockRejectedValue(
        new NotFoundException('El registro de auditoria no existe'),
      );

      await expect(
        detailController.getAuditLogDetail('aud-999'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate NotFoundException for an unrecognized prefix', async () => {
      mockAuditService.getPanelDetail.mockRejectedValue(
        new NotFoundException('El registro de auditoria no existe'),
      );

      await expect(
        detailController.getAuditLogDetail('evt-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('exportSecurityHistory', () => {
    it('should force source=SECURITY and use the security template when requesting an export', async () => {
      const mockRequestExport = jest.fn().mockResolvedValue({
        jobId: 'job-sec-1',
        status: 'queued',
      });
      const secController = new AuditController(
        {} as AuditService,
        { requestExport: mockRequestExport } as unknown as AuditExportJobsService,
      );

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as import('express').Response;

      await secController.exportSecurityHistory(
        res,
        { id: 'user-1' } as never,
        { startDate: '2026-03-01', endDate: '2026-03-31', roleCode: 'ADMIN' },
      );

      expect(mockRequestExport).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          source: 'SECURITY',
          startDate: '2026-03-01',
          endDate: '2026-03-31',
          roleCode: 'ADMIN',
        }),
        'security',
      );
    });
  });

  it('should abort cleanup and return 500 when the export stream fails before headers are sent', async () => {
    const res = new EventEmitter() as EventEmitter & {
      writableFinished: boolean;
      headersSent: boolean;
      status: jest.Mock;
      json: jest.Mock;
      destroy: jest.Mock;
      once: EventEmitter['once'];
    };
    res.writableFinished = false;
    res.headersSent = false;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.destroy = jest.fn();

    const stream = new EventEmitter();
    const onFinish = jest.fn().mockResolvedValue(undefined);
    const onAbort = jest.fn().mockResolvedValue(undefined);

    controller['attachResponseCleanup'](
      res as never,
      stream as never,
      {
        downloadKind: 'async',
        requestedByUserId: 'user-1',
        jobId: 'job-1',
        fileName: 'audit.zip',
      },
      onFinish,
      onAbort,
    );

    stream.emit('error', new Error('stream-failure'));
    await new Promise((resolve) => setImmediate(resolve));

    expect(onAbort).toHaveBeenCalledTimes(1);
    expect(onFinish).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'No se pudo transmitir el archivo del reporte de auditoria',
      }),
    );
    expect(res.destroy).not.toHaveBeenCalled();
  });
});

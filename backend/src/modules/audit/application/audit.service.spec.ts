import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AuditService } from './audit.service';
import { AuditLogRepository } from '@modules/audit/infrastructure/audit-log.repository';
import { AuditActionRepository } from '@modules/audit/infrastructure/audit-action.repository';
import { AuditExportRepository } from '@modules/audit/infrastructure/audit-export.repository';
import { InternalServerErrorException } from '@nestjs/common';
import { AuditAction } from '@modules/audit/domain/audit-action.entity';
import { QUEUES } from '@infrastructure/queue/queue.constants';
import {
  AUDIT_ACTION_CODES,
  AUDIT_SOURCES,
} from '../interfaces/audit.constants';
import { SECURITY_EVENT_CODES } from '@modules/auth/interfaces/security.constants';
import { AuditExportCoordinatorService } from './audit-export-coordinator.service';
import { AuditExportArtifactsService } from './audit-export-artifacts.service';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('AuditService', () => {
  let service: AuditService;
  let auditLogRepository: Partial<AuditLogRepository>;
  let auditActionRepository: Partial<AuditActionRepository>;
  let auditExportRepository: Partial<AuditExportRepository>;
  let auditQueue: Partial<Queue>;
  let auditExportCoordinator: Partial<AuditExportCoordinatorService>;
  let auditExportArtifacts: Partial<AuditExportArtifactsService>;

  const mockAuditAction = {
    id: '1',
    code: AUDIT_ACTION_CODES.FILE_UPLOAD,
    name: 'File Upload',
  } as AuditAction;

  beforeEach(async () => {
    auditLogRepository = {
      create: jest
        .fn()
        .mockImplementation((dto) => Promise.resolve({ id: 'log-1', ...dto })),
      findAll: jest.fn().mockResolvedValue([]),
      countAll: jest.fn().mockResolvedValue(0),
    };

    auditActionRepository = {
      findByCode: jest.fn().mockResolvedValue(mockAuditAction),
    };

    auditExportRepository = {
      findUnifiedHistory: jest.fn().mockResolvedValue([]),
      findUnifiedHistoryChunk: jest.fn().mockResolvedValue([]),
      countUnifiedHistory: jest.fn().mockResolvedValue(0),
    };

    auditQueue = {
      getJobSchedulers: jest.fn().mockResolvedValue([]),
      add: jest.fn().mockResolvedValue({}),
    };

    auditExportCoordinator = {
      buildExportPlan: jest.fn().mockImplementation((totalRows: number) => ({
        mode: totalRows >= 100000 ? 'async' : 'sync',
        totalRows,
        thresholdRows: 100000,
        rowsPerFile: 100000,
        estimatedFileCount: totalRows === 0 ? 1 : Math.ceil(totalRows / 100000),
        artifactTtlSeconds: 3600,
      })),
    };

    auditExportArtifacts = {
      buildSyncFileName: jest.fn().mockReturnValue('reporte-auditoria.xlsx'),
      createSyncTempFile: jest
        .fn()
        .mockResolvedValue(path.join(os.tmpdir(), 'audit-sync-test.xlsx')),
      deleteFileIfExists: jest.fn().mockResolvedValue(undefined),
      buildAsyncPartFileName: jest.fn(),
      buildAsyncZipName: jest.fn(),
      createWorkspace: jest.fn(),
      reserveArtifact: jest.fn(),
      zipFiles: jest.fn(),
      deleteDirectoryIfExists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: AuditLogRepository, useValue: auditLogRepository },
        { provide: AuditActionRepository, useValue: auditActionRepository },
        { provide: AuditExportRepository, useValue: auditExportRepository },
        {
          provide: AuditExportCoordinatorService,
          useValue: auditExportCoordinator,
        },
        {
          provide: AuditExportArtifactsService,
          useValue: auditExportArtifacts,
        },
        { provide: getQueueToken(QUEUES.AUDIT), useValue: auditQueue },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logAction', () => {
    it('should create an audit log successfully', async () => {
      const result = await service.logAction(
        'user-1',
        AUDIT_ACTION_CODES.FILE_UPLOAD,
      );

      expect(auditActionRepository.findByCode).toHaveBeenCalledWith(
        AUDIT_ACTION_CODES.FILE_UPLOAD,
        undefined,
      );
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          auditActionId: '1',
        }),
        undefined,
      );
      expect(result).toBeDefined();
    });

    it('should throw InternalServerErrorException if action code does not exist', async () => {
      (auditActionRepository.findByCode as jest.Mock).mockResolvedValue(null);

      await expect(
        service.logAction('user-1', 'INVALID_ACTION'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getUnifiedHistory', () => {
    it('should merge and sort events from both sources', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000);

      const mockRows = [
        {
          id: 'sec-1',
          datetime: now,
          userId: 'u1',
          userName: 'Admin',
          userEmail: 'admin@test.com',
          userRole: 'Admin',
          actionCode: SECURITY_EVENT_CODES.LOGIN_SUCCESS,
          actionName: 'Login',
          source: AUDIT_SOURCES.SECURITY,
          ipAddress: '127.0.0.1',
        },
        {
          id: 'aud-1',
          datetime: past,
          userId: 'u1',
          userName: 'Admin',
          userEmail: 'admin@test.com',
          userRole: 'Admin',
          actionCode: AUDIT_ACTION_CODES.FILE_UPLOAD,
          actionName: 'Upload',
          source: AUDIT_SOURCES.AUDIT,
        },
      ];

      (auditExportRepository.findUnifiedHistory as jest.Mock).mockResolvedValue(
        mockRows,
      );

      const result = await service.getUnifiedHistory({});

      expect(result).toHaveLength(2);
      expect(result[0].source).toBe('SECURITY');
      expect(result[1].source).toBe('AUDIT');
      expect(result[0].datetime.getTime()).toBeGreaterThan(
        result[1].datetime.getTime(),
      );
    });

    it('should only query security source when requested', async () => {
      await service.getUnifiedHistory({ source: AUDIT_SOURCES.SECURITY });

      expect(auditExportRepository.findUnifiedHistory).toHaveBeenCalledWith(
        expect.objectContaining({ source: AUDIT_SOURCES.SECURITY }),
        50,
      );
    });

    it('should only query audit source when requested', async () => {
      await service.getUnifiedHistory({ source: AUDIT_SOURCES.AUDIT });

      expect(auditExportRepository.findUnifiedHistory).toHaveBeenCalledWith(
        expect.objectContaining({ source: AUDIT_SOURCES.AUDIT }),
        50,
      );
    });

    it('should pass actionCode to the unified repository', async () => {
      await service.getUnifiedHistory({ actionCode: 'LOGIN_SUCCESS' });

      expect(auditExportRepository.findUnifiedHistory).toHaveBeenCalledWith(
        expect.objectContaining({ actionCode: 'LOGIN_SUCCESS' }),
        50,
      );
    });
  });

  describe('countUnifiedHistory', () => {
    it('should delegate the count to the unified repository', async () => {
      (auditExportRepository.countUnifiedHistory as jest.Mock).mockResolvedValue(
        12,
      );

      const result = await service.countUnifiedHistory({});

      expect(result).toBe(12);
      expect(auditExportRepository.countUnifiedHistory).toHaveBeenCalled();
    });
  });

  describe('getExportPlan', () => {
    it('should build the export plan from the unified count', async () => {
      (auditExportRepository.countUnifiedHistory as jest.Mock).mockResolvedValue(
        110000,
      );

      const result = await service.getExportPlan({});

      expect(auditExportCoordinator.buildExportPlan).toHaveBeenCalledWith(
        110000,
      );
      expect(result.mode).toBe('async');
    });
  });

  describe('prepareSyncExport', () => {
    afterEach(async () => {
      const filePath = path.join(os.tmpdir(), 'audit-sync-test.xlsx');
      try {
        await fs.promises.unlink(filePath);
      } catch {
        // ignore cleanup errors for temp test artifact
      }
    });

    it('should write the sync export using paginated reads instead of a 1000-row hard limit', async () => {
      (auditExportRepository.findUnifiedHistoryChunk as jest.Mock)
        .mockResolvedValueOnce([
          {
            id: 'aud-1',
            datetime: new Date('2026-03-14T10:00:00.000Z'),
            userId: 'u1',
            userName: 'Admin',
            userEmail: 'admin@test.com',
            userRole: 'Admin',
            actionCode: AUDIT_ACTION_CODES.FILE_UPLOAD,
            actionName: 'Upload',
            source: AUDIT_SOURCES.AUDIT,
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.prepareSyncExport({});

      expect(result.fileName).toBe('reporte-auditoria.xlsx');
      expect(
        auditExportRepository.findUnifiedHistoryChunk,
      ).toHaveBeenNthCalledWith(
        1,
        expect.any(Object),
        5000,
        undefined,
      );
      expect(
        auditExportRepository.findUnifiedHistoryChunk,
      ).toHaveBeenNthCalledWith(
        2,
        expect.any(Object),
        5000,
        expect.objectContaining({
          sourceRank: 1,
          entityId: 1,
        }),
      );
    });

    it('should delete the sync temp file if workbook generation fails', async () => {
      (auditExportRepository.findUnifiedHistoryChunk as jest.Mock).mockRejectedValue(
        new Error('db-failure'),
      );

      await expect(service.prepareSyncExport({})).rejects.toThrow('db-failure');
      expect(auditExportArtifacts.deleteFileIfExists).toHaveBeenCalledWith(
        path.join(os.tmpdir(), 'audit-sync-test.xlsx'),
      );
    });
  });

  describe('generateAsyncExportArtifact', () => {
    it('should delete the reserved zip if packaging fails', async () => {
      const workspace = path.join(
        os.tmpdir(),
        `audit-workspace-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      );
      await fs.promises.mkdir(workspace, { recursive: true });
      (auditExportArtifacts.createWorkspace as jest.Mock).mockResolvedValue(
        workspace,
      );
      (auditExportArtifacts.buildAsyncPartFileName as jest.Mock).mockReturnValue(
        'reporte-auditoria_parte-001_de-001.xlsx',
      );
      (auditExportArtifacts.buildAsyncZipName as jest.Mock).mockReturnValue(
        'reporte-auditoria-masivo_2026-03-14_15-42-10.zip',
      );
      (auditExportArtifacts.reserveArtifact as jest.Mock).mockResolvedValue({
        fileName: 'reporte-auditoria-masivo_2026-03-14_15-42-10.zip',
        storageKey: 'artifact-key',
        filePath: path.join(os.tmpdir(), 'artifact-key.zip'),
      });
      (auditExportArtifacts.zipFiles as jest.Mock).mockRejectedValue(
        new Error('zip-failure'),
      );
      (auditExportRepository.findUnifiedHistoryChunk as jest.Mock).mockResolvedValue(
        [],
      );

      await expect(
        service.generateAsyncExportArtifact({}, 0, 100000, 'job-1'),
      ).rejects.toThrow('zip-failure');
      expect(auditExportArtifacts.deleteFileIfExists).toHaveBeenCalledWith(
        path.join(os.tmpdir(), 'artifact-key.zip'),
      );
      expect(auditExportArtifacts.deleteDirectoryIfExists).toHaveBeenCalledWith(
        workspace,
      );
    });
  });

  describe('formatExcelDatetime', () => {
    it('should render the excel datetime using America/Lima instead of process timezone', () => {
      const date = new Date('2026-03-14T15:00:00.000Z');

      expect(service['formatExcelDatetime'](date)).toBe(
        date.toLocaleString('es-PE', {
          timeZone: 'America/Lima',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
      );
    });
  });
});

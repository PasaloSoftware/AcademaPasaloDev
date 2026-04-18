import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AuditService } from './audit.service';
import { AuditLogRepository } from '@modules/audit/infrastructure/audit-log.repository';
import { AuditActionRepository } from '@modules/audit/infrastructure/audit-action.repository';
import { AuditExportRepository } from '@modules/audit/infrastructure/audit-export.repository';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@modules/audit/domain/audit-action.entity';
import { QUEUES } from '@infrastructure/queue/queue.constants';
import {
  AUDIT_ACTION_CODES,
  AUDIT_LABELS,
  AUDIT_SOURCES,
} from '../interfaces/audit.constants';
import { ROLE_CODES } from '@common/constants/role-codes.constants';
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
      findAuditLogById: jest.fn().mockResolvedValue(null),
      findSecurityEventById: jest.fn().mockResolvedValue(null),
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
    it('should parse date-only filters using Peru business boundaries', async () => {
      await service.getUnifiedHistory({
        startDate: '2026-03-15',
        endDate: '2026-03-15',
      });

      expect(auditExportRepository.findUnifiedHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: new Date('2026-03-15T05:00:00.000Z'),
          endDate: new Date('2026-03-16T04:59:59.999Z'),
        }),
        50,
      );
    });

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
      (
        auditExportRepository.countUnifiedHistory as jest.Mock
      ).mockResolvedValue(12);

      const result = await service.countUnifiedHistory({});

      expect(result).toBe(12);
      expect(auditExportRepository.countUnifiedHistory).toHaveBeenCalled();
    });
  });

  describe('getExportPlan', () => {
    it('should build the export plan from the unified count', async () => {
      (
        auditExportRepository.countUnifiedHistory as jest.Mock
      ).mockResolvedValue(110000);

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

      const result = await service.prepareSyncExport({}, 'events');

      expect(result.fileName).toBe('reporte-auditoria.xlsx');
      expect(
        auditExportRepository.findUnifiedHistoryChunk,
      ).toHaveBeenNthCalledWith(1, expect.any(Object), 5000, undefined);
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
      (
        auditExportRepository.findUnifiedHistoryChunk as jest.Mock
      ).mockRejectedValue(new Error('db-failure'));

      await expect(service.prepareSyncExport({}, 'events')).rejects.toThrow('db-failure');
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
      (
        auditExportArtifacts.buildAsyncPartFileName as jest.Mock
      ).mockReturnValue('reporte-auditoria_parte-001_de-001.xlsx');
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
      (
        auditExportRepository.findUnifiedHistoryChunk as jest.Mock
      ).mockResolvedValue([]);

      await expect(
        service.generateAsyncExportArtifact({}, 0, 100000, 'job-1', 'events'),
      ).rejects.toThrow('zip-failure');
      expect(auditExportArtifacts.deleteFileIfExists).toHaveBeenCalledWith(
        path.join(os.tmpdir(), 'artifact-key.zip'),
      );
      expect(auditExportArtifacts.deleteDirectoryIfExists).toHaveBeenCalledWith(
        workspace,
      );
    });
  });

  describe('getAuditLogDetail', () => {
    const mockRecord = {
      id: 'aud-7',
      datetime: new Date('2026-03-14T15:00:00.000Z'),
      userId: '7',
      userName: 'Ana Torres',
      userEmail: 'ana@test.com',
      userRole: 'Estudiante',
      actionCode: AUDIT_ACTION_CODES.FILE_UPLOAD,
      actionName: 'Subida de archivo',
      source: AUDIT_SOURCES.AUDIT,
    };

    it('should return the audit log detail for a valid aud-* id', async () => {
      (
        auditExportRepository.findAuditLogById as jest.Mock
      ).mockResolvedValue(mockRecord);

      const result = await service.getAuditLogDetail('aud-7');

      expect(auditExportRepository.findAuditLogById).toHaveBeenCalledWith(7);
      expect(result).toMatchObject({
        id: 'aud-7',
        userId: '7',
        userName: 'Ana Torres',
        userEmail: 'ana@test.com',
        userRole: 'Estudiante',
        actionCode: AUDIT_ACTION_CODES.FILE_UPLOAD,
        actionName: 'Subida de archivo',
        source: AUDIT_SOURCES.AUDIT,
      });
    });

    it('should throw NotFoundException when the record does not exist in the database', async () => {
      (
        auditExportRepository.findAuditLogById as jest.Mock
      ).mockResolvedValue(null);

      await expect(service.getAuditLogDetail('aud-999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for a sec-* composite id', async () => {
      await expect(service.getAuditLogDetail('sec-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(auditExportRepository.findAuditLogById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for a completely malformed id', async () => {
      await expect(service.getAuditLogDetail('garbage')).rejects.toThrow(
        NotFoundException,
      );
      expect(auditExportRepository.findAuditLogById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the numeric part of the id is not a positive integer', async () => {
      await expect(service.getAuditLogDetail('aud-0')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getAuditLogDetail('aud-abc')).rejects.toThrow(
        NotFoundException,
      );
      expect(auditExportRepository.findAuditLogById).not.toHaveBeenCalled();
    });

    it('should not expose ipAddress, userAgent or metadata in the response', async () => {
      (
        auditExportRepository.findAuditLogById as jest.Mock
      ).mockResolvedValue(mockRecord);

      const result = await service.getAuditLogDetail('aud-7');

      expect(result).not.toHaveProperty('ipAddress');
      expect(result).not.toHaveProperty('userAgent');
      expect(result).not.toHaveProperty('metadata');
    });
  });

  describe('getAuditPanel', () => {
    const mockRow = (overrides: Record<string, unknown> = {}) => ({
      id: 'aud-1',
      datetime: new Date('2026-03-14T15:00:00.000Z'),
      userId: 'u1',
      userName: 'Ana Torres',
      userEmail: 'ana@test.com',
      userRole: 'Estudiante',
      actionCode: AUDIT_ACTION_CODES.FILE_UPLOAD,
      actionName: 'Subida de archivo',
      source: AUDIT_SOURCES.AUDIT,
      ...overrides,
    });

    it('should return an empty page with totalPages 1 when there are no records', async () => {
      (auditExportRepository.findUnifiedHistory as jest.Mock).mockResolvedValue(
        [],
      );
      (
        auditExportRepository.countUnifiedHistory as jest.Mock
      ).mockResolvedValue(0);

      const result = await service.getAuditPanel({}, 1);

      expect(result.items).toHaveLength(0);
      expect(result.totalItems).toBe(0);
      expect(result.totalPages).toBe(1);
      expect(result.currentPage).toBe(1);
    });

    it('should map each row to the panel shape without exposing email, userAgent or metadata', async () => {
      (auditExportRepository.findUnifiedHistory as jest.Mock).mockResolvedValue(
        [mockRow()],
      );
      (
        auditExportRepository.countUnifiedHistory as jest.Mock
      ).mockResolvedValue(1);

      const result = await service.getAuditPanel({}, 1);

      expect(result.items).toHaveLength(1);
      const item = result.items[0];
      expect(item).toMatchObject({
        id: 'aud-1',
        userName: 'Ana Torres',
        userRole: 'Estudiante',
        actionName: 'Subida de archivo',
        source: AUDIT_SOURCES.AUDIT,
        sourceLabel: AUDIT_LABELS.SOURCE_AUDIT,
      });
      expect(item).not.toHaveProperty('userEmail');
      expect(item).not.toHaveProperty('userAgent');
      expect(item).not.toHaveProperty('metadata');
    });

    it('should assign SEGURIDAD label to security source rows', async () => {
      (auditExportRepository.findUnifiedHistory as jest.Mock).mockResolvedValue(
        [mockRow({ id: 'sec-1', source: AUDIT_SOURCES.SECURITY })],
      );
      (
        auditExportRepository.countUnifiedHistory as jest.Mock
      ).mockResolvedValue(1);

      const result = await service.getAuditPanel({}, 1);

      expect(result.items[0].sourceLabel).toBe(AUDIT_LABELS.SOURCE_SECURITY);
    });

    it('should assign AUDITORÍA label to audit source rows', async () => {
      (auditExportRepository.findUnifiedHistory as jest.Mock).mockResolvedValue(
        [mockRow({ source: AUDIT_SOURCES.AUDIT })],
      );
      (
        auditExportRepository.countUnifiedHistory as jest.Mock
      ).mockResolvedValue(1);

      const result = await service.getAuditPanel({}, 1);

      expect(result.items[0].sourceLabel).toBe(AUDIT_LABELS.SOURCE_AUDIT);
    });

    it('should fire the data query and the count query in parallel', async () => {
      (auditExportRepository.findUnifiedHistory as jest.Mock).mockResolvedValue(
        [],
      );
      (
        auditExportRepository.countUnifiedHistory as jest.Mock
      ).mockResolvedValue(0);

      await service.getAuditPanel({}, 1);

      expect(auditExportRepository.findUnifiedHistory).toHaveBeenCalledTimes(1);
      expect(auditExportRepository.countUnifiedHistory).toHaveBeenCalledTimes(1);
    });

    it('should always request exactly 10 rows from the repository', async () => {
      (auditExportRepository.findUnifiedHistory as jest.Mock).mockResolvedValue(
        [],
      );
      (
        auditExportRepository.countUnifiedHistory as jest.Mock
      ).mockResolvedValue(0);

      await service.getAuditPanel({}, 1);

      expect(auditExportRepository.findUnifiedHistory).toHaveBeenCalledWith(
        expect.any(Object),
        10,
        0,
      );
    });

    it('should compute offset as (page - 1) * 10', async () => {
      (auditExportRepository.findUnifiedHistory as jest.Mock).mockResolvedValue(
        [],
      );
      (
        auditExportRepository.countUnifiedHistory as jest.Mock
      ).mockResolvedValue(0);

      const result = await service.getAuditPanel({}, 3);

      expect(auditExportRepository.findUnifiedHistory).toHaveBeenCalledWith(
        expect.any(Object),
        10,
        20,
      );
      expect(result.currentPage).toBe(3);
    });

    it('should return totalPages 1 when totalItems equals exactly one page', async () => {
      (auditExportRepository.findUnifiedHistory as jest.Mock).mockResolvedValue(
        [],
      );
      (
        auditExportRepository.countUnifiedHistory as jest.Mock
      ).mockResolvedValue(10);

      const result = await service.getAuditPanel({}, 1);

      expect(result.totalPages).toBe(1);
    });

    it('should round up totalPages when items do not fill the last page', async () => {
      (auditExportRepository.findUnifiedHistory as jest.Mock).mockResolvedValue(
        [],
      );
      (
        auditExportRepository.countUnifiedHistory as jest.Mock
      ).mockResolvedValue(11);

      const result = await service.getAuditPanel({}, 1);

      expect(result.totalPages).toBe(2);
    });

    it('should forward roleCode through the parsed filter to the repository', async () => {
      (auditExportRepository.findUnifiedHistory as jest.Mock).mockResolvedValue(
        [],
      );
      (
        auditExportRepository.countUnifiedHistory as jest.Mock
      ).mockResolvedValue(0);

      await service.getAuditPanel({ roleCode: 'STUDENT' }, 1);

      expect(auditExportRepository.findUnifiedHistory).toHaveBeenCalledWith(
        expect.objectContaining({ roleCode: 'STUDENT' }),
        10,
        0,
      );
      expect(auditExportRepository.countUnifiedHistory).toHaveBeenCalledWith(
        expect.objectContaining({ roleCode: 'STUDENT' }),
      );
    });

    it('should forward source filter to both repository calls', async () => {
      (auditExportRepository.findUnifiedHistory as jest.Mock).mockResolvedValue(
        [],
      );
      (
        auditExportRepository.countUnifiedHistory as jest.Mock
      ).mockResolvedValue(0);

      await service.getAuditPanel({ source: AUDIT_SOURCES.SECURITY }, 1);

      expect(auditExportRepository.findUnifiedHistory).toHaveBeenCalledWith(
        expect.objectContaining({ source: AUDIT_SOURCES.SECURITY }),
        10,
        0,
      );
      expect(auditExportRepository.countUnifiedHistory).toHaveBeenCalledWith(
        expect.objectContaining({ source: AUDIT_SOURCES.SECURITY }),
      );
    });

    it('should parse date-only panel filters using Peru business window boundaries', async () => {
      (auditExportRepository.findUnifiedHistory as jest.Mock).mockResolvedValue(
        [],
      );
      (
        auditExportRepository.countUnifiedHistory as jest.Mock
      ).mockResolvedValue(0);

      await service.getAuditPanel(
        { startDate: '2026-03-15', endDate: '2026-03-15' },
        1,
      );

      expect(auditExportRepository.findUnifiedHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: new Date('2026-03-15T05:00:00.000Z'),
          endDate: new Date('2026-03-16T04:59:59.999Z'),
        }),
        10,
        0,
      );
    });

    it('should reflect the requested page in the response currentPage field', async () => {
      (auditExportRepository.findUnifiedHistory as jest.Mock).mockResolvedValue(
        [],
      );
      (
        auditExportRepository.countUnifiedHistory as jest.Mock
      ).mockResolvedValue(50);

      const result = await service.getAuditPanel({}, 4);

      expect(result.currentPage).toBe(4);
    });
  });

  describe('getSecurityEventDetail', () => {
    const mockSecurityRecord = {
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
      metadata: {
        deviceId: 'dev-1',
        locationSource: 'geoip',
        city: 'Lima',
        country: 'PE',
        activeRoleCode: ROLE_CODES.ADMIN,
        sessionStatus: 'new',
        newSessionId: 'sess-abc',
        existingSessionId: undefined,
        existingDeviceId: undefined,
      } as Record<string, unknown>,
    };

    it('should return the security event detail for a valid sec-* id', async () => {
      (
        auditExportRepository.findSecurityEventById as jest.Mock
      ).mockResolvedValue(mockSecurityRecord);

      const result = await service.getSecurityEventDetail('sec-3');

      expect(auditExportRepository.findSecurityEventById).toHaveBeenCalledWith(
        3,
      );
      expect(result.id).toBe('sec-3');
      expect(result.ipAddress).toBe('192.168.1.1');
      expect(result.userAgent).toBe('Mozilla/5.0');
      expect(result.source).toBe(AUDIT_SOURCES.SECURITY);
    });

    it('should extract known metadata fields into SecurityEventMetadataDto', async () => {
      (
        auditExportRepository.findSecurityEventById as jest.Mock
      ).mockResolvedValue(mockSecurityRecord);

      const result = await service.getSecurityEventDetail('sec-3');

      expect(result.metadata).toMatchObject({
        deviceId: 'dev-1',
        locationSource: 'geoip',
        city: 'Lima',
        country: 'PE',
        activeRoleCode: ROLE_CODES.ADMIN,
        sessionStatus: 'new',
        newSessionId: 'sess-abc',
      });
    });

    it('should not expose fields outside the defined metadata schema', async () => {
      (
        auditExportRepository.findSecurityEventById as jest.Mock
      ).mockResolvedValue({
        ...mockSecurityRecord,
        metadata: {
          ...mockSecurityRecord.metadata,
          secretInternalField: 'should-not-appear',
        },
      });

      const result = await service.getSecurityEventDetail('sec-3');

      expect(result.metadata).not.toHaveProperty('secretInternalField');
    });

    it('should return undefined metadata when the record has no metadata', async () => {
      (
        auditExportRepository.findSecurityEventById as jest.Mock
      ).mockResolvedValue({ ...mockSecurityRecord, metadata: undefined });

      const result = await service.getSecurityEventDetail('sec-3');

      expect(result.metadata).toBeUndefined();
    });

    it('should convert non-string metadata values to undefined in the DTO', async () => {
      (
        auditExportRepository.findSecurityEventById as jest.Mock
      ).mockResolvedValue({
        ...mockSecurityRecord,
        metadata: { deviceId: 42, city: null, country: 'PE' },
      });

      const result = await service.getSecurityEventDetail('sec-3');

      expect(result.metadata?.deviceId).toBeUndefined();
      expect(result.metadata?.city).toBeUndefined();
      expect(result.metadata?.country).toBe('PE');
    });

    it('should throw NotFoundException when the record does not exist', async () => {
      (
        auditExportRepository.findSecurityEventById as jest.Mock
      ).mockResolvedValue(null);

      await expect(service.getSecurityEventDetail('sec-999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for an aud-* composite id', async () => {
      await expect(service.getSecurityEventDetail('aud-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(auditExportRepository.findSecurityEventById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for a malformed id', async () => {
      await expect(service.getSecurityEventDetail('garbage')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when the numeric part is zero or not a positive integer', async () => {
      await expect(service.getSecurityEventDetail('sec-0')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getSecurityEventDetail('sec-abc')).rejects.toThrow(
        NotFoundException,
      );
      expect(auditExportRepository.findSecurityEventById).not.toHaveBeenCalled();
    });
  });

  describe('getPanelDetail', () => {
    it('should dispatch to getAuditLogDetail for aud-* ids', async () => {
      const mockRecord = {
        id: 'aud-7',
        datetime: new Date('2026-03-14T15:00:00.000Z'),
        userId: '7',
        userName: 'Ana Torres',
        userEmail: 'ana@test.com',
        userRole: 'Estudiante',
        actionCode: AUDIT_ACTION_CODES.FILE_UPLOAD,
        actionName: 'Subida de archivo',
        source: AUDIT_SOURCES.AUDIT,
      };
      (
        auditExportRepository.findAuditLogById as jest.Mock
      ).mockResolvedValue(mockRecord);

      const result = await service.getPanelDetail('aud-7');

      expect(auditExportRepository.findAuditLogById).toHaveBeenCalledWith(7);
      expect(auditExportRepository.findSecurityEventById).not.toHaveBeenCalled();
      expect(result.id).toBe('aud-7');
      expect(result.source).toBe(AUDIT_SOURCES.AUDIT);
    });

    it('should dispatch to getSecurityEventDetail for sec-* ids', async () => {
      const mockRecord = {
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
      (
        auditExportRepository.findSecurityEventById as jest.Mock
      ).mockResolvedValue(mockRecord);

      const result = await service.getPanelDetail('sec-3');

      expect(auditExportRepository.findSecurityEventById).toHaveBeenCalledWith(
        3,
      );
      expect(auditExportRepository.findAuditLogById).not.toHaveBeenCalled();
      expect(result.id).toBe('sec-3');
      expect(result.source).toBe(AUDIT_SOURCES.SECURITY);
    });

    it('should throw NotFoundException for an unrecognized prefix', async () => {
      await expect(service.getPanelDetail('evt-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(auditExportRepository.findAuditLogById).not.toHaveBeenCalled();
      expect(auditExportRepository.findSecurityEventById).not.toHaveBeenCalled();
    });

    it('should propagate NotFoundException when the dispatched lookup returns nothing', async () => {
      (
        auditExportRepository.findSecurityEventById as jest.Mock
      ).mockResolvedValue(null);

      await expect(service.getPanelDetail('sec-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('EXCEL_TEMPLATES security mapRow', () => {
    const baseSecRow = {
      id: 'sec-1',
      datetime: new Date('2026-03-14T15:00:00.000Z'),
      userId: '1',
      userName: 'Carlos Ruiz',
      userEmail: 'carlos@test.com',
      userRole: 'Admin',
      actionCode: 'LOGIN',
      actionName: 'Login',
      source: AUDIT_SOURCES.SECURITY,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
    };

    type TemplateDef = {
      mapRow: (r: unknown, d: string) => Record<string, unknown>;
    };
    type StaticTemplates = { EXCEL_TEMPLATES: Record<string, TemplateDef> };
    const securityTemplate = (
      AuditService as unknown as StaticTemplates
    ).EXCEL_TEMPLATES['security'];

    const mapRow = (
      row: typeof baseSecRow & { metadata?: Record<string, unknown> },
      formatted = '14/03/2026, 10:00:00',
    ) => securityTemplate.mapRow(row, formatted);

    it('should extract all known string metadata fields into the row', () => {
      const row = {
        ...baseSecRow,
        metadata: {
          deviceId: 'dev-1',
          locationSource: 'geoip',
          city: 'Lima',
          country: 'PE',
          activeRoleCode: ROLE_CODES.ADMIN,
          sessionStatus: 'new',
          newSessionId: 'sess-abc',
          existingSessionId: 'sess-old',
          existingDeviceId: 'dev-old',
        },
      };

      const result = mapRow(row);

      expect(result.deviceId).toBe('dev-1');
      expect(result.locationSource).toBe('geoip');
      expect(result.city).toBe('Lima');
      expect(result.country).toBe('PE');
      expect(result.activeRoleCode).toBe(ROLE_CODES.ADMIN);
      expect(result.sessionStatus).toBe('new');
      expect(result.newSessionId).toBe('sess-abc');
      expect(result.existingSessionId).toBe('sess-old');
      expect(result.existingDeviceId).toBe('dev-old');
    });

    it('should return empty string for non-string metadata values', () => {
      const row = {
        ...baseSecRow,
        metadata: { deviceId: 42, city: null, country: true },
      };

      const result = mapRow(row);

      expect(result.deviceId).toBe('');
      expect(result.city).toBe('');
      expect(result.country).toBe('');
    });

    it('should return empty strings for all metadata fields when metadata is absent', () => {
      const result = mapRow({ ...baseSecRow, metadata: undefined });

      expect(result.deviceId).toBe('');
      expect(result.city).toBe('');
      expect(result.newSessionId).toBe('');
    });

    it('should always set source to SEGURIDAD regardless of the row source field', () => {
      const result = mapRow({ ...baseSecRow, metadata: undefined });

      expect(result.source).toBe(AUDIT_LABELS.SOURCE_SECURITY);
    });

    it('should include ipAddress and userAgent from the row', () => {
      const result = mapRow({ ...baseSecRow, metadata: undefined });

      expect(result.ipAddress).toBe('127.0.0.1');
      expect(result.userAgent).toBe('Mozilla/5.0');
    });

    it('should fall back to empty string when ipAddress or userAgent are absent', () => {
      const result = mapRow({
        ...baseSecRow,
        ipAddress: undefined as unknown as string,
        userAgent: undefined as unknown as string,
        metadata: undefined,
      });

      expect(result.ipAddress).toBe('');
      expect(result.userAgent).toBe('');
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

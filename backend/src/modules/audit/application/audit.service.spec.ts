import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AuditService } from './audit.service';
import { AuditLogRepository } from '@modules/audit/infrastructure/audit-log.repository';
import { AuditActionRepository } from '@modules/audit/infrastructure/audit-action.repository';
import { AuditExportRepository } from '@modules/audit/infrastructure/audit-export.repository';
import { ConflictException, InternalServerErrorException } from '@nestjs/common';
import { AuditAction } from '@modules/audit/domain/audit-action.entity';
import { QUEUES } from '@infrastructure/queue/queue.constants';
import {
  AUDIT_ACTION_CODES,
  AUDIT_SOURCES,
} from '../interfaces/audit.constants';
import { SECURITY_EVENT_CODES } from '@modules/auth/interfaces/security.constants';
import { AuditExportCoordinatorService } from './audit-export-coordinator.service';

describe('AuditService', () => {
  let service: AuditService;
  let auditLogRepository: Partial<AuditLogRepository>;
  let auditActionRepository: Partial<AuditActionRepository>;
  let auditExportRepository: Partial<AuditExportRepository>;
  let auditQueue: Partial<Queue>;
  let auditExportCoordinator: Partial<AuditExportCoordinatorService>;

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
      countUnifiedHistory: jest.fn().mockResolvedValue(0),
    };

    auditQueue = {
      getJobSchedulers: jest.fn().mockResolvedValue([]),
      add: jest.fn().mockResolvedValue({}),
    };

    auditExportCoordinator = {
      ensureNoExportInProgress: jest.fn().mockResolvedValue(undefined),
      buildExportPlan: jest.fn().mockImplementation((totalRows: number) => ({
        mode: totalRows >= 100000 ? 'async' : 'sync',
        totalRows,
        thresholdRows: 100000,
        rowsPerFile: 100000,
        estimatedFileCount: totalRows === 0 ? 1 : Math.ceil(totalRows / 100000),
        artifactTtlSeconds: 3600,
      })),
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
    it('should enforce the global concurrency check before building the export plan', async () => {
      (auditExportRepository.countUnifiedHistory as jest.Mock).mockResolvedValue(
        110000,
      );

      const result = await service.getExportPlan({});

      expect(auditExportCoordinator.ensureNoExportInProgress).toHaveBeenCalled();
      expect(auditExportCoordinator.buildExportPlan).toHaveBeenCalledWith(
        110000,
      );
      expect(result.mode).toBe('async');
    });

    it('should propagate the concurrency conflict', async () => {
      (
        auditExportCoordinator.ensureNoExportInProgress as jest.Mock
      ).mockRejectedValue(new ConflictException('busy'));

      await expect(service.getExportPlan({})).rejects.toThrow(ConflictException);
      expect(auditExportCoordinator.buildExportPlan).not.toHaveBeenCalled();
    });
  });
});

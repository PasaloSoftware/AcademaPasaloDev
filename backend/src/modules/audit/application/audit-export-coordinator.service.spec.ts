import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { ConflictException } from '@nestjs/common';
import { QUEUES } from '@infrastructure/queue/queue.constants';
import {
  AUDIT_JOB_IDS,
  AUDIT_JOB_NAMES,
} from '@modules/audit/interfaces/audit.constants';
import { AuditExportCoordinatorService } from './audit-export-coordinator.service';

describe('AuditExportCoordinatorService', () => {
  let service: AuditExportCoordinatorService;
  let auditQueue: Partial<Queue>;

  beforeEach(async () => {
    auditQueue = {
      getJob: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditExportCoordinatorService,
        { provide: getQueueToken(QUEUES.AUDIT), useValue: auditQueue },
      ],
    }).compile();

    service = module.get<AuditExportCoordinatorService>(
      AuditExportCoordinatorService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ensureNoExportInProgress', () => {
    it('should allow the request when no export job is in progress', async () => {
      await expect(service.ensureNoExportInProgress()).resolves.toBeUndefined();
    });

    it('should reject when an export job is already active', async () => {
      (auditQueue.getJob as jest.Mock).mockResolvedValue({
        name: AUDIT_JOB_NAMES.GENERATE_EXPORT,
        getState: jest.fn().mockResolvedValue('active'),
      } as unknown as Job);

      await expect(service.ensureNoExportInProgress()).rejects.toThrow(
        ConflictException,
      );
      expect(auditQueue.getJob).toHaveBeenCalledWith(
        AUDIT_JOB_IDS.EXPORT_SINGLETON,
      );
    });

    it('should ignore other audit jobs when checking concurrency', async () => {
      (auditQueue.getJob as jest.Mock).mockResolvedValue({
        name: AUDIT_JOB_NAMES.CLEANUP_OLD_LOGS,
        getState: jest.fn().mockResolvedValue('active'),
      } as unknown as Job);

      await expect(service.ensureNoExportInProgress()).resolves.toBeUndefined();
    });

    it('should ignore completed export jobs', async () => {
      (auditQueue.getJob as jest.Mock).mockResolvedValue({
        name: AUDIT_JOB_NAMES.GENERATE_EXPORT,
        getState: jest.fn().mockResolvedValue('completed'),
      } as unknown as Job);

      await expect(service.ensureNoExportInProgress()).resolves.toBeUndefined();
    });
  });

  describe('buildExportPlan', () => {
    it('should classify a small export as sync', () => {
      const plan = service.buildExportPlan(99999);

      expect(plan.mode).toBe('sync');
      expect(plan.estimatedFileCount).toBe(1);
    });

    it('should classify a 100k export as async', () => {
      const plan = service.buildExportPlan(100000);

      expect(plan.mode).toBe('async');
      expect(plan.estimatedFileCount).toBe(1);
    });

    it('should estimate multiple files for larger exports', () => {
      const plan = service.buildExportPlan(250001);

      expect(plan.mode).toBe('async');
      expect(plan.estimatedFileCount).toBe(3);
    });
  });
});

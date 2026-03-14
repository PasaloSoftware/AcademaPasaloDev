import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { Job, Queue } from 'bullmq';
import {
  AUDIT_JOB_IDS,
  AUDIT_JOB_NAMES,
  AUDIT_QUEUE_STATES,
} from '@modules/audit/interfaces/audit.constants';
import { QUEUES } from '@infrastructure/queue/queue.constants';
import { AuditExportCoordinatorService } from './audit-export-coordinator.service';

describe('AuditExportCoordinatorService', () => {
  let service: AuditExportCoordinatorService;
  let cacheService: Partial<RedisCacheService>;
  let auditQueue: Partial<Queue>;

  beforeEach(async () => {
    cacheService = {
      setIfNotExists: jest.fn().mockResolvedValue(true),
      expireIfValueMatches: jest.fn().mockResolvedValue(true),
      delIfValueMatches: jest.fn().mockResolvedValue(true),
    };
    auditQueue = {
      getJobs: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditExportCoordinatorService,
        { provide: RedisCacheService, useValue: cacheService },
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

  describe('export lock', () => {
    it('should acquire the export lock when it is free', async () => {
      await expect(service.acquireExportLock('lock-1')).resolves.toBeUndefined();
      expect(cacheService.setIfNotExists).toHaveBeenCalledWith(
        AUDIT_JOB_IDS.EXPORT_LOCK_KEY,
        'lock-1',
        3600,
      );
      expect(auditQueue.getJobs).toHaveBeenCalledWith(
        [
          AUDIT_QUEUE_STATES.ACTIVE,
          AUDIT_QUEUE_STATES.WAITING,
          AUDIT_QUEUE_STATES.WAITING_CHILDREN,
          AUDIT_QUEUE_STATES.DELAYED,
          AUDIT_QUEUE_STATES.PRIORITIZED,
        ],
        0,
        -1,
      );
    });

    it('should reject when the export lock is already taken', async () => {
      (cacheService.setIfNotExists as jest.Mock).mockResolvedValue(false);
      await expect(service.acquireExportLock('lock-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject when a generate export job is already queued or active', async () => {
      (auditQueue.getJobs as jest.Mock).mockResolvedValue([
        {
          name: AUDIT_JOB_NAMES.GENERATE_EXPORT,
        } as Job,
      ]);

      await expect(service.acquireExportLock('lock-1')).rejects.toThrow(
        ConflictException,
      );
      expect(cacheService.delIfValueMatches).toHaveBeenCalledWith(
        AUDIT_JOB_IDS.EXPORT_LOCK_KEY,
        'lock-1',
      );
    });

    it('should ignore non-export audit jobs in the queue scan', async () => {
      (auditQueue.getJobs as jest.Mock).mockResolvedValue([
        {
          name: AUDIT_JOB_NAMES.CLEANUP_OLD_LOGS,
        } as Job,
      ]);

      await expect(service.acquireExportLock('lock-1')).resolves.toBeUndefined();
    });

    it('should translate Redis acquisition failures into service unavailable', async () => {
      (cacheService.setIfNotExists as jest.Mock).mockRejectedValue(
        new Error('redis-down'),
      );

      await expect(service.acquireExportLock('lock-1')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should release the lock if queue inspection fails after acquiring it', async () => {
      (auditQueue.getJobs as jest.Mock).mockRejectedValue(new Error('queue-down'));

      await expect(service.acquireExportLock('lock-1')).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(cacheService.delIfValueMatches).toHaveBeenCalledWith(
        AUDIT_JOB_IDS.EXPORT_LOCK_KEY,
        'lock-1',
      );
    });

    it('should refresh the export lock ttl for the same owner', async () => {
      await expect(service.refreshExportLock('lock-1')).resolves.toBeUndefined();
      expect(cacheService.expireIfValueMatches).toHaveBeenCalledWith(
        AUDIT_JOB_IDS.EXPORT_LOCK_KEY,
        'lock-1',
        3600,
      );
    });

    it('should fail when the export lock ownership is lost during refresh', async () => {
      (cacheService.expireIfValueMatches as jest.Mock).mockResolvedValue(false);

      await expect(service.refreshExportLock('lock-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should translate Redis refresh failures into service unavailable', async () => {
      (cacheService.expireIfValueMatches as jest.Mock).mockRejectedValue(
        new Error('redis-down'),
      );

      await expect(service.refreshExportLock('lock-1')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should release the export lock for the same owner', async () => {
      await expect(service.releaseExportLock('lock-1')).resolves.toBe(true);
      expect(cacheService.delIfValueMatches).toHaveBeenCalledWith(
        AUDIT_JOB_IDS.EXPORT_LOCK_KEY,
        'lock-1',
      );
    });

    it('should retry lock release and reduce ttl when direct release keeps failing', async () => {
      (cacheService.delIfValueMatches as jest.Mock).mockRejectedValue(
        new Error('redis-down'),
      );
      (cacheService.expireIfValueMatches as jest.Mock).mockResolvedValue(true);

      await expect(service.releaseExportLock('lock-1')).resolves.toBe(false);
      expect(cacheService.delIfValueMatches).toHaveBeenCalledTimes(3);
      expect(cacheService.expireIfValueMatches).toHaveBeenCalledWith(
        AUDIT_JOB_IDS.EXPORT_LOCK_KEY,
        'lock-1',
        60,
      );
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

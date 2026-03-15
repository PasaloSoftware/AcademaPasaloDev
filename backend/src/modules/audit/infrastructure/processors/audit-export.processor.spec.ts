import { AuditExportProcessor } from './audit-export.processor';
import { AuditService } from '@modules/audit/application/audit.service';
import { AuditExportArtifactsService } from '@modules/audit/application/audit-export-artifacts.service';
import { AuditExportCoordinatorService } from '@modules/audit/application/audit-export-coordinator.service';
import { AuditExportReadyNotificationService } from '@modules/notifications/application/audit-export-ready-notification.service';
import { Queue } from 'bullmq';
import {
  AUDIT_EXPORT_STATUS,
  AUDIT_JOB_NAMES,
} from '@modules/audit/interfaces/audit.constants';

describe('AuditExportProcessor', () => {
  it('should keep the export ready when deferred expiration scheduling fails', async () => {
    const auditService = {
      generateAsyncExportArtifact: jest.fn().mockResolvedValue({
        artifactName: 'audit.zip',
        artifactStorageKey: 'audit-key.zip',
        artifactExpiresAt: '2099-03-14T21:00:00.000Z',
        estimatedFileCount: 2,
      }),
    } as unknown as AuditService;
    const auditExportArtifacts = {} as AuditExportArtifactsService;
    const auditExportCoordinator = {
      refreshExportLock: jest.fn().mockResolvedValue(undefined),
      releaseExportLock: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuditExportCoordinatorService;
    const auditExportReadyNotificationService = {
      createReadyNotification: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuditExportReadyNotificationService;
    const auditQueue = {
      add: jest.fn().mockRejectedValue(new Error('scheduler-down')),
    } as unknown as Queue;
    const processor = new AuditExportProcessor(
      auditService,
      auditExportArtifacts,
      auditExportCoordinator,
      auditExportReadyNotificationService,
      auditQueue,
    );

    const updateProgress = jest.fn().mockResolvedValue(undefined);
    const job = {
      id: 'job-1',
      name: AUDIT_JOB_NAMES.GENERATE_EXPORT,
      data: {
        requestedByUserId: 'user-1',
        filters: {},
        totalRows: 120000,
        estimatedFileCount: 2,
        lockToken: 'lock-1',
      },
      updateProgress,
    };

    await expect(processor.process(job as never)).resolves.toBeUndefined();
    expect(updateProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: AUDIT_EXPORT_STATUS.READY,
        artifactStorageKey: 'audit-key.zip',
      }),
    );
    expect(updateProgress).not.toHaveBeenCalledWith(
      expect.objectContaining({
        stage: AUDIT_EXPORT_STATUS.FAILED,
      }),
    );
    expect(
      auditExportReadyNotificationService.createReadyNotification as jest.Mock,
    ).toHaveBeenCalledWith({
      requestedByUserId: 'user-1',
      exportJobId: 'job-1',
      artifactName: 'audit.zip',
      artifactExpiresAt: '2099-03-14T21:00:00.000Z',
      estimatedFileCount: 2,
    });
  });

  it('should delete the generated artifact if persisting READY status fails', async () => {
    const auditService = {
      generateAsyncExportArtifact: jest.fn().mockResolvedValue({
        artifactName: 'audit.zip',
        artifactStorageKey: 'audit-key.zip',
        artifactExpiresAt: '2099-03-14T21:00:00.000Z',
        estimatedFileCount: 2,
      }),
    } as unknown as AuditService;
    const auditExportArtifacts = {
      deleteArtifactByStorageKey: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuditExportArtifactsService;
    const auditExportCoordinator = {
      refreshExportLock: jest.fn().mockResolvedValue(undefined),
      releaseExportLock: jest.fn().mockResolvedValue(true),
    } as unknown as AuditExportCoordinatorService;
    const auditExportReadyNotificationService = {
      createReadyNotification: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuditExportReadyNotificationService;
    const auditQueue = {
      add: jest.fn().mockResolvedValue(undefined),
    } as unknown as Queue;
    const processor = new AuditExportProcessor(
      auditService,
      auditExportArtifacts,
      auditExportCoordinator,
      auditExportReadyNotificationService,
      auditQueue,
    );

    const updateProgress = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('progress-down'))
      .mockResolvedValueOnce(undefined);
    const job = {
      id: 'job-2',
      name: AUDIT_JOB_NAMES.GENERATE_EXPORT,
      data: {
        requestedByUserId: 'user-1',
        filters: {},
        totalRows: 120000,
        estimatedFileCount: 2,
        lockToken: 'lock-2',
      },
      updateProgress,
    };

    await expect(processor.process(job as never)).rejects.toThrow('progress-down');
    expect(
      (auditExportArtifacts.deleteArtifactByStorageKey as jest.Mock),
    ).toHaveBeenCalledWith('audit-key.zip');
    expect(
      auditExportCoordinator.releaseExportLock as jest.Mock,
    ).toHaveBeenCalledWith('lock-2');
  });

  it('should still release the export lock if cleanup inside the catch fails', async () => {
    const auditService = {
      generateAsyncExportArtifact: jest.fn().mockResolvedValue({
        artifactName: 'audit.zip',
        artifactStorageKey: 'audit-key.zip',
        artifactExpiresAt: '2099-03-14T21:00:00.000Z',
        estimatedFileCount: 2,
      }),
    } as unknown as AuditService;
    const auditExportArtifacts = {
      deleteArtifactByStorageKey: jest.fn().mockRejectedValue(new Error('cleanup-down')),
    } as unknown as AuditExportArtifactsService;
    const auditExportCoordinator = {
      refreshExportLock: jest.fn().mockResolvedValue(undefined),
      releaseExportLock: jest.fn().mockResolvedValue(true),
    } as unknown as AuditExportCoordinatorService;
    const auditExportReadyNotificationService = {
      createReadyNotification: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuditExportReadyNotificationService;
    const auditQueue = {
      add: jest.fn().mockResolvedValue(undefined),
    } as unknown as Queue;
    const processor = new AuditExportProcessor(
      auditService,
      auditExportArtifacts,
      auditExportCoordinator,
      auditExportReadyNotificationService,
      auditQueue,
    );

    const updateProgress = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('progress-down'))
      .mockResolvedValueOnce(undefined);
    const job = {
      id: 'job-3',
      name: AUDIT_JOB_NAMES.GENERATE_EXPORT,
      data: {
        requestedByUserId: 'user-1',
        filters: {},
        totalRows: 120000,
        estimatedFileCount: 2,
        lockToken: 'lock-3',
      },
      updateProgress,
    };

    await expect(processor.process(job as never)).rejects.toThrow('progress-down');
    expect(
      auditExportCoordinator.releaseExportLock as jest.Mock,
    ).toHaveBeenCalledWith('lock-3');
  });
});

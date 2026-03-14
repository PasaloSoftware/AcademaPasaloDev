import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import {
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { AuditExportJobsService } from './audit-export-jobs.service';
import { AuditService } from './audit.service';
import { QUEUES } from '@infrastructure/queue/queue.constants';
import {
  AUDIT_EXPORT_STATUS,
  AUDIT_JOB_NAMES,
} from '@modules/audit/interfaces/audit.constants';
import { AuditExportArtifactsService } from './audit-export-artifacts.service';
import { Readable } from 'stream';
import { AuditExportCoordinatorService } from './audit-export-coordinator.service';

describe('AuditExportJobsService', () => {
  let service: AuditExportJobsService;
  let auditService: Partial<AuditService>;
  let auditQueue: Partial<Queue>;
  let auditExportArtifacts: Partial<AuditExportArtifactsService>;
  let auditExportCoordinator: Partial<AuditExportCoordinatorService>;
  let addedJob: Partial<Job>;

  beforeEach(async () => {
    addedJob = {
      id: 'job-123',
      updateProgress: jest.fn().mockResolvedValue(undefined),
    };

    auditService = {
      getExportPlan: jest.fn().mockResolvedValue({
        mode: 'async',
        totalRows: 150000,
        thresholdRows: 100000,
        rowsPerFile: 100000,
        estimatedFileCount: 2,
        artifactTtlSeconds: 3600,
      }),
      prepareSyncExport: jest.fn().mockResolvedValue({
        fileName: 'reporte-auditoria.xlsx',
        filePath: 'C:\\tmp\\reporte-auditoria.xlsx',
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    };

    auditExportArtifacts = {
      createReadStream: jest
        .fn()
        .mockReturnValue(Readable.from(Buffer.from('excel'))),
      deleteFileIfExists: jest.fn().mockResolvedValue(undefined),
      deleteArtifactByStorageKey: jest.fn().mockResolvedValue(undefined),
      assertArtifactExists: jest
        .fn()
        .mockResolvedValue('C:\\tmp\\reporte-auditoria-masivo.zip'),
    };

    auditExportCoordinator = {
      acquireExportLock: jest.fn().mockResolvedValue(undefined),
      refreshExportLock: jest.fn().mockResolvedValue(undefined),
      releaseExportLock: jest.fn().mockResolvedValue(undefined),
    };

    auditQueue = {
      add: jest.fn().mockResolvedValue(addedJob),
      getJob: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditExportJobsService,
        { provide: AuditService, useValue: auditService },
        {
          provide: AuditExportArtifactsService,
          useValue: auditExportArtifacts,
        },
        {
          provide: AuditExportCoordinatorService,
          useValue: auditExportCoordinator,
        },
        { provide: getQueueToken(QUEUES.AUDIT), useValue: auditQueue },
      ],
    }).compile();

    service = module.get<AuditExportJobsService>(AuditExportJobsService);
  });

  it('should enqueue an async export when the plan is async', async () => {
    const result = await service.requestExport('user-1', {});

    expect('jobId' in result).toBe(true);
    expect(auditExportCoordinator.acquireExportLock).toHaveBeenCalledTimes(1);
    expect(auditQueue.add).toHaveBeenCalledWith(
      AUDIT_JOB_NAMES.GENERATE_EXPORT,
      expect.objectContaining({
        requestedByUserId: 'user-1',
        totalRows: 150000,
        lockToken: expect.any(String),
      }),
      expect.objectContaining({ jobId: expect.any(String) }),
    );
    expect((result as { jobId: string }).jobId).toBe('job-123');
    expect((addedJob.updateProgress as jest.Mock).mock.calls[0][0]).toEqual(
      expect.objectContaining({ stage: AUDIT_EXPORT_STATUS.QUEUED }),
    );
    expect(auditExportCoordinator.releaseExportLock).not.toHaveBeenCalled();
  });

  it('should return a prepared download when the plan is sync', async () => {
    (auditService.getExportPlan as jest.Mock).mockResolvedValue({
      mode: 'sync',
      totalRows: 200,
      thresholdRows: 100000,
      rowsPerFile: 100000,
      estimatedFileCount: 1,
      artifactTtlSeconds: 3600,
    });

    const result = await service.requestExport('user-1', {});

    expect('stream' in result).toBe(true);
    expect(auditService.prepareSyncExport).toHaveBeenCalled();
    expect(auditQueue.add).not.toHaveBeenCalled();
    expect(auditExportCoordinator.acquireExportLock).toHaveBeenCalledTimes(1);
    expect(auditExportCoordinator.refreshExportLock).toHaveBeenCalledTimes(1);
    expect(auditExportCoordinator.releaseExportLock).toHaveBeenCalledTimes(1);

    await result.onFinish?.();

    expect(auditExportArtifacts.deleteFileIfExists).toHaveBeenCalledWith(
      'C:\\tmp\\reporte-auditoria.xlsx',
    );
    expect(auditExportCoordinator.releaseExportLock).toHaveBeenCalledTimes(1);
  });

  it('should release the sync lock on abort', async () => {
    (auditService.getExportPlan as jest.Mock).mockResolvedValue({
      mode: 'sync',
      totalRows: 200,
      thresholdRows: 100000,
      rowsPerFile: 100000,
      estimatedFileCount: 1,
      artifactTtlSeconds: 3600,
    });

    const result = await service.requestExport('user-1', {});
    expect('stream' in result).toBe(true);
    expect(auditExportCoordinator.refreshExportLock).toHaveBeenCalledTimes(1);

    await result.onAbort?.();

    expect(auditExportArtifacts.deleteFileIfExists).toHaveBeenCalledWith(
      'C:\\tmp\\reporte-auditoria.xlsx',
    );
    expect(auditExportCoordinator.releaseExportLock).toHaveBeenCalledTimes(1);
  });

  it('should return the export job status', async () => {
    (auditQueue.getJob as jest.Mock).mockResolvedValue({
      id: 'job-123',
      name: AUDIT_JOB_NAMES.GENERATE_EXPORT,
      progress: {
        stage: AUDIT_EXPORT_STATUS.READY,
        progress: 100,
        totalRows: 150000,
        estimatedFileCount: 2,
        artifactName: 'audit.zip',
        artifactStorageKey: 'audit-key.zip',
        artifactExpiresAt: '2099-03-14T21:00:00.000Z',
        errorMessage: null,
      },
      getState: jest.fn().mockResolvedValue('completed'),
      updateProgress: jest.fn().mockResolvedValue(undefined),
      data: {
        requestedByUserId: 'user-1',
      },
    } as unknown as Job);

    const result = await service.getExportJobStatus(
      'job-123',
      'user-1',
    );

    expect(result.status).toBe(AUDIT_EXPORT_STATUS.READY);
    expect(result.readyForDownload).toBe(true);
  });

  it('should throw NotFound when the job does not exist', async () => {
    await expect(
      service.getExportJobStatus('missing', 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should forbid reading the status of another admin job', async () => {
    (auditQueue.getJob as jest.Mock).mockResolvedValue({
      id: 'job-123',
      name: AUDIT_JOB_NAMES.GENERATE_EXPORT,
      progress: {},
      getState: jest.fn().mockResolvedValue('completed'),
      data: {
        requestedByUserId: 'owner-user',
      },
    } as unknown as Job);

    await expect(
      service.getExportJobStatus('job-123', 'intruder-user'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should return a download descriptor for a ready job', async () => {
    const updateProgress = jest.fn().mockResolvedValue(undefined);
    (auditQueue.getJob as jest.Mock).mockResolvedValue({
      id: 'job-123',
      name: AUDIT_JOB_NAMES.GENERATE_EXPORT,
      progress: {
        stage: AUDIT_EXPORT_STATUS.READY,
        progress: 100,
        totalRows: 150000,
        estimatedFileCount: 2,
        artifactName: 'audit.zip',
        artifactStorageKey: 'audit-key.zip',
        artifactExpiresAt: '2099-03-14T21:00:00.000Z',
        errorMessage: null,
      },
      data: {
        requestedByUserId: 'user-1',
      },
      updateProgress,
      getState: jest.fn().mockResolvedValue('completed'),
    } as unknown as Job);

    const result = await service.downloadExportJob(
      'job-123',
      'user-1',
    );

    expect(result.fileName).toBe('audit.zip');
    await result.onAbort?.();
    expect(
      auditExportArtifacts.deleteArtifactByStorageKey,
    ).not.toHaveBeenCalled();
    await result.onFinish?.();
    expect(updateProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: AUDIT_EXPORT_STATUS.EXPIRED,
      }),
    );
    expect(updateProgress).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        stage: AUDIT_EXPORT_STATUS.EXPIRED,
        artifactStorageKey: 'audit-key.zip',
      }),
    );
    expect(updateProgress).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        stage: AUDIT_EXPORT_STATUS.EXPIRED,
        artifactStorageKey: null,
      }),
    );
    expect(auditExportArtifacts.deleteArtifactByStorageKey).toHaveBeenCalledWith(
      'audit-key.zip',
    );
  });

  it('should still mark the job as expired if artifact deletion fails after download', async () => {
    const updateProgress = jest.fn().mockResolvedValue(undefined);
    (auditExportArtifacts.deleteArtifactByStorageKey as jest.Mock).mockRejectedValue(
      new Error('fs-failure'),
    );
    (auditQueue.getJob as jest.Mock).mockResolvedValue({
      id: 'job-123',
      name: AUDIT_JOB_NAMES.GENERATE_EXPORT,
      progress: {
        stage: AUDIT_EXPORT_STATUS.READY,
        progress: 100,
        totalRows: 150000,
        estimatedFileCount: 2,
        artifactName: 'audit.zip',
        artifactStorageKey: 'audit-key.zip',
        artifactExpiresAt: '2099-03-14T21:00:00.000Z',
        errorMessage: null,
      },
      data: {
        requestedByUserId: 'user-1',
      },
      updateProgress,
      getState: jest.fn().mockResolvedValue('completed'),
    } as unknown as Job);

    const result = await service.downloadExportJob('job-123', 'user-1');

    await expect(result.onFinish?.()).rejects.toThrow('fs-failure');
    expect(updateProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: AUDIT_EXPORT_STATUS.EXPIRED,
        artifactStorageKey: 'audit-key.zip',
      }),
    );
  });

  it('should cleanup an expired artifact that still has a storage key', async () => {
    const updateProgress = jest.fn().mockResolvedValue(undefined);
    (auditQueue.getJob as jest.Mock).mockResolvedValue({
      id: 'job-123',
      name: AUDIT_JOB_NAMES.GENERATE_EXPORT,
      progress: {
        stage: AUDIT_EXPORT_STATUS.EXPIRED,
        progress: 100,
        totalRows: 150000,
        estimatedFileCount: 2,
        artifactName: 'audit.zip',
        artifactStorageKey: 'audit-key.zip',
        artifactExpiresAt: '2099-03-14T21:00:00.000Z',
        errorMessage: null,
      },
      data: {
        requestedByUserId: 'user-1',
      },
      updateProgress,
      getState: jest.fn().mockResolvedValue('completed'),
    } as unknown as Job);

    const result = await service.getExportJobStatus('job-123', 'user-1');

    expect(result.status).toBe(AUDIT_EXPORT_STATUS.EXPIRED);
    expect(auditExportArtifacts.deleteArtifactByStorageKey).toHaveBeenCalledWith(
      'audit-key.zip',
    );
    expect(updateProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: AUDIT_EXPORT_STATUS.EXPIRED,
        artifactStorageKey: null,
      }),
    );
  });

  it('should throw Gone when the artifact is already expired', async () => {
    (auditQueue.getJob as jest.Mock).mockResolvedValue({
      id: 'job-123',
      name: AUDIT_JOB_NAMES.GENERATE_EXPORT,
      progress: {
        stage: AUDIT_EXPORT_STATUS.EXPIRED,
        progress: 100,
        totalRows: 150000,
        estimatedFileCount: 2,
        artifactName: 'audit.zip',
        artifactStorageKey: null,
        artifactExpiresAt: '2020-03-14T21:00:00.000Z',
        errorMessage: null,
      },
      data: {
        requestedByUserId: 'user-1',
      },
      getState: jest.fn().mockResolvedValue('completed'),
    } as unknown as Job);

    await expect(service.downloadExportJob('job-123', 'user-1')).rejects.toThrow(
      GoneException,
    );
  });

  it('should mark the job as expired when the artifact file is missing', async () => {
    const updateProgress = jest.fn().mockResolvedValue(undefined);
    (auditExportArtifacts.assertArtifactExists as jest.Mock).mockRejectedValue(
      new NotFoundException('missing'),
    );
    (auditQueue.getJob as jest.Mock).mockResolvedValue({
      id: 'job-123',
      name: AUDIT_JOB_NAMES.GENERATE_EXPORT,
      progress: {
        stage: AUDIT_EXPORT_STATUS.READY,
        progress: 100,
        totalRows: 150000,
        estimatedFileCount: 2,
        artifactName: 'audit.zip',
        artifactStorageKey: 'audit-key.zip',
        artifactExpiresAt: '2099-03-14T21:00:00.000Z',
        errorMessage: null,
      },
      data: {
        requestedByUserId: 'user-1',
      },
      updateProgress,
      getState: jest.fn().mockResolvedValue('completed'),
    } as unknown as Job);

    await expect(service.downloadExportJob('job-123', 'user-1')).rejects.toThrow(
      GoneException,
    );
    expect(updateProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: AUDIT_EXPORT_STATUS.EXPIRED,
        artifactStorageKey: null,
      }),
    );
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { AuditExportJobsService } from './audit-export-jobs.service';
import { AuditService } from './audit.service';
import { QUEUES } from '@infrastructure/queue/queue.constants';
import {
  AUDIT_EXPORT_STATUS,
  AUDIT_JOB_IDS,
  AUDIT_JOB_NAMES,
} from '@modules/audit/interfaces/audit.constants';
import { AuditExportArtifactsService } from './audit-export-artifacts.service';
import { Readable } from 'stream';

describe('AuditExportJobsService', () => {
  let service: AuditExportJobsService;
  let auditService: Partial<AuditService>;
  let auditQueue: Partial<Queue>;
  let auditExportArtifacts: Partial<AuditExportArtifactsService>;
  let addedJob: Partial<Job>;

  beforeEach(async () => {
    addedJob = {
      id: AUDIT_JOB_IDS.EXPORT_SINGLETON,
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
        { provide: getQueueToken(QUEUES.AUDIT), useValue: auditQueue },
      ],
    }).compile();

    service = module.get<AuditExportJobsService>(AuditExportJobsService);
  });

  it('should enqueue an async export when the plan is async', async () => {
    const result = await service.requestExport('user-1', {});

    expect(Buffer.isBuffer(result)).toBe(false);
    expect(auditQueue.add).toHaveBeenCalledWith(
      AUDIT_JOB_NAMES.GENERATE_EXPORT,
      expect.objectContaining({ requestedByUserId: 'user-1', totalRows: 150000 }),
      expect.objectContaining({ jobId: AUDIT_JOB_IDS.EXPORT_SINGLETON }),
    );
    expect((addedJob.updateProgress as jest.Mock).mock.calls[0][0]).toEqual(
      expect.objectContaining({ stage: AUDIT_EXPORT_STATUS.QUEUED }),
    );
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
  });

  it('should reject when the singleton job is already active', async () => {
    (auditQueue.getJob as jest.Mock).mockResolvedValue({
      name: AUDIT_JOB_NAMES.GENERATE_EXPORT,
      getState: jest.fn().mockResolvedValue('active'),
    } as unknown as Job);

    await expect(service.requestExport('user-1', {})).rejects.toThrow(
      ConflictException,
    );
  });

  it('should return the export job status', async () => {
    (auditQueue.getJob as jest.Mock).mockResolvedValue({
      id: AUDIT_JOB_IDS.EXPORT_SINGLETON,
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
      AUDIT_JOB_IDS.EXPORT_SINGLETON,
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
      id: AUDIT_JOB_IDS.EXPORT_SINGLETON,
      name: AUDIT_JOB_NAMES.GENERATE_EXPORT,
      progress: {},
      getState: jest.fn().mockResolvedValue('completed'),
      data: {
        requestedByUserId: 'owner-user',
      },
    } as unknown as Job);

    await expect(
      service.getExportJobStatus(AUDIT_JOB_IDS.EXPORT_SINGLETON, 'intruder-user'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should return a download descriptor for a ready job', async () => {
    const updateProgress = jest.fn().mockResolvedValue(undefined);
    (auditQueue.getJob as jest.Mock).mockResolvedValue({
      id: AUDIT_JOB_IDS.EXPORT_SINGLETON,
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
      AUDIT_JOB_IDS.EXPORT_SINGLETON,
      'user-1',
    );

    expect(result.fileName).toBe('audit.zip');
    await result.onComplete?.();
    expect(auditExportArtifacts.deleteArtifactByStorageKey).toHaveBeenCalledWith(
      'audit-key.zip',
    );
    expect(updateProgress).toHaveBeenCalled();
  });
});

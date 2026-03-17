import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ClassEventRecordingUploadsService } from '@modules/events/application/class-event-recording-uploads.service';
import { ClassEventRepository } from '@modules/events/infrastructure/class-event.repository';
import { EvaluationRepository } from '@modules/evaluations/infrastructure/evaluation.repository';
import { ClassEventsPermissionService } from '@modules/events/application/class-events-permission.service';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { DriveAccessScopeService } from '@modules/media-access/application/drive-access-scope.service';
import { ClassEventRecordingStatusRepository } from '@modules/events/infrastructure/class-event-recording-status.repository';
import { ClassEventRecordingDriveService } from '@modules/events/application/class-event-recording-drive.service';
import { ClassEventsCacheService } from '@modules/events/application/class-events-cache.service';
import {
  CLASS_EVENT_RECORDING_STATUS_CODES,
} from '@modules/events/domain/class-event.constants';

describe('ClassEventRecordingUploadsService', () => {
  let service: ClassEventRecordingUploadsService;
  let classEventRepository: jest.Mocked<ClassEventRepository>;
  let evaluationRepository: jest.Mocked<EvaluationRepository>;
  let permissionService: jest.Mocked<ClassEventsPermissionService>;
  let cacheService: jest.Mocked<RedisCacheService>;
  let driveAccessScopeService: jest.Mocked<DriveAccessScopeService>;
  let recordingStatusRepository: jest.Mocked<ClassEventRecordingStatusRepository>;
  let recordingDriveService: jest.Mocked<ClassEventRecordingDriveService>;

  const user = { id: 'prof-1', activeRole: 'PROFESSOR' } as any;
  const evaluation = {
    id: 'eval-1',
    courseCycle: { academicCycleId: 'cycle-1', course: { courseTypeId: 'ct-1' } },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassEventRecordingUploadsService,
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(async (work: (manager: unknown) => Promise<unknown>) =>
              await work({}),
            ),
          },
        },
        {
          provide: ClassEventRepository,
          useValue: {
            findById: jest.fn(),
            update: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: EvaluationRepository,
          useValue: {
            findByIdWithCycle: jest.fn(),
          },
        },
        {
          provide: ClassEventsPermissionService,
          useValue: {
            assertMutationAllowedForEvaluation: jest.fn().mockResolvedValue(undefined),
            checkUserAuthorizationForUser: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: ClassEventsCacheService,
          useValue: {
            invalidateForEvaluation: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: RedisCacheService,
          useValue: {
            setIfNotExists: jest.fn().mockResolvedValue(true),
            set: jest.fn().mockResolvedValue(undefined),
            setOrThrow: jest.fn().mockResolvedValue(undefined),
            get: jest.fn().mockResolvedValue(null),
            del: jest.fn().mockResolvedValue(undefined),
            delIfValueMatches: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: DriveAccessScopeService,
          useValue: {
            resolveForEvaluation: jest.fn().mockResolvedValue({
              persisted: { driveVideosFolderId: 'videos-folder-1' },
            }),
          },
        },
        {
          provide: ClassEventRecordingStatusRepository,
          useValue: {
            findByCode: jest.fn().mockImplementation(async (code: string) => ({
              id:
                code === CLASS_EVENT_RECORDING_STATUS_CODES.NOT_AVAILABLE
                  ? 'status-not-available'
                  : 'status-processing',
              code,
            })),
          },
        },
        {
          provide: ClassEventRecordingDriveService,
          useValue: {
            createResumableUploadSession: jest.fn().mockResolvedValue({
              resumableSessionUrl: 'https://upload-session.example/resumable-1',
            }),
          },
        },
      ],
    }).compile();

    service = module.get(ClassEventRecordingUploadsService);
    classEventRepository = module.get(ClassEventRepository);
    evaluationRepository = module.get(EvaluationRepository);
    permissionService = module.get(ClassEventsPermissionService);
    cacheService = module.get(RedisCacheService);
    driveAccessScopeService = module.get(DriveAccessScopeService);
    recordingStatusRepository = module.get(ClassEventRecordingStatusRepository);
    recordingDriveService = module.get(ClassEventRecordingDriveService);

    evaluationRepository.findByIdWithCycle.mockResolvedValue(evaluation);
  });

  it('marca PROCESSING solo para upload inicial', async () => {
    classEventRepository.findById
      .mockResolvedValueOnce({
        id: 'event-1',
        evaluationId: 'eval-1',
        isCancelled: false,
        recordingStatus: { code: CLASS_EVENT_RECORDING_STATUS_CODES.NOT_AVAILABLE },
      } as any)
      .mockResolvedValueOnce({
        id: 'event-1',
        evaluationId: 'eval-1',
        isCancelled: false,
        recordingStatus: { code: CLASS_EVENT_RECORDING_STATUS_CODES.PROCESSING },
      } as any);

    const result = await service.startUpload('event-1', user, {
      fileName: 'clase-1.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1024,
    });

    expect(recordingStatusRepository.findByCode).toHaveBeenCalledWith(
      CLASS_EVENT_RECORDING_STATUS_CODES.PROCESSING,
    );
    expect(classEventRepository.update).toHaveBeenCalled();
    expect(result.recordingStatus).toBe(
      CLASS_EVENT_RECORDING_STATUS_CODES.PROCESSING,
    );
    expect(result.activeUploadMode).toBe('initial');
    expect(result.resumableSessionUrl).toBe(
      'https://upload-session.example/resumable-1',
    );
  });

  it('mantiene READY durante reemplazo', async () => {
    classEventRepository.findById
      .mockResolvedValueOnce({
        id: 'event-1',
        evaluationId: 'eval-1',
        isCancelled: false,
        createdBy: 'otro-profesor',
        recordingStatus: { code: CLASS_EVENT_RECORDING_STATUS_CODES.READY },
      } as any)
      .mockResolvedValueOnce({
        id: 'event-1',
        evaluationId: 'eval-1',
        isCancelled: false,
        recordingStatus: { code: CLASS_EVENT_RECORDING_STATUS_CODES.READY },
      } as any);

    const result = await service.startUpload('event-1', user, {
      fileName: 'clase-1-reemplazo.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 2048,
    });

    expect(classEventRepository.update).not.toHaveBeenCalled();
    expect(result.recordingStatus).toBe(CLASS_EVENT_RECORDING_STATUS_CODES.READY);
    expect(result.activeUploadMode).toBe('replacement');
    expect(result.resumableSessionUrl).toBe(
      'https://upload-session.example/resumable-1',
    );
  });

  it('permite upload a profesor habilitado aunque no sea creador del evento', async () => {
    classEventRepository.findById
      .mockResolvedValueOnce({
        id: 'event-1',
        evaluationId: 'eval-1',
        isCancelled: false,
        createdBy: 'creador-distinto',
        recordingStatus: { code: CLASS_EVENT_RECORDING_STATUS_CODES.NOT_AVAILABLE },
      } as any)
      .mockResolvedValueOnce({
        id: 'event-1',
        evaluationId: 'eval-1',
        isCancelled: false,
        createdBy: 'creador-distinto',
        recordingStatus: { code: CLASS_EVENT_RECORDING_STATUS_CODES.PROCESSING },
      } as any);

    const result = await service.startUpload('event-1', user, {
      fileName: 'clase-1.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1024,
    });

    expect(permissionService.assertMutationAllowedForEvaluation).toHaveBeenCalled();
    expect(result.activeUploadMode).toBe('initial');
  });

  it('crea sesion resumable apuntando a la carpeta de videos resuelta', async () => {
    classEventRepository.findById
      .mockResolvedValueOnce({
        id: 'event-1',
        evaluationId: 'eval-1',
        isCancelled: false,
        recordingStatus: { code: CLASS_EVENT_RECORDING_STATUS_CODES.NOT_AVAILABLE },
      } as any)
      .mockResolvedValueOnce({
        id: 'event-1',
        evaluationId: 'eval-1',
        isCancelled: false,
        recordingStatus: { code: CLASS_EVENT_RECORDING_STATUS_CODES.PROCESSING },
      } as any);

    await service.startUpload('event-1', user, {
      fileName: 'clase-1.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1024,
    });

    expect(recordingDriveService.createResumableUploadSession).toHaveBeenCalledWith(
      expect.objectContaining({
        classEventId: 'event-1',
        evaluationId: 'eval-1',
        driveVideosFolderId: 'videos-folder-1',
      }),
    );
  });

  it('revierte estado inicial y libera lock si falla crear sesion resumable', async () => {
    classEventRepository.findById.mockResolvedValue({
      id: 'event-1',
      evaluationId: 'eval-1',
      isCancelled: false,
      recordingStatus: { code: CLASS_EVENT_RECORDING_STATUS_CODES.NOT_AVAILABLE },
    } as any);
    recordingDriveService.createResumableUploadSession.mockRejectedValueOnce(
      new Error('drive failed'),
    );

    await expect(
      service.startUpload('event-1', user, {
        fileName: 'clase-1.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 1024,
      }),
    ).rejects.toThrow('drive failed');

    expect(classEventRepository.update).toHaveBeenNthCalledWith(
      1,
      'event-1',
      expect.objectContaining({ recordingStatusId: 'status-processing' }),
      expect.anything(),
    );
    expect(classEventRepository.update).toHaveBeenNthCalledWith(
      2,
      'event-1',
      expect.objectContaining({ recordingStatusId: 'status-not-available' }),
    );
    expect(cacheService.delIfValueMatches).toHaveBeenCalled();
  });

  it('rechaza inicio concurrente si ya existe intento activo en Redis', async () => {
    classEventRepository.findById.mockResolvedValue({
      id: 'event-1',
      evaluationId: 'eval-1',
      isCancelled: false,
      recordingStatus: { code: CLASS_EVENT_RECORDING_STATUS_CODES.NOT_AVAILABLE },
    } as any);
    cacheService.setIfNotExists.mockResolvedValueOnce(false);

    await expect(
      service.startUpload('event-1', user, {
        fileName: 'clase-1.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 1024,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rechaza inicio cuando la evaluacion no tiene carpeta de videos provisionada', async () => {
    classEventRepository.findById.mockResolvedValue({
      id: 'event-1',
      evaluationId: 'eval-1',
      isCancelled: false,
      recordingStatus: { code: CLASS_EVENT_RECORDING_STATUS_CODES.NOT_AVAILABLE },
    } as any);
    driveAccessScopeService.resolveForEvaluation.mockResolvedValueOnce({
      persisted: { driveVideosFolderId: null },
    } as any);

    await expect(
      service.startUpload('event-1', user, {
        fileName: 'clase-1.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 1024,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('devuelve estado idle cuando no hay intento activo en Redis', async () => {
    classEventRepository.findById.mockResolvedValue({
      id: 'event-1',
      evaluationId: 'eval-1',
      isCancelled: false,
      recordingStatus: { code: CLASS_EVENT_RECORDING_STATUS_CODES.READY },
    } as any);

    const result = await service.getUploadStatus('event-1', user);

    expect(result.hasActiveRecordingUpload).toBe(false);
    expect(result.recordingStatus).toBe(CLASS_EVENT_RECORDING_STATUS_CODES.READY);
  });

  it('rechaza finalize con token distinto al intento activo', async () => {
    classEventRepository.findById.mockResolvedValue({
      id: 'event-1',
      evaluationId: 'eval-1',
      isCancelled: false,
      recordingStatus: { code: CLASS_EVENT_RECORDING_STATUS_CODES.PROCESSING },
    } as any);
    cacheService.get.mockResolvedValueOnce({
      uploadToken: 'token-activo',
    } as any);

    await expect(
      service.validateFinalizeContract('event-1', user, 'token-distinto'),
    ).rejects.toThrow(ConflictException);
  });

  it('valida el contrato de finalize para el intento activo', async () => {
    classEventRepository.findById.mockResolvedValue({
      id: 'event-1',
      evaluationId: 'eval-1',
      isCancelled: false,
      recordingStatus: { code: CLASS_EVENT_RECORDING_STATUS_CODES.PROCESSING },
    } as any);
    cacheService.get.mockResolvedValueOnce({
      uploadToken: 'token-activo',
      uploadMode: 'initial',
      expiresAt: '2026-03-16T10:00:00.000Z',
    } as any);

    const result = await service.validateFinalizeContract(
      'event-1',
      user,
      'token-activo',
    );

    expect(permissionService.assertMutationAllowedForEvaluation).toHaveBeenCalled();
    expect(result.hasActiveRecordingUpload).toBe(true);
    expect(result.activeUploadMode).toBe('initial');
  });
});

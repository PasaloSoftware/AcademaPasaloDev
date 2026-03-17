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
import { NotificationsDispatchService } from '@modules/notifications/application/notifications-dispatch.service';
import { AuditService } from '@modules/audit/application/audit.service';
import { AUDIT_ACTION_CODES } from '@modules/audit/interfaces/audit.constants';
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
  let notificationsDispatchService: jest.Mocked<NotificationsDispatchService>;
  let auditService: jest.Mocked<AuditService>;

  const user = { id: 'prof-1', activeRole: 'PROFESSOR' } as any;
  const evaluation = {
    id: 'eval-1',
    courseCycle: { academicCycleId: 'cycle-1', course: { courseTypeId: 'ct-1' } },
  } as any;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

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
            isAdminUser: jest.fn().mockReturnValue(false),
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
            getString: jest.fn().mockResolvedValue(null),
            expireIfValueMatches: jest.fn().mockResolvedValue(true),
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
              id: {
                [CLASS_EVENT_RECORDING_STATUS_CODES.NOT_AVAILABLE]:
                  'status-not-available',
                [CLASS_EVENT_RECORDING_STATUS_CODES.PROCESSING]:
                  'status-processing',
                [CLASS_EVENT_RECORDING_STATUS_CODES.READY]: 'status-ready',
              }[code] || 'status-generic',
              code,
            })),
          },
        },
        {
          provide: ClassEventRecordingDriveService,
          useValue: {
            createResumableUploadSession: jest.fn().mockResolvedValue({
              resumableSessionUrl: 'https://upload-session.example/resumable-1',
              fileId: 'drive-file-1',
            }),
            getUploadedFileMetadata: jest.fn(),
            deleteUploadedFile: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: NotificationsDispatchService,
          useValue: {
            dispatchClassRecordingAvailable: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logAction: jest.fn().mockResolvedValue(undefined),
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
    notificationsDispatchService = module.get(NotificationsDispatchService);
    auditService = module.get(AuditService);

    evaluationRepository.findByIdWithCycle.mockResolvedValue(evaluation);
    logSpy = jest
      .spyOn((service as any).logger, 'log')
      .mockImplementation(() => undefined);
    warnSpy = jest
      .spyOn((service as any).logger, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
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
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Carpeta de videos resuelta para upload de grabacion',
        classEventId: 'event-1',
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

    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Intento concurrente de upload de grabacion rechazado',
        classEventId: 'event-1',
      }),
    );
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

    expect(permissionService.assertMutationAllowedForEvaluation).toHaveBeenCalledWith(
      user,
      evaluation,
    );
    expect(result.hasActiveRecordingUpload).toBe(false);
    expect(result.recordingStatus).toBe(CLASS_EVENT_RECORDING_STATUS_CODES.READY);
  });

  it('devuelve estado activo con resumableSessionUrl cuando existe contexto y lock vigentes', async () => {
    classEventRepository.findById.mockResolvedValue({
      id: 'event-1',
      evaluationId: 'eval-1',
      isCancelled: false,
      recordingStatus: { code: CLASS_EVENT_RECORDING_STATUS_CODES.PROCESSING },
    } as any);
    cacheService.get.mockResolvedValueOnce({
      userId: 'prof-1',
      uploadToken: 'token-activo',
      uploadMode: 'initial',
      expiresAt: '2026-03-16T10:00:00.000Z',
      resumableSessionUrl: 'https://upload-session.example/resumable-1',
    } as any);
    cacheService.getString.mockResolvedValueOnce('token-activo');

    const result = await service.getUploadStatus('event-1', user);

    expect(result.hasActiveRecordingUpload).toBe(true);
    expect(result.resumableSessionUrl).toBe(
      'https://upload-session.example/resumable-1',
    );
  });

  it('oculta resumableSessionUrl a profesor autorizado distinto del duenio del intento', async () => {
    classEventRepository.findById.mockResolvedValue({
      id: 'event-1',
      evaluationId: 'eval-1',
      isCancelled: false,
      recordingStatus: { code: CLASS_EVENT_RECORDING_STATUS_CODES.PROCESSING },
    } as any);
    cacheService.get.mockResolvedValueOnce({
      userId: 'otro-profesor',
      uploadToken: 'token-activo',
      uploadMode: 'initial',
      expiresAt: '2026-03-16T10:00:00.000Z',
      resumableSessionUrl: 'https://upload-session.example/resumable-1',
    } as any);
    cacheService.getString.mockResolvedValueOnce('token-activo');

    const result = await service.getUploadStatus('event-1', user);

    expect(result.hasActiveRecordingUpload).toBe(true);
    expect(result.resumableSessionUrl).toBeNull();
  });

  it('limpia contexto abandonado y revierte a NOT_AVAILABLE cuando el lock inicial ya expiró', async () => {
    classEventRepository.findById
      .mockResolvedValueOnce({
        id: 'event-1',
        evaluationId: 'eval-1',
        isCancelled: false,
        recordingStatus: { code: CLASS_EVENT_RECORDING_STATUS_CODES.PROCESSING },
      } as any)
      .mockResolvedValueOnce({
        id: 'event-1',
        evaluationId: 'eval-1',
        isCancelled: false,
        recordingStatus: { code: CLASS_EVENT_RECORDING_STATUS_CODES.NOT_AVAILABLE },
      } as any);
    cacheService.get.mockResolvedValueOnce({
      uploadToken: 'token-activo',
      uploadMode: 'initial',
      expiresAt: '2026-03-16T10:00:00.000Z',
      resumableSessionUrl: 'https://upload-session.example/resumable-1',
    } as any);
    cacheService.getString.mockResolvedValueOnce(null);

    const result = await service.getUploadStatus('event-1', user);

    expect(cacheService.del).toHaveBeenCalled();
    expect(classEventRepository.update).toHaveBeenCalledWith(
      'event-1',
      expect.objectContaining({ recordingStatusId: 'status-not-available' }),
    );
    expect(result.hasActiveRecordingUpload).toBe(false);
    expect(result.recordingStatus).toBe(
      CLASS_EVENT_RECORDING_STATUS_CODES.NOT_AVAILABLE,
    );
  });

  it('heartbeat refresca TTL del lock y del contexto cuando el token coincide', async () => {
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
      resumableSessionUrl: 'https://upload-session.example/resumable-1',
    } as any);

    const result = await service.heartbeatUpload(
      'event-1',
      user,
      'token-activo',
    );

    expect(cacheService.expireIfValueMatches).toHaveBeenCalledWith(
      'class-event-recording-upload:lock:event-1',
      'token-activo',
      expect.any(Number),
    );
    expect(cacheService.setOrThrow).toHaveBeenCalled();
    expect(result.hasActiveRecordingUpload).toBe(true);
    expect(result.resumableSessionUrl).toBe(
      'https://upload-session.example/resumable-1',
    );
  });

  it('rechaza status cuando el usuario no tiene permiso de mutacion sobre la evaluacion', async () => {
    classEventRepository.findById.mockResolvedValue({
      id: 'event-1',
      evaluationId: 'eval-1',
      isCancelled: false,
      recordingStatus: { code: CLASS_EVENT_RECORDING_STATUS_CODES.PROCESSING },
    } as any);
    permissionService.assertMutationAllowedForEvaluation.mockRejectedValueOnce(
      new ForbiddenException('No autorizado'),
    );

    await expect(service.getUploadStatus('event-1', user)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rechaza heartbeat con token distinto al del intento activo', async () => {
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

    await expect(
      service.heartbeatUpload('event-1', user, 'token-distinto'),
    ).rejects.toThrow(ConflictException);
  });

  it('heartbeat falla y limpia intento inicial si el lock ya no pertenece al token activo', async () => {
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
    cacheService.expireIfValueMatches.mockResolvedValueOnce(false);

    await expect(
      service.heartbeatUpload('event-1', user, 'token-activo'),
    ).rejects.toThrow(ConflictException);

    expect(cacheService.del).toHaveBeenCalled();
    expect(classEventRepository.update).toHaveBeenCalledWith(
      'event-1',
      expect.objectContaining({ recordingStatusId: 'status-not-available' }),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Intento de upload abandonado detectado durante heartbeat',
        classEventId: 'event-1',
      }),
    );
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
      userId: 'prof-1',
    } as any);

    await expect(
      service.finalizeUpload('event-1', user, {
        uploadToken: 'token-distinto',
        fileId: 'drive-file-1',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('publica correctamente un archivo valido y limpia Redis', async () => {
    classEventRepository.findById.mockResolvedValue({
      id: 'event-1',
      evaluationId: 'eval-1',
      isCancelled: false,
      recordingStatus: { code: CLASS_EVENT_RECORDING_STATUS_CODES.PROCESSING },
    } as any);
    cacheService.get.mockResolvedValueOnce({
      userId: 'prof-1',
      uploadToken: 'token-activo',
      uploadMode: 'initial',
      expiresAt: '2026-03-16T10:00:00.000Z',
      resumableSessionUrl: 'https://upload-session.example/resumable-1',
      expectedDriveFileId: 'drive-file-1',
      driveVideosFolderId: 'videos-folder-1',
      fileName: 'clase-1.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1024,
    } as any);
    cacheService.getString.mockResolvedValueOnce('token-activo');
    recordingDriveService.getUploadedFileMetadata.mockResolvedValueOnce({
      fileId: 'drive-file-1',
      name: 'clase-1.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1024,
      parents: ['videos-folder-1'],
      webViewLink: 'https://drive.google.com/file/d/drive-file-1/view',
      trashed: false,
    });

    const result = await service.finalizeUpload('event-1', user, {
      uploadToken: 'token-activo',
      fileId: 'drive-file-1',
    });

    expect(permissionService.assertMutationAllowedForEvaluation).toHaveBeenCalled();
    expect(recordingDriveService.getUploadedFileMetadata).toHaveBeenCalledWith(
      'drive-file-1',
    );
    expect(classEventRepository.update).toHaveBeenCalledWith(
      'event-1',
      expect.objectContaining({
        recordingFileId: 'drive-file-1',
        recordingUrl: 'https://drive.google.com/file/d/drive-file-1/preview',
        recordingStatusId: 'status-ready',
      }),
      expect.anything(),
    );
    expect(auditService.logAction).toHaveBeenCalledWith(
      'prof-1',
      AUDIT_ACTION_CODES.CLASS_RECORDING_PUBLISHED,
      expect.anything(),
    );
    expect(cacheService.del).toHaveBeenCalledWith(
      'class-event-recording-upload:context:event-1',
    );
    expect(cacheService.delIfValueMatches).toHaveBeenCalledWith(
      'class-event-recording-upload:lock:event-1',
      'token-activo',
    );
    expect(notificationsDispatchService.dispatchClassRecordingAvailable).toHaveBeenCalledWith(
      'event-1',
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Verificacion de archivo en Drive completada exitosamente',
        classEventId: 'event-1',
        fileId: 'drive-file-1',
      }),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Notificacion CLASS_RECORDING_AVAILABLE encolada',
        classEventId: 'event-1',
      }),
    );
    expect(result.hasActiveRecordingUpload).toBe(false);
    expect(result.recordingStatus).toBe(CLASS_EVENT_RECORDING_STATUS_CODES.READY);
  });

  it('rechaza finalize cuando el archivo no pertenece a la carpeta autorizada e intenta cleanup', async () => {
    classEventRepository.findById.mockResolvedValue({
      id: 'event-1',
      evaluationId: 'eval-1',
      isCancelled: false,
      recordingStatus: { code: CLASS_EVENT_RECORDING_STATUS_CODES.PROCESSING },
    } as any);
    cacheService.get.mockResolvedValueOnce({
      userId: 'prof-1',
      uploadToken: 'token-activo',
      uploadMode: 'initial',
      expiresAt: '2026-03-16T10:00:00.000Z',
      expectedDriveFileId: 'drive-file-1',
      driveVideosFolderId: 'videos-folder-1',
      fileName: 'clase-1.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1024,
    } as any);
    cacheService.getString.mockResolvedValueOnce('token-activo');
    recordingDriveService.getUploadedFileMetadata.mockResolvedValueOnce({
      fileId: 'drive-file-1',
      name: 'clase-1.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1024,
      parents: ['otra-carpeta'],
      webViewLink: null,
      trashed: false,
    });

    await expect(
      service.finalizeUpload('event-1', user, {
        uploadToken: 'token-activo',
        fileId: 'drive-file-1',
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(recordingDriveService.deleteUploadedFile).toHaveBeenCalledWith(
      'drive-file-1',
    );
    expect(classEventRepository.update).toHaveBeenCalledWith(
      'event-1',
      expect.objectContaining({ recordingStatusId: 'status-not-available' }),
    );
    expect(auditService.logAction).not.toHaveBeenCalled();
    expect(notificationsDispatchService.dispatchClassRecordingAvailable).not.toHaveBeenCalled();
  });

  it('mantiene READY y conserva grabacion anterior si falla finalize de reemplazo', async () => {
    classEventRepository.findById.mockResolvedValue({
      id: 'event-1',
      evaluationId: 'eval-1',
      isCancelled: false,
      recordingUrl: 'https://drive.google.com/file/d/old-file/view',
      recordingFileId: 'old-file',
      recordingStatus: { code: CLASS_EVENT_RECORDING_STATUS_CODES.READY },
    } as any);
    cacheService.get.mockResolvedValueOnce({
      userId: 'prof-1',
      uploadToken: 'token-activo',
      uploadMode: 'replacement',
      expiresAt: '2026-03-16T10:00:00.000Z',
      expectedDriveFileId: 'drive-file-1',
      driveVideosFolderId: 'videos-folder-1',
      fileName: 'clase-1.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1024,
    } as any);
    cacheService.getString.mockResolvedValueOnce('token-activo');
    recordingDriveService.getUploadedFileMetadata.mockRejectedValueOnce(
      new ConflictException('inconsistente'),
    );

    await expect(
      service.finalizeUpload('event-1', user, {
        uploadToken: 'token-activo',
        fileId: 'drive-file-1',
      }),
    ).rejects.toThrow(ConflictException);

    expect(classEventRepository.update).not.toHaveBeenCalledWith(
      'event-1',
      expect.objectContaining({ recordingStatusId: 'status-not-available' }),
    );
    expect(auditService.logAction).not.toHaveBeenCalled();
    expect(recordingDriveService.deleteUploadedFile).not.toHaveBeenCalled();
  });

  it('rechaza finalize cuando el fileId no coincide con el recurso reservado del intento', async () => {
    classEventRepository.findById.mockResolvedValue({
      id: 'event-1',
      evaluationId: 'eval-1',
      isCancelled: false,
      recordingStatus: { code: CLASS_EVENT_RECORDING_STATUS_CODES.PROCESSING },
    } as any);
    cacheService.get.mockResolvedValueOnce({
      userId: 'prof-1',
      uploadToken: 'token-activo',
      uploadMode: 'initial',
      expiresAt: '2026-03-16T10:00:00.000Z',
      expectedDriveFileId: 'drive-file-esperado',
      driveVideosFolderId: 'videos-folder-1',
      fileName: 'clase-1.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1024,
    } as any);
    cacheService.getString.mockResolvedValueOnce('token-activo');
    recordingDriveService.getUploadedFileMetadata.mockResolvedValueOnce({
      fileId: 'drive-file-distinto',
      name: 'clase-1.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1024,
      parents: ['videos-folder-1'],
      webViewLink: null,
      trashed: false,
    });

    await expect(
      service.finalizeUpload('event-1', user, {
        uploadToken: 'token-activo',
        fileId: 'drive-file-distinto',
      }),
    ).rejects.toThrow(ConflictException);

    expect(recordingDriveService.deleteUploadedFile).toHaveBeenCalledWith(
      'drive-file-distinto',
    );
  });

  it('oculta finalize a profesor distinto del actor que inicio el intento', async () => {
    classEventRepository.findById.mockResolvedValue({
      id: 'event-1',
      evaluationId: 'eval-1',
      isCancelled: false,
      recordingStatus: { code: CLASS_EVENT_RECORDING_STATUS_CODES.PROCESSING },
    } as any);
    cacheService.get.mockResolvedValueOnce({
      userId: 'otro-profesor',
      uploadToken: 'token-activo',
      uploadMode: 'initial',
      expiresAt: '2026-03-16T10:00:00.000Z',
      expectedDriveFileId: 'drive-file-1',
      driveVideosFolderId: 'videos-folder-1',
      fileName: 'clase-1.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1024,
    } as any);

    await expect(
      service.finalizeUpload('event-1', user, {
        uploadToken: 'token-activo',
        fileId: 'drive-file-1',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});

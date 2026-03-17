import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ClassEventRepository } from '@modules/events/infrastructure/class-event.repository';
import { EvaluationRepository } from '@modules/evaluations/infrastructure/evaluation.repository';
import { ClassEventsPermissionService } from '@modules/events/application/class-events-permission.service';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { technicalSettings } from '@config/technical-settings';
import {
  CLASS_EVENT_RECORDING_STATUS_CODES,
  type ClassEventRecordingStatusCode,
} from '@modules/events/domain/class-event.constants';
import { DriveAccessScopeService } from '@modules/media-access/application/drive-access-scope.service';
import { ClassEventRecordingStatusRepository } from '@modules/events/infrastructure/class-event-recording-status.repository';
import { DataSource } from 'typeorm';
import { StartClassEventRecordingUploadDto } from '@modules/events/dto/start-class-event-recording-upload.dto';
import {
  ClassEventRecordingUploadMode,
  ClassEventRecordingUploadStatusDto,
} from '@modules/events/dto/class-event-recording-upload-status.dto';
import { StartClassEventRecordingUploadResponseDto } from '@modules/events/dto/start-class-event-recording-upload-response.dto';
import { User } from '@modules/users/domain/user.entity';
import { ClassEventRecordingDriveService } from '@modules/events/application/class-event-recording-drive.service';
import { ClassEventsCacheService } from '@modules/events/application/class-events-cache.service';
import { NotificationsDispatchService } from '@modules/notifications/application/notifications-dispatch.service';
import { buildDrivePreviewUrl } from '@modules/media-access/domain/media-access-url.util';
import { AuditService } from '@modules/audit/application/audit.service';
import { AUDIT_ACTION_CODES } from '@modules/audit/interfaces/audit.constants';

type RecordingUploadContext = {
  classEventId: string;
  evaluationId: string;
  userId: string;
  driveVideosFolderId: string;
  expectedDriveFileId: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  startedAt: string;
  expiresAt: string;
  uploadToken: string;
  uploadMode: ClassEventRecordingUploadMode;
  resumableSessionUrl: string | null;
};

@Injectable()
export class ClassEventRecordingUploadsService {
  private readonly logger = new Logger(ClassEventRecordingUploadsService.name);
  private readonly uploadTtlSeconds =
    technicalSettings.uploads.classEventRecordings.uploadContextTtlSeconds;

  constructor(
    private readonly dataSource: DataSource,
    private readonly classEventRepository: ClassEventRepository,
    private readonly evaluationRepository: EvaluationRepository,
    private readonly permissionService: ClassEventsPermissionService,
    private readonly cacheModuleService: ClassEventsCacheService,
    private readonly cacheService: RedisCacheService,
    private readonly driveAccessScopeService: DriveAccessScopeService,
    private readonly recordingStatusRepository: ClassEventRecordingStatusRepository,
    private readonly recordingDriveService: ClassEventRecordingDriveService,
    private readonly notificationsDispatchService: NotificationsDispatchService,
    private readonly auditService: AuditService,
  ) {}

  async startUpload(
    classEventId: string,
    user: User,
    dto: StartClassEventRecordingUploadDto,
  ): Promise<StartClassEventRecordingUploadResponseDto> {
    this.assertAllowedFile(dto);
    this.logger.log({
      message: 'Iniciando upload de grabacion',
      classEventId,
      userId: user.id,
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      sizeBytes: String(dto.sizeBytes),
    });

    const event = await this.classEventRepository.findById(classEventId);
    if (!event) {
      throw new NotFoundException('Evento de clase no encontrado');
    }
    if (event.isCancelled) {
      throw new BadRequestException(
        'No se puede iniciar carga de grabacion para un evento cancelado',
      );
    }

    const evaluation = await this.evaluationRepository.findByIdWithCycle(
      event.evaluationId,
    );
    if (!evaluation) {
      throw new NotFoundException('Evaluación no encontrada');
    }
    await this.permissionService.assertMutationAllowedForEvaluation(
      user,
      evaluation,
    );

    const scope = await this.driveAccessScopeService.resolveForEvaluation(
      event.evaluationId,
    );
    const driveVideosFolderId = String(
      scope.persisted?.driveVideosFolderId || '',
    ).trim();
    if (!driveVideosFolderId) {
      throw new ForbiddenException(
        'El scope Drive de la evaluacion no esta provisionado para videos',
      );
    }
    this.logger.log({
      message: 'Carpeta de videos resuelta para upload de grabacion',
      classEventId,
      evaluationId: event.evaluationId,
      driveVideosFolderId,
    });

    const lockKey = this.getUploadLockKey(classEventId);
    const contextKey = this.getUploadContextKey(classEventId);
    const uploadToken = randomUUID();
    const lockAcquired = await this.cacheService.setIfNotExists(
      lockKey,
      uploadToken,
      this.uploadTtlSeconds,
    );
    if (!lockAcquired) {
      this.logger.warn({
        message: 'Intento concurrente de upload de grabacion rechazado',
        classEventId,
        evaluationId: event.evaluationId,
        userId: user.id,
      });
      throw new ConflictException(
        'Ya existe una carga activa de grabacion para este evento',
      );
    }

    try {
      const recordingStatusCode = this.resolveRecordingStatusCode(event);
      const uploadMode: ClassEventRecordingUploadMode =
        recordingStatusCode === CLASS_EVENT_RECORDING_STATUS_CODES.READY
          ? 'replacement'
          : 'initial';

      if (uploadMode === 'initial') {
        const processingStatusId = await this.getRecordingStatusIdByCode(
          CLASS_EVENT_RECORDING_STATUS_CODES.PROCESSING,
        );
        await this.dataSource.transaction(async (manager) => {
          await this.classEventRepository.update(
            classEventId,
            { recordingStatusId: processingStatusId },
            manager,
          );
        });
        await this.cacheModuleService.invalidateForEvaluation(
          event.evaluationId,
          classEventId,
        );
        this.logger.log({
          message: 'Evento marcado en PROCESSING para upload inicial de grabacion',
          classEventId,
          evaluationId: event.evaluationId,
        });
      }

      const { resumableSessionUrl, fileId: expectedDriveFileId } =
        await this.recordingDriveService.createResumableUploadSession({
          classEventId: event.id,
          evaluationId: event.evaluationId,
          driveVideosFolderId,
          fileName: dto.fileName.trim(),
          mimeType: dto.mimeType,
          sizeBytes: dto.sizeBytes,
        });

      const startedAt = new Date();
      const expiresAt = new Date(
        startedAt.getTime() + this.uploadTtlSeconds * 1000,
      );
      const context: RecordingUploadContext = {
        classEventId: event.id,
        evaluationId: event.evaluationId,
        userId: user.id,
        driveVideosFolderId,
        expectedDriveFileId,
        fileName: dto.fileName.trim(),
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        startedAt: startedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        uploadToken,
        uploadMode,
        resumableSessionUrl,
      };
      await this.cacheService.setOrThrow(
        contextKey,
        context,
        this.uploadTtlSeconds,
      );

      const freshEvent = await this.classEventRepository.findById(classEventId);
      const currentRecordingStatus = this.resolveRecordingStatusCode(freshEvent);

      return {
        classEventId: event.id,
        recordingStatus: currentRecordingStatus,
        hasActiveRecordingUpload: true,
        activeUploadMode: uploadMode,
        uploadExpiresAt: context.expiresAt,
        resumableSessionUrl: context.resumableSessionUrl,
        uploadToken,
        fileName: context.fileName,
        mimeType: context.mimeType,
        sizeBytes: context.sizeBytes,
      };
    } catch (error) {
      const currentStatusCode = this.resolveRecordingStatusCode(event);
      if (
        currentStatusCode !== CLASS_EVENT_RECORDING_STATUS_CODES.READY
      ) {
        const notAvailableStatusId = await this.getRecordingStatusIdByCode(
          CLASS_EVENT_RECORDING_STATUS_CODES.NOT_AVAILABLE,
        );
        await this.classEventRepository.update(classEventId, {
          recordingStatusId: notAvailableStatusId,
        });
        await this.cacheModuleService.invalidateForEvaluation(
          event.evaluationId,
          classEventId,
        );
      }
      await this.cacheService.del(contextKey);
      await this.cacheService.delIfValueMatches(lockKey, uploadToken);
      throw error;
    }
  }

  async getUploadStatus(
    classEventId: string,
    user: User,
  ): Promise<ClassEventRecordingUploadStatusDto> {
    const event = await this.classEventRepository.findById(classEventId);
    if (!event) {
      throw new NotFoundException('Evento de clase no encontrado');
    }

    const evaluation = await this.evaluationRepository.findByIdWithCycle(
      event.evaluationId,
    );
    if (!evaluation) {
      throw new NotFoundException('Evaluacion no encontrada');
    }
    await this.permissionService.assertMutationAllowedForEvaluation(
      user,
      evaluation,
    );

    const context = await this.cacheService.get<RecordingUploadContext>(
      this.getUploadContextKey(classEventId),
    );
    if (!context) {
      return ClassEventRecordingUploadStatusDto.idle({
        classEventId,
        recordingStatus: this.resolveRecordingStatusCode(event),
      });
    }
    const lockValue = await this.cacheService.getString(
      this.getUploadLockKey(classEventId),
    );
    if (!lockValue || lockValue !== context.uploadToken) {
      this.logger.warn({
        message: 'Intento de upload abandonado detectado al consultar status',
        classEventId,
        evaluationId: event.evaluationId,
        uploadMode: context.uploadMode,
      });
      await this.clearAbandonedUploadState(event, context);
      const refreshedEvent = await this.classEventRepository.findById(classEventId);
      return ClassEventRecordingUploadStatusDto.idle({
        classEventId,
        recordingStatus: this.resolveRecordingStatusCode(refreshedEvent || event),
      });
    }

    return {
      classEventId,
      recordingStatus: this.resolveRecordingStatusCode(event),
      hasActiveRecordingUpload: true,
      activeUploadMode: context.uploadMode,
      uploadExpiresAt: context.expiresAt,
      resumableSessionUrl: this.canRevealResumableSessionUrl(context, user)
        ? context.resumableSessionUrl
        : null,
    };
  }

  async heartbeatUpload(
    classEventId: string,
    user: User,
    uploadToken: string,
  ): Promise<ClassEventRecordingUploadStatusDto> {
    const event = await this.classEventRepository.findById(classEventId);
    if (!event) {
      throw new NotFoundException('Evento de clase no encontrado');
    }

    const evaluation = await this.evaluationRepository.findByIdWithCycle(
      event.evaluationId,
    );
    if (!evaluation) {
      throw new NotFoundException('Evaluación no encontrada');
    }
    await this.permissionService.assertMutationAllowedForEvaluation(
      user,
      evaluation,
    );

    const lockKey = this.getUploadLockKey(classEventId);
    const contextKey = this.getUploadContextKey(classEventId);
    const context = await this.cacheService.get<RecordingUploadContext>(contextKey);
    if (!context) {
      throw new ConflictException(
        'No existe un intento activo de carga para este evento',
      );
    }
    if (context.uploadToken !== uploadToken) {
      throw new ConflictException(
        'El token de upload no corresponde al intento activo',
      );
    }
    this.assertUploadActorAllowed(context, user);

    const lockRenewed = await this.cacheService.expireIfValueMatches(
      lockKey,
      uploadToken,
      this.uploadTtlSeconds,
    );
    if (!lockRenewed) {
      this.logger.warn({
        message: 'Intento de upload abandonado detectado durante heartbeat',
        classEventId,
        evaluationId: event.evaluationId,
        uploadMode: context.uploadMode,
      });
      await this.clearAbandonedUploadState(event, context);
      throw new ConflictException(
        'El intento activo ya no existe o perdió su lock en Redis',
      );
    }

    const expiresAt = new Date(Date.now() + this.uploadTtlSeconds * 1000);
    const refreshedContext: RecordingUploadContext = {
      ...context,
      expiresAt: expiresAt.toISOString(),
    };
    await this.cacheService.setOrThrow(
      contextKey,
      refreshedContext,
      this.uploadTtlSeconds,
    );

    return {
      classEventId,
      recordingStatus: this.resolveRecordingStatusCode(event),
      hasActiveRecordingUpload: true,
      activeUploadMode: refreshedContext.uploadMode,
      uploadExpiresAt: refreshedContext.expiresAt,
      resumableSessionUrl: this.canRevealResumableSessionUrl(
        refreshedContext,
        user,
      )
        ? refreshedContext.resumableSessionUrl
        : null,
    };
  }

  async finalizeUpload(
    classEventId: string,
    user: User,
    input: { uploadToken: string; fileId: string },
  ): Promise<ClassEventRecordingUploadStatusDto> {
    const event = await this.classEventRepository.findById(classEventId);
    if (!event) {
      throw new NotFoundException('Evento de clase no encontrado');
    }
    if (event.isCancelled) {
      throw new BadRequestException(
        'No se puede finalizar una grabacion para un evento cancelado',
      );
    }

    const evaluation = await this.evaluationRepository.findByIdWithCycle(
      event.evaluationId,
    );
    if (!evaluation) {
      throw new NotFoundException('Evaluación no encontrada');
    }
    await this.permissionService.assertMutationAllowedForEvaluation(
      user,
      evaluation,
    );

    const context = await this.cacheService.get<RecordingUploadContext>(
      this.getUploadContextKey(classEventId),
    );
    if (!context) {
      throw new ConflictException(
        'No existe un intento activo de carga para este evento',
      );
    }
    if (context.uploadToken !== input.uploadToken) {
      throw new ConflictException(
        'El token de upload no corresponde al intento activo',
      );
    }
    this.assertUploadActorAllowed(context, user);

    const lockValue = await this.cacheService.getString(
      this.getUploadLockKey(classEventId),
    );
    if (!lockValue || lockValue !== context.uploadToken) {
      await this.clearAbandonedUploadState(event, context);
      throw new ConflictException(
        'El intento activo ya no existe o perdio su lock en Redis',
      );
    }

    this.assertFinalizeStateIsConsistent(event, context);

    let verifiedFileExists = false;
    let published = false;
    const normalizedFileId = String(input.fileId || '').trim();

    try {
      this.logger.log({
        message: 'Iniciando finalize de grabacion',
        classEventId,
        evaluationId: event.evaluationId,
        uploadMode: context.uploadMode,
        fileId: normalizedFileId,
      });

      const driveFile =
        await this.recordingDriveService.getUploadedFileMetadata(normalizedFileId);
      verifiedFileExists = true;
      this.assertDriveFileMatchesActiveUpload(context, driveFile);
      this.logger.log({
        message: 'Verificacion de archivo en Drive completada exitosamente',
        classEventId,
        evaluationId: event.evaluationId,
        fileId: driveFile.fileId,
        driveVideosFolderId: context.driveVideosFolderId,
      });

      const readyStatusId = await this.getRecordingStatusIdByCode(
        CLASS_EVENT_RECORDING_STATUS_CODES.READY,
      );
      const recordingUrl = buildDrivePreviewUrl(driveFile.fileId);

      await this.dataSource.transaction(async (manager) => {
        await this.classEventRepository.update(
          classEventId,
          {
            recordingFileId: driveFile.fileId,
            recordingUrl,
            recordingStatusId: readyStatusId,
          },
          manager,
        );
        await this.auditService.logAction(
          user.id,
          AUDIT_ACTION_CODES.CLASS_RECORDING_PUBLISHED,
          manager,
        );
      });
      published = true;

      this.logger.log({
        message: 'Grabacion publicada correctamente',
        classEventId,
        evaluationId: event.evaluationId,
        fileId: driveFile.fileId,
        uploadMode: context.uploadMode,
      });
    } catch (error) {
      if (published) {
        this.logger.error({
          message:
            'Fallo una tarea secundaria despues de publicar la grabacion; se conserva el estado publicado',
          classEventId,
          evaluationId: event.evaluationId,
          fileId: normalizedFileId,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
      await this.handleFinalizeFailure({
        event,
        context,
        fileId: verifiedFileExists ? normalizedFileId : null,
        error,
      });
      throw error;
    }

    await this.finalizePublishedUploadSuccess({
      classEventId,
      evaluationId: event.evaluationId,
      uploadToken: context.uploadToken,
    });
    void this.notificationsDispatchService.dispatchClassRecordingAvailable(
      classEventId,
    );
    this.logger.log({
      message: 'Notificacion CLASS_RECORDING_AVAILABLE encolada',
      classEventId,
      evaluationId: event.evaluationId,
    });

    return ClassEventRecordingUploadStatusDto.idle({
      classEventId,
      recordingStatus: CLASS_EVENT_RECORDING_STATUS_CODES.READY,
    });
  }

  private assertAllowedFile(input: StartClassEventRecordingUploadDto): void {
    const allowedMimeTypes: string[] = [
      ...technicalSettings.uploads.classEventRecordings.allowedMimeTypes,
    ];
    if (!allowedMimeTypes.includes(input.mimeType)) {
      throw new BadRequestException(
        'Tipo MIME no permitido para grabaciones de clase',
      );
    }
    if (
      input.sizeBytes >
      technicalSettings.uploads.classEventRecordings.maxSizeBytes
    ) {
      throw new BadRequestException(
        'El archivo excede el tamaño máximo permitido de 10 GB',
      );
    }
  }

  private getUploadContextKey(classEventId: string): string {
    return `class-event-recording-upload:context:${classEventId}`;
  }

  private getUploadLockKey(classEventId: string): string {
    return `class-event-recording-upload:lock:${classEventId}`;
  }

  private assertUploadActorAllowed(
    context: RecordingUploadContext,
    user: User,
  ): void {
    if (this.permissionService.isAdminUser(user)) {
      return;
    }
    if (context.userId !== user.id) {
      throw new ForbiddenException(
        'Solo el actor que inicio el upload puede finalizar este intento',
      );
    }
  }

  private assertFinalizeStateIsConsistent(
    event: {
      recordingStatus?: { code?: string | null } | null;
    },
    context: RecordingUploadContext,
  ): void {
    const currentStatus = this.resolveRecordingStatusCode(event);
    if (
      context.uploadMode === 'initial' &&
      currentStatus !== CLASS_EVENT_RECORDING_STATUS_CODES.PROCESSING
    ) {
      throw new ConflictException(
        'El evento ya no esta en un estado valido para finalizar el upload inicial',
      );
    }
    if (
      context.uploadMode === 'replacement' &&
      currentStatus !== CLASS_EVENT_RECORDING_STATUS_CODES.READY
    ) {
      throw new ConflictException(
        'El evento ya no esta en un estado valido para finalizar el reemplazo',
      );
    }
  }

  private assertDriveFileMatchesActiveUpload(
    context: RecordingUploadContext,
    driveFile: {
      fileId: string;
      name: string | null;
      mimeType: string | null;
      sizeBytes: number | null;
      parents: string[];
      trashed: boolean;
    },
  ): void {
    if (driveFile.trashed) {
      throw new ConflictException(
        'El archivo subido en Drive ya se encuentra en la papelera',
      );
    }
    if (
      context.expectedDriveFileId &&
      driveFile.fileId !== context.expectedDriveFileId
    ) {
      throw new ConflictException(
        'El fileId final no corresponde al recurso creado para el intento activo',
      );
    }
    if (!driveFile.parents.includes(context.driveVideosFolderId)) {
      throw new ForbiddenException(
        'El archivo subido no pertenece a la carpeta de videos autorizada',
      );
    }
    if (driveFile.name !== context.fileName) {
      throw new ConflictException(
        'El nombre del archivo final no coincide con el intento activo',
      );
    }
    if (driveFile.mimeType !== context.mimeType) {
      throw new ConflictException(
        'El tipo MIME del archivo final no coincide con el intento activo',
      );
    }
    if (
      driveFile.sizeBytes !== null &&
      driveFile.sizeBytes !== context.sizeBytes
    ) {
      throw new ConflictException(
        'El tamano final del archivo no coincide con el intento activo',
      );
    }
  }

  private async finalizePublishedUploadSuccess(input: {
    classEventId: string;
    evaluationId: string;
    uploadToken: string;
  }): Promise<void> {
    const { classEventId, evaluationId, uploadToken } = input;

    try {
      await this.cacheModuleService.invalidateForEvaluation(
        evaluationId,
        classEventId,
      );
    } catch (error) {
      this.logger.error({
        message: 'Fallo la invalidacion de cache tras publicar grabacion',
        classEventId,
        evaluationId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    await this.cacheService.del(this.getUploadContextKey(classEventId));
    try {
      await this.cacheService.delIfValueMatches(
        this.getUploadLockKey(classEventId),
        uploadToken,
      );
    } catch (error) {
      this.logger.error({
        message: 'Fallo la liberacion del lock de upload tras publicar grabacion',
        classEventId,
        evaluationId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleFinalizeFailure(input: {
    event: {
      id: string;
      evaluationId: string;
      recordingStatus?: { code?: string | null } | null;
    };
    context: RecordingUploadContext;
    fileId: string | null;
    error: unknown;
  }): Promise<void> {
    const { event, context, fileId, error } = input;

    this.logger.error({
      message: 'Fallo la finalizacion de grabacion',
      classEventId: event.id,
      evaluationId: event.evaluationId,
      uploadMode: context.uploadMode,
      fileId,
      error: error instanceof Error ? error.message : String(error),
    });

    if (context.uploadMode === 'initial') {
      const currentStatus = this.resolveRecordingStatusCode(event);
      if (currentStatus !== CLASS_EVENT_RECORDING_STATUS_CODES.READY) {
        const notAvailableStatusId = await this.getRecordingStatusIdByCode(
          CLASS_EVENT_RECORDING_STATUS_CODES.NOT_AVAILABLE,
        );
        await this.classEventRepository.update(event.id, {
          recordingStatusId: notAvailableStatusId,
        });
        await this.cacheModuleService.invalidateForEvaluation(
          event.evaluationId,
          event.id,
        );
      }
    }

    await this.cacheService.del(this.getUploadContextKey(event.id));
    await this.cacheService.delIfValueMatches(
      this.getUploadLockKey(event.id),
      context.uploadToken,
    );

    if (!fileId) {
      return;
    }

    try {
      this.logger.log({
        message: 'Intentando cleanup automatico del archivo de grabacion no publicado',
        classEventId: event.id,
        evaluationId: event.evaluationId,
        fileId,
      });
      await this.recordingDriveService.deleteUploadedFile(fileId);
    } catch (cleanupError) {
      this.logger.error({
        message:
          'No se pudo eliminar automaticamente el archivo de grabacion huérfano',
        classEventId: event.id,
        evaluationId: event.evaluationId,
        fileId,
        error:
          cleanupError instanceof Error
            ? cleanupError.message
            : String(cleanupError),
      });
    }
  }

  private async clearAbandonedUploadState(
    event: {
      id: string;
      evaluationId: string;
      recordingStatus?: { code?: string | null } | null;
    },
    context: RecordingUploadContext,
  ): Promise<void> {
    await this.cacheService.del(this.getUploadContextKey(event.id));
    if (
      context.uploadMode === 'initial' &&
      this.resolveRecordingStatusCode(event) ===
        CLASS_EVENT_RECORDING_STATUS_CODES.PROCESSING
    ) {
      const notAvailableStatusId = await this.getRecordingStatusIdByCode(
        CLASS_EVENT_RECORDING_STATUS_CODES.NOT_AVAILABLE,
      );
      await this.classEventRepository.update(event.id, {
        recordingStatusId: notAvailableStatusId,
      });
      await this.cacheModuleService.invalidateForEvaluation(
        event.evaluationId,
        event.id,
      );
    }
  }

  private resolveRecordingStatusCode(
    event: { recordingStatus?: { code?: string | null } | null } | null,
  ): ClassEventRecordingStatusCode {
    const code = String(event?.recordingStatus?.code || '').trim();
    if (
      code === CLASS_EVENT_RECORDING_STATUS_CODES.NOT_AVAILABLE ||
      code === CLASS_EVENT_RECORDING_STATUS_CODES.PROCESSING ||
      code === CLASS_EVENT_RECORDING_STATUS_CODES.READY ||
      code === CLASS_EVENT_RECORDING_STATUS_CODES.FAILED
    ) {
      return code;
    }
    return CLASS_EVENT_RECORDING_STATUS_CODES.NOT_AVAILABLE;
  }

  private canRevealResumableSessionUrl(
    context: RecordingUploadContext,
    user: User,
  ): boolean {
    return this.permissionService.isAdminUser(user) || context.userId === user.id;
  }

  private async getRecordingStatusIdByCode(code: string): Promise<string> {
    const status = await this.recordingStatusRepository.findByCode(code);
    if (!status) {
      throw new BadRequestException(
        `Estado de grabacion ${code} no configurado`,
      );
    }
    return status.id;
  }
}

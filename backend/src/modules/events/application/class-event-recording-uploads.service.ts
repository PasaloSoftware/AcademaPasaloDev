import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
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

type RecordingUploadContext = {
  classEventId: string;
  evaluationId: string;
  userId: string;
  driveVideosFolderId: string;
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
  ) {}

  async startUpload(
    classEventId: string,
    user: User,
    dto: StartClassEventRecordingUploadDto,
  ): Promise<StartClassEventRecordingUploadResponseDto> {
    this.assertAllowedFile(dto);

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

    const lockKey = this.getUploadLockKey(classEventId);
    const contextKey = this.getUploadContextKey(classEventId);
    const uploadToken = randomUUID();
    const lockAcquired = await this.cacheService.setIfNotExists(
      lockKey,
      uploadToken,
      this.uploadTtlSeconds,
    );
    if (!lockAcquired) {
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
      }

      const { resumableSessionUrl } =
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
        uploadToken,
        fileName: context.fileName,
        mimeType: context.mimeType,
        sizeBytes: context.sizeBytes,
        resumableSessionUrl: context.resumableSessionUrl || '',
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

    const isAuthorized =
      await this.permissionService.checkUserAuthorizationForUser(
        user,
        event.evaluationId,
      );
    if (!isAuthorized) {
      throw new ForbiddenException('No tienes acceso a este evento');
    }

    const context = await this.cacheService.get<RecordingUploadContext>(
      this.getUploadContextKey(classEventId),
    );
    if (!context) {
      return ClassEventRecordingUploadStatusDto.idle({
        classEventId,
        recordingStatus: this.resolveRecordingStatusCode(event),
      });
    }

    return {
      classEventId,
      recordingStatus: this.resolveRecordingStatusCode(event),
      hasActiveRecordingUpload: true,
      activeUploadMode: context.uploadMode,
      uploadExpiresAt: context.expiresAt,
    };
  }

  async validateFinalizeContract(
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

    const context = await this.cacheService.get<RecordingUploadContext>(
      this.getUploadContextKey(classEventId),
    );
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

    return {
      classEventId,
      recordingStatus: this.resolveRecordingStatusCode(event),
      hasActiveRecordingUpload: true,
      activeUploadMode: context.uploadMode,
      uploadExpiresAt: context.expiresAt,
    };
  }

  private assertAllowedFile(input: StartClassEventRecordingUploadDto): void {
    const allowedMimeTypes =
      technicalSettings.uploads.classEventRecordings.allowedMimeTypes;
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

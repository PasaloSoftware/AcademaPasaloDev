import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { StorageService } from '@infrastructure/storage/storage.service';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { MaterialFolderRepository } from '@modules/materials/infrastructure/material-folder.repository';
import { MaterialRepository } from '@modules/materials/infrastructure/material.repository';
import { FileResourceRepository } from '@modules/materials/infrastructure/file-resource.repository';
import { MaterialCatalogRepository } from '@modules/materials/infrastructure/material-catalog.repository';
import { CourseCycleProfessorRepository } from '@modules/courses/infrastructure/course-cycle-professor.repository';
import { ClassEventRepository } from '@modules/events/infrastructure/class-event.repository';
import { CreateMaterialFolderDto } from '@modules/materials/dto/create-material-folder.dto';
import { CreateFolderTemplateDto } from '@modules/materials/dto/create-folder-template.dto';
import { UploadMaterialDto } from '@modules/materials/dto/upload-material.dto';
import { RequestDeletionDto } from '@modules/materials/dto/request-deletion.dto';
import { MaterialFolder } from '@modules/materials/domain/material-folder.entity';
import { Material } from '@modules/materials/domain/material.entity';
import { FileResource } from '@modules/materials/domain/file-resource.entity';
import { MaterialVersion } from '@modules/materials/domain/material-version.entity';
import type { UserWithSession } from '@modules/auth/strategies/jwt.strategy';
import { AUDIT_ENTITY_TYPES } from '@modules/audit/interfaces/audit.constants';
import { getEpoch } from '@common/utils/date.util';
import { getErrnoFromDbError } from '@common/utils/mysql-error.util';
import { technicalSettings } from '@config/technical-settings';
import {
  ADMIN_ROLE_CODES,
  ROLE_CODES,
} from '@common/constants/role-codes.constants';
import { MySqlErrorCode } from '@common/interfaces/database-error.interface';
import {
  MATERIAL_CACHE_KEYS,
  MATERIAL_STATUS_CODES,
  STORAGE_PROVIDER_CODES,
} from '@modules/materials/domain/material.constants';
import { NotificationsDispatchService } from '@modules/notifications/application/notifications-dispatch.service';
import { AuthorizedMediaLinkDto } from '@modules/media-access/dto/authorized-media-link.dto';
import { MEDIA_DOCUMENT_LINK_MODES } from '@modules/media-access/domain/media-access.constants';
import type { MediaDocumentLinkMode } from '@modules/media-access/domain/media-access.constants';
import { DriveAccessScopeService } from '@modules/media-access/application/drive-access-scope.service';
import { MaterialVersionHistoryDto } from '@modules/materials/dto/material-version-history.dto';
import { MaterialsReadService } from '@modules/materials/application/materials-read.service';
import { MaterialsFolderService } from '@modules/materials/application/materials-folder.service';
import { MaterialsExplorerService } from '@modules/materials/application/materials-explorer.service';
import { MaterialsDeletionService } from '@modules/materials/application/materials-deletion.service';

@Injectable()
export class MaterialsService {
  private readonly logger = new Logger(MaterialsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly storageService: StorageService,
    private readonly cacheService: RedisCacheService,
    private readonly folderRepository: MaterialFolderRepository,
    private readonly materialRepository: MaterialRepository,
    private readonly fileResourceRepository: FileResourceRepository,
    private readonly catalogRepository: MaterialCatalogRepository,
    private readonly courseCycleProfessorRepository: CourseCycleProfessorRepository,
    private readonly classEventRepository: ClassEventRepository,
    private readonly notificationsDispatchService: NotificationsDispatchService,
    private readonly driveAccessScopeService: DriveAccessScopeService,
    private readonly materialsReadService: MaterialsReadService,
    private readonly materialsFolderService: MaterialsFolderService,
    private readonly materialsExplorerService: MaterialsExplorerService,
    private readonly materialsDeletionService: MaterialsDeletionService,
  ) {}

  async createFolder(
    user: UserWithSession,
    dto: CreateMaterialFolderDto,
  ): Promise<MaterialFolder> {
    await this.assertCanManageEvaluation(user, dto.evaluationId);
    return await this.materialsFolderService.createFolder(user.id, dto);
  }

  async createFolderTemplate(
    user: UserWithSession,
    dto: CreateFolderTemplateDto,
  ): Promise<{ rootFolder: MaterialFolder; subFolders: MaterialFolder[] }> {
    await this.assertCanManageEvaluation(user, dto.evaluationId);
    return await this.materialsFolderService.createFolderTemplate(user.id, dto);
  }

  async uploadMaterial(
    user: UserWithSession,
    dto: UploadMaterialDto,
    file: Express.Multer.File,
  ): Promise<Material> {
    if (!file) throw new BadRequestException('Archivo requerido');

    const allowedMimeTypes: readonly string[] =
      technicalSettings.uploads.materials.allowedMimeTypes;

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido. Solo se aceptan documentos educativos (PDF, imágenes, Office).`,
      );
    }

    if (file.mimetype === 'application/pdf') {
      const pdfMagic = file.buffer.subarray(0, 4).toString('hex');
      if (pdfMagic !== technicalSettings.uploads.materials.pdfMagicHeaderHex) {
        throw new BadRequestException('El archivo no es un PDF válido');
      }
    }

    const activeStatus = await this.getActiveMaterialStatus();
    const folder = await this.folderRepository.findById(dto.materialFolderId);
    if (!folder) throw new NotFoundException('Carpeta destino no encontrada');
    await this.assertCanManageEvaluation(user, folder.evaluationId);
    const { visibleFrom, visibleUntil } = this.parseVisibilityRange(
      dto.visibleFrom,
      dto.visibleUntil,
    );

    const now = new Date();
    const documentsFolderId = this.storageService.isGoogleDriveStorageEnabled()
      ? await this.resolveDocumentsFolderIdForEvaluation(folder.evaluationId)
      : null;
    let savedResource: {
      storageProvider: (typeof STORAGE_PROVIDER_CODES)[keyof typeof STORAGE_PROVIDER_CODES];
      storageKey: string;
      storageUrl: string | null;
    } | null = null;
    let isNewFile = false;

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        if (dto.classEventId) {
          await this.validateClassEventAssociation(
            dto.classEventId,
            folder.evaluationId,
            manager,
          );
        }

        const hash = await this.storageService.calculateHash(file.buffer);
        const existingResource =
          await this.fileResourceRepository.findByHashAndSizeWithinEvaluation(
            hash,
            String(file.size),
            folder.evaluationId,
          );

        let finalResource: FileResource;
        if (!existingResource) {
          const uniqueName = this.buildStorageObjectName(file.originalname);
          savedResource = await this.storageService.saveFile(
            uniqueName,
            file.buffer,
            file.mimetype,
            documentsFolderId
              ? { targetDriveFolderId: documentsFolderId }
              : undefined,
          );
          isNewFile = true;

          const resourceEntity = manager.create(FileResource, {
            checksumHash: hash,
            originalName: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: String(file.size),
            storageProvider: savedResource.storageProvider,
            storageKey: savedResource.storageKey,
            storageUrl: savedResource.storageUrl,
            createdAt: now,
          });
          try {
            finalResource = await manager.save(resourceEntity);
          } catch (error) {
            const dbErrno = getErrnoFromDbError(error);
            if (dbErrno !== MySqlErrorCode.DUPLICATE_ENTRY) {
              throw error;
            }

            const dedupResource =
              await this.fileResourceRepository.findByHashAndSizeWithinEvaluation(
                hash,
                String(file.size),
                folder.evaluationId,
              );
            if (!dedupResource) {
              throw error;
            }

            finalResource = dedupResource;
            if (savedResource) {
              try {
                await this.rollbackFile(savedResource);
              } catch (cleanupError) {
                this.logger.warn({
                  message:
                    'No se pudo limpiar archivo huérfano tras colisión de deduplicación',
                  storageKey: savedResource.storageKey,
                  error:
                    cleanupError instanceof Error
                      ? cleanupError.message
                      : String(cleanupError),
                });
              }
              savedResource = null;
              isNewFile = false;
            }
          }
        } else {
          finalResource = existingResource;
        }

        const materialEntity = manager.create(Material, {
          materialFolderId: folder.id,
          classEventId: dto.classEventId || null,
          fileResourceId: finalResource.id,
          fileVersionId: null,
          materialStatusId: activeStatus.id,
          displayName: dto.displayName,
          visibleFrom,
          visibleUntil,
          createdById: user.id,
          createdAt: now,
          updatedAt: now,
        });
        const savedMaterial = await manager.save(materialEntity);
        const versionEntity = manager.create(MaterialVersion, {
          materialId: savedMaterial.id,
          fileResourceId: finalResource.id,
          versionNumber: 1,
          restoredFromMaterialVersionId: null,
          createdById: user.id,
          createdAt: now,
        });
        const savedVersion =
          (await manager.save(versionEntity)) ||
          (await manager.findOne(MaterialVersion, {
            where: { materialId: savedMaterial.id, versionNumber: 1 },
          }));
        if (!savedVersion) {
          throw new InternalServerErrorException(
            'No se pudo crear la version inicial del material',
          );
        }
        savedMaterial.fileVersionId = savedVersion.id;

        return (await manager.save(savedMaterial)) || savedMaterial;
      });

      await this.invalidateMaterialContextCaches(
        dto.materialFolderId,
        dto.classEventId,
      );

      if (result.classEventId) {
        void this.notificationsDispatchService.dispatchNewMaterial(
          result.id,
          dto.materialFolderId,
        );
      }

      return result;
    } catch (error) {
      if (isNewFile && savedResource) await this.rollbackFile(savedResource);
      throw error;
    }
  }

  async addVersion(
    user: UserWithSession,
    materialId: string,
    file: Express.Multer.File,
  ): Promise<Material> {
    if (!file) throw new BadRequestException('Archivo requerido');
    const allowedMimeTypes: readonly string[] =
      technicalSettings.uploads.materials.allowedMimeTypes;

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido. Solo se aceptan documentos educativos (PDF, imágenes, Office).`,
      );
    }

    if (file.mimetype === 'application/pdf') {
      const pdfMagic = file.buffer.subarray(0, 4).toString('hex');
      if (pdfMagic !== technicalSettings.uploads.materials.pdfMagicHeaderHex) {
        throw new BadRequestException('El archivo no es un PDF válido');
      }
    }

    const now = new Date();
    let savedResource: {
      storageProvider: (typeof STORAGE_PROVIDER_CODES)[keyof typeof STORAGE_PROVIDER_CODES];
      storageKey: string;
      storageUrl: string | null;
    } | null = null;
    let isNewFile = false;

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const freshMaterial = await manager.findOne(Material, {
          where: { id: materialId },
          relations: { materialFolder: true },
          lock: { mode: 'pessimistic_write' },
        });

        if (!freshMaterial)
          throw new NotFoundException('Material no encontrado');
        if (!freshMaterial.materialFolder) {
          throw new InternalServerErrorException(
            'Integridad de datos corrupta: Material sin carpeta contenedora',
          );
        }
        await this.assertCanManageEvaluation(
          user,
          freshMaterial.materialFolder.evaluationId,
          manager,
        );
        const documentsFolderId =
          this.storageService.isGoogleDriveStorageEnabled()
            ? await this.resolveDocumentsFolderIdForEvaluation(
                freshMaterial.materialFolder.evaluationId,
              )
            : null;

        const hash = await this.storageService.calculateHash(file.buffer);
        const existingResource =
          await this.fileResourceRepository.findByHashAndSizeWithinEvaluation(
            hash,
            String(file.size),
            freshMaterial.materialFolder.evaluationId,
          );

        let finalResource: FileResource;

        if (!existingResource) {
          const uniqueName = this.buildStorageObjectName(file.originalname);
          savedResource = await this.storageService.saveFile(
            uniqueName,
            file.buffer,
            file.mimetype,
            documentsFolderId
              ? { targetDriveFolderId: documentsFolderId }
              : undefined,
          );
          isNewFile = true;

          const resourceEntity = manager.create(FileResource, {
            checksumHash: hash,
            originalName: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: String(file.size),
            storageProvider: savedResource.storageProvider,
            storageKey: savedResource.storageKey,
            storageUrl: savedResource.storageUrl,
            createdAt: now,
          });
          try {
            finalResource = await manager.save(resourceEntity);
          } catch (error) {
            const dbErrno = getErrnoFromDbError(error);
            if (dbErrno !== MySqlErrorCode.DUPLICATE_ENTRY) {
              throw error;
            }

            const dedupResource =
              await this.fileResourceRepository.findByHashAndSizeWithinEvaluation(
                hash,
                String(file.size),
                freshMaterial.materialFolder.evaluationId,
              );
            if (!dedupResource) {
              throw error;
            }

            finalResource = dedupResource;
            if (savedResource) {
              try {
                await this.rollbackFile(savedResource);
              } catch (cleanupError) {
                this.logger.warn({
                  message:
                    'No se pudo limpiar archivo huérfano tras colisión de deduplicación',
                  storageKey: savedResource.storageKey,
                  error:
                    cleanupError instanceof Error
                      ? cleanupError.message
                      : String(cleanupError),
                });
              }
              savedResource = null;
              isNewFile = false;
            }
          }
        } else {
          finalResource = existingResource;
        }

        const lockedResource = await manager.findOne(FileResource, {
          where: { id: finalResource.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!lockedResource) {
          throw new InternalServerErrorException(
            'Integridad de datos corrupta: recurso de archivo no encontrado',
          );
        }

        const currentMaterialVersion = freshMaterial.fileVersionId
          ? await manager.findOne(MaterialVersion, {
              where: { id: freshMaterial.fileVersionId },
            })
          : null;
        let savedVersion: MaterialVersion | null = null;
        const maxAttempts = 3;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const latestMaterialVersion = await manager.findOne(MaterialVersion, {
            where: { materialId: freshMaterial.id },
            order: { versionNumber: 'DESC' },
          });
          const nextVersionNumber =
            Math.max(
              currentMaterialVersion?.versionNumber || 0,
              latestMaterialVersion?.versionNumber || 0,
            ) + 1;

          const versionEntity = manager.create(MaterialVersion, {
            materialId: freshMaterial.id,
            fileResourceId: finalResource.id,
            versionNumber: nextVersionNumber,
            restoredFromMaterialVersionId: null,
            createdById: user.id,
            createdAt: now,
          });

          try {
            savedVersion = await manager.save(versionEntity);
            break;
          } catch (error) {
            const dbErrno = getErrnoFromDbError(error);
            const isLastAttempt = attempt === maxAttempts - 1;
            if (dbErrno !== MySqlErrorCode.DUPLICATE_ENTRY || isLastAttempt) {
              throw error;
            }
          }
        }

        if (!savedVersion) {
          throw new InternalServerErrorException(
            'No se pudo crear una nueva versión del material',
          );
        }

        freshMaterial.fileResourceId = finalResource.id;
        freshMaterial.fileVersionId = savedVersion.id;
        freshMaterial.updatedAt = now;

        const updatedMaterial = await manager.save(freshMaterial);

        return updatedMaterial;
      });

      await this.invalidateMaterialContextCaches(
        result.materialFolderId,
        result.classEventId,
      );

      if (result.classEventId) {
        void this.notificationsDispatchService.dispatchMaterialUpdated(
          result.id,
          result.materialFolderId,
        );
      }

      return result;
    } catch (error) {
      if (isNewFile && savedResource) await this.rollbackFile(savedResource);
      throw error;
    }
  }

  async getRootFolders(
    user: UserWithSession,
    evaluationId: string,
  ): Promise<MaterialFolder[]> {
    return await this.materialsExplorerService.getRootFolders(
      user,
      evaluationId,
    );
  }

  async getFolderContents(
    user: UserWithSession,
    folderId: string,
  ): Promise<{
    folders: MaterialFolder[];
    materials: Material[];
    totalMaterials: number;
    subfolderMaterialCount: Record<string, number>;
  }> {
    return await this.materialsExplorerService.getFolderContents(
      user,
      folderId,
    );
  }

  async getClassEventMaterials(
    user: UserWithSession,
    classEventId: string,
  ): Promise<Material[]> {
    return await this.materialsExplorerService.getClassEventMaterials(
      user,
      classEventId,
    );
  }

  async download(
    user: UserWithSession,
    materialId: string,
  ): Promise<{
    stream: NodeJS.ReadableStream;
    fileName: string;
    mimeType: string;
  }> {
    return await this.materialsReadService.download(user, materialId);
  }

  async getAuthorizedDocumentLink(
    user: UserWithSession,
    materialId: string,
    mode: MediaDocumentLinkMode = MEDIA_DOCUMENT_LINK_MODES.VIEW,
  ): Promise<AuthorizedMediaLinkDto> {
    return await this.materialsReadService.getAuthorizedDocumentLink(
      user,
      materialId,
      mode,
    );
  }

  async getMaterialLastModified(
    user: UserWithSession,
    materialId: string,
  ): Promise<{
    materialId: string;
    lastModifiedAt: Date;
  }> {
    return await this.materialsReadService.getMaterialLastModified(
      user,
      materialId,
    );
  }

  async getMaterialVersionHistory(
    user: UserWithSession,
    materialId: string,
  ): Promise<MaterialVersionHistoryDto> {
    return await this.materialsReadService.getMaterialVersionHistory(
      user,
      materialId,
    );
  }

  async restoreVersion(
    user: UserWithSession,
    materialId: string,
    versionId: string,
  ): Promise<Material> {
    const now = new Date();

    const result = await this.dataSource.transaction(async (manager) => {
      const freshMaterial = await manager.findOne(Material, {
        where: { id: materialId },
        relations: { materialFolder: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!freshMaterial) {
        throw new NotFoundException('Material no encontrado');
      }
      if (!freshMaterial.materialFolder) {
        throw new InternalServerErrorException(
          'Integridad de datos corrupta: Material sin carpeta contenedora',
        );
      }

      await this.assertCanManageEvaluation(
        user,
        freshMaterial.materialFolder.evaluationId,
        manager,
      );

      const targetVersion = await manager.findOne(MaterialVersion, {
        where: { id: versionId, materialId: freshMaterial.id },
      });
      if (!targetVersion) {
        throw new NotFoundException(
          'Version del material no encontrada para restauracion',
        );
      }

      const currentMaterialVersion = freshMaterial.fileVersionId
        ? await manager.findOne(MaterialVersion, {
            where: { id: freshMaterial.fileVersionId },
          })
        : null;

      const restoredVersion = await this.createNextMaterialVersion(
        manager,
        freshMaterial.id,
        targetVersion.fileResourceId,
        user.id,
        now,
        currentMaterialVersion?.versionNumber || 0,
        targetVersion.id,
      );

      freshMaterial.fileResourceId = targetVersion.fileResourceId;
      freshMaterial.fileVersionId = restoredVersion.id;
      freshMaterial.updatedAt = now;

      return await manager.save(freshMaterial);
    });

    await this.invalidateMaterialContextCaches(
      result.materialFolderId,
      result.classEventId,
    );
    if (result.classEventId) {
      void this.notificationsDispatchService.dispatchMaterialUpdated(
        result.id,
        result.materialFolderId,
      );
    }

    return result;
  }

  async requestDeletion(
    user: UserWithSession,
    dto: RequestDeletionDto,
  ): Promise<void> {
    if (dto.entityType !== AUDIT_ENTITY_TYPES.MATERIAL) {
      throw new BadRequestException(
        'Solo se admiten solicitudes de eliminacion para materiales',
      );
    }

    const material = await this.materialRepository.findById(dto.entityId);
    if (!material) {
      throw new NotFoundException('Material no encontrado');
    }

    const folder = await this.folderRepository.findById(
      material.materialFolderId,
    );
    if (!folder) {
      throw new InternalServerErrorException(
        'Integridad de datos corrupta: Material sin carpeta contenedora',
      );
    }

    await this.assertCanManageEvaluation(user, folder.evaluationId);
    await this.materialsDeletionService.requestDeletion(user.id, dto);
  }

  private parseVisibilityRange(
    visibleFrom?: string,
    visibleUntil?: string,
  ): { visibleFrom: Date | null; visibleUntil: Date | null } {
    const startDate = visibleFrom ? new Date(visibleFrom) : null;
    const endDate = visibleUntil ? new Date(visibleUntil) : null;

    if (startDate && endDate && getEpoch(startDate) > getEpoch(endDate)) {
      throw new BadRequestException(
        'Rango de visibilidad inválido: visibleFrom no puede ser mayor que visibleUntil',
      );
    }

    return {
      visibleFrom: startDate,
      visibleUntil: endDate,
    };
  }

  private async assertCanManageEvaluation(
    user: UserWithSession,
    evaluationId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const activeRole = user.activeRole;
    const roleCodes = (user.roles || []).map((r) => r.code);

    if (
      activeRole === ROLE_CODES.ADMIN ||
      roleCodes.some((r) => ADMIN_ROLE_CODES.includes(r))
    ) {
      return;
    }

    if (activeRole !== ROLE_CODES.PROFESSOR) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar materiales de este curso',
      );
    }

    const isAssigned =
      await this.courseCycleProfessorRepository.isProfessorAssignedToEvaluation(
        evaluationId,
        user.id,
        manager,
      );

    if (!isAssigned) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar materiales de este curso',
      );
    }
  }

  private async getActiveMaterialStatus() {
    const status = await this.catalogRepository.findMaterialStatusByCode(
      MATERIAL_STATUS_CODES.ACTIVE,
    );
    if (!status) {
      throw new InternalServerErrorException(
        `Error de configuración: Estado ${MATERIAL_STATUS_CODES.ACTIVE} de material faltante`,
      );
    }
    return status;
  }

  private async validateClassEventAssociation(
    classEventId: string,
    evaluationId: string,
    manager?: EntityManager,
  ) {
    const classEvent = await this.classEventRepository.findByIdSimple(
      classEventId,
      manager,
    );
    if (!classEvent) {
      throw new NotFoundException('Sesión de clase no encontrada');
    }

    if (classEvent.evaluationId !== evaluationId) {
      throw new BadRequestException(
        'Inconsistencia: La sesión no pertenece a la misma evaluación de la carpeta',
      );
    }

    return classEvent;
  }

  private async rollbackFile(resource: {
    storageProvider: (typeof STORAGE_PROVIDER_CODES)[keyof typeof STORAGE_PROVIDER_CODES];
    storageKey: string;
    storageUrl: string | null;
  }) {
    await this.storageService.deleteFile(
      resource.storageKey,
      resource.storageProvider,
      resource.storageUrl,
    );
  }

  private async resolveDocumentsFolderIdForEvaluation(
    evaluationId: string,
  ): Promise<string> {
    const scope =
      await this.driveAccessScopeService.resolveForEvaluation(evaluationId);
    const documentsFolderId = String(
      scope.persisted?.driveDocumentsFolderId || '',
    ).trim();
    if (!documentsFolderId) {
      throw new ForbiddenException(
        'El scope Drive de la evaluacion no esta provisionado para documentos',
      );
    }
    return documentsFolderId;
  }

  private async invalidateFolderCache(folderId: string) {
    await this.cacheService.del(MATERIAL_CACHE_KEYS.CONTENTS(folderId));
  }

  private async invalidateRootCache(evaluationId: string) {
    await this.cacheService.del(MATERIAL_CACHE_KEYS.ROOTS(evaluationId));
  }

  private async invalidateClassEventMaterialsCache(classEventId: string) {
    await this.cacheService.del(MATERIAL_CACHE_KEYS.CLASS_EVENT(classEventId));
  }

  private async invalidateMaterialContextCaches(
    folderId: string,
    classEventId?: string | null,
  ): Promise<void> {
    const operations: Promise<void>[] = [this.invalidateFolderCache(folderId)];

    if (classEventId) {
      operations.push(this.invalidateClassEventMaterialsCache(classEventId));
    }

    await Promise.all(operations);
  }

  private async createNextMaterialVersion(
    manager: EntityManager,
    materialId: string,
    fileResourceId: string,
    createdById: string,
    createdAt: Date,
    currentVersionNumberHint = 0,
    restoredFromMaterialVersionId: string | null = null,
  ): Promise<MaterialVersion> {
    const maxAttempts = 3;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const latestMaterialVersion = await manager.findOne(MaterialVersion, {
        where: { materialId },
        order: { versionNumber: 'DESC' },
      });
      const nextVersionNumber =
        Math.max(
          currentVersionNumberHint,
          latestMaterialVersion?.versionNumber || 0,
        ) + 1;

      const versionEntity = manager.create(MaterialVersion, {
        materialId,
        fileResourceId,
        versionNumber: nextVersionNumber,
        restoredFromMaterialVersionId,
        createdById,
        createdAt,
      });

      try {
        return await manager.save(versionEntity);
      } catch (error) {
        const dbErrno = getErrnoFromDbError(error);
        const isLastAttempt = attempt === maxAttempts - 1;
        if (dbErrno !== MySqlErrorCode.DUPLICATE_ENTRY || isLastAttempt) {
          throw error;
        }
      }
    }

    throw new InternalServerErrorException(
      'No se pudo crear una nueva version del material',
    );
  }

  private buildStorageObjectName(originalName: string): string {
    const normalizedOriginalName = String(originalName || '')
      .replace(/[\r\n\t]/g, ' ')
      .trim();
    if (!normalizedOriginalName) {
      return randomUUID();
    }

    if (this.storageService.isGoogleDriveStorageEnabled()) {
      return normalizedOriginalName;
    }

    const extension = path.extname(normalizedOriginalName).trim();
    return extension ? `${randomUUID()}${extension}` : randomUUID();
  }
}

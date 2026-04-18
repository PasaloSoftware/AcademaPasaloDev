import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { DeletionRequestRepository } from '@modules/materials/infrastructure/deletion-request.repository';
import { MaterialRepository } from '@modules/materials/infrastructure/material.repository';
import { MaterialCatalogRepository } from '@modules/materials/infrastructure/material-catalog.repository';
import { DeletionRequest } from '@modules/materials/domain/deletion-request.entity';
import {
  AdminMaterialFileListQueryDto,
  AdminMaterialFileListResponseDto,
} from '@modules/materials/dto/admin-material-file-list.dto';
import {
  DeletionReviewAction,
  ReviewDeletionRequestDto,
} from '@modules/materials/dto/review-deletion-request.dto';
import { StorageService } from '@infrastructure/storage/storage.service';
import { FileResource } from '@modules/materials/domain/file-resource.entity';
import { Material } from '@modules/materials/domain/material.entity';
import { MaterialVersion } from '@modules/materials/domain/material-version.entity';
import { AuditService } from '@modules/audit/application/audit.service';
import {
  AUDIT_ACTION_CODES,
  AUDIT_ENTITY_TYPES,
} from '@modules/audit/interfaces/audit.constants';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { NotificationsDispatchService } from '@modules/notifications/application/notifications-dispatch.service';
import {
  DELETION_REQUEST_STATUS_CODES,
  MATERIAL_CACHE_KEYS,
  MATERIAL_STATUS_CODES,
  STORAGE_PROVIDER_CODES,
} from '@modules/materials/domain/material.constants';
import {
  buildDriveDownloadUrl,
  buildDrivePreviewUrl,
  buildDriveViewUrl,
} from '@modules/media-access/domain/media-access-url.util';
import { EvaluationDriveAccess } from '@modules/media-access/domain/evaluation-drive-access.entity';

type PendingDeletionRequestWithMaterialRow = {
  requestId: string;
  entityType: string;
  entityId: string;
  reason: string | null;
  createdAt: Date;
  requestedById: string;
  requestedByEmail: string | null;
  requestedByFirstName: string | null;
  requestedByLastName1: string | null;
  requestedByLastName2: string | null;
  materialId: string | null;
  materialDisplayName: string | null;
  originalName: string | null;
  mimeType: string | null;
  storageProvider: string | null;
  storageKey: string | null;
  storageUrl: string | null;
};

@Injectable()
export class MaterialsAdminService {
  private readonly logger = new Logger(MaterialsAdminService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly requestRepository: DeletionRequestRepository,
    private readonly materialRepository: MaterialRepository,
    private readonly catalogRepository: MaterialCatalogRepository,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
    private readonly cacheService: RedisCacheService,
    private readonly notificationsDispatchService: NotificationsDispatchService,
  ) {}

  async findAllPendingRequests(): Promise<Array<Record<string, unknown>>> {
    const pendingStatus =
      await this.catalogRepository.findDeletionRequestStatusByCode(
        DELETION_REQUEST_STATUS_CODES.PENDING,
      );
    if (!pendingStatus)
      throw new InternalServerErrorException(
        `Error de configuración: Estado ${DELETION_REQUEST_STATUS_CODES.PENDING} faltante`,
      );

    const rows = await this.dataSource.query<
      PendingDeletionRequestWithMaterialRow[]
    >(
      `SELECT
         dr.id AS requestId,
         dr.entity_type AS entityType,
         dr.entity_id AS entityId,
         dr.reason AS reason,
         dr.created_at AS createdAt,
         dr.requested_by AS requestedById,
         u.email AS requestedByEmail,
         u.first_name AS requestedByFirstName,
         u.last_name_1 AS requestedByLastName1,
         u.last_name_2 AS requestedByLastName2,
         m.id AS materialId,
         m.display_name AS materialDisplayName,
         fr.original_name AS originalName,
         fr.mime_type AS mimeType,
         fr.storage_provider AS storageProvider,
         fr.storage_key AS storageKey,
         fr.storage_url AS storageUrl
       FROM deletion_request dr
       INNER JOIN user u ON u.id = dr.requested_by
       LEFT JOIN material m
         ON dr.entity_type = ?
        AND m.id = dr.entity_id
       LEFT JOIN material_version mv ON mv.id = m.current_version_id
       LEFT JOIN file_resource fr ON fr.id = mv.file_resource_id
       WHERE dr.deletion_request_status_id = ?
       ORDER BY dr.created_at ASC`,
      [AUDIT_ENTITY_TYPES.MATERIAL, pendingStatus.id],
    );

    return rows.map((row) => {
      const storageProvider = String(row.storageProvider || '')
        .trim()
        .toUpperCase();
      const driveFileId =
        storageProvider === STORAGE_PROVIDER_CODES.GDRIVE
          ? String(row.storageKey || '').trim()
          : '';
      const materialId = String(row.materialId || '').trim();

      return {
        id: String(row.requestId),
        entityType: String(row.entityType || ''),
        entityId: String(row.entityId || ''),
        reason: row.reason,
        createdAt: row.createdAt,
        requestedBy: {
          id: String(row.requestedById || ''),
          email: row.requestedByEmail,
          firstName: row.requestedByFirstName,
          lastName1: row.requestedByLastName1,
          lastName2: row.requestedByLastName2,
        },
        material: materialId
          ? {
              id: materialId,
              displayName: row.materialDisplayName,
              originalName: row.originalName,
              mimeType: row.mimeType,
              storageProvider: storageProvider || null,
              previewUrl: driveFileId
                ? buildDrivePreviewUrl(driveFileId)
                : null,
              viewUrl: driveFileId ? buildDriveViewUrl(driveFileId) : null,
              downloadUrl: driveFileId
                ? buildDriveDownloadUrl(driveFileId)
                : materialId
                  ? this.buildMaterialDownloadProxyPath(materialId)
                  : null,
              authorizedViewPath: materialId
                ? this.buildMaterialAuthorizedLinkPath(materialId, 'view')
                : null,
            }
          : null,
      };
    });
  }

  async findMaterialFiles(
    query: AdminMaterialFileListQueryDto,
  ): Promise<AdminMaterialFileListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const { rows, totalItems } =
      await this.materialRepository.findAdminMaterialFilesPage({
        page,
        pageSize,
        search: query.search,
        statusCode: query.statusCode,
      });
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

    return {
      items: rows.map((row) => ({
        materialId: row.materialId,
        displayName: row.displayName,
        classEventId: row.classEventId,
        visibleFrom: row.visibleFrom,
        visibleUntil: row.visibleUntil,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        status: {
          code: row.statusCode,
          name: row.statusName,
        },
        folder: {
          id: row.folderId,
          name: row.folderName,
        },
        evaluation: {
          id: row.evaluationId,
          number: Number(row.evaluationNumber),
          evaluationTypeCode: row.evaluationTypeCode,
          evaluationTypeName: row.evaluationTypeName,
          courseCode: row.courseCode,
          courseName: row.courseName,
          academicCycleCode: row.academicCycleCode,
        },
        file: {
          resourceId: row.fileResourceId,
          versionId: row.fileVersionId,
          versionNumber: Number(row.versionNumber),
          originalName: row.originalName,
          mimeType: row.mimeType,
          sizeBytes: row.sizeBytes,
          storageProvider: row.storageProvider,
        },
        createdBy: row.createdById
          ? {
              id: row.createdById,
              email: row.createdByEmail || '',
              firstName: row.createdByFirstName || '',
              lastName1: row.createdByLastName1,
              lastName2: row.createdByLastName2,
            }
          : null,
      })),
      page,
      pageSize,
      totalItems,
      totalPages,
    };
  }

  async reviewRequest(
    adminId: string,
    requestId: string,
    dto: ReviewDeletionRequestDto,
  ): Promise<void> {
    const pendingStatus =
      await this.catalogRepository.findDeletionRequestStatusByCode(
        DELETION_REQUEST_STATUS_CODES.PENDING,
      );
    if (!pendingStatus) {
      throw new InternalServerErrorException(
        `Error de configuración: Estado ${DELETION_REQUEST_STATUS_CODES.PENDING} faltante`,
      );
    }

    let reviewedEntityId: string | null = null;
    let materialToInvalidate: Material | null = null;

    await this.dataSource.transaction(async (manager) => {
      const lockedRequest = await manager.findOne(DeletionRequest, {
        where: { id: requestId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedRequest) {
        throw new NotFoundException('Solicitud no encontrada');
      }

      if (lockedRequest.deletionRequestStatusId !== pendingStatus.id) {
        throw new BadRequestException('Esta solicitud ya fue revisada');
      }

      if (lockedRequest.entityType !== AUDIT_ENTITY_TYPES.MATERIAL) {
        throw new BadRequestException(
          'Tipo de solicitud no soportado: solo se admiten materiales',
        );
      }

      reviewedEntityId = lockedRequest.entityId;
      materialToInvalidate = await this.materialRepository.findById(
        lockedRequest.entityId,
      );

      if (dto.action === DeletionReviewAction.APPROVE) {
        materialToInvalidate = await this.handleApproval(
          requestId,
          lockedRequest.entityId,
          adminId,
          dto.adminComment,
          manager,
        );
      } else {
        await this.handleRejection(
          requestId,
          adminId,
          dto.adminComment,
          manager,
        );
      }
    });

    if (materialToInvalidate) {
      await this.invalidateMaterialCaches(materialToInvalidate);
    }

    if (dto.action === DeletionReviewAction.APPROVE && materialToInvalidate) {
      try {
        await this.moveCurrentFileToEvaluationArchived(materialToInvalidate);
      } catch (error) {
        this.logger.warn({
          message:
            'No se pudo mover el archivo a la carpeta archivado en Drive; se continua sin mover',
          requestId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (dto.action === DeletionReviewAction.APPROVE) {
      void this.notificationsDispatchService.dispatchDeletionRequestApproved(
        requestId,
      );
    } else {
      void this.notificationsDispatchService.dispatchDeletionRequestRejected(
        requestId,
        dto.adminComment,
      );
    }

    this.logger.log({
      message: `Solicitud ${dto.action}`,
      requestId,
      adminId,
      entityId: reviewedEntityId,
      adminComment: dto.adminComment || null,
    });
  }

  private async handleApproval(
    requestId: string,
    materialId: string,
    adminId: string,
    adminComment: string | undefined,
    manager: EntityManager,
  ): Promise<Material> {
    const material = await this.materialRepository.findById(materialId);
    if (!material) throw new NotFoundException('Material no encontrado');

    const approvedStatus =
      await this.catalogRepository.findDeletionRequestStatusByCode(
        DELETION_REQUEST_STATUS_CODES.APPROVED,
      );
    const archivedMaterialStatus =
      await this.catalogRepository.findMaterialStatusByCode(
        MATERIAL_STATUS_CODES.ARCHIVED,
      );

    if (!approvedStatus || !archivedMaterialStatus) {
      throw new InternalServerErrorException(
        `Error de configuración: Estados de sistema faltantes (${DELETION_REQUEST_STATUS_CODES.APPROVED}/${MATERIAL_STATUS_CODES.ARCHIVED})`,
      );
    }

    await manager.update(DeletionRequest, requestId, {
      deletionRequestStatusId: approvedStatus.id,
      reviewedById: adminId,
      reviewedAt: new Date(),
      reviewComment: adminComment?.trim() || null,
      updatedAt: new Date(),
    });

    await manager.update(Material, materialId, {
      materialStatusId: archivedMaterialStatus.id,
      visibleUntil: new Date(),
      updatedAt: new Date(),
    });

    await this.auditService.logAction(
      adminId,
      AUDIT_ACTION_CODES.CONTENT_DISABLE,
      manager,
    );

    return material;
  }

  private async moveCurrentFileToEvaluationArchived(
    material: Material,
  ): Promise<void> {
    if (!material.fileResource) return;

    const evaluationId = material.materialFolder?.evaluationId;
    if (!evaluationId) return;

    const driveAccess = await this.dataSource
      .getRepository(EvaluationDriveAccess)
      .findOne({ where: { evaluationId } });

    if (!driveAccess?.driveArchivedFolderId) {
      this.logger.warn({
        message:
          'No se encontro carpeta archivado en Drive para la evaluacion; se omite el movimiento',
        materialId: material.id,
        evaluationId,
      });
      return;
    }

    await this.storageService.moveFileToEvaluationArchived(
      material.fileResource.storageKey,
      material.fileResource.storageProvider,
      driveAccess.driveArchivedFolderId,
    );
  }

  private async handleRejection(
    requestId: string,
    adminId: string,
    adminComment: string | undefined,
    manager: EntityManager,
  ) {
    const rejectedStatus =
      await this.catalogRepository.findDeletionRequestStatusByCode(
        DELETION_REQUEST_STATUS_CODES.REJECTED,
      );
    if (!rejectedStatus)
      throw new InternalServerErrorException(
        `Error de configuración: Estado ${DELETION_REQUEST_STATUS_CODES.REJECTED} faltante`,
      );

    await manager.update(DeletionRequest, requestId, {
      deletionRequestStatusId: rejectedStatus.id,
      reviewedById: adminId,
      reviewedAt: new Date(),
      reviewComment: adminComment?.trim() || null,
      updatedAt: new Date(),
    });

    await this.auditService.logAction(
      adminId,
      AUDIT_ACTION_CODES.FILE_EDIT,
      manager,
    );
  }

  async hardDeleteMaterial(adminId: string, materialId: string): Promise<void> {
    const material = await this.materialRepository.findById(materialId);
    if (!material) throw new NotFoundException('Material no encontrado');

    const archivedStatus =
      await this.catalogRepository.findMaterialStatusByCode(
        MATERIAL_STATUS_CODES.ARCHIVED,
      );
    if (material.materialStatusId !== archivedStatus?.id) {
      throw new BadRequestException(
        'Solo se pueden eliminar físicamente materiales que estén ARCHIVADOS.',
      );
    }

    await this.performPhysicalDeletion(adminId, materialId, material, {
      deleteAllVersions: false,
    });

    this.logger.warn({
      message: 'Material eliminado físicamente (Hard Delete)',
      materialId,
      adminId,
    });
  }

  async directDeleteMaterial(
    adminId: string,
    materialId: string,
    reason?: string,
  ): Promise<void> {
    const material = await this.materialRepository.findById(materialId);
    if (!material) throw new NotFoundException('Material no encontrado');

    const pendingStatus =
      await this.catalogRepository.findDeletionRequestStatusByCode(
        DELETION_REQUEST_STATUS_CODES.PENDING,
      );
    const approvedStatus =
      await this.catalogRepository.findDeletionRequestStatusByCode(
        DELETION_REQUEST_STATUS_CODES.APPROVED,
      );

    let pendingRequestId: string | null = null;

    if (pendingStatus) {
      const pendingRequest =
        await this.requestRepository.findPendingByMaterialId(
          materialId,
          pendingStatus.id,
        );
      if (pendingRequest) {
        pendingRequestId = pendingRequest.id;
      }
    }

    if (pendingRequestId && !approvedStatus) {
      throw new InternalServerErrorException(
        `Error de configuración: Estado ${DELETION_REQUEST_STATUS_CODES.APPROVED} faltante`,
      );
    }

    await this.performPhysicalDeletion(adminId, materialId, material, {
      deleteAllVersions: true,
      reason,
      pendingRequestId,
      pendingStatusId: pendingStatus?.id ?? null,
      approvedStatusId: approvedStatus?.id ?? null,
    });

    if (pendingRequestId) {
      void this.notificationsDispatchService.dispatchDeletionRequestApproved(
        pendingRequestId,
      );
    }

    this.logger.warn({
      message: 'Material eliminado directamente (Direct Delete)',
      materialId,
      adminId,
      reason,
    });
  }

  private async performPhysicalDeletion(
    adminId: string,
    materialId: string,
    material: Material,
    opts: {
      deleteAllVersions: boolean;
      reason?: string;
      pendingRequestId?: string | null;
      pendingStatusId?: string | null;
      approvedStatusId?: string | null;
    },
  ): Promise<void> {
    const filesToDelete: Array<{
      storageProvider: FileResource['storageProvider'];
      storageKey: string;
      storageUrl: string | null;
    }> = [];

    await this.dataSource.transaction(async (manager) => {
      if (opts.deleteAllVersions) {
        const allVersions = await manager.find(MaterialVersion, {
          where: { materialId },
        });
        const allFileResourceIds = [
          ...new Set([
            ...allVersions.map((v) => v.fileResourceId),
            ...(material.fileResourceId ? [material.fileResourceId] : []),
          ]),
        ];

        await manager.update(Material, materialId, {
          fileVersionId: null,
          updatedAt: new Date(),
        });

        if (allVersions.length > 0) {
          await manager.delete(MaterialVersion, { materialId });
        }

        await manager.delete(Material, materialId);

        if (
          opts.pendingRequestId &&
          opts.approvedStatusId &&
          opts.pendingStatusId
        ) {
          await manager.update(
            DeletionRequest,
            {
              id: opts.pendingRequestId,
              deletionRequestStatusId: opts.pendingStatusId,
            },
            {
              deletionRequestStatusId: opts.approvedStatusId,
              reviewedById: adminId,
              reviewedAt: new Date(),
              reviewComment: 'Eliminación directa por administrador',
              updatedAt: new Date(),
            },
          );
        }

        // Limpiar filas huérfanas de deletion_request para este material.
        // Si hay una solicitud auto-aprobada, se conserva para que el processor
        // de notificaciones pueda leerla; se borran el resto (rechazadas, etc.).
        await manager.query(
          `DELETE FROM deletion_request WHERE entity_type = ? AND entity_id = ?${opts.pendingRequestId ? ' AND id != ?' : ''}`,
          opts.pendingRequestId
            ? [AUDIT_ENTITY_TYPES.MATERIAL, materialId, opts.pendingRequestId]
            : [AUDIT_ENTITY_TYPES.MATERIAL, materialId],
        );

        await this.auditService.logAction(
          adminId,
          AUDIT_ACTION_CODES.FILE_DELETE,
          manager,
        );

        if (allFileResourceIds.length > 0) {
          const placeholders = allFileResourceIds.map(() => '?').join(',');
          const versionRefRows = await manager.query<
            { fileResourceId: string; cnt: string }[]
          >(
            `SELECT file_resource_id AS fileResourceId, COUNT(*) AS cnt
             FROM material_version
             WHERE file_resource_id IN (${placeholders})
             GROUP BY file_resource_id`,
            allFileResourceIds,
          );
          const materialRefRows = await manager.query<
            { fileResourceId: string; cnt: string }[]
          >(
            `SELECT file_resource_id AS fileResourceId, COUNT(*) AS cnt
             FROM material
             WHERE file_resource_id IN (${placeholders})
             GROUP BY file_resource_id`,
            allFileResourceIds,
          );

          const versionRefCount = new Map(
            versionRefRows.map((r) => [r.fileResourceId, Number(r.cnt)]),
          );
          const materialRefCount = new Map(
            materialRefRows.map((r) => [r.fileResourceId, Number(r.cnt)]),
          );

          const orphanIds = allFileResourceIds.filter(
            (id) =>
              (versionRefCount.get(id) ?? 0) === 0 &&
              (materialRefCount.get(id) ?? 0) === 0,
          );

          if (orphanIds.length > 0) {
            const resources = await manager.find(FileResource, {
              where: { id: In(orphanIds) },
            });
            for (const resource of resources) {
              if (
                typeof resource.storageProvider === 'string' &&
                typeof resource.storageKey === 'string' &&
                resource.storageKey.trim()
              ) {
                filesToDelete.push({
                  storageProvider: resource.storageProvider,
                  storageKey: resource.storageKey,
                  storageUrl: resource.storageUrl,
                });
              }
            }
            await manager.delete(FileResource, { id: In(orphanIds) });
          }
        }
      } else {
        const materialRecord = await manager.findOne(Material, {
          where: { id: materialId },
          relations: { fileVersion: true },
        });

        if (!materialRecord) return;

        const currentVersionId =
          materialRecord.fileVersionId ||
          materialRecord.fileVersion?.id ||
          null;
        if (!currentVersionId) {
          throw new InternalServerErrorException(
            'Integridad de datos corrupta: material sin version actual',
          );
        }

        const currentVersion =
          materialRecord.fileVersion ||
          (await manager.findOne(MaterialVersion, {
            where: { id: currentVersionId },
          }));
        if (!currentVersion) {
          throw new InternalServerErrorException(
            'Integridad de datos corrupta: version actual no encontrada',
          );
        }

        await manager.update(Material, materialId, {
          fileVersionId: null,
          updatedAt: new Date(),
        });

        await manager.delete(MaterialVersion, { id: currentVersionId });

        const previousVersion = await manager.findOne(MaterialVersion, {
          where: { materialId },
          order: { versionNumber: 'DESC' },
        });

        if (previousVersion) {
          await manager.update(Material, materialId, {
            fileVersionId: previousVersion.id,
            fileResourceId: previousVersion.fileResourceId,
            updatedAt: new Date(),
          });
        } else {
          await manager.delete(Material, materialId);
          // Limpiar filas de deletion_request asociadas (incluye la que motivó el ARCHIVED)
          await manager.query(
            `DELETE FROM deletion_request WHERE entity_type = ? AND entity_id = ?`,
            [AUDIT_ENTITY_TYPES.MATERIAL, materialId],
          );
        }

        await this.auditService.logAction(
          adminId,
          AUDIT_ACTION_CODES.FILE_DELETE,
          manager,
        );

        const versionRefs = await manager.count(MaterialVersion, {
          where: { fileResourceId: currentVersion.fileResourceId },
        });
        const materialRefs = await manager.count(Material, {
          where: { fileResourceId: currentVersion.fileResourceId },
        });

        if (versionRefs === 0 && materialRefs === 0) {
          const resource = await manager.findOne(FileResource, {
            where: { id: currentVersion.fileResourceId },
          });
          if (resource) {
            filesToDelete.push({
              storageProvider: resource.storageProvider,
              storageKey: resource.storageKey,
              storageUrl: resource.storageUrl,
            });
            await manager.delete(FileResource, {
              id: currentVersion.fileResourceId,
            });
          }
        }
      }
    });

    for (const fileToDeleteResource of filesToDelete) {
      await this.storageService.deleteFile(
        fileToDeleteResource.storageKey,
        fileToDeleteResource.storageProvider,
        fileToDeleteResource.storageUrl,
      );
      this.logger.warn({
        message: 'Archivo físico eliminado (Garbage Collection)',
        file: fileToDeleteResource.storageKey,
      });
    }

    await this.invalidateMaterialCaches(material);
  }

  private async invalidateMaterialCaches(material: Material): Promise<void> {
    const promises: Promise<void>[] = [];

    promises.push(
      this.cacheService.del(
        MATERIAL_CACHE_KEYS.CONTENTS(material.materialFolderId),
      ),
    );
    promises.push(
      this.cacheService.invalidateIndex(
        MATERIAL_CACHE_KEYS.DRIVE_SCOPE_VALIDATION_INDEX(material.id),
      ),
    );

    if (material.classEventId) {
      promises.push(
        this.cacheService.del(
          MATERIAL_CACHE_KEYS.CLASS_EVENT(material.classEventId),
        ),
      );
    }

    await Promise.all(promises);
  }

  private buildMaterialDownloadProxyPath(materialId: string): string {
    return `/materials/${encodeURIComponent(materialId)}/download`;
  }

  private buildMaterialAuthorizedLinkPath(
    materialId: string,
    mode: 'view' | 'download',
  ): string {
    const query = new URLSearchParams({ mode });
    return `/materials/${encodeURIComponent(materialId)}/authorized-link?${query.toString()}`;
  }
}

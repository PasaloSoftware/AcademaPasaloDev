import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { StorageService } from '@infrastructure/storage/storage.service';
import { AccessEngineService } from '@modules/enrollments/application/access-engine.service';
import { MaterialFolderRepository } from '@modules/materials/infrastructure/material-folder.repository';
import { MaterialRepository } from '@modules/materials/infrastructure/material.repository';
import { MaterialVersionHistoryRepository } from '@modules/materials/infrastructure/material-version-history.repository';
import { CourseCycleProfessorRepository } from '@modules/courses/infrastructure/course-cycle-professor.repository';
import { MaterialFolder } from '@modules/materials/domain/material-folder.entity';
import { Material } from '@modules/materials/domain/material.entity';
import type { UserWithSession } from '@modules/auth/strategies/jwt.strategy';
import {
  ADMIN_ROLE_CODES,
  ROLE_CODES,
} from '@common/constants/role-codes.constants';
import { AuthorizedMediaLinkDto } from '@modules/media-access/dto/authorized-media-link.dto';
import {
  MEDIA_ACCESS_MODES,
  MEDIA_CONTENT_KINDS,
  MEDIA_DOCUMENT_LINK_MODES,
} from '@modules/media-access/domain/media-access.constants';
import type { MediaDocumentLinkMode } from '@modules/media-access/domain/media-access.constants';
import {
  buildDriveDownloadUrl,
  buildDrivePreviewUrl,
} from '@modules/media-access/domain/media-access-url.util';
import { DriveAccessScopeService } from '@modules/media-access/application/drive-access-scope.service';
import { MaterialVersionHistoryDto } from '@modules/materials/dto/material-version-history.dto';
import { STORAGE_PROVIDER_CODES } from '@modules/materials/domain/material.constants';

@Injectable()
export class MaterialsReadService {
  constructor(
    private readonly storageService: StorageService,
    private readonly accessEngine: AccessEngineService,
    private readonly folderRepository: MaterialFolderRepository,
    private readonly materialRepository: MaterialRepository,
    private readonly materialVersionHistoryRepository: MaterialVersionHistoryRepository,
    private readonly courseCycleProfessorRepository: CourseCycleProfessorRepository,
    private readonly driveAccessScopeService: DriveAccessScopeService,
  ) {}

  async download(
    user: UserWithSession,
    materialId: string,
  ): Promise<{
    stream: NodeJS.ReadableStream;
    fileName: string;
    mimeType: string;
  }> {
    const { material, folder } =
      await this.resolveMaterialWithFolderForReadOrFail(materialId);

    await this.checkAuthorizedAccess(
      user,
      folder.evaluationId,
      folder,
      material,
    );

    const resource = material.fileResource;
    if (!resource) {
      throw new InternalServerErrorException(
        'Integridad de datos corrupta: Material sin recurso fisico',
      );
    }

    const stream = await this.storageService.getFileStream(
      resource.storageKey,
      resource.storageProvider,
      resource.storageUrl,
    );

    return {
      stream,
      fileName: material.displayName || resource.originalName,
      mimeType: resource.mimeType,
    };
  }

  async getAuthorizedDocumentLink(
    user: UserWithSession,
    materialId: string,
    mode: MediaDocumentLinkMode = MEDIA_DOCUMENT_LINK_MODES.VIEW,
  ): Promise<AuthorizedMediaLinkDto> {
    const { material, folder } =
      await this.resolveMaterialWithFolderForReadOrFail(materialId);

    await this.checkAuthorizedAccess(
      user,
      folder.evaluationId,
      folder,
      material,
    );

    const resource = material.fileResource;
    if (!resource) {
      throw new InternalServerErrorException(
        'Integridad de datos corrupta: Material sin recurso fisico',
      );
    }

    const isDriveResource =
      resource.storageProvider === STORAGE_PROVIDER_CODES.GDRIVE;
    const driveFileId = isDriveResource ? resource.storageKey : null;
    if (isDriveResource && driveFileId) {
      const scope = await this.driveAccessScopeService.resolveForEvaluation(
        folder.evaluationId,
      );
      const expectedDocumentsFolderId = scope.persisted?.driveDocumentsFolderId;
      if (!expectedDocumentsFolderId) {
        throw new ForbiddenException(
          'El scope Drive de la evaluacion no esta provisionado para documentos',
        );
      }

      const isInExpectedFolder =
        await this.storageService.isDriveFileDirectlyInFolder(
          driveFileId,
          expectedDocumentsFolderId,
        );
      if (!isInExpectedFolder) {
        throw new ForbiddenException(
          'El documento no pertenece al scope Drive autorizado para esta evaluacion',
        );
      }
    }

    const url =
      isDriveResource && driveFileId
        ? mode === MEDIA_DOCUMENT_LINK_MODES.DOWNLOAD
          ? buildDriveDownloadUrl(driveFileId)
          : buildDrivePreviewUrl(driveFileId)
        : this.buildMaterialDownloadProxyPath(material.id);

    const accessMode = isDriveResource
      ? MEDIA_ACCESS_MODES.DIRECT_URL
      : MEDIA_ACCESS_MODES.BACKEND_PROXY;

    return {
      contentKind: MEDIA_CONTENT_KINDS.DOCUMENT,
      accessMode,
      evaluationId: folder.evaluationId,
      driveFileId,
      url,
      expiresAt: null,
      requestedMode: mode,
      fileName: material.displayName || resource.originalName,
      mimeType: resource.mimeType,
      storageProvider: resource.storageProvider,
    };
  }

  async getMaterialLastModified(
    user: UserWithSession,
    materialId: string,
  ): Promise<{
    materialId: string;
    lastModifiedAt: Date;
  }> {
    const { material, folder } =
      await this.resolveMaterialWithFolderForReadOrFail(materialId);

    await this.checkAuthorizedAccess(
      user,
      folder.evaluationId,
      folder,
      material,
    );

    return {
      materialId: material.id,
      lastModifiedAt: material.updatedAt ?? material.createdAt,
    };
  }

  async getMaterialVersionHistory(
    user: UserWithSession,
    materialId: string,
  ): Promise<MaterialVersionHistoryDto> {
    const { material, folder } =
      await this.resolveMaterialWithFolderForReadOrFail(materialId);

    await this.checkAuthorizedAccess(
      user,
      folder.evaluationId,
      folder,
      material,
    );

    const rows =
      await this.materialVersionHistoryRepository.findByMaterialId(materialId);
    const currentVersionId = material.fileVersionId;
    const currentVersion =
      rows.find((row) => row.versionId === currentVersionId) || null;

    return {
      materialId: material.id,
      currentVersionId,
      currentVersionNumber: currentVersion?.versionNumber ?? null,
      versions: rows.map((row) => ({
        versionId: row.versionId,
        versionNumber: Number(row.versionNumber),
        isCurrent: row.versionId === currentVersionId,
        createdAt: row.createdAt,
        createdBy: row.createdById
          ? {
              id: row.createdById,
              email: row.createdByEmail,
              firstName: row.createdByFirstName,
              lastName1: row.createdByLastName1,
              lastName2: row.createdByLastName2,
            }
          : null,
        file: {
          resourceId: row.fileResourceId,
          originalName: row.originalName,
          mimeType: row.mimeType,
          sizeBytes: row.sizeBytes,
          storageProvider: row.storageProvider,
          driveFileId:
            row.storageProvider === STORAGE_PROVIDER_CODES.GDRIVE
              ? row.storageKey
              : null,
          storageUrl: row.storageUrl,
        },
      })),
    };
  }

  private async resolveMaterialWithFolderForReadOrFail(
    materialId: string,
  ): Promise<{ material: Material; folder: MaterialFolder }> {
    const material = await this.materialRepository.findById(materialId);
    if (!material) {
      throw new NotFoundException('Material no encontrado');
    }

    const folder = await this.folderRepository.findById(
      material.materialFolderId,
    );
    if (!folder) {
      throw new NotFoundException('Carpeta contenedora no encontrada');
    }

    return { material, folder };
  }

  private buildMaterialDownloadProxyPath(materialId: string): string {
    return `/materials/${encodeURIComponent(materialId)}/download`;
  }

  private async checkAuthorizedAccess(
    user: UserWithSession,
    evaluationId: string,
    folder?: MaterialFolder,
    material?: Material,
  ): Promise<void> {
    const activeRole = user.activeRole;

    if (this.hasAdminAccess(activeRole)) {
      return;
    }

    if (this.hasProfessorAccess(activeRole)) {
      const isAssigned =
        await this.courseCycleProfessorRepository.canProfessorReadEvaluation(
          evaluationId,
          user.id,
        );

      if (!isAssigned) {
        throw new ForbiddenException(
          'No tienes permiso para ver materiales de este curso',
        );
      }
      return;
    }

    const hasEnrollment = await this.accessEngine.hasAccess(
      user.id,
      evaluationId,
    );
    if (!hasEnrollment) {
      throw new ForbiddenException(
        'No tienes acceso a este contenido educativo',
      );
    }

    const now = new Date();

    if (folder) {
      if (folder.visibleFrom && now < new Date(folder.visibleFrom)) {
        throw new ForbiddenException('Este contenido aun no esta disponible');
      }
      if (folder.visibleUntil && now > new Date(folder.visibleUntil)) {
        throw new ForbiddenException('Este contenido ya no esta disponible');
      }
    }

    if (material) {
      if (material.visibleFrom && now < new Date(material.visibleFrom)) {
        throw new ForbiddenException('Este material aun no esta disponible');
      }
      if (material.visibleUntil && now > new Date(material.visibleUntil)) {
        throw new ForbiddenException('Este material ya no esta disponible');
      }
    }
  }

  private normalizeRole(activeRole?: string): string {
    return String(activeRole || '')
      .trim()
      .toUpperCase();
  }

  private hasAdminAccess(activeRole?: string): boolean {
    return ADMIN_ROLE_CODES.includes(this.normalizeRole(activeRole));
  }

  private hasProfessorAccess(activeRole?: string): boolean {
    return this.normalizeRole(activeRole) === ROLE_CODES.PROFESSOR;
  }
}

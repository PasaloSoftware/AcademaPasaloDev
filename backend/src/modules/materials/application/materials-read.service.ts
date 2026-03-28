import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
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
  MEDIA_ACCESS_DRIVE_FOLDERS,
  MEDIA_DOCUMENT_LINK_MODES,
} from '@modules/media-access/domain/media-access.constants';
import type { MediaDocumentLinkMode } from '@modules/media-access/domain/media-access.constants';
import {
  buildDriveDownloadUrl,
  buildDrivePreviewUrl,
} from '@modules/media-access/domain/media-access-url.util';
import { DriveAccessScopeService } from '@modules/media-access/application/drive-access-scope.service';
import { MaterialVersionHistoryDto } from '@modules/materials/dto/material-version-history.dto';
import {
  DELETION_REQUEST_STATUS_CODES,
  STORAGE_PROVIDER_CODES,
} from '@modules/materials/domain/material.constants';
import { EVALUATION_TYPE_CODES } from '@modules/evaluations/domain/evaluation.constants';
import { MaterialCatalogRepository } from '@modules/materials/infrastructure/material-catalog.repository';
import { DeletionRequestRepository } from '@modules/materials/infrastructure/deletion-request.repository';

@Injectable()
export class MaterialsReadService {
  private static readonly BANK_FOLDER_CACHE_TTL_MS = 5 * 60 * 1000;
  private readonly bankDocumentsFolderCache = new Map<
    string,
    { folderId: string; expiresAt: number }
  >();
  private pendingDeletionStatusIdCache: string | null = null;

  constructor(
    private readonly dataSource: DataSource,
    private readonly storageService: StorageService,
    private readonly accessEngine: AccessEngineService,
    private readonly folderRepository: MaterialFolderRepository,
    private readonly materialRepository: MaterialRepository,
    private readonly materialCatalogRepository: MaterialCatalogRepository,
    private readonly deletionRequestRepository: DeletionRequestRepository,
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
      const evaluationTypeCode =
        this.getEvaluationTypeCodeFromLoadedContext(material) ||
        (await this.getEvaluationTypeCode(folder.evaluationId));
      const isBankEvaluation =
        evaluationTypeCode === EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS;

      let isInExpectedFolder = false;
      if (isBankEvaluation) {
        const bankDocumentsFolderId =
          await this.resolveBankDocumentsFolderIdForEvaluationCached({
            evaluationId: folder.evaluationId,
            material,
          });
        if (!bankDocumentsFolderId) {
          throw new ForbiddenException(
            'El scope Drive del banco de enunciados no esta provisionado',
          );
        }
        isInExpectedFolder = await this.storageService.isDriveFileInFolderTree(
          driveFileId,
          bankDocumentsFolderId,
        );
      } else {
        const scope = await this.driveAccessScopeService.resolveForEvaluation(
          folder.evaluationId,
        );
        const expectedDocumentsFolderId = scope.persisted?.driveDocumentsFolderId;
        if (!expectedDocumentsFolderId) {
          throw new ForbiddenException(
            'El scope Drive de la evaluacion no esta provisionado para documentos',
          );
        }
        isInExpectedFolder = await this.storageService.isDriveFileInFolderTree(
          driveFileId,
          expectedDocumentsFolderId,
        );
      }
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

    const folder = material.materialFolder
      ? material.materialFolder
      : await this.folderRepository.findById(material.materialFolderId);
    if (!folder) {
      throw new NotFoundException('Carpeta contenedora no encontrada');
    }

    return { material, folder };
  }

  private buildMaterialDownloadProxyPath(materialId: string): string {
    return `/materials/${encodeURIComponent(materialId)}/download`;
  }

  private async getEvaluationTypeCode(evaluationId: string): Promise<string> {
    const rows = await this.dataSource.query<Array<{ evaluationTypeCode: string }>>(
      `
      SELECT UPPER(TRIM(et.code)) AS evaluationTypeCode
      FROM evaluation e
      INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
      WHERE e.id = ?
      LIMIT 1
      `,
      [evaluationId],
    );
    return String(rows[0]?.evaluationTypeCode || '').trim().toUpperCase();
  }

  private async resolveBankDocumentsFolderIdForEvaluation(
    params: {
      evaluationId: string;
      material?: Material;
    },
  ): Promise<string | null> {
    const loaded = this.getBankScopeFromLoadedContext(params.material);
    const cycleCode = loaded?.cycleCode || '';
    const courseCycleId = loaded?.courseCycleId || '';
    const courseCode = loaded?.courseCode || '';

    if (!cycleCode || !courseCycleId || !courseCode) {
      const rows = await this.dataSource.query<
        Array<{
          courseCycleId: string;
          courseCode: string;
          cycleCode: string;
        }>
      >(
        `
        SELECT
          cc.id AS courseCycleId,
          c.code AS courseCode,
          ac.code AS cycleCode
        FROM evaluation e
        INNER JOIN course_cycle cc ON cc.id = e.course_cycle_id
        INNER JOIN course c ON c.id = cc.course_id
        INNER JOIN academic_cycle ac ON ac.id = cc.academic_cycle_id
        INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
        WHERE e.id = ?
          AND UPPER(TRIM(et.code)) = ?
        LIMIT 1
        `,
        [params.evaluationId, EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS],
      );
      const row = rows[0];
      if (!row) {
        return null;
      }
      return await this.storageService.resolveDriveFolderIdByPath([
        MEDIA_ACCESS_DRIVE_FOLDERS.COURSE_CYCLES_PARENT,
        String(row.cycleCode || '').trim(),
        `cc_${String(row.courseCycleId || '').trim()}_${String(row.courseCode || '').trim()}`,
        'bank_documents',
      ]);
    }

    if (!cycleCode || !courseCycleId || !courseCode) {
      return null;
    }

    return await this.storageService.resolveDriveFolderIdByPath([
      MEDIA_ACCESS_DRIVE_FOLDERS.COURSE_CYCLES_PARENT,
      cycleCode,
      `cc_${courseCycleId}_${courseCode}`,
      'bank_documents',
    ]);
  }

  private async resolveBankDocumentsFolderIdForEvaluationCached(
    params: {
      evaluationId: string;
      material?: Material;
    },
  ): Promise<string | null> {
    const key = String(params.evaluationId || '').trim();
    if (!key) {
      return null;
    }

    const now = Date.now();
    const cached = this.bankDocumentsFolderCache.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.folderId;
    }

    const folderId = await this.resolveBankDocumentsFolderIdForEvaluation(
      params,
    );
    if (!folderId) {
      this.bankDocumentsFolderCache.delete(key);
      return null;
    }

    this.bankDocumentsFolderCache.set(key, {
      folderId,
      expiresAt: now + MaterialsReadService.BANK_FOLDER_CACHE_TTL_MS,
    });
    return folderId;
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
      const hasBankAccess = await this.hasStudentBankAccess(
        user.id,
        evaluationId,
      );
      if (hasBankAccess) {
        return;
      }
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
      await this.assertStudentCanReadMaterial(user, material.id);
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

  private async hasStudentBankAccess(
    userId: string,
    evaluationId: string,
  ): Promise<boolean> {
    const rows = await this.dataSource.query<Array<{ hasAccess: number }>>(
      `SELECT EXISTS(
        SELECT 1
        FROM evaluation ev
        INNER JOIN evaluation_type et
          ON et.id = ev.evaluation_type_id
        INNER JOIN enrollment e
          ON e.course_cycle_id = ev.course_cycle_id
        WHERE ev.id = ?
          AND e.user_id = ?
          AND e.cancelled_at IS NULL
          AND UPPER(TRIM(et.code)) = ?
        LIMIT 1
      ) AS hasAccess`,
      [evaluationId, userId, EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS],
    );

    return Number(rows[0]?.hasAccess || 0) === 1;
  }

  private async assertStudentCanReadMaterial(
    user: UserWithSession,
    materialId: string,
  ): Promise<void> {
    if (this.normalizeRole(user.activeRole) !== ROLE_CODES.STUDENT) {
      return;
    }

    const pendingStatusId = await this.getPendingDeletionStatusIdCached();
    if (!pendingStatusId) {
      throw new InternalServerErrorException(
        `Error de configuracion: Estado ${DELETION_REQUEST_STATUS_CODES.PENDING} faltante`,
      );
    }

    const pendingDeletion =
      await this.deletionRequestRepository.existsPendingByMaterialId(
        materialId,
        pendingStatusId,
      );
    if (pendingDeletion) {
      throw new ForbiddenException(
        'Este material no esta disponible temporalmente',
      );
    }
  }

  private getEvaluationTypeCodeFromLoadedContext(material: Material): string {
    return String(
      material.materialFolder?.evaluation?.evaluationType?.code || '',
    )
      .trim()
      .toUpperCase();
  }

  private getBankScopeFromLoadedContext(
    material?: Material,
  ): { cycleCode: string; courseCycleId: string; courseCode: string } | null {
    const evaluation = material?.materialFolder?.evaluation;
    if (!evaluation) {
      return null;
    }
    const cycleCode = String(
      evaluation.courseCycle?.academicCycle?.code || '',
    ).trim();
    const courseCycleId = String(evaluation.courseCycleId || '').trim();
    const courseCode = String(evaluation.courseCycle?.course?.code || '').trim();
    if (!cycleCode || !courseCycleId || !courseCode) {
      return null;
    }
    return { cycleCode, courseCycleId, courseCode };
  }

  private async getPendingDeletionStatusIdCached(): Promise<string | null> {
    if (this.pendingDeletionStatusIdCache) {
      return this.pendingDeletionStatusIdCache;
    }
    const pendingStatus =
      await this.materialCatalogRepository.findDeletionRequestStatusByCode(
        DELETION_REQUEST_STATUS_CODES.PENDING,
      );
    const id = String(pendingStatus?.id || '').trim();
    if (!id) {
      return null;
    }
    this.pendingDeletionStatusIdCache = id;
    return id;
  }
}

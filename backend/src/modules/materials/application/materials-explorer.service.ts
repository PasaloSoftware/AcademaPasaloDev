import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { getEpoch } from '@common/utils/date.util';
import { technicalSettings } from '@config/technical-settings';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { AccessEngineService } from '@modules/enrollments/application/access-engine.service';
import { ClassEventRepository } from '@modules/events/infrastructure/class-event.repository';
import type { UserWithSession } from '@modules/auth/strategies/jwt.strategy';
import { User } from '@modules/users/domain/user.entity';
import {
  ADMIN_ROLE_CODES,
  ROLE_CODES,
} from '@common/constants/role-codes.constants';
import { MaterialFolder } from '@modules/materials/domain/material-folder.entity';
import { Material } from '@modules/materials/domain/material.entity';
import {
  FOLDER_STATUS_CODES,
  MATERIAL_CACHE_KEYS,
  MATERIAL_STATUS_CODES,
} from '@modules/materials/domain/material.constants';
import { MaterialFolderRepository } from '@modules/materials/infrastructure/material-folder.repository';
import { MaterialRepository } from '@modules/materials/infrastructure/material.repository';
import { MaterialCatalogRepository } from '@modules/materials/infrastructure/material-catalog.repository';
import { CourseCycleProfessorRepository } from '@modules/courses/infrastructure/course-cycle-professor.repository';

@Injectable()
export class MaterialsExplorerService {
  private readonly cacheTtl =
    technicalSettings.cache.materials.materialsExplorerCacheTtlSeconds;

  constructor(
    private readonly accessEngine: AccessEngineService,
    private readonly cacheService: RedisCacheService,
    private readonly folderRepository: MaterialFolderRepository,
    private readonly materialRepository: MaterialRepository,
    private readonly catalogRepository: MaterialCatalogRepository,
    private readonly courseCycleProfessorRepository: CourseCycleProfessorRepository,
    private readonly classEventRepository: ClassEventRepository,
  ) {}

  async getRootFolders(
    user: UserWithSession,
    evaluationId: string,
  ): Promise<MaterialFolder[]> {
    await this.checkAuthorizedAccess(user, evaluationId);

    const cacheKey = MATERIAL_CACHE_KEYS.ROOTS(evaluationId);
    let roots = await this.cacheService.get<MaterialFolder[]>(cacheKey);

    if (!roots) {
      const status = await this.getActiveFolderStatus();
      roots = await this.folderRepository.findRootsByEvaluation(
        evaluationId,
        status.id,
      );
      await this.cacheService.set(cacheKey, roots, this.cacheTtl);
    }

    return this.applyVisibilityFilter(user, roots, []).folders;
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
    const folder = await this.folderRepository.findById(folderId);
    if (!folder) {
      throw new NotFoundException('Carpeta no encontrada');
    }

    await this.checkAuthorizedAccess(user, folder.evaluationId, folder);

    const cacheKey = MATERIAL_CACHE_KEYS.CONTENTS(folderId);
    let contents = await this.cacheService.get<{
      folders: MaterialFolder[];
      materials: Material[];
    }>(cacheKey);

    if (!contents) {
      const status = await this.getActiveFolderStatus();
      const materialStatus = await this.getActiveMaterialStatus();
      const [folders, materials] = await Promise.all([
        this.folderRepository.findSubFolders(folderId, status.id),
        this.materialRepository.findByFolderId(folderId, materialStatus.id),
      ]);
      contents = { folders, materials };
      await this.cacheService.set(cacheKey, contents, this.cacheTtl);
    }

    const visibleContents = this.applyVisibilityFilter(
      user,
      contents.folders,
      contents.materials,
    );

    const materialStatus = await this.getActiveMaterialStatus();
    const isStudent = user.activeRole === ROLE_CODES.STUDENT;
    const now = isStudent ? new Date() : undefined;

    const subfolderMaterialCountRaw =
      await this.materialRepository.countByFolderIds(
        visibleContents.folders.map((item) => item.id),
        materialStatus.id,
        now,
      );

    const subfolderMaterialCount = visibleContents.folders.reduce<
      Record<string, number>
    >((acc, folderItem) => {
      acc[folderItem.id] = subfolderMaterialCountRaw[folderItem.id] ?? 0;
      return acc;
    }, {});

    return {
      folders: visibleContents.folders,
      materials: visibleContents.materials,
      totalMaterials: visibleContents.materials.length,
      subfolderMaterialCount,
    };
  }

  async getClassEventMaterials(
    user: UserWithSession,
    classEventId: string,
  ): Promise<Material[]> {
    const classEvent =
      await this.classEventRepository.findByIdSimple(classEventId);
    if (!classEvent) {
      throw new NotFoundException('Sesión de clase no encontrada');
    }

    await this.checkAuthorizedAccess(user, classEvent.evaluationId);

    const cacheKey = MATERIAL_CACHE_KEYS.CLASS_EVENT(classEventId);
    const cached = await this.cacheService.get<Material[]>(cacheKey);
    if (cached) {
      return this.applyVisibilityFilter(user, [], cached).materials;
    }

    const materialStatus = await this.getActiveMaterialStatus();
    const materials = await this.materialRepository.findByClassEventId(
      classEventId,
      materialStatus.id,
    );
    await this.cacheService.set(cacheKey, materials, this.cacheTtl);

    return this.applyVisibilityFilter(user, [], materials).materials;
  }

  private applyVisibilityFilter(
    user: User | UserWithSession,
    folders: MaterialFolder[],
    materials: Material[],
  ): { folders: MaterialFolder[]; materials: Material[] } {
    const activeRole = (user as UserWithSession).activeRole;
    const isStaff = this.hasAdminAccess(activeRole);
    const isProfessor = this.hasProfessorAccess(activeRole);

    if (isStaff || isProfessor) {
      return { folders, materials };
    }

    const nowTime = getEpoch(new Date());

    const visibleFolders = folders.filter((folder) => {
      const startOk =
        !folder.visibleFrom || getEpoch(folder.visibleFrom) <= nowTime;
      const endOk =
        !folder.visibleUntil || getEpoch(folder.visibleUntil) >= nowTime;
      return startOk && endOk;
    });

    const visibleMaterials = materials.filter((material) => {
      const startOk =
        !material.visibleFrom || getEpoch(material.visibleFrom) <= nowTime;
      const endOk =
        !material.visibleUntil || getEpoch(material.visibleUntil) >= nowTime;
      return startOk && endOk;
    });

    return { folders: visibleFolders, materials: visibleMaterials };
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

  private async getActiveFolderStatus() {
    const status = await this.catalogRepository.findFolderStatusByCode(
      FOLDER_STATUS_CODES.ACTIVE,
    );
    if (!status) {
      throw new InternalServerErrorException(
        `Error de configuracion: Estado ${FOLDER_STATUS_CODES.ACTIVE} de carpeta faltante`,
      );
    }
    return status;
  }

  private async getActiveMaterialStatus() {
    const status = await this.catalogRepository.findMaterialStatusByCode(
      MATERIAL_STATUS_CODES.ACTIVE,
    );
    if (!status) {
      throw new InternalServerErrorException(
        `Error de configuracion: Estado ${MATERIAL_STATUS_CODES.ACTIVE} de material faltante`,
      );
    }
    return status;
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

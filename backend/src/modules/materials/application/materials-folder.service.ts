import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { getEpoch } from '@common/utils/date.util';
import { technicalSettings } from '@config/technical-settings';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { CreateMaterialFolderDto } from '@modules/materials/dto/create-material-folder.dto';
import { CreateFolderTemplateDto } from '@modules/materials/dto/create-folder-template.dto';
import { MaterialFolder } from '@modules/materials/domain/material-folder.entity';
import {
  FOLDER_STATUS_CODES,
  MATERIAL_CACHE_KEYS,
} from '@modules/materials/domain/material.constants';
import { ACCESS_MESSAGES } from '@common/constants/access-messages.constants';
import { MaterialCatalogRepository } from '@modules/materials/infrastructure/material-catalog.repository';
import { MaterialFolderRepository } from '@modules/materials/infrastructure/material-folder.repository';

@Injectable()
export class MaterialsFolderService {
  private readonly maxFolderDepth = technicalSettings.materials.maxFolderDepth;

  constructor(
    private readonly dataSource: DataSource,
    private readonly cacheService: RedisCacheService,
    private readonly folderRepository: MaterialFolderRepository,
    private readonly catalogRepository: MaterialCatalogRepository,
  ) {}

  async createFolder(
    createdById: string,
    dto: CreateMaterialFolderDto,
  ): Promise<MaterialFolder> {
    const activeStatus = await this.getActiveFolderStatus();
    const now = new Date();
    const { visibleFrom, visibleUntil } = this.parseVisibilityRange(
      dto.visibleFrom,
      dto.visibleUntil,
    );

    if (dto.parentFolderId) {
      await this.validateParentFolder(dto.parentFolderId, dto.evaluationId);
    }

    const folder = await this.folderRepository.create({
      evaluationId: dto.evaluationId,
      parentFolderId: dto.parentFolderId || null,
      folderStatusId: activeStatus.id,
      name: dto.name,
      visibleFrom,
      visibleUntil,
      createdById,
      createdAt: now,
      updatedAt: now,
    });

    if (dto.parentFolderId) {
      await this.invalidateFolderCache(dto.parentFolderId);
    } else {
      await this.invalidateRootCache(dto.evaluationId);
    }

    return folder;
  }

  async createFolderTemplate(
    createdById: string,
    dto: CreateFolderTemplateDto,
  ): Promise<{ rootFolder: MaterialFolder; subFolders: MaterialFolder[] }> {
    const activeStatus = await this.getActiveFolderStatus();
    const now = new Date();
    const { visibleFrom, visibleUntil } = this.parseVisibilityRange(
      dto.visibleFrom,
      dto.visibleUntil,
    );

    const rootName = dto.rootName.trim();
    if (!rootName) {
      throw new BadRequestException(
        ACCESS_MESSAGES.MATERIAL_TEMPLATE_EMPTY_ROOT_NAME,
      );
    }

    const normalizedSubfolderNames = dto.subfolderNames.map((name) =>
      name.trim(),
    );
    if (normalizedSubfolderNames.some((name) => !name)) {
      throw new BadRequestException(
        ACCESS_MESSAGES.MATERIAL_TEMPLATE_EMPTY_CHILD_NAME,
      );
    }

    const uniqueSubfolderNames = new Set(
      normalizedSubfolderNames.map((name) => name.toLowerCase()),
    );
    if (uniqueSubfolderNames.size !== normalizedSubfolderNames.length) {
      throw new BadRequestException(
        ACCESS_MESSAGES.MATERIAL_TEMPLATE_DUPLICATE_CHILD_NAME,
      );
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const rootFolder = manager.create(MaterialFolder, {
        evaluationId: dto.evaluationId,
        parentFolderId: null,
        folderStatusId: activeStatus.id,
        name: rootName,
        visibleFrom,
        visibleUntil,
        createdById,
        createdAt: now,
        updatedAt: now,
      });
      const savedRootFolder = await manager.save(rootFolder);

      const subFolders = normalizedSubfolderNames.map((subfolderName) =>
        manager.create(MaterialFolder, {
          evaluationId: dto.evaluationId,
          parentFolderId: savedRootFolder.id,
          folderStatusId: activeStatus.id,
          name: subfolderName,
          visibleFrom,
          visibleUntil,
          createdById,
          createdAt: now,
          updatedAt: now,
        }),
      );
      const savedSubFolders =
        subFolders.length > 0 ? await manager.save(subFolders) : [];

      return {
        rootFolder: savedRootFolder,
        subFolders: savedSubFolders,
      };
    });

    await this.invalidateMaterialStructureCaches(
      dto.evaluationId,
      result.rootFolder.id,
    );

    return result;
  }

  private parseVisibilityRange(
    visibleFrom?: string,
    visibleUntil?: string,
  ): { visibleFrom: Date | null; visibleUntil: Date | null } {
    const startDate = visibleFrom ? new Date(visibleFrom) : null;
    const endDate = visibleUntil ? new Date(visibleUntil) : null;

    if (startDate && endDate && getEpoch(startDate) > getEpoch(endDate)) {
      throw new BadRequestException(
        'Rango de visibilidad invalido: visibleFrom no puede ser mayor que visibleUntil',
      );
    }

    return {
      visibleFrom: startDate,
      visibleUntil: endDate,
    };
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

  private async validateParentFolder(
    parentId: string,
    evaluationId: string,
  ): Promise<MaterialFolder> {
    const parent = await this.resolveParentFolderOrFail(parentId);
    if (parent.evaluationId !== evaluationId) {
      throw new BadRequestException(
        'Inconsistencia: La carpeta padre no pertenece a la misma evaluacion',
      );
    }

    const parentDepth = await this.resolveFolderDepth(parent);
    if (parentDepth >= this.maxFolderDepth) {
      throw new BadRequestException(
        `${ACCESS_MESSAGES.MATERIAL_FOLDER_DEPTH_EXCEEDED} (max=${this.maxFolderDepth})`,
      );
    }

    return parent;
  }

  private async resolveFolderDepth(folder: MaterialFolder): Promise<number> {
    let depth = 1;
    let current = folder;
    const maxTraversalHops = this.maxFolderDepth + 10;

    for (let hop = 0; hop < maxTraversalHops; hop += 1) {
      const parentId = current.parentFolderId;
      if (!parentId) {
        return depth;
      }

      const parent = await this.folderRepository.findById(parentId);
      if (!parent) {
        throw new InternalServerErrorException(
          'Integridad de datos corrupta: cadena de carpetas incompleta',
        );
      }

      depth += 1;
      current = parent;
    }

    throw new InternalServerErrorException(
      'Integridad de datos corrupta: profundidad de carpetas invalida',
    );
  }

  private async resolveParentFolderOrFail(
    parentId: string,
  ): Promise<MaterialFolder> {
    const parent = await this.folderRepository.findById(parentId);
    if (!parent) {
      throw new NotFoundException('Carpeta padre no encontrada');
    }

    return parent;
  }

  private async invalidateFolderCache(folderId: string): Promise<void> {
    await this.cacheService.del(MATERIAL_CACHE_KEYS.CONTENTS(folderId));
  }

  private async invalidateRootCache(evaluationId: string): Promise<void> {
    await this.cacheService.del(MATERIAL_CACHE_KEYS.ROOTS(evaluationId));
  }

  private async invalidateMaterialStructureCaches(
    evaluationId: string,
    rootFolderId: string,
  ): Promise<void> {
    await Promise.all([
      this.invalidateRootCache(evaluationId),
      this.invalidateFolderCache(rootFolderId),
    ]);
  }
}

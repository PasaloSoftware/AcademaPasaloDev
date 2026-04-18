import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditService } from '@modules/audit/application/audit.service';
import {
  AUDIT_ACTION_CODES,
  AUDIT_ENTITY_TYPES,
} from '@modules/audit/interfaces/audit.constants';
import { RequestDeletionDto } from '@modules/materials/dto/request-deletion.dto';
import { MaterialCatalogRepository } from '@modules/materials/infrastructure/material-catalog.repository';
import { DeletionRequestRepository } from '@modules/materials/infrastructure/deletion-request.repository';
import { MaterialFolderRepository } from '@modules/materials/infrastructure/material-folder.repository';
import { MaterialRepository } from '@modules/materials/infrastructure/material.repository';
import { DELETION_REQUEST_STATUS_CODES } from '@modules/materials/domain/material.constants';
import { NotificationsDispatchService } from '@modules/notifications/application/notifications-dispatch.service';

@Injectable()
export class MaterialsDeletionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly catalogRepository: MaterialCatalogRepository,
    private readonly deletionRequestRepository: DeletionRequestRepository,
    private readonly materialRepository: MaterialRepository,
    private readonly folderRepository: MaterialFolderRepository,
    private readonly auditService: AuditService,
    private readonly notificationsDispatchService: NotificationsDispatchService,
  ) {}

  async requestDeletion(
    requestedById: string,
    dto: RequestDeletionDto,
  ): Promise<void> {
    const pendingStatus =
      await this.catalogRepository.findDeletionRequestStatusByCode(
        DELETION_REQUEST_STATUS_CODES.PENDING,
      );
    if (!pendingStatus) {
      throw new InternalServerErrorException(
        `Error de configuracion: Estado ${DELETION_REQUEST_STATUS_CODES.PENDING} faltante`,
      );
    }

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

    const now = new Date();

    let createdRequestId = '';

    await this.dataSource.transaction(async (manager) => {
      const lockRowsRaw: unknown = await manager.query(
        'SELECT id FROM material WHERE id = ? FOR UPDATE',
        [dto.entityId],
      );
      if (!Array.isArray(lockRowsRaw) || lockRowsRaw.length === 0) {
        throw new NotFoundException('Material no encontrado');
      }

      const pendingRequest =
        await this.deletionRequestRepository.findPendingByMaterialId(
          dto.entityId,
          pendingStatus.id,
          manager,
        );
      if (pendingRequest) {
        throw new BadRequestException(
          'Ya existe una solicitud de eliminacion pendiente para este material',
        );
      }

      const created = await this.deletionRequestRepository.create(
        {
          requestedById,
          deletionRequestStatusId: pendingStatus.id,
          entityType: dto.entityType,
          entityId: dto.entityId,
          reason: dto.reason,
          createdAt: now,
          updatedAt: now,
        },
        manager,
      );
      createdRequestId = created.id;

      await this.auditService.logAction(
        requestedById,
        AUDIT_ACTION_CODES.FILE_DELETE_REQUEST,
        manager,
      );
    });

    if (createdRequestId) {
      await this.notificationsDispatchService.dispatchDeletionRequestCreated(
        createdRequestId,
      );
    }
  }
}

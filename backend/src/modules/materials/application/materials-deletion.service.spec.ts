import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MaterialsDeletionService } from './materials-deletion.service';
import { MaterialCatalogRepository } from '../infrastructure/material-catalog.repository';
import { DeletionRequestRepository } from '../infrastructure/deletion-request.repository';
import { MaterialRepository } from '../infrastructure/material.repository';
import { MaterialFolderRepository } from '../infrastructure/material-folder.repository';
import { AuditService } from '@modules/audit/application/audit.service';
import { NotificationsDispatchService } from '@modules/notifications/application/notifications-dispatch.service';
import { Material } from '../domain/material.entity';
import { DeletionRequest } from '../domain/deletion-request.entity';
import { DELETION_REQUEST_STATUS_CODES } from '../domain/material.constants';
import { AUDIT_ENTITY_TYPES } from '@modules/audit/interfaces/audit.constants';

describe('MaterialsDeletionService', () => {
  let service: MaterialsDeletionService;
  let dataSource: jest.Mocked<DataSource>;
  let catalogRepo: jest.Mocked<MaterialCatalogRepository>;
  let deletionRequestRepo: jest.Mocked<DeletionRequestRepository>;
  let materialRepo: jest.Mocked<MaterialRepository>;
  let folderRepo: jest.Mocked<MaterialFolderRepository>;
  let auditService: jest.Mocked<AuditService>;
  let notificationsDispatch: jest.Mocked<NotificationsDispatchService>;

  const mockPendingStatus = { id: 'status-pending' };
  const mockMaterial = { id: 'mat-1', materialFolderId: 'folder-1' } as Material;
  const mockFolder = { id: 'folder-1' };
  const mockCreatedRequest = { id: 'req-new' } as DeletionRequest;

  const validDto = {
    entityType: AUDIT_ENTITY_TYPES.MATERIAL,
    entityId: 'mat-1',
    reason: 'Quiero borrarlo',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialsDeletionService,
        { provide: DataSource, useValue: { transaction: jest.fn() } },
        {
          provide: MaterialCatalogRepository,
          useValue: { findDeletionRequestStatusByCode: jest.fn() },
        },
        {
          provide: DeletionRequestRepository,
          useValue: {
            findPendingByMaterialId: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: MaterialRepository,
          useValue: { findById: jest.fn() },
        },
        {
          provide: MaterialFolderRepository,
          useValue: { findById: jest.fn() },
        },
        { provide: AuditService, useValue: { logAction: jest.fn() } },
        {
          provide: NotificationsDispatchService,
          useValue: { dispatchDeletionRequestCreated: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(MaterialsDeletionService);
    dataSource = module.get(DataSource);
    catalogRepo = module.get(MaterialCatalogRepository);
    deletionRequestRepo = module.get(DeletionRequestRepository);
    materialRepo = module.get(MaterialRepository);
    folderRepo = module.get(MaterialFolderRepository);
    auditService = module.get(AuditService);
    notificationsDispatch = module.get(NotificationsDispatchService);
  });

  function setupHappyPath(): void {
    catalogRepo.findDeletionRequestStatusByCode.mockResolvedValue(
      mockPendingStatus as any,
    );
    materialRepo.findById.mockResolvedValue(mockMaterial);
    folderRepo.findById.mockResolvedValue(mockFolder as any);

    dataSource.transaction.mockImplementation(async (cb: any) => {
      const manager = {
        query: jest.fn().mockResolvedValue([{ id: 'mat-1' }]), // SELECT ... FOR UPDATE
      } as any;
      deletionRequestRepo.findPendingByMaterialId.mockResolvedValue(null);
      deletionRequestRepo.create.mockResolvedValue(mockCreatedRequest);
      auditService.logAction.mockResolvedValue(undefined);
      return cb(manager);
    });
  }

  describe('requestDeletion', () => {
    it('flujo feliz: crea solicitud y despacha notificacion a admins', async () => {
      setupHappyPath();

      await service.requestDeletion('prof-1', validDto);

      expect(deletionRequestRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requestedById: 'prof-1',
          deletionRequestStatusId: mockPendingStatus.id,
          entityType: AUDIT_ENTITY_TYPES.MATERIAL,
          entityId: 'mat-1',
          reason: 'Quiero borrarlo',
        }),
        expect.anything(),
      );
      expect(notificationsDispatch.dispatchDeletionRequestCreated).toHaveBeenCalledWith(
        'req-new',
      );
    });

    it('lanza InternalServerErrorException cuando falta estado PENDING en catalogo', async () => {
      catalogRepo.findDeletionRequestStatusByCode.mockResolvedValue(null);

      await expect(
        service.requestDeletion('prof-1', validDto),
      ).rejects.toThrow(InternalServerErrorException);

      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(notificationsDispatch.dispatchDeletionRequestCreated).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException cuando entityType no es MATERIAL', async () => {
      catalogRepo.findDeletionRequestStatusByCode.mockResolvedValue(
        mockPendingStatus as any,
      );

      await expect(
        service.requestDeletion('prof-1', {
          entityType: 'material_folder',
          entityId: 'folder-1',
          reason: 'test',
        } as any),
      ).rejects.toThrow(BadRequestException);

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException cuando el material no existe', async () => {
      catalogRepo.findDeletionRequestStatusByCode.mockResolvedValue(
        mockPendingStatus as any,
      );
      materialRepo.findById.mockResolvedValue(null);

      await expect(
        service.requestDeletion('prof-1', validDto),
      ).rejects.toThrow(NotFoundException);

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('lanza InternalServerErrorException cuando el material no tiene carpeta contenedora', async () => {
      catalogRepo.findDeletionRequestStatusByCode.mockResolvedValue(
        mockPendingStatus as any,
      );
      materialRepo.findById.mockResolvedValue(mockMaterial);
      folderRepo.findById.mockResolvedValue(null);

      await expect(
        service.requestDeletion('prof-1', validDto),
      ).rejects.toThrow(InternalServerErrorException);

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException (409) cuando ya existe una solicitud pendiente para el material', async () => {
      catalogRepo.findDeletionRequestStatusByCode.mockResolvedValue(
        mockPendingStatus as any,
      );
      materialRepo.findById.mockResolvedValue(mockMaterial);
      folderRepo.findById.mockResolvedValue(mockFolder as any);

      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          query: jest.fn().mockResolvedValue([{ id: 'mat-1' }]),
        } as any;
        deletionRequestRepo.findPendingByMaterialId.mockResolvedValue({
          id: 'req-existing',
        } as DeletionRequest);
        return cb(manager);
      });

      await expect(
        service.requestDeletion('prof-1', validDto),
      ).rejects.toThrow('pendiente');

      expect(notificationsDispatch.dispatchDeletionRequestCreated).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException cuando el material desaparece durante el lock (race condition)', async () => {
      catalogRepo.findDeletionRequestStatusByCode.mockResolvedValue(
        mockPendingStatus as any,
      );
      materialRepo.findById.mockResolvedValue(mockMaterial);
      folderRepo.findById.mockResolvedValue(mockFolder as any);

      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          // SELECT ... FOR UPDATE returns empty (material deleted between check and lock)
          query: jest.fn().mockResolvedValue([]),
        } as any;
        return cb(manager);
      });

      await expect(
        service.requestDeletion('prof-1', validDto),
      ).rejects.toThrow(NotFoundException);

      expect(notificationsDispatch.dispatchDeletionRequestCreated).not.toHaveBeenCalled();
    });

    it('no despacha notificacion si la transaccion falla (createdRequestId queda vacio)', async () => {
      catalogRepo.findDeletionRequestStatusByCode.mockResolvedValue(
        mockPendingStatus as any,
      );
      materialRepo.findById.mockResolvedValue(mockMaterial);
      folderRepo.findById.mockResolvedValue(mockFolder as any);

      dataSource.transaction.mockRejectedValue(new Error('DB error'));

      await expect(
        service.requestDeletion('prof-1', validDto),
      ).rejects.toThrow('DB error');

      expect(notificationsDispatch.dispatchDeletionRequestCreated).not.toHaveBeenCalled();
    });

    it('registra auditoria con la accion FILE_DELETE_REQUEST dentro de la transaccion', async () => {
      setupHappyPath();

      await service.requestDeletion('prof-1', validDto);

      expect(auditService.logAction).toHaveBeenCalledWith(
        'prof-1',
        'FILE_DELETE_REQUEST',
        expect.anything(),
      );
    });
  });
});

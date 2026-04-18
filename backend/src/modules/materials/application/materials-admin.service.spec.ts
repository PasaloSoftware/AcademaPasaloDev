import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { MaterialsAdminService } from './materials-admin.service';
import { DeletionRequestRepository } from '../infrastructure/deletion-request.repository';
import { MaterialRepository } from '../infrastructure/material.repository';
import { MaterialCatalogRepository } from '../infrastructure/material-catalog.repository';
import { StorageService } from '@infrastructure/storage/storage.service';
import { AuditService } from '@modules/audit/application/audit.service';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { NotificationsDispatchService } from '@modules/notifications/application/notifications-dispatch.service';
import { Material } from '../domain/material.entity';
import { MaterialVersion } from '../domain/material-version.entity';
import { FileResource } from '../domain/file-resource.entity';
import { DeletionRequest } from '../domain/deletion-request.entity';
import { DeletionReviewAction } from '../dto/review-deletion-request.dto';
import {
  DELETION_REQUEST_STATUS_CODES,
  MATERIAL_STATUS_CODES,
} from '../domain/material.constants';
import { AUDIT_ACTION_CODES } from '@modules/audit/interfaces/audit.constants';
import { AUDIT_ENTITY_TYPES } from '@modules/audit/interfaces/audit.constants';

// ─── helpers ───────────────────────────────────────────────────────────────

function makeMaterial(overrides: Partial<Material> = {}): Material {
  return {
    id: 'mat-1',
    materialFolderId: 'folder-1',
    classEventId: 'event-1',
    materialStatusId: 'status-active',
    fileResourceId: 'res-1',
    fileVersionId: 'ver-1',
    fileResource: null,
    materialFolder: null,
    ...overrides,
  } as unknown as Material;
}

function makeVersion(
  id: string,
  materialId: string,
  fileResourceId: string,
): MaterialVersion {
  return { id, materialId, fileResourceId } as MaterialVersion;
}

function makeFileResource(
  id: string,
  storageProvider = 'GDRIVE',
  storageKey = `file-${id}`,
): FileResource {
  return {
    id,
    storageProvider,
    storageKey,
    storageUrl: null,
  } as unknown as FileResource;
}

// ─── manager factory for deleteAllVersions=true ────────────────────────────

function makeDirectDeleteManager(opts: {
  versions?: MaterialVersion[];
  versionGcRefs?: Record<string, number>;
  materialGcRefs?: Record<string, number>;
  fileResources?: FileResource[];
}): EntityManager {
  const versions = opts.versions ?? [makeVersion('ver-1', 'mat-1', 'res-1')];
  const versionGcRefs = opts.versionGcRefs ?? {};
  const materialGcRefs = opts.materialGcRefs ?? {};
  const fileResources =
    opts.fileResources ?? [makeFileResource('res-1', 'GDRIVE', 'file-key-1')];

  const manager = {
    find: jest.fn().mockImplementation((entity: unknown) => {
      if (entity === MaterialVersion) return Promise.resolve(versions);
      if (entity === FileResource) return Promise.resolve(fileResources);
      return Promise.resolve([]);
    }),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    query: jest.fn().mockImplementation((sql: string) => {
      if (sql.startsWith('DELETE FROM deletion_request')) {
        return Promise.resolve({ affectedRows: 1 });
      }
      if (sql.includes('FROM material_version')) {
        const rows = Object.entries(versionGcRefs).map(([id, cnt]) => ({
          fileResourceId: id,
          cnt: String(cnt),
        }));
        return Promise.resolve(rows);
      }
      if (sql.includes('FROM material')) {
        const rows = Object.entries(materialGcRefs).map(([id, cnt]) => ({
          fileResourceId: id,
          cnt: String(cnt),
        }));
        return Promise.resolve(rows);
      }
      return Promise.resolve([]);
    }),
  } as unknown as EntityManager;

  return manager;
}

// ─── suite ────────────────────────────────────────────────────────────────

describe('MaterialsAdminService', () => {
  let service: MaterialsAdminService;
  let dataSource: jest.Mocked<DataSource>;
  let materialRepo: jest.Mocked<MaterialRepository>;
  let requestRepo: jest.Mocked<DeletionRequestRepository>;
  let catalogRepo: jest.Mocked<MaterialCatalogRepository>;
  let cacheService: jest.Mocked<RedisCacheService>;
  let storageService: jest.Mocked<StorageService>;
  let auditService: jest.Mocked<AuditService>;
  let notificationsDispatch: jest.Mocked<NotificationsDispatchService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialsAdminService,
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
            getRepository: jest.fn(),
          },
        },
        {
          provide: DeletionRequestRepository,
          useValue: {
            findById: jest.fn(),
            findPendingByMaterialId: jest.fn(),
          },
        },
        {
          provide: MaterialRepository,
          useValue: {
            findById: jest.fn(),
            findAdminMaterialFilesPage: jest.fn(),
          },
        },
        {
          provide: MaterialCatalogRepository,
          useValue: {
            findDeletionRequestStatusByCode: jest.fn(),
            findMaterialStatusByCode: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            deleteFile: jest.fn(),
            moveFileToEvaluationArchived: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: { logAction: jest.fn() },
        },
        {
          provide: RedisCacheService,
          useValue: {
            del: jest.fn(),
            invalidateIndex: jest.fn(),
          },
        },
        {
          provide: NotificationsDispatchService,
          useValue: {
            dispatchDeletionRequestApproved: jest
              .fn()
              .mockResolvedValue(undefined),
            dispatchDeletionRequestRejected: jest
              .fn()
              .mockResolvedValue(undefined),
            dispatchDeletionRequestCreated: jest
              .fn()
              .mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<MaterialsAdminService>(MaterialsAdminService);
    dataSource = module.get(DataSource);
    materialRepo = module.get(MaterialRepository);
    requestRepo = module.get(DeletionRequestRepository);
    catalogRepo = module.get(MaterialCatalogRepository);
    cacheService = module.get(RedisCacheService);
    storageService = module.get(StorageService);
    auditService = module.get(AuditService);
    notificationsDispatch = module.get(NotificationsDispatchService);
  });

  // ─── directDeleteMaterial ────────────────────────────────────────────────

  describe('directDeleteMaterial', () => {
    it('lanza NotFoundException cuando el material no existe', async () => {
      materialRepo.findById.mockResolvedValue(null);

      await expect(
        service.directDeleteMaterial('admin-1', 'mat-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('flujo feliz sin solicitud pendiente: borra material, versiones y archivo huerfano', async () => {
      materialRepo.findById.mockResolvedValue(makeMaterial());
      catalogRepo.findDeletionRequestStatusByCode.mockResolvedValue({
        id: 'status-pending',
      } as any);
      requestRepo.findPendingByMaterialId.mockResolvedValue(null);

      const manager = makeDirectDeleteManager({});
      dataSource.transaction.mockImplementation(async (cb: any) => cb(manager));

      await service.directDeleteMaterial('admin-1', 'mat-1', 'razon de prueba');

      expect(manager.update).toHaveBeenCalledWith(
        Material,
        'mat-1',
        expect.objectContaining({ fileVersionId: null }),
      );
      expect(manager.delete).toHaveBeenCalledWith(MaterialVersion, {
        materialId: 'mat-1',
      });
      expect(manager.delete).toHaveBeenCalledWith(Material, 'mat-1');
      expect(auditService.logAction).toHaveBeenCalledWith(
        'admin-1',
        AUDIT_ACTION_CODES.FILE_DELETE,
        manager,
      );
      expect(storageService.deleteFile).toHaveBeenCalledWith(
        'file-key-1',
        'GDRIVE',
        null,
      );
      expect(cacheService.del).toHaveBeenCalledWith(
        'cache:materials:contents:folder:folder-1',
      );
      expect(notificationsDispatch.dispatchDeletionRequestApproved).not.toHaveBeenCalled();
    });

    it('limpia filas de deletion_request sin excepcion cuando no hay pendiente', async () => {
      materialRepo.findById.mockResolvedValue(makeMaterial());
      catalogRepo.findDeletionRequestStatusByCode.mockResolvedValue({
        id: 'status-pending',
      } as any);
      requestRepo.findPendingByMaterialId.mockResolvedValue(null);

      const manager = makeDirectDeleteManager({});
      dataSource.transaction.mockImplementation(async (cb: any) => cb(manager));

      await service.directDeleteMaterial('admin-1', 'mat-1');

      const cleanupCall = (manager.query as jest.Mock).mock.calls.find(
        (call: unknown[]) =>
          typeof call[0] === 'string' &&
          (call[0] as string).startsWith('DELETE FROM deletion_request'),
      );
      expect(cleanupCall).toBeDefined();
      // Sin pendiente, no debe haber cláusula AND id != ?
      expect(cleanupCall![0]).not.toContain('AND id !=');
      expect(cleanupCall![1]).toEqual([AUDIT_ENTITY_TYPES.MATERIAL, 'mat-1']);
    });

    it('auto-aprueba solicitud pendiente, conserva su fila y notifica al profesor', async () => {
      materialRepo.findById.mockResolvedValue(makeMaterial());
      catalogRepo.findDeletionRequestStatusByCode
        .mockResolvedValueOnce({ id: 'status-pending' } as any)
        .mockResolvedValueOnce({ id: 'status-approved' } as any);
      requestRepo.findPendingByMaterialId.mockResolvedValue({
        id: 'req-1',
        deletionRequestStatusId: 'status-pending',
      } as DeletionRequest);

      const manager = makeDirectDeleteManager({});
      dataSource.transaction.mockImplementation(async (cb: any) => cb(manager));

      await service.directDeleteMaterial('admin-1', 'mat-1');

      // DeletionRequest actualizada a APPROVED
      expect(manager.update).toHaveBeenCalledWith(
        DeletionRequest,
        { id: 'req-1', deletionRequestStatusId: 'status-pending' },
        expect.objectContaining({
          deletionRequestStatusId: 'status-approved',
          reviewedById: 'admin-1',
          reviewComment: 'Eliminación directa por administrador',
        }),
      );

      // Limpieza excluye la fila auto-aprobada
      const cleanupCall = (manager.query as jest.Mock).mock.calls.find(
        (call: unknown[]) =>
          typeof call[0] === 'string' &&
          (call[0] as string).startsWith('DELETE FROM deletion_request'),
      );
      expect(cleanupCall).toBeDefined();
      expect(cleanupCall![0]).toContain('AND id !=');
      expect(cleanupCall![1]).toEqual([
        AUDIT_ENTITY_TYPES.MATERIAL,
        'mat-1',
        'req-1',
      ]);

      // Notificación al profesor
      expect(
        notificationsDispatch.dispatchDeletionRequestApproved,
      ).toHaveBeenCalledWith('req-1');
    });

    it('lanza InternalServerErrorException si hay solicitud pendiente pero falta estado APPROVED en catalogo', async () => {
      materialRepo.findById.mockResolvedValue(makeMaterial());
      catalogRepo.findDeletionRequestStatusByCode
        .mockResolvedValueOnce({ id: 'status-pending' } as any)
        .mockResolvedValueOnce(null); // APPROVED no existe
      requestRepo.findPendingByMaterialId.mockResolvedValue({
        id: 'req-1',
        deletionRequestStatusId: 'status-pending',
      } as DeletionRequest);

      await expect(
        service.directDeleteMaterial('admin-1', 'mat-1'),
      ).rejects.toThrow(InternalServerErrorException);

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('no borra el archivo fisico cuando file_resource esta compartido con otro material', async () => {
      materialRepo.findById.mockResolvedValue(makeMaterial());
      catalogRepo.findDeletionRequestStatusByCode.mockResolvedValue({
        id: 'status-pending',
      } as any);
      requestRepo.findPendingByMaterialId.mockResolvedValue(null);

      // material refs devuelve 1 → el file_resource aun esta en uso
      const manager = makeDirectDeleteManager({
        materialGcRefs: { 'res-1': 1 },
      });
      dataSource.transaction.mockImplementation(async (cb: any) => cb(manager));

      await service.directDeleteMaterial('admin-1', 'mat-1');

      expect(storageService.deleteFile).not.toHaveBeenCalled();
    });

    it('no borra el archivo fisico cuando file_resource tiene referencias en material_version de otros materiales', async () => {
      materialRepo.findById.mockResolvedValue(makeMaterial());
      catalogRepo.findDeletionRequestStatusByCode.mockResolvedValue({
        id: 'status-pending',
      } as any);
      requestRepo.findPendingByMaterialId.mockResolvedValue(null);

      // version refs devuelve 2 → compartido
      const manager = makeDirectDeleteManager({
        versionGcRefs: { 'res-1': 2 },
      });
      dataSource.transaction.mockImplementation(async (cb: any) => cb(manager));

      await service.directDeleteMaterial('admin-1', 'mat-1');

      expect(storageService.deleteFile).not.toHaveBeenCalled();
    });

    it('deduplica file_resource_ids cuando multiples versiones comparten el mismo archivo', async () => {
      materialRepo.findById.mockResolvedValue(makeMaterial({ fileResourceId: 'res-shared' }));
      catalogRepo.findDeletionRequestStatusByCode.mockResolvedValue({
        id: 'status-pending',
      } as any);
      requestRepo.findPendingByMaterialId.mockResolvedValue(null);

      // Tres versiones, todas con el mismo file_resource
      const sharedVersions = [
        makeVersion('ver-1', 'mat-1', 'res-shared'),
        makeVersion('ver-2', 'mat-1', 'res-shared'),
        makeVersion('ver-3', 'mat-1', 'res-shared'),
      ];
      const manager = makeDirectDeleteManager({
        versions: sharedVersions,
        fileResources: [makeFileResource('res-shared', 'GDRIVE', 'key-shared')],
      });
      dataSource.transaction.mockImplementation(async (cb: any) => cb(manager));

      await service.directDeleteMaterial('admin-1', 'mat-1');

      // La query GC de material_version debe recibir solo un id único
      const gcVersionCall = (manager.query as jest.Mock).mock.calls.find(
        (call: unknown[]) =>
          typeof call[0] === 'string' &&
          (call[0] as string).includes('FROM material_version'),
      );
      expect(gcVersionCall![1]).toEqual(['res-shared']);

      expect(storageService.deleteFile).toHaveBeenCalledTimes(1);
    });

    it('material sin versiones: borra material y realiza GC solo con fileResourceId del material', async () => {
      materialRepo.findById.mockResolvedValue(makeMaterial({ fileResourceId: 'res-1' }));
      catalogRepo.findDeletionRequestStatusByCode.mockResolvedValue({
        id: 'status-pending',
      } as any);
      requestRepo.findPendingByMaterialId.mockResolvedValue(null);

      const manager = makeDirectDeleteManager({ versions: [] });
      dataSource.transaction.mockImplementation(async (cb: any) => cb(manager));

      await service.directDeleteMaterial('admin-1', 'mat-1');

      expect(manager.delete).not.toHaveBeenCalledWith(MaterialVersion, {
        materialId: 'mat-1',
      });
      expect(manager.delete).toHaveBeenCalledWith(Material, 'mat-1');
      expect(storageService.deleteFile).toHaveBeenCalledTimes(1);
    });

    it('invalida cache de clase cuando material tiene classEventId', async () => {
      materialRepo.findById.mockResolvedValue(makeMaterial({ classEventId: 'event-99' }));
      catalogRepo.findDeletionRequestStatusByCode.mockResolvedValue({
        id: 'status-pending',
      } as any);
      requestRepo.findPendingByMaterialId.mockResolvedValue(null);

      const manager = makeDirectDeleteManager({});
      dataSource.transaction.mockImplementation(async (cb: any) => cb(manager));

      await service.directDeleteMaterial('admin-1', 'mat-1');

      expect(cacheService.del).toHaveBeenCalledWith(
        'cache:materials:class-event:event-99',
      );
    });

    it('no llama a storageService.deleteFile cuando no existen fileResources huerfanos', async () => {
      materialRepo.findById.mockResolvedValue(makeMaterial());
      catalogRepo.findDeletionRequestStatusByCode.mockResolvedValue({
        id: 'status-pending',
      } as any);
      requestRepo.findPendingByMaterialId.mockResolvedValue(null);

      // manager.find para FileResource retorna vacio (todos siguen referenciados)
      const manager = makeDirectDeleteManager({
        versionGcRefs: { 'res-1': 1 },
        fileResources: [],
      });
      dataSource.transaction.mockImplementation(async (cb: any) => cb(manager));

      await service.directDeleteMaterial('admin-1', 'mat-1');

      expect(storageService.deleteFile).not.toHaveBeenCalled();
    });
  });

  // ─── hardDeleteMaterial ──────────────────────────────────────────────────

  describe('hardDeleteMaterial', () => {
    it('invalida cache tras eliminacion fisica (camino ya cubierto)', async () => {
      materialRepo.findById.mockResolvedValue(
        makeMaterial({ materialStatusId: 'status-archived' }),
      );
      catalogRepo.findMaterialStatusByCode.mockResolvedValue({
        id: 'status-archived',
      } as any);

      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest
            .fn()
            .mockResolvedValueOnce(
              makeMaterial({
                fileVersionId: 'ver-1',
                fileVersion: { id: 'ver-1', fileResourceId: 'res-1' },
              }),
            )
            .mockResolvedValueOnce(null) // previous version = null → borra material
            .mockResolvedValueOnce(makeFileResource('res-1', 'GDRIVE', 'file-123')),
          update: jest.fn().mockResolvedValue({}),
          delete: jest.fn().mockResolvedValue({}),
          count: jest.fn().mockResolvedValue(0),
          query: jest.fn().mockResolvedValue({ affectedRows: 1 }),
        } as any;
        return cb(manager);
      });

      await service.hardDeleteMaterial('admin-1', 'mat-1');

      expect(storageService.deleteFile).toHaveBeenCalledWith(
        'file-123',
        'GDRIVE',
        null,
      );
      expect(cacheService.del).toHaveBeenCalledWith(
        'cache:materials:contents:folder:folder-1',
      );
    });

    it('rechaza hard delete cuando el material no esta ARCHIVADO', async () => {
      materialRepo.findById.mockResolvedValue(makeMaterial({ materialStatusId: 'status-active' }));
      catalogRepo.findMaterialStatusByCode.mockResolvedValue({
        id: 'status-archived',
      } as any);

      await expect(
        service.hardDeleteMaterial('admin-1', 'mat-1'),
      ).rejects.toThrow('ARCHIVADOS');
    });

    it('limpia filas de deletion_request cuando se elimina el material por completo (sin version previa)', async () => {
      materialRepo.findById.mockResolvedValue(
        makeMaterial({ materialStatusId: 'status-archived' }),
      );
      catalogRepo.findMaterialStatusByCode.mockResolvedValue({
        id: 'status-archived',
      } as any);

      let capturedManager: any;
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest
            .fn()
            .mockResolvedValueOnce(
              makeMaterial({
                fileVersionId: 'ver-1',
                fileVersion: { id: 'ver-1', fileResourceId: 'res-1' },
              }),
            )
            .mockResolvedValueOnce(null) // no previous version
            .mockResolvedValueOnce(null), // FileResource GC: not found (already cleaned)
          update: jest.fn().mockResolvedValue({}),
          delete: jest.fn().mockResolvedValue({}),
          count: jest.fn().mockResolvedValue(0),
          query: jest.fn().mockResolvedValue({ affectedRows: 1 }),
        } as any;
        capturedManager = manager;
        return cb(manager);
      });

      await service.hardDeleteMaterial('admin-1', 'mat-1');

      const cleanupCall = (capturedManager.query as jest.Mock).mock.calls.find(
        (call: unknown[]) =>
          typeof call[0] === 'string' &&
          (call[0] as string).startsWith('DELETE FROM deletion_request'),
      );
      expect(cleanupCall).toBeDefined();
      expect(cleanupCall![1]).toEqual([AUDIT_ENTITY_TYPES.MATERIAL, 'mat-1']);
    });

    it('NO limpia deletion_request cuando el material hace rollback a version anterior (material no se borra)', async () => {
      materialRepo.findById.mockResolvedValue(
        makeMaterial({ materialStatusId: 'status-archived' }),
      );
      catalogRepo.findMaterialStatusByCode.mockResolvedValue({
        id: 'status-archived',
      } as any);

      let capturedManager: any;
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest
            .fn()
            .mockResolvedValueOnce(
              makeMaterial({
                fileVersionId: 'ver-2',
                fileVersion: { id: 'ver-2', fileResourceId: 'res-2' },
              }),
            )
            .mockResolvedValueOnce(makeVersion('ver-1', 'mat-1', 'res-1')) // previous version exists
            .mockResolvedValueOnce(null), // FileResource GC
          update: jest.fn().mockResolvedValue({}),
          delete: jest.fn().mockResolvedValue({}),
          count: jest.fn().mockResolvedValue(0),
          query: jest.fn().mockResolvedValue({ affectedRows: 0 }),
        } as any;
        capturedManager = manager;
        return cb(manager);
      });

      await service.hardDeleteMaterial('admin-1', 'mat-1');

      // Material NO se borra (hay version previa)
      expect(capturedManager.delete).not.toHaveBeenCalledWith(Material, 'mat-1');

      // deletion_request NO se limpia
      const cleanupCall = (capturedManager.query as jest.Mock).mock.calls.find(
        (call: unknown[]) =>
          typeof call[0] === 'string' &&
          (call[0] as string).startsWith('DELETE FROM deletion_request'),
      );
      expect(cleanupCall).toBeUndefined();
    });

    it('no borra archivo fisico si file_resource tiene referencias remanentes', async () => {
      materialRepo.findById.mockResolvedValue(
        makeMaterial({ materialStatusId: 'status-archived' }),
      );
      catalogRepo.findMaterialStatusByCode.mockResolvedValue({
        id: 'status-archived',
      } as any);

      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest
            .fn()
            .mockResolvedValueOnce(
              makeMaterial({
                fileVersionId: 'ver-1',
                fileVersion: { id: 'ver-1', fileResourceId: 'res-1' },
              }),
            )
            .mockResolvedValueOnce(null),
          update: jest.fn().mockResolvedValue({}),
          delete: jest.fn().mockResolvedValue({}),
          count: jest.fn().mockResolvedValueOnce(3), // version refs > 0
          query: jest.fn().mockResolvedValue({ affectedRows: 1 }),
        } as any;
        return cb(manager);
      });

      await service.hardDeleteMaterial('admin-1', 'mat-1');

      expect(storageService.deleteFile).not.toHaveBeenCalled();
    });
  });

  // ─── reviewRequest — Approval ────────────────────────────────────────────

  describe('reviewRequest - APPROVE', () => {
    const mockRequest = {
      id: 'req-1',
      entityId: 'mat-1',
      entityType: 'material',
      deletionRequestStatusId: 'status-pending',
    } as DeletionRequest;

    beforeEach(() => {
      catalogRepo.findDeletionRequestStatusByCode.mockImplementation(
        async (code) => {
          if (code === DELETION_REQUEST_STATUS_CODES.PENDING)
            return { id: 'status-pending' } as any;
          if (code === DELETION_REQUEST_STATUS_CODES.APPROVED)
            return { id: 'status-approved' } as any;
          return null;
        },
      );
      catalogRepo.findMaterialStatusByCode.mockResolvedValue({
        id: 'status-archived',
      } as any);
      materialRepo.findById.mockResolvedValue(makeMaterial());
    });

    it('invalida cache al aprobar', async () => {
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue(mockRequest),
          update: jest.fn().mockResolvedValue({}),
        } as any;
        return cb(manager);
      });

      await service.reviewRequest('admin-1', 'req-1', {
        action: DeletionReviewAction.APPROVE,
      });

      expect(cacheService.del).toHaveBeenCalledWith(
        'cache:materials:contents:folder:folder-1',
      );
      expect(cacheService.del).toHaveBeenCalledWith(
        'cache:materials:class-event:event-1',
      );
    });

    it('lanza cuando la solicitud ya fue revisada', async () => {
      catalogRepo.findDeletionRequestStatusByCode.mockResolvedValue({
        id: 'status-pending',
      } as any);
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue({
            ...mockRequest,
            deletionRequestStatusId: 'status-approved',
          }),
        } as any;
        return cb(manager);
      });

      await expect(
        service.reviewRequest('admin-1', 'req-1', {
          action: DeletionReviewAction.APPROVE,
        }),
      ).rejects.toThrow('ya fue revisada');
    });

    it('lanza cuando el entityType no es material', async () => {
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue({
            ...mockRequest,
            entityType: 'material_folder',
          }),
        } as any;
        return cb(manager);
      });

      await expect(
        service.reviewRequest('admin-1', 'req-1', {
          action: DeletionReviewAction.APPROVE,
        }),
      ).rejects.toThrow('solo se admiten materiales');
    });

    it('despacha notificacion APPROVED tras aprobacion exitosa', async () => {
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue(mockRequest),
          update: jest.fn().mockResolvedValue({}),
        } as any;
        return cb(manager);
      });

      await service.reviewRequest('admin-1', 'req-1', {
        action: DeletionReviewAction.APPROVE,
      });

      expect(
        notificationsDispatch.dispatchDeletionRequestApproved,
      ).toHaveBeenCalledWith('req-1');
      expect(
        notificationsDispatch.dispatchDeletionRequestRejected,
      ).not.toHaveBeenCalled();
    });

    it('intenta mover archivo a archivado en Drive cuando material tiene fileResource y driveAccess', async () => {
      const materialWithFile = makeMaterial({
        fileResource: makeFileResource('res-1', 'GDRIVE', 'drive-key-1'),
        materialFolder: { evaluationId: 'eval-1' } as any,
      });
      materialRepo.findById.mockResolvedValue(materialWithFile);

      const mockDriveAccessRepo = {
        findOne: jest.fn().mockResolvedValue({
          evaluationId: 'eval-1',
          driveArchivedFolderId: 'archived-folder-id',
        }),
      };
      (dataSource.getRepository as jest.Mock).mockReturnValue(mockDriveAccessRepo);

      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue(mockRequest),
          update: jest.fn().mockResolvedValue({}),
        } as any;
        return cb(manager);
      });

      await service.reviewRequest('admin-1', 'req-1', {
        action: DeletionReviewAction.APPROVE,
      });

      expect(storageService.moveFileToEvaluationArchived).toHaveBeenCalledWith(
        'drive-key-1',
        'GDRIVE',
        'archived-folder-id',
      );
    });

    it('omite movimiento a archivado cuando el material no tiene fileResource', async () => {
      const materialNoFile = makeMaterial({ fileResource: null });
      materialRepo.findById.mockResolvedValue(materialNoFile);

      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue(mockRequest),
          update: jest.fn().mockResolvedValue({}),
        } as any;
        return cb(manager);
      });

      await service.reviewRequest('admin-1', 'req-1', {
        action: DeletionReviewAction.APPROVE,
      });

      expect(storageService.moveFileToEvaluationArchived).not.toHaveBeenCalled();
    });

    it('omite movimiento a archivado cuando no hay carpeta archivado en Drive (driveArchivedFolderId nulo)', async () => {
      const materialWithFile = makeMaterial({
        fileResource: makeFileResource('res-1'),
        materialFolder: { evaluationId: 'eval-1' } as any,
      });
      materialRepo.findById.mockResolvedValue(materialWithFile);

      const mockDriveAccessRepo = {
        findOne: jest.fn().mockResolvedValue({ driveArchivedFolderId: null }),
      };
      (dataSource.getRepository as jest.Mock).mockReturnValue(mockDriveAccessRepo);

      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue(mockRequest),
          update: jest.fn().mockResolvedValue({}),
        } as any;
        return cb(manager);
      });

      await service.reviewRequest('admin-1', 'req-1', {
        action: DeletionReviewAction.APPROVE,
      });

      expect(storageService.moveFileToEvaluationArchived).not.toHaveBeenCalled();
    });

    it('tolera fallo en movimiento a Drive: no lanza excepcion, sigue con el flujo', async () => {
      const materialWithFile = makeMaterial({
        fileResource: makeFileResource('res-1', 'GDRIVE', 'drive-key-1'),
        materialFolder: { evaluationId: 'eval-1' } as any,
      });
      materialRepo.findById.mockResolvedValue(materialWithFile);

      const mockDriveAccessRepo = {
        findOne: jest.fn().mockResolvedValue({
          driveArchivedFolderId: 'archived-folder-id',
        }),
      };
      (dataSource.getRepository as jest.Mock).mockReturnValue(mockDriveAccessRepo);
      storageService.moveFileToEvaluationArchived.mockRejectedValue(
        new Error('Drive API error'),
      );

      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue(mockRequest),
          update: jest.fn().mockResolvedValue({}),
        } as any;
        return cb(manager);
      });

      await expect(
        service.reviewRequest('admin-1', 'req-1', {
          action: DeletionReviewAction.APPROVE,
        }),
      ).resolves.toBeUndefined();

      // La notificacion aun se despacha a pesar del fallo en Drive
      expect(
        notificationsDispatch.dispatchDeletionRequestApproved,
      ).toHaveBeenCalledWith('req-1');
    });
  });

  // ─── reviewRequest — Rejection ───────────────────────────────────────────

  describe('reviewRequest - REJECT', () => {
    it('registra auditoria y despacha notificacion REJECTED', async () => {
      const mockRequest = {
        id: 'req-2',
        entityId: 'mat-1',
        entityType: 'material',
        deletionRequestStatusId: 'status-pending',
      } as DeletionRequest;

      catalogRepo.findDeletionRequestStatusByCode.mockImplementation(
        async (code) => {
          if (code === DELETION_REQUEST_STATUS_CODES.PENDING)
            return { id: 'status-pending' } as any;
          if (code === DELETION_REQUEST_STATUS_CODES.REJECTED)
            return { id: 'status-rejected' } as any;
          return null;
        },
      );
      materialRepo.findById.mockResolvedValue(makeMaterial());

      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue(mockRequest),
          update: jest.fn().mockResolvedValue({}),
        } as any;
        return cb(manager);
      });

      await service.reviewRequest('admin-1', 'req-2', {
        action: DeletionReviewAction.REJECT,
        adminComment: 'no procede',
      });

      expect(auditService.logAction).toHaveBeenCalledWith(
        'admin-1',
        AUDIT_ACTION_CODES.FILE_EDIT,
        expect.anything(),
      );
      expect(
        notificationsDispatch.dispatchDeletionRequestRejected,
      ).toHaveBeenCalledWith('req-2', 'no procede');
      expect(
        notificationsDispatch.dispatchDeletionRequestApproved,
      ).not.toHaveBeenCalled();
    });

    it('invalida cache al rechazar', async () => {
      const mockRequest = {
        id: 'req-2',
        entityId: 'mat-1',
        entityType: 'material',
        deletionRequestStatusId: 'status-pending',
      } as DeletionRequest;

      catalogRepo.findDeletionRequestStatusByCode.mockImplementation(
        async (code) => {
          if (code === DELETION_REQUEST_STATUS_CODES.PENDING)
            return { id: 'status-pending' } as any;
          if (code === DELETION_REQUEST_STATUS_CODES.REJECTED)
            return { id: 'status-rejected' } as any;
          return null;
        },
      );
      materialRepo.findById.mockResolvedValue(makeMaterial());

      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue(mockRequest),
          update: jest.fn().mockResolvedValue({}),
        } as any;
        return cb(manager);
      });

      await service.reviewRequest('admin-1', 'req-2', {
        action: DeletionReviewAction.REJECT,
        adminComment: 'no procede',
      });

      expect(cacheService.del).toHaveBeenCalledWith(
        'cache:materials:contents:folder:folder-1',
      );
    });
  });

  // ─── findMaterialFiles ───────────────────────────────────────────────────

  describe('findMaterialFiles', () => {
    it('devuelve respuesta paginada correctamente', async () => {
      materialRepo.findAdminMaterialFilesPage.mockResolvedValue({
        totalItems: 1,
        rows: [
          {
            materialId: 'mat-1',
            displayName: 'Material 1',
            classEventId: null,
            visibleFrom: null,
            visibleUntil: null,
            createdAt: new Date('2026-01-01T10:00:00.000Z'),
            updatedAt: null,
            statusCode: 'ACTIVE',
            statusName: 'Activo',
            folderId: 'folder-1',
            folderName: 'Root',
            evaluationId: 'eval-1',
            evaluationNumber: 1,
            evaluationTypeCode: 'PC',
            evaluationTypeName: 'Practica calificada',
            courseCode: 'MAT101',
            courseName: 'Matematica',
            academicCycleCode: '2026-I',
            fileResourceId: 'res-1',
            fileVersionId: 'ver-1',
            versionNumber: 2,
            originalName: 'file.pdf',
            mimeType: 'application/pdf',
            sizeBytes: '2048',
            storageProvider: 'LOCAL',
            createdById: 'user-1',
            createdByEmail: 'admin@test.com',
            createdByFirstName: 'Admin',
            createdByLastName1: 'Uno',
            createdByLastName2: null,
          },
        ],
      } as any);

      const response = await service.findMaterialFiles({
        page: 2,
        pageSize: 1,
        search: 'MAT',
      });

      expect(materialRepo.findAdminMaterialFilesPage).toHaveBeenCalledWith({
        page: 2,
        pageSize: 1,
        search: 'MAT',
        statusCode: undefined,
      });
      expect(response.totalItems).toBe(1);
      expect(response.totalPages).toBe(1);
      expect(response.items[0]).toMatchObject({
        materialId: 'mat-1',
        status: { code: 'ACTIVE', name: 'Activo' },
        file: { versionNumber: 2, sizeBytes: '2048' },
        createdBy: { id: 'user-1', email: 'admin@test.com' },
      });
    });
  });
});


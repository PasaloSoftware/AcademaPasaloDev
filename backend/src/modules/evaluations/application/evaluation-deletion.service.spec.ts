import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EvaluationDeletionService } from '@modules/evaluations/application/evaluation-deletion.service';
import { EvaluationRepository } from '@modules/evaluations/infrastructure/evaluation.repository';
import { EvaluationDriveAccessProvisioningService } from '@modules/media-access/application/evaluation-drive-access-provisioning.service';
import { MediaAccessMembershipDispatchService } from '@modules/media-access/application/media-access-membership-dispatch.service';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { EVALUATION_TYPE_CODES } from '@modules/evaluations/domain/evaluation.constants';

const ACTIVE_PC_EVALUATION = {
  id: '42',
  courseCycleId: '10',
  evaluationTypeId: '5',
  number: 2,
  evaluationType: { code: 'PC' },
};

const DRIVE_SNAPSHOT = {
  viewerGroupEmail: 'ev-42-viewers@academiapasalo.com',
  driveScopeFolderId: 'drive-folder-xyz',
};

describe('EvaluationDeletionService', () => {
  let service: EvaluationDeletionService;
  let evaluationRepository: jest.Mocked<EvaluationRepository>;
  let driveAccessProvisioningService: jest.Mocked<EvaluationDriveAccessProvisioningService>;
  let mediaAccessDispatch: jest.Mocked<MediaAccessMembershipDispatchService>;
  let cacheService: jest.Mocked<RedisCacheService>;
  let dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>;
  let managerMock: { query: jest.Mock };

  beforeEach(async () => {
    managerMock = { query: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationDeletionService,
        {
          provide: DataSource,
          useValue: {
            transaction: jest
              .fn()
              .mockImplementation(async (cb: (m: unknown) => unknown) =>
                cb(managerMock),
              ),
          },
        },
        {
          provide: EvaluationRepository,
          useValue: {
            findByIdWithType: jest.fn(),
            findDisplayOrderById: jest.fn(),
          },
        },
        {
          provide: EvaluationDriveAccessProvisioningService,
          useValue: {
            getDriveAccessSnapshot: jest.fn(),
          },
        },
        {
          provide: MediaAccessMembershipDispatchService,
          useValue: {
            enqueueEvaluationScopeTeardown: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: RedisCacheService,
          useValue: {
            invalidateIndex: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(EvaluationDeletionService);
    evaluationRepository = module.get(EvaluationRepository);
    driveAccessProvisioningService = module.get(
      EvaluationDriveAccessProvisioningService,
    );
    mediaAccessDispatch = module.get(MediaAccessMembershipDispatchService);
    cacheService = module.get(RedisCacheService);
    dataSource = module.get(DataSource);
  });

  describe('validación de entrada', () => {
    it('lanza BadRequestException para evaluationId en blanco', async () => {
      await expect(service.delete('   ')).rejects.toThrow(BadRequestException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException para evaluationId vacío', async () => {
      await expect(service.delete('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('validación de negocio pre-transacción', () => {
    it('lanza NotFoundException cuando la evaluación no existe', async () => {
      (evaluationRepository.findByIdWithType as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('999')).rejects.toThrow(NotFoundException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(mediaAccessDispatch.enqueueEvaluationScopeTeardown).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException para tipo BANCO_ENUNCIADOS', async () => {
      (evaluationRepository.findByIdWithType as jest.Mock).mockResolvedValue({
        id: '99',
        courseCycleId: '10',
        evaluationTypeId: '1',
        number: 0,
        evaluationType: { code: EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS },
      });

      await expect(service.delete('99')).rejects.toThrow(BadRequestException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(mediaAccessDispatch.enqueueEvaluationScopeTeardown).not.toHaveBeenCalled();
    });

    it('acepta código de tipo con espacios que resulta en BANCO_ENUNCIADOS', async () => {
      (evaluationRepository.findByIdWithType as jest.Mock).mockResolvedValue({
        id: '99',
        courseCycleId: '10',
        evaluationTypeId: '1',
        number: 0,
        evaluationType: { code: ' banco_enunciados ' },
      });

      await expect(service.delete('99')).rejects.toThrow(BadRequestException);
    });
  });

  describe('happy path con Drive access', () => {
    beforeEach(() => {
      (evaluationRepository.findByIdWithType as jest.Mock).mockResolvedValue(
        ACTIVE_PC_EVALUATION,
      );
      (
        driveAccessProvisioningService.getDriveAccessSnapshot as jest.Mock
      ).mockResolvedValue(DRIVE_SNAPSHOT);
      (
        evaluationRepository.findDisplayOrderById as jest.Mock
      ).mockResolvedValue(3);
    });

    it('ejecuta la transacción y encola teardown job', async () => {
      await service.delete('42');

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(mediaAccessDispatch.enqueueEvaluationScopeTeardown).toHaveBeenCalledWith({
        evaluationId: '42',
        viewerGroupEmail: DRIVE_SNAPSHOT.viewerGroupEmail,
        driveScopeFolderId: DRIVE_SNAPSHOT.driveScopeFolderId,
      });
      expect(cacheService.invalidateIndex).toHaveBeenCalledTimes(1);
    });

    it('invalida el cache del course-cycle correcto', async () => {
      await service.delete('42');

      const cacheKeyArg = (cacheService.invalidateIndex as jest.Mock).mock
        .calls[0][0] as string;
      expect(cacheKeyArg).toContain('10');
    });

    it('elimina materiales con JOIN a material_folder antes de eliminar folders', async () => {
      await service.delete('42');

      const calls: string[][] = (managerMock.query.mock.calls as [string][]).map(
        ([sql]) => [sql],
      );
      const materialDeleteIdx = calls.findIndex(([sql]) =>
        sql.includes('DELETE m FROM material') && sql.includes('material_folder'),
      );
      const folderDeleteIdx = calls.findIndex(([sql]) =>
        sql.includes('DELETE') && sql.includes('material_folder') && !sql.includes('material m'),
      );
      expect(materialDeleteIdx).toBeGreaterThanOrEqual(0);
      expect(folderDeleteIdx).toBeGreaterThan(materialDeleteIdx);
    });

    it('elimina material_folder en tres pasos respetando la FK autorreferencial', async () => {
      await service.delete('42');

      const folderCalls = (managerMock.query.mock.calls as [string, unknown[]][])
        .filter(([sql]) => sql.includes('material_folder'))
        .map(([sql]) => sql);

      expect(folderCalls.length).toBeGreaterThanOrEqual(3);

      const level3 = folderCalls.find(
        (sql) =>
          sql.includes('JOIN') &&
          sql.includes('parent_folder_id IS NOT NULL'),
      );
      const level2 = folderCalls.find(
        (sql) =>
          !sql.includes('JOIN') &&
          sql.includes('parent_folder_id IS NOT NULL'),
      );
      const level1 = folderCalls.find(
        (sql) =>
          sql.includes('DELETE FROM material_folder') &&
          !sql.includes('parent_folder_id') &&
          !sql.includes('DELETE m FROM'),
      );
      expect(level3).toBeDefined();
      expect(level2).toBeDefined();
      expect(level1).toBeDefined();
    });

    it('elimina enrollment_evaluation con el id correcto', async () => {
      await service.delete('42');

      const enrollmentCall = (
        managerMock.query.mock.calls as [string, string[]][]
      ).find(([sql]) => sql.includes('enrollment_evaluation'));
      expect(enrollmentCall).toBeDefined();
      expect(enrollmentCall![1]).toContain('42');
    });

    it('elimina evaluation_drive_access con el id correcto', async () => {
      await service.delete('42');

      const driveAccessCall = (
        managerMock.query.mock.calls as [string, string[]][]
      ).find(([sql]) => sql.includes('evaluation_drive_access'));
      expect(driveAccessCall).toBeDefined();
      expect(driveAccessCall![1]).toContain('42');
    });

    it('renumera evaluaciones del mismo tipo con params correctos', async () => {
      await service.delete('42');

      const renumberCall = (
        managerMock.query.mock.calls as [string, unknown[]][]
      ).find(
        ([sql]) =>
          sql.includes('UPDATE evaluation') &&
          sql.includes('number = number - 1') &&
          sql.includes('evaluation_type_id'),
      );
      expect(renumberCall).toBeDefined();
      const params = renumberCall![1];
      expect(params).toContain('10');
      expect(params).toContain('5');
      expect(params).toContain(2);
    });

    it('compacta display_order cuando la columna existe', async () => {
      await service.delete('42');

      const displayOrderCall = (
        managerMock.query.mock.calls as [string, unknown[]][]
      ).find(
        ([sql]) =>
          sql.includes('display_order = display_order - 1') &&
          sql.includes('course_cycle_id'),
      );
      expect(displayOrderCall).toBeDefined();
      const params = displayOrderCall![1];
      expect(params).toContain('10');
      expect(params).toContain(3);
    });

    it('elimina la evaluacion como último paso de la transacción', async () => {
      await service.delete('42');

      const calls = managerMock.query.mock.calls as [string, unknown[]][];
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toContain('DELETE FROM evaluation WHERE id = ?');
      expect(lastCall[1]).toContain('42');
    });

    it('normaliza espacios en evaluationId antes de operar', async () => {
      await service.delete('  42  ');

      const evalDeleteCall = (
        managerMock.query.mock.calls as [string, unknown[]][]
      ).find(([sql]) => sql.includes('DELETE FROM evaluation WHERE id = ?'));
      expect(evalDeleteCall![1]).toContain('42');
      expect(evalDeleteCall![1]).not.toContain('  42  ');
    });
  });

  describe('happy path sin Drive access', () => {
    beforeEach(() => {
      (evaluationRepository.findByIdWithType as jest.Mock).mockResolvedValue(
        ACTIVE_PC_EVALUATION,
      );
      (
        driveAccessProvisioningService.getDriveAccessSnapshot as jest.Mock
      ).mockResolvedValue(null);
      (
        evaluationRepository.findDisplayOrderById as jest.Mock
      ).mockResolvedValue(2);
    });

    it('completa eliminación sin encolar teardown cuando no hay Drive access', async () => {
      await service.delete('42');

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(mediaAccessDispatch.enqueueEvaluationScopeTeardown).not.toHaveBeenCalled();
      expect(cacheService.invalidateIndex).toHaveBeenCalledTimes(1);
    });
  });

  describe('happy path sin columna display_order', () => {
    beforeEach(() => {
      (evaluationRepository.findByIdWithType as jest.Mock).mockResolvedValue(
        ACTIVE_PC_EVALUATION,
      );
      (
        driveAccessProvisioningService.getDriveAccessSnapshot as jest.Mock
      ).mockResolvedValue(DRIVE_SNAPSHOT);
      (
        evaluationRepository.findDisplayOrderById as jest.Mock
      ).mockResolvedValue(null);
    });

    it('omite la query de compactación de display_order', async () => {
      await service.delete('42');

      const displayOrderCall = (
        managerMock.query.mock.calls as [string][]
      ).find(([sql]) => sql.includes('display_order = display_order - 1'));
      expect(displayOrderCall).toBeUndefined();
    });

    it('aun ejecuta todas las demas operaciones', async () => {
      await service.delete('42');

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(cacheService.invalidateIndex).toHaveBeenCalledTimes(1);
      expect(mediaAccessDispatch.enqueueEvaluationScopeTeardown).toHaveBeenCalledTimes(1);
    });
  });

  describe('atomicidad: si la transacción falla no se encola el job', () => {
    it('no encola teardown cuando la transacción lanza error', async () => {
      (evaluationRepository.findByIdWithType as jest.Mock).mockResolvedValue(
        ACTIVE_PC_EVALUATION,
      );
      (
        driveAccessProvisioningService.getDriveAccessSnapshot as jest.Mock
      ).mockResolvedValue(DRIVE_SNAPSHOT);
      (
        evaluationRepository.findDisplayOrderById as jest.Mock
      ).mockResolvedValue(1);
      (dataSource.transaction as jest.Mock).mockRejectedValue(
        new Error('Deadlock detected'),
      );

      await expect(service.delete('42')).rejects.toThrow('Deadlock detected');
      expect(mediaAccessDispatch.enqueueEvaluationScopeTeardown).not.toHaveBeenCalled();
      expect(cacheService.invalidateIndex).not.toHaveBeenCalled();
    });
  });
});

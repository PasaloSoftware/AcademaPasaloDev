import { DriveAccessScopeService } from '@modules/media-access/application/drive-access-scope.service';
import { DriveScopeNamingService } from '@modules/media-access/application/drive-scope-naming.service';
import { EvaluationDriveAccessRepository } from '@modules/media-access/infrastructure/evaluation-drive-access.repository';
import { EvaluationDriveAccessProvisioningService } from '@modules/media-access/application/evaluation-drive-access-provisioning.service';
import { DriveScopeProvisioningService } from '@modules/media-access/application/drive-scope-provisioning.service';
import { EvaluationDriveAccess } from '@modules/media-access/domain/evaluation-drive-access.entity';

describe('DriveAccessScopeService', () => {
  let service: DriveAccessScopeService;
  let namingService: jest.Mocked<DriveScopeNamingService>;
  let repository: jest.Mocked<EvaluationDriveAccessRepository>;
  let evaluationRepository: { findOne: jest.Mock };
  let provisioningService: jest.Mocked<EvaluationDriveAccessProvisioningService>;
  let driveScopeProvisioningService: jest.Mocked<DriveScopeProvisioningService>;

  beforeEach(() => {
    namingService = {
      buildForEvaluation: jest.fn(),
    } as unknown as jest.Mocked<DriveScopeNamingService>;

    repository = {
      findByEvaluationId: jest.fn(),
      upsertByEvaluationId: jest.fn(),
    } as unknown as jest.Mocked<EvaluationDriveAccessRepository>;

    evaluationRepository = {
      findOne: jest.fn(),
    };

    provisioningService = {
      provisionByEvaluationId: jest.fn(),
    } as unknown as jest.Mocked<EvaluationDriveAccessProvisioningService>;

    driveScopeProvisioningService = {
      getDriveFolderMetadata: jest.fn(),
    } as unknown as jest.Mocked<DriveScopeProvisioningService>;

    service = new DriveAccessScopeService(
      namingService,
      repository,
      evaluationRepository as never,
      provisioningService,
      driveScopeProvisioningService,
    );
  });

  it('should return naming data and persisted mapping when it exists', async () => {
    evaluationRepository.findOne.mockResolvedValue({
      id: '552',
      number: 2,
      evaluationType: { code: 'PC' },
      courseCycleId: 'cc-1',
      courseCycle: {
        course: { code: 'MAT101' },
        academicCycle: { code: '2026-1' },
      },
    });
    namingService.buildForEvaluation.mockReturnValue({
      evaluationId: '552',
      scopeKey: 'ev_552',
      parentFolderNames: ['evaluations'],
      baseFolderName: 'ev_552',
      videosFolderName: 'videos',
      documentsFolderName: 'documentos',
      archivedFolderName: 'archivado',
      viewerGroupEmail: 'ev-552-viewers@academiapasalo.com',
    });

    const persisted = {
      id: '10',
      evaluationId: '552',
      scopeKey: 'ev_552',
      driveScopeFolderId: 'scope-folder-id',
      driveVideosFolderId: 'videos-folder-id',
      driveDocumentsFolderId: 'docs-folder-id',
      driveArchivedFolderId: 'archived-folder-id',
      viewerGroupEmail: 'ev-552-viewers@academiapasalo.com',
      viewerGroupId: 'group-id',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as EvaluationDriveAccess;
    repository.findByEvaluationId.mockResolvedValue(persisted);
    driveScopeProvisioningService.getDriveFolderMetadata.mockResolvedValue({
      id: 'scope-folder-id',
      name: 'ev_552',
      parents: [],
    } as never);

    const result = await service.resolveForEvaluation('552');

    expect(evaluationRepository.findOne).toHaveBeenCalledWith({
      where: { id: '552' },
      relations: {
        evaluationType: true,
        courseCycle: {
          course: true,
          academicCycle: true,
        },
      },
    });
    expect(namingService.buildForEvaluation).toHaveBeenCalledWith({
      evaluationId: '552',
      courseCycleId: 'cc-1',
      courseCode: 'MAT101',
      cycleCode: '2026-1',
      evaluationTypeCode: 'PC',
      evaluationNumber: 2,
    });
    expect(repository.findByEvaluationId).toHaveBeenCalledWith('552');
    expect(result.names.scopeKey).toBe('ev_552');
    expect(result.persisted?.id).toBe('10');
    expect(provisioningService.provisionByEvaluationId).not.toHaveBeenCalled();
  });

  it('should provision and return persisted mapping when no scope exists yet', async () => {
    evaluationRepository.findOne.mockResolvedValue({
      id: '81',
      number: 1,
      evaluationType: { code: 'EX' },
      courseCycleId: 'cc-9',
      courseCycle: {
        course: { code: 'QUI101' },
        academicCycle: { code: '2026-2' },
      },
    });
    namingService.buildForEvaluation.mockReturnValue({
      evaluationId: '81',
      scopeKey: 'ev_81',
      parentFolderNames: ['evaluations'],
      baseFolderName: 'ev_81',
      videosFolderName: 'videos',
      documentsFolderName: 'documentos',
      archivedFolderName: 'archivado',
      viewerGroupEmail: 'ev-81-viewers@academiapasalo.com',
    });
    repository.findByEvaluationId.mockResolvedValue(null);
    provisioningService.provisionByEvaluationId.mockResolvedValue({
      id: '20',
      evaluationId: '81',
      scopeKey: 'ev_81',
      driveScopeFolderId: 'scope-folder-id',
      driveVideosFolderId: 'videos-folder-id',
      driveDocumentsFolderId: 'docs-folder-id',
      driveArchivedFolderId: 'archived-folder-id',
      viewerGroupEmail: 'ev-81-viewers@academiapasalo.com',
      viewerGroupId: 'group-id',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as EvaluationDriveAccess);

    const result = await service.resolveForEvaluation('81');

    expect(result.names.viewerGroupEmail).toBe(
      'ev-81-viewers@academiapasalo.com',
    );
    expect(result.persisted?.id).toBe('20');
    expect(provisioningService.provisionByEvaluationId).toHaveBeenCalledWith(
      '81',
    );
  });
});

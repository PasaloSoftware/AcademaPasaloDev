import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { CourseCycleDriveProvisioningService } from '@modules/media-access/application/course-cycle-drive-provisioning.service';
import { WorkspaceGroupsService } from '@modules/media-access/application/workspace-groups.service';
import { DriveScopeProvisioningService } from '@modules/media-access/application/drive-scope-provisioning.service';

describe('CourseCycleDriveProvisioningService', () => {
  let service: CourseCycleDriveProvisioningService;
  let workspaceGroupsService: jest.Mocked<WorkspaceGroupsService>;
  let driveScopeProvisioningService: jest.Mocked<DriveScopeProvisioningService>;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseCycleDriveProvisioningService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('academiapasalo.com'),
          },
        },
        {
          provide: DataSource,
          useValue: {
            query: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: WorkspaceGroupsService,
          useValue: {
            findOrCreateGroup: jest
              .fn()
              .mockImplementation(async ({ email }) => ({ id: email, email })),
            ensureMemberInGroup: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: DriveScopeProvisioningService,
          useValue: {
            validateRootFolder: jest.fn().mockResolvedValue(undefined),
            getRootFolderId: jest.fn().mockReturnValue('root-folder'),
            findOrCreateDriveFolderUnderParent: jest
              .fn()
              .mockImplementation(async (parentId, name) => `${parentId}/${name}`),
            ensureGroupReaderPermission: jest.fn().mockResolvedValue(undefined),
            ensureGroupWriterPermission: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(CourseCycleDriveProvisioningService);
    workspaceGroupsService = module.get(WorkspaceGroupsService);
    driveScopeProvisioningService = module.get(DriveScopeProvisioningService);
    dataSource = module.get(DataSource);
  });

  it('uses explicit bank folders when provided', async () => {
    const result = await service.provision({
      courseCycleId: '17',
      courseCode: 'QUI101',
      cycleCode: '2026-0',
      bankCards: [{ evaluationTypeCode: 'PC', number: 1 }],
      bankFolders: [
        { groupName: 'Practicas Dirigidas', items: ['PD1', 'PD2'] },
        { groupName: 'Prácticas Calificadas', items: ['PC1'] },
      ],
    });

    expect(
      driveScopeProvisioningService.findOrCreateDriveFolderUnderParent,
    ).toHaveBeenCalledWith(
      expect.stringContaining('/bank_documents'),
      'Practicas Dirigidas',
    );
    expect(
      driveScopeProvisioningService.findOrCreateDriveFolderUnderParent,
    ).toHaveBeenCalledWith(
      expect.stringContaining('/Practicas Dirigidas'),
      'PD1',
    );
    expect(result.bankLeafFoldersCreated).toBe(3);
    expect(workspaceGroupsService.findOrCreateGroup).toHaveBeenCalled();
    expect(dataSource.query).toHaveBeenCalled();
  });
});

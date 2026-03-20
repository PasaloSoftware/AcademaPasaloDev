import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { CourseSetupService } from '@modules/courses/application/course-setup.service';
import { CoursesService } from '@modules/courses/application/courses.service';
import { EvaluationsService } from '@modules/evaluations/application/evaluations.service';
import { EvaluationDriveAccessProvisioningService } from '@modules/media-access/application/evaluation-drive-access-provisioning.service';
import { CourseCycleDriveProvisioningService } from '@modules/media-access/application/course-cycle-drive-provisioning.service';

describe('CourseSetupService', () => {
  let service: CourseSetupService;
  let dataSource: jest.Mocked<DataSource>;
  let coursesService: jest.Mocked<CoursesService>;
  let evaluationsService: jest.Mocked<EvaluationsService>;
  let evaluationDriveAccessProvisioningService: jest.Mocked<EvaluationDriveAccessProvisioningService>;
  let courseCycleDriveProvisioningService: jest.Mocked<CourseCycleDriveProvisioningService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseSetupService,
        {
          provide: DataSource,
          useValue: {
            query: jest.fn(),
          },
        },
        {
          provide: CoursesService,
          useValue: {
            create: jest.fn(),
            assignToCycle: jest.fn(),
            assignProfessorToCourseCycle: jest.fn(),
            updateCourseCycleEvaluationStructure: jest.fn(),
          },
        },
        {
          provide: EvaluationsService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: EvaluationDriveAccessProvisioningService,
          useValue: {
            provisionByEvaluationId: jest.fn(),
          },
        },
        {
          provide: CourseCycleDriveProvisioningService,
          useValue: {
            provision: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(CourseSetupService);
    dataSource = module.get(DataSource);
    coursesService = module.get(CoursesService);
    evaluationsService = module.get(EvaluationsService);
    evaluationDriveAccessProvisioningService = module.get(
      EvaluationDriveAccessProvisioningService,
    );
    courseCycleDriveProvisioningService = module.get(
      CourseCycleDriveProvisioningService,
    );
  });

  it('should not provision BANCO_ENUNCIADOS as evaluation drive scope', async () => {
    (coursesService.create as jest.Mock).mockResolvedValue({
      id: 'course-1',
      code: 'MAT101',
      name: 'Algebra',
    });
    (coursesService.assignToCycle as jest.Mock).mockResolvedValue({
      id: 'cc-1',
      courseId: 'course-1',
      academicCycleId: 'ac-1',
    });
    (evaluationsService.create as jest.Mock)
      .mockResolvedValueOnce({
        id: 'eval-pc1',
        number: 1,
      })
      .mockResolvedValueOnce({
        id: 'eval-ex1',
        number: 1,
      });
    (dataSource.query as jest.Mock)
      .mockResolvedValueOnce([
        { id: 'type-pc', code: 'PC' },
        { id: 'type-ex', code: 'EX' },
      ])
      .mockResolvedValueOnce([{ id: 'bank-eval', number: 0 }])
      .mockResolvedValueOnce([{ courseCode: 'MAT101', cycleCode: '2026-0' }]);
    (
      evaluationDriveAccessProvisioningService.provisionByEvaluationId as jest.Mock
    ).mockResolvedValue({});
    (
      courseCycleDriveProvisioningService.provision as jest.Mock
    ).mockResolvedValue({
      scopeFolderId: 'scope-1',
      introFolderId: 'intro-1',
      bankFolderId: 'bank-1',
      viewerGroupEmail: 'cc-1-viewers@test.com',
      bankLeafFoldersCreated: 2,
    });

    const result = await service.createFullCourseSetup(
      { id: 'admin-1' } as any,
      {
        course: {
          code: 'MAT101',
          name: 'Algebra',
          courseTypeId: 'ct-1',
          cycleLevelId: 'cl-1',
        },
        academicCycleId: 'ac-1',
        professorUserIds: [],
        allowedEvaluationTypeIds: ['type-pc', 'type-ex'],
        evaluationsToCreate: [
          {
            evaluationTypeId: 'type-pc',
            number: 1,
            startDate: '2026-01-10',
            endDate: '2026-01-11',
          },
          {
            evaluationTypeId: 'type-ex',
            number: 1,
            startDate: '2026-02-10',
            endDate: '2026-02-11',
          },
        ],
        materialsTemplate: {
          applyToEachEvaluation: false,
          roots: [],
        },
      },
    );

    expect(
      evaluationDriveAccessProvisioningService.provisionByEvaluationId,
    ).toHaveBeenCalledTimes(2);
    expect(
      evaluationDriveAccessProvisioningService.provisionByEvaluationId,
    ).toHaveBeenNthCalledWith(1, 'eval-pc1');
    expect(
      evaluationDriveAccessProvisioningService.provisionByEvaluationId,
    ).toHaveBeenNthCalledWith(2, 'eval-ex1');
    expect(result.bankEvaluationCreated).toEqual({
      id: 'bank-eval',
      number: 0,
    });
    expect(result.driveProvisioning).toEqual({
      evaluationScopesProvisioned: ['eval-pc1', 'eval-ex1'],
      courseCycleScope: {
        scopeFolderId: 'scope-1',
        introFolderId: 'intro-1',
        bankFolderId: 'bank-1',
        viewerGroupEmail: 'cc-1-viewers@test.com',
        bankLeafFoldersCreated: 2,
      },
    });
  });
});

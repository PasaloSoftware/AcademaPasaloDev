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
            transaction: jest.fn(),
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

  function installQueryMock(options: {
    types: Array<{ id: string; code: string; name: string }>;
    courseMeta: { courseCode: string; cycleCode: string };
  }) {
    const typeById = new Map(options.types.map((item) => [item.id, item]));
    const typeByCode = new Map(options.types.map((item) => [item.code, item]));
    const typeByName = new Map(
      options.types.map((item) => [item.name.toLowerCase().trim(), item]),
    );
    const folders = new Map<string, string>();
    let folderSeq = 0;

    const getFolderKey = (
      evaluationId: string,
      parentFolderId: string | null,
      name: string,
    ) => `${evaluationId}::${parentFolderId || 'ROOT'}::${name}`;

    (dataSource.query as jest.Mock).mockImplementation(async (sql, params = []) => {
      const query = String(sql);

      if (query.includes('FROM evaluation_type') && query.includes('WHERE id IN')) {
        return params.map((id: string) => typeById.get(String(id))).filter(Boolean);
      }

      if (
        query.includes('FROM evaluation_type') &&
        query.includes('LOWER(TRIM(name)) = LOWER(TRIM(?))')
      ) {
        const row = typeByName.get(String(params[0] || '').toLowerCase().trim());
        return row ? [row] : [];
      }

      if (
        query.includes('FROM evaluation_type') &&
        query.includes('WHERE code = ?')
      ) {
        const row = typeByCode.get(String(params[0] || '').trim());
        return row ? [row] : [];
      }

      if (query.includes('INSERT INTO evaluation_type')) {
        const [code, name] = params;
        const row = { id: `generated-${typeByCode.size + 1}`, code, name };
        typeById.set(String(row.id), row);
        typeByCode.set(String(row.code), row);
        typeByName.set(String(row.name).toLowerCase().trim(), row);
        return {};
      }

      if (query.includes('FROM evaluation e') && query.includes('et.code = ?')) {
        return [{ id: 'bank-eval', number: 0 }];
      }

      if (query.includes("SELECT id FROM folder_status WHERE code = 'ACTIVE'")) {
        return [{ id: 'folder-active' }];
      }

      if (query.includes('FROM material_folder')) {
        const [evaluationId, name, parentFolderId] = params;
        const key = getFolderKey(
          String(evaluationId),
          (parentFolderId as string | null) ?? null,
          String(name),
        );
        const id = folders.get(key);
        return id ? [{ id }] : [];
      }

      if (query.includes('INSERT INTO material_folder')) {
        const [evaluationId, parentFolderId, , name] = params;
        folderSeq += 1;
        folders.set(
          getFolderKey(
            String(evaluationId),
            (parentFolderId as string | null) ?? null,
            String(name),
          ),
          `folder-${folderSeq}`,
        );
        return {};
      }

      if (query.includes('SELECT') && query.includes('c.code AS courseCode')) {
        return [options.courseMeta];
      }

      throw new Error(`Unhandled SQL in test: ${query}`);
    });

    (dataSource.transaction as jest.Mock).mockImplementation(async (callback) =>
      await callback({ query: dataSource.query }),
    );
  }

  it('creates default bank folders from academic evaluations and provisions drive', async () => {
    installQueryMock({
      types: [
        { id: 'type-pc', code: 'PC', name: 'Practica Calificada' },
        { id: 'type-ex', code: 'EX', name: 'Examen' },
      ],
      courseMeta: { courseCode: 'MAT101', cycleCode: '2026-0' },
    });

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
      .mockResolvedValueOnce({ id: 'eval-pc1', number: 1 })
      .mockResolvedValueOnce({ id: 'eval-ex1', number: 1 });
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
          roots: [],
        },
      },
    );

    expect(
      evaluationDriveAccessProvisioningService.provisionByEvaluationId,
    ).toHaveBeenCalledTimes(2);
    expect(courseCycleDriveProvisioningService.provision).toHaveBeenCalledWith({
      courseCycleId: 'cc-1',
      courseCode: 'MAT101',
      cycleCode: '2026-0',
      bankCards: [
        { evaluationTypeCode: 'PC', number: 1 },
        { evaluationTypeCode: 'EX', number: 1 },
      ],
      bankFolders: [
        { groupName: 'Examenes', items: ['EX1'] },
        { groupName: 'Practicas Calificadas', items: ['PC1'] },
      ],
    });
    expect((result as any).bankFoldersConfigured).toEqual([
      {
        evaluationTypeId: 'type-ex',
        evaluationTypeCode: 'EX',
        groupName: 'Examenes',
        items: ['EX1'],
      },
      {
        evaluationTypeId: 'type-pc',
        evaluationTypeCode: 'PC',
        groupName: 'Practicas Calificadas',
        items: ['PC1'],
      },
    ]);
  });

  it('supports explicit bank folders including bank-only types without creating academic evaluations', async () => {
    installQueryMock({
      types: [
        { id: 'type-pc', code: 'PC', name: 'Practica Calificada' },
        { id: 'type-pd', code: 'PD', name: 'Practica Dirigida' },
      ],
      courseMeta: { courseCode: 'QUI101', cycleCode: '2026-0' },
    });

    (coursesService.create as jest.Mock).mockResolvedValue({
      id: 'course-2',
      code: 'QUI101',
      name: 'Quimica',
    });
    (coursesService.assignToCycle as jest.Mock).mockResolvedValue({
      id: 'cc-2',
      courseId: 'course-2',
      academicCycleId: 'ac-2',
    });
    (evaluationsService.create as jest.Mock).mockResolvedValue({
      id: 'eval-pc1',
      number: 1,
    });
    (
      evaluationDriveAccessProvisioningService.provisionByEvaluationId as jest.Mock
    ).mockResolvedValue({});
    (
      courseCycleDriveProvisioningService.provision as jest.Mock
    ).mockResolvedValue({
      scopeFolderId: 'scope-2',
      introFolderId: 'intro-2',
      bankFolderId: 'bank-2',
      viewerGroupEmail: 'cc-2-viewers@test.com',
      bankLeafFoldersCreated: 5,
    });

    const result = await service.createFullCourseSetup(
      { id: 'admin-2' } as any,
      {
        course: {
          code: 'QUI101',
          name: 'Quimica',
          courseTypeId: 'ct-1',
          cycleLevelId: 'cl-1',
        },
        academicCycleId: 'ac-2',
        allowedEvaluationTypeIds: ['type-pc'],
        evaluationsToCreate: [
          {
            evaluationTypeId: 'type-pc',
            number: 1,
            startDate: '2026-01-10',
            endDate: '2026-01-11',
          },
        ],
        bankFoldersToCreate: [
          {
            evaluationTypeId: 'type-pc',
            groupName: 'Prácticas Calificadas',
            items: ['PC1'],
          },
          {
            evaluationTypeId: 'type-pd',
            groupName: 'Practicas Dirigidas',
            items: ['PD1', 'PD2', 'PD3', 'PD4'],
          },
        ],
        materialsTemplate: {
          roots: [],
        },
      },
    );

    expect(coursesService.updateCourseCycleEvaluationStructure).toHaveBeenCalledWith(
      'cc-2',
      ['type-pc', 'type-pd'],
    );
    expect(evaluationsService.create).toHaveBeenCalledTimes(1);
    expect(courseCycleDriveProvisioningService.provision).toHaveBeenCalledWith({
      courseCycleId: 'cc-2',
      courseCode: 'QUI101',
      cycleCode: '2026-0',
      bankCards: [{ evaluationTypeCode: 'PC', number: 1 }],
      bankFolders: [
        { groupName: 'Prácticas Calificadas', items: ['PC1'] },
        { groupName: 'Practicas Dirigidas', items: ['PD1', 'PD2', 'PD3', 'PD4'] },
      ],
    });
    expect((result as any).bankFoldersConfigured).toEqual([
      {
        evaluationTypeId: 'type-pc',
        evaluationTypeCode: 'PC',
        groupName: 'Prácticas Calificadas',
        items: ['PC1'],
      },
      {
        evaluationTypeId: 'type-pd',
        evaluationTypeCode: 'PD',
        groupName: 'Practicas Dirigidas',
        items: ['PD1', 'PD2', 'PD3', 'PD4'],
      },
    ]);
  });

  it('rejects duplicated bank group names in bankFoldersToCreate', async () => {
    await expect(
      service.createFullCourseSetup(
        { id: 'admin-3' } as any,
        {
          course: {
            code: 'QUI102',
            name: 'Quimica 2',
            courseTypeId: 'ct-1',
            cycleLevelId: 'cl-1',
          },
          academicCycleId: 'ac-2',
          allowedEvaluationTypeIds: ['type-pc'],
          evaluationsToCreate: [
            {
              evaluationTypeId: 'type-pc',
              number: 1,
              startDate: '2026-01-10',
              endDate: '2026-01-11',
            },
          ],
          bankFoldersToCreate: [
            {
              evaluationTypeId: 'type-pc',
              groupName: 'Practicas Dirigidas',
              items: ['PD1'],
            },
            {
              evaluationTypeId: 'type-pc-2',
              groupName: 'Prácticas Dirigidas',
              items: ['PD2'],
            },
          ],
          materialsTemplate: {
            roots: [],
          },
        },
      ),
    ).rejects.toThrow('groupName duplicado en bankFoldersToCreate');
  });

  it('rejects bank folders that send evaluationTypeId and newEvaluationTypeName together', async () => {
    await expect(
      service.createFullCourseSetup(
        { id: 'admin-4' } as any,
        {
          course: {
            code: 'QUI103',
            name: 'Quimica 3',
            courseTypeId: 'ct-1',
            cycleLevelId: 'cl-1',
          },
          academicCycleId: 'ac-2',
          allowedEvaluationTypeIds: ['type-pc'],
          evaluationsToCreate: [
            {
              evaluationTypeId: 'type-pc',
              number: 1,
              startDate: '2026-01-10',
              endDate: '2026-01-11',
            },
          ],
          bankFoldersToCreate: [
            {
              evaluationTypeId: 'type-pc',
              newEvaluationTypeName: 'Practica Dirigida',
              groupName: 'Practicas Dirigidas',
              items: ['PD1'],
            },
          ],
          materialsTemplate: {
            roots: [],
          },
        },
      ),
    ).rejects.toThrow(
      'bankFoldersToCreate[0] no debe enviar evaluationTypeId y newEvaluationTypeName al mismo tiempo',
    );
  });

  it('rejects bank folders that omit both evaluationTypeId and newEvaluationTypeName', async () => {
    await expect(
      service.createFullCourseSetup(
        { id: 'admin-5' } as any,
        {
          course: {
            code: 'QUI104',
            name: 'Quimica 4',
            courseTypeId: 'ct-1',
            cycleLevelId: 'cl-1',
          },
          academicCycleId: 'ac-2',
          allowedEvaluationTypeIds: ['type-pc'],
          evaluationsToCreate: [
            {
              evaluationTypeId: 'type-pc',
              number: 1,
              startDate: '2026-01-10',
              endDate: '2026-01-11',
            },
          ],
          bankFoldersToCreate: [
            {
              groupName: 'Practicas Dirigidas',
              items: ['PD1'],
            } as any,
          ],
          materialsTemplate: {
            roots: [],
          },
        },
      ),
    ).rejects.toThrow(
      'bankFoldersToCreate[0] debe enviar evaluationTypeId o newEvaluationTypeName',
    );
  });

  it('rejects duplicated items inside the same bank folder group', async () => {
    await expect(
      service.createFullCourseSetup(
        { id: 'admin-6' } as any,
        {
          course: {
            code: 'QUI105',
            name: 'Quimica 5',
            courseTypeId: 'ct-1',
            cycleLevelId: 'cl-1',
          },
          academicCycleId: 'ac-2',
          allowedEvaluationTypeIds: ['type-pc'],
          evaluationsToCreate: [
            {
              evaluationTypeId: 'type-pc',
              number: 1,
              startDate: '2026-01-10',
              endDate: '2026-01-11',
            },
          ],
          bankFoldersToCreate: [
            {
              evaluationTypeId: 'type-pc',
              groupName: 'Practicas Calificadas',
              items: ['PC1', ' pc1 '],
            },
          ],
          materialsTemplate: {
            roots: [],
          },
        },
      ),
    ).rejects.toThrow(
      'items duplicados en bankFoldersToCreate para groupName "Practicas Calificadas"',
    );
  });
});

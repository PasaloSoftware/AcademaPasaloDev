import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { CoursesService } from '@modules/courses/application/courses.service';
import { CourseRepository } from '@modules/courses/infrastructure/course.repository';
import { CourseTypeRepository } from '@modules/courses/infrastructure/course-type.repository';
import { CycleLevelRepository } from '@modules/courses/infrastructure/cycle-level.repository';
import { CourseCycleRepository } from '@modules/courses/infrastructure/course-cycle.repository';
import { CourseCycleProfessorRepository } from '@modules/courses/infrastructure/course-cycle-professor.repository';
import { CourseCycleAllowedEvaluationTypeRepository } from '@modules/courses/infrastructure/course-cycle-allowed-evaluation-type.repository';
import { EvaluationRepository } from '@modules/evaluations/infrastructure/evaluation.repository';
import { CyclesService } from '@modules/cycles/application/cycles.service';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { STUDENT_EVALUATION_LABELS } from '@modules/courses/domain/student-course.constants';
import { ROLE_CODES } from '@common/constants/role-codes.constants';
import { MediaAccessMembershipDispatchService } from '@modules/media-access/application/media-access-membership-dispatch.service';
import { CourseCycleDriveProvisioningService } from '@modules/media-access/application/course-cycle-drive-provisioning.service';
import { StorageService } from '@infrastructure/storage/storage.service';
import { MaterialFolderRepository } from '@modules/materials/infrastructure/material-folder.repository';
import { MaterialRepository } from '@modules/materials/infrastructure/material.repository';
import { FileResourceRepository } from '@modules/materials/infrastructure/file-resource.repository';
import { MaterialCatalogRepository } from '@modules/materials/infrastructure/material-catalog.repository';
import { COURSE_PRIMARY_COLOR_PALETTE } from '@modules/courses/domain/course-color.constants';

describe('CoursesService student views', () => {
  let service: CoursesService;
  let dataSource: jest.Mocked<DataSource>;
  let cacheService: jest.Mocked<RedisCacheService>;
  let courseRepository: jest.Mocked<CourseRepository>;
  let courseCycleRepository: jest.Mocked<CourseCycleRepository>;
  let courseCycleProfessorRepository: jest.Mocked<CourseCycleProfessorRepository>;
  let courseCycleAllowedEvaluationTypeRepository: jest.Mocked<CourseCycleAllowedEvaluationTypeRepository>;
  let evaluationRepository: jest.Mocked<EvaluationRepository>;
  let courseCycleDriveProvisioningService: jest.Mocked<CourseCycleDriveProvisioningService>;
  let storageService: jest.Mocked<StorageService>;
  let materialFolderRepository: jest.Mocked<MaterialFolderRepository>;
  let materialRepository: jest.Mocked<MaterialRepository>;
  let fileResourceRepository: jest.Mocked<FileResourceRepository>;
  let materialCatalogRepository: jest.Mocked<MaterialCatalogRepository>;

  const currentCycle = {
    id: '100',
    courseId: '10',
    course: { id: '10', code: 'MAT', name: 'Matematica' },
    academicCycle: {
      id: '200',
      code: '2026-1',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-07-30'),
    },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        {
          provide: DataSource,
          useValue: {
            query: jest.fn(),
            transaction: jest.fn(),
          },
        },
        {
          provide: CourseRepository,
          useValue: {
            findById: jest.fn(),
            findByCode: jest.fn(),
            updateAndReturn: jest.fn(),
            deleteById: jest.fn(),
          },
        },
        { provide: CourseTypeRepository, useValue: {} },
        { provide: CycleLevelRepository, useValue: {} },
        {
          provide: CourseCycleRepository,
          useValue: {
            findById: jest.fn(),
            findFullById: jest.fn(),
            findPreviousByCourseId: jest.fn(),
            findByCourseIdAndCycleCode: jest.fn(),
            hasAccessiblePreviousByCourseIdAndUserId: jest.fn(),
            findAdminCourseCyclesPage: jest.fn(),
          },
        },
        {
          provide: CourseCycleProfessorRepository,
          useValue: {
            upsertAssign: jest.fn(),
            revoke: jest.fn(),
            isProfessorAssigned: jest.fn(),
            canProfessorReadCourseCycle: jest.fn(),
            findByProfessorUserId: jest.fn(),
          },
        },
        {
          provide: CourseCycleAllowedEvaluationTypeRepository,
          useValue: {
            findActiveByCourseCycleId: jest.fn(),
            findActiveWithTypeByCourseCycleId: jest.fn(),
            replaceAllowedTypes: jest.fn(),
          },
        },
        {
          provide: EvaluationRepository,
          useValue: {
            findAllWithUserAccess: jest.fn(),
            findByCourseCycle: jest.fn(),
            findTypesByIds: jest.fn(),
            findTypeByCode: jest.fn(),
            findTypesByCodes: jest.fn(),
          },
        },
        { provide: CyclesService, useValue: {} },
        {
          provide: MediaAccessMembershipDispatchService,
          useValue: {
            enqueueGrantForUserCourseCycles: jest.fn(),
            enqueueRevokeForUserCourseCycles: jest.fn(),
            enqueueGrantForUserEvaluations: jest.fn(),
            enqueueRevokeForUserEvaluations: jest.fn(),
          },
        },
        {
          provide: CourseCycleDriveProvisioningService,
          useValue: {
            ensureBankLeafFolder: jest.fn(),
            renameBankGroupFolder: jest.fn(),
            deleteBankFolder: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            calculateHash: jest.fn(),
            saveFile: jest.fn(),
            deleteFile: jest.fn(),
            enforceNoCopyForViewersOnDriveFile: jest
              .fn()
              .mockResolvedValue(undefined),
            isGoogleDriveStorageEnabled: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: MaterialFolderRepository,
          useValue: {
            findRootsByEvaluation: jest.fn(),
            findSubFolders: jest.fn(),
            findByParentFolderIds: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: MaterialRepository,
          useValue: {
            findByFolderIds: jest.fn(),
          },
        },
        {
          provide: FileResourceRepository,
          useValue: {
            findByHashAndSizeWithinEvaluation: jest.fn(),
          },
        },
        {
          provide: MaterialCatalogRepository,
          useValue: {
            findFolderStatusByCode: jest.fn(),
            findMaterialStatusByCode: jest.fn(),
          },
        },
        {
          provide: RedisCacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            addToIndex: jest.fn(),
            del: jest.fn(),
            delMany: jest.fn(),
            invalidateGroup: jest.fn(),
            invalidateIndex: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(CoursesService);
    dataSource = module.get(DataSource);
    cacheService = module.get(RedisCacheService);
    courseRepository = module.get(CourseRepository);
    courseCycleRepository = module.get(CourseCycleRepository);
    courseCycleProfessorRepository = module.get(CourseCycleProfessorRepository);
    courseCycleAllowedEvaluationTypeRepository = module.get(
      CourseCycleAllowedEvaluationTypeRepository,
    );
    evaluationRepository = module.get(EvaluationRepository);
    courseCycleDriveProvisioningService = module.get(
      CourseCycleDriveProvisioningService,
    );
    storageService = module.get(StorageService);
    materialFolderRepository = module.get(MaterialFolderRepository);
    materialRepository = module.get(MaterialRepository);
    fileResourceRepository = module.get(FileResourceRepository);
    materialCatalogRepository = module.get(MaterialCatalogRepository);

    (cacheService.get as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return current cycle labels and canViewPreviousCycles=true for FULL', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-15T12:00:00.000Z'));

    (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue(
      currentCycle,
    );
    (dataSource.query as jest.Mock).mockResolvedValue([{ typeCode: 'FULL' }]);
    (evaluationRepository.findAllWithUserAccess as jest.Mock).mockResolvedValue(
      [
        {
          id: 'bank-0',
          number: 0,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-06-30'),
          evaluationType: {
            code: 'BANCO_ENUNCIADOS',
            name: 'BANCO ENUNCIADOS',
          },
          enrollmentEvaluations: [
            {
              isActive: true,
              accessStartDate: new Date('2026-01-01'),
              accessEndDate: new Date('2026-06-30'),
            },
          ],
        },
        {
          id: 'e1',
          number: 1,
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-02'),
          evaluationType: { code: 'PC', name: 'PRACTICA CALIFICADA' },
          enrollmentEvaluations: [],
        },
        {
          id: 'e2',
          number: 2,
          startDate: new Date('2026-04-10'),
          endDate: new Date('2026-04-20'),
          evaluationType: { code: 'PC', name: 'PRACTICA CALIFICADA' },
          enrollmentEvaluations: [
            {
              isActive: true,
              accessStartDate: new Date('2026-04-10'),
              accessEndDate: new Date('2026-04-20'),
            },
          ],
        },
        {
          id: 'e3',
          number: 3,
          startDate: new Date('2026-05-10'),
          endDate: new Date('2026-05-20'),
          evaluationType: { code: 'PC', name: 'PRACTICA CALIFICADA' },
          enrollmentEvaluations: [
            {
              isActive: true,
              accessStartDate: new Date('2026-05-10'),
              accessEndDate: new Date('2026-05-20'),
            },
          ],
        },
        {
          id: 'e4',
          number: 1,
          startDate: new Date('2026-06-10'),
          endDate: new Date('2026-06-20'),
          evaluationType: { code: 'EX', name: 'EXAMEN' },
          enrollmentEvaluations: [],
        },
      ],
    );

    const result = await service.getStudentCurrentCycleContent('100', '501');

    expect(result.evaluations).toHaveLength(4);
    expect(result.evaluations.some((item) => item.id === 'bank-0')).toBe(false);
    expect(result.canViewPreviousCycles).toBe(true);
    expect(result.evaluations[0].label).toBe(STUDENT_EVALUATION_LABELS.LOCKED);
    expect(result.evaluations[1].label).toBe(
      STUDENT_EVALUATION_LABELS.IN_PROGRESS,
    );
    expect(result.evaluations[2].label).toBe(
      STUDENT_EVALUATION_LABELS.UPCOMING,
    );
    expect(result.evaluations[3].label).toBe(STUDENT_EVALUATION_LABELS.LOCKED);
    expect(result.evaluations[0].shortName).toBe('PC1');
    expect(result.evaluations[0].fullName).toBe('Practica Calificada 1');
    expect(result.evaluations[0].evaluationTypeCode).toBe('PC');
    expect(result.evaluations[3].evaluationTypeCode).toBe('EX');
  });

  it('should return full access content for assigned professor', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-15T12:00:00.000Z'));

    (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue(
      currentCycle,
    );
    (
      courseCycleProfessorRepository.canProfessorReadCourseCycle as jest.Mock
    ).mockResolvedValue(true);
    (evaluationRepository.findByCourseCycle as jest.Mock).mockResolvedValue([
      {
        id: 'e1',
        number: 1,
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-02'),
        evaluationType: { code: 'PC', name: 'PRACTICA CALIFICADA' },
      },
      {
        id: 'e2',
        number: 2,
        startDate: new Date('2026-05-10'),
        endDate: new Date('2026-05-20'),
        evaluationType: { code: 'EX', name: 'EXAMEN' },
      },
    ]);

    const result = await service.getCourseContent(
      '100',
      '501',
      ROLE_CODES.PROFESSOR,
    );

    expect(result.evaluations).toHaveLength(2);
    expect(result.evaluations[0].evaluationTypeCode).toBe('PC');
    expect(result.evaluations[0].shortName).toBe('PC1');
    expect(result.evaluations[0].fullName).toBe('Practica Calificada 1');
    expect(result.evaluations[0].label).toBe('Completado');
    expect(result.evaluations[1].evaluationTypeCode).toBe('EX');
    expect(result.evaluations[1].shortName).toBe('EX2');
    expect(result.evaluations[1].fullName).toBe('Examen 2');
    expect(result.evaluations[1].label).toBe(
      STUDENT_EVALUATION_LABELS.UPCOMING,
    );
    expect(
      courseCycleProfessorRepository.canProfessorReadCourseCycle,
    ).toHaveBeenCalledWith('100', '501');
    expect(evaluationRepository.findByCourseCycle).toHaveBeenCalledWith('100');
    expect(evaluationRepository.findAllWithUserAccess).not.toHaveBeenCalled();
  });

  it('should return full access content for admin users', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-15T12:00:00.000Z'));

    (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue(
      currentCycle,
    );
    (evaluationRepository.findByCourseCycle as jest.Mock).mockResolvedValue([
      {
        id: 'e1',
        number: 1,
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-02'),
        evaluationType: { code: 'PC', name: 'PRACTICA CALIFICADA' },
      },
    ]);

    const result = await service.getCourseContent(
      '100',
      '900',
      ROLE_CODES.ADMIN,
    );

    expect(result.evaluations).toHaveLength(1);
    expect(result.evaluations[0].evaluationTypeCode).toBe('PC');
    expect(result.evaluations[0].shortName).toBe('PC1');
    expect(result.evaluations[0].fullName).toBe('Practica Calificada 1');
    expect(result.evaluations[0].label).toBe('Completado');
    expect(
      courseCycleProfessorRepository.canProfessorReadCourseCycle,
    ).not.toHaveBeenCalled();
    expect(evaluationRepository.findByCourseCycle).toHaveBeenCalledWith('100');
    expect(evaluationRepository.findAllWithUserAccess).not.toHaveBeenCalled();
  });

  it('should hide previous-cycles tab for PARTIAL without previous access', async () => {
    (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue(
      currentCycle,
    );
    (dataSource.query as jest.Mock).mockResolvedValue([
      { typeCode: 'PARTIAL' },
    ]);
    (
      courseCycleRepository.hasAccessiblePreviousByCourseIdAndUserId as jest.Mock
    ).mockResolvedValue(false);
    (evaluationRepository.findAllWithUserAccess as jest.Mock).mockResolvedValue(
      [],
    );

    const result = await service.getStudentCurrentCycleContent('100', '501');
    expect(result.canViewPreviousCycles).toBe(false);

    await expect(
      service.getStudentPreviousCycles('100', '501'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should list all previous cycles when tab is enabled', async () => {
    (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue(
      currentCycle,
    );
    (dataSource.query as jest.Mock).mockResolvedValue([
      { typeCode: 'PARTIAL' },
    ]);
    (
      courseCycleRepository.hasAccessiblePreviousByCourseIdAndUserId as jest.Mock
    ).mockResolvedValue(true);
    (
      courseCycleRepository.findPreviousByCourseId as jest.Mock
    ).mockResolvedValue([
      { academicCycle: { code: '2025-2' } },
      { academicCycle: { code: '2025-1' } },
    ]);

    const result = await service.getStudentPreviousCycles('100', '501');
    expect(result.cycles).toEqual([
      { cycleCode: '2025-2' },
      { cycleCode: '2025-1' },
    ]);
  });

  it('should allow admin to list previous cycles without enrollment', async () => {
    (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue(
      currentCycle,
    );
    (
      courseCycleRepository.findPreviousByCourseId as jest.Mock
    ).mockResolvedValue([
      { academicCycle: { code: '2025-2' } },
      { academicCycle: { code: '2025-1' } },
    ]);

    const result = await service.getStudentPreviousCycles(
      '100',
      '900',
      ROLE_CODES.ADMIN,
    );

    expect(result.cycles).toEqual([
      { cycleCode: '2025-2' },
      { cycleCode: '2025-1' },
    ]);
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('should return archived/locked labels on previous cycle content', async () => {
    (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue(
      currentCycle,
    );
    (dataSource.query as jest.Mock).mockResolvedValue([{ typeCode: 'FULL' }]);
    (
      courseCycleRepository.findByCourseIdAndCycleCode as jest.Mock
    ).mockResolvedValue({
      id: '55',
      academicCycle: { code: '2025-2', startDate: new Date('2025-01-01') },
    });
    (evaluationRepository.findAllWithUserAccess as jest.Mock).mockResolvedValue(
      [
        {
          id: 'p1',
          number: 1,
          evaluationType: { code: 'PC', name: 'PRACTICA CALIFICADA' },
          enrollmentEvaluations: [
            {
              isActive: true,
              accessStartDate: new Date('2025-01-01'),
              accessEndDate: new Date('2025-02-01'),
            },
          ],
        },
        {
          id: 'p2',
          number: 2,
          evaluationType: { code: 'PC', name: 'PRACTICA CALIFICADA' },
          enrollmentEvaluations: [],
        },
      ],
    );

    const result = await service.getStudentPreviousCycleContent(
      '100',
      '2025-2',
      '501',
    );

    expect(result.evaluations[0].label).toBe(
      STUDENT_EVALUATION_LABELS.ARCHIVED,
    );
    expect(result.evaluations[1].label).toBe(STUDENT_EVALUATION_LABELS.LOCKED);
    expect(result.evaluations[0].evaluationTypeCode).toBe('PC');
    expect(result.evaluations[1].evaluationTypeCode).toBe('PC');
  });

  it('should return archived labels for admin on previous cycle content', async () => {
    (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue(
      currentCycle,
    );
    (
      courseCycleRepository.findByCourseIdAndCycleCode as jest.Mock
    ).mockResolvedValue({
      id: '55',
      academicCycle: { code: '2025-2', startDate: new Date('2025-01-01') },
    });
    (evaluationRepository.findByCourseCycle as jest.Mock).mockResolvedValue([
      {
        id: 'p1',
        number: 1,
        evaluationType: { code: 'PC', name: 'PRACTICA CALIFICADA' },
      },
      {
        id: 'p2',
        number: 1,
        evaluationType: { code: 'EX', name: 'EXAMEN' },
      },
    ]);

    const result = await service.getStudentPreviousCycleContent(
      '100',
      '2025-2',
      '900',
      ROLE_CODES.ADMIN,
    );

    expect(result.evaluations[0].hasAccess).toBe(true);
    expect(result.evaluations[0].label).toBe(
      STUDENT_EVALUATION_LABELS.ARCHIVED,
    );
    expect(result.evaluations[1].hasAccess).toBe(true);
    expect(result.evaluations[1].label).toBe(
      STUDENT_EVALUATION_LABELS.ARCHIVED,
    );
    expect(evaluationRepository.findByCourseCycle).toHaveBeenCalledWith('55');
    expect(evaluationRepository.findAllWithUserAccess).not.toHaveBeenCalled();
  });

  it('should return archived labels for professor assigned to current course cycle on previous cycle content', async () => {
    (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue(
      currentCycle,
    );
    (
      courseCycleProfessorRepository.canProfessorReadCourseCycle as jest.Mock
    ).mockResolvedValue(true);
    (
      courseCycleRepository.findByCourseIdAndCycleCode as jest.Mock
    ).mockResolvedValue({
      id: '55',
      academicCycle: { code: '2025-2', startDate: new Date('2025-01-01') },
    });
    (evaluationRepository.findByCourseCycle as jest.Mock).mockResolvedValue([
      {
        id: 'p1',
        number: 1,
        evaluationType: { code: 'PC', name: 'PRACTICA CALIFICADA' },
      },
      {
        id: 'p2',
        number: 1,
        evaluationType: { code: 'EX', name: 'EXAMEN' },
      },
    ]);

    const result = await service.getStudentPreviousCycleContent(
      '100',
      '2025-2',
      '700',
      ROLE_CODES.PROFESSOR,
    );

    expect(result.evaluations[0].hasAccess).toBe(true);
    expect(result.evaluations[0].label).toBe(
      STUDENT_EVALUATION_LABELS.ARCHIVED,
    );
    expect(result.evaluations[1].hasAccess).toBe(true);
    expect(result.evaluations[1].label).toBe(
      STUDENT_EVALUATION_LABELS.ARCHIVED,
    );
    expect(
      courseCycleProfessorRepository.canProfessorReadCourseCycle,
    ).toHaveBeenCalledWith('100', '700');
    expect(evaluationRepository.findByCourseCycle).toHaveBeenCalledWith('55');
    expect(evaluationRepository.findAllWithUserAccess).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException when user has no active enrollment', async () => {
    (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue(
      currentCycle,
    );
    (dataSource.query as jest.Mock).mockResolvedValue([]);

    await expect(
      service.getStudentCurrentCycleContent('100', '501'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw NotFoundException when requested cycle code is not previous', async () => {
    (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue(
      currentCycle,
    );
    (dataSource.query as jest.Mock).mockResolvedValue([{ typeCode: 'FULL' }]);
    (
      courseCycleRepository.findByCourseIdAndCycleCode as jest.Mock
    ).mockResolvedValue({
      id: '200',
      academicCycle: { code: '2026-1', startDate: new Date('2026-01-01') },
    });

    await expect(
      service.getStudentPreviousCycleContent('100', '2026-1', '501'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should return paginated admin course cycles with professors', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-02-15T10:00:00.000Z'));

    (
      courseCycleRepository.findAdminCourseCyclesPage as jest.Mock
    ).mockResolvedValue({
      rows: [
        {
          courseCycleId: 'cc1',
          studentCount: 37,
          courseId: 'c1',
          courseCode: 'MAT101',
          courseName: 'Matematica',
          academicCycleId: 'ac1',
          academicCycleCode: '2026-1',
          academicCycleStartDate: new Date('2026-01-01'),
          academicCycleEndDate: new Date('2026-06-30'),
          professors: [
            {
              id: 'prof-1',
              firstName: 'Ana',
              lastName1: 'Perez',
              lastName2: '',
              profilePhotoUrl: null,
            },
          ],
        },
      ],
      totalItems: 1,
    });

    const result = await service.findAdminCourseCycles({
      page: 1,
      pageSize: 20,
      search: 'MAT',
    });

    expect(
      courseCycleRepository.findAdminCourseCyclesPage,
    ).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      search: 'MAT',
    });
    expect(result.totalItems).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.items[0].academicCycle.isCurrent).toBe(true);
    expect(result.items[0].studentCount).toBe(37);
    expect(result.items[0].professors).toHaveLength(1);
    expect(result.items[0].professors[0].id).toBe('prof-1');
  });

  it('should return totalPages=0 when there are no admin course cycles', async () => {
    (
      courseCycleRepository.findAdminCourseCyclesPage as jest.Mock
    ).mockResolvedValue({
      rows: [],
      totalItems: 0,
    });

    const result = await service.findAdminCourseCycles({
      page: 1,
      pageSize: 10,
    });

    expect(result.items).toEqual([]);
    expect(result.totalItems).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it('should use pageSize=10 by default on admin course cycles list', async () => {
    (
      courseCycleRepository.findAdminCourseCyclesPage as jest.Mock
    ).mockResolvedValue({
      rows: [],
      totalItems: 0,
    });

    await service.findAdminCourseCycles({});

    expect(
      courseCycleRepository.findAdminCourseCyclesPage,
    ).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
      search: undefined,
    });
  });

  it('should assign professor when user is active and has PROFESSOR role', async () => {
    (courseCycleRepository.findById as jest.Mock).mockResolvedValue({
      id: 'cc-1',
    });
    (dataSource.query as jest.Mock).mockResolvedValue([
      { isActiveProfessor: 1 },
    ]);
    (dataSource.transaction as jest.Mock).mockImplementation(async (cb) => {
      await cb({});
    });

    await service.assignProfessorToCourseCycle('cc-1', 'prof-1');

    expect(dataSource.query).toHaveBeenCalledWith(expect.any(String), [
      'prof-1',
      'PROFESSOR',
    ]);
    expect(courseCycleProfessorRepository.upsertAssign).toHaveBeenCalledWith(
      'cc-1',
      'prof-1',
      expect.anything(),
    );
  });

  it('should reject assignment when user is not an active professor', async () => {
    (courseCycleRepository.findById as jest.Mock).mockResolvedValue({
      id: 'cc-1',
    });
    (dataSource.query as jest.Mock).mockResolvedValue([
      { isActiveProfessor: 0 },
    ]);

    await expect(
      service.assignProfessorToCourseCycle('cc-1', 'user-1'),
    ).rejects.toThrow(BadRequestException);

    expect(courseCycleProfessorRepository.upsertAssign).not.toHaveBeenCalled();
  });

  it('should update evaluation structure for an existing course cycle', async () => {
    (courseCycleRepository.findById as jest.Mock).mockResolvedValue({
      id: 'cc-1',
    });
    (evaluationRepository.findTypesByIds as jest.Mock).mockResolvedValue([
      { id: '1' },
      { id: '2' },
    ]);
    (
      courseCycleAllowedEvaluationTypeRepository.findActiveByCourseCycleId as jest.Mock
    ).mockResolvedValue([{ evaluationTypeId: '9' }]);
    (dataSource.transaction as jest.Mock).mockImplementation(async (cb) => {
      await cb({});
    });

    const result = await service.updateCourseCycleEvaluationStructure('cc-1', [
      '1',
      '2',
    ]);

    expect(evaluationRepository.findTypesByIds).toHaveBeenCalledWith([
      '1',
      '2',
    ]);
    expect(
      courseCycleAllowedEvaluationTypeRepository.replaceAllowedTypes,
    ).toHaveBeenCalledWith('cc-1', ['1', '2'], expect.anything());
    expect(result).toEqual({
      courseCycleId: 'cc-1',
      evaluationTypeIds: ['1', '2'],
    });
  });

  it('should reject duplicated evaluation type ids', async () => {
    (courseCycleRepository.findById as jest.Mock).mockResolvedValue({
      id: 'cc-1',
    });

    await expect(
      service.updateCourseCycleEvaluationStructure('cc-1', ['1', '1']),
    ).rejects.toThrow(BadRequestException);

    expect(evaluationRepository.findTypesByIds).not.toHaveBeenCalled();
    expect(
      courseCycleAllowedEvaluationTypeRepository.replaceAllowedTypes,
    ).not.toHaveBeenCalled();
  });

  it('should reject unknown evaluation type ids', async () => {
    (courseCycleRepository.findById as jest.Mock).mockResolvedValue({
      id: 'cc-1',
    });
    (evaluationRepository.findTypesByIds as jest.Mock).mockResolvedValue([
      { id: '1' },
    ]);

    await expect(
      service.updateCourseCycleEvaluationStructure('cc-1', ['1', '999']),
    ).rejects.toThrow(BadRequestException);

    expect(
      courseCycleAllowedEvaluationTypeRepository.replaceAllowedTypes,
    ).not.toHaveBeenCalled();
  });

  it('should reject evaluation type ids with blank values after trim', async () => {
    (courseCycleRepository.findById as jest.Mock).mockResolvedValue({
      id: 'cc-1',
    });

    await expect(
      service.updateCourseCycleEvaluationStructure('cc-1', ['1', '   ']),
    ).rejects.toThrow(BadRequestException);

    expect(evaluationRepository.findTypesByIds).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when course cycle does not exist on structure update', async () => {
    (courseCycleRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      service.updateCourseCycleEvaluationStructure('missing', ['1']),
    ).rejects.toThrow(NotFoundException);

    expect(evaluationRepository.findTypesByIds).not.toHaveBeenCalled();
  });

  it('should return early when structure is unchanged', async () => {
    (courseCycleRepository.findById as jest.Mock).mockResolvedValue({
      id: 'cc-1',
    });
    (evaluationRepository.findTypesByIds as jest.Mock).mockResolvedValue([
      { id: '1' },
      { id: '2' },
    ]);
    (
      courseCycleAllowedEvaluationTypeRepository.findActiveByCourseCycleId as jest.Mock
    ).mockResolvedValue([{ evaluationTypeId: '1' }, { evaluationTypeId: '2' }]);

    const result = await service.updateCourseCycleEvaluationStructure('cc-1', [
      '1',
      '2',
    ]);

    expect(result).toEqual({
      courseCycleId: 'cc-1',
      evaluationTypeIds: ['1', '2'],
    });
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(
      courseCycleAllowedEvaluationTypeRepository.replaceAllowedTypes,
    ).not.toHaveBeenCalled();
  });

  it('should return student bank structure when enrollment is active', async () => {
    (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue(
      currentCycle,
    );
    (dataSource.query as jest.Mock).mockResolvedValue([
      { typeCode: 'PARTIAL' },
    ]);
    (
      courseCycleRepository.hasAccessiblePreviousByCourseIdAndUserId as jest.Mock
    ).mockResolvedValue(false);
    (evaluationRepository.findTypesByCodes as jest.Mock).mockResolvedValue([
      { id: '2', code: 'EX', name: 'Examen' },
      { id: '1', code: 'PC', name: 'Practica Calificada' },
    ]);
    (evaluationRepository.findByCourseCycle as jest.Mock).mockResolvedValue([
      {
        id: 'bank-0',
        number: 0,
        evaluationTypeId: 'bank-type',
        evaluationType: {
          code: 'BANCO_ENUNCIADOS',
          name: 'BANCO ENUNCIADOS',
        },
      },
      {
        id: 'pc-1',
        number: 1,
        evaluationTypeId: '1',
        evaluationType: { code: 'PC', name: 'Practica Calificada' },
      },
      {
        id: 'pc-2',
        number: 2,
        evaluationTypeId: '1',
        evaluationType: { code: 'PC', name: 'Practica Calificada' },
      },
      {
        id: 'ex-1',
        number: 1,
        evaluationTypeId: '2',
        evaluationType: { code: 'EX', name: 'Examen' },
      },
    ]);
    (
      materialCatalogRepository.findFolderStatusByCode as jest.Mock
    ).mockResolvedValue({
      id: 'folder-active',
    });
    (
      materialFolderRepository.findRootsByEvaluation as jest.Mock
    ).mockResolvedValue([
      { id: 'root-pc', name: 'Practicas Calificadas' },
      { id: 'root-ex', name: 'Examenes' },
    ]);
    (
      materialFolderRepository.findByParentFolderIds as jest.Mock
    ).mockResolvedValue([
      { id: 'leaf-pc1', parentFolderId: 'root-pc', name: 'PC1' },
      { id: 'leaf-pc2', parentFolderId: 'root-pc', name: 'PC2' },
      { id: 'leaf-ex1', parentFolderId: 'root-ex', name: 'EX1' },
    ]);
    (materialFolderRepository.findSubFolders as jest.Mock)
      .mockResolvedValueOnce([
        { id: 'leaf-pc1', name: 'PC1' },
        { id: 'leaf-pc2', name: 'PC2' },
      ])
      .mockResolvedValueOnce([{ id: 'leaf-ex1', name: 'EX1' }]);

    const result = await service.getStudentBankStructure('100', '501');

    expect(result.courseCycleId).toBe('100');
    expect(result.cycleCode).toBe('2026-1');
    expect(result.bankEvaluationId).toBe('bank-0');
    expect(result.items).toEqual([
      {
        evaluationTypeId: '2',
        evaluationTypeCode: 'EX',
        evaluationTypeName: 'Examenes',
        entries: [
          {
            evaluationId: 'ex-1',
            evaluationTypeCode: 'EX',
            evaluationTypeName: 'Examenes',
            evaluationNumber: 1,
            label: 'EX1',
            folderId: 'leaf-ex1',
            folderName: 'EX1',
          },
        ],
      },
      {
        evaluationTypeId: '1',
        evaluationTypeCode: 'PC',
        evaluationTypeName: 'Practicas Calificadas',
        entries: [
          {
            evaluationId: 'pc-1',
            evaluationTypeCode: 'PC',
            evaluationTypeName: 'Practicas Calificadas',
            evaluationNumber: 1,
            label: 'PC1',
            folderId: 'leaf-pc1',
            folderName: 'PC1',
          },
          {
            evaluationId: 'pc-2',
            evaluationTypeCode: 'PC',
            evaluationTypeName: 'Practicas Calificadas',
            evaluationNumber: 2,
            label: 'PC2',
            folderId: 'leaf-pc2',
            folderName: 'PC2',
          },
        ],
      },
    ]);
  });

  it('should reject student bank structure when user has no active enrollment', async () => {
    (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue(
      currentCycle,
    );
    (dataSource.query as jest.Mock).mockResolvedValue([]);

    await expect(service.getStudentBankStructure('100', '501')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should return bank entries with null folderId when folder tree is not created yet', async () => {
    (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue(
      currentCycle,
    );
    (dataSource.query as jest.Mock).mockResolvedValue([{ typeCode: 'FULL' }]);
    (evaluationRepository.findTypesByCodes as jest.Mock).mockResolvedValue([
      { id: '1', code: 'PC', name: 'Practica Calificada' },
    ]);
    (evaluationRepository.findByCourseCycle as jest.Mock).mockResolvedValue([
      {
        id: 'bank-0',
        number: 0,
        evaluationTypeId: 'bank-type',
        evaluationType: {
          code: 'BANCO_ENUNCIADOS',
          name: 'BANCO ENUNCIADOS',
        },
      },
      {
        id: 'pc-1',
        number: 1,
        evaluationTypeId: '1',
        evaluationType: { code: 'PC', name: 'Practica Calificada' },
      },
    ]);
    (
      materialCatalogRepository.findFolderStatusByCode as jest.Mock
    ).mockResolvedValue({
      id: 'folder-active',
    });
    (
      materialFolderRepository.findRootsByEvaluation as jest.Mock
    ).mockResolvedValue([]);

    const result = await service.getStudentBankStructure('100', '501');

    expect(result.bankEvaluationId).toBe('bank-0');
    expect(result.items[0].entries).toEqual([
      {
        evaluationId: 'pc-1',
        evaluationTypeCode: 'PC',
        evaluationTypeName: 'Practicas Calificadas',
        evaluationNumber: 1,
        label: 'PC1',
        folderId: null,
        folderName: null,
      },
    ]);
  });

  it('should include bank-only folders from material_folder even without academic evaluation rows', async () => {
    (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue(
      currentCycle,
    );
    (dataSource.query as jest.Mock).mockResolvedValue([{ typeCode: 'FULL' }]);
    (evaluationRepository.findTypesByCodes as jest.Mock).mockResolvedValue([
      { id: '1', code: 'PC', name: 'Practica Calificada' },
      { id: '3', code: 'PD', name: 'Practica Dirigida' },
    ]);
    (evaluationRepository.findByCourseCycle as jest.Mock).mockResolvedValue([
      {
        id: 'bank-0',
        number: 0,
        evaluationTypeId: 'bank-type',
        evaluationType: {
          code: 'BANCO_ENUNCIADOS',
          name: 'BANCO ENUNCIADOS',
        },
      },
      {
        id: 'pc-1',
        number: 1,
        evaluationTypeId: '1',
        evaluationType: { code: 'PC', name: 'Practica Calificada' },
      },
    ]);
    (
      materialCatalogRepository.findFolderStatusByCode as jest.Mock
    ).mockResolvedValue({
      id: 'folder-active',
    });
    (
      materialFolderRepository.findRootsByEvaluation as jest.Mock
    ).mockResolvedValue([
      { id: 'root-pc', name: 'Practicas Calificadas' },
      { id: 'root-pd', name: 'Practicas Dirigidas' },
    ]);
    (
      materialFolderRepository.findByParentFolderIds as jest.Mock
    ).mockResolvedValue([
      { id: 'leaf-pc1', parentFolderId: 'root-pc', name: 'PC1' },
      { id: 'leaf-pd1', parentFolderId: 'root-pd', name: 'PD1' },
      { id: 'leaf-pd2', parentFolderId: 'root-pd', name: 'PD2' },
    ]);
    (materialFolderRepository.findSubFolders as jest.Mock)
      .mockResolvedValueOnce([{ id: 'leaf-pc1', name: 'PC1' }])
      .mockResolvedValueOnce([
        { id: 'leaf-pd1', name: 'PD1' },
        { id: 'leaf-pd2', name: 'PD2' },
      ]);

    const result = await service.getStudentBankStructure('100', '501');

    expect(result.items).toEqual([
      {
        evaluationTypeId: '1',
        evaluationTypeCode: 'PC',
        evaluationTypeName: 'Practicas Calificadas',
        entries: [
          {
            evaluationId: 'pc-1',
            evaluationTypeCode: 'PC',
            evaluationTypeName: 'Practicas Calificadas',
            evaluationNumber: 1,
            label: 'PC1',
            folderId: 'leaf-pc1',
            folderName: 'PC1',
          },
        ],
      },
      {
        evaluationTypeId: '3',
        evaluationTypeCode: 'PD',
        evaluationTypeName: 'Practicas Dirigidas',
        entries: [
          {
            evaluationId: null,
            evaluationTypeCode: 'PD',
            evaluationTypeName: 'Practicas Dirigidas',
            evaluationNumber: 1,
            label: 'PD1',
            folderId: 'leaf-pd1',
            folderName: 'PD1',
          },
          {
            evaluationId: null,
            evaluationTypeCode: 'PD',
            evaluationTypeName: 'Practicas Dirigidas',
            evaluationNumber: 2,
            label: 'PD2',
            folderId: 'leaf-pd2',
            folderName: 'PD2',
          },
        ],
      },
    ]);
  });

  it('should upload a bank document to the resolved Drive leaf folder', async () => {
    const now = new Date('2026-03-16T05:10:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue({
      ...currentCycle,
      course: { ...currentCycle.course, code: 'MAT101' },
      academicCycle: { ...currentCycle.academicCycle, code: '2026-1' },
    });
    (
      courseCycleProfessorRepository.canProfessorReadCourseCycle as jest.Mock
    ).mockResolvedValue(true);
    (evaluationRepository.findByCourseCycle as jest.Mock).mockResolvedValue([
      {
        id: 'bank-0',
        number: 0,
        evaluationTypeId: 'bank-type',
        evaluationType: {
          code: 'BANCO_ENUNCIADOS',
          name: 'BANCO ENUNCIADOS',
        },
      },
      {
        id: 'pc1',
        number: 1,
        evaluationTypeId: 'pc-type',
        evaluationType: { code: 'PC', name: 'Practica Calificada' },
      },
    ]);
    (
      materialCatalogRepository.findFolderStatusByCode as jest.Mock
    ).mockResolvedValue({ id: 'folder-active' });
    (
      materialCatalogRepository.findMaterialStatusByCode as jest.Mock
    ).mockResolvedValue({ id: 'material-active' });
    (
      materialFolderRepository.findRootsByEvaluation as jest.Mock
    ).mockResolvedValue([]);
    (materialFolderRepository.create as jest.Mock)
      .mockResolvedValueOnce({ id: 'root-pc', name: 'Practicas Calificadas' })
      .mockResolvedValueOnce({ id: 'leaf-pc1', name: 'PC1' });
    (materialFolderRepository.findSubFolders as jest.Mock).mockResolvedValue(
      [],
    );
    (
      fileResourceRepository.findByHashAndSizeWithinEvaluation as jest.Mock
    ).mockResolvedValueOnce(null);
    (storageService.calculateHash as jest.Mock).mockResolvedValue('hash-123');
    (
      courseCycleDriveProvisioningService.ensureBankLeafFolder as jest.Mock
    ).mockResolvedValue({
      scopeFolderId: 'scope-1',
      bankFolderId: 'bank-folder-1',
      typeFolderId: 'type-folder-1',
      leafFolderId: 'leaf-drive-1',
    });
    (storageService.saveFile as jest.Mock).mockResolvedValue({
      storageProvider: 'GDRIVE',
      storageKey: 'drive-file-1',
      storageUrl: 'https://drive.google.com/uc?id=drive-file-1&export=download',
    });

    const manager = {
      create: jest.fn((_entity, payload) => ({ ...payload })),
      save: jest.fn(async (payload) => {
        if ('checksumHash' in payload) {
          return { id: 'file-1', ...payload };
        }
        if ('versionNumber' in payload) {
          return { id: 'version-1', ...payload };
        }
        if ('materialFolderId' in payload && !payload.id) {
          return { id: 'material-1', ...payload };
        }
        return payload;
      }),
    };
    (dataSource.transaction as jest.Mock).mockImplementation(async (cb) => {
      return await cb(manager);
    });

    const result = await service.uploadBankDocument(
      { id: 'prof-1' } as any,
      '100',
      {
        evaluationTypeCode: 'PC',
        evaluationNumber: '1',
        displayName: 'Banco PC1',
      },
      {
        originalname: 'Banco PC1.pdf',
        mimetype: 'application/pdf',
        size: 1200,
        buffer: Buffer.from('%PDF test'),
      } as Express.Multer.File,
      ROLE_CODES.PROFESSOR,
    );

    expect(storageService.saveFile).toHaveBeenCalledWith(
      'Banco PC1.pdf',
      expect.any(Buffer),
      'application/pdf',
      { targetDriveFolderId: 'leaf-drive-1' },
    );
    expect(result).toEqual({
      courseCycleId: '100',
      bankEvaluationId: 'bank-0',
      evaluationId: 'pc1',
      evaluationTypeId: 'pc-type',
      evaluationTypeCode: 'PC',
      evaluationTypeName: 'Practicas Calificadas',
      evaluationNumber: 1,
      folderId: 'leaf-pc1',
      folderName: 'PC1',
      materialId: 'material-1',
      fileResourceId: 'file-1',
      currentVersionId: 'version-1',
      displayName: 'Banco PC1',
      originalName: 'Banco PC1.pdf',
      mimeType: 'application/pdf',
      sizeBytes: '1200',
      storageProvider: 'GDRIVE',
      driveFileId: 'drive-file-1',
      downloadPath: '/materials/material-1/download',
      authorizedViewPath: '/materials/material-1/authorized-link?mode=view',
      lastModifiedAt: now,
    });
  });

  it('should upload a bank-only document to an existing PD folder without academic evaluation row', async () => {
    const now = new Date('2026-03-16T05:10:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue({
      ...currentCycle,
      course: { ...currentCycle.course, code: 'MAT101' },
      academicCycle: { ...currentCycle.academicCycle, code: '2026-1' },
    });
    (
      courseCycleProfessorRepository.canProfessorReadCourseCycle as jest.Mock
    ).mockResolvedValue(true);
    (evaluationRepository.findTypeByCode as jest.Mock).mockResolvedValue({
      id: 'pd-type',
      code: 'PD',
      name: 'Practica Dirigida',
    });
    (evaluationRepository.findByCourseCycle as jest.Mock).mockResolvedValue([
      {
        id: 'bank-0',
        number: 0,
        evaluationTypeId: 'bank-type',
        evaluationType: {
          code: 'BANCO_ENUNCIADOS',
          name: 'BANCO ENUNCIADOS',
        },
      },
    ]);
    (
      materialCatalogRepository.findFolderStatusByCode as jest.Mock
    ).mockResolvedValue({ id: 'folder-active' });
    (
      materialCatalogRepository.findMaterialStatusByCode as jest.Mock
    ).mockResolvedValue({ id: 'material-active' });
    (
      materialFolderRepository.findRootsByEvaluation as jest.Mock
    ).mockResolvedValue([{ id: 'root-pd', name: 'Practicas Dirigidas' }]);
    (
      materialFolderRepository.findByParentFolderIds as jest.Mock
    ).mockResolvedValue([
      { id: 'leaf-pd1', parentFolderId: 'root-pd', name: 'PD1' },
    ]);
    (materialFolderRepository.findSubFolders as jest.Mock).mockResolvedValue([
      { id: 'leaf-pd1', name: 'PD1' },
    ]);
    (
      fileResourceRepository.findByHashAndSizeWithinEvaluation as jest.Mock
    ).mockResolvedValueOnce(null);
    (storageService.calculateHash as jest.Mock).mockResolvedValue('hash-pd');
    (
      courseCycleDriveProvisioningService.ensureBankLeafFolder as jest.Mock
    ).mockResolvedValue({
      scopeFolderId: 'scope-1',
      bankFolderId: 'bank-folder-1',
      typeFolderId: 'type-folder-pd',
      leafFolderId: 'leaf-drive-pd1',
    });
    (storageService.saveFile as jest.Mock).mockResolvedValue({
      storageProvider: 'GDRIVE',
      storageKey: 'drive-file-pd',
      storageUrl: 'https://drive.google.com/uc?id=drive-file-pd&export=download',
    });

    const manager = {
      create: jest.fn((_entity, payload) => ({ ...payload })),
      save: jest.fn(async (payload) => {
        if ('checksumHash' in payload) {
          return { id: 'file-pd', ...payload };
        }
        if ('versionNumber' in payload) {
          return { id: 'version-pd', ...payload };
        }
        if ('materialFolderId' in payload && !payload.id) {
          return { id: 'material-pd', ...payload };
        }
        return payload;
      }),
    };
    (dataSource.transaction as jest.Mock).mockImplementation(async (cb) => {
      return await cb(manager);
    });

    const result = await service.uploadBankDocument(
      { id: 'prof-1' } as any,
      '100',
      {
        evaluationTypeCode: 'PD',
        evaluationNumber: '1',
        displayName: 'Banco PD1',
      },
      {
        originalname: 'Banco PD1.pdf',
        mimetype: 'application/pdf',
        size: 1100,
        buffer: Buffer.from('%PDF test'),
      } as Express.Multer.File,
      ROLE_CODES.PROFESSOR,
    );

    expect(
      courseCycleDriveProvisioningService.ensureBankLeafFolder,
    ).toHaveBeenCalledWith({
      courseCycleId: '100',
      courseCode: 'MAT101',
      cycleCode: '2026-1',
      bankCards: [],
      bankFolders: [
        {
          groupName: 'Practicas Dirigidas',
          items: ['PD1'],
        },
      ],
      evaluationTypeCode: 'PD',
      evaluationNumber: 1,
      groupName: 'Practicas Dirigidas',
      leafFolderName: 'PD1',
    });
    expect(result).toEqual({
      courseCycleId: '100',
      bankEvaluationId: 'bank-0',
      evaluationId: null,
      evaluationTypeId: 'pd-type',
      evaluationTypeCode: 'PD',
      evaluationTypeName: 'Practicas Dirigidas',
      evaluationNumber: 1,
      folderId: 'leaf-pd1',
      folderName: 'PD1',
      materialId: 'material-pd',
      fileResourceId: 'file-pd',
      currentVersionId: 'version-pd',
      displayName: 'Banco PD1',
      originalName: 'Banco PD1.pdf',
      mimeType: 'application/pdf',
      sizeBytes: '1100',
      storageProvider: 'GDRIVE',
      driveFileId: 'drive-file-pd',
      downloadPath: '/materials/material-pd/download',
      authorizedViewPath: '/materials/material-pd/authorized-link?mode=view',
      lastModifiedAt: now,
    });
  });

  it('should reject upload to a bank-only target when the folder does not exist in the bank structure', async () => {
    (
      courseCycleProfessorRepository.canProfessorReadCourseCycle as jest.Mock
    ).mockResolvedValue(true);
    (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue({
      ...currentCycle,
      course: { ...currentCycle.course, code: 'MAT101' },
      academicCycle: { ...currentCycle.academicCycle, code: '2026-1' },
    });
    (
      courseCycleAllowedEvaluationTypeRepository.findActiveWithTypeByCourseCycleId as jest.Mock
    ).mockResolvedValue([
      {
        evaluationTypeId: 'pd-type',
        evaluationType: { code: 'PD', name: 'Practica Dirigida' },
      },
    ]);
    (evaluationRepository.findByCourseCycle as jest.Mock).mockResolvedValue([
      {
        id: 'bank-0',
        number: 0,
        evaluationTypeId: 'bank-type',
        evaluationType: {
          code: 'BANCO_ENUNCIADOS',
          name: 'BANCO ENUNCIADOS',
        },
      },
    ]);
    (
      materialCatalogRepository.findFolderStatusByCode as jest.Mock
    ).mockResolvedValue({ id: 'folder-active' });
    (
      materialFolderRepository.findRootsByEvaluation as jest.Mock
    ).mockResolvedValue([{ id: 'root-pd', name: 'Practicas Dirigidas' }]);
    (
      materialFolderRepository.findByParentFolderIds as jest.Mock
    ).mockResolvedValue([
      { id: 'leaf-pd2', parentFolderId: 'root-pd', name: 'PD2' },
    ]);
    (materialFolderRepository.findSubFolders as jest.Mock).mockResolvedValue([
      { id: 'leaf-pd2', name: 'PD2' },
    ]);

    await expect(
      service.uploadBankDocument(
        { id: 'prof-1' } as any,
        '100',
        {
          evaluationTypeCode: 'PD',
          evaluationNumber: '1',
          displayName: 'Banco PD1',
        },
        {
          originalname: 'Banco PD1.pdf',
          mimetype: 'application/pdf',
          size: 1100,
          buffer: Buffer.from('%PDF test'),
        } as Express.Multer.File,
        ROLE_CODES.PROFESSOR,
      ),
    ).rejects.toThrow(
      'No existe una tarjeta del banco para el tipo y numero enviados',
    );

    expect(storageService.saveFile).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('should ignore unrelated bank folders when building bank structure', async () => {
    (dataSource.query as jest.Mock).mockResolvedValue([{ typeCode: 'FULL' }]);
    (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue(
      currentCycle,
    );
    (evaluationRepository.findAllWithUserAccess as jest.Mock).mockResolvedValue([
      {
        id: 'bank-0',
        number: 0,
        evaluationType: {
          code: 'BANCO_ENUNCIADOS',
          name: 'BANCO ENUNCIADOS',
        },
        enrollmentEvaluations: [],
      },
    ]);
    (evaluationRepository.findTypesByCodes as jest.Mock).mockResolvedValue([
      { id: '3', code: 'PD', name: 'Practica Dirigida' },
    ]);
    (evaluationRepository.findByCourseCycle as jest.Mock).mockResolvedValue([
      {
        id: 'bank-0',
        number: 0,
        evaluationTypeId: 'bank-type',
        evaluationType: {
          code: 'BANCO_ENUNCIADOS',
          name: 'BANCO ENUNCIADOS',
        },
      },
    ]);
    (
      materialCatalogRepository.findFolderStatusByCode as jest.Mock
    ).mockResolvedValue({ id: 'folder-active' });
    (
      materialFolderRepository.findRootsByEvaluation as jest.Mock
    ).mockResolvedValue([{ id: 'root-pd', name: 'Practicas Dirigidas' }]);
    (
      materialFolderRepository.findByParentFolderIds as jest.Mock
    ).mockResolvedValue([
      { id: 'leaf-pd1', parentFolderId: 'root-pd', name: 'PD1' },
      { id: 'leaf-other', parentFolderId: 'root-pd', name: 'GUIA' },
      { id: 'leaf-pd0', parentFolderId: 'root-pd', name: 'PD0' },
    ]);
    (materialFolderRepository.findSubFolders as jest.Mock).mockResolvedValue([
      { id: 'leaf-pd1', name: 'PD1' },
      { id: 'leaf-other', name: 'GUIA' },
      { id: 'leaf-pd0', name: 'PD0' },
    ]);

    const result = await service.getStudentBankStructure('100', '501');

    expect(result.items).toEqual([
      {
        evaluationTypeId: '3',
        evaluationTypeCode: 'PD',
        evaluationTypeName: 'Practicas Dirigidas',
        entries: [
          {
            evaluationId: null,
            evaluationTypeCode: 'PD',
            evaluationTypeName: 'Practicas Dirigidas',
            evaluationNumber: 1,
            label: 'PD1',
            folderId: 'leaf-pd1',
            folderName: 'PD1',
          },
        ],
      },
    ]);
  });

  it('should reject duplicated bank document before uploading to Drive', async () => {
    (
      courseCycleProfessorRepository.canProfessorReadCourseCycle as jest.Mock
    ).mockResolvedValue(true);
    (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue(
      currentCycle,
    );
    (evaluationRepository.findByCourseCycle as jest.Mock).mockResolvedValue([
      {
        id: 'bank-0',
        number: 0,
        evaluationTypeId: 'bank-type',
        evaluationType: {
          code: 'BANCO_ENUNCIADOS',
          name: 'BANCO ENUNCIADOS',
        },
      },
      {
        id: 'pc1',
        number: 1,
        evaluationTypeId: 'pc-type',
        evaluationType: { code: 'PC', name: 'Practica Calificada' },
      },
    ]);
    (
      materialCatalogRepository.findFolderStatusByCode as jest.Mock
    ).mockResolvedValue({ id: 'folder-active' });
    (
      materialFolderRepository.findRootsByEvaluation as jest.Mock
    ).mockResolvedValue([{ id: 'root-pc', name: 'Practicas Calificadas' }]);
    (materialFolderRepository.findSubFolders as jest.Mock).mockResolvedValue([
      { id: 'leaf-pc1', name: 'PC1' },
    ]);
    (storageService.calculateHash as jest.Mock).mockResolvedValue('hash-123');
    (
      fileResourceRepository.findByHashAndSizeWithinEvaluation as jest.Mock
    ).mockResolvedValue({
      id: 'file-1',
    });

    await expect(
      service.uploadBankDocument(
        { id: 'prof-1' } as any,
        '100',
        {
          evaluationTypeCode: 'PC',
          evaluationNumber: '1',
          displayName: 'Banco PC1',
        },
        {
          originalname: 'Banco PC1.pdf',
          mimetype: 'application/pdf',
          size: 1200,
          buffer: Buffer.from('%PDF test'),
        } as Express.Multer.File,
        ROLE_CODES.PROFESSOR,
      ),
    ).rejects.toThrow(ConflictException);

    expect(storageService.saveFile).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('should update a bank-only folder set and synchronize Drive mutations', async () => {
    const now = new Date('2026-03-18T10:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue({
      ...currentCycle,
      course: { ...currentCycle.course, code: 'MAT101' },
      academicCycle: { ...currentCycle.academicCycle, code: '2026-1' },
    });
    (
      courseCycleProfessorRepository.canProfessorReadCourseCycle as jest.Mock
    ).mockResolvedValue(true);
    (
      courseCycleAllowedEvaluationTypeRepository.findActiveWithTypeByCourseCycleId as jest.Mock
    ).mockResolvedValue([
      {
        evaluationTypeId: 'pd-type',
        evaluationType: { code: 'PD', name: 'Practica Dirigida' },
      },
    ]);
    (evaluationRepository.findTypeByCode as jest.Mock).mockResolvedValue({
      id: 'pd-type',
      code: 'PD',
      name: 'Practica Dirigida',
    });
    (evaluationRepository.findByCourseCycle as jest.Mock).mockResolvedValue([
      {
        id: 'bank-0',
        number: 0,
        evaluationTypeId: 'bank-type',
        evaluationType: {
          code: 'BANCO_ENUNCIADOS',
          name: 'BANCO ENUNCIADOS',
        },
      },
    ]);
    (
      materialCatalogRepository.findFolderStatusByCode as jest.Mock
    ).mockImplementation(async (code: string) => {
      if (code === 'ACTIVE') {
        return { id: 'folder-active' };
      }
      if (code === 'ARCHIVED') {
        return { id: 'folder-archived' };
      }
      return null;
    });
    (
      materialFolderRepository.findRootsByEvaluation as jest.Mock
    ).mockResolvedValue([{ id: 'root-pd', name: 'Practicas Dirigidas' }]);
    (
      materialFolderRepository.findByParentFolderIds as jest.Mock
    ).mockResolvedValue([
      { id: 'leaf-pd1', parentFolderId: 'root-pd', name: 'PD1' },
      { id: 'leaf-pd2', parentFolderId: 'root-pd', name: 'PD2' },
    ]);
    (materialRepository.findByFolderIds as jest.Mock).mockResolvedValue([]);
    (materialFolderRepository.save as jest.Mock).mockImplementation(
      async (folder) => folder,
    );
    (materialFolderRepository.create as jest.Mock).mockResolvedValue({
      id: 'leaf-pd3',
      parentFolderId: 'root-pd',
      name: 'PD3',
    });
    (dataSource.transaction as jest.Mock).mockImplementation(async (cb) => {
      return await cb({} as any);
    });

    const result = await service.updateBankFolder(
      { id: 'prof-1' } as any,
      '100',
      'PD',
      {
        groupName: 'Practicas Dirigidas Actualizadas',
        items: ['PD2', 'PD3'],
      },
      ROLE_CODES.PROFESSOR,
    );

    expect(materialFolderRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'root-pd',
        name: 'Practicas Dirigidas Actualizadas',
      }),
      expect.anything(),
    );
    expect(materialFolderRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'leaf-pd1',
        folderStatusId: 'folder-archived',
      }),
      expect.anything(),
    );
    expect(materialFolderRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        parentFolderId: 'root-pd',
        name: 'PD3',
      }),
      expect.anything(),
    );
    expect(
      courseCycleDriveProvisioningService.deleteBankFolder,
    ).toHaveBeenCalledWith({
      courseCycleId: '100',
      courseCode: 'MAT101',
      cycleCode: '2026-1',
      groupName: 'Practicas Dirigidas',
      leafFolderName: 'PD1',
    });
    expect(
      courseCycleDriveProvisioningService.renameBankGroupFolder,
    ).toHaveBeenCalledWith({
      courseCycleId: '100',
      courseCode: 'MAT101',
      cycleCode: '2026-1',
      currentGroupName: 'Practicas Dirigidas',
      nextGroupName: 'Practicas Dirigidas Actualizadas',
    });
    expect(
      courseCycleDriveProvisioningService.ensureBankLeafFolder,
    ).toHaveBeenCalledWith({
      courseCycleId: '100',
      courseCode: 'MAT101',
      cycleCode: '2026-1',
      bankCards: [],
      bankFolders: [
        {
          groupName: 'Practicas Dirigidas Actualizadas',
          items: ['PD3'],
        },
      ],
      evaluationTypeCode: 'PD',
      evaluationNumber: 3,
      groupName: 'Practicas Dirigidas Actualizadas',
      leafFolderName: 'PD3',
    });
    expect(result).toEqual({
      courseCycleId: '100',
      bankEvaluationId: 'bank-0',
      evaluationTypeId: 'pd-type',
      evaluationTypeCode: 'PD',
      evaluationTypeName: 'Practicas Dirigidas Actualizadas',
      groupName: 'Practicas Dirigidas Actualizadas',
      items: ['PD2', 'PD3'],
      hasAcademicEvaluations: false,
    });
  });

  it('should reject deleting a bank-only folder group when it already contains materials', async () => {
    (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue(
      currentCycle,
    );
    (
      courseCycleProfessorRepository.canProfessorReadCourseCycle as jest.Mock
    ).mockResolvedValue(true);
    (
      courseCycleAllowedEvaluationTypeRepository.findActiveWithTypeByCourseCycleId as jest.Mock
    ).mockResolvedValue([
      {
        evaluationTypeId: 'pd-type',
        evaluationType: { code: 'PD', name: 'Practica Dirigida' },
      },
    ]);
    (evaluationRepository.findTypeByCode as jest.Mock).mockResolvedValue({
      id: 'pd-type',
      code: 'PD',
      name: 'Practica Dirigida',
    });
    (evaluationRepository.findByCourseCycle as jest.Mock).mockResolvedValue([
      {
        id: 'bank-0',
        number: 0,
        evaluationTypeId: 'bank-type',
        evaluationType: {
          code: 'BANCO_ENUNCIADOS',
          name: 'BANCO ENUNCIADOS',
        },
      },
    ]);
    (
      materialCatalogRepository.findFolderStatusByCode as jest.Mock
    ).mockResolvedValue({ id: 'folder-active' });
    (
      materialFolderRepository.findRootsByEvaluation as jest.Mock
    ).mockResolvedValue([{ id: 'root-pd', name: 'Practicas Dirigidas' }]);
    (
      materialFolderRepository.findByParentFolderIds as jest.Mock
    ).mockResolvedValue([
      { id: 'leaf-pd1', parentFolderId: 'root-pd', name: 'PD1' },
    ]);
    (materialRepository.findByFolderIds as jest.Mock).mockResolvedValue([
      { id: 'material-1' },
    ]);

    await expect(
      service.deleteBankFolder(
        { id: 'prof-1' } as any,
        '100',
        'PD',
        ROLE_CODES.PROFESSOR,
      ),
    ).rejects.toThrow(
      'No se puede eliminar o reemplazar una carpeta del banco que ya contiene archivos',
    );

    expect(
      courseCycleAllowedEvaluationTypeRepository.replaceAllowedTypes,
    ).not.toHaveBeenCalled();
    expect(
      courseCycleDriveProvisioningService.deleteBankFolder,
    ).not.toHaveBeenCalled();
  });

  it('should reject deleting a bank folder synchronized with academic evaluations', async () => {
    (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue(
      currentCycle,
    );
    (
      courseCycleProfessorRepository.canProfessorReadCourseCycle as jest.Mock
    ).mockResolvedValue(true);
    (
      courseCycleAllowedEvaluationTypeRepository.findActiveWithTypeByCourseCycleId as jest.Mock
    ).mockResolvedValue([
      {
        evaluationTypeId: 'pc-type',
        evaluationType: { code: 'PC', name: 'Practica Calificada' },
      },
    ]);
    (evaluationRepository.findTypeByCode as jest.Mock).mockResolvedValue({
      id: 'pc-type',
      code: 'PC',
      name: 'Practica Calificada',
    });
    (evaluationRepository.findByCourseCycle as jest.Mock).mockResolvedValue([
      {
        id: 'bank-0',
        number: 0,
        evaluationTypeId: 'bank-type',
        evaluationType: {
          code: 'BANCO_ENUNCIADOS',
          name: 'BANCO ENUNCIADOS',
        },
      },
      {
        id: 'pc-1',
        number: 1,
        evaluationTypeId: 'pc-type',
        evaluationType: {
          code: 'PC',
          name: 'Practica Calificada',
        },
      },
    ]);

    await expect(
      service.deleteBankFolder(
        { id: 'prof-1' } as any,
        '100',
        'PC',
        ROLE_CODES.PROFESSOR,
      ),
    ).rejects.toThrow(
      'No se puede eliminar una carpeta del banco sincronizada con evaluaciones academicas. Modifica primero la estructura de evaluaciones.',
    );
  });

  it('should allow items that differ from academic evaluations — bank is independent', async () => {
    const now = new Date('2026-03-18T10:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue({
      ...currentCycle,
      course: { ...currentCycle.course, code: 'MAT101' },
      academicCycle: { ...currentCycle.academicCycle, code: '2026-1' },
    });
    (
      courseCycleProfessorRepository.canProfessorReadCourseCycle as jest.Mock
    ).mockResolvedValue(true);
    (
      courseCycleAllowedEvaluationTypeRepository.findActiveWithTypeByCourseCycleId as jest.Mock
    ).mockResolvedValue([
      {
        evaluationTypeId: 'pc-type',
        evaluationType: { code: 'PC', name: 'Practica Calificada' },
      },
    ]);
    (evaluationRepository.findTypeByCode as jest.Mock).mockResolvedValue({
      id: 'pc-type',
      code: 'PC',
      name: 'Practica Calificada',
    });
    (evaluationRepository.findByCourseCycle as jest.Mock).mockResolvedValue([
      {
        id: 'bank-0',
        number: 0,
        evaluationTypeId: 'bank-type',
        evaluationType: { code: 'BANCO_ENUNCIADOS', name: 'BANCO ENUNCIADOS' },
      },
      {
        id: 'pc-1',
        number: 1,
        evaluationTypeId: 'pc-type',
        evaluationType: { code: 'PC', name: 'Practica Calificada' },
      },
    ]);
    (
      materialCatalogRepository.findFolderStatusByCode as jest.Mock
    ).mockImplementation(async (code: string) => {
      if (code === 'ACTIVE') return { id: 'folder-active' };
      if (code === 'ARCHIVED') return { id: 'folder-archived' };
      return null;
    });
    (
      materialFolderRepository.findRootsByEvaluation as jest.Mock
    ).mockResolvedValue([{ id: 'root-pc', name: 'Practicas Calificadas' }]);
    (
      materialFolderRepository.findByParentFolderIds as jest.Mock
    ).mockResolvedValue([
      { id: 'leaf-pc1', parentFolderId: 'root-pc', name: 'PC1' },
    ]);
    (materialRepository.findByFolderIds as jest.Mock).mockResolvedValue([]);
    (materialFolderRepository.save as jest.Mock).mockImplementation(
      async (folder) => folder,
    );
    (materialFolderRepository.create as jest.Mock).mockResolvedValue({
      id: 'leaf-pc2',
      parentFolderId: 'root-pc',
      name: 'PC2',
    });
    (dataSource.transaction as jest.Mock).mockImplementation(async (cb) => {
      return await cb({} as any);
    });

    const result = await service.updateBankFolder(
      { id: 'prof-1' } as any,
      '100',
      'PC',
      { groupName: 'Practicas Calificadas', items: ['PC2'] },
      ROLE_CODES.PROFESSOR,
    );

    expect(materialFolderRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'leaf-pc1', folderStatusId: 'folder-archived' }),
      expect.anything(),
    );
    expect(materialFolderRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ parentFolderId: 'root-pc', name: 'PC2' }),
      expect.anything(),
    );
    expect(result).toMatchObject({
      evaluationTypeCode: 'PC',
      items: ['PC2'],
      hasAcademicEvaluations: true,
    });
  });

  it('should fall back to academic items when items is undefined and has academic evaluations', async () => {
    const now = new Date('2026-03-18T10:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue({
      ...currentCycle,
      course: { ...currentCycle.course, code: 'MAT101' },
      academicCycle: { ...currentCycle.academicCycle, code: '2026-1' },
    });
    (
      courseCycleProfessorRepository.canProfessorReadCourseCycle as jest.Mock
    ).mockResolvedValue(true);
    (
      courseCycleAllowedEvaluationTypeRepository.findActiveWithTypeByCourseCycleId as jest.Mock
    ).mockResolvedValue([
      {
        evaluationTypeId: 'pc-type',
        evaluationType: { code: 'PC', name: 'Practica Calificada' },
      },
    ]);
    (evaluationRepository.findTypeByCode as jest.Mock).mockResolvedValue({
      id: 'pc-type',
      code: 'PC',
      name: 'Practica Calificada',
    });
    (evaluationRepository.findByCourseCycle as jest.Mock).mockResolvedValue([
      {
        id: 'bank-0',
        number: 0,
        evaluationTypeId: 'bank-type',
        evaluationType: { code: 'BANCO_ENUNCIADOS', name: 'BANCO ENUNCIADOS' },
      },
      {
        id: 'pc-1',
        number: 1,
        evaluationTypeId: 'pc-type',
        evaluationType: { code: 'PC', name: 'Practica Calificada' },
      },
    ]);
    (
      materialCatalogRepository.findFolderStatusByCode as jest.Mock
    ).mockImplementation(async (code: string) => {
      if (code === 'ACTIVE') return { id: 'folder-active' };
      if (code === 'ARCHIVED') return { id: 'folder-archived' };
      return null;
    });
    (
      materialFolderRepository.findRootsByEvaluation as jest.Mock
    ).mockResolvedValue([{ id: 'root-pc', name: 'Practicas Calificadas' }]);
    (
      materialFolderRepository.findByParentFolderIds as jest.Mock
    ).mockResolvedValue([
      { id: 'leaf-pc1', parentFolderId: 'root-pc', name: 'PC1' },
    ]);
    (materialRepository.findByFolderIds as jest.Mock).mockResolvedValue([]);
    (materialFolderRepository.save as jest.Mock).mockImplementation(
      async (folder) => folder,
    );
    (dataSource.transaction as jest.Mock).mockImplementation(async (cb) => {
      return await cb({} as any);
    });

    const result = await service.updateBankFolder(
      { id: 'prof-1' } as any,
      '100',
      'PC',
      { groupName: 'Practicas Calificadas' },
      ROLE_CODES.PROFESSOR,
    );

    expect(materialFolderRepository.create).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      evaluationTypeCode: 'PC',
      items: ['PC1'],
      hasAcademicEvaluations: true,
    });
  });

  it('should delete a bank-only group and sync Drive mutations', async () => {
    const now = new Date('2026-03-19T08:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    (courseCycleRepository.findFullById as jest.Mock).mockResolvedValue({
      ...currentCycle,
      course: { ...currentCycle.course, code: 'MAT101' },
      academicCycle: { ...currentCycle.academicCycle, code: '2026-1' },
    });
    (
      courseCycleProfessorRepository.canProfessorReadCourseCycle as jest.Mock
    ).mockResolvedValue(true);
    (
      courseCycleAllowedEvaluationTypeRepository.findActiveWithTypeByCourseCycleId as jest.Mock
    ).mockResolvedValue([
      {
        evaluationTypeId: 'pc-type',
        evaluationType: { code: 'PC', name: 'Practica Calificada' },
      },
      {
        evaluationTypeId: 'pd-type',
        evaluationType: { code: 'PD', name: 'Practica Dirigida' },
      },
    ]);
    (evaluationRepository.findTypeByCode as jest.Mock).mockResolvedValue({
      id: 'pd-type',
      code: 'PD',
      name: 'Practica Dirigida',
    });
    (evaluationRepository.findByCourseCycle as jest.Mock).mockResolvedValue([
      {
        id: 'bank-0',
        number: 0,
        evaluationTypeId: 'bank-type',
        evaluationType: {
          code: 'BANCO_ENUNCIADOS',
          name: 'BANCO ENUNCIADOS',
        },
      },
    ]);
    (
      materialCatalogRepository.findFolderStatusByCode as jest.Mock
    ).mockImplementation(async (code: string) => {
      if (code === 'ACTIVE') {
        return { id: 'folder-active' };
      }
      if (code === 'ARCHIVED') {
        return { id: 'folder-archived' };
      }
      return null;
    });
    (
      materialFolderRepository.findRootsByEvaluation as jest.Mock
    ).mockResolvedValue([{ id: 'root-pd', name: 'Practicas Dirigidas' }]);
    (
      materialFolderRepository.findByParentFolderIds as jest.Mock
    ).mockResolvedValue([
      { id: 'leaf-pd1', parentFolderId: 'root-pd', name: 'PD1' },
      { id: 'leaf-pd2', parentFolderId: 'root-pd', name: 'PD2' },
    ]);
    (materialRepository.findByFolderIds as jest.Mock).mockResolvedValue([]);
    (materialFolderRepository.save as jest.Mock).mockImplementation(
      async (folder) => folder,
    );
    (dataSource.transaction as jest.Mock).mockImplementation(async (cb) => {
      return await cb({} as any);
    });

    await service.deleteBankFolder(
      { id: 'prof-1' } as any,
      '100',
      'PD',
      ROLE_CODES.PROFESSOR,
    );

    expect(materialFolderRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'leaf-pd1',
        folderStatusId: 'folder-archived',
      }),
      expect.anything(),
    );
    expect(materialFolderRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'leaf-pd2',
        folderStatusId: 'folder-archived',
      }),
      expect.anything(),
    );
    expect(materialFolderRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'root-pd',
        folderStatusId: 'folder-archived',
      }),
      expect.anything(),
    );
    expect(
      courseCycleAllowedEvaluationTypeRepository.replaceAllowedTypes,
    ).not.toHaveBeenCalled();
    expect(
      courseCycleDriveProvisioningService.deleteBankFolder,
    ).toHaveBeenCalledWith({
      courseCycleId: '100',
      courseCode: 'MAT101',
      cycleCode: '2026-1',
      groupName: 'Practicas Dirigidas',
    });
  });

  it('should store intro video url and extracted drive file id', async () => {
    (courseCycleRepository.findById as jest.Mock).mockResolvedValue({
      id: '100',
    });

    await service.updateCourseCycleIntroVideo(
      '100',
      'https://drive.google.com/file/d/abcDEF_123/view',
    );

    expect(
      storageService.enforceNoCopyForViewersOnDriveFile,
    ).toHaveBeenCalledWith('abcDEF_123');

    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE course_cycle'),
      ['https://drive.google.com/file/d/abcDEF_123/view', 'abcDEF_123', '100'],
    );
  });

  it('should update course through repository contract and return updated entity', async () => {
    (courseRepository.findById as jest.Mock).mockResolvedValue({
      id: 'c1',
      code: 'MAT101',
      name: 'Matematica',
    });
    (courseRepository.findByCode as jest.Mock).mockResolvedValue(null);
    (courseRepository.updateAndReturn as jest.Mock).mockResolvedValue({
      id: 'c1',
      code: 'MAT102',
      name: 'Matematica avanzada',
    });
    (dataSource.transaction as jest.Mock).mockImplementation(async (cb) => {
      return await cb({} as any);
    });

    const result = await service.update('c1', {
      code: 'MAT102',
      name: 'Matematica avanzada',
    });

    expect(courseRepository.updateAndReturn).toHaveBeenCalledWith(
      'c1',
      {
        code: 'MAT102',
        name: 'Matematica avanzada',
      },
      expect.anything(),
    );
    expect(result).toEqual({
      id: 'c1',
      code: 'MAT102',
      name: 'Matematica avanzada',
    });
  });

  it('should update administrative status of a course', async () => {
    (courseRepository.findById as jest.Mock).mockResolvedValue({
      id: 'c1',
      code: 'MAT101',
      name: 'Matematica',
      isActive: true,
    });
    (courseRepository.updateAndReturn as jest.Mock).mockResolvedValue({
      id: 'c1',
      code: 'MAT101',
      name: 'Matematica',
      isActive: false,
    });

    const result = await service.updateStatus('c1', { isActive: false });

    expect(courseRepository.updateAndReturn).toHaveBeenCalledWith('c1', {
      isActive: false,
    });
    expect(result).toEqual({
      id: 'c1',
      code: 'MAT101',
      name: 'Matematica',
      isActive: false,
    });
  });

  it('should delete a course when it has no related rows', async () => {
    (courseRepository.findById as jest.Mock).mockResolvedValue({
      id: 'c1',
      code: 'MAT101',
      name: 'Matematica',
    });
    (courseRepository.deleteById as jest.Mock).mockResolvedValue(undefined);

    await service.delete('c1');

    expect(courseRepository.deleteById).toHaveBeenCalledWith('c1');
  });

  it('should reject delete when course has related records', async () => {
    (courseRepository.findById as jest.Mock).mockResolvedValue({
      id: 'c1',
      code: 'MAT101',
      name: 'Matematica',
    });
    (courseRepository.deleteById as jest.Mock).mockRejectedValue({
      errno: 1451,
    });

    await expect(service.delete('c1')).rejects.toThrow(ConflictException);
  });

  it('should return authorized intro video link for student with active enrollment', async () => {
    (courseCycleRepository.findById as jest.Mock).mockResolvedValue({
      id: '100',
    });
    (dataSource.query as jest.Mock)
      .mockResolvedValueOnce([{ typeCode: 'FULL' }])
      .mockResolvedValueOnce([
        {
          introVideoUrl: 'https://drive.google.com/file/d/abcDEF_123/view',
          introVideoFileId: null,
        },
      ]);

    const result = await service.getAuthorizedCourseIntroVideoLink(
      { id: '501' } as any,
      '100',
      ROLE_CODES.STUDENT,
    );

    expect(result.courseCycleId).toBe('100');
    expect(result.driveFileId).toBe('abcDEF_123');
    expect(result.url).toContain('/preview');
  });

  it('should return professor dashboard with the same shape as student dashboard', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-15T12:00:00.000Z'));

    (
      courseCycleProfessorRepository.findByProfessorUserId as jest.Mock
    ).mockResolvedValue([
      {
        assignedAt: new Date('2025-02-01T15:00:00.000Z'),
        courseCycle: {
          id: '99',
          course: {
            id: '9',
            code: 'MAT',
            name: 'Matematica',
            courseType: { code: 'CIENCIAS', name: 'Ciencias' },
            cycleLevel: { levelNumber: 1 },
          },
          academicCycle: {
            id: '199',
            code: '2025-2',
            startDate: new Date('2025-07-01T00:00:00.000Z'),
            endDate: new Date('2025-12-31T00:00:00.000Z'),
          },
          professors: [
            {
              professor: {
                id: '77',
                firstName: 'Ana',
                lastName1: 'Perez',
                lastName2: 'Lopez',
                profilePhotoUrl: null,
              },
            },
          ],
        },
      },
      {
        assignedAt: new Date('2026-02-01T15:00:00.000Z'),
        courseCycle: {
          id: '100',
          course: {
            id: '10',
            code: 'MAT',
            name: 'Matematica',
            courseType: { code: 'CIENCIAS', name: 'Ciencias' },
            cycleLevel: { levelNumber: 1 },
          },
          academicCycle: {
            id: '200',
            code: '2026-1',
            startDate: new Date('2026-01-01T00:00:00.000Z'),
            endDate: new Date('2026-06-30T00:00:00.000Z'),
          },
          professors: [
            {
              professor: {
                id: '77',
                firstName: 'Ana',
                lastName1: 'Perez',
                lastName2: 'Lopez',
                profilePhotoUrl: null,
              },
            },
          ],
        },
      },
    ]);

    const result = await service.getMyCourseCycles('77');

    expect(result).toEqual([
      {
        id: '100',
        enrolledAt: new Date('2026-02-01T15:00:00.000Z'),
        courseCycle: {
          id: '100',
          course: {
            id: '10',
            code: 'MAT',
            name: 'Matematica',
            courseType: { code: 'CIENCIAS', name: 'Ciencias' },
            cycleLevel: { name: '1° CICLO' },
          },
          academicCycle: {
            id: '200',
            code: '2026-1',
            startDate: new Date('2026-01-01T00:00:00.000Z'),
            endDate: new Date('2026-06-30T00:00:00.000Z'),
            isCurrent: true,
          },
          professors: [
            {
              id: '77',
              firstName: 'Ana',
              lastName1: 'Perez',
              lastName2: 'Lopez',
              profilePhotoUrl: null,
            },
          ],
        },
      },
    ]);
  });

  it('should assign primary color in cycle order based on incremental id', async () => {
    const courseId = '31';
    const expectedColor =
      COURSE_PRIMARY_COLOR_PALETTE[
        (Number(courseId) - 1) % COURSE_PRIMARY_COLOR_PALETTE.length
      ];

    (courseRepository.findByCode as jest.Mock).mockResolvedValue(null);
    (courseRepository.findById as jest.Mock).mockResolvedValue({
      id: courseId,
      code: 'MAT101',
      name: 'Matematica',
      primaryColor: expectedColor,
      secondaryColor: '#FFFFFF',
    });

    const create = jest.fn((payload) => payload);
    const save = jest
      .fn()
      .mockResolvedValueOnce({
        id: courseId,
        code: 'MAT101',
        name: 'Matematica',
        primaryColor: null,
        secondaryColor: '#FFFFFF',
        courseTypeId: '2',
        cycleLevelId: '1',
      })
      .mockResolvedValueOnce({
        id: courseId,
        code: 'MAT101',
        name: 'Matematica',
        primaryColor: expectedColor,
        secondaryColor: '#FFFFFF',
        courseTypeId: '2',
        cycleLevelId: '1',
      });

    (dataSource.transaction as jest.Mock).mockImplementation(async (cb) =>
      cb({
        getRepository: () => ({
          create,
          save,
        }),
      }),
    );

    await service.create({
      code: 'MAT101',
      name: 'Matematica',
      primaryColor: '#000000',
      secondaryColor: '#FFFFFF',
      courseTypeId: '2',
      cycleLevelId: '1',
    });

    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        id: courseId,
        primaryColor: expectedColor,
      }),
    );
  });

  it('should restart color cycle when id exceeds palette size', async () => {
    const courseId = String(COURSE_PRIMARY_COLOR_PALETTE.length + 1);
    (courseRepository.findByCode as jest.Mock).mockResolvedValue(null);
    (courseRepository.findById as jest.Mock).mockResolvedValue({
      id: courseId,
      code: 'MAT201',
      name: 'Algebra',
      primaryColor: '#1E40A3',
      secondaryColor: '#FFFFFF',
    });

    const create = jest.fn((payload) => payload);
    const save = jest
      .fn()
      .mockResolvedValueOnce({
        id: courseId,
        code: 'MAT201',
        name: 'Algebra',
        primaryColor: null,
        secondaryColor: '#FFFFFF',
        courseTypeId: '2',
        cycleLevelId: '1',
      })
      .mockResolvedValueOnce({
        id: courseId,
        code: 'MAT201',
        name: 'Algebra',
        primaryColor: COURSE_PRIMARY_COLOR_PALETTE[0],
        secondaryColor: '#FFFFFF',
        courseTypeId: '2',
        cycleLevelId: '1',
      });

    (dataSource.transaction as jest.Mock).mockImplementation(async (cb) =>
      cb({
        getRepository: () => ({
          create,
          save,
        }),
      }),
    );

    await service.create({
      code: 'MAT201',
      name: 'Algebra',
      secondaryColor: '#FFFFFF',
      courseTypeId: '2',
      cycleLevelId: '1',
    });

    expect(save).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        id: courseId,
        primaryColor: COURSE_PRIMARY_COLOR_PALETTE[0],
      }),
    );
  });
});

import {
  BadRequestException,
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

describe('CoursesService student views', () => {
  let service: CoursesService;
  let dataSource: jest.Mocked<DataSource>;
  let cacheService: jest.Mocked<RedisCacheService>;
  let courseRepository: jest.Mocked<CourseRepository>;
  let courseCycleRepository: jest.Mocked<CourseCycleRepository>;
  let courseCycleProfessorRepository: jest.Mocked<CourseCycleProfessorRepository>;
  let courseCycleAllowedEvaluationTypeRepository: jest.Mocked<CourseCycleAllowedEvaluationTypeRepository>;
  let evaluationRepository: jest.Mocked<EvaluationRepository>;

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
    expect(result.evaluations[0].name).toBe('Practica Calificada 1');
    expect(result.evaluations[0].userStatus.hasAccess).toBe(true);
    expect(result.evaluations[0].userStatus.status).toBe('COMPLETED');
    expect(result.evaluations[1].name).toBe('Examen 2');
    expect(result.evaluations[1].userStatus.hasAccess).toBe(true);
    expect(result.evaluations[1].userStatus.status).toBe('UPCOMING');
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
    expect(result.evaluations[0].name).toBe('Practica Calificada 1');
    expect(result.evaluations[0].userStatus.hasAccess).toBe(true);
    expect(result.evaluations[0].userStatus.status).toBe('COMPLETED');
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
    (
      courseCycleAllowedEvaluationTypeRepository.findActiveWithTypeByCourseCycleId as jest.Mock
    ).mockResolvedValue([
      { evaluationTypeId: '2', evaluationType: { code: 'EX', name: 'Examen' } },
      {
        evaluationTypeId: '1',
        evaluationType: { code: 'PC', name: 'Practica Calificada' },
      },
    ]);

    const result = await service.getStudentBankStructure('100', '501');

    expect(result.courseCycleId).toBe('100');
    expect(result.cycleCode).toBe('2026-1');
    expect(result.items).toEqual([
      {
        evaluationTypeId: '2',
        evaluationTypeCode: 'EX',
        evaluationTypeName: 'Examenes',
      },
      {
        evaluationTypeId: '1',
        evaluationTypeCode: 'PC',
        evaluationTypeName: 'Practicas Calificadas',
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

  it('should store intro video url and extracted drive file id', async () => {
    (courseCycleRepository.findById as jest.Mock).mockResolvedValue({
      id: '100',
    });

    await service.updateCourseCycleIntroVideo(
      '100',
      'https://drive.google.com/file/d/abcDEF_123/view',
    );

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
            cycleLevel: { name: '1 Ciclo' },
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
});

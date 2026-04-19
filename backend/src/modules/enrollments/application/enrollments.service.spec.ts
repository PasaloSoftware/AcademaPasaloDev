import { BadRequestException, ConflictException } from '@nestjs/common';
import { MySqlErrorCode } from '@common/interfaces/database-error.interface';
import { Test } from '@nestjs/testing';
import type { EntityManager } from 'typeorm';
import { DataSource } from 'typeorm';
import { EnrollmentsService } from '@modules/enrollments/application/enrollments.service';
import { EnrollmentRepository } from '@modules/enrollments/infrastructure/enrollment.repository';
import { EnrollmentStatusRepository } from '@modules/enrollments/infrastructure/enrollment-status.repository';
import { EnrollmentEvaluationRepository } from '@modules/enrollments/infrastructure/enrollment-evaluation.repository';
import { EnrollmentTypeRepository } from '@modules/enrollments/infrastructure/enrollment-type.repository';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { MediaAccessMembershipDispatchService } from '@modules/media-access/application/media-access-membership-dispatch.service';
import { SettingsService } from '@modules/settings/application/settings.service';
import { CourseCycleRepository } from '@modules/courses/infrastructure/course-cycle.repository';
import { COURSE_CACHE_KEYS } from '@modules/courses/domain/course.constants';

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;

  const managerMock = {
    query: jest.fn(),
    getRepository: jest.fn(),
  } as unknown as EntityManager;

  const dataSourceMock = {
    query: jest.fn(),
    transaction: jest.fn(async (cb: (manager: EntityManager) => unknown) => {
      return await cb(managerMock);
    }),
  };

  const enrollmentRepositoryMock = {
    findActiveByUserAndCourseCycle: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    findMyEnrollments: jest.fn(),
    findAdminStudentsByCourseCyclePage: jest.fn(),
  };

  const enrollmentStatusRepositoryMock = {
    findByCode: jest.fn(),
  };

  const enrollmentEvaluationRepositoryMock = {
    createMany: jest.fn(),
    findEvaluationIdsToRevokeAfterEnrollmentCancellation: jest.fn(),
    findCourseCycleIdsToRevokeAfterEnrollmentCancellation: jest.fn(),
  };

  const enrollmentTypeRepositoryMock = {
    findByCode: jest.fn(),
  };

  const cacheServiceMock = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    invalidateGroup: jest.fn(),
  };

  const mediaAccessMembershipDispatchServiceMock = {
    enqueueGrantForUserEvaluations: jest.fn(),
    enqueueGrantForUserCourseCycles: jest.fn(),
    enqueueRevokeForUserEvaluations: jest.fn(),
    enqueueRevokeForUserCourseCycles: jest.fn(),
  };

  const settingsServiceMock = {
    getString: jest.fn().mockResolvedValue('ac-2026-1'),
  };

  const courseCycleRepositoryMock = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        EnrollmentsService,
        { provide: DataSource, useValue: dataSourceMock },
        { provide: EnrollmentRepository, useValue: enrollmentRepositoryMock },
        {
          provide: EnrollmentStatusRepository,
          useValue: enrollmentStatusRepositoryMock,
        },
        {
          provide: EnrollmentEvaluationRepository,
          useValue: enrollmentEvaluationRepositoryMock,
        },
        {
          provide: EnrollmentTypeRepository,
          useValue: enrollmentTypeRepositoryMock,
        },
        { provide: RedisCacheService, useValue: cacheServiceMock },
        {
          provide: MediaAccessMembershipDispatchService,
          useValue: mediaAccessMembershipDispatchServiceMock,
        },
        {
          provide: SettingsService,
          useValue: settingsServiceMock,
        },
        {
          provide: CourseCycleRepository,
          useValue: courseCycleRepositoryMock,
        },
      ],
    }).compile();

    service = moduleRef.get(EnrollmentsService);
  });

  it('enroll rechaza usuarios sin rol STUDENT activo', async () => {
    enrollmentRepositoryMock.findActiveByUserAndCourseCycle.mockResolvedValue(
      null,
    );
    (managerMock.query as jest.Mock).mockResolvedValue([
      { isActiveStudent: 0 },
    ]);

    await expect(
      service.enroll({
        userId: '9',
        courseCycleId: '20',
        enrollmentTypeCode: 'FULL',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(enrollmentTypeRepositoryMock.findByCode).not.toHaveBeenCalled();
  });

  it('findMyEnrollments retorna cycleLevel en formato ordinal uppercase', async () => {
    cacheServiceMock.get.mockResolvedValue(null);
    enrollmentRepositoryMock.findMyEnrollments.mockResolvedValue([
      {
        id: 'enr-1',
        enrolledAt: new Date('2026-01-10T10:00:00.000Z'),
        courseCycle: {
          id: 'cc-1',
          course: {
            id: 'c-1',
            code: 'MAT101',
            name: 'Matematica',
            courseType: { code: 'REGULAR', name: 'Regular' },
            cycleLevel: { levelNumber: 1 },
          },
          academicCycle: {
            id: 'ac-1',
            code: '2026-1',
            startDate: new Date('2026-01-01T00:00:00.000Z'),
            endDate: new Date('2026-06-30T00:00:00.000Z'),
          },
          professors: [],
        },
      },
    ]);

    const result = await service.findMyEnrollments('user-1');

    expect(result[0].courseCycle.course.cycleLevel.name).toBe('1\u00B0 CICLO');
  });

  it('findAdminStudentsByCourseCycle retorna listado paginado', async () => {
    courseCycleRepositoryMock.findById.mockResolvedValue({ id: 'cc-1' });
    enrollmentRepositoryMock.findAdminStudentsByCourseCyclePage.mockResolvedValue(
      {
        rows: [
          {
            enrollmentId: 'enr-1',
            userId: 'u-1',
            fullName: 'Maria Ramos',
            email: 'maria@pucp.edu.pe',
          },
        ],
        totalItems: 1,
      },
    );

    const result = await service.findAdminStudentsByCourseCycle('cc-1', {
      page: 1,
      pageSize: 10,
      search: 'maria',
    });

    expect(result.items).toEqual([
      {
        enrollmentId: 'enr-1',
        userId: 'u-1',
        fullName: 'Maria Ramos',
        email: 'maria@pucp.edu.pe',
      },
    ]);
    expect(result.totalItems).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('findAdminStudentsByCourseCycle rechaza courseCycle inexistente', async () => {
    courseCycleRepositoryMock.findById.mockResolvedValue(null);

    await expect(
      service.findAdminStudentsByCourseCycle('cc-x', {
        page: 1,
        pageSize: 10,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(
      enrollmentRepositoryMock.findAdminStudentsByCourseCyclePage,
    ).not.toHaveBeenCalled();
  });

  it('enroll FULL con historicos encola grant de course_cycle para base e historicos', async () => {
    enrollmentRepositoryMock.findActiveByUserAndCourseCycle.mockResolvedValue(
      null,
    );
    (managerMock.query as jest.Mock).mockResolvedValue([
      { isActiveStudent: 1 },
    ]);
    enrollmentTypeRepositoryMock.findByCode.mockResolvedValue({
      id: 'type-full',
      code: 'FULL',
    });
    enrollmentStatusRepositoryMock.findByCode.mockResolvedValue({
      id: 'status-active',
      code: 'ACTIVE',
    });

    const managerCourseCycleRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: '100',
        courseId: '10',
        academicCycle: {
          code: '2026-1',
          startDate: new Date('2026-01-01T00:00:00.000Z'),
          endDate: new Date('2026-06-30T00:00:00.000Z'),
        },
      }),
      find: jest.fn().mockResolvedValue([{ id: '90' }, { id: '80' }]),
    };
    const managerEvaluationRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'ev-1',
          courseCycleId: '100',
          evaluationType: { code: 'PC' },
        },
        {
          id: 'ev-2',
          courseCycleId: '90',
          evaluationType: { code: 'EX' },
        },
      ]),
    };

    (managerMock.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity && entity.name === 'CourseCycle')
        return managerCourseCycleRepo;
      if (entity && entity.name === 'Evaluation') return managerEvaluationRepo;
      return { findOne: jest.fn(), find: jest.fn() };
    });

    enrollmentRepositoryMock.create.mockResolvedValue({
      id: 'enr-1',
      userId: '9',
      courseCycleId: '100',
    });

    await service.enroll({
      userId: '9',
      courseCycleId: '100',
      enrollmentTypeCode: 'FULL',
      historicalCourseCycleIds: ['90', '80'],
    });

    expect(cacheServiceMock.invalidateGroup).toHaveBeenCalledWith(
      COURSE_CACHE_KEYS.GLOBAL_ADMIN_COURSE_CYCLES_LIST_GROUP,
    );
    expect(
      mediaAccessMembershipDispatchServiceMock.enqueueGrantForUserCourseCycles,
    ).toHaveBeenCalledWith(
      '9',
      expect.arrayContaining(['100', '90', '80']),
      expect.any(String),
    );
  });

  it('enroll traduce duplicate key de matricula activa a conflicto de negocio', async () => {
    enrollmentRepositoryMock.findActiveByUserAndCourseCycle.mockResolvedValue(
      null,
    );
    (managerMock.query as jest.Mock).mockResolvedValue([
      { isActiveStudent: 1 },
    ]);
    enrollmentTypeRepositoryMock.findByCode.mockResolvedValue({
      id: 'type-full',
      code: 'FULL',
    });
    enrollmentStatusRepositoryMock.findByCode.mockResolvedValue({
      id: 'status-active',
      code: 'ACTIVE',
    });

    (managerMock.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity && entity.name === 'CourseCycle') {
        return {
          findOne: jest.fn().mockResolvedValue({
            id: '100',
            courseId: '10',
            academicCycle: {
              code: '2026-1',
              startDate: new Date('2026-01-01T00:00:00.000Z'),
              endDate: new Date('2026-06-30T00:00:00.000Z'),
            },
          }),
          find: jest.fn().mockResolvedValue([]),
        };
      }
      if (entity && entity.name === 'Evaluation') {
        return {
          find: jest.fn().mockResolvedValue([]),
        };
      }
      return { findOne: jest.fn(), find: jest.fn() };
    });

    enrollmentRepositoryMock.create.mockRejectedValue({
      driverError: {
        errno: MySqlErrorCode.DUPLICATE_ENTRY,
        message:
          "Duplicate entry for key 'uq_enrollment_active_user_course_cycle'",
      },
    });

    await expect(
      service.enroll({
        userId: '9',
        courseCycleId: '100',
        enrollmentTypeCode: 'FULL',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('getEnrollmentOptionsByCourseCycle retorna evaluaciones y ciclos historicos', async () => {
    (dataSourceMock.query as jest.Mock)
      .mockResolvedValueOnce([
        {
          baseCourseCycleId: '100',
          courseId: '10',
          courseCode: 'MAT101',
          courseName: 'Matematica',
          academicCycleCode: '2026-1',
          academicCycleStartDate: new Date('2026-01-01T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: '200',
          evaluationTypeCode: 'PC',
          evaluationTypeName: 'Practica Calificada',
          evaluationNumber: 1,
        },
      ])
      .mockResolvedValueOnce([
        {
          courseCycleId: '90',
          academicCycleCode: '2025-2',
        },
      ]);

    const result = await service.getEnrollmentOptionsByCourseCycle('100');

    expect(result.baseCourseCycleId).toBe('100');
    expect(result.evaluations[0]).toMatchObject({
      id: '200',
      evaluationTypeCode: 'PC',
      shortName: 'PC1',
    });
    expect(result.historicalCycles[0]).toMatchObject({
      courseCycleId: '90',
      academicCycleCode: '2025-2',
    });
  });

  it('getEnrollmentCourseCycleOptions retorna ciclo actual y historicos del curso', async () => {
    (dataSourceMock.query as jest.Mock)
      .mockResolvedValueOnce([
        {
          courseId: '10',
          courseCode: 'MAT101',
          courseName: 'Matematica',
        },
      ])
      .mockResolvedValueOnce([
        {
          courseCycleId: '100',
          academicCycleCode: '2026-1',
          academicCycleStartDate: new Date('2026-01-01T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          courseCycleId: '90',
          academicCycleCode: '2025-2',
        },
      ]);

    const result = await service.getEnrollmentCourseCycleOptions('10');

    expect(settingsServiceMock.getString).toHaveBeenCalledWith(
      'ACTIVE_CYCLE_ID',
    );
    expect(result.currentCycle).toEqual({
      courseCycleId: '100',
      academicCycleCode: '2026-1',
    });
    expect(result.historicalCycles).toEqual([
      {
        courseCycleId: '90',
        academicCycleCode: '2025-2',
      },
    ]);
  });

  it('cancelEnrollment invalida cache de admin course-cycles', async () => {
    enrollmentRepositoryMock.findById.mockResolvedValue({
      id: 'enr-1',
      userId: 'u-1',
      courseCycleId: 'cc-1',
    });
    enrollmentEvaluationRepositoryMock.findEvaluationIdsToRevokeAfterEnrollmentCancellation.mockResolvedValue(
      [],
    );
    enrollmentEvaluationRepositoryMock.findCourseCycleIdsToRevokeAfterEnrollmentCancellation.mockResolvedValue(
      [],
    );
    enrollmentRepositoryMock.update.mockResolvedValue(undefined);

    await service.cancelEnrollment('enr-1');

    expect(cacheServiceMock.invalidateGroup).toHaveBeenCalledWith(
      COURSE_CACHE_KEYS.GLOBAL_ADMIN_COURSE_CYCLES_LIST_GROUP,
    );
  });
});

import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import type { EntityManager } from 'typeorm';
import { DataSource } from 'typeorm';

import { UsersService } from '@modules/users/application/users.service';
import { IdentitySecurityService } from '@modules/users/application/identity-security.service';
import { UserRepository } from '@modules/users/infrastructure/user.repository';
import { RoleRepository } from '@modules/users/infrastructure/role.repository';
import { CareerRepository } from '@modules/users/infrastructure/career.repository';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { PhotoSource } from '@modules/users/domain/user.entity';
import { IDENTITY_INVALIDATION_REASONS } from '@modules/auth/interfaces/security.constants';
import type { DatabaseError } from '@common/interfaces/database-error.interface';
import { MySqlErrorCode } from '@common/interfaces/database-error.interface';
import { ROLE_CODES } from '@common/constants/role-codes.constants';
import { QUEUES } from '@infrastructure/queue/queue.constants';
import {
  MEDIA_ACCESS_JOB_NAMES,
  MEDIA_ACCESS_SYNC_SOURCES,
} from '@modules/media-access/domain/media-access.constants';
import { MediaAccessMembershipDispatchService } from '@modules/media-access/application/media-access-membership-dispatch.service';

describe('UsersService', () => {
  let usersService: UsersService;

  const dataSourceMock = {
    query: jest.fn().mockResolvedValue([]),
    transaction: jest.fn(
      async (cb: (manager: EntityManager) => unknown) =>
        await cb({} as EntityManager),
    ),
  };

  const userRepositoryMock = {
    findById: jest.fn(),
    save: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
    findAdminUsersPage: jest.fn(),
  };

  const roleRepositoryMock = {
    findByCode: jest.fn(),
    findAll: jest.fn(),
  };

  const careerRepositoryMock = {
    findById: jest.fn().mockResolvedValue({ id: 1, name: 'Contabilidad' }),
  };

  const identitySecurityServiceMock = {
    invalidateUserIdentity: jest.fn(),
  };

  const cacheServiceMock = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    invalidateGroup: jest.fn().mockResolvedValue(undefined),
  };

  const mediaAccessQueueMock = {
    add: jest.fn(),
    addBulk: jest.fn(),
  };

  const mediaAccessMembershipDispatchServiceMock = {
    enqueueRevokeForUserCourseCycles: jest.fn(),
    enqueueRevokeForUserEvaluations: jest.fn(),
    enqueueGrantForUserEvaluations: jest.fn(),
    enqueueGrantForUserCourseCycles: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: DataSource, useValue: dataSourceMock },
        { provide: UserRepository, useValue: userRepositoryMock },
        { provide: RoleRepository, useValue: roleRepositoryMock },
        { provide: CareerRepository, useValue: careerRepositoryMock },
        { provide: RedisCacheService, useValue: cacheServiceMock },
        {
          provide: IdentitySecurityService,
          useValue: identitySecurityServiceMock,
        },
        {
          provide: getQueueToken(QUEUES.MEDIA_ACCESS),
          useValue: mediaAccessQueueMock,
        },
        {
          provide: MediaAccessMembershipDispatchService,
          useValue: mediaAccessMembershipDispatchServiceMock,
        },
      ],
    }).compile();

    usersService = moduleRef.get(UsersService);
  });

  it('assignRole: duplicate entry -> ConflictException', async () => {
    const user = {
      id: '1',
      email: 'a@test.com',
      firstName: 'A',
      lastName1: null,
      lastName2: null,
      phone: null,
      career: null,
      profilePhotoUrl: null,
      photoSource: PhotoSource.NONE,
      isActive: true,
      createdAt: new Date(),
      updatedAt: null,
      roles: [],
    };

    userRepositoryMock.findById.mockResolvedValue(user);
    roleRepositoryMock.findByCode.mockResolvedValue({
      id: '2',
      code: ROLE_CODES.ADMIN,
      name: 'Admin',
    });

    const error: DatabaseError = {
      driverError: { errno: MySqlErrorCode.DUPLICATE_ENTRY },
    };
    userRepositoryMock.save.mockRejectedValue(error);

    await expect(
      usersService.assignRole('1', ROLE_CODES.ADMIN),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('createWithRole: crea usuario con rol inicial y ultimo rol activo', async () => {
    const role = { id: '2', code: ROLE_CODES.STUDENT, name: 'Alumno' };
    const createdUser = {
      id: '10',
      email: 'student@test.com',
      firstName: 'Student',
      lastName1: null,
      lastName2: null,
      phone: null,
      career: null,
      profilePhotoUrl: null,
      photoSource: PhotoSource.NONE,
      lastActiveRoleId: role.id,
      isActive: true,
      createdAt: new Date(),
      updatedAt: null,
      roles: [role],
    };

    userRepositoryMock.findByEmail.mockResolvedValue(null);
    roleRepositoryMock.findByCode.mockResolvedValue(role);
    userRepositoryMock.create.mockResolvedValue(createdUser);

    const result = await usersService.createWithRole(
      {
        email: 'student@test.com',
        firstName: 'Student',
      } as any,
      ROLE_CODES.STUDENT,
    );

    expect(roleRepositoryMock.findByCode).toHaveBeenCalledWith(
      ROLE_CODES.STUDENT,
      expect.anything(),
    );
    expect(userRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'student@test.com',
        firstName: 'Student',
        roles: [role],
        lastActiveRoleId: role.id,
      }),
      expect.anything(),
    );
    expect(result).toBe(createdUser);
    expect(mediaAccessQueueMock.add).not.toHaveBeenCalled();
  });

  it('createWithRole: admin activo encola reconciliacion de staff', async () => {
    const role = { id: '2', code: ROLE_CODES.ADMIN, name: 'Admin' };
    const createdUser = {
      id: '11',
      email: 'admin2@test.com',
      firstName: 'Admin',
      lastName1: null,
      lastName2: null,
      phone: null,
      career: null,
      profilePhotoUrl: null,
      photoSource: PhotoSource.NONE,
      lastActiveRoleId: role.id,
      isActive: true,
      createdAt: new Date(),
      updatedAt: null,
      roles: [role],
    };

    userRepositoryMock.findByEmail.mockResolvedValue(null);
    roleRepositoryMock.findByCode.mockResolvedValue(role);
    userRepositoryMock.create.mockResolvedValue(createdUser);

    await usersService.createWithRole(
      {
        email: 'admin2@test.com',
        firstName: 'Admin',
      } as any,
      ROLE_CODES.ADMIN,
    );

    expect(mediaAccessQueueMock.add).toHaveBeenCalledWith(
      MEDIA_ACCESS_JOB_NAMES.SYNC_STAFF_VIEWERS,
      expect.objectContaining({
        source: MEDIA_ACCESS_SYNC_SOURCES.USERS_ROLE_CHANGE_IMMEDIATE,
        event: 'ASSIGN_ROLE',
        userId: '11',
        roleCode: ROLE_CODES.ADMIN,
      }),
      expect.objectContaining({
        removeOnComplete: true,
      }),
    );
  });

  it('assignRole: éxito invalida identidad por cambio de rol', async () => {
    const user = {
      id: '1',
      email: 'a@test.com',
      firstName: 'A',
      lastName1: null,
      lastName2: null,
      phone: null,
      career: null,
      profilePhotoUrl: null,
      photoSource: PhotoSource.NONE,
      isActive: true,
      createdAt: new Date(),
      updatedAt: null,
      roles: [],
    };
    const role = { id: '2', code: ROLE_CODES.ADMIN, name: 'Admin' };

    userRepositoryMock.findById.mockResolvedValue(user);
    roleRepositoryMock.findByCode.mockResolvedValue(role);
    userRepositoryMock.save.mockResolvedValue({
      ...user,
      roles: [role],
    });

    await usersService.assignRole('1', ROLE_CODES.ADMIN);

    expect(
      identitySecurityServiceMock.invalidateUserIdentity,
    ).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({
        revokeSessions: false,
        reason: IDENTITY_INVALIDATION_REASONS.ROLE_CHANGE,
      }),
    );
    expect(mediaAccessQueueMock.add).toHaveBeenCalledWith(
      MEDIA_ACCESS_JOB_NAMES.SYNC_STAFF_VIEWERS,
      expect.objectContaining({
        source: MEDIA_ACCESS_SYNC_SOURCES.USERS_ROLE_CHANGE_IMMEDIATE,
        event: 'ASSIGN_ROLE',
        userId: '1',
        roleCode: ROLE_CODES.ADMIN,
      }),
      expect.objectContaining({
        removeOnComplete: true,
      }),
    );
  });

  it('update: cambio de email invalida identidad sin revocar sesiones', async () => {
    const existing = {
      id: '1',
      email: 'old@test.com',
      firstName: 'A',
      lastName1: null,
      lastName2: null,
      phone: null,
      career: null,
      profilePhotoUrl: null,
      photoSource: PhotoSource.NONE,
      isActive: true,
      createdAt: new Date(),
      updatedAt: null,
      roles: [{ id: '2', code: ROLE_CODES.ADMIN, name: 'Admin' }],
    };

    userRepositoryMock.findById.mockResolvedValue(existing);
    userRepositoryMock.findByEmail.mockResolvedValue(null);
    userRepositoryMock.save.mockResolvedValue({
      ...existing,
      email: 'new@test.com',
    });

    await usersService.update('1', { email: 'new@test.com' });

    expect(
      identitySecurityServiceMock.invalidateUserIdentity,
    ).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({
        revokeSessions: false,
        reason: IDENTITY_INVALIDATION_REASONS.SENSITIVE_UPDATE,
      }),
    );
    expect(mediaAccessQueueMock.add).toHaveBeenCalledWith(
      MEDIA_ACCESS_JOB_NAMES.SYNC_STAFF_VIEWERS,
      expect.objectContaining({
        source: MEDIA_ACCESS_SYNC_SOURCES.USERS_ROLE_CHANGE_IMMEDIATE,
        roleCode: 'EMAIL_CHANGE',
        event: 'ASSIGN_ROLE',
        userId: '1',
      }),
      expect.objectContaining({
        removeOnComplete: true,
      }),
    );
  });

  it('update: baneo revoca sesiones e invalida identidad', async () => {
    const existing = {
      id: '1',
      email: 'user@test.com',
      firstName: 'A',
      lastName1: null,
      lastName2: null,
      phone: null,
      career: null,
      profilePhotoUrl: null,
      photoSource: PhotoSource.NONE,
      isActive: true,
      createdAt: new Date(),
      updatedAt: null,
      roles: [],
    };

    userRepositoryMock.findById.mockResolvedValue(existing);
    userRepositoryMock.save.mockResolvedValue({
      ...existing,
      isActive: false,
    });

    await usersService.update('1', { isActive: false });

    expect(
      identitySecurityServiceMock.invalidateUserIdentity,
    ).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({
        revokeSessions: true,
        reason: IDENTITY_INVALIDATION_REASONS.USER_BANNED,
      }),
    );
  });

  it('update: cambio de nombre invalida identidad y caché de profesores', async () => {
    const existing = {
      id: '1',
      email: 'user@test.com',
      firstName: 'Original',
      isActive: true,
      roles: [],
    };

    userRepositoryMock.findById.mockResolvedValue(existing);
    userRepositoryMock.save.mockResolvedValue({
      ...existing,
      firstName: 'Nuevo Nombre',
    });

    await usersService.update('1', { firstName: 'Nuevo Nombre' });

    expect(
      identitySecurityServiceMock.invalidateUserIdentity,
    ).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({
        reason: IDENTITY_INVALIDATION_REASONS.SENSITIVE_UPDATE,
      }),
    );
  });

  it('update: desbaneo invalida identidad sin revocar sesiones antiguas', async () => {
    const existing = {
      id: '1',
      email: 'user@test.com',
      firstName: 'A',
      lastName1: null,
      lastName2: null,
      phone: null,
      career: null,
      profilePhotoUrl: null,
      photoSource: PhotoSource.NONE,
      isActive: false,
      createdAt: new Date(),
      updatedAt: null,
      roles: [],
    };

    userRepositoryMock.findById.mockResolvedValue(existing);
    userRepositoryMock.save.mockResolvedValue({
      ...existing,
      isActive: true,
    });

    await usersService.update('1', { isActive: true });

    expect(
      identitySecurityServiceMock.invalidateUserIdentity,
    ).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({
        revokeSessions: false,
        reason: IDENTITY_INVALIDATION_REASONS.SENSITIVE_UPDATE,
      }),
    );
  });

  it('removeRole: éxito invalida identidad por cambio de rol', async () => {
    const role = { id: '2', code: ROLE_CODES.ADMIN, name: 'Admin' };
    const user = {
      id: '1',
      email: 'a@test.com',
      firstName: 'A',
      lastName1: null,
      lastName2: null,
      phone: null,
      career: null,
      profilePhotoUrl: null,
      photoSource: PhotoSource.NONE,
      isActive: true,
      createdAt: new Date(),
      updatedAt: null,
      roles: [role],
    };

    userRepositoryMock.findById.mockResolvedValue(user);
    userRepositoryMock.save.mockResolvedValue({
      ...user,
      roles: [],
    });

    await usersService.removeRole('1', ROLE_CODES.ADMIN);

    expect(
      identitySecurityServiceMock.invalidateUserIdentity,
    ).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({
        revokeSessions: false,
        reason: IDENTITY_INVALIDATION_REASONS.ROLE_CHANGE,
      }),
    );
    expect(mediaAccessQueueMock.add).toHaveBeenCalledWith(
      MEDIA_ACCESS_JOB_NAMES.SYNC_STAFF_VIEWERS,
      expect.objectContaining({
        source: MEDIA_ACCESS_SYNC_SOURCES.USERS_ROLE_CHANGE_IMMEDIATE,
        event: 'REMOVE_ROLE',
        userId: '1',
        roleCode: ROLE_CODES.ADMIN,
      }),
      expect.objectContaining({
        removeOnComplete: true,
      }),
    );
  });

  it('removeRole: PROFESSOR revoca asignaciones y media access asociado', async () => {
    const role = { id: '3', code: ROLE_CODES.PROFESSOR, name: 'Professor' };
    const user = {
      id: '1',
      email: 'prof@test.com',
      firstName: 'Prof',
      lastName1: null,
      lastName2: null,
      phone: null,
      career: null,
      profilePhotoUrl: null,
      photoSource: PhotoSource.NONE,
      isActive: true,
      createdAt: new Date(),
      updatedAt: null,
      roles: [role],
    };

    userRepositoryMock.findById.mockResolvedValue(user);
    userRepositoryMock.save.mockResolvedValue({
      ...user,
      roles: [],
    });
    dataSourceMock.transaction.mockImplementation(
      async (cb: (manager: EntityManager) => unknown) =>
        await cb({
          query: jest
            .fn()
            .mockResolvedValueOnce([{ courseCycleId: 'cc-1' }])
            .mockResolvedValueOnce([{ evaluationId: 'ev-1' }])
            .mockResolvedValueOnce(undefined),
        } as unknown as EntityManager),
    );

    await usersService.removeRole('1', ROLE_CODES.PROFESSOR);

    expect(
      identitySecurityServiceMock.invalidateUserIdentity,
    ).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({
        professorCacheContext: {
          courseCycleIds: ['cc-1'],
          evaluationIds: ['ev-1'],
        },
      }),
    );
    expect(
      mediaAccessMembershipDispatchServiceMock.enqueueRevokeForUserCourseCycles,
    ).toHaveBeenCalledWith(
      '1',
      ['cc-1'],
      MEDIA_ACCESS_SYNC_SOURCES.USERS_ROLE_CHANGE_IMMEDIATE,
    );
    expect(
      mediaAccessMembershipDispatchServiceMock.enqueueRevokeForUserEvaluations,
    ).toHaveBeenCalledWith(
      '1',
      ['ev-1'],
      MEDIA_ACCESS_SYNC_SOURCES.USERS_ROLE_CHANGE_IMMEDIATE,
    );
  });

  it('assignRole: no encola reconciliacion para rol no admin', async () => {
    const user = {
      id: '1',
      email: 'a@test.com',
      firstName: 'A',
      lastName1: null,
      lastName2: null,
      phone: null,
      career: null,
      profilePhotoUrl: null,
      photoSource: PhotoSource.NONE,
      isActive: true,
      createdAt: new Date(),
      updatedAt: null,
      roles: [],
    };
    const role = { id: '3', code: ROLE_CODES.PROFESSOR, name: 'Professor' };

    userRepositoryMock.findById.mockResolvedValue(user);
    roleRepositoryMock.findByCode.mockResolvedValue(role);
    userRepositoryMock.save.mockResolvedValue({
      ...user,
      roles: [role],
    });

    await usersService.assignRole('1', ROLE_CODES.PROFESSOR);

    expect(mediaAccessQueueMock.add).not.toHaveBeenCalled();
  });

  it('findAdminUsersTable: usa cache base en page=1 sin filtros', async () => {
    const cached = {
      items: [],
      currentPage: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
    };
    cacheServiceMock.get.mockResolvedValue(cached);

    const result = await usersService.findAdminUsersTable({ page: 1 });

    expect(cacheServiceMock.get).toHaveBeenCalled();
    expect(userRepositoryMock.findAdminUsersPage).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });

  it('create: invalida cache base de listado admin', async () => {
    userRepositoryMock.findByEmail.mockResolvedValue(null);
    userRepositoryMock.create.mockResolvedValue({
      id: '500',
      email: 'new@test.com',
      firstName: 'Nuevo',
    });

    await usersService.create({
      email: 'new@test.com',
      firstName: 'Nuevo',
    } as any);

    expect(cacheServiceMock.invalidateGroup).toHaveBeenCalled();
  });

  it('listAdminCourseOptions: usa cache cuando existe', async () => {
    const cached = [
      {
        courseId: '11',
        courseCycleId: '41',
        courseCode: 'MAT101',
        courseName: 'Matematica Basica',
        academicCycleCode: '2026-0',
      },
    ];
    cacheServiceMock.get.mockResolvedValue(cached);

    const result = await usersService.listAdminCourseOptions();

    expect(result).toEqual(cached);
    expect(dataSourceMock.query).not.toHaveBeenCalled();
  });

  it('listAdminCourseOptions: consulta BD y cachea', async () => {
    cacheServiceMock.get.mockResolvedValue(null);
    dataSourceMock.query.mockResolvedValue([
      {
        courseId: '11',
        courseCode: 'MAT101',
        courseName: 'Matematica Basica',
      },
    ]);

    const result = await usersService.listAdminCourseOptions();

    expect(dataSourceMock.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM course c'),
    );
    expect(cacheServiceMock.set).toHaveBeenCalled();
    expect(result).toEqual([
      {
        courseId: '11',
        courseCode: 'MAT101',
        courseName: 'Matematica Basica',
      },
    ]);
  });

  it('adminOnboard: duplicate de matricula activa se traduce a conflicto', async () => {
    userRepositoryMock.findByEmail.mockResolvedValue(null);
    userRepositoryMock.create.mockResolvedValue({
      id: 'u1',
      isActive: true,
    });

    const managerRoleRepo = {
      find: jest
        .fn()
        .mockResolvedValue([
          { id: 'r-student', code: ROLE_CODES.STUDENT, name: 'Alumno' },
        ]),
    };
    const managerCourseCycleRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: '100',
        courseId: '10',
        academicCycle: {
          code: '2026-1',
          startDate: new Date('2026-01-01T00:00:00.000Z'),
          endDate: new Date('2026-12-31T00:00:00.000Z'),
        },
      }),
      find: jest.fn().mockResolvedValue([]),
    };
    const managerEvaluationRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    const managerEnrollmentRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockRejectedValue({
        driverError: {
          errno: MySqlErrorCode.DUPLICATE_ENTRY,
          message:
            "Duplicate entry for key 'uq_enrollment_active_user_course_cycle'",
        },
      }),
    };

    const managerMock = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{ id: 'type-full', code: 'FULL' }])
        .mockResolvedValueOnce([{ id: 'status-active' }]),
      getRepository: jest
        .fn()
        .mockImplementation((entity: { name?: string }) => {
          if (entity?.name === 'Role') return managerRoleRepo;
          if (entity?.name === 'CourseCycle') return managerCourseCycleRepo;
          if (entity?.name === 'Evaluation') return managerEvaluationRepo;
          if (entity?.name === 'Enrollment') return managerEnrollmentRepo;
          return {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation((data) => data),
            save: jest.fn().mockResolvedValue(null),
          };
        }),
    } as unknown as EntityManager;

    dataSourceMock.transaction.mockImplementationOnce(
      async (cb: (manager: EntityManager) => unknown) => await cb(managerMock),
    );

    await expect(
      usersService.adminOnboard({
        firstName: 'Alumno',
        email: 'alumno@test.com',
        roleCodes: [ROLE_CODES.STUDENT],
        studentEnrollment: {
          courseCycleId: '100',
          enrollmentTypeCode: 'FULL',
        },
      } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('adminEdit: rechaza quitar STUDENT si studentStateFinal no esta vacio', async () => {
    await expect(
      usersService.adminEdit(
        '1',
        {
          roleCodesFinal: [ROLE_CODES.ADMIN],
          studentStateFinal: {
            enrollments: [
              {
                courseCycleId: '100',
                enrollmentTypeCode: 'FULL',
              },
            ],
          },
          professorStateFinal: { courseCycleIds: [] },
        } as any,
        '999',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('adminEdit: rechaza quitar PROFESSOR si professorStateFinal no esta vacio', async () => {
    await expect(
      usersService.adminEdit(
        '1',
        {
          roleCodesFinal: [ROLE_CODES.STUDENT],
          studentStateFinal: { enrollments: [] },
          professorStateFinal: { courseCycleIds: ['100'] },
        } as any,
        '999',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

import 'reflect-metadata';
import { Test } from '@nestjs/testing';

import { ROLE_CODES } from '@common/constants/role-codes.constants';
import { ROLES_KEY } from '@common/decorators/roles.decorator';
import { CareersCatalogService } from '@modules/users/application/careers-catalog.service';
import { UsersService } from '@modules/users/application/users.service';
import { PhotoSource } from '@modules/users/domain/user.entity';
import { UsersController } from '@modules/users/presentation/users.controller';

describe('UsersController', () => {
  let controller: UsersController;

  const updatedUser = {
    id: '1',
    email: 'admin@test.com',
    firstName: 'Admin',
    lastName1: null,
    lastName2: null,
    phone: null,
    career: null,
    profilePhotoUrl: null,
    photoSource: PhotoSource.NONE,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActiveRoleId: null,
    roles: [{ code: ROLE_CODES.ADMIN, name: 'Administrador' }],
  };

  const usersServiceMock = {
    create: jest.fn(),
    createWithRole: jest.fn().mockResolvedValue(updatedUser),
    adminOnboard: jest.fn().mockResolvedValue({
      userId: '1',
      enrollmentId: null,
      assignedRoleCodes: [ROLE_CODES.STUDENT],
      professorCourseCycleIds: [],
    }),
    findAdminUsersTable: jest.fn().mockResolvedValue({
      items: [],
      currentPage: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
    }),
    findAdminUserDetail: jest.fn().mockResolvedValue({
      personalInfo: {
        id: '1',
        firstName: 'Admin',
        lastName1: null,
        lastName2: null,
        email: 'admin@test.com',
        phone: null,
        careerId: null,
        careerName: null,
        roles: ['Administrador'],
        isActive: true,
        profilePhotoUrl: null,
      },
      enrolledCourses: [],
      teachingCourses: [],
    }),
    findOne: jest.fn(),
    listAdminRoleFilterOptions: jest.fn().mockReturnValue([]),
    listAdminStatusFilterOptions: jest.fn().mockReturnValue([]),
    listAdminCourseOptions: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(updatedUser),
    remove: jest.fn(),
    assignRole: jest.fn(),
    removeRole: jest.fn(),
  };

  const careersCatalogServiceMock = {
    listCareers: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersServiceMock },
        {
          provide: CareersCatalogService,
          useValue: careersCatalogServiceMock,
        },
      ],
    }).compile();

    controller = moduleRef.get(UsersController);
  });

  it('update debe requerir roles ADMIN y SUPER_ADMIN', () => {
    const requiredRoles = Reflect.getMetadata(
      ROLES_KEY,
      UsersController.prototype.update,
    );

    expect(requiredRoles).toEqual([ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN]);
  });

  it('listCareers debe requerir roles ADMIN y SUPER_ADMIN', () => {
    const requiredRoles = Reflect.getMetadata(
      ROLES_KEY,
      UsersController.prototype.listCareers,
    );

    expect(requiredRoles).toEqual([ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN]);
  });

  it('listRoleFilters debe requerir roles ADMIN y SUPER_ADMIN', () => {
    const requiredRoles = Reflect.getMetadata(
      ROLES_KEY,
      UsersController.prototype.listRoleFilters,
    );

    expect(requiredRoles).toEqual([ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN]);
  });

  it('listStatusFilters debe requerir roles ADMIN y SUPER_ADMIN', () => {
    const requiredRoles = Reflect.getMetadata(
      ROLES_KEY,
      UsersController.prototype.listStatusFilters,
    );

    expect(requiredRoles).toEqual([ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN]);
  });

  it('findAdminDetail debe requerir roles ADMIN y SUPER_ADMIN', () => {
    const requiredRoles = Reflect.getMetadata(
      ROLES_KEY,
      UsersController.prototype.findAdminDetail,
    );

    expect(requiredRoles).toEqual([ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN]);
  });

  it('listCoursesCatalog debe requerir roles ADMIN y SUPER_ADMIN', () => {
    const requiredRoles = Reflect.getMetadata(
      ROLES_KEY,
      UsersController.prototype.listCoursesCatalog,
    );

    expect(requiredRoles).toEqual([ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN]);
  });

  it('listCoursesCatalog delega al servicio', async () => {
    await controller.listCoursesCatalog();
    expect(usersServiceMock.listAdminCourseOptions).toHaveBeenCalled();
  });

  it('update delega al servicio con el dto completo', async () => {
    const dto = {
      firstName: 'Nuevo Nombre',
      profilePhotoUrl: 'https://example.com/photo.jpg',
      photoSource: PhotoSource.UPLOADED,
    };

    const result = await controller.update('1', dto);

    expect(usersServiceMock.update).toHaveBeenCalledWith('1', dto);
    expect(result).toMatchObject({
      id: '1',
      firstName: 'Admin',
      email: 'admin@test.com',
    });
  });

  it('updateStatus debe requerir roles ADMIN y SUPER_ADMIN', () => {
    const requiredRoles = Reflect.getMetadata(
      ROLES_KEY,
      UsersController.prototype.updateStatus,
    );

    expect(requiredRoles).toEqual([ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN]);
  });

  it('updateStatus delega al servicio solo con isActive', async () => {
    const result = await controller.updateStatus(
      '10',
      { isActive: false } as any,
      { id: '99' } as any,
    );

    expect(usersServiceMock.update).toHaveBeenCalledWith('10', {
      isActive: false,
    });
    expect(result).toMatchObject({
      id: '1',
      firstName: 'Admin',
    });
  });

  it('updateStatus impide autodesactivación', async () => {
    await expect(
      controller.updateStatus(
        '10',
        { isActive: false } as any,
        { id: '10' } as any,
      ),
    ).rejects.toThrow('No puedes desactivar tu propia cuenta');
  });

  it('createAdmin debe requerir rol SUPER_ADMIN', () => {
    const requiredRoles = Reflect.getMetadata(
      ROLES_KEY,
      UsersController.prototype.createAdmin,
    );

    expect(requiredRoles).toEqual([ROLE_CODES.SUPER_ADMIN]);
  });

  it('createStudent delega al servicio con rol STUDENT', async () => {
    const dto = {
      email: 'student@test.com',
      firstName: 'Student',
    };

    await controller.createStudent(dto as any);

    expect(usersServiceMock.createWithRole).toHaveBeenCalledWith(
      dto,
      ROLE_CODES.STUDENT,
    );
  });

  it('createProfessor delega al servicio con rol PROFESSOR', async () => {
    const dto = {
      email: 'prof@test.com',
      firstName: 'Professor',
    };

    await controller.createProfessor(dto as any);

    expect(usersServiceMock.createWithRole).toHaveBeenCalledWith(
      dto,
      ROLE_CODES.PROFESSOR,
    );
  });

  it('createAdmin delega al servicio con rol ADMIN', async () => {
    const dto = {
      email: 'admin2@test.com',
      firstName: 'Admin',
    };

    await controller.createAdmin(dto as any);

    expect(usersServiceMock.createWithRole).toHaveBeenCalledWith(
      dto,
      ROLE_CODES.ADMIN,
    );
  });

  it('adminOnboarding debe requerir roles ADMIN y SUPER_ADMIN', () => {
    const requiredRoles = Reflect.getMetadata(
      ROLES_KEY,
      UsersController.prototype.adminOnboarding,
    );

    expect(requiredRoles).toEqual([ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN]);
  });
});

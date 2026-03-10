import 'reflect-metadata';
import { Test } from '@nestjs/testing';

import { ROLE_CODES } from '@common/constants/role-codes.constants';
import { ROLES_KEY } from '@common/decorators/roles.decorator';
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
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue(updatedUser),
    remove: jest.fn(),
    assignRole: jest.fn(),
    removeRole: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersServiceMock }],
    }).compile();

    controller = moduleRef.get(UsersController);
  });

  it('update debe requerir roles ADMIN y SUPER_ADMIN', () => {
    const requiredRoles = Reflect.getMetadata(ROLES_KEY, UsersController.prototype.update);

    expect(requiredRoles).toEqual([
      ROLE_CODES.ADMIN,
      ROLE_CODES.SUPER_ADMIN,
    ]);
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
});

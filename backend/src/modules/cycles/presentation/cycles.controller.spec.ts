import { Test, TestingModule } from '@nestjs/testing';
import { CyclesController } from './cycles.controller';
import { CyclesService } from '@modules/cycles/application/cycles.service';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { ROLE_CODES } from '@common/constants/role-codes.constants';

const mockCyclesService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  getActiveCycle: jest.fn(),
  getHistory: jest.fn(),
  updateActiveCycle: jest.fn(),
  createHistoricalCycle: jest.fn(),
  updateHistoricalCycle: jest.fn(),
};

describe('CyclesController RBAC Security', () => {
  let controller: CyclesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CyclesController],
      providers: [
        { provide: CyclesService, useValue: mockCyclesService },
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CyclesController>(CyclesController);
  });

  it('endpoint "findAll" debe estar restringido a ADMIN y SUPER_ADMIN', () => {
    const roles = Reflect.getMetadata('roles', controller.findAll);
    expect(roles).toContain(ROLE_CODES.ADMIN);
    expect(roles).toContain(ROLE_CODES.SUPER_ADMIN);
    expect(roles).not.toContain(ROLE_CODES.STUDENT);
  });

  it('endpoint "findActive" NO debe tener restricción de rol (acceso autenticado)', () => {
    const roles = Reflect.getMetadata('roles', controller.findActive);
    expect(roles).toBeUndefined();
  });

  it('endpoint "getHistory" debe estar restringido a ADMIN y SUPER_ADMIN', () => {
    const roles = Reflect.getMetadata('roles', controller.getHistory);
    expect(roles).toContain(ROLE_CODES.ADMIN);
    expect(roles).toContain(ROLE_CODES.SUPER_ADMIN);
    expect(roles).not.toContain(ROLE_CODES.STUDENT);
    expect(roles).not.toContain(ROLE_CODES.PROFESSOR);
  });

  it('endpoint "updateActive" debe estar restringido a ADMIN y SUPER_ADMIN', () => {
    const roles = Reflect.getMetadata('roles', controller.updateActive);
    expect(roles).toContain(ROLE_CODES.ADMIN);
    expect(roles).toContain(ROLE_CODES.SUPER_ADMIN);
    expect(roles).not.toContain(ROLE_CODES.STUDENT);
    expect(roles).not.toContain(ROLE_CODES.PROFESSOR);
  });

  it('endpoint "createHistorical" debe estar restringido a ADMIN y SUPER_ADMIN', () => {
    const roles = Reflect.getMetadata('roles', controller.createHistorical);
    expect(roles).toContain(ROLE_CODES.ADMIN);
    expect(roles).toContain(ROLE_CODES.SUPER_ADMIN);
    expect(roles).not.toContain(ROLE_CODES.STUDENT);
    expect(roles).not.toContain(ROLE_CODES.PROFESSOR);
  });

  it('endpoint "updateHistorical" debe estar restringido a ADMIN y SUPER_ADMIN', () => {
    const roles = Reflect.getMetadata('roles', controller.updateHistorical);
    expect(roles).toContain(ROLE_CODES.ADMIN);
    expect(roles).toContain(ROLE_CODES.SUPER_ADMIN);
    expect(roles).not.toContain(ROLE_CODES.STUDENT);
    expect(roles).not.toContain(ROLE_CODES.PROFESSOR);
  });

  it('endpoint "findOne" debe estar restringido a ADMIN y SUPER_ADMIN', () => {
    const roles = Reflect.getMetadata('roles', controller.findOne);
    expect(roles).toContain(ROLE_CODES.ADMIN);
    expect(roles).toContain(ROLE_CODES.SUPER_ADMIN);
    expect(roles).not.toContain(ROLE_CODES.STUDENT);
  });
});

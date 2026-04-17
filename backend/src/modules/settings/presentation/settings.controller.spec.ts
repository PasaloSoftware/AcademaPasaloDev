import { Test, TestingModule } from '@nestjs/testing';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SettingsController } from './settings.controller';
import { AdminSettingsService } from '@modules/settings/application/admin-settings.service';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { ROLE_CODES } from '@common/constants/role-codes.constants';
import { UpdateAdminSettingsDto } from '@modules/settings/dto/admin-settings.dto';

const mockAdminSettingsService = {
  getBundle: jest.fn(),
  updateBundle: jest.fn(),
};

describe('SettingsController RBAC Security', () => {
  let controller: SettingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        { provide: AdminSettingsService, useValue: mockAdminSettingsService },
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SettingsController>(SettingsController);
  });

  it('endpoint "getBundle" debe estar restringido a ADMIN y SUPER_ADMIN', () => {
    const roles = Reflect.getMetadata('roles', controller.getBundle);
    expect(roles).toContain(ROLE_CODES.ADMIN);
    expect(roles).toContain(ROLE_CODES.SUPER_ADMIN);
    expect(roles).not.toContain(ROLE_CODES.STUDENT);
    expect(roles).not.toContain(ROLE_CODES.PROFESSOR);
  });

  it('endpoint "updateBundle" debe estar restringido a ADMIN y SUPER_ADMIN', () => {
    const roles = Reflect.getMetadata('roles', controller.updateBundle);
    expect(roles).toContain(ROLE_CODES.ADMIN);
    expect(roles).toContain(ROLE_CODES.SUPER_ADMIN);
    expect(roles).not.toContain(ROLE_CODES.STUDENT);
    expect(roles).not.toContain(ROLE_CODES.PROFESSOR);
  });
});

describe('UpdateAdminSettingsDto — validación de entrada', () => {
  const toDto = (raw: object) =>
    plainToInstance(UpdateAdminSettingsDto, raw, { enableImplicitConversion: true });

  it('body vacío es válido (ningún campo obligatorio)', async () => {
    const errors = await validate(toDto({}));
    expect(errors).toHaveLength(0);
  });

  it('body completo con valores correctos es válido', async () => {
    const errors = await validate(
      toDto({ geoGpsThresholds: { timeWindowMinutes: 30, distanceKm: 10 }, logRetention: { days: 30 } }),
    );
    expect(errors).toHaveLength(0);
  });

  it('rechaza geoGpsThresholds como string (@IsObject)', async () => {
    const errors = await validate(toDto({ geoGpsThresholds: 'invalid' }));
    const field = errors.find((e) => e.property === 'geoGpsThresholds');
    expect(field).toBeDefined();
    expect(Object.keys(field!.constraints ?? {})).toContain('isObject');
  });

  it('rechaza logRetention como número (@IsObject)', async () => {
    const errors = await validate(toDto({ logRetention: 99 }));
    const field = errors.find((e) => e.property === 'logRetention');
    expect(field).toBeDefined();
    expect(Object.keys(field!.constraints ?? {})).toContain('isObject');
  });

  it('rechaza timeWindowMinutes fuera de rango (@Min 1, @Max 1440)', async () => {
    const errorsMin = await validate(toDto({ geoGpsThresholds: { timeWindowMinutes: 0 } }));
    const errorsMax = await validate(toDto({ geoGpsThresholds: { timeWindowMinutes: 1441 } }));
    expect(errorsMin[0]?.children?.[0]?.constraints).toHaveProperty('min');
    expect(errorsMax[0]?.children?.[0]?.constraints).toHaveProperty('max');
  });

  it('rechaza distanceKm fuera de rango (@Min 1, @Max 1000)', async () => {
    const errorsMin = await validate(toDto({ geoGpsThresholds: { distanceKm: 0 } }));
    const errorsMax = await validate(toDto({ geoGpsThresholds: { distanceKm: 1001 } }));
    expect(errorsMin[0]?.children?.[0]?.constraints).toHaveProperty('min');
    expect(errorsMax[0]?.children?.[0]?.constraints).toHaveProperty('max');
  });

  it('rechaza logRetention.days fuera de rango (@Min 7, @Max 730)', async () => {
    const errorsMin = await validate(toDto({ logRetention: { days: 6 } }));
    const errorsMax = await validate(toDto({ logRetention: { days: 731 } }));
    expect(errorsMin[0]?.children?.[0]?.constraints).toHaveProperty('min');
    expect(errorsMax[0]?.children?.[0]?.constraints).toHaveProperty('max');
  });

  it('acepta valores en los límites exactos del rango', async () => {
    const errorsMin = await validate(
      toDto({ geoGpsThresholds: { timeWindowMinutes: 1, distanceKm: 1 }, logRetention: { days: 7 } }),
    );
    const errorsMax = await validate(
      toDto({ geoGpsThresholds: { timeWindowMinutes: 1440, distanceKm: 1000 }, logRetention: { days: 730 } }),
    );
    expect(errorsMin).toHaveLength(0);
    expect(errorsMax).toHaveLength(0);
  });
});

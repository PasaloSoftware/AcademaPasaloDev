import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { TestSeeder } from './e2e/test-utils';
import { AuditExportRepository } from '../src/modules/audit/infrastructure/audit-export.repository';
import { User } from '../src/modules/users/domain/user.entity';
import { Role } from '../src/modules/users/domain/role.entity';
import { AUDIT_SOURCES } from '../src/modules/audit/interfaces/audit.constants';

jest.setTimeout(60000);

describe('AuditExportRepository (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let seeder: TestSeeder;
  let repository: AuditExportRepository;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const httpAdapterHost = app.get(HttpAdapterHost);
    const reflector = app.get(Reflector);
    app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));
    app.useGlobalInterceptors(new TransformInterceptor(reflector));

    await app.init();

    dataSource = app.get(DataSource);
    seeder = new TestSeeder(dataSource, app);
    repository = app.get(AuditExportRepository);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should prioritize lastActiveRole over fallback role and count both sources', async () => {
    const seed = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const firstUserEmail = TestSeeder.generateUniqueEmail('audit-export-a');
    const secondUserEmail = TestSeeder.generateUniqueEmail('audit-export-b');
    const uniqueSecurityCode = `LOGIN_SUCCESS_${seed}`;
    const uniqueAuditCode = `FILE_UPLOAD_${seed}`;

    const { user: userWithActiveRole } = await seeder.createAuthenticatedUser(
      firstUserEmail,
      ['ADMIN', 'SUPER_ADMIN'],
    );
    const { user: userWithFallbackRole } = await seeder.createAuthenticatedUser(
      secondUserEmail,
      ['ADMIN'],
    );

    const roleRepo = dataSource.getRepository(Role);
    const userRepo = dataSource.getRepository(User);
    const superAdminRole = await roleRepo.findOneOrFail({
      where: { code: 'SUPER_ADMIN' },
    });
    const adminRole = await roleRepo.findOneOrFail({
      where: { code: 'ADMIN' },
    });

    await userRepo.update(userWithActiveRole.id, {
      lastActiveRoleId: superAdminRole.id,
    });

    await dataSource.query(
      `
        INSERT INTO audit_action (code, name)
        VALUES (?, ?)
      `,
      [uniqueAuditCode, `Upload ${seed}`],
    );
    await dataSource.query(
      `
        INSERT INTO security_event_type (code, name)
        VALUES (?, ?)
      `,
      [uniqueSecurityCode, `Login ${seed}`],
    );

    const [auditActionRow] = await dataSource.query(
      'SELECT id FROM audit_action WHERE code = ? LIMIT 1',
      [uniqueAuditCode],
    );
    const [securityEventTypeRow] = await dataSource.query(
      'SELECT id FROM security_event_type WHERE code = ? LIMIT 1',
      [uniqueSecurityCode],
    );

    const securityDate = new Date('2026-03-14T10:00:00.000Z');
    const auditDate = new Date('2026-03-14T09:00:00.000Z');

    await dataSource.query(
      `
        INSERT INTO security_event (
          user_id,
          security_event_type_id,
          event_datetime,
          ip_address,
          user_agent,
          metadata
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        userWithActiveRole.id,
        securityEventTypeRow.id,
        securityDate,
        '127.0.0.1',
        'jest-agent',
        JSON.stringify({ source: 'integration-test' }),
      ],
    );

    await dataSource.query(
      `
        INSERT INTO audit_log (
          user_id,
          audit_action_id,
          event_datetime
        ) VALUES (?, ?, ?)
      `,
      [userWithFallbackRole.id, auditActionRow.id, auditDate],
    );

    const securityRows = await repository.findUnifiedHistory(
      {
        userId: userWithActiveRole.id,
        source: AUDIT_SOURCES.SECURITY,
        actionCode: uniqueSecurityCode,
      },
      10,
    );
    const auditRows = await repository.findUnifiedHistory(
      {
        userId: userWithFallbackRole.id,
        source: AUDIT_SOURCES.AUDIT,
        actionCode: uniqueAuditCode,
      },
      10,
    );

    expect(securityRows).toHaveLength(1);
    expect(auditRows).toHaveLength(1);
    expect(securityRows[0].userRole).toBe(superAdminRole.name);
    expect(auditRows[0].userRole).toBe(adminRole.name);
  });

  it('should filter counts by source and actionCode', async () => {
    const seed = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const userEmail = TestSeeder.generateUniqueEmail('audit-export-count');
    const uniqueSecurityCode = `SEC_COUNT_${seed}`;
    const uniqueAuditCode = `AUD_COUNT_${seed}`;
    const { user } = await seeder.createAuthenticatedUser(userEmail, ['ADMIN']);

    await dataSource.query(
      'INSERT INTO audit_action (code, name) VALUES (?, ?)',
      [uniqueAuditCode, `Audit ${seed}`],
    );
    await dataSource.query(
      'INSERT INTO security_event_type (code, name) VALUES (?, ?)',
      [uniqueSecurityCode, `Security ${seed}`],
    );

    const [auditActionRow] = await dataSource.query(
      'SELECT id FROM audit_action WHERE code = ? LIMIT 1',
      [uniqueAuditCode],
    );
    const [securityEventTypeRow] = await dataSource.query(
      'SELECT id FROM security_event_type WHERE code = ? LIMIT 1',
      [uniqueSecurityCode],
    );

    await dataSource.query(
      `INSERT INTO security_event (user_id, security_event_type_id, event_datetime) VALUES (?, ?, ?)`,
      [user.id, securityEventTypeRow.id, new Date('2026-03-14T12:00:00.000Z')],
    );
    await dataSource.query(
      `INSERT INTO audit_log (user_id, audit_action_id, event_datetime) VALUES (?, ?, ?)`,
      [user.id, auditActionRow.id, new Date('2026-03-14T12:05:00.000Z')],
    );

    const securityCount = await repository.countUnifiedHistory({
      source: AUDIT_SOURCES.SECURITY,
      actionCode: uniqueSecurityCode,
    });
    const auditCount = await repository.countUnifiedHistory({
      source: AUDIT_SOURCES.AUDIT,
      actionCode: uniqueAuditCode,
    });

    expect(securityCount).toBe(1);
    expect(auditCount).toBe(1);
  });
});

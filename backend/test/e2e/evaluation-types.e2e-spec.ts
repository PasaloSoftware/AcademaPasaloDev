import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '@src/app.module';
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';
import { TestSeeder } from './test-utils';
import { ROLE_CODES } from '@common/constants/role-codes.constants';
import { EVALUATION_TYPE_CODES } from '@modules/evaluations/domain/evaluation.constants';

describe('E2E: Evaluation types catalog', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let seeder: TestSeeder;

  let admin: { token: string };
  let superAdmin: { token: string };
  let student: { token: string };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalInterceptors(new TransformInterceptor(app.get(Reflector)));
    await app.init();

    dataSource = app.get(DataSource);
    seeder = new TestSeeder(dataSource, app);

    admin = await seeder.createAuthenticatedUser(
      TestSeeder.generateUniqueEmail('admin_eval_types'),
      [ROLE_CODES.ADMIN],
    );
    superAdmin = await seeder.createAuthenticatedUser(
      TestSeeder.generateUniqueEmail('superadmin_eval_types'),
      [ROLE_CODES.SUPER_ADMIN],
    );
    student = await seeder.createAuthenticatedUser(
      TestSeeder.generateUniqueEmail('student_eval_types'),
      [ROLE_CODES.STUDENT],
    );

    const existingRows = await dataSource.query<Array<{ code: string }>>(
      `SELECT code FROM evaluation_type`,
    );
    const existingCodes = new Set(
      existingRows.map((row) => String(row.code || '').trim().toUpperCase()),
    );

    const requiredTypes = [
      { code: 'PC', name: 'Practica Calificada' },
      { code: 'EX', name: 'Examen' },
      {
        code: EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS,
        name: 'Banco de Enunciados',
      },
    ];
    for (const item of requiredTypes) {
      if (existingCodes.has(item.code)) {
        continue;
      }
      await dataSource.query(
        `INSERT INTO evaluation_type (code, name) VALUES (?, ?)`,
        [item.code, item.name],
      );
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('admin can list evaluation types excluding BANCO_ENUNCIADOS', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/evaluations/types')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    const items = response.body.data;
    expect(Array.isArray(items)).toBe(true);
    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'PC' }),
        expect.objectContaining({ code: 'EX' }),
      ]),
    );
    expect(items).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS,
        }),
      ]),
    );
  });

  it('superadmin can list evaluation types', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/evaluations/types')
      .set('Authorization', `Bearer ${superAdmin.token}`)
      .expect(200);
  });

  it('student cannot list evaluation types', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/evaluations/types')
      .set('Authorization', `Bearer ${student.token}`)
      .expect(403);
  });
});

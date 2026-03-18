import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '@/app.module';
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';
import { TestSeeder } from './test-utils';
import { ROLE_CODES } from '@common/constants/role-codes.constants';
import { ENROLLMENT_TYPE_CODES } from '@modules/enrollments/domain/enrollment.constants';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';

describe('E2E: Feedback', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let seeder: TestSeeder;

  let admin: { user: { id: string }; token: string };
  let student: { user: { id: string }; token: string };
  let outsider: { user: { id: string }; token: string };
  let courseCycleId: string;

  const now = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

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
    const reflector = app.get(Reflector);
    app.useGlobalInterceptors(new TransformInterceptor(reflector));
    await app.init();

    dataSource = app.get(DataSource);
    seeder = new TestSeeder(dataSource, app);

    const cacheService = app.get(RedisCacheService);
    await cacheService.invalidateGroup('*');

    const start = new Date(now);
    start.setDate(now.getDate() - 1);
    const end = new Date(now);
    end.setDate(now.getDate() + 10);

    const cycle = await seeder.createCycle(
      `CYCLE-FEEDBACK-${Date.now()}`,
      formatDate(start),
      formatDate(end),
    );
    const course = await seeder.createCourse(
      `COURSE-FEEDBACK-${Date.now()}`,
      'Curso Feedback',
    );
    const courseCycle = await seeder.linkCourseCycle(course.id, cycle.id);
    courseCycleId = String(courseCycle.id);

    admin = await seeder.createAuthenticatedUser(
      TestSeeder.generateUniqueEmail('admin_feedback'),
      [ROLE_CODES.ADMIN],
    );
    student = await seeder.createAuthenticatedUser(
      TestSeeder.generateUniqueEmail('student_feedback'),
      [ROLE_CODES.STUDENT],
    );
    outsider = await seeder.createAuthenticatedUser(
      TestSeeder.generateUniqueEmail('outsider_feedback'),
      [ROLE_CODES.STUDENT],
    );

    await request(app.getHttpServer())
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        userId: student.user.id,
        courseCycleId,
        enrollmentTypeCode: ENROLLMENT_TYPE_CODES.FULL,
      })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('permite crear feedback valido', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/feedback')
      .set('Authorization', `Bearer ${student.token}`)
      .send({
        courseCycleId,
        rating: 5,
        comment: 'Muy bueno',
      })
      .expect(201);

    expect(response.body.data).toMatchObject({
      rating: 5,
      comment: 'Muy bueno',
      photoSource: 'none',
      photoUrl: null,
    });
  });

  it('permite multiples feedback del mismo estudiante en el mismo curso ciclo', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/feedback')
      .set('Authorization', `Bearer ${student.token}`)
      .send({
        courseCycleId,
        rating: 4,
        comment: 'Buen ritmo',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/feedback')
      .set('Authorization', `Bearer ${student.token}`)
      .send({
        courseCycleId,
        rating: 3,
        comment: 'Fue util',
      })
      .expect(201);

    const rows = await dataSource.query<Array<{ total: string }>>(
      `SELECT COUNT(*) AS total
       FROM course_testimony
       WHERE user_id = ? AND course_cycle_id = ?`,
      [student.user.id, courseCycleId],
    );

    expect(Number(rows[0].total)).toBeGreaterThanOrEqual(3);
  });

  it('rechaza rating menor a 1', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/feedback')
      .set('Authorization', `Bearer ${student.token}`)
      .send({
        courseCycleId,
        rating: 0,
        comment: 'Regular',
      })
      .expect(400);
  });

  it('rechaza rating mayor a 5', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/feedback')
      .set('Authorization', `Bearer ${student.token}`)
      .send({
        courseCycleId,
        rating: 6,
        comment: 'Excelente',
      })
      .expect(400);
  });

  it('rechaza comentario con menos de 3 caracteres', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/feedback')
      .set('Authorization', `Bearer ${student.token}`)
      .send({
        courseCycleId,
        rating: 4,
        comment: 'ok',
      })
      .expect(400);
  });

  it('rechaza campos no permitidos del contrato anterior (photoSource)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/feedback')
      .set('Authorization', `Bearer ${student.token}`)
      .send({
        courseCycleId,
        rating: 4,
        comment: 'Buena sesion',
        photoSource: 'none',
      })
      .expect(400);
  });

  it('rechaza feedback de estudiante sin matricula activa en el curso ciclo', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/feedback')
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({
        courseCycleId,
        rating: 4,
        comment: 'Buen curso',
      })
      .expect(403);
  });
});

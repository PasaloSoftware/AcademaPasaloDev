import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { DataSource } from 'typeorm';
import { TestSeeder } from './test-utils';
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';
import { User } from '@modules/users/domain/user.entity';
import { CourseCycle } from '@modules/courses/domain/course-cycle.entity';
import { Evaluation } from '@modules/evaluations/domain/evaluation.entity';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { ROLE_CODES } from '@common/constants/role-codes.constants';
import { ENROLLMENT_TYPE_CODES } from '@modules/enrollments/domain/enrollment.constants';
import { EVALUATION_TYPE_CODES } from '@modules/evaluations/domain/evaluation.constants';

describe('E2E: Class Events (Eventos de Clase)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let seeder: TestSeeder;

  let admin: { user: User; token: string };
  let professor: { user: User; token: string };
  let student: { user: User; token: string };
  let courseCycle: CourseCycle;
  let sameCategoryCourseCycle: CourseCycle;
  let differentCategoryCourseCycle: CourseCycle;
  let evaluation: Evaluation;
  let sameCategoryEvaluation: Evaluation;
  let differentCategoryEvaluation: Evaluation;
  let createdEventId: string;

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    const reflector = app.get(Reflector);
    app.useGlobalInterceptors(new TransformInterceptor(reflector));

    await app.init();

    dataSource = app.get(DataSource);
    const cacheService = app.get(RedisCacheService);

    await cacheService.invalidateGroup('*');
    seeder = new TestSeeder(dataSource, app);

    await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    const tables = [
      'class_event_professor',
      'class_event',
      'academic_event',
      'enrollment_evaluation',
      'enrollment',
      'course_cycle_professor',
      'course_cycle',
      'academic_cycle',
      'course',
      'user_role',
      'user_session',
      'user',
    ];
    for (const table of tables) {
      await dataSource.query(`DELETE FROM ${table}`);
    }
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');

    const cycle = await seeder.createCycle(
      `CYCLE-EVENT-${Date.now()}`,
      formatDate(yesterday),
      formatDate(nextWeek),
    );
    const course = await seeder.createCourse(
      `COURSE-EVENT-${Date.now()}`,
      'Eventos 101',
    );
    const sameCategoryCourse = await seeder.createCourse(
      `COURSE-EVENT-SAME-${Date.now()}`,
      'Eventos Ciencias 102',
    );
    const differentCategoryCourse = await seeder.createCourse(
      `COURSE-EVENT-DIFF-${Date.now()}`,
      'Eventos Letras 201',
    );

    const sciencesTypeRows = await dataSource.query(
      "SELECT id FROM course_type WHERE code = 'CIENCIAS' LIMIT 1",
    );
    const lettersTypeRows = await dataSource.query(
      "SELECT id FROM course_type WHERE code = 'LETRAS' LIMIT 1",
    );
    const sciencesTypeId = sciencesTypeRows[0]?.id;
    const lettersTypeId = lettersTypeRows[0]?.id;

    await dataSource.query(
      'UPDATE course SET course_type_id = ? WHERE id IN (?, ?)',
      [sciencesTypeId, course.id, sameCategoryCourse.id],
    );
    await dataSource.query(
      'UPDATE course SET course_type_id = ? WHERE id = ?',
      [lettersTypeId, differentCategoryCourse.id],
    );

    courseCycle = await seeder.linkCourseCycle(course.id, cycle.id);
    sameCategoryCourseCycle = await seeder.linkCourseCycle(
      sameCategoryCourse.id,
      cycle.id,
    );
    differentCategoryCourseCycle = await seeder.linkCourseCycle(
      differentCategoryCourse.id,
      cycle.id,
    );

    await dataSource.query(
      `INSERT INTO system_setting (setting_key, setting_value, description, created_at, updated_at)
       VALUES ('ACTIVE_CYCLE_ID', ?, 'Ciclo activo para pruebas E2E', NOW(), NOW())
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`,
      [cycle.id],
    );

    // Iniciar evaluación ayer para garantizar acceso activo hoy
    evaluation = await seeder.createEvaluation(
      courseCycle.id,
      EVALUATION_TYPE_CODES.PC,
      1,
      formatDate(yesterday),
      formatDate(nextWeek),
    );
    sameCategoryEvaluation = await seeder.createEvaluation(
      sameCategoryCourseCycle.id,
      EVALUATION_TYPE_CODES.PC,
      1,
      formatDate(yesterday),
      formatDate(nextWeek),
    );
    differentCategoryEvaluation = await seeder.createEvaluation(
      differentCategoryCourseCycle.id,
      EVALUATION_TYPE_CODES.PC,
      1,
      formatDate(yesterday),
      formatDate(nextWeek),
    );

    admin = await seeder.createAuthenticatedUser(
      TestSeeder.generateUniqueEmail('admin_ev'),
      [ROLE_CODES.ADMIN],
    );
    professor = await seeder.createAuthenticatedUser(
      TestSeeder.generateUniqueEmail('prof_ev'),
      [ROLE_CODES.PROFESSOR],
    );
    student = await seeder.createAuthenticatedUser(
      TestSeeder.generateUniqueEmail('student_ev'),
      [ROLE_CODES.STUDENT],
    );

    await dataSource.query(
      'INSERT INTO course_cycle_professor (course_cycle_id, professor_user_id, assigned_at) VALUES (?, ?, NOW()), (?, ?, NOW()), (?, ?, NOW())',
      [
        courseCycle.id,
        professor.user.id,
        sameCategoryCourseCycle.id,
        professor.user.id,
        differentCategoryCourseCycle.id,
        professor.user.id,
      ],
    );

    // Matricular alumno y forzar limpieza de caché
    await request(app.getHttpServer())
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        userId: student.user.id,
        courseCycleId: courseCycle.id,
        enrollmentTypeCode: ENROLLMENT_TYPE_CODES.FULL,
      })
      .expect(201);

    const cacheSvc = app.get(RedisCacheService);
    await cacheSvc.invalidateGroup('*');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/class-events - Crear evento', () => {
    it('debe crear un evento exitosamente como docente asignado', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/class-events')
        .set('Authorization', `Bearer ${professor.token}`)
        .send({
          evaluationId: evaluation.id,
          sessionNumber: 1,
          title: 'Clase 1: Introducción',
          topic: 'Conceptos básicos',
          startDatetime: tomorrow.toISOString(),
          endDatetime: new Date(tomorrow.getTime() + 7200000).toISOString(),
          liveMeetingUrl: 'https://zoom.us/j/123456789',
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      createdEventId = response.body.data.id;
    });

    it('debe rechazar creación si el horario se cruza con una sesión existente (409 Conflict)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/class-events')
        .set('Authorization', `Bearer ${professor.token}`)
        .send({
          evaluationId: evaluation.id,
          sessionNumber: 2,
          title: 'Clase 2: Traslape',
          topic: 'Test',
          startDatetime: new Date(tomorrow.getTime() + 3600000).toISOString(), // Empieza 1 hora después de la Clase 1 (que dura 2h)
          endDatetime: new Date(tomorrow.getTime() + 10800000).toISOString(),
          liveMeetingUrl: 'https://zoom.us/test',
        })
        .expect(409);

      expect(response.body.message).toContain(
        'El horario ya está ocupado por la sesión 1',
      );
    });

    it('debe rechazar creación si el horario se cruza con otro curso de la misma categoría', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/class-events')
        .set('Authorization', `Bearer ${professor.token}`)
        .send({
          evaluationId: sameCategoryEvaluation.id,
          sessionNumber: 1,
          title: 'Clase Ciencias Paralela',
          topic: 'Colisión Global',
          startDatetime: new Date(tomorrow.getTime() + 1800000).toISOString(),
          endDatetime: new Date(tomorrow.getTime() + 5400000).toISOString(),
          liveMeetingUrl: 'https://zoom.us/j/9988776655',
        })
        .expect(409);

      expect(response.body.message).toContain(
        'El horario ya está ocupado por la sesión 1',
      );
    });

    it('debe permitir creación si el horario se cruza con curso de categoría distinta', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/class-events')
        .set('Authorization', `Bearer ${professor.token}`)
        .send({
          evaluationId: differentCategoryEvaluation.id,
          sessionNumber: 1,
          title: 'Clase Letras Paralela',
          topic: 'Sin colisión entre categorías',
          startDatetime: new Date(tomorrow.getTime() + 1800000).toISOString(),
          endDatetime: new Date(tomorrow.getTime() + 5400000).toISOString(),
          liveMeetingUrl: 'https://zoom.us/j/4455667788',
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
    });

    it('debe rechazar creación por alumno (403)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/class-events')
        .set('Authorization', `Bearer ${student.token}`)
        .send({
          evaluationId: evaluation.id,
          sessionNumber: 2,
          title: 'Clase 2',
          topic: 'Test',
          startDatetime: tomorrow.toISOString(),
          endDatetime: new Date(tomorrow.getTime() + 7200000).toISOString(),
          liveMeetingUrl: 'https://zoom.us/test',
        })
        .expect(403);
    });
  });

  describe('GET /api/v1/class-events/evaluation/:evaluationId', () => {
    it('debe listar eventos para alumno matriculado', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/class-events/evaluation/${evaluation.id}`)
        .set('Authorization', `Bearer ${student.token}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/class-events/discovery/layers/:courseCycleId', () => {
    it('debe devolver solo cursos hermanos de la misma categoría en el ciclo activo', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/class-events/discovery/layers/${courseCycle.id}`)
        .set('Authorization', `Bearer ${professor.token}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      const items = response.body.data as Array<{ courseCycleId: string }>;
      const returnedIds = items.map((item) => item.courseCycleId);

      expect(returnedIds).toContain(sameCategoryCourseCycle.id);
      expect(returnedIds).not.toContain(courseCycle.id);
      expect(returnedIds).not.toContain(differentCategoryCourseCycle.id);
    });
  });

  describe('GET /api/v1/class-events/global/sessions', () => {
    it('debe devolver sesiones agrupadas por curso-ciclo con colores', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/class-events')
        .set('Authorization', `Bearer ${professor.token}`)
        .send({
          evaluationId: sameCategoryEvaluation.id,
          sessionNumber: 77,
          title: 'Layer Session A',
          topic: 'Layer Topic A',
          startDatetime: new Date(tomorrow.getTime() + 21600000).toISOString(),
          endDatetime: new Date(tomorrow.getTime() + 25200000).toISOString(),
          liveMeetingUrl: 'https://zoom.us/j/1212121212',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/class-events/global/sessions')
        .query({
          courseCycleIds: `${courseCycle.id},${sameCategoryCourseCycle.id}`,
          startDate: yesterday.toISOString(),
          endDate: nextWeek.toISOString(),
        })
        .set('Authorization', `Bearer ${professor.token}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      const groups = response.body.data as Array<{
        courseCycleId: string;
        primaryColor: string | null;
        secondaryColor: string | null;
        sessions: unknown[];
      }>;

      const mainGroup = groups.find(
        (group) => group.courseCycleId === courseCycle.id,
      );
      const siblingGroup = groups.find(
        (group) => group.courseCycleId === sameCategoryCourseCycle.id,
      );

      expect(mainGroup).toBeDefined();
      expect(siblingGroup).toBeDefined();
      expect(mainGroup?.sessions.length).toBeGreaterThan(0);
      expect(siblingGroup?.sessions.length).toBeGreaterThan(0);
      expect(mainGroup).toHaveProperty('primaryColor');
      expect(mainGroup).toHaveProperty('secondaryColor');
    });
  });

  describe('OPERACIONES SOBRE EVENTO EXISTENTE', () => {
    it('GET /api/v1/class-events/:id - Obtener detalle', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/class-events/${createdEventId}`)
        .set('Authorization', `Bearer ${student.token}`)
        .expect(200);

      expect(response.body.data.id).toBe(createdEventId);
    });

    it('PATCH /api/v1/class-events/:id - Actualizar evento', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/class-events/${createdEventId}`)
        .set('Authorization', `Bearer ${professor.token}`)
        .send({ title: 'Clase Actualizada' })
        .expect(200);
    });

    it('PATCH /api/v1/class-events/:id - Debe fallar si el nuevo horario choca con otra sesión', async () => {
      // 1. Crear sesión 2 en horario libre (4 horas después de la sesión 1)
      const res2 = await request(app.getHttpServer())
        .post('/api/v1/class-events')
        .set('Authorization', `Bearer ${professor.token}`)
        .send({
          evaluationId: evaluation.id,
          sessionNumber: 2,
          title: 'Sesión 2',
          topic: 'T2',
          startDatetime: new Date(tomorrow.getTime() + 14400000).toISOString(),
          endDatetime: new Date(tomorrow.getTime() + 18000000).toISOString(),
          liveMeetingUrl: 'https://zoom.us/s2',
        })
        .expect(201);

      const session2Id = res2.body.data.id;

      // 2. Intentar actualizar sesión 1 para que choque con sesión 2
      const resUpdate = await request(app.getHttpServer())
        .patch(`/api/v1/class-events/${createdEventId}`)
        .set('Authorization', `Bearer ${professor.token}`)
        .send({
          startDatetime: new Date(tomorrow.getTime() + 14400000).toISOString(),
          endDatetime: new Date(tomorrow.getTime() + 18000000).toISOString(),
        })
        .expect(409);

      expect(resUpdate.body.message).toContain(
        'No es posible actualizar el horario. Existe un cruce con la sesión 2',
      );
    });

    it('DELETE /api/v1/class-events/:id/cancel - Cancelar evento', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/class-events/${createdEventId}/cancel`)
        .set('Authorization', `Bearer ${professor.token}`)
        .expect(204);
    });
  });

  describe('GET /api/v1/class-events/my-schedule - Calendario Unificado', () => {
    it('debe retornar el horario para el profesor (Staff bypass)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/class-events/my-schedule')
        .query({ start: formatDate(yesterday), end: formatDate(nextWeek) })
        .set('Authorization', `Bearer ${professor.token}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('debe invalidar el cachÃ© del calendario cuando se actualiza un evento', async () => {
      const start = formatDate(yesterday);
      const end = formatDate(nextWeek);

      const createRes = await request(app.getHttpServer())
        .post('/api/v1/class-events')
        .set('Authorization', `Bearer ${professor.token}`)
        .send({
          evaluationId: evaluation.id,
          sessionNumber: 99,
          title: 'Evento Cache',
          topic: 'Cache',
          startDatetime: tomorrow.toISOString(),
          endDatetime: new Date(tomorrow.getTime() + 3600000).toISOString(),
          liveMeetingUrl: 'https://zoom.us/cache',
        })
        .expect(201);
      const cacheEventId = createRes.body.data.id;

      await request(app.getHttpServer())
        .get('/api/v1/class-events/my-schedule')
        .query({ start, end })
        .set('Authorization', `Bearer ${professor.token}`)
        .expect(200);

      const newTitle = 'CachÃ© Limpio';
      await request(app.getHttpServer())
        .patch(`/api/v1/class-events/${cacheEventId}`)
        .set('Authorization', `Bearer ${professor.token}`)
        .send({ title: newTitle })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/api/v1/class-events/my-schedule')
        .query({ start, end })
        .set('Authorization', `Bearer ${professor.token}`)
        .expect(200);

      const event = res.body.data.find((e: any) => e.id === cacheEventId);
      expect(event).toBeDefined();
      expect(event.title).toBe(newTitle);
    });
  });
});

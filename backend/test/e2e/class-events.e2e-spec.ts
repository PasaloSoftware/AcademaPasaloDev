import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { DataSource } from 'typeorm';
import { Queue } from 'bullmq';
import { TestSeeder } from './test-utils';
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';
import { User } from '@modules/users/domain/user.entity';
import { CourseCycle } from '@modules/courses/domain/course-cycle.entity';
import { Evaluation } from '@modules/evaluations/domain/evaluation.entity';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { QUEUES } from '@infrastructure/queue/queue.constants';
import { ROLE_CODES } from '@common/constants/role-codes.constants';
import { ENROLLMENT_TYPE_CODES } from '@modules/enrollments/domain/enrollment.constants';
import { EVALUATION_TYPE_CODES } from '@modules/evaluations/domain/evaluation.constants';
import { ClassEventRecordingDriveService } from '@modules/events/application/class-event-recording-drive.service';
import { DriveAccessScopeService } from '@modules/media-access/application/drive-access-scope.service';

jest.setTimeout(60000);

describe('E2E: Class Events (Eventos de Clase)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let seeder: TestSeeder;
  let notificationsQueue: Queue;
  let cacheService: RedisCacheService;
  let recordingDriveService: ClassEventRecordingDriveService;
  let driveAccessScopeService: DriveAccessScopeService;

  let admin: { user: User; token: string };
  let professor: { user: User; token: string };
  let student: { user: User; token: string };
  let courseCycle: CourseCycle;
  let sameCategoryCourseCycle: CourseCycle;
  let differentCategoryCourseCycle: CourseCycle;
  let historicalCourseCycle: CourseCycle;
  let evaluation: Evaluation;
  let sameCategoryEvaluation: Evaluation;
  let differentCategoryEvaluation: Evaluation;
  let historicalEvaluation: Evaluation;
  let createdEventId: string;
  let historicalEventId: string;

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const formatPeruLocalDatetime = (
    d: Date,
    hour: number,
    minute = 0,
  ): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hourText = String(hour).padStart(2, '0');
    const minuteText = String(minute).padStart(2, '0');

    return `${year}-${month}-${day}T${hourText}:${minuteText}:00`;
  };
  const formatPeruLocalDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

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
    notificationsQueue = app.get<Queue>(getQueueToken(QUEUES.NOTIFICATIONS));
    cacheService = app.get(RedisCacheService);
    recordingDriveService = app.get(ClassEventRecordingDriveService);
    driveAccessScopeService = app.get(DriveAccessScopeService);

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

    const historicalCycle = await seeder.createCycle(
      `CYCLE-EVENT-HIST-${Date.now()}`,
      formatDate(new Date(yesterday.getTime() - 160 * 24 * 60 * 60 * 1000)),
      formatDate(new Date(yesterday.getTime() - 120 * 24 * 60 * 60 * 1000)),
    );
    historicalCourseCycle = await seeder.linkCourseCycle(
      course.id,
      historicalCycle.id,
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
    historicalEvaluation = await seeder.createEvaluation(
      historicalCourseCycle.id,
      EVALUATION_TYPE_CODES.PC,
      1,
      formatDate(new Date(yesterday.getTime() - 150 * 24 * 60 * 60 * 1000)),
      formatDate(new Date(yesterday.getTime() - 130 * 24 * 60 * 60 * 1000)),
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

    const recordingStatusRows = await dataSource.query<Array<{ id: string }>>(
      `SELECT id FROM class_event_recording_status WHERE code = 'NOT_AVAILABLE' LIMIT 1`,
    );
    const historicalStart = new Date(now.getTime() - 145 * 24 * 60 * 60 * 1000);
    const historicalEnd = new Date(
      historicalStart.getTime() + 2 * 60 * 60 * 1000,
    );
    await dataSource.query(
      `INSERT INTO class_event (
        evaluation_id,
        session_number,
        title,
        topic,
        start_datetime,
        end_datetime,
        live_meeting_url,
        recording_status_id,
        is_cancelled,
        created_by,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW(), NULL)`,
      [
        historicalEvaluation.id,
        1,
        'Clase Historica 1',
        'Revision Historica',
        historicalStart,
        historicalEnd,
        'https://zoom.us/j/1111111111',
        recordingStatusRows[0].id,
        admin.user.id,
      ],
    );
    const historicalEventRows = await dataSource.query<Array<{ id: string }>>(
      `SELECT id
       FROM class_event
       WHERE evaluation_id = ?
         AND session_number = 1
       ORDER BY id DESC
       LIMIT 1`,
      [historicalEvaluation.id],
    );
    historicalEventId = String(historicalEventRows[0].id);

    await dataSource.query(
      `INSERT INTO evaluation_drive_access (
        evaluation_id,
        scope_key,
        drive_scope_folder_id,
        drive_videos_folder_id,
        drive_documents_folder_id,
        drive_archived_folder_id,
        viewer_group_email,
        viewer_group_id,
        is_active,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NULL)`,
      [
        evaluation.id,
        `ev-scope-${evaluation.id}`,
        'drive-scope-folder-1',
        'drive-videos-folder-1',
        'drive-documents-folder-1',
        'drive-archived-folder-1',
        `ev-${evaluation.id}-viewers@test.com`,
        `group-${evaluation.id}`,
      ],
    );
  });

  afterAll(async () => {
    await app.close();
  });

  async function removeReminderJobIfExists(
    classEventId: string,
  ): Promise<void> {
    const job = await notificationsQueue.getJob(
      `class-reminder-${classEventId}`,
    );
    if (job) {
      await job.remove();
    }
  }

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

    it('debe permitir a profesor ver eventos historicos del mismo curso', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/class-events/evaluation/${historicalEvaluation.id}`)
        .set('Authorization', `Bearer ${professor.token}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(
        response.body.data.some(
          (event: { id: string }) => event.id === historicalEventId,
        ),
      ).toBe(true);
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

    it('GET /api/v1/class-events/:id - Profesor debe poder ver detalle historico del mismo curso', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/class-events/${historicalEventId}`)
        .set('Authorization', `Bearer ${professor.token}`)
        .expect(200);

      expect(response.body.data.id).toBe(historicalEventId);
      expect(response.body.data.title).toBe('Clase Historica 1');
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

  describe('REMINDERS DE CLASE', () => {
    it('reemplaza el reminder existente cuando cambia la hora de inicio', async () => {
      const originalStart = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const originalEnd = new Date(
        originalStart.getTime() + 2 * 60 * 60 * 1000,
      );

      const createRes = await request(app.getHttpServer())
        .post('/api/v1/class-events')
        .set('Authorization', `Bearer ${professor.token}`)
        .send({
          evaluationId: evaluation.id,
          sessionNumber: 70,
          title: 'Evento Reminder Reprogramable',
          topic: 'Reminder',
          startDatetime: originalStart.toISOString(),
          endDatetime: originalEnd.toISOString(),
          liveMeetingUrl: 'https://zoom.us/j/7070707070',
        })
        .expect(201);

      const eventId = createRes.body.data.id as string;
      const originalJobId = `class-reminder-${eventId}`;

      try {
        const originalJob = await notificationsQueue.getJob(originalJobId);
        expect(originalJob).toBeDefined();
        const originalTimestamp = Number(originalJob?.timestamp ?? 0);

        const updatedStart = new Date(Date.now() + 72 * 60 * 60 * 1000);
        const updatedEnd = new Date(
          updatedStart.getTime() + 2 * 60 * 60 * 1000,
        );

        await request(app.getHttpServer())
          .patch(`/api/v1/class-events/${eventId}`)
          .set('Authorization', `Bearer ${professor.token}`)
          .send({
            startDatetime: updatedStart.toISOString(),
            endDatetime: updatedEnd.toISOString(),
          })
          .expect(200);

        let updatedJob = await notificationsQueue.getJob(originalJobId);
        for (let attempt = 0; !updatedJob && attempt < 20; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 150));
          updatedJob = await notificationsQueue.getJob(originalJobId);
        }
        expect(updatedJob).toBeDefined();
        expect(updatedJob?.id).toBe(originalJobId);
        expect(Number(updatedJob?.timestamp ?? 0)).toBeGreaterThanOrEqual(
          originalTimestamp,
        );
        expect(Number(updatedJob?.delay ?? 0)).toBeGreaterThan(0);
      } finally {
        await removeReminderJobIfExists(eventId);
      }
    });

    it('elimina el reminder existente si el nuevo horario ya no permite reminder', async () => {
      const originalStart = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const originalEnd = new Date(
        originalStart.getTime() + 2 * 60 * 60 * 1000,
      );

      const createRes = await request(app.getHttpServer())
        .post('/api/v1/class-events')
        .set('Authorization', `Bearer ${professor.token}`)
        .send({
          evaluationId: evaluation.id,
          sessionNumber: 71,
          title: 'Evento Reminder Eliminable',
          topic: 'Reminder',
          startDatetime: originalStart.toISOString(),
          endDatetime: originalEnd.toISOString(),
          liveMeetingUrl: 'https://zoom.us/j/7171717171',
        })
        .expect(201);

      const eventId = createRes.body.data.id as string;
      const jobId = `class-reminder-${eventId}`;

      try {
        const originalJob = await notificationsQueue.getJob(jobId);
        expect(originalJob).toBeDefined();

        const updatedStart = new Date(Date.now() + 5 * 60 * 1000);
        const updatedEnd = new Date(updatedStart.getTime() + 60 * 60 * 1000);

        await request(app.getHttpServer())
          .patch(`/api/v1/class-events/${eventId}`)
          .set('Authorization', `Bearer ${professor.token}`)
          .send({
            startDatetime: updatedStart.toISOString(),
            endDatetime: updatedEnd.toISOString(),
          })
          .expect(200);

        const updatedJob = await notificationsQueue.getJob(jobId);
        expect(updatedJob ?? null).toBeNull();
      } finally {
        await removeReminderJobIfExists(eventId);
      }
    });
  });

  describe('RECORDING UPLOAD FLOW', () => {
    const createEventForRecording = async (sessionNumber: number) => {
      const slotIndex = sessionNumber - 300;
      const startDate = new Date(tomorrow);
      startDate.setDate(tomorrow.getDate() + (slotIndex + 2));
      const startDatetime = formatPeruLocalDatetime(startDate, 6);
      const endDatetime = formatPeruLocalDatetime(startDate, 7);
      const response = await request(app.getHttpServer())
        .post('/api/v1/class-events')
        .set('Authorization', `Bearer ${professor.token}`)
        .send({
          evaluationId: evaluation.id,
          sessionNumber,
          title: `Clase Grabacion ${sessionNumber}`,
          topic: 'Grabacion',
          startDatetime,
          endDatetime,
          liveMeetingUrl: `https://zoom.us/j/${sessionNumber}`,
        })
        .expect(201);

      return String(response.body.data.id);
    };

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('inicia upload, consulta status, refresca heartbeat y finaliza publicando la grabacion', async () => {
      const classEventId = await createEventForRecording(301);
      jest
        .spyOn(driveAccessScopeService, 'resolveForEvaluation')
        .mockResolvedValue({
          names: {
            evaluationId: evaluation.id,
            scopeKey: `ev-scope-${evaluation.id}`,
            baseFolderName: 'scope-folder',
            viewerGroupEmail: `ev-${evaluation.id}-viewers@test.com`,
          },
          persisted: {
            evaluationId: evaluation.id,
            scopeKey: `ev-scope-${evaluation.id}`,
            driveScopeFolderId: 'drive-scope-folder-1',
            driveVideosFolderId: 'drive-videos-folder-1',
            driveDocumentsFolderId: 'drive-documents-folder-1',
            driveArchivedFolderId: 'drive-archived-folder-1',
            viewerGroupEmail: `ev-${evaluation.id}-viewers@test.com`,
            viewerGroupId: `group-${evaluation.id}`,
            isActive: true,
          } as never,
        });

      jest
        .spyOn(recordingDriveService, 'createResumableUploadSession')
        .mockResolvedValue({
          resumableSessionUrl: 'https://upload-session.example/resumable-301',
          fileId: 'drive-file-301',
        });
      jest
        .spyOn(recordingDriveService, 'getUploadedFileMetadata')
        .mockResolvedValue({
          fileId: 'drive-file-301',
          name: 'clase-301.mp4',
          mimeType: 'video/mp4',
          sizeBytes: 1024,
          parents: ['drive-videos-folder-1'],
          webViewLink: 'https://drive.google.com/file/d/drive-file-301/view',
          trashed: false,
        });

      const startResponse = await request(app.getHttpServer())
        .post(`/api/v1/class-events/${classEventId}/recording-upload/start`)
        .set('Authorization', `Bearer ${professor.token}`)
        .send({
          fileName: 'clase-301.mp4',
          mimeType: 'video/mp4',
          sizeBytes: 1024,
        })
        .expect(201);

      expect(startResponse.body.data.recordingStatus).toBe('PROCESSING');
      expect(startResponse.body.data.activeUploadMode).toBe('initial');
      expect(startResponse.body.data.uploadToken).toBeDefined();
      expect(startResponse.body.data.resumableSessionUrl).toBeNull();

      const statusResponse = await request(app.getHttpServer())
        .get(`/api/v1/class-events/${classEventId}/recording-upload/status`)
        .set('Authorization', `Bearer ${professor.token}`)
        .expect(200);

      expect(statusResponse.body.data.hasActiveRecordingUpload).toBe(true);
      expect(statusResponse.body.data.resumableSessionUrl).toBeNull();

      const previousExpiresAt = new Date(
        statusResponse.body.data.uploadExpiresAt,
      ).getTime();

      const heartbeatResponse = await request(app.getHttpServer())
        .post(`/api/v1/class-events/${classEventId}/recording-upload/heartbeat`)
        .set('Authorization', `Bearer ${professor.token}`)
        .send({ uploadToken: startResponse.body.data.uploadToken })
        .expect(200);

      expect(
        new Date(heartbeatResponse.body.data.uploadExpiresAt).getTime(),
      ).toBeGreaterThanOrEqual(previousExpiresAt);

      await request(app.getHttpServer())
        .post(`/api/v1/class-events/${classEventId}/recording-upload/finalize`)
        .set('Authorization', `Bearer ${professor.token}`)
        .send({
          uploadToken: startResponse.body.data.uploadToken,
          fileId: 'drive-file-301',
        })
        .expect(200);

      const detailResponse = await request(app.getHttpServer())
        .get(`/api/v1/class-events/${classEventId}`)
        .set('Authorization', `Bearer ${professor.token}`)
        .expect(200);

      expect(detailResponse.body.data.recordingStatus).toBe('READY');
      expect(detailResponse.body.data.recordingUrl).toBe(
        'https://drive.google.com/file/d/drive-file-301/preview',
      );

      const uploadContext = await cacheService.get(
        `class-event-recording-upload:context:${classEventId}`,
      );
      expect(uploadContext).toBeNull();

      const auditRows = await dataSource.query<Array<{ code: string }>>(
        `SELECT aa.code
         FROM audit_log al
         INNER JOIN audit_action aa ON aa.id = al.audit_action_id
         WHERE al.user_id = ?
         ORDER BY al.id DESC
         LIMIT 5`,
        [professor.user.id],
      );
      expect(
        auditRows.some((row) => row.code === 'CLASS_RECORDING_PUBLISHED'),
      ).toBe(true);
    });

    it('mantiene READY durante reemplazo y conserva la grabacion anterior si finalize falla', async () => {
      const classEventId = await createEventForRecording(302);
      jest
        .spyOn(driveAccessScopeService, 'resolveForEvaluation')
        .mockResolvedValue({
          names: {
            evaluationId: evaluation.id,
            scopeKey: `ev-scope-${evaluation.id}`,
            baseFolderName: 'scope-folder',
            viewerGroupEmail: `ev-${evaluation.id}-viewers@test.com`,
          },
          persisted: {
            evaluationId: evaluation.id,
            scopeKey: `ev-scope-${evaluation.id}`,
            driveScopeFolderId: 'drive-scope-folder-1',
            driveVideosFolderId: 'drive-videos-folder-1',
            driveDocumentsFolderId: 'drive-documents-folder-1',
            driveArchivedFolderId: 'drive-archived-folder-1',
            viewerGroupEmail: `ev-${evaluation.id}-viewers@test.com`,
            viewerGroupId: `group-${evaluation.id}`,
            isActive: true,
          } as never,
        });
      const readyStatusRows = await dataSource.query<Array<{ id: string }>>(
        `SELECT id FROM class_event_recording_status WHERE code = 'READY' LIMIT 1`,
      );
      await dataSource.query(
        `UPDATE class_event
         SET recording_url = ?, recording_file_id = ?, recording_status_id = ?
         WHERE id = ?`,
        [
          'https://drive.google.com/file/d/old-drive-file/view',
          'old-drive-file',
          readyStatusRows[0].id,
          classEventId,
        ],
      );

      jest
        .spyOn(recordingDriveService, 'createResumableUploadSession')
        .mockResolvedValue({
          resumableSessionUrl: 'https://upload-session.example/resumable-302',
          fileId: 'drive-file-302',
        });
      jest
        .spyOn(recordingDriveService, 'getUploadedFileMetadata')
        .mockResolvedValue({
          fileId: 'drive-file-302',
          name: 'clase-302.mp4',
          mimeType: 'video/mp4',
          sizeBytes: 1024,
          parents: ['otra-carpeta'],
          webViewLink: null,
          trashed: false,
        });
      const deleteSpy = jest
        .spyOn(recordingDriveService, 'deleteUploadedFile')
        .mockResolvedValue(undefined);

      const startResponse = await request(app.getHttpServer())
        .post(`/api/v1/class-events/${classEventId}/recording-upload/start`)
        .set('Authorization', `Bearer ${professor.token}`)
        .send({
          fileName: 'clase-302.mp4',
          mimeType: 'video/mp4',
          sizeBytes: 1024,
        })
        .expect(201);

      expect(startResponse.body.data.recordingStatus).toBe('READY');
      expect(startResponse.body.data.activeUploadMode).toBe('replacement');

      await request(app.getHttpServer())
        .post(`/api/v1/class-events/${classEventId}/recording-upload/finalize`)
        .set('Authorization', `Bearer ${professor.token}`)
        .send({
          uploadToken: startResponse.body.data.uploadToken,
          fileId: 'drive-file-302',
        })
        .expect(403);

      const detailResponse = await request(app.getHttpServer())
        .get(`/api/v1/class-events/${classEventId}`)
        .set('Authorization', `Bearer ${professor.token}`)
        .expect(200);

      expect(detailResponse.body.data.recordingStatus).toBe('READY');
      expect(detailResponse.body.data.recordingUrl).toBe(
        'https://drive.google.com/file/d/old-drive-file/preview',
      );
      expect(deleteSpy).toHaveBeenCalledWith('drive-file-302');
    });

    it('rechaza el status de upload a un alumno por tratarse de un endpoint de mutacion operativa', async () => {
      const classEventId = await createEventForRecording(303);
      jest
        .spyOn(driveAccessScopeService, 'resolveForEvaluation')
        .mockResolvedValue({
          names: {
            evaluationId: evaluation.id,
            scopeKey: `ev-scope-${evaluation.id}`,
            baseFolderName: 'scope-folder',
            viewerGroupEmail: `ev-${evaluation.id}-viewers@test.com`,
          },
          persisted: {
            evaluationId: evaluation.id,
            scopeKey: `ev-scope-${evaluation.id}`,
            driveScopeFolderId: 'drive-scope-folder-1',
            driveVideosFolderId: 'drive-videos-folder-1',
            driveDocumentsFolderId: 'drive-documents-folder-1',
            driveArchivedFolderId: 'drive-archived-folder-1',
            viewerGroupEmail: `ev-${evaluation.id}-viewers@test.com`,
            viewerGroupId: `group-${evaluation.id}`,
            isActive: true,
          } as never,
        });

      jest
        .spyOn(recordingDriveService, 'createResumableUploadSession')
        .mockResolvedValue({
          resumableSessionUrl: 'https://upload-session.example/resumable-303',
          fileId: 'drive-file-303',
        });

      await request(app.getHttpServer())
        .post(`/api/v1/class-events/${classEventId}/recording-upload/start`)
        .set('Authorization', `Bearer ${professor.token}`)
        .send({
          fileName: 'clase-303.mp4',
          mimeType: 'video/mp4',
          sizeBytes: 1024,
        })
        .expect(201);

      await request(app.getHttpServer())
        .get(`/api/v1/class-events/${classEventId}/recording-upload/status`)
        .set('Authorization', `Bearer ${student.token}`)
        .expect(403);
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
      const cacheEventDate = new Date(tomorrow);
      cacheEventDate.setDate(tomorrow.getDate() + 5);

      const createRes = await request(app.getHttpServer())
        .post('/api/v1/class-events')
        .set('Authorization', `Bearer ${professor.token}`)
        .send({
          evaluationId: evaluation.id,
          sessionNumber: 99,
          title: 'Evento Cache',
          topic: 'Cache',
          startDatetime: formatPeruLocalDatetime(cacheEventDate, 13),
          endDatetime: formatPeruLocalDatetime(cacheEventDate, 14),
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

  describe('CONTRATO HORARIO PERU', () => {
    it('interpreta ISO sin zona como hora America/Lima y responde UTC', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/class-events')
        .set('Authorization', `Bearer ${professor.token}`)
        .send({
          evaluationId: evaluation.id,
          sessionNumber: 150,
          title: 'Clase 150: Hora Lima',
          topic: 'Conversion horaria',
          startDatetime: formatPeruLocalDatetime(tomorrow, 9),
          endDatetime: formatPeruLocalDatetime(tomorrow, 11),
          liveMeetingUrl: 'https://zoom.us/j/5555555555',
        })
        .expect(201);

      expect(response.body.data.startDatetime).toBe(
        `${formatPeruLocalDate(tomorrow)}T14:00:00.000Z`,
      );
      expect(response.body.data.endDatetime).toBe(
        `${formatPeruLocalDate(tomorrow)}T16:00:00.000Z`,
      );
    });

    it('interpreta start y end YYYY-MM-DD con semantica America/Lima', async () => {
      const localMorningRes = await request(app.getHttpServer())
        .post('/api/v1/class-events')
        .set('Authorization', `Bearer ${professor.token}`)
        .send({
          evaluationId: evaluation.id,
          sessionNumber: 151,
          title: 'Evento Rango Lima',
          topic: 'Filtro por fecha',
          startDatetime: formatPeruLocalDatetime(tomorrow, 12),
          endDatetime: formatPeruLocalDatetime(tomorrow, 13),
          liveMeetingUrl: 'https://zoom.us/j/1010101010',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/api/v1/class-events/my-schedule')
        .query({
          start: formatPeruLocalDate(tomorrow),
          end: formatPeruLocalDate(tomorrow),
        })
        .set('Authorization', `Bearer ${professor.token}`)
        .expect(200);

      const event = res.body.data.find(
        (item: any) => item.id === localMorningRes.body.data.id,
      );
      expect(event).toBeDefined();
      expect(event.startDatetime).toBe(
        `${formatPeruLocalDate(tomorrow)}T17:00:00.000Z`,
      );
    });
  });
});


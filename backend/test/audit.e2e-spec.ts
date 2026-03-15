import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { TestSeeder } from './e2e/test-utils';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  AUDIT_EXPORT_STATUS,
  AUDIT_JOB_IDS,
  AUDIT_JOB_NAMES,
} from '../src/modules/audit/interfaces/audit.constants';
import { AuditService } from '../src/modules/audit/application/audit.service';
import { RedisCacheService } from '../src/infrastructure/cache/redis-cache.service';

jest.setTimeout(60000);

interface AuditHistoryResponse {
  statusCode: number;
  message: string;
  data: unknown[];
}

describe('AuditController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let seeder: TestSeeder;
  let accessToken: string;
  let secondAdminAccessToken: string;
  let accessUserId: string;
  let auditQueue: Queue;
  let auditService: AuditService;
  let redisCacheService: RedisCacheService;

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
    await dataSource.query(`
      INSERT INTO notification_type (code, name)
      SELECT 'AUDIT_EXPORT_READY', 'Reporte de Auditoria Listo'
      WHERE NOT EXISTS (
        SELECT 1 FROM notification_type WHERE code = 'AUDIT_EXPORT_READY'
      )
    `);
    seeder = new TestSeeder(dataSource, app);
    auditQueue = app.get<Queue>(getQueueToken('audit-queue'));
    auditService = app.get(AuditService);
    redisCacheService = app.get(RedisCacheService);
    await auditQueue.pause();
    await auditQueue.obliterate({ force: true });
    await auditQueue.resume();

    const auth = await seeder.createAuthenticatedUser('admin-audit@test.com', [
      'ADMIN',
    ]);
    accessToken = auth.token;
    accessUserId = auth.user.id;
    const secondAdmin = await seeder.createAuthenticatedUser(
      'admin-audit-2@test.com',
      ['ADMIN'],
    );
    secondAdminAccessToken = secondAdmin.token;
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await redisCacheService.del(AUDIT_JOB_IDS.EXPORT_LOCK_KEY);
    const jobs = await auditQueue.getJobs(
      [
        'active',
        'waiting',
        'waiting-children',
        'delayed',
        'prioritized',
        'completed',
        'failed',
      ],
      0,
      -1,
    );

    for (const job of jobs) {
      if (!job) {
        continue;
      }

      if (
        job.name !== AUDIT_JOB_NAMES.GENERATE_EXPORT &&
        job.name !== AUDIT_JOB_NAMES.EXPIRE_EXPORT_ARTIFACT
      ) {
        continue;
      }

      let state = await job.getState();
      let attempts = 0;
      while (state === 'active' && attempts < 50) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        state = await job.getState();
        attempts += 1;
      }

      if (state !== 'active') {
        await job.remove();
      }
    }
  });

  it('/audit/history (GET) - should return 401 without token', () => {
    return request(app.getHttpServer())
      .get('/api/v1/audit/history')
      .expect(401);
  });

  it('/audit/history (GET) - should return history list with valid token', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/audit/history')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = response.body as AuditHistoryResponse;
    expect(body.statusCode).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('/audit/history (GET) - should filter by date', async () => {
    const startDate = new Date().toISOString();
    await request(app.getHttpServer())
      .get(`/api/v1/audit/history?startDate=${startDate}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('/audit/history (GET) - should accept source and actionCode filters', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/audit/history?source=AUDIT&actionCode=FILE_UPLOAD')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('/audit/history (GET) - should reject an invalid source filter', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/audit/history?source=INVALID')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
  });

  it('/audit/export (GET) - should return an excel file', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/audit/export')
      .set('Authorization', `Bearer ${accessToken}`)
      .buffer()
      .parse((res, callback) => {
        res.setEncoding('binary');
        let data = '';
        res.on('data', (chunk: string) => {
          data += chunk;
        });
        res.on('end', () => {
          callback(null, Buffer.from(data, 'binary'));
        });
      })
      .expect(200);

    expect(response.header['content-type']).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(response.header['content-disposition']).toContain(
      'attachment; filename="reporte-auditoria_',
    );
    expect(Buffer.isBuffer(response.body)).toBe(true);
    const buffer = response.body as Buffer;
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('/audit/export (GET) - should accept source and actionCode filters', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/audit/export?source=SECURITY&actionCode=LOGIN_SUCCESS')
      .set('Authorization', `Bearer ${accessToken}`)
      .buffer()
      .parse((res, callback) => {
        res.setEncoding('binary');
        let data = '';
        res.on('data', (chunk: string) => {
          data += chunk;
        });
        res.on('end', () => {
          callback(null, Buffer.from(data, 'binary'));
        });
      })
      .expect(200);

    expect(response.header['content-type']).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(Buffer.isBuffer(response.body)).toBe(true);
  });

  it('/audit/export (GET) - should reject an invalid source filter', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/audit/export?source=INVALID')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
  });

  it('/audit/export (GET) - should return 202 and enqueue a job when export is async', async () => {
    const getExportPlanSpy = jest
      .spyOn(auditService, 'getExportPlan')
      .mockResolvedValueOnce({
        mode: 'async',
        totalRows: 120000,
        thresholdRows: 100000,
        rowsPerFile: 100000,
        estimatedFileCount: 2,
        artifactTtlSeconds: 3600,
      });

    await auditQueue.pause();
    const response = await request(app.getHttpServer())
      .get('/api/v1/audit/export')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(202);
    const queuedJob = await auditQueue.getJob(response.body.data.jobId);
    if (queuedJob) {
      await queuedJob.remove();
    }
    await auditQueue.resume();

    expect(response.body.data.jobId).toEqual(expect.any(String));
    expect(response.body.data.status).toBe(AUDIT_EXPORT_STATUS.QUEUED);
    getExportPlanSpy.mockRestore();
  });

  it('/audit/export (GET) - should reject concurrent exports with 409', async () => {
    await redisCacheService.set(
      AUDIT_JOB_IDS.EXPORT_LOCK_KEY,
      'manual-lock',
      3600,
    );

    await request(app.getHttpServer())
      .get('/api/v1/audit/export')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(409);
  });

  it('/audit/export (GET) - should create a ready notification for the async export owner', async () => {
    const getExportPlanSpy = jest
      .spyOn(auditService, 'getExportPlan')
      .mockResolvedValueOnce({
        mode: 'async',
        totalRows: 120000,
        thresholdRows: 100000,
        rowsPerFile: 100000,
        estimatedFileCount: 2,
        artifactTtlSeconds: 3600,
      });

    const exportResponse = await request(app.getHttpServer())
      .get('/api/v1/audit/export')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(202);

    getExportPlanSpy.mockRestore();

    const jobId = exportResponse.body.data.jobId as string;
    let status = AUDIT_EXPORT_STATUS.QUEUED;

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const statusResponse = await request(app.getHttpServer())
        .get(`/api/v1/audit/export-jobs/${jobId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      status = statusResponse.body.data.status;
      if (
        status === AUDIT_EXPORT_STATUS.READY ||
        status === AUDIT_EXPORT_STATUS.FAILED
      ) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    expect(status).toBe(AUDIT_EXPORT_STATUS.READY);

    let persistedNotifications:
      | Array<{ code: string; entity_type: string; entity_id: string; user_id: string }>
      | undefined;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      persistedNotifications = await dataSource.query(
        `
          SELECT nt.code, n.entity_type, n.entity_id, un.user_id
          FROM user_notification un
          INNER JOIN notification n ON n.id = un.notification_id
          INNER JOIN notification_type nt ON nt.id = n.notification_type_id
          WHERE nt.code = 'AUDIT_EXPORT_READY' AND n.entity_id = ?
        `,
        [jobId],
      );

      if ((persistedNotifications?.length ?? 0) > 0) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    expect(persistedNotifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'AUDIT_EXPORT_READY',
          entity_type: 'audit_export',
          entity_id: jobId,
          user_id: accessUserId,
        }),
      ]),
    );

    let ownerNotification: Record<string, unknown> | undefined;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const notificationsResponse = await request(app.getHttpServer())
        .get('/api/v1/notifications?limit=20&offset=0')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      ownerNotification = (
        notificationsResponse.body.data as Array<Record<string, unknown>>
      ).find(
        (notification) =>
          notification.type === 'AUDIT_EXPORT_READY' &&
          notification.entityType === 'audit_export' &&
          notification.entityId === jobId,
      );

      if (ownerNotification) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    expect(ownerNotification).toEqual(
      expect.objectContaining({
        type: 'AUDIT_EXPORT_READY',
        entityType: 'audit_export',
        entityId: jobId,
        target: expect.objectContaining({
          auditExportJobId: jobId,
        }),
      }),
    );

    const secondAdminNotificationsResponse = await request(app.getHttpServer())
      .get('/api/v1/notifications?limit=20&offset=0')
      .set('Authorization', `Bearer ${secondAdminAccessToken}`)
      .expect(200);

    expect(
      (
        secondAdminNotificationsResponse.body.data as Array<Record<string, unknown>>
      ).some((notification) => notification.entityId === jobId),
    ).toBe(false);
  });

  it('/audit/export-jobs/:id (GET) - should return the job status', async () => {
    const jobId = 'job-status-1';
    const artifact = await auditService.generateAsyncExportArtifact(
      {},
      120000,
      100000,
      jobId,
    );
    const job = await auditQueue.add(
      AUDIT_JOB_NAMES.GENERATE_EXPORT,
      {
        requestedByUserId: accessUserId,
        filters: {},
        requestedAtIso: new Date().toISOString(),
        totalRows: 120000,
        estimatedFileCount: 2,
        lockToken: 'lock-status-1',
      },
      {
        jobId,
        delay: 60000,
      },
    );
    await job.updateProgress({
      stage: AUDIT_EXPORT_STATUS.READY,
      progress: 100,
      totalRows: 120000,
      estimatedFileCount: 2,
      artifactName: artifact.artifactName,
      artifactStorageKey: artifact.artifactStorageKey,
      artifactExpiresAt: artifact.artifactExpiresAt,
      errorMessage: null,
    });

    const response = await request(app.getHttpServer())
      .get(`/api/v1/audit/export-jobs/${jobId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data.jobId).toBe(jobId);
    expect(response.body.data.status).toBe(AUDIT_EXPORT_STATUS.READY);
  });

  it('/audit/export-jobs/:id/download (GET) - should download the async zip and block other admins', async () => {
    const jobId = 'job-download-1';
    const artifact = await auditService.generateAsyncExportArtifact(
      {},
      120000,
      100000,
      jobId,
    );

    const job = await auditQueue.add(
      AUDIT_JOB_NAMES.GENERATE_EXPORT,
      {
        requestedByUserId: accessUserId,
        filters: {},
        requestedAtIso: new Date().toISOString(),
        totalRows: 120000,
        estimatedFileCount: 2,
        lockToken: 'lock-download-1',
      },
      {
        jobId,
        delay: 60000,
      },
    );
    await job.updateProgress({
      stage: AUDIT_EXPORT_STATUS.READY,
      progress: 100,
      totalRows: 120000,
      estimatedFileCount: 2,
      artifactName: artifact.artifactName,
      artifactStorageKey: artifact.artifactStorageKey,
      artifactExpiresAt: artifact.artifactExpiresAt,
      errorMessage: null,
    });

    await request(app.getHttpServer())
      .get(`/api/v1/audit/export-jobs/${jobId}`)
      .set('Authorization', `Bearer ${secondAdminAccessToken}`)
      .expect(403);

    const downloadResponse = await request(app.getHttpServer())
      .get(`/api/v1/audit/export-jobs/${jobId}/download`)
      .set('Authorization', `Bearer ${accessToken}`)
      .buffer()
      .parse((res, callback) => {
        res.setEncoding('binary');
        let data = '';
        res.on('data', (chunk: string) => {
          data += chunk;
        });
        res.on('end', () => {
          callback(null, Buffer.from(data, 'binary'));
        });
      })
      .expect(200);

    expect(downloadResponse.header['content-type']).toContain('application/zip');
    expect(downloadResponse.header['content-disposition']).toContain(
      'attachment; filename="reporte-auditoria-masivo_',
    );
    expect(Buffer.isBuffer(downloadResponse.body)).toBe(true);
    expect((downloadResponse.body as Buffer).subarray(0, 2).toString()).toBe(
      'PK',
    );

    const expiredStatus = await request(app.getHttpServer())
      .get(`/api/v1/audit/export-jobs/${jobId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(expiredStatus.body.data.status).toBe(AUDIT_EXPORT_STATUS.EXPIRED);
  });

  it('/audit/export-jobs/:id/download (GET) - should return 410 when the artifact already expired', async () => {
    const jobId = 'job-expired-1';
    const artifact = await auditService.generateAsyncExportArtifact(
      {},
      120000,
      100000,
      jobId,
    );

    const job = await auditQueue.add(
      AUDIT_JOB_NAMES.GENERATE_EXPORT,
      {
        requestedByUserId: accessUserId,
        filters: {},
        requestedAtIso: new Date().toISOString(),
        totalRows: 120000,
        estimatedFileCount: 2,
        lockToken: 'lock-expired-1',
      },
      {
        jobId,
        delay: 60000,
      },
    );
    await job.updateProgress({
      stage: AUDIT_EXPORT_STATUS.READY,
      progress: 100,
      totalRows: 120000,
      estimatedFileCount: 2,
      artifactName: artifact.artifactName,
      artifactStorageKey: artifact.artifactStorageKey,
      artifactExpiresAt: '2020-03-14T21:00:00.000Z',
      errorMessage: null,
    });

    await request(app.getHttpServer())
      .get(`/api/v1/audit/export-jobs/${jobId}/download`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(410);

    const statusResponse = await request(app.getHttpServer())
      .get(`/api/v1/audit/export-jobs/${jobId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(statusResponse.body.data.status).toBe(AUDIT_EXPORT_STATUS.EXPIRED);
  });
});

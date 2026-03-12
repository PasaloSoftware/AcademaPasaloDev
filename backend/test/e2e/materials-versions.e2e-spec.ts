import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '@src/app.module';
import { DataSource } from 'typeorm';
import { TestSeeder } from './test-utils';
import { StorageService } from '@infrastructure/storage/storage.service';
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { User } from '@modules/users/domain/user.entity';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { Material } from '@modules/materials/domain/material.entity';
import { DeletionRequest } from '@modules/materials/domain/deletion-request.entity';
import { DeletionRequestStatus } from '@modules/materials/domain/deletion-request-status.entity';
import { FileResource } from '@modules/materials/domain/file-resource.entity';
import { MaterialVersion } from '@modules/materials/domain/material-version.entity';
import { Readable } from 'stream';

interface MaterialDataResponse {
  data: {
    id: string;
    fileResourceId: string;
  };
}

interface GenericDataResponse<T> {
  data: T;
}

describe('E2E: Materials Full Flows (Dedup + Versions + Integrity)', () => {
  jest.setTimeout(120000);

  let app: INestApplication;
  let dataSource: DataSource;
  let seeder: TestSeeder;

  let professor: { user: User; token: string };
  let admin: { user: User; token: string };
  let superAdmin: { user: User; token: string };

  let folderId: string;
  let materialId: string;
  let duplicateMaterialId: string;
  let originalFileResourceId: string;
  let restorableMaterialId: string;
  let restorableOriginalFileResourceId: string;

  const now = new Date();
  const nextMonth = new Date();
  nextMonth.setMonth(now.getMonth() + 1);
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const storageMock = {
    calculateHash: jest.fn().mockImplementation((buffer: Buffer) => {
      const content = buffer.toString();
      if (content.includes('duplicate')) return 'hash_dup_123';
      if (content.includes('version2')) return 'hash_v2_456';
      return `hash_${Date.now()}_${Math.random()}`;
    }),
    saveFile: jest
      .fn()
      .mockImplementation(async (name: string, buffer: Buffer) => {
        const tempPath = path.join(os.tmpdir(), name);
        await fs.promises.writeFile(tempPath, buffer);
        return {
          storageProvider: 'LOCAL',
          storageKey: `${Date.now()}-${Math.random().toString(16).slice(2)}-${name}`,
          storageUrl: tempPath,
        };
      }),
    deleteFile: jest.fn().mockResolvedValue(undefined),
    getFileStream: jest
      .fn()
      .mockResolvedValue(Readable.from(Buffer.from('%PDF-1.4 e2e-download'))),
    isGoogleDriveStorageEnabled: jest.fn().mockReturnValue(false),
    isDriveFileDirectlyInFolder: jest.fn().mockResolvedValue(true),
    onModuleInit: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(StorageService)
      .useValue(storageMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalInterceptors(new TransformInterceptor(app.get(Reflector)));
    await app.init();

    dataSource = app.get(DataSource);
    const cacheService = app.get(RedisCacheService);
    seeder = new TestSeeder(dataSource, app);

    await cacheService.invalidateGroup('cache:*');
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    const tables = [
      'deletion_request',
      'material',
      'material_version',
      'file_resource',
      'material_folder',
      'evaluation',
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

    await seeder.ensureMaterialStatuses();
    const cycle = await seeder.createCycle(
      `2026-VER-${Date.now()}`,
      formatDate(now),
      formatDate(nextMonth),
    );
    const course = await seeder.createCourse(
      `VER101-${Date.now()}`,
      'Versionado 101',
    );
    const courseCycle = await seeder.linkCourseCycle(course.id, cycle.id);
    const evaluation = await seeder.createEvaluation(
      courseCycle.id,
      'PC',
      1,
      formatDate(now),
      formatDate(nextMonth),
    );

    professor = await seeder.createAuthenticatedUser(
      TestSeeder.generateUniqueEmail('prof_ver'),
      ['PROFESSOR'],
    );
    admin = await seeder.createAuthenticatedUser(
      TestSeeder.generateUniqueEmail('admin_ver'),
      ['ADMIN'],
    );
    superAdmin = await seeder.createAuthenticatedUser(
      TestSeeder.generateUniqueEmail('sa_ver'),
      ['SUPER_ADMIN'],
    );

    await dataSource.query(
      'INSERT INTO course_cycle_professor (course_cycle_id, professor_user_id, assigned_at) VALUES (?, ?, NOW())',
      [courseCycle.id, professor.user.id],
    );

    const folderRes = await request(app.getHttpServer())
      .post('/api/v1/materials/folders')
      .set('Authorization', `Bearer ${professor.token}`)
      .send({
        evaluationId: evaluation.id,
        name: 'Root Versioning',
        visibleFrom: new Date().toISOString(),
      })
      .expect(201);

    const folderBody = folderRes.body as GenericDataResponse<{ id: string }>;
    folderId = folderBody.data.id;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('Deduplication', () => {
    it('uploads original material', async () => {
      const buffer = Buffer.from('%PDF-1.4 duplicate');
      const res = await request(app.getHttpServer())
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${professor.token}`)
        .attach('file', buffer, 'original.pdf')
        .field('materialFolderId', folderId)
        .field('displayName', 'Original')
        .expect(201);

      const body = res.body as MaterialDataResponse;
      materialId = body.data.id;
      originalFileResourceId = body.data.fileResourceId;
      expect(originalFileResourceId).toBeDefined();
    });

    it('uploads duplicate material and reuses same FileResource', async () => {
      const buffer = Buffer.from('%PDF-1.4 duplicate');
      const res = await request(app.getHttpServer())
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${professor.token}`)
        .attach('file', buffer, 'copy.pdf')
        .field('materialFolderId', folderId)
        .field('displayName', 'Copy')
        .expect(201);

      const body = res.body as MaterialDataResponse;
      duplicateMaterialId = body.data.id;
      expect(body.data.fileResourceId).toBe(originalFileResourceId);
    });
  });

  describe('Versioning', () => {
    it('adds v2 to original material', async () => {
      const buffer = Buffer.from('%PDF-1.4 version2');

      await request(app.getHttpServer())
        .post(`/api/v1/materials/${materialId}/versions`)
        .set('Authorization', `Bearer ${professor.token}`)
        .attach('file', buffer, 'v2.pdf')
        .expect(201);

      const mat = await dataSource.getRepository(Material).findOneOrFail({
        where: { id: materialId },
        relations: { fileVersion: true },
      });

      expect(mat.fileVersion.versionNumber).toBe(2);
    });

    it('returns version history for the material', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/materials/${materialId}/versions-history`)
        .set('Authorization', `Bearer ${professor.token}`)
        .expect(200);

      const body = res.body as GenericDataResponse<{
        materialId: string;
        currentVersionId: string;
        currentVersionNumber: number;
        versions: Array<{
          versionId: string;
          versionNumber: number;
          isCurrent: boolean;
          file: { resourceId: string };
        }>;
      }>;

      expect(body.data.materialId).toBe(materialId);
      expect(body.data.currentVersionNumber).toBe(2);
      expect(body.data.versions).toHaveLength(2);
      expect(body.data.versions[0].versionNumber).toBe(2);
      expect(body.data.versions[0].isCurrent).toBe(true);
      expect(body.data.versions[1].versionNumber).toBe(1);

      const dbVersions = await dataSource.getRepository(MaterialVersion).find({
        where: { materialId },
        order: { versionNumber: 'DESC' },
      });
      expect(body.data.versions.map((item) => item.versionId)).toEqual(
        dbVersions.map((item) => item.id),
      );
    });

    it('allows authorized download after versioning', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/materials/${materialId}/download`)
        .set('Authorization', `Bearer ${professor.token}`)
        .expect(200);

      expect(storageMock.getFileStream).toHaveBeenCalled();
    });
  });

  describe('Restore version', () => {
    it('restores an older version by creating a new current version', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${professor.token}`)
        .attach(
          'file',
          Buffer.from('%PDF-1.4 restore-original'),
          'restore-v1.pdf',
        )
        .field('materialFolderId', folderId)
        .field('displayName', 'Restorable')
        .expect(201);

      const createdMaterial = createRes.body as MaterialDataResponse;
      restorableMaterialId = createdMaterial.data.id;
      restorableOriginalFileResourceId = createdMaterial.data.fileResourceId;

      await request(app.getHttpServer())
        .post(`/api/v1/materials/${restorableMaterialId}/versions`)
        .set('Authorization', `Bearer ${professor.token}`)
        .attach(
          'file',
          Buffer.from('%PDF-1.4 restore-version2'),
          'restore-v2.pdf',
        )
        .expect(201);

      const oldestVersion = await dataSource
        .getRepository(MaterialVersion)
        .findOneOrFail({
          where: { materialId: restorableMaterialId, versionNumber: 1 },
        });

      await request(app.getHttpServer())
        .post(
          `/api/v1/materials/${restorableMaterialId}/restore-version/${oldestVersion.id}`,
        )
        .set('Authorization', `Bearer ${professor.token}`)
        .expect(201);

      const material = await dataSource.getRepository(Material).findOneOrFail({
        where: { id: restorableMaterialId },
        relations: { fileVersion: true },
      });

      expect(material.fileResourceId).toBe(restorableOriginalFileResourceId);
      expect(material.fileVersion?.versionNumber).toBe(3);

      const historyRes = await request(app.getHttpServer())
        .get(`/api/v1/materials/${restorableMaterialId}/versions-history`)
        .set('Authorization', `Bearer ${professor.token}`)
        .expect(200);

      const historyBody = historyRes.body as GenericDataResponse<{
        currentVersionNumber: number;
        versions: Array<{
          versionNumber: number;
          isCurrent: boolean;
          file: { resourceId: string };
        }>;
      }>;

      expect(historyBody.data.currentVersionNumber).toBe(3);
      expect(historyBody.data.versions).toHaveLength(3);
      expect(historyBody.data.versions[0]).toMatchObject({
        versionNumber: 3,
        isCurrent: true,
      });
      expect(historyBody.data.versions[0].file.resourceId).toBe(
        restorableOriginalFileResourceId,
      );
    });
  });

  describe('Admin workflow and integrity', () => {
    it('rejects hard delete for non-archived material', async () => {
      const buffer = Buffer.from('%PDF-1.4 fresh-no-archive');
      const freshRes = await request(app.getHttpServer())
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${professor.token}`)
        .attach('file', buffer, 'fresh.pdf')
        .field('materialFolderId', folderId)
        .field('displayName', 'Fresh')
        .expect(201);

      const freshMaterialId = (freshRes.body as MaterialDataResponse).data.id;

      await request(app.getHttpServer())
        .delete(`/api/v1/admin/materials/${freshMaterialId}/hard-delete`)
        .set('Authorization', `Bearer ${superAdmin.token}`)
        .expect(400);
    });

    it('hard deleting original does not remove shared FileResource', async () => {
      const reqRepo = dataSource.getRepository(DeletionRequest);
      const statusRepo = dataSource.getRepository(DeletionRequestStatus);
      const pending = await statusRepo.findOneOrFail({
        where: { code: 'PENDING' },
      });

      const req = await reqRepo.save(
        reqRepo.create({
          requestedById: professor.user.id,
          deletionRequestStatusId: pending.id,
          entityType: 'material',
          entityId: materialId,
          reason: 'Archive original',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      await request(app.getHttpServer())
        .post(`/api/v1/admin/materials/requests/${req.id}/review`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ action: 'APPROVE' })
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/api/v1/admin/materials/${materialId}/hard-delete`)
        .set('Authorization', `Bearer ${superAdmin.token}`)
        .expect(200);

      const original = await dataSource.getRepository(Material).findOne({
        where: { id: materialId },
        relations: { fileVersion: true },
      });
      expect(original).not.toBeNull();
      expect(original?.fileResourceId).toBe(originalFileResourceId);
      expect(original?.fileVersion?.versionNumber).toBe(1);

      const duplicate = await dataSource
        .getRepository(Material)
        .findOne({ where: { id: duplicateMaterialId } });
      expect(duplicate).not.toBeNull();

      const sharedResource = await dataSource
        .getRepository(FileResource)
        .findOne({ where: { id: originalFileResourceId } });
      expect(sharedResource).not.toBeNull();
    });

    it('hard deleting duplicate keeps shared FileResource while original still references it', async () => {
      const reqRepo = dataSource.getRepository(DeletionRequest);
      const statusRepo = dataSource.getRepository(DeletionRequestStatus);
      const pending = await statusRepo.findOneOrFail({
        where: { code: 'PENDING' },
      });

      const req = await reqRepo.save(
        reqRepo.create({
          requestedById: professor.user.id,
          deletionRequestStatusId: pending.id,
          entityType: 'material',
          entityId: duplicateMaterialId,
          reason: 'Archive duplicate',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      await request(app.getHttpServer())
        .post(`/api/v1/admin/materials/requests/${req.id}/review`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ action: 'APPROVE' })
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/api/v1/admin/materials/${duplicateMaterialId}/hard-delete`)
        .set('Authorization', `Bearer ${superAdmin.token}`)
        .expect(200);

      const sharedResource = await dataSource
        .getRepository(FileResource)
        .findOne({ where: { id: originalFileResourceId } });
      expect(sharedResource).not.toBeNull();
    });

    it('hard deleting original again removes last remaining version and shared FileResource', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/admin/materials/${materialId}/hard-delete`)
        .set('Authorization', `Bearer ${superAdmin.token}`)
        .expect(200);

      const original = await dataSource
        .getRepository(Material)
        .findOne({ where: { id: materialId } });
      expect(original).toBeNull();

      const sharedResource = await dataSource
        .getRepository(FileResource)
        .findOne({ where: { id: originalFileResourceId } });
      expect(sharedResource).toBeNull();
      expect(storageMock.deleteFile).toHaveBeenCalled();
    });
  });
});

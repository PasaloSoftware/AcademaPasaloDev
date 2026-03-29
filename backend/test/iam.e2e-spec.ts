import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpAdapterHost, Reflector, APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DataSource } from 'typeorm';
import request from 'supertest';

import { AllExceptionsFilter } from './../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { AuthController } from './../src/modules/auth/presentation/auth.controller';
import { AuthService } from './../src/modules/auth/application/auth.service';
import { JwtStrategy } from './../src/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from './../src/common/guards/jwt-auth.guard';
import { RolesGuard } from './../src/common/guards/roles.guard';
import { UserSessionRepository } from './../src/modules/auth/infrastructure/user-session.repository';
import { SessionStatusService } from './../src/modules/auth/application/session-status.service';
import { SessionValidatorService } from './../src/modules/auth/application/session-validator.service';
import { SessionConflictService } from './../src/modules/auth/application/session-conflict.service';
import { SessionSecurityService } from './../src/modules/auth/application/session-security.service';
import { SecurityEventService } from './../src/modules/auth/application/security-event.service';
import { SecurityEventTypeRepository } from './../src/modules/auth/infrastructure/security-event-type.repository';
import { SecurityEventRepository } from './../src/modules/auth/infrastructure/security-event.repository';
import { UsersController } from './../src/modules/users/presentation/users.controller';
import { UsersService } from './../src/modules/users/application/users.service';
import { CareersCatalogService } from './../src/modules/users/application/careers-catalog.service';
import { PhotoSource, User } from './../src/modules/users/domain/user.entity';
import { RedisCacheService } from '../src/infrastructure/cache/redis-cache.service';

const JWT_SECRET = 'test-jwt-secret';

interface StandardResponse {
  statusCode: number;
  message: string;
  data: unknown;
}

interface RequestWithUrl {
  url: string;
}

describe('IAM (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const adminUser = {
    id: '1',
    email: 'admin@test.com',
    firstName: 'Admin',
    lastName1: null as string | null,
    lastName2: null as string | null,
    phone: null as string | null,
    career: null as string | null,
    profilePhotoUrl: null as string | null,
    photoSource: PhotoSource.NONE,
    isActive: true,
    createdAt: new Date(),
    roles: [{ id: '1', code: 'ADMIN', name: 'Administrador' }],
  };

  const superAdminUser = {
    id: '3',
    email: 'superadmin@test.com',
    firstName: 'Super',
    lastName1: null as string | null,
    lastName2: null as string | null,
    phone: null as string | null,
    career: null as string | null,
    profilePhotoUrl: null as string | null,
    photoSource: PhotoSource.NONE,
    isActive: true,
    createdAt: new Date(),
    roles: [{ id: '3', code: 'SUPER_ADMIN', name: 'Super Admin' }],
  };

  const studentUser = {
    id: '2',
    email: 'student@test.com',
    firstName: 'Student',
    lastName1: null as string | null,
    lastName2: null as string | null,
    phone: null as string | null,
    career: null as string | null,
    profilePhotoUrl: null as string | null,
    photoSource: PhotoSource.NONE,
    isActive: true,
    createdAt: new Date(),
    roles: [{ id: '2', code: 'STUDENT', name: 'Alumno' }],
  };

  const authServiceMock = {
    loginWithGoogle: jest.fn(),
    logout: jest.fn(),
  };

  const usersServiceMock = {
    findOne: jest.fn((id) => {
      if (id === '1') return Promise.resolve(adminUser);
      if (id === '2') return Promise.resolve(studentUser);
      if (id === '3') return Promise.resolve(superAdminUser);
      return Promise.resolve(null);
    }),
    createWithRole: jest.fn((dto, roleCode) =>
      Promise.resolve({
        id: '99',
        ...dto,
        roles: [{ id: '9', code: roleCode, name: roleCode }],
        photoSource: PhotoSource.NONE,
        profilePhotoUrl: null,
        isActive: true,
        createdAt: new Date(),
      }),
    ),
    findAdminUsersTable: jest.fn().mockResolvedValue({
      items: [
        {
          id: adminUser.id,
          fullName: 'Admin',
          email: adminUser.email,
          roles: ['Administrador'],
          careerName: null,
          isActive: true,
        },
        {
          id: studentUser.id,
          fullName: 'Student',
          email: studentUser.email,
          roles: ['Alumno'],
          careerName: null,
          isActive: true,
        },
      ],
      currentPage: 1,
      pageSize: 10,
      totalItems: 2,
      totalPages: 1,
    }),
    update: jest.fn((id, dto) => {
      if (id === '1') {
        return Promise.resolve({
          ...adminUser,
          ...dto,
        });
      }
      if (id === '2') {
        return Promise.resolve({
          ...studentUser,
          ...dto,
        });
      }
      return Promise.resolve(null);
    }),
    adminOnboard: jest.fn().mockResolvedValue({
      userId: '900',
      enrollmentId: 'enr-900',
      assignedRoleCodes: ['STUDENT'],
      professorCourseCycleIds: [],
    }),
    adminEdit: jest.fn().mockResolvedValue({
      userId: '900',
      rolesFinal: ['STUDENT'],
      enrollmentsChanged: {
        cancelledEnrollmentIds: [],
        createdEnrollmentIds: [],
        baseCourseCycleIdsFinal: [],
      },
      professorCourseCyclesChanged: { added: [], removed: [] },
      eventProfessorAssignmentsChanged: { assignedCount: 0, revokedCount: 0 },
    }),
  };

  const careersCatalogServiceMock = {
    listCareers: jest.fn().mockResolvedValue([]),
    refreshCareersCache: jest.fn().mockResolvedValue([]),
  };

  const userSessionRepositoryMock = {
    findByIdWithUser: jest.fn((id) => {
      if (id === 'session-admin')
        return Promise.resolve({
          id,
          isActive: true,
          expiresAt: new Date(Date.now() + 100000),
          user: adminUser,
          sessionStatusId: '1',
          deviceId: 'device-1',
          userId: adminUser.id,
        });
      if (id === 'session-student')
        return Promise.resolve({
          id,
          isActive: true,
          expiresAt: new Date(Date.now() + 100000),
          user: studentUser,
          sessionStatusId: '1',
          deviceId: 'device-1',
          userId: studentUser.id,
        });
      if (id === 'session-superadmin')
        return Promise.resolve({
          id,
          isActive: true,
          expiresAt: new Date(Date.now() + 100000),
          user: superAdminUser,
          sessionStatusId: '1',
          deviceId: 'device-1',
          userId: superAdminUser.id,
        });
      return Promise.resolve(null);
    }),
    update: jest.fn(),
    updateLastActivity: jest.fn().mockResolvedValue(undefined),
    findActiveById: jest.fn((id) => {
      if (id === 'session-admin')
        return Promise.resolve({
          id,
          isActive: true,
          userId: adminUser.id,
          deviceId: 'device-1',
        });
      if (id === 'session-student')
        return Promise.resolve({
          id,
          isActive: true,
          userId: studentUser.id,
          deviceId: 'device-1',
        });
      if (id === 'session-superadmin')
        return Promise.resolve({
          id,
          isActive: true,
          userId: superAdminUser.id,
          deviceId: 'device-1',
        });
      return Promise.resolve(null);
    }),
  };

  class MockJwtAuthGuard extends JwtAuthGuard {
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const req = context.switchToHttp().getRequest<RequestWithUrl>();
      if (req.url.includes('/auth/google')) return true;
      return (await super.canActivate(context)) as boolean;
    }
  }

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: JWT_SECRET }),
      ],
      controllers: [AuthController, UsersController],
      providers: [
        JwtStrategy,
        Reflector,
        {
          provide: APP_GUARD,
          useClass: MockJwtAuthGuard,
        },
        {
          provide: APP_GUARD,
          useClass: RolesGuard,
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'JWT_SECRET') return JWT_SECRET;
              return undefined;
            },
          },
        },
        { provide: UsersService, useValue: usersServiceMock },
        {
          provide: CareersCatalogService,
          useValue: careersCatalogServiceMock,
        },
        { provide: AuthService, useValue: authServiceMock },
        { provide: UserSessionRepository, useValue: userSessionRepositoryMock },
        {
          provide: SessionStatusService,
          useValue: {
            getIdByCode: jest.fn().mockResolvedValue('1'),
            onModuleInit: jest.fn(),
            refreshCache: jest.fn(),
          },
        },
        SessionValidatorService,
        SessionConflictService,
        SessionSecurityService,
        {
          provide: SecurityEventService,
          useValue: {
            logEvent: jest.fn(),
            onModuleInit: jest.fn(),
            refreshCache: jest.fn(),
          },
        },
        {
          provide: SecurityEventTypeRepository,
          useValue: { findAll: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: SecurityEventRepository,
          useValue: { create: jest.fn() },
        },
        { provide: DataSource, useValue: {} },
        {
          provide: RedisCacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            del: jest.fn().mockResolvedValue(undefined),
            invalidateGroup: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    const httpAdapterHost = app.get(HttpAdapterHost);
    const reflector = app.get(Reflector);
    app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));
    app.useGlobalInterceptors(new TransformInterceptor(reflector));

    jwtService = moduleRef.get(JwtService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const getAdminToken = () =>
    jwtService.sign({
      sub: '1',
      email: adminUser.email,
      roles: ['ADMIN'],
      activeRole: 'ADMIN',
      sessionId: 'session-admin',
      deviceId: 'device-1',
    });

  const getStudentToken = () =>
    jwtService.sign({
      sub: '2',
      email: studentUser.email,
      roles: ['STUDENT'],
      activeRole: 'STUDENT',
      sessionId: 'session-student',
      deviceId: 'device-1',
    });

  const getSuperAdminToken = () =>
    jwtService.sign({
      sub: '3',
      email: superAdminUser.email,
      roles: ['SUPER_ADMIN'],
      activeRole: 'SUPER_ADMIN',
      sessionId: 'session-superadmin',
      deviceId: 'device-1',
    });

  describe('POST /api/v1/auth/google', () => {
    it('retorna tokens dentro de data', async () => {
      authServiceMock.loginWithGoogle.mockResolvedValue({
        accessToken: 'mock-access',
        refreshToken: 'mock-refresh',
        user: adminUser,
        sessionStatus: 'ACTIVE',
        concurrentSessionId: null,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/google')
        .send({ code: 'valid-code', deviceId: 'device-1' })
        .expect(200); // Antes esperábamos 201, pero AuthService.loginWithGoogle devuelve un objeto plano envuelto en interceptor -> 200

      const body = response.body as StandardResponse;
      expect(body.statusCode).toBe(200);
      expect(body.data).toHaveProperty('accessToken');
      expect(body.data).toHaveProperty('user');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('con token válido -> 200 y ejecuta logout', async () => {
      const token = getAdminToken();

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .set('User-Agent', 'iam-e2e-agent')
        .expect(200);

      expect(authServiceMock.logout).toHaveBeenCalledWith(
        'session-admin',
        '1',
        {
          ipAddress: '127.0.0.1',
          userAgent: 'iam-e2e-agent',
          deviceId: 'device-1',
        },
        'ADMIN',
      );
    });
  });

  describe('GET /api/v1/users', () => {
    it('sin token -> 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/users').expect(401);
    });

    it('con token sin rol ADMIN/SUPER_ADMIN -> 403', async () => {
      const token = getStudentToken();
      await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('con token ADMIN -> 200', async () => {
      const token = getAdminToken();
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as StandardResponse;
      expect(body.statusCode).toBe(200);
      expect(body.data).toMatchObject({
        currentPage: 1,
        pageSize: 10,
        totalItems: 2,
        totalPages: 1,
      });
      expect(Array.isArray((body.data as { items: unknown[] }).items)).toBe(
        true,
      );
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('requiere JWT pero no rol (200 con token sin rol)', async () => {
      const token = getStudentToken();
      await request(app.getHttpServer())
        .get('/api/v1/users/2')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    it('con token sin rol ADMIN/SUPER_ADMIN -> 403', async () => {
      const token = getStudentToken();

      await request(app.getHttpServer())
        .patch('/api/v1/users/2')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'Nuevo Nombre' })
        .expect(403);
    });

    it('con token ADMIN -> 200', async () => {
      const token = getAdminToken();

      const response = await request(app.getHttpServer())
        .patch('/api/v1/users/2')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'Nuevo Nombre' })
        .expect(200);

      const body = response.body as StandardResponse;
      expect(body.statusCode).toBe(200);
      expect(usersServiceMock.update).toHaveBeenCalledWith('2', {
        firstName: 'Nuevo Nombre',
      });
      expect(body.data).toMatchObject({
        id: '2',
        firstName: 'Nuevo Nombre',
      });
    });
  });

  describe('PATCH /api/v1/users/:id/status', () => {
    it('con token sin rol ADMIN/SUPER_ADMIN -> 403', async () => {
      const token = getStudentToken();

      await request(app.getHttpServer())
        .patch('/api/v1/users/2/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false })
        .expect(403);
    });

    it('con token ADMIN -> 200', async () => {
      const token = getAdminToken();

      const response = await request(app.getHttpServer())
        .patch('/api/v1/users/2/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false })
        .expect(200);

      const body = response.body as StandardResponse;
      expect(body.statusCode).toBe(200);
      expect(usersServiceMock.update).toHaveBeenCalledWith('2', {
        isActive: false,
      });
    });

    it('con token ADMIN desactivando su propia cuenta -> 403', async () => {
      const token = getAdminToken();

      await request(app.getHttpServer())
        .patch('/api/v1/users/1/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false })
        .expect(403);
    });
  });

  describe('POST /api/v1/users/admins', () => {
    it('con token ADMIN -> 403', async () => {
      const token = getAdminToken();

      await request(app.getHttpServer())
        .post('/api/v1/users/admins')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'newadmin@test.com', firstName: 'Nuevo' })
        .expect(403);
    });

    it('con token SUPER_ADMIN -> 201', async () => {
      const token = getSuperAdminToken();

      await request(app.getHttpServer())
        .post('/api/v1/users/admins')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'newadmin@test.com', firstName: 'Nuevo' })
        .expect(201);

      expect(usersServiceMock.createWithRole).toHaveBeenCalledWith(
        { email: 'newadmin@test.com', firstName: 'Nuevo' },
        'ADMIN',
      );
    });
  });

  describe('POST /api/v1/users/students', () => {
    it('con token ADMIN -> 201', async () => {
      const token = getAdminToken();

      await request(app.getHttpServer())
        .post('/api/v1/users/students')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'student2@test.com', firstName: 'Student' })
        .expect(201);

      expect(usersServiceMock.createWithRole).toHaveBeenCalledWith(
        { email: 'student2@test.com', firstName: 'Student' },
        'STUDENT',
      );
    });
  });

  describe('POST /api/v1/users/professors', () => {
    it('con token ADMIN -> 201', async () => {
      const token = getAdminToken();

      await request(app.getHttpServer())
        .post('/api/v1/users/professors')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'prof2@test.com', firstName: 'Professor' })
        .expect(201);

      expect(usersServiceMock.createWithRole).toHaveBeenCalledWith(
        { email: 'prof2@test.com', firstName: 'Professor' },
        'PROFESSOR',
      );
    });
  });

  describe('POST /api/v1/users/admin-onboarding', () => {
    it('con token STUDENT -> 403', async () => {
      const token = getStudentToken();
      await request(app.getHttpServer())
        .post('/api/v1/users/admin-onboarding')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'nuevo@test.com',
          firstName: 'Nuevo',
          roleCodes: ['STUDENT'],
        })
        .expect(403);
    });

    it('con token ADMIN -> 201', async () => {
      const token = getAdminToken();
      const payload = {
        email: 'nuevo@test.com',
        firstName: 'Nuevo',
        roleCodes: ['STUDENT'],
      };
      const response = await request(app.getHttpServer())
        .post('/api/v1/users/admin-onboarding')
        .set('Authorization', `Bearer ${token}`)
        .send(payload)
        .expect(201);

      const body = response.body as StandardResponse;
      expect(body.statusCode).toBe(201);
      expect(usersServiceMock.adminOnboard).toHaveBeenCalledWith(payload);
      expect(body.data).toMatchObject({
        userId: '900',
        assignedRoleCodes: ['STUDENT'],
      });
    });
  });

  describe('PATCH /api/v1/users/:id/admin-edit', () => {
    it('con token STUDENT -> 403', async () => {
      const token = getStudentToken();

      await request(app.getHttpServer())
        .patch('/api/v1/users/2/admin-edit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roleCodesFinal: ['STUDENT'],
          studentStateFinal: { enrollments: [] },
          professorStateFinal: { courseCycleIds: [] },
        })
        .expect(403);
    });

    it('con token ADMIN -> 200', async () => {
      const token = getAdminToken();

      await request(app.getHttpServer())
        .patch('/api/v1/users/2/admin-edit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roleCodesFinal: ['STUDENT'],
          studentStateFinal: { enrollments: [] },
          professorStateFinal: { courseCycleIds: [] },
        })
        .expect(200);

      expect(usersServiceMock.adminEdit).toHaveBeenCalledWith(
        '2',
        expect.objectContaining({
          roleCodesFinal: ['STUDENT'],
        }),
        '1',
      );
    });
  });
});

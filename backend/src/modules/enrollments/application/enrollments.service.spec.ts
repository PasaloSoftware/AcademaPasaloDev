import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { EntityManager } from 'typeorm';
import { DataSource } from 'typeorm';
import { EnrollmentsService } from '@modules/enrollments/application/enrollments.service';
import { EnrollmentRepository } from '@modules/enrollments/infrastructure/enrollment.repository';
import { EnrollmentStatusRepository } from '@modules/enrollments/infrastructure/enrollment-status.repository';
import { EnrollmentEvaluationRepository } from '@modules/enrollments/infrastructure/enrollment-evaluation.repository';
import { EnrollmentTypeRepository } from '@modules/enrollments/infrastructure/enrollment-type.repository';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { MediaAccessMembershipDispatchService } from '@modules/media-access/application/media-access-membership-dispatch.service';

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;

  const managerMock = {
    query: jest.fn(),
    getRepository: jest.fn(),
  } as unknown as EntityManager;

  const dataSourceMock = {
    transaction: jest.fn(async (cb: (manager: EntityManager) => unknown) => {
      return await cb(managerMock);
    }),
  };

  const enrollmentRepositoryMock = {
    findActiveByUserAndCourseCycle: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    findMyEnrollments: jest.fn(),
  };

  const enrollmentStatusRepositoryMock = {
    findByCode: jest.fn(),
  };

  const enrollmentEvaluationRepositoryMock = {
    createMany: jest.fn(),
    findEvaluationIdsToRevokeAfterEnrollmentCancellation: jest.fn(),
  };

  const enrollmentTypeRepositoryMock = {
    findByCode: jest.fn(),
  };

  const cacheServiceMock = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    invalidateGroup: jest.fn(),
  };

  const mediaAccessMembershipDispatchServiceMock = {
    enqueueGrantForUserEvaluations: jest.fn(),
    enqueueGrantForUserCourseCycles: jest.fn(),
    enqueueRevokeForUserEvaluations: jest.fn(),
    enqueueRevokeForUserCourseCycles: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        EnrollmentsService,
        { provide: DataSource, useValue: dataSourceMock },
        { provide: EnrollmentRepository, useValue: enrollmentRepositoryMock },
        {
          provide: EnrollmentStatusRepository,
          useValue: enrollmentStatusRepositoryMock,
        },
        {
          provide: EnrollmentEvaluationRepository,
          useValue: enrollmentEvaluationRepositoryMock,
        },
        {
          provide: EnrollmentTypeRepository,
          useValue: enrollmentTypeRepositoryMock,
        },
        { provide: RedisCacheService, useValue: cacheServiceMock },
        {
          provide: MediaAccessMembershipDispatchService,
          useValue: mediaAccessMembershipDispatchServiceMock,
        },
      ],
    }).compile();

    service = moduleRef.get(EnrollmentsService);
  });

  it('enroll rechaza usuarios sin rol STUDENT activo', async () => {
    enrollmentRepositoryMock.findActiveByUserAndCourseCycle.mockResolvedValue(
      null,
    );
    (managerMock.query as jest.Mock).mockResolvedValue([
      { isActiveStudent: 0 },
    ]);

    await expect(
      service.enroll({
        userId: '9',
        courseCycleId: '20',
        enrollmentTypeCode: 'FULL',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(enrollmentTypeRepositoryMock.findByCode).not.toHaveBeenCalled();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ClassEventsPermissionService } from '@modules/events/application/class-events-permission.service';
import { EnrollmentEvaluationRepository } from '@modules/enrollments/infrastructure/enrollment-evaluation.repository';
import { CourseCycleProfessorRepository } from '@modules/courses/infrastructure/course-cycle-professor.repository';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { AuthSettingsService } from '@modules/auth/application/auth-settings.service';
import { ROLE_CODES } from '@common/constants/role-codes.constants';

describe('ClassEventsPermissionService', () => {
  let service: ClassEventsPermissionService;
  let enrollmentEvaluationRepository: jest.Mocked<EnrollmentEvaluationRepository>;
  let courseCycleProfessorRepository: jest.Mocked<CourseCycleProfessorRepository>;
  let cacheService: jest.Mocked<RedisCacheService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassEventsPermissionService,
        {
          provide: EnrollmentEvaluationRepository,
          useValue: {
            checkAccess: jest.fn(),
          },
        },
        {
          provide: CourseCycleProfessorRepository,
          useValue: {
            isProfessorAssignedToEvaluation: jest.fn(),
            canProfessorReadEvaluation: jest.fn(),
          },
        },
        {
          provide: RedisCacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: AuthSettingsService,
          useValue: {
            getActiveCycleId: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ClassEventsPermissionService);
    enrollmentEvaluationRepository = module.get(EnrollmentEvaluationRepository);
    courseCycleProfessorRepository = module.get(CourseCycleProfessorRepository);
    cacheService = module.get(RedisCacheService);
  });

  it('uses activeRole instead of the full roles list for admin bypass', async () => {
    enrollmentEvaluationRepository.checkAccess.mockResolvedValue(false);

    const result = await service.checkUserAuthorizationForUser(
      {
        id: 'user-1',
        activeRole: ROLE_CODES.STUDENT,
        roles: [{ code: ROLE_CODES.STUDENT }, { code: ROLE_CODES.ADMIN }],
      } as any,
      'eval-1',
    );

    expect(result).toBe(false);
    expect(enrollmentEvaluationRepository.checkAccess).toHaveBeenCalledWith(
      'user-1',
      'eval-1',
    );
    expect(
      courseCycleProfessorRepository.canProfessorReadEvaluation,
    ).not.toHaveBeenCalled();
    expect(cacheService.get).not.toHaveBeenCalled();
  });

  it('keeps bypass only when activeRole is actually admin', async () => {
    const result = await service.checkUserAuthorizationForUser(
      {
        id: 'user-2',
        activeRole: ROLE_CODES.ADMIN,
        roles: [{ code: ROLE_CODES.ADMIN }, { code: ROLE_CODES.STUDENT }],
      } as any,
      'eval-1',
    );

    expect(result).toBe(true);
    expect(enrollmentEvaluationRepository.checkAccess).not.toHaveBeenCalled();
    expect(
      courseCycleProfessorRepository.canProfessorReadEvaluation,
    ).not.toHaveBeenCalled();
  });
});

import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { EnrollmentEvaluationRepository } from '@modules/enrollments/infrastructure/enrollment-evaluation.repository';
import { CourseCycleProfessorRepository } from '@modules/courses/infrastructure/course-cycle-professor.repository';
import { UserRepository } from '@modules/users/infrastructure/user.repository';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { AuthSettingsService } from '@modules/auth/application/auth-settings.service';
import { User } from '@modules/users/domain/user.entity';
import {
  ADMIN_ROLE_CODES,
  ROLE_CODES,
} from '@common/constants/role-codes.constants';
import { COURSE_CACHE_KEYS } from '@modules/courses/domain/course.constants';
import { technicalSettings } from '@config/technical-settings';

@Injectable()
export class ClassEventsPermissionService {
  private readonly PROFESSOR_ASSIGNMENT_CACHE_TTL =
    technicalSettings.cache.events.professorAssignmentCacheTtlSeconds;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly enrollmentEvaluationRepository: EnrollmentEvaluationRepository,
    private readonly courseCycleProfessorRepository: CourseCycleProfessorRepository,
    private readonly authSettingsService: AuthSettingsService,
    private readonly cacheService: RedisCacheService,
  ) {}

  isAdminUser(user: User): boolean {
    const roles = (user.roles || []).map((r) => r.code);
    return ADMIN_ROLE_CODES.some((roleCode) => roles.includes(roleCode));
  }

  async checkUserAuthorization(
    userId: string,
    evaluationId: string,
  ): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) return false;

    return await this.checkUserAuthorizationWithUser(user, evaluationId);
  }

  async checkUserAuthorizationForUser(
    user: User,
    evaluationId: string,
  ): Promise<boolean> {
    return await this.checkUserAuthorizationWithUser(user, evaluationId);
  }

  private async checkUserAuthorizationWithUser(
    user: User,
    evaluationId: string,
  ): Promise<boolean> {
    const roleCodes = (user.roles || []).map((r) => r.code);

    if (roleCodes.some((r) => ADMIN_ROLE_CODES.includes(r))) {
      return true;
    }

    if (roleCodes.includes(ROLE_CODES.PROFESSOR)) {
      const cacheKey = COURSE_CACHE_KEYS.PROFESSOR_ASSIGNMENT(
        evaluationId,
        user.id,
      );
      const cached = await this.cacheService.get<boolean>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      const isAssigned =
        await this.courseCycleProfessorRepository.isProfessorAssignedToEvaluation(
          evaluationId,
          user.id,
        );

      await this.cacheService.set(
        cacheKey,
        isAssigned,
        this.PROFESSOR_ASSIGNMENT_CACHE_TTL,
      );
      return isAssigned;
    }

    return await this.enrollmentEvaluationRepository.checkAccess(
      user.id,
      evaluationId,
    );
  }

  async assertMutationAllowedForEvaluation(
    user: User,
    evaluation: {
      id: string;
      courseCycle?: { academicCycleId: string } | null;
    },
  ): Promise<void> {
    if (this.isAdminUser(user)) {
      return;
    }

    const activeCycleId = await this.authSettingsService.getActiveCycleId();
    const evaluationCycleId = evaluation.courseCycle?.academicCycleId;
    if (!evaluationCycleId) {
      throw new InternalServerErrorException(
        'No se pudo resolver el ciclo académico de la evaluación',
      );
    }

    if (evaluationCycleId !== activeCycleId) {
      throw new BadRequestException(
        'Solo puedes modificar eventos de tu curso en el ciclo actual',
      );
    }

    const isAssigned =
      await this.courseCycleProfessorRepository.isProfessorAssignedToEvaluation(
        evaluation.id,
        user.id,
      );
    if (!isAssigned) {
      throw new ForbiddenException(
        'No tienes permisos para modificar eventos de esta evaluación',
      );
    }
  }

  validateEventOwnership(creatorId: string, user: User): void {
    const isAdmin = this.isAdminUser(user);

    if (!isAdmin && creatorId !== user.id) {
      throw new ForbiddenException(
        'Solo el creador o un administrador puede realizar esta acción',
      );
    }
  }
}

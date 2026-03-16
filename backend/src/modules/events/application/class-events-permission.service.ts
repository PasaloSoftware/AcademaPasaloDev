import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { EnrollmentEvaluationRepository } from '@modules/enrollments/infrastructure/enrollment-evaluation.repository';
import { CourseCycleProfessorRepository } from '@modules/courses/infrastructure/course-cycle-professor.repository';
import { AuthSettingsService } from '@modules/auth/application/auth-settings.service';
import { User } from '@modules/users/domain/user.entity';
import {
  ADMIN_ROLE_CODES,
  ROLE_CODES,
} from '@common/constants/role-codes.constants';

@Injectable()
export class ClassEventsPermissionService {
  constructor(
    private readonly enrollmentEvaluationRepository: EnrollmentEvaluationRepository,
    private readonly courseCycleProfessorRepository: CourseCycleProfessorRepository,
    private readonly authSettingsService: AuthSettingsService,
  ) {}

  isAdminUser(user: User): boolean {
    return this.hasAdminAccess(user);
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
    if (this.hasAdminAccess(user)) {
      return true;
    }

    if (this.hasProfessorAccess(user)) {
      return await this.courseCycleProfessorRepository.canProfessorReadEvaluation(
        evaluationId,
        user.id,
      );
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

  private normalizeRole(user: User): string {
    return String((user as User & { activeRole?: string }).activeRole || '')
      .trim()
      .toUpperCase();
  }

  private hasAdminAccess(user: User): boolean {
    return ADMIN_ROLE_CODES.includes(this.normalizeRole(user));
  }

  private hasProfessorAccess(user: User): boolean {
    return this.normalizeRole(user) === ROLE_CODES.PROFESSOR;
  }
}

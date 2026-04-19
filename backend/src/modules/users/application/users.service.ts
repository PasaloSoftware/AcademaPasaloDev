import {
  Injectable,
  NotFoundException,
  ConflictException,
  ServiceUnavailableException,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DataSource, EntityManager, In, LessThan } from 'typeorm';
import { User } from '@modules/users/domain/user.entity';
import { Role } from '@modules/users/domain/role.entity';
import { Enrollment } from '@modules/enrollments/domain/enrollment.entity';
import { EnrollmentEvaluation } from '@modules/enrollments/domain/enrollment-evaluation.entity';
import { CourseCycle } from '@modules/courses/domain/course-cycle.entity';
import { Evaluation } from '@modules/evaluations/domain/evaluation.entity';
import { CourseCycleProfessor } from '@modules/courses/domain/course-cycle-professor.entity';
import { UserRepository } from '@modules/users/infrastructure/user.repository';
import { RoleRepository } from '@modules/users/infrastructure/role.repository';
import { CareerRepository } from '@modules/users/infrastructure/career.repository';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { technicalSettings } from '@config/technical-settings';
import { CreateUserDto } from '@modules/users/dto/create-user.dto';
import { UpdateUserDto } from '@modules/users/dto/update-user.dto';
import {
  AdminUserStatusFilter,
  AdminUsersListQueryDto,
  AdminUsersListItemDto,
  AdminUsersListResponseDto,
  AdminUsersRoleFilterOptionDto,
  AdminUsersStatusFilterOptionDto,
} from '@modules/users/dto/admin-users-list.dto';
import {
  AdminCourseOptionDto,
  AdminUserDetailResponseDto,
} from '@modules/users/dto/admin-user-detail.dto';
import { AdminDashboardStatsDto } from '@modules/users/dto/admin-dashboard-stats.dto';
import {
  AdminUserOnboardingDto,
  AdminUserOnboardingResponseDto,
  AdminStudentEnrollmentInputDto,
} from '@modules/users/dto/admin-user-onboarding.dto';
import {
  AdminEditPersonalInfoDto,
  AdminUserEditDto,
  AdminUserEditResponseDto,
} from '@modules/users/dto/admin-user-edit.dto';
import { IdentitySecurityService } from '@modules/users/application/identity-security.service';
import { IDENTITY_INVALIDATION_REASONS } from '@modules/auth/interfaces/security.constants';
import { QUEUES } from '@infrastructure/queue/queue.constants';
import {
  MEDIA_ACCESS_JOB_NAMES,
  MEDIA_ACCESS_MEMBERSHIP_ACTIONS,
  MEDIA_ACCESS_SYNC_SOURCES,
} from '@modules/media-access/domain/media-access.constants';
import {
  DatabaseError,
  MySqlErrorCode,
} from '@common/interfaces/database-error.interface';
import {
  getErrnoFromDbError,
  getMessageFromDbError,
} from '@common/utils/mysql-error.util';
import { ADMIN_ROLE_CODES } from '@common/constants/role-codes.constants';
import { ROLE_CODES } from '@common/constants/role-codes.constants';
import { MediaAccessMembershipDispatchService } from '@modules/media-access/application/media-access-membership-dispatch.service';
import { AUDIT_ACTION_CODES } from '@modules/audit/interfaces/audit.constants';
import { USER_CACHE_KEYS } from '@modules/users/domain/user.constants';
import { COURSE_CACHE_KEYS } from '@modules/courses/domain/course.constants';
import {
  ENROLLMENT_STATUS_CODES,
  ENROLLMENT_TYPE_CODES,
} from '@modules/enrollments/domain/enrollment.constants';
import { EVALUATION_TYPE_CODES } from '@modules/evaluations/domain/evaluation.constants';
import {
  toBusinessDayEndUtc,
  toBusinessDayStartUtc,
} from '@common/utils/peru-time.util';

const ADMIN_USERS_PAGE_SIZE = 10;
const ROLE_LABELS: Record<string, string> = {
  [ROLE_CODES.STUDENT]: 'Alumno',
  [ROLE_CODES.PROFESSOR]: 'Asesor',
  [ROLE_CODES.ADMIN]: 'Administrador',
  [ROLE_CODES.SUPER_ADMIN]: 'Superadministrador',
};
const ROLE_DISPLAY_ORDER: string[] = [
  ROLE_CODES.STUDENT,
  ROLE_CODES.PROFESSOR,
  ROLE_CODES.ADMIN,
  ROLE_CODES.SUPER_ADMIN,
];
const STATUS_FILTER_OPTIONS: AdminUsersStatusFilterOptionDto[] = [
  { code: 'ACTIVE', label: 'Activo' },
  { code: 'INACTIVE', label: 'Inactivo' },
];
const ADMIN_USERS_BASE_CACHE_TTL_SECONDS =
  technicalSettings.cache.users.adminUsersBaseListCacheTtlSeconds;
const COURSES_CATALOG_CACHE_TTL_SECONDS =
  technicalSettings.cache.users.coursesCatalogCacheTtlSeconds;
const ADMIN_DASHBOARD_STATS_CACHE_TTL_SECONDS =
  ADMIN_USERS_BASE_CACHE_TTL_SECONDS;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly careerRepository: CareerRepository,
    private readonly cacheService: RedisCacheService,
    private readonly identitySecurityService: IdentitySecurityService,
    private readonly mediaAccessMembershipDispatchService: MediaAccessMembershipDispatchService,
    @InjectQueue(QUEUES.MEDIA_ACCESS)
    private readonly mediaAccessQueue: Queue,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    await this.ensureCareerExistsIfProvided(createUserDto.careerId);

    const existingUser = await this.userRepository.findByEmail(
      createUserDto.email,
    );

    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    const now = new Date();
    let createdUser: User;
    try {
      createdUser = await this.userRepository.create({
        ...createUserDto,
        createdAt: now,
        updatedAt: null,
      });
    } catch (error) {
      const errno = getErrnoFromDbError(error as DatabaseError);
      if (errno === MySqlErrorCode.DUPLICATE_ENTRY) {
        throw new ConflictException('El correo electrónico ya está registrado');
      }
      throw error;
    }

    await this.invalidateAdminUsersBaseCache();
    return createdUser;
  }

  async createWithRole(
    createUserDto: CreateUserDto,
    roleCode: string,
  ): Promise<User> {
    const normalizedRoleCode = String(roleCode || '')
      .trim()
      .toUpperCase();

    await this.ensureCareerExistsIfProvided(createUserDto.careerId);

    const createdUser = await this.dataSource.transaction(async (manager) => {
      const existingUser = await this.userRepository.findByEmail(
        createUserDto.email,
        manager,
      );

      if (existingUser) {
        throw new ConflictException('El correo electrónico ya está registrado');
      }

      const role = await this.roleRepository.findByCode(
        normalizedRoleCode,
        manager,
      );
      if (!role) {
        throw new NotFoundException(`Rol ${normalizedRoleCode} no encontrado`);
      }

      const now = new Date();
      try {
        return await this.userRepository.create(
          {
            ...createUserDto,
            createdAt: now,
            updatedAt: null,
            roles: [role],
            lastActiveRoleId: role.id,
          },
          manager,
        );
      } catch (error) {
        const errno = getErrnoFromDbError(error as DatabaseError);
        if (errno === MySqlErrorCode.DUPLICATE_ENTRY) {
          throw new ConflictException(
            'El correo electrónico ya está registrado',
          );
        }
        throw error;
      }
    });

    await this.enqueueImmediateStaffReconciliationIfNeeded({
      userId: createdUser.id,
      roleCode: normalizedRoleCode,
      event: 'ASSIGN_ROLE',
      shouldEnqueue:
        createdUser.isActive &&
        this.shouldTriggerStaffReconciliationForRoleCode(normalizedRoleCode),
    });

    await this.invalidateAdminUsersBaseCache();
    return createdUser;
  }

  async adminOnboard(
    dto: AdminUserOnboardingDto,
  ): Promise<AdminUserOnboardingResponseDto> {
    const roleCodes = this.normalizeAdminOnboardingRoleCodes(dto.roleCodes);
    await this.ensureCareerExistsIfProvided(dto.careerId);

    const result = await this.dataSource.transaction(async (manager) => {
      const existingUser = await this.userRepository.findByEmail(
        dto.email,
        manager,
      );
      if (existingUser) {
        throw new ConflictException(
          'El correo electrÃƒÂ³nico ya estÃƒÂ¡ registrado',
        );
      }

      const roleEntities = await manager.getRepository(Role).find({
        where: { code: In(roleCodes) },
      });
      const roleMap = new Map(roleEntities.map((role) => [role.code, role]));
      const missingRoles = roleCodes.filter((code) => !roleMap.has(code));
      if (missingRoles.length > 0) {
        throw new BadRequestException(
          `Roles no validos: ${missingRoles.join(', ')}`,
        );
      }

      const now = new Date();
      const orderedRoleEntities = roleCodes.map((code) => roleMap.get(code));
      const createdUser = await this.userRepository.create(
        {
          email: dto.email,
          firstName: dto.firstName,
          lastName1: dto.lastName1 ?? null,
          lastName2: dto.lastName2 ?? null,
          phone: dto.phone ?? null,
          careerId: dto.careerId,
          profilePhotoUrl: dto.profilePhotoUrl ?? null,
          photoSource: dto.photoSource ?? undefined,
          createdAt: now,
          updatedAt: null,
          roles: orderedRoleEntities,
          lastActiveRoleId: orderedRoleEntities[0]?.id ?? null,
        },
        manager,
      );

      let enrollmentId: string | null = null;
      let grantedEnrollmentEvaluationIds: string[] = [];
      let grantedEnrollmentCourseCycleIds: string[] = [];
      let professorCourseCycleIds: string[] = [];
      let professorEvaluationIds: string[] = [];

      if (dto.studentEnrollment) {
        if (!roleCodes.includes(ROLE_CODES.STUDENT)) {
          throw new BadRequestException(
            'Para registrar matricula, el usuario debe incluir el rol STUDENT',
          );
        }
        const enrollmentResult = await this.createEnrollmentForOnboarding({
          userId: createdUser.id,
          payload: dto.studentEnrollment,
          manager,
        });
        enrollmentId = enrollmentResult.enrollmentId;
        grantedEnrollmentEvaluationIds = enrollmentResult.grantedEvaluationIds;
        grantedEnrollmentCourseCycleIds =
          enrollmentResult.grantedCourseCycleIds;
      }

      if (dto.professorAssignments?.courseCycleIds?.length) {
        if (!roleCodes.includes(ROLE_CODES.PROFESSOR)) {
          throw new BadRequestException(
            'Para asignar cursos a cargo, el usuario debe incluir el rol PROFESSOR',
          );
        }
        const assignmentResult =
          await this.assignProfessorCourseCyclesForOnboarding({
            userId: createdUser.id,
            courseCycleIds: dto.professorAssignments.courseCycleIds,
            manager,
          });
        professorCourseCycleIds = assignmentResult.courseCycleIds;
        professorEvaluationIds = assignmentResult.evaluationIds;
      }

      return {
        userId: createdUser.id,
        enrollmentId,
        assignedRoleCodes: roleCodes,
        professorCourseCycleIds,
        enrollmentEvaluationIds: grantedEnrollmentEvaluationIds,
        enrollmentCourseCycleIds: grantedEnrollmentCourseCycleIds,
        professorEvaluationIds,
      };
    });

    if (result.enrollmentEvaluationIds.length > 0) {
      await this.mediaAccessMembershipDispatchService.enqueueGrantForUserEvaluations(
        result.userId,
        result.enrollmentEvaluationIds,
        MEDIA_ACCESS_SYNC_SOURCES.ENROLLMENT_CREATED,
      );
    }
    if (result.enrollmentCourseCycleIds.length > 0) {
      await this.mediaAccessMembershipDispatchService.enqueueGrantForUserCourseCycles(
        result.userId,
        result.enrollmentCourseCycleIds,
        MEDIA_ACCESS_SYNC_SOURCES.ENROLLMENT_CREATED_COURSE_CYCLE,
      );
    }
    if (result.professorEvaluationIds.length > 0) {
      await this.mediaAccessMembershipDispatchService.enqueueGrantForUserEvaluations(
        result.userId,
        result.professorEvaluationIds,
        MEDIA_ACCESS_SYNC_SOURCES.PROFESSOR_ASSIGNED_COURSE_CYCLE,
      );
    }
    if (result.professorCourseCycleIds.length > 0) {
      await this.mediaAccessMembershipDispatchService.enqueueGrantForUserCourseCycles(
        result.userId,
        result.professorCourseCycleIds,
        MEDIA_ACCESS_SYNC_SOURCES.PROFESSOR_ASSIGNED_COURSE_CYCLE,
      );
    }

    const adminRoleForReconciliation = result.assignedRoleCodes.find((code) =>
      this.shouldTriggerStaffReconciliationForRoleCode(code),
    );
    await this.enqueueImmediateStaffReconciliationIfNeeded({
      userId: result.userId,
      roleCode: adminRoleForReconciliation || ROLE_CODES.ADMIN,
      event: 'ASSIGN_ROLE',
      shouldEnqueue: Boolean(adminRoleForReconciliation),
    });

    await this.invalidateAdminUsersBaseCache();
    if (result.enrollmentId) {
      await this.invalidateAdminCourseCyclesListCache();
    }

    return {
      userId: result.userId,
      enrollmentId: result.enrollmentId,
      assignedRoleCodes: result.assignedRoleCodes,
      professorCourseCycleIds: result.professorCourseCycleIds,
    };
  }

  async adminEdit(
    userId: string,
    dto: AdminUserEditDto,
    performedByUserId: string,
  ): Promise<AdminUserEditResponseDto> {
    const finalRoleCodes = this.normalizeAdminOnboardingRoleCodes(
      dto.roleCodesFinal,
    );
    const finalEnrollments = this.normalizeAdminEditFinalEnrollments(
      dto.studentStateFinal?.enrollments || [],
    );
    const finalProfessorCourseCycleIds = this.normalizeAdminEditProfessorCycles(
      dto.professorStateFinal?.courseCycleIds || [],
    );

    if (
      !finalRoleCodes.includes(ROLE_CODES.STUDENT) &&
      finalEnrollments.length > 0
    ) {
      throw new ConflictException(
        'No se puede quitar rol STUDENT mientras existan matriculas activas en el estado final.',
      );
    }

    if (
      !finalRoleCodes.includes(ROLE_CODES.PROFESSOR) &&
      finalProfessorCourseCycleIds.length > 0
    ) {
      throw new ConflictException(
        'No se puede quitar rol PROFESSOR mientras existan cursos a cargo en el estado final.',
      );
    }

    const transactionResult = await this.dataSource.transaction(
      async (manager) => {
        const user = await this.userRepository.findById(userId, manager);
        if (!user) {
          throw new NotFoundException('Usuario no encontrado');
        }
        await manager.query('SELECT id FROM `user` WHERE id = ? FOR UPDATE', [
          userId,
        ]);

        const previousRoleCodes = Array.from(
          new Set(
            (user.roles || [])
              .map((role) =>
                String(role.code || '')
                  .trim()
                  .toUpperCase(),
              )
              .filter((code) => code.length > 0),
          ),
        );
        const previousEmail = String(user.email || '')
          .trim()
          .toLowerCase();

        await this.applyPersonalInfoUpdatesForAdminEdit({
          user,
          personalInfo: dto.personalInfo,
          manager,
        });

        const roleEntities = await manager.getRepository(Role).find({
          where: { code: In(finalRoleCodes) },
        });
        const roleMap = new Map(roleEntities.map((role) => [role.code, role]));
        const missingRoles = finalRoleCodes.filter(
          (code) => !roleMap.has(code),
        );
        if (missingRoles.length > 0) {
          throw new BadRequestException(
            `Roles no validos: ${missingRoles.join(', ')}`,
          );
        }
        user.roles = finalRoleCodes.map((code) => roleMap.get(code));
        user.lastActiveRoleId = user.roles[0]?.id ?? null;
        user.updatedAt = new Date();
        await this.userRepository.save(user, manager);
        const nextEmail = String(user.email || '')
          .trim()
          .toLowerCase();

        const [beforeEvaluationIds, beforeCourseCycleIds] = await Promise.all([
          this.listMediaAccessEvaluationIdsForUser(userId, manager),
          this.listMediaAccessCourseCycleIdsForUser(userId, manager),
        ]);

        const enrollmentChanges =
          await this.reconcileStudentEnrollmentsForAdminEdit({
            userId,
            finalRoleCodes,
            finalEnrollments,
            manager,
          });

        const currentProfessorCourseCycleRows = await manager.query<
          Array<{ courseCycleId: string }>
        >(
          `
            SELECT ccp.course_cycle_id AS courseCycleId
            FROM course_cycle_professor ccp
            WHERE ccp.professor_user_id = ?
              AND ccp.revoked_at IS NULL
          `,
          [userId],
        );
        const currentProfessorCourseCycleIds = Array.from(
          new Set(
            currentProfessorCourseCycleRows
              .map((row) => String(row.courseCycleId || '').trim())
              .filter((id) => id.length > 0),
          ),
        );

        if (finalProfessorCourseCycleIds.length > 0) {
          const existingCycles = await manager.getRepository(CourseCycle).find({
            where: { id: In(finalProfessorCourseCycleIds) },
            select: ['id'],
          });
          if (existingCycles.length !== finalProfessorCourseCycleIds.length) {
            throw new BadRequestException(
              'Uno o mas ciclos de curso para asignacion de profesor no son validos.',
            );
          }
        }

        const shouldKeepProfessorState = finalRoleCodes.includes(
          ROLE_CODES.PROFESSOR,
        );
        const desiredProfessorCourseCycleIds = shouldKeepProfessorState
          ? finalProfessorCourseCycleIds
          : [];
        const currentProfessorSet = new Set(currentProfessorCourseCycleIds);

        const removedProfessorCourseCycleIds = shouldKeepProfessorState
          ? []
          : currentProfessorCourseCycleIds;
        const addedProfessorCourseCycleIds =
          desiredProfessorCourseCycleIds.filter(
            (id) => !currentProfessorSet.has(id),
          );

        if (removedProfessorCourseCycleIds.length > 0) {
          await manager
            .createQueryBuilder()
            .update(CourseCycleProfessor)
            .set({ revokedAt: new Date() })
            .where('professor_user_id = :userId', { userId })
            .andWhere('revoked_at IS NULL')
            .andWhere('course_cycle_id IN (:...ids)', {
              ids: removedProfessorCourseCycleIds,
            })
            .execute();
        }

        const now = new Date();
        for (const courseCycleId of addedProfessorCourseCycleIds) {
          await manager.getRepository(CourseCycleProfessor).upsert(
            {
              courseCycleId,
              professorUserId: userId,
              assignedAt: now,
              revokedAt: null,
            },
            ['courseCycleId', 'professorUserId'],
          );
        }

        const eventProfessorChanges =
          await this.syncClassEventProfessorAssignmentsForAdminEdit({
            userId,
            removedCourseCycleIds: removedProfessorCourseCycleIds,
            addedCourseCycleIds: addedProfessorCourseCycleIds,
            manager,
          });

        await this.identitySecurityService.invalidateUserIdentity(userId, {
          revokeSessions: false,
          reason: IDENTITY_INVALIDATION_REASONS.PROFILE_UPDATE,
          manager,
        });

        const [afterEvaluationIds, afterCourseCycleIds] = await Promise.all([
          this.listMediaAccessEvaluationIdsForUser(userId, manager),
          this.listMediaAccessCourseCycleIdsForUser(userId, manager),
        ]);

        const evaluationGrantIds = afterEvaluationIds.filter(
          (id) => !beforeEvaluationIds.includes(id),
        );
        const evaluationRevokeIds = beforeEvaluationIds.filter(
          (id) => !afterEvaluationIds.includes(id),
        );
        const courseCycleGrantIds = afterCourseCycleIds.filter(
          (id) => !beforeCourseCycleIds.includes(id),
        );
        const courseCycleRevokeIds = beforeCourseCycleIds.filter(
          (id) => !afterCourseCycleIds.includes(id),
        );

        await this.logAuditActionWithManager(
          performedByUserId,
          AUDIT_ACTION_CODES.USER_ADMIN_EDIT,
          manager,
        );

        return {
          userId,
          previousRoleCodes,
          finalRoleCodes,
          cancelledEnrollmentIds: enrollmentChanges.cancelledEnrollmentIds,
          createdEnrollmentIds: enrollmentChanges.createdEnrollmentIds,
          baseCourseCycleIdsFinal: finalEnrollments.map(
            (enrollment) => enrollment.courseCycleId,
          ),
          removedProfessorCourseCycleIds,
          addedProfessorCourseCycleIds,
          eventProfessorChanges,
          evaluationGrantIds,
          evaluationRevokeIds,
          courseCycleGrantIds,
          courseCycleRevokeIds,
          shouldEnqueueStaffSyncOnEmailChange:
            previousEmail !== nextEmail &&
            finalRoleCodes.some((code) =>
              this.shouldTriggerStaffReconciliationForRoleCode(code),
            ),
        };
      },
    );

    if (transactionResult.evaluationGrantIds.length > 0) {
      await this.mediaAccessMembershipDispatchService.enqueueGrantForUserEvaluations(
        userId,
        transactionResult.evaluationGrantIds,
        MEDIA_ACCESS_SYNC_SOURCES.USER_STATUS_CHANGE,
      );
    }
    if (transactionResult.evaluationRevokeIds.length > 0) {
      await this.mediaAccessMembershipDispatchService.enqueueRevokeForUserEvaluations(
        userId,
        transactionResult.evaluationRevokeIds,
        MEDIA_ACCESS_SYNC_SOURCES.USER_STATUS_CHANGE,
      );
    }
    if (transactionResult.courseCycleGrantIds.length > 0) {
      await this.mediaAccessMembershipDispatchService.enqueueGrantForUserCourseCycles(
        userId,
        transactionResult.courseCycleGrantIds,
        MEDIA_ACCESS_SYNC_SOURCES.USER_STATUS_CHANGE,
      );
    }
    if (transactionResult.courseCycleRevokeIds.length > 0) {
      await this.mediaAccessMembershipDispatchService.enqueueRevokeForUserCourseCycles(
        userId,
        transactionResult.courseCycleRevokeIds,
        MEDIA_ACCESS_SYNC_SOURCES.USER_STATUS_CHANGE,
      );
    }

    await this.invalidateAdminUsersBaseCache();
    if (
      transactionResult.cancelledEnrollmentIds.length > 0 ||
      transactionResult.createdEnrollmentIds.length > 0
    ) {
      await this.invalidateAdminCourseCyclesListCache();
    }

    const changedRoleCodes = transactionResult.previousRoleCodes.filter(
      (code) => !transactionResult.finalRoleCodes.includes(code),
    );
    const addedRoleCodes = transactionResult.finalRoleCodes.filter(
      (code) => !transactionResult.previousRoleCodes.includes(code),
    );

    const addedAdminRole = addedRoleCodes.find((code) =>
      this.shouldTriggerStaffReconciliationForRoleCode(code),
    );
    if (addedAdminRole) {
      await this.enqueueImmediateStaffReconciliationIfNeeded({
        userId,
        roleCode: addedAdminRole,
        event: 'ASSIGN_ROLE',
        shouldEnqueue: true,
      });
    }

    const removedAdminRole = changedRoleCodes.find((code) =>
      this.shouldTriggerStaffReconciliationForRoleCode(code),
    );
    if (removedAdminRole) {
      await this.enqueueImmediateStaffReconciliationIfNeeded({
        userId,
        roleCode: removedAdminRole,
        event: 'REMOVE_ROLE',
        shouldEnqueue: true,
      });
    }

    if (
      transactionResult.shouldEnqueueStaffSyncOnEmailChange &&
      !addedAdminRole &&
      !removedAdminRole
    ) {
      await this.enqueueImmediateStaffReconciliationIfNeeded({
        userId,
        roleCode: 'EMAIL_CHANGE',
        event: 'ASSIGN_ROLE',
        shouldEnqueue: true,
      });
    }

    this.logger.log({
      message: 'Admin edit completado',
      userId,
      performedByUserId,
      rolesFinal: transactionResult.finalRoleCodes,
      enrollmentsChanged: {
        cancelled: transactionResult.cancelledEnrollmentIds.length,
        created: transactionResult.createdEnrollmentIds.length,
      },
      professorCourseCyclesChanged: {
        added: transactionResult.addedProfessorCourseCycleIds.length,
        removed: transactionResult.removedProfessorCourseCycleIds.length,
      },
      timestamp: new Date().toISOString(),
    });

    return {
      userId,
      rolesFinal: transactionResult.finalRoleCodes,
      enrollmentsChanged: {
        cancelledEnrollmentIds: transactionResult.cancelledEnrollmentIds,
        createdEnrollmentIds: transactionResult.createdEnrollmentIds,
        baseCourseCycleIdsFinal: transactionResult.baseCourseCycleIdsFinal,
      },
      professorCourseCyclesChanged: {
        added: transactionResult.addedProfessorCourseCycleIds,
        removed: transactionResult.removedProfessorCourseCycleIds,
      },
      eventProfessorAssignmentsChanged: {
        assignedCount: transactionResult.eventProfessorChanges.assignedCount,
        revokedCount: transactionResult.eventProfessorChanges.revokedCount,
      },
    };
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.findAll();
  }

  async findAdminUsersTable(
    query: AdminUsersListQueryDto,
  ): Promise<AdminUsersListResponseDto> {
    const safePage = Math.max(1, Number(query.page) || 1);
    const normalizedSearch = this.parseSearchFilter(query.search);
    const roleCodes = this.parseRoleCodesFilter(query.roles);
    const careerIds = this.parseCareerIdsFilter(query.careerIds);
    const isActive = this.parseStatusFilter(query.status);
    const shouldUseBaseCache =
      !query.sortBy &&
      this.shouldUseAdminUsersBaseCache({
        page: safePage,
        search: normalizedSearch,
        roleCodes,
        careerIds,
        isActive,
      });

    if (shouldUseBaseCache) {
      const cacheKey = USER_CACHE_KEYS.ADMIN_USERS_TABLE_BASE_PAGE(safePage);
      const cached =
        await this.cacheService.get<AdminUsersListResponseDto>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const { rows, totalItems } = await this.userRepository.findAdminUsersPage({
      page: safePage,
      pageSize: ADMIN_USERS_PAGE_SIZE,
      search: normalizedSearch,
      roleCodes,
      careerIds,
      isActive,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    const totalPages =
      totalItems === 0 ? 0 : Math.ceil(totalItems / ADMIN_USERS_PAGE_SIZE);

    const response: AdminUsersListResponseDto = {
      items: rows.map((row) => this.mapUserToAdminListItem(row)),
      currentPage: safePage,
      pageSize: ADMIN_USERS_PAGE_SIZE,
      totalItems,
      totalPages,
    };

    if (shouldUseBaseCache) {
      const cacheKey = USER_CACHE_KEYS.ADMIN_USERS_TABLE_BASE_PAGE(safePage);
      await this.cacheService.set(
        cacheKey,
        response,
        ADMIN_USERS_BASE_CACHE_TTL_SECONDS,
      );
    }
    return response;
  }

  listAdminRoleFilterOptions(): AdminUsersRoleFilterOptionDto[] {
    return ROLE_DISPLAY_ORDER.map((code) => ({
      code,
      label: ROLE_LABELS[code],
    }));
  }

  listAdminStatusFilterOptions(): AdminUsersStatusFilterOptionDto[] {
    return STATUS_FILTER_OPTIONS;
  }

  async listAdminCourseOptions(): Promise<AdminCourseOptionDto[]> {
    const cached = await this.cacheService.get<AdminCourseOptionDto[]>(
      USER_CACHE_KEYS.COURSES_CATALOG,
    );
    if (cached) {
      return cached;
    }

    const rows = await this.dataSource.query<
      Array<{
        courseId: string;
        currentCourseCycleId: string;
        courseCode: string;
        courseName: string;
      }>
    >(
      `
        SELECT
          c.id AS courseId,
          cc.id AS currentCourseCycleId,
          c.code AS courseCode,
          c.name AS courseName
        FROM course c
        INNER JOIN course_cycle cc ON cc.course_id = c.id
        INNER JOIN system_setting ss
          ON ss.setting_key = 'ACTIVE_CYCLE_ID'
          AND cc.academic_cycle_id = CAST(ss.setting_value AS UNSIGNED)
        ORDER BY c.name ASC, c.code ASC, c.id ASC
      `,
    );

    const response = rows.map((row) => ({
      courseId: row.courseId,
      currentCourseCycleId: row.currentCourseCycleId,
      courseCode: row.courseCode,
      courseName: row.courseName,
    }));

    await this.cacheService.set(
      USER_CACHE_KEYS.COURSES_CATALOG,
      response,
      COURSES_CATALOG_CACHE_TTL_SECONDS,
    );

    return response;
  }

  async getAdminDashboardStats(): Promise<AdminDashboardStatsDto> {
    const cached = await this.cacheService.get<AdminDashboardStatsDto>(
      USER_CACHE_KEYS.ADMIN_DASHBOARD_STATS,
    );
    if (cached) {
      return cached;
    }

    const rows = await this.dataSource.query<
      Array<{
        activeStudents: string | number;
        teachers: string | number;
        courses: string | number;
      }>
    >(
      `
        SELECT
          (
            SELECT COUNT(DISTINCT u.id)
            FROM user u
            INNER JOIN user_role ur ON ur.user_id = u.id
            INNER JOIN role r ON r.id = ur.role_id
            WHERE u.is_active = 1
              AND r.code = ?
          ) AS activeStudents,
          (
            SELECT COUNT(DISTINCT u.id)
            FROM user u
            INNER JOIN user_role ur ON ur.user_id = u.id
            INNER JOIN role r ON r.id = ur.role_id
            WHERE u.is_active = 1
              AND r.code = ?
          ) AS teachers,
          (
            SELECT COUNT(*)
            FROM course c
          ) AS courses
      `,
      [ROLE_CODES.STUDENT, ROLE_CODES.PROFESSOR],
    );

    const row = rows[0];
    const response: AdminDashboardStatsDto = {
      activeStudents: Number(row?.activeStudents || 0),
      teachers: Number(row?.teachers || 0),
      courses: Number(row?.courses || 0),
    };

    await this.cacheService.set(
      USER_CACHE_KEYS.ADMIN_DASHBOARD_STATS,
      response,
      ADMIN_DASHBOARD_STATS_CACHE_TTL_SECONDS,
    );

    return response;
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async findAdminUserDetail(id: string): Promise<AdminUserDetailResponseDto> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const activeCycleRows = await this.dataSource.query<
      Array<{ activeCycleId: string | null }>
    >(
      `
        SELECT CAST(ss.setting_value AS UNSIGNED) AS activeCycleId
        FROM system_setting ss
        WHERE ss.setting_key = 'ACTIVE_CYCLE_ID'
        LIMIT 1
      `,
    );
    const activeCycleId = String(
      activeCycleRows[0]?.activeCycleId || '',
    ).trim();

    const [enrolledCourses, teachingCourses] = await Promise.all([
      this.dataSource.query<
        Array<{
          relationId: string;
          courseId: string;
          courseCycleId: string;
          courseCode: string;
          courseName: string;
          academicCycleCode: string;
          enrollmentTypeCode: string;
        }>
      >(
        `
          SELECT
            e.id AS relationId,
            c.id AS courseId,
            cc.id AS courseCycleId,
            c.code AS courseCode,
            c.name AS courseName,
            ac.code AS academicCycleCode,
            UPPER(TRIM(et.code)) AS enrollmentTypeCode
          FROM enrollment e
          INNER JOIN course_cycle cc ON cc.id = e.course_cycle_id
          INNER JOIN course c ON c.id = cc.course_id
          INNER JOIN academic_cycle ac ON ac.id = cc.academic_cycle_id
          INNER JOIN enrollment_type et ON et.id = e.enrollment_type_id
          WHERE e.user_id = ?
            AND e.cancelled_at IS NULL
            AND (? = '' OR cc.academic_cycle_id = ?)
          ORDER BY ac.start_date DESC, c.name ASC, cc.id DESC
        `,
        [id, activeCycleId, activeCycleId],
      ),
      this.dataSource.query<
        Array<{
          relationId: string;
          courseId: string;
          courseCycleId: string;
          courseCode: string;
          courseName: string;
          academicCycleCode: string;
        }>
      >(
        `
          SELECT
            ccp.course_cycle_id AS relationId,
            c.id AS courseId,
            cc.id AS courseCycleId,
            c.code AS courseCode,
            c.name AS courseName,
            ac.code AS academicCycleCode
          FROM course_cycle_professor ccp
          INNER JOIN course_cycle cc ON cc.id = ccp.course_cycle_id
          INNER JOIN course c ON c.id = cc.course_id
          INNER JOIN academic_cycle ac ON ac.id = cc.academic_cycle_id
          WHERE ccp.professor_user_id = ?
            AND ccp.revoked_at IS NULL
            AND (? = '' OR cc.academic_cycle_id = ?)
          ORDER BY ac.start_date DESC, c.name ASC, cc.id DESC
        `,
        [id, activeCycleId, activeCycleId],
      ),
    ]);

    const enrolledRelationIds = enrolledCourses
      .map((row) => String(row.relationId || '').trim())
      .filter((value) => value.length > 0);

    const enrolledEvaluationRows =
      enrolledRelationIds.length > 0
        ? await this.dataSource.query<
            Array<{
              enrollmentId: string;
              evaluationId: string;
              evaluationCourseCycleId: string;
            }>
          >(
            `
              SELECT
                ee.enrollment_id AS enrollmentId,
                ee.evaluation_id AS evaluationId,
                ev.course_cycle_id AS evaluationCourseCycleId
              FROM enrollment_evaluation ee
              INNER JOIN evaluation ev ON ev.id = ee.evaluation_id
              WHERE ee.enrollment_id IN (${enrolledRelationIds
                .map(() => '?')
                .join(',')})
                AND ee.revoked_at IS NULL
            `,
            enrolledRelationIds,
          )
        : [];

    const evaluationIdsByEnrollmentId = new Map<string, Set<string>>();
    const historicalCyclesByEnrollmentId = new Map<string, Set<string>>();
    const baseCycleByEnrollmentId = new Map<string, string>();

    for (const row of enrolledCourses) {
      const enrollmentId = String(row.relationId || '').trim();
      const baseCourseCycleId = String(row.courseCycleId || '').trim();
      if (enrollmentId && baseCourseCycleId) {
        baseCycleByEnrollmentId.set(enrollmentId, baseCourseCycleId);
      }
    }

    for (const row of enrolledEvaluationRows) {
      const enrollmentId = String(row.enrollmentId || '').trim();
      const evaluationId = String(row.evaluationId || '').trim();
      const evaluationCourseCycleId = String(
        row.evaluationCourseCycleId || '',
      ).trim();
      if (!enrollmentId || !evaluationId) {
        continue;
      }

      if (!evaluationIdsByEnrollmentId.has(enrollmentId)) {
        evaluationIdsByEnrollmentId.set(enrollmentId, new Set());
      }
      evaluationIdsByEnrollmentId.get(enrollmentId).add(evaluationId);

      const baseCourseCycleId = baseCycleByEnrollmentId.get(enrollmentId);
      if (
        baseCourseCycleId &&
        evaluationCourseCycleId &&
        evaluationCourseCycleId !== baseCourseCycleId
      ) {
        if (!historicalCyclesByEnrollmentId.has(enrollmentId)) {
          historicalCyclesByEnrollmentId.set(enrollmentId, new Set());
        }
        historicalCyclesByEnrollmentId
          .get(enrollmentId)
          .add(evaluationCourseCycleId);
      }
    }

    const orderedRoles = ROLE_DISPLAY_ORDER.filter((code) =>
      user.roles.some((role) => role.code === code),
    );

    return {
      personalInfo: {
        id: user.id,
        firstName: user.firstName,
        lastName1: user.lastName1,
        lastName2: user.lastName2,
        email: user.email,
        phone: user.phone,
        careerId: user.careerId ?? null,
        careerName: user.career?.name ?? null,
        roles: orderedRoles.map((code) => ROLE_LABELS[code]),
        isActive: Boolean(user.isActive),
        profilePhotoUrl: user.profilePhotoUrl,
      },
      enrolledCourses: enrolledCourses.map((row) => {
        const enrollmentId = String(row.relationId || '').trim();
        return {
          relationId: row.relationId,
          courseId: row.courseId,
          courseCycleId: row.courseCycleId,
          courseCode: row.courseCode,
          courseName: row.courseName,
          academicCycleCode: row.academicCycleCode,
          enrollmentTypeCode: String(row.enrollmentTypeCode || '')
            .trim()
            .toUpperCase() as 'FULL' | 'PARTIAL',
          evaluationIds: Array.from(
            evaluationIdsByEnrollmentId.get(enrollmentId) || [],
          ).sort(),
          historicalCourseCycleIds: Array.from(
            historicalCyclesByEnrollmentId.get(enrollmentId) || [],
          ).sort(),
        };
      }),
      teachingCourses,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findByEmail(email);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const transactionResult = await this.dataSource.transaction(
      async (manager) => {
        const user = await this.userRepository.findById(id, manager);
        if (!user) {
          throw new NotFoundException('Usuario no encontrado');
        }
        const previousIsActive = Boolean(user.isActive);
        const previousEmail = String(user.email || '')
          .trim()
          .toLowerCase();
        const userHasAdminRole = (user.roles || []).some((role) =>
          this.shouldTriggerStaffReconciliationForRoleCode(role.code),
        );

        const shouldInvalidateIdentity = this.shouldInvalidateIdentityOnUpdate(
          user,
          updateUserDto,
        );
        const shouldRevokeSessions =
          updateUserDto.isActive === false && user.isActive !== false;

        if (updateUserDto.email && updateUserDto.email !== user.email) {
          const existingUser = await this.userRepository.findByEmail(
            updateUserDto.email,
            manager,
          );

          if (existingUser) {
            throw new ConflictException(
              'El correo electrónico ya está registrado',
            );
          }
        }

        if (
          updateUserDto.careerId !== undefined &&
          updateUserDto.careerId !== null
        ) {
          await this.ensureCareerExistsIfProvided(updateUserDto.careerId);
        }

        Object.assign(user, updateUserDto);
        user.updatedAt = new Date();

        let updatedUser: User;
        try {
          updatedUser = await this.userRepository.save(user, manager);
        } catch (error) {
          const errno = getErrnoFromDbError(error as DatabaseError);
          if (errno === MySqlErrorCode.DUPLICATE_ENTRY) {
            throw new ConflictException(
              'El correo electrónico ya está registrado',
            );
          }
          throw error;
        }

        if (shouldInvalidateIdentity) {
          await this.identitySecurityService.invalidateUserIdentity(id, {
            revokeSessions: shouldRevokeSessions,
            reason: shouldRevokeSessions
              ? IDENTITY_INVALIDATION_REASONS.USER_BANNED
              : IDENTITY_INVALIDATION_REASONS.SENSITIVE_UPDATE,
            manager,
          });
        }

        return {
          updatedUser,
          previousIsActive,
          nextIsActive: Boolean(updatedUser.isActive),
          shouldEnqueueStaffSyncOnEmailChange:
            userHasAdminRole &&
            previousEmail !==
              String(updatedUser.email || '')
                .trim()
                .toLowerCase(),
        };
      },
    );

    const statusChanged =
      transactionResult.previousIsActive !== transactionResult.nextIsActive;

    if (statusChanged) {
      await this.enqueueUserStatusMediaAccessSync({
        userId: id,
        isActive: transactionResult.nextIsActive,
      });
    }

    if (
      statusChanged ||
      transactionResult.shouldEnqueueStaffSyncOnEmailChange
    ) {
      await this.enqueueImmediateStaffReconciliationIfNeeded({
        userId: id,
        roleCode: statusChanged ? 'STATUS_CHANGE' : 'EMAIL_CHANGE',
        event: 'ASSIGN_ROLE',
        shouldEnqueue: true,
      });
    }

    await this.invalidateAdminUsersBaseCache();
    return transactionResult.updatedUser;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.userRepository.delete(id);
    await this.invalidateAdminUsersBaseCache();
  }

  async assignRole(userId: string, roleCode: string): Promise<User> {
    const transactionResult = await this.dataSource.transaction(
      async (manager) => {
        const user = await this.userRepository.findById(userId, manager);
        if (!user) {
          throw new NotFoundException('Usuario no encontrado');
        }

        const role = await this.roleRepository.findByCode(roleCode, manager);
        if (!role) {
          throw new NotFoundException(`Rol ${roleCode} no encontrado`);
        }

        const hasRole = user.roles.some((r) => r.code === roleCode);
        if (hasRole) {
          throw new ConflictException('El usuario ya tiene este rol asignado');
        }

        user.roles.push(role);
        user.updatedAt = new Date();

        let updatedUser: User;
        try {
          updatedUser = await this.userRepository.save(user, manager);
        } catch (error) {
          const errno = getErrnoFromDbError(error as DatabaseError);
          if (errno === MySqlErrorCode.DUPLICATE_ENTRY) {
            throw new ConflictException(
              'El usuario ya tiene este rol asignado',
            );
          }
          throw error;
        }

        this.logger.log({
          level: 'info',
          context: UsersService.name,
          message: 'Rol asignado al usuario',
          userId,
          roleCode,
        });

        await this.identitySecurityService.invalidateUserIdentity(userId, {
          revokeSessions: false,
          reason: IDENTITY_INVALIDATION_REASONS.ROLE_CHANGE,
          manager,
        });

        return {
          updatedUser,
          shouldEnqueueStaffReconciliation:
            this.shouldTriggerStaffReconciliationForRoleCode(roleCode),
        };
      },
    );

    await this.enqueueImmediateStaffReconciliationIfNeeded({
      userId,
      roleCode,
      event: 'ASSIGN_ROLE',
      shouldEnqueue: transactionResult.shouldEnqueueStaffReconciliation,
    });

    await this.invalidateAdminUsersBaseCache();
    return transactionResult.updatedUser;
  }

  async removeRole(userId: string, roleCode: string): Promise<User> {
    const transactionResult = await this.dataSource.transaction(
      async (manager) => {
        const user = await this.userRepository.findById(userId, manager);
        if (!user) {
          throw new NotFoundException('Usuario no encontrado');
        }

        const revokedProfessorAccess =
          roleCode === ROLE_CODES.PROFESSOR
            ? await this.listProfessorAccessTargets(userId, manager)
            : { courseCycleIds: [], evaluationIds: [] };

        const roleIndex = user.roles.findIndex((r) => r.code === roleCode);
        if (roleIndex === -1) {
          throw new NotFoundException('El usuario no tiene este rol asignado');
        }

        user.roles.splice(roleIndex, 1);
        user.updatedAt = new Date();

        let updatedUser: User;
        try {
          updatedUser = await this.userRepository.save(user, manager);
        } catch (error) {
          const errno = getErrnoFromDbError(error as DatabaseError);

          if (
            errno === MySqlErrorCode.LOCK_WAIT_TIMEOUT ||
            errno === MySqlErrorCode.DEADLOCK
          ) {
            throw new ServiceUnavailableException(
              'La operación no pudo completarse por alta concurrencia. Intente nuevamente.',
            );
          }

          if (errno === MySqlErrorCode.FOREIGN_KEY_CONSTRAINT_FAIL) {
            throw new ConflictException(
              'No se pudo remover el rol por restricciones de integridad.',
            );
          }

          throw new InternalServerErrorException(
            'No se pudo remover el rol. Intente nuevamente.',
          );
        }

        this.logger.log({
          level: 'info',
          context: UsersService.name,
          message: 'Rol removido del usuario',
          userId,
          roleCode,
        });

        if (roleCode === ROLE_CODES.PROFESSOR) {
          await this.revokeProfessorAssignments(userId, manager);
        }

        await this.identitySecurityService.invalidateUserIdentity(userId, {
          revokeSessions: false,
          reason: IDENTITY_INVALIDATION_REASONS.ROLE_CHANGE,
          manager,
          professorCacheContext: revokedProfessorAccess,
        });

        return {
          updatedUser,
          revokedProfessorAccess,
          shouldEnqueueStaffReconciliation:
            this.shouldTriggerStaffReconciliationForRoleCode(roleCode),
        };
      },
    );

    await this.enqueueImmediateStaffReconciliationIfNeeded({
      userId,
      roleCode,
      event: 'REMOVE_ROLE',
      shouldEnqueue: transactionResult.shouldEnqueueStaffReconciliation,
    });

    if (
      roleCode === ROLE_CODES.PROFESSOR &&
      (transactionResult.revokedProfessorAccess.courseCycleIds.length > 0 ||
        transactionResult.revokedProfessorAccess.evaluationIds.length > 0)
    ) {
      await Promise.all([
        this.mediaAccessMembershipDispatchService.enqueueRevokeForUserCourseCycles(
          userId,
          transactionResult.revokedProfessorAccess.courseCycleIds,
          MEDIA_ACCESS_SYNC_SOURCES.USERS_ROLE_CHANGE_IMMEDIATE,
        ),
        this.mediaAccessMembershipDispatchService.enqueueRevokeForUserEvaluations(
          userId,
          transactionResult.revokedProfessorAccess.evaluationIds,
          MEDIA_ACCESS_SYNC_SOURCES.USERS_ROLE_CHANGE_IMMEDIATE,
        ),
      ]);
    }

    await this.invalidateAdminUsersBaseCache();
    return transactionResult.updatedUser;
  }

  private async enqueueImmediateStaffReconciliationIfNeeded(input: {
    userId: string;
    roleCode: string;
    event: 'ASSIGN_ROLE' | 'REMOVE_ROLE';
    shouldEnqueue: boolean;
  }): Promise<void> {
    if (!input.shouldEnqueue) {
      return;
    }
    const normalizedRoleCode = String(input.roleCode || '')
      .trim()
      .toUpperCase();

    try {
      await this.mediaAccessQueue.add(
        MEDIA_ACCESS_JOB_NAMES.SYNC_STAFF_VIEWERS,
        {
          source: MEDIA_ACCESS_SYNC_SOURCES.USERS_ROLE_CHANGE_IMMEDIATE,
          event: input.event,
          userId: input.userId,
          roleCode: normalizedRoleCode,
          triggeredAt: new Date().toISOString(),
        },
        {
          removeOnComplete: true,
          removeOnFail: 50,
        },
      );
    } catch (error) {
      this.logger.error({
        context: UsersService.name,
        message: 'No se pudo encolar reconciliacion inmediata de media access',
        userId: input.userId,
        roleCode: normalizedRoleCode,
        event: input.event,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async enqueueUserStatusMediaAccessSync(input: {
    userId: string;
    isActive: boolean;
  }): Promise<void> {
    const userId = String(input.userId || '').trim();
    if (!userId) {
      return;
    }
    const action = input.isActive
      ? MEDIA_ACCESS_MEMBERSHIP_ACTIONS.GRANT
      : MEDIA_ACCESS_MEMBERSHIP_ACTIONS.REVOKE;
    const source = MEDIA_ACCESS_SYNC_SOURCES.USER_STATUS_CHANGE;
    const requestedAt = new Date().toISOString();

    const [evaluationIds, courseCycleIds] = await Promise.all([
      this.listMediaAccessEvaluationIdsForUser(userId),
      this.listMediaAccessCourseCycleIdsForUser(userId),
    ]);

    const jobs = [
      ...evaluationIds.map((evaluationId) => ({
        name: MEDIA_ACCESS_JOB_NAMES.SYNC_MEMBERSHIP,
        data: { action, userId, evaluationId, source, requestedAt },
        opts: {
          jobId: [
            'media-access',
            'membership',
            action,
            userId,
            evaluationId,
          ].join('__'),
          removeOnComplete: true,
        },
      })),
      ...courseCycleIds.map((courseCycleId) => ({
        name: MEDIA_ACCESS_JOB_NAMES.SYNC_COURSE_CYCLE_MEMBERSHIP,
        data: { action, userId, courseCycleId, source, requestedAt },
        opts: {
          jobId: [
            'media-access',
            'course-cycle-membership',
            action,
            userId,
            courseCycleId,
          ].join('__'),
          removeOnComplete: true,
        },
      })),
    ];

    if (!jobs.length) {
      return;
    }

    try {
      await this.mediaAccessQueue.addBulk(jobs);
    } catch (error) {
      this.logger.error({
        context: UsersService.name,
        message:
          'No se pudo encolar sync de media access por cambio de estado de usuario',
        userId,
        isActive: input.isActive,
        jobs: jobs.length,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async logAuditActionWithManager(
    actorUserId: string,
    actionCode: string,
    manager: EntityManager,
  ): Promise<void> {
    const normalizedUserId = String(actorUserId || '').trim();
    const normalizedActionCode = String(actionCode || '')
      .trim()
      .toUpperCase();
    if (!normalizedUserId || !normalizedActionCode) {
      return;
    }

    const actionRows = await manager.query<Array<{ id: string }>>(
      `SELECT id FROM audit_action WHERE UPPER(TRIM(code)) = ? LIMIT 1`,
      [normalizedActionCode],
    );
    if (!actionRows[0]?.id) {
      throw new InternalServerErrorException(
        'Error de configuracion del sistema.',
      );
    }

    await manager.query(
      `
        INSERT INTO audit_log (user_id, audit_action_id, event_datetime)
        VALUES (?, ?, NOW())
      `,
      [normalizedUserId, actionRows[0].id],
    );
  }

  private async listMediaAccessEvaluationIdsForUser(
    userId: string,
    manager?: EntityManager,
  ): Promise<string[]> {
    const executor = manager ?? this.dataSource;
    const rows = await executor.query<Array<{ id: string }>>(
      `
        SELECT DISTINCT source.id
        FROM (
          SELECT ee.evaluation_id AS id
          FROM enrollment_evaluation ee
          INNER JOIN enrollment e ON e.id = ee.enrollment_id
          WHERE e.user_id = ?
            AND ee.is_active = 1
            AND ee.access_start_date <= NOW()
            AND ee.access_end_date >= NOW()
            AND e.cancelled_at IS NULL

          UNION ALL

          SELECT ev.id AS id
          FROM evaluation ev
          INNER JOIN course_cycle_professor ccp
            ON ccp.course_cycle_id = ev.course_cycle_id
          WHERE ccp.professor_user_id = ?
            AND ccp.revoked_at IS NULL
        ) source
      `,
      [userId, userId],
    );
    return rows
      .map((row) => String(row.id || '').trim())
      .filter((id) => id.length > 0);
  }

  private async listMediaAccessCourseCycleIdsForUser(
    userId: string,
    manager?: EntityManager,
  ): Promise<string[]> {
    const executor = manager ?? this.dataSource;
    const rows = await executor.query<Array<{ id: string }>>(
      `
        SELECT DISTINCT source.id
        FROM (
          SELECT e.course_cycle_id AS id
          FROM enrollment e
          WHERE e.user_id = ?
            AND e.cancelled_at IS NULL

          UNION ALL

          SELECT ccp.course_cycle_id AS id
          FROM course_cycle_professor ccp
          WHERE ccp.professor_user_id = ?
            AND ccp.revoked_at IS NULL
        ) source
      `,
      [userId, userId],
    );
    return rows
      .map((row) => String(row.id || '').trim())
      .filter((id) => id.length > 0);
  }

  private shouldTriggerStaffReconciliationForRoleCode(
    roleCode: string,
  ): boolean {
    const normalizedRoleCode = String(roleCode || '')
      .trim()
      .toUpperCase();
    return ADMIN_ROLE_CODES.includes(normalizedRoleCode);
  }

  private shouldInvalidateIdentityOnUpdate(
    currentUser: User,
    updateUserDto: UpdateUserDto,
  ): boolean {
    const fieldsToCompare: (keyof UpdateUserDto)[] = [
      'email',
      'firstName',
      'lastName1',
      'lastName2',
      'phone',
      'careerId',
      'profilePhotoUrl',
      'isActive',
    ];

    return fieldsToCompare.some((field) => {
      const newValue = updateUserDto[field];
      if (newValue === undefined) return false;
      return newValue !== currentUser[field];
    });
  }

  private async listProfessorAccessTargets(
    userId: string,
    manager?: EntityManager,
  ): Promise<{ courseCycleIds: string[]; evaluationIds: string[] }> {
    const executor = manager ?? this.dataSource;
    const [courseCycleRows, evaluationRows] = await Promise.all([
      executor.query<Array<{ courseCycleId: string }>>(
        `
          SELECT DISTINCT ccp.course_cycle_id AS courseCycleId
          FROM course_cycle_professor ccp
          WHERE ccp.professor_user_id = ?
            AND ccp.revoked_at IS NULL
        `,
        [userId],
      ),
      executor.query<Array<{ evaluationId: string }>>(
        `
          SELECT DISTINCT ev.id AS evaluationId
          FROM evaluation ev
          INNER JOIN course_cycle_professor ccp
            ON ccp.course_cycle_id = ev.course_cycle_id
          WHERE ccp.professor_user_id = ?
            AND ccp.revoked_at IS NULL
        `,
        [userId],
      ),
    ]);

    return {
      courseCycleIds: courseCycleRows
        .map((row) => String(row.courseCycleId || '').trim())
        .filter((id) => id.length > 0),
      evaluationIds: evaluationRows
        .map((row) => String(row.evaluationId || '').trim())
        .filter((id) => id.length > 0),
    };
  }

  private async revokeProfessorAssignments(
    userId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const executor = manager ?? this.dataSource;
    await executor.query(
      `
        UPDATE course_cycle_professor
        SET revoked_at = NOW()
        WHERE professor_user_id = ?
          AND revoked_at IS NULL
      `,
      [userId],
    );
  }

  private normalizeAdminOnboardingRoleCodes(rawRoleCodes: string[]): string[] {
    const requested = Array.isArray(rawRoleCodes) ? rawRoleCodes : [];
    const normalized = requested
      .map((code) =>
        String(code || '')
          .trim()
          .toUpperCase(),
      )
      .filter((code) => code.length > 0);
    const deduped = Array.from(new Set(normalized));
    if (deduped.length === 0) {
      throw new BadRequestException('Debe enviar al menos un rol');
    }
    const valid = ROLE_DISPLAY_ORDER.filter((code) => deduped.includes(code));
    if (valid.length !== deduped.length) {
      throw new BadRequestException(
        `roleCodes debe contener solo: ${ROLE_DISPLAY_ORDER.join(', ')}`,
      );
    }
    return valid;
  }

  private normalizeAdminEditProfessorCycles(rawIds: string[]): string[] {
    return Array.from(
      new Set(
        (rawIds || [])
          .map((id) => String(id || '').trim())
          .filter((id) => id.length > 0),
      ),
    );
  }

  private normalizeAdminEditFinalEnrollments(
    rawEnrollments: AdminStudentEnrollmentInputDto[],
  ): AdminStudentEnrollmentInputDto[] {
    const normalized = (rawEnrollments || []).map((item) => ({
      courseCycleId: String(item?.courseCycleId || '').trim(),
      enrollmentTypeCode: String(item?.enrollmentTypeCode || '')
        .trim()
        .toUpperCase(),
      evaluationIds: Array.from(
        new Set(
          (item?.evaluationIds || [])
            .map((id) => String(id || '').trim())
            .filter((id) => id.length > 0),
        ),
      ),
      historicalCourseCycleIds: Array.from(
        new Set(
          (item?.historicalCourseCycleIds || [])
            .map((id) => String(id || '').trim())
            .filter((id) => id.length > 0),
        ),
      ),
    }));

    const courseCycleIds = normalized.map((item) => item.courseCycleId);
    const deduped = new Set(courseCycleIds);
    if (deduped.size !== courseCycleIds.length) {
      throw new BadRequestException(
        'No se permite repetir courseCycleId en studentStateFinal.enrollments.',
      );
    }

    return normalized;
  }

  private async applyPersonalInfoUpdatesForAdminEdit(input: {
    user: User;
    personalInfo?: AdminEditPersonalInfoDto;
    manager: EntityManager;
  }): Promise<void> {
    const dto = input.personalInfo;
    if (!dto) {
      return;
    }

    if (dto.careerId !== undefined) {
      await this.ensureCareerExistsIfProvided(dto.careerId ?? undefined);
      input.user.careerId = dto.careerId ?? null;
    }

    if (dto.email !== undefined) {
      const normalizedEmail = String(dto.email || '')
        .trim()
        .toLowerCase();
      if (normalizedEmail !== input.user.email) {
        const existing = await this.userRepository.findByEmail(
          normalizedEmail,
          input.manager,
        );
        if (existing && existing.id !== input.user.id) {
          throw new ConflictException(
            'El correo electrónico ya está registrado',
          );
        }
      }
      input.user.email = normalizedEmail;
    }
    if (dto.firstName !== undefined) input.user.firstName = dto.firstName;
    if (dto.lastName1 !== undefined) input.user.lastName1 = dto.lastName1;
    if (dto.lastName2 !== undefined) input.user.lastName2 = dto.lastName2;
    if (dto.phone !== undefined) input.user.phone = dto.phone;
    if (dto.profilePhotoUrl !== undefined) {
      input.user.profilePhotoUrl = dto.profilePhotoUrl;
    }
    if (dto.photoSource !== undefined) input.user.photoSource = dto.photoSource;
  }

  private async reconcileStudentEnrollmentsForAdminEdit(input: {
    userId: string;
    finalRoleCodes: string[];
    finalEnrollments: AdminStudentEnrollmentInputDto[];
    manager: EntityManager;
  }): Promise<{
    cancelledEnrollmentIds: string[];
    createdEnrollmentIds: string[];
  }> {
    const shouldKeepStudentState = input.finalRoleCodes.includes(
      ROLE_CODES.STUDENT,
    );
    const desiredEnrollments = shouldKeepStudentState
      ? input.finalEnrollments
      : [];

    const currentEnrollmentRows = await input.manager.query<
      Array<{ id: string; courseCycleId: string; enrollmentTypeCode: string }>
    >(
      `
        SELECT
          e.id AS id,
          e.course_cycle_id AS courseCycleId,
          UPPER(TRIM(et.code)) AS enrollmentTypeCode
        FROM enrollment e
        INNER JOIN enrollment_type et ON et.id = e.enrollment_type_id
        WHERE e.user_id = ?
          AND e.cancelled_at IS NULL
        FOR UPDATE
      `,
      [input.userId],
    );

    const currentEnrollmentIds = currentEnrollmentRows
      .map((row) => String(row.id || '').trim())
      .filter((id) => id.length > 0);
    const currentEvaluationRows =
      currentEnrollmentIds.length > 0
        ? await input.manager.query<
            Array<{
              enrollmentId: string;
              evaluationId: string;
              evaluationCourseCycleId: string;
            }>
          >(
            `
              SELECT
                ee.enrollment_id AS enrollmentId,
                ee.evaluation_id AS evaluationId,
                ev.course_cycle_id AS evaluationCourseCycleId
              FROM enrollment_evaluation ee
              INNER JOIN evaluation ev ON ev.id = ee.evaluation_id
              WHERE ee.enrollment_id IN (${currentEnrollmentIds
                .map(() => '?')
                .join(',')})
                AND ee.revoked_at IS NULL
            `,
            currentEnrollmentIds,
          )
        : [];

    const currentByCourseCycle = new Map<
      string,
      {
        enrollmentId: string;
        courseCycleId: string;
        enrollmentTypeCode: string;
        grantedEvaluationIds: string[];
        historicalCourseCycleIds: string[];
      }
    >();
    const evalSetByEnrollment = new Map<string, Set<string>>();
    const historicalSetByEnrollment = new Map<string, Set<string>>();
    const baseCycleByEnrollment = new Map<string, string>();

    for (const row of currentEnrollmentRows) {
      const enrollmentId = String(row.id || '').trim();
      const courseCycleId = String(row.courseCycleId || '').trim();
      if (!enrollmentId || !courseCycleId) {
        continue;
      }
      baseCycleByEnrollment.set(enrollmentId, courseCycleId);
      currentByCourseCycle.set(courseCycleId, {
        enrollmentId,
        courseCycleId,
        enrollmentTypeCode: String(row.enrollmentTypeCode || '')
          .trim()
          .toUpperCase(),
        grantedEvaluationIds: [],
        historicalCourseCycleIds: [],
      });
    }

    for (const row of currentEvaluationRows) {
      const enrollmentId = String(row.enrollmentId || '').trim();
      const evaluationId = String(row.evaluationId || '').trim();
      const evaluationCourseCycleId = String(
        row.evaluationCourseCycleId || '',
      ).trim();
      if (!enrollmentId || !evaluationId) {
        continue;
      }
      if (!evalSetByEnrollment.has(enrollmentId)) {
        evalSetByEnrollment.set(enrollmentId, new Set());
      }
      evalSetByEnrollment.get(enrollmentId).add(evaluationId);

      const baseCourseCycleId = baseCycleByEnrollment.get(enrollmentId);
      if (
        baseCourseCycleId &&
        evaluationCourseCycleId &&
        evaluationCourseCycleId !== baseCourseCycleId
      ) {
        if (!historicalSetByEnrollment.has(enrollmentId)) {
          historicalSetByEnrollment.set(enrollmentId, new Set());
        }
        historicalSetByEnrollment
          .get(enrollmentId)
          .add(evaluationCourseCycleId);
      }
    }

    for (const enrollment of currentByCourseCycle.values()) {
      enrollment.grantedEvaluationIds = Array.from(
        evalSetByEnrollment.get(enrollment.enrollmentId) || [],
      ).sort();
      enrollment.historicalCourseCycleIds = Array.from(
        historicalSetByEnrollment.get(enrollment.enrollmentId) || [],
      ).sort();
    }

    const cancelledEnrollmentIds: string[] = [];
    const createdEnrollmentIds: string[] = [];

    if (!shouldKeepStudentState) {
      for (const current of currentByCourseCycle.values()) {
        const cancelResult = await input.manager.query<{
          affectedRows?: number;
        }>(
          `
            UPDATE enrollment
            SET cancelled_at = NOW()
            WHERE id = ?
              AND cancelled_at IS NULL
          `,
          [current.enrollmentId],
        );
        const cancelledRows = Number(
          (cancelResult as unknown as { affectedRows?: number })
            ?.affectedRows || 0,
        );
        cancelledEnrollmentIds.push(current.enrollmentId);

        if (cancelledRows !== 1) {
          this.logger.warn({
            message:
              'Admin edit - cancelacion de matricula fuera de lo esperado al retirar rol STUDENT',
            userId: input.userId,
            enrollmentId: current.enrollmentId,
            courseCycleId: current.courseCycleId,
            affectedRows: cancelledRows,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    for (const payload of desiredEnrollments) {
      const current = currentByCourseCycle.get(payload.courseCycleId);
      const desiredPlan = await this.resolveEnrollmentGrantPlanForOnboarding({
        payload,
        manager: input.manager,
      });

      if (!current) {
        const created = await this.createEnrollmentForOnboarding({
          userId: input.userId,
          payload,
          precomputedPlan: desiredPlan,
          manager: input.manager,
        });
        createdEnrollmentIds.push(created.enrollmentId);
        continue;
      }
      const shouldReplace = this.shouldReplaceEnrollmentForAdminEdit({
        current,
        desiredPlan: {
          enrollmentTypeCode: desiredPlan.enrollmentTypeCode,
          grantedEvaluationIds: desiredPlan.grantedEvaluationIds,
          historicalCourseCycleIds: desiredPlan.historicalCourseCycleIds,
        },
      });
      if (!shouldReplace) {
        continue;
      }

      await this.updateEnrollmentForAdminEdit({
        userId: input.userId,
        enrollmentId: current.enrollmentId,
        payloadCourseCycleId: payload.courseCycleId,
        desiredPlan,
        manager: input.manager,
      });
    }

    return { cancelledEnrollmentIds, createdEnrollmentIds };
  }

  private shouldReplaceEnrollmentForAdminEdit(input: {
    current: {
      enrollmentTypeCode: string;
      grantedEvaluationIds: string[];
      historicalCourseCycleIds: string[];
    };
    desiredPlan: {
      enrollmentTypeCode: string;
      grantedEvaluationIds: string[];
      historicalCourseCycleIds: string[];
    };
  }): boolean {
    if (
      input.current.enrollmentTypeCode !== input.desiredPlan.enrollmentTypeCode
    ) {
      return true;
    }

    if (
      !this.areSameStringSet(
        input.current.historicalCourseCycleIds,
        input.desiredPlan.historicalCourseCycleIds,
      )
    ) {
      return true;
    }

    if (input.desiredPlan.enrollmentTypeCode === ENROLLMENT_TYPE_CODES.FULL) {
      return false;
    }

    return !this.areSameStringSet(
      input.current.grantedEvaluationIds,
      input.desiredPlan.grantedEvaluationIds,
    );
  }

  private areSameStringSet(left: string[], right: string[]): boolean {
    if (left.length !== right.length) {
      return false;
    }
    const leftSet = new Set(left);
    for (const value of right) {
      if (!leftSet.has(value)) {
        return false;
      }
    }
    return true;
  }

  private async syncClassEventProfessorAssignmentsForAdminEdit(input: {
    userId: string;
    removedCourseCycleIds: string[];
    addedCourseCycleIds: string[];
    manager: EntityManager;
  }): Promise<{ assignedCount: number; revokedCount: number }> {
    let revokedCount = 0;
    let assignedCount = 0;
    const now = new Date();

    if (input.removedCourseCycleIds.length > 0) {
      const revokeResult = await input.manager.query<{ affectedRows?: number }>(
        `
          UPDATE class_event_professor cep
          INNER JOIN class_event ce ON ce.id = cep.class_event_id
          INNER JOIN evaluation ev ON ev.id = ce.evaluation_id
          SET cep.revoked_at = NOW()
          WHERE cep.professor_user_id = ?
            AND cep.revoked_at IS NULL
            AND ev.course_cycle_id IN (${input.removedCourseCycleIds
              .map(() => '?')
              .join(',')})
        `,
        [input.userId, ...input.removedCourseCycleIds],
      );
      const affected = Number(
        (revokeResult as unknown as { affectedRows?: number })?.affectedRows ||
          0,
      );
      revokedCount += Number.isNaN(affected) ? 0 : affected;
    }

    if (input.addedCourseCycleIds.length > 0) {
      const reactivateResult = await input.manager.query<{
        affectedRows?: number;
      }>(
        `
          UPDATE class_event_professor cep
          INNER JOIN class_event ce ON ce.id = cep.class_event_id
          INNER JOIN evaluation ev ON ev.id = ce.evaluation_id
          SET cep.revoked_at = NULL, cep.assigned_at = ?
          WHERE cep.professor_user_id = ?
            AND cep.revoked_at IS NOT NULL
            AND ev.course_cycle_id IN (${input.addedCourseCycleIds
              .map(() => '?')
              .join(',')})
        `,
        [now, input.userId, ...input.addedCourseCycleIds],
      );
      const reactivated = Number(
        (reactivateResult as unknown as { affectedRows?: number })
          ?.affectedRows || 0,
      );
      assignedCount += Number.isNaN(reactivated) ? 0 : reactivated;

      const insertResult = await input.manager.query<{ affectedRows?: number }>(
        `
          INSERT INTO class_event_professor (
            class_event_id,
            professor_user_id,
            assigned_at,
            revoked_at
          )
          SELECT
            ce.id,
            ?,
            ?,
            NULL
          FROM class_event ce
          INNER JOIN evaluation ev ON ev.id = ce.evaluation_id
          LEFT JOIN class_event_professor cep
            ON cep.class_event_id = ce.id
           AND cep.professor_user_id = ?
          WHERE ev.course_cycle_id IN (${input.addedCourseCycleIds
            .map(() => '?')
            .join(',')})
            AND cep.class_event_id IS NULL
        `,
        [input.userId, now, input.userId, ...input.addedCourseCycleIds],
      );
      const inserted = Number(
        (insertResult as unknown as { affectedRows?: number })?.affectedRows ||
          0,
      );
      assignedCount += Number.isNaN(inserted) ? 0 : inserted;
    }

    return { assignedCount, revokedCount };
  }

  private isActiveEnrollmentDuplicateError(error: unknown): boolean {
    const errno = getErrnoFromDbError(error as DatabaseError);
    if (errno !== MySqlErrorCode.DUPLICATE_ENTRY) {
      return false;
    }

    const message = getMessageFromDbError(error).toLowerCase();

    return message.includes('uq_enrollment_active_user_course_cycle');
  }

  private async resolveEnrollmentGrantPlanForOnboarding(input: {
    payload: AdminStudentEnrollmentInputDto;
    manager: EntityManager;
  }): Promise<{
    enrollmentTypeCode: string;
    enrollmentTypeId: string;
    enrollmentStatusId: string;
    baseCourseCycle: CourseCycle;
    allowedCourseCycleIds: string[];
    historicalCourseCycleIds: string[];
    grantedEvaluationIds: string[];
  }> {
    const enrollmentTypeCode = String(input.payload.enrollmentTypeCode || '')
      .trim()
      .toUpperCase();
    if (
      enrollmentTypeCode !== ENROLLMENT_TYPE_CODES.FULL &&
      enrollmentTypeCode !== ENROLLMENT_TYPE_CODES.PARTIAL
    ) {
      throw new BadRequestException('Tipo de matricula no valido.');
    }
    if (
      enrollmentTypeCode === ENROLLMENT_TYPE_CODES.PARTIAL &&
      (!input.payload.evaluationIds || input.payload.evaluationIds.length === 0)
    ) {
      throw new BadRequestException(
        'Las matriculas parciales deben especificar al menos una evaluacion.',
      );
    }

    const [enrollmentTypeRows, enrollmentStatusRows, baseCourseCycle] =
      await Promise.all([
        input.manager.query<Array<{ id: string }>>(
          `SELECT id FROM enrollment_type WHERE UPPER(TRIM(code)) = ? LIMIT 1`,
          [enrollmentTypeCode],
        ),
        input.manager.query<Array<{ id: string }>>(
          `SELECT id FROM enrollment_status WHERE UPPER(TRIM(code)) = ? LIMIT 1`,
          [ENROLLMENT_STATUS_CODES.ACTIVE],
        ),
        input.manager.getRepository(CourseCycle).findOne({
          where: { id: input.payload.courseCycleId },
          relations: { academicCycle: true },
        }),
      ]);

    if (!enrollmentTypeRows[0]) {
      throw new BadRequestException('Tipo de matricula no valido.');
    }
    if (!enrollmentStatusRows[0]) {
      throw new InternalServerErrorException(
        'Error de configuracion del sistema.',
      );
    }
    if (!baseCourseCycle?.academicCycle) {
      throw new BadRequestException('Ciclo de curso no valido para matricula.');
    }

    const now = new Date();
    const cycleEndDate = toBusinessDayEndUtc(
      baseCourseCycle.academicCycle.endDate,
    );
    if (cycleEndDate.getTime() < now.getTime()) {
      throw new BadRequestException(
        `No se puede matricular en el ciclo ${baseCourseCycle.academicCycle.code} porque ya ha finalizado.`,
      );
    }

    const historicalCourseCycleIds = Array.from(
      new Set(
        (input.payload.historicalCourseCycleIds || [])
          .map((id) => String(id || '').trim())
          .filter((id) => id.length > 0),
      ),
    ).sort();

    const allowedCourseCycleIds = [input.payload.courseCycleId];
    if (historicalCourseCycleIds.length > 0) {
      const pastCycles = await input.manager.getRepository(CourseCycle).find({
        where: {
          id: In(historicalCourseCycleIds),
          courseId: baseCourseCycle.courseId,
          academicCycle: {
            startDate: LessThan(baseCourseCycle.academicCycle.startDate),
          },
        },
      });
      if (pastCycles.length !== historicalCourseCycleIds.length) {
        throw new BadRequestException(
          'Uno o mas ciclos historicos no son validos o no pertenecen al curso.',
        );
      }
      allowedCourseCycleIds.push(...pastCycles.map((cycle) => cycle.id));
    }

    const allEvaluations = await input.manager.getRepository(Evaluation).find({
      where: { courseCycleId: In(allowedCourseCycleIds) },
      relations: { evaluationType: true },
    });

    let grantedEvaluationIds: string[] = [];
    if (enrollmentTypeCode === ENROLLMENT_TYPE_CODES.FULL) {
      grantedEvaluationIds = Array.from(
        new Set(
          allEvaluations
            .map((evaluation) => String(evaluation.id || '').trim())
            .filter((id) => id.length > 0),
        ),
      );
    } else {
      const requestedIds = Array.from(
        new Set(
          (input.payload.evaluationIds || [])
            .map((id) => String(id || '').trim())
            .filter((id) => id.length > 0),
        ),
      );
      if (requestedIds.length === 0) {
        throw new BadRequestException(
          'Las matriculas parciales deben especificar al menos una evaluacion.',
        );
      }
      const requestedSet = new Set(requestedIds);
      const selectedEvaluationIds = allEvaluations
        .filter((evaluation) => requestedSet.has(evaluation.id))
        .map((evaluation) => String(evaluation.id || '').trim())
        .filter((id) => id.length > 0);
      if (selectedEvaluationIds.length !== requestedIds.length) {
        throw new BadRequestException(
          'Las evaluaciones solicitadas no son validas para el curso/ciclo seleccionado.',
        );
      }
      grantedEvaluationIds = selectedEvaluationIds;
      const bankEvaluation = allEvaluations.find(
        (evaluation) =>
          evaluation.courseCycleId === input.payload.courseCycleId &&
          String(evaluation.evaluationType?.code || '')
            .trim()
            .toUpperCase() === EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS,
      );
      if (bankEvaluation) {
        grantedEvaluationIds = Array.from(
          new Set([
            ...grantedEvaluationIds,
            String(bankEvaluation.id || '').trim(),
          ]),
        );
      }
    }

    return {
      enrollmentTypeCode,
      enrollmentTypeId: enrollmentTypeRows[0].id,
      enrollmentStatusId: enrollmentStatusRows[0].id,
      baseCourseCycle,
      allowedCourseCycleIds: Array.from(new Set(allowedCourseCycleIds)),
      historicalCourseCycleIds,
      grantedEvaluationIds: Array.from(new Set(grantedEvaluationIds)).sort(),
    };
  }

  private async createEnrollmentForOnboarding(input: {
    userId: string;
    payload: AdminStudentEnrollmentInputDto;
    precomputedPlan?: {
      enrollmentTypeCode: string;
      enrollmentTypeId: string;
      enrollmentStatusId: string;
      baseCourseCycle: CourseCycle;
      allowedCourseCycleIds: string[];
      historicalCourseCycleIds: string[];
      grantedEvaluationIds: string[];
    };
    manager: EntityManager;
  }): Promise<{
    enrollmentId: string;
    grantedEvaluationIds: string[];
    grantedCourseCycleIds: string[];
  }> {
    const { userId, payload, manager } = input;
    const activeEnrollmentRows = await manager.query<Array<{ id: string }>>(
      `
        SELECT e.id AS id
        FROM enrollment e
        WHERE e.user_id = ?
          AND e.course_cycle_id = ?
          AND e.cancelled_at IS NULL
        LIMIT 1
      `,
      [userId, payload.courseCycleId],
    );
    const activeEnrollmentId = String(activeEnrollmentRows[0]?.id || '').trim();
    if (activeEnrollmentId) {
      this.logger.warn({
        message:
          'Onboarding/AdminEdit - conflicto por matricula activa existente antes de crear',
        userId,
        courseCycleId: payload.courseCycleId,
        existingEnrollmentId: activeEnrollmentId,
        timestamp: new Date().toISOString(),
      });
      throw new ConflictException(
        'El usuario ya cuenta con una matricula activa en este curso.',
      );
    }

    const plan =
      input.precomputedPlan ||
      (await this.resolveEnrollmentGrantPlanForOnboarding({
        payload,
        manager,
      }));
    const now = new Date();

    let enrollment: Enrollment;
    try {
      enrollment = await manager.getRepository(Enrollment).save(
        manager.getRepository(Enrollment).create({
          userId,
          courseCycleId: payload.courseCycleId,
          enrollmentStatusId: plan.enrollmentStatusId,
          enrollmentTypeId: plan.enrollmentTypeId,
          enrolledAt: now,
          cancelledAt: null,
        }),
      );
    } catch (error) {
      if (this.isActiveEnrollmentDuplicateError(error)) {
        this.logger.warn({
          message:
            'Onboarding/AdminEdit - conflicto por indice unico de matricula activa al guardar',
          userId,
          courseCycleId: payload.courseCycleId,
          timestamp: new Date().toISOString(),
        });
        throw new ConflictException(
          'El usuario ya cuenta con una matricula activa en este curso.',
        );
      }
      throw error;
    }

    const grantedEvaluationIds = plan.grantedEvaluationIds;
    if (grantedEvaluationIds.length > 0) {
      const accessStartDate = toBusinessDayStartUtc(
        plan.baseCourseCycle.academicCycle.startDate,
      );
      const accessEndDate = toBusinessDayEndUtc(
        plan.baseCourseCycle.academicCycle.endDate,
      );
      const records = grantedEvaluationIds.map((evaluationId) =>
        manager.getRepository(EnrollmentEvaluation).create({
          enrollmentId: enrollment.id,
          evaluationId,
          accessStartDate: new Date(accessStartDate),
          accessEndDate: new Date(accessEndDate),
          isActive: true,
          revokedAt: null,
          revokedBy: null,
        }),
      );
      await manager.getRepository(EnrollmentEvaluation).save(records);
    }

    return {
      enrollmentId: enrollment.id,
      grantedEvaluationIds,
      grantedCourseCycleIds: plan.allowedCourseCycleIds,
    };
  }

  private async updateEnrollmentForAdminEdit(input: {
    userId: string;
    enrollmentId: string;
    payloadCourseCycleId: string;
    desiredPlan: {
      enrollmentTypeCode: string;
      enrollmentTypeId: string;
      enrollmentStatusId: string;
      baseCourseCycle: CourseCycle;
      allowedCourseCycleIds: string[];
      historicalCourseCycleIds: string[];
      grantedEvaluationIds: string[];
    };
    manager: EntityManager;
  }): Promise<void> {
    await input.manager.query<{ affectedRows?: number }>(
      `
        UPDATE enrollment
        SET enrollment_type_id = ?,
            enrollment_status_id = ?
        WHERE id = ?
          AND cancelled_at IS NULL
      `,
      [
        input.desiredPlan.enrollmentTypeId,
        input.desiredPlan.enrollmentStatusId,
        input.enrollmentId,
      ],
    );

    await this.syncEnrollmentEvaluationsForAdminEdit({
      userId: input.userId,
      enrollmentId: input.enrollmentId,
      payloadCourseCycleId: input.payloadCourseCycleId,
      desiredPlan: input.desiredPlan,
      manager: input.manager,
    });
  }

  private async syncEnrollmentEvaluationsForAdminEdit(input: {
    userId: string;
    enrollmentId: string;
    payloadCourseCycleId: string;
    desiredPlan: {
      baseCourseCycle: CourseCycle;
      grantedEvaluationIds: string[];
    };
    manager: EntityManager;
  }): Promise<void> {
    const rows = await input.manager.query<
      Array<{ evaluationId: string; revokedAt: Date | null }>
    >(
      `
        SELECT
          ee.evaluation_id AS evaluationId,
          ee.revoked_at AS revokedAt
        FROM enrollment_evaluation ee
        WHERE ee.enrollment_id = ?
      `,
      [input.enrollmentId],
    );

    const desiredSet = new Set(
      input.desiredPlan.grantedEvaluationIds.map((id) =>
        String(id || '').trim(),
      ),
    );
    const allSet = new Set(
      rows
        .map((row) => String(row.evaluationId || '').trim())
        .filter((id) => id.length > 0),
    );
    const activeSet = new Set(
      rows
        .filter((row) => row.revokedAt == null)
        .map((row) => String(row.evaluationId || '').trim())
        .filter((id) => id.length > 0),
    );

    const toRevoke = Array.from(activeSet).filter((id) => !desiredSet.has(id));
    const toReactivate = Array.from(desiredSet).filter(
      (id) => allSet.has(id) && !activeSet.has(id),
    );
    const toInsert = Array.from(desiredSet).filter((id) => !allSet.has(id));

    if (toRevoke.length > 0) {
      await input.manager.query(
        `
          UPDATE enrollment_evaluation
          SET revoked_at = NOW(),
              is_active = 0
          WHERE enrollment_id = ?
            AND revoked_at IS NULL
            AND evaluation_id IN (${toRevoke.map(() => '?').join(',')})
        `,
        [input.enrollmentId, ...toRevoke],
      );
    }

    const accessStartDate = toBusinessDayStartUtc(
      input.desiredPlan.baseCourseCycle.academicCycle.startDate,
    );
    const accessEndDate = toBusinessDayEndUtc(
      input.desiredPlan.baseCourseCycle.academicCycle.endDate,
    );

    if (toReactivate.length > 0) {
      await input.manager.query(
        `
          UPDATE enrollment_evaluation
          SET revoked_at = NULL,
              revoked_by = NULL,
              is_active = 1,
              access_start_date = ?,
              access_end_date = ?
          WHERE enrollment_id = ?
            AND revoked_at IS NOT NULL
            AND evaluation_id IN (${toReactivate.map(() => '?').join(',')})
        `,
        [accessStartDate, accessEndDate, input.enrollmentId, ...toReactivate],
      );
    }

    if (toInsert.length > 0) {
      const records = toInsert.map((evaluationId) =>
        input.manager.getRepository(EnrollmentEvaluation).create({
          enrollmentId: input.enrollmentId,
          evaluationId,
          accessStartDate: new Date(accessStartDate),
          accessEndDate: new Date(accessEndDate),
          isActive: true,
          revokedAt: null,
          revokedBy: null,
        }),
      );
      await input.manager.getRepository(EnrollmentEvaluation).save(records);
    }
  }

  private async assignProfessorCourseCyclesForOnboarding(input: {
    userId: string;
    courseCycleIds: string[];
    manager: EntityManager;
  }): Promise<{ courseCycleIds: string[]; evaluationIds: string[] }> {
    const normalizedIds = Array.from(
      new Set(
        (input.courseCycleIds || [])
          .map((id) => String(id || '').trim())
          .filter((id) => id.length > 0),
      ),
    );
    if (normalizedIds.length === 0) {
      return { courseCycleIds: [], evaluationIds: [] };
    }

    const existingCycles = await input.manager.getRepository(CourseCycle).find({
      where: { id: In(normalizedIds) },
    });
    if (existingCycles.length !== normalizedIds.length) {
      throw new BadRequestException(
        'Uno o mas ciclos de curso para asignacion de profesor no son validos.',
      );
    }

    const now = new Date();
    const professorAssignments = normalizedIds.map((courseCycleId) => ({
      courseCycleId,
      professorUserId: input.userId,
      assignedAt: now,
      revokedAt: null as Date | null,
    }));
    await input.manager
      .getRepository(CourseCycleProfessor)
      .insert(professorAssignments);

    const evaluationRows = await input.manager.getRepository(Evaluation).find({
      where: { courseCycleId: In(normalizedIds) },
      select: ['id'],
    });
    return {
      courseCycleIds: normalizedIds,
      evaluationIds: Array.from(
        new Set(
          evaluationRows.map((evaluation) =>
            String(evaluation.id || '').trim(),
          ),
        ),
      ).filter((id) => id.length > 0),
    };
  }

  private mapUserToAdminListItem(input: {
    id: string;
    firstName: string;
    lastName1: string | null;
    lastName2: string | null;
    email: string;
    roleCodes: string[];
    careerId: number | null;
    careerName: string | null;
    isActive: boolean;
  }): AdminUsersListItemDto {
    const firstName = String(input.firstName || '').trim();
    const lastName1 = String(input.lastName1 || '').trim();
    const lastName2 = String(input.lastName2 || '').trim();
    const fullName = [firstName, lastName1, lastName2]
      .filter((part) => part.length > 0)
      .join(' ');

    const orderedRoles = ROLE_DISPLAY_ORDER.filter((code) =>
      input.roleCodes.includes(code),
    );
    const roles = orderedRoles.map((code) => ROLE_LABELS[code]);

    return {
      id: input.id,
      fullName,
      email: input.email,
      roles,
      careerId: input.careerId ?? null,
      careerName: input.careerName ?? null,
      isActive: Boolean(input.isActive),
    };
  }

  private parseRoleCodesFilter(rawRoles?: string): string[] {
    if (!rawRoles) return [];
    const requested = rawRoles
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter((item) => item.length > 0);
    const uniqueRequested = Array.from(new Set(requested));
    const valid = ROLE_DISPLAY_ORDER.filter((code) =>
      uniqueRequested.includes(code),
    );
    if (valid.length !== uniqueRequested.length) {
      throw new BadRequestException(
        `roles debe contener solo: ${ROLE_DISPLAY_ORDER.join(', ')}`,
      );
    }
    return valid;
  }

  private parseCareerIdsFilter(rawCareerIds?: string): number[] {
    if (!rawCareerIds) return [];
    const parsed = rawCareerIds
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);

    const requestedCount = rawCareerIds
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0).length;
    if (parsed.length !== requestedCount) {
      throw new BadRequestException(
        'careerIds debe ser una lista CSV de enteros positivos',
      );
    }
    return Array.from(new Set(parsed));
  }

  private parseStatusFilter(
    rawStatus?: AdminUserStatusFilter,
  ): boolean | undefined {
    if (!rawStatus) return undefined;
    if (rawStatus === 'ACTIVE') return true;
    if (rawStatus === 'INACTIVE') return false;
    return undefined;
  }

  private async ensureCareerExistsIfProvided(
    careerId?: number | null,
  ): Promise<void> {
    if (careerId == null) {
      return;
    }
    const career = await this.careerRepository.findById(careerId);
    if (!career) {
      throw new NotFoundException(`Carrera ${careerId} no encontrada`);
    }
  }

  private shouldUseAdminUsersBaseCache(input: {
    page: number;
    search?: string;
    roleCodes: string[];
    careerIds: number[];
    isActive?: boolean;
  }): boolean {
    return (
      input.page === 1 &&
      !input.search &&
      input.roleCodes.length === 0 &&
      input.careerIds.length === 0 &&
      input.isActive === undefined
    );
  }

  private parseSearchFilter(rawSearch?: string): string | undefined {
    if (rawSearch == null) return undefined;
    const normalized = String(rawSearch).trim();
    if (!normalized) return undefined;
    return normalized;
  }

  private async invalidateAdminUsersBaseCache(): Promise<void> {
    try {
      await this.cacheService.invalidateGroup(
        USER_CACHE_KEYS.ADMIN_USERS_TABLE_BASE_GROUP,
      );
    } catch (error) {
      this.logger.warn({
        context: UsersService.name,
        message: 'No se pudo invalidar cache base de tabla admin de usuarios',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async invalidateAdminCourseCyclesListCache(): Promise<void> {
    try {
      await this.cacheService.invalidateGroup(
        COURSE_CACHE_KEYS.GLOBAL_ADMIN_COURSE_CYCLES_LIST_GROUP,
      );
    } catch (error) {
      this.logger.warn({
        context: UsersService.name,
        message:
          'No se pudo invalidar cache de tabla admin de cursos (course-cycles list)',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    await this.invalidateAdminDashboardStatsCache();
  }

  private async invalidateAdminDashboardStatsCache(): Promise<void> {
    try {
      await this.cacheService.del(USER_CACHE_KEYS.ADMIN_DASHBOARD_STATS);
    } catch (error) {
      this.logger.warn({
        context: UsersService.name,
        message:
          'No se pudo invalidar cache de dashboard admin (estadisticas base)',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

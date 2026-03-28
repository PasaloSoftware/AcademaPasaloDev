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
import { DataSource, EntityManager } from 'typeorm';
import { User } from '@modules/users/domain/user.entity';
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
import { getErrnoFromDbError } from '@common/utils/mysql-error.util';
import { ADMIN_ROLE_CODES } from '@common/constants/role-codes.constants';
import { ROLE_CODES } from '@common/constants/role-codes.constants';
import { MediaAccessMembershipDispatchService } from '@modules/media-access/application/media-access-membership-dispatch.service';
import { USER_CACHE_KEYS } from '@modules/users/domain/user.constants';

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
    const shouldUseBaseCache = this.shouldUseAdminUsersBaseCache({
      page: safePage,
      search: normalizedSearch,
      roleCodes,
      careerIds,
      isActive,
    });

    if (shouldUseBaseCache) {
      const cacheKey = USER_CACHE_KEYS.ADMIN_USERS_TABLE_BASE_PAGE(safePage);
      const cached = await this.cacheService.get<AdminUsersListResponseDto>(
        cacheKey,
      );
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
        courseCode: string;
        courseName: string;
      }>
    >(
      `
        SELECT
          c.id AS courseId,
          c.code AS courseCode,
          c.name AS courseName
        FROM course c
        ORDER BY c.name ASC, c.code ASC, c.id ASC
      `,
    );

    const response = rows.map((row) => ({
      courseId: row.courseId,
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

    const [enrolledCourses, teachingCourses] = await Promise.all([
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
            e.id AS relationId,
            c.id AS courseId,
            cc.id AS courseCycleId,
            c.code AS courseCode,
            c.name AS courseName,
            ac.code AS academicCycleCode
          FROM enrollment e
          INNER JOIN course_cycle cc ON cc.id = e.course_cycle_id
          INNER JOIN course c ON c.id = cc.course_id
          INNER JOIN academic_cycle ac ON ac.id = cc.academic_cycle_id
          WHERE e.user_id = ?
            AND e.cancelled_at IS NULL
          ORDER BY ac.start_date DESC, c.name ASC, cc.id DESC
        `,
        [id],
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
          ORDER BY ac.start_date DESC, c.name ASC, cc.id DESC
        `,
        [id],
      ),
    ]);

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
      enrolledCourses,
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

        if (updateUserDto.careerId !== undefined && updateUserDto.careerId !== null) {
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
        };
      },
    );

    if (transactionResult.previousIsActive !== transactionResult.nextIsActive) {
      await this.enqueueUserStatusMediaAccessSync({
        userId: id,
        isActive: transactionResult.nextIsActive,
      });
      await this.enqueueImmediateStaffReconciliationIfNeeded({
        userId: id,
        roleCode: 'STATUS_CHANGE',
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

  private async listMediaAccessEvaluationIdsForUser(
    userId: string,
  ): Promise<string[]> {
    const rows = await this.dataSource.query<Array<{ id: string }>>(
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
  ): Promise<string[]> {
    const rows = await this.dataSource.query<Array<{ id: string }>>(
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
}

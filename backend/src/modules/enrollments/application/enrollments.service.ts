import {
  Injectable,
  ConflictException,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, EntityManager, In, LessThan } from 'typeorm';
import { EnrollmentRepository } from '@modules/enrollments/infrastructure/enrollment.repository';
import { EnrollmentStatusRepository } from '@modules/enrollments/infrastructure/enrollment-status.repository';
import { EnrollmentEvaluationRepository } from '@modules/enrollments/infrastructure/enrollment-evaluation.repository';
import { EnrollmentTypeRepository } from '@modules/enrollments/infrastructure/enrollment-type.repository';
import { CreateEnrollmentDto } from '@modules/enrollments/dto/create-enrollment.dto';
import { EnrollmentOptionsResponseDto } from '@modules/enrollments/dto/enrollment-options.dto';
import { Enrollment } from '@modules/enrollments/domain/enrollment.entity';
import { CourseCycle } from '@modules/courses/domain/course-cycle.entity';
import { Evaluation } from '@modules/evaluations/domain/evaluation.entity';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { MyEnrollmentsResponseDto } from '@modules/enrollments/dto/my-enrollments-response.dto';
import { technicalSettings } from '@config/technical-settings';
import { getEpoch } from '@common/utils/date.util';
import {
  ENROLLMENT_CACHE_KEYS,
  ENROLLMENT_STATUS_CODES,
  ENROLLMENT_TYPE_CODES,
} from '@modules/enrollments/domain/enrollment.constants';
import { EVALUATION_TYPE_CODES } from '@modules/evaluations/domain/evaluation.constants';
import { CLASS_EVENT_CACHE_KEYS } from '@modules/events/domain/class-event.constants';
import { MediaAccessMembershipDispatchService } from '@modules/media-access/application/media-access-membership-dispatch.service';
import { MEDIA_ACCESS_SYNC_SOURCES } from '@modules/media-access/domain/media-access.constants';
import { ROLE_CODES } from '@common/constants/role-codes.constants';
import { User } from '@modules/users/domain/user.entity';
import {
  toBusinessDayEndUtc,
  toBusinessDayStartUtc,
} from '@common/utils/peru-time.util';
import { formatCycleLevelName } from '@common/utils/cycle-level-format.util';
import { SettingsService } from '@modules/settings/application/settings.service';
import {
  DatabaseError,
  MySqlErrorCode,
} from '@common/interfaces/database-error.interface';
import { getErrnoFromDbError } from '@common/utils/mysql-error.util';

@Injectable()
export class EnrollmentsService {
  private readonly logger = new Logger(EnrollmentsService.name);
  private readonly DASHBOARD_CACHE_TTL =
    technicalSettings.cache.enrollments.myEnrollmentsDashboardCacheTtlSeconds;

  constructor(
    private readonly dataSource: DataSource,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly enrollmentStatusRepository: EnrollmentStatusRepository,
    private readonly enrollmentEvaluationRepository: EnrollmentEvaluationRepository,
    private readonly enrollmentTypeRepository: EnrollmentTypeRepository,
    private readonly cacheService: RedisCacheService,
    private readonly mediaAccessMembershipDispatchService: MediaAccessMembershipDispatchService,
    private readonly settingsService: SettingsService,
  ) {}

  async findMyEnrollments(userId: string): Promise<MyEnrollmentsResponseDto[]> {
    const cacheKey = ENROLLMENT_CACHE_KEYS.DASHBOARD(userId);

    const cachedData =
      await this.cacheService.get<MyEnrollmentsResponseDto[]>(cacheKey);
    if (cachedData) return cachedData;

    const enrollments =
      await this.enrollmentRepository.findMyEnrollments(userId);

    const now = new Date();

    const result = enrollments.map((enrollment) => {
      const startDate = toBusinessDayStartUtc(
        enrollment.courseCycle.academicCycle.startDate,
      );
      const endDate = toBusinessDayEndUtc(
        enrollment.courseCycle.academicCycle.endDate,
      );

      const isCurrent = now >= startDate && now <= endDate;

      return {
        id: enrollment.id,
        enrolledAt: enrollment.enrolledAt,
        courseCycle: {
          id: enrollment.courseCycle.id,
          course: {
            id: enrollment.courseCycle.course.id,
            code: enrollment.courseCycle.course.code,
            name: enrollment.courseCycle.course.name,
            courseType: {
              code: enrollment.courseCycle.course.courseType.code,
              name: enrollment.courseCycle.course.courseType.name,
            },
            cycleLevel: {
              name: formatCycleLevelName(
                enrollment.courseCycle.course.cycleLevel.levelNumber,
              ),
            },
          },
          academicCycle: {
            id: enrollment.courseCycle.academicCycle.id,
            code: enrollment.courseCycle.academicCycle.code,
            startDate: enrollment.courseCycle.academicCycle.startDate,
            endDate: enrollment.courseCycle.academicCycle.endDate,
            isCurrent,
          },
          professors: (enrollment.courseCycle.professors || []).map((p) => ({
            id: p.professor.id,
            firstName: p.professor.firstName,
            lastName1: p.professor.lastName1 || '',
            lastName2: p.professor.lastName2 || '',
            profilePhotoUrl: p.professor.profilePhotoUrl,
          })),
        },
      };
    });

    await this.cacheService.set(cacheKey, result, this.DASHBOARD_CACHE_TTL);
    return result;
  }

  async enroll(dto: CreateEnrollmentDto): Promise<Enrollment> {
    const transactionResult = await this.dataSource.transaction(
      async (manager) => {
        const existing =
          await this.enrollmentRepository.findActiveByUserAndCourseCycle(
            dto.userId,
            dto.courseCycleId,
            manager,
          );

        if (existing) {
          throw new ConflictException(
            'El usuario ya cuenta con una matricula activa en este curso.',
          );
        }

        await this.assertUserIsActiveStudent(dto.userId, manager);

        const type = await this.enrollmentTypeRepository.findByCode(
          dto.enrollmentTypeCode,
          manager,
        );
        if (!type) {
          throw new BadRequestException('Tipo de matricula no valido.');
        }

        if (
          type.code === ENROLLMENT_TYPE_CODES.PARTIAL &&
          (!dto.evaluationIds || dto.evaluationIds.length === 0)
        ) {
          throw new BadRequestException(
            'Las matriculas parciales deben especificar al menos una evaluacion.',
          );
        }

        const status = await this.enrollmentStatusRepository.findByCode(
          ENROLLMENT_STATUS_CODES.ACTIVE,
          manager,
        );
        if (!status) {
          throw new InternalServerErrorException(
            'Error de configuracion del sistema.',
          );
        }

        const courseCycle = await manager.getRepository(CourseCycle).findOne({
          where: { id: dto.courseCycleId },
          relations: { academicCycle: true },
          lock: { mode: 'pessimistic_read' },
        });

        if (!courseCycle || !courseCycle.academicCycle) {
          throw new InternalServerErrorException(
            'Inconsistencia en datos del ciclo.',
          );
        }

        const now = new Date();
        const cycleEndDate = toBusinessDayEndUtc(
          courseCycle.academicCycle.endDate,
        );

        if (getEpoch(cycleEndDate) < getEpoch(now)) {
          this.logger.warn({
            message: 'Intento de matricula en ciclo finalizado',
            courseCycleId: dto.courseCycleId,
            academicCycleCode: courseCycle.academicCycle.code,
            cycleEndDate: cycleEndDate.toISOString(),
            userId: dto.userId,
          });
          throw new BadRequestException(
            `No se puede matricular en el ciclo ${courseCycle.academicCycle.code} porque ya ha finalizado.`,
          );
        }

        let enrollment: Enrollment;
        try {
          enrollment = await this.enrollmentRepository.create(
            {
              userId: dto.userId,
              courseCycleId: dto.courseCycleId,
              enrollmentStatusId: status.id,
              enrollmentTypeId: type.id,
              enrolledAt: new Date(),
            },
            manager,
          );
        } catch (error) {
          if (this.isActiveEnrollmentDuplicateError(error)) {
            throw new ConflictException(
              'El usuario ya cuenta con una matricula activa en este curso.',
            );
          }
          throw error;
        }

        const courseCycleIdsToFetch: string[] = [dto.courseCycleId];

        if (
          dto.historicalCourseCycleIds &&
          dto.historicalCourseCycleIds.length > 0
        ) {
          const pastCycles = await manager.getRepository(CourseCycle).find({
            where: {
              id: In(dto.historicalCourseCycleIds),
              courseId: courseCycle.courseId,
              academicCycle: {
                startDate: LessThan(courseCycle.academicCycle.startDate),
              },
            },
          });

          if (pastCycles.length !== dto.historicalCourseCycleIds.length) {
            throw new BadRequestException(
              'Uno o mas ciclos historicos no son validos o no pertenecen al curso.',
            );
          }

          courseCycleIdsToFetch.push(...pastCycles.map((pc) => pc.id));
        }

        const allEvaluations = await manager.getRepository(Evaluation).find({
          where: { courseCycleId: In(courseCycleIdsToFetch) },
          relations: { evaluationType: true },
        });

        let grantedEvaluationIds: string[] = [];
        if (allEvaluations.length > 0) {
          let evaluationsToGrant: Evaluation[] = [];

          if (type.code === ENROLLMENT_TYPE_CODES.FULL) {
            evaluationsToGrant = allEvaluations;
          } else {
            const requestedIds = new Set(dto.evaluationIds || []);
            const academicEvaluations = allEvaluations.filter((e) =>
              requestedIds.has(e.id),
            );
            const bankEvaluation = allEvaluations.find(
              (e) =>
                e.evaluationType.code ===
                  EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS &&
                e.courseCycleId === dto.courseCycleId,
            );

            if (academicEvaluations.length === 0) {
              throw new BadRequestException(
                'Las evaluaciones solicitadas no son validas para este ciclo.',
              );
            }

            evaluationsToGrant = [...academicEvaluations];

            if (
              bankEvaluation &&
              !evaluationsToGrant.some(
                (evaluation) => evaluation.id === bankEvaluation.id,
              )
            ) {
              evaluationsToGrant.push(bankEvaluation);
            }
          }

          const unifiedAccessStartDate = toBusinessDayStartUtc(
            courseCycle.academicCycle.startDate,
          );
          const unifiedAccessEndDate = toBusinessDayEndUtc(
            courseCycle.academicCycle.endDate,
          );
          const accessEntries = evaluationsToGrant.map((evaluation) => {
            return {
              enrollmentId: enrollment.id,
              evaluationId: evaluation.id,
              accessStartDate: new Date(unifiedAccessStartDate),
              accessEndDate: new Date(unifiedAccessEndDate),
              isActive: true,
            };
          });

          await this.enrollmentEvaluationRepository.createMany(
            accessEntries,
            manager,
          );
          grantedEvaluationIds = accessEntries.map((entry) =>
            String(entry.evaluationId),
          );
        }

        await Promise.all([
          this.cacheService.del(ENROLLMENT_CACHE_KEYS.DASHBOARD(dto.userId)),
          this.cacheService.invalidateGroup(
            ENROLLMENT_CACHE_KEYS.USER_ACCESS_GROUP(dto.userId),
          ),
          this.cacheService.invalidateGroup(
            CLASS_EVENT_CACHE_KEYS.USER_SCHEDULE_GROUP(dto.userId),
          ),
        ]);

        this.logger.log({
          message: 'Matricula procesada exitosamente',
          userId: dto.userId,
          courseCycleId: dto.courseCycleId,
          enrollmentId: enrollment.id,
          grantedEvaluations: grantedEvaluationIds.length,
          timestamp: new Date().toISOString(),
        });

        return {
          enrollment,
          grantedEvaluationIds,
          grantedCourseCycleIds: Array.from(new Set(courseCycleIdsToFetch)),
        };
      },
    );

    await this.mediaAccessMembershipDispatchService.enqueueGrantForUserEvaluations(
      dto.userId,
      transactionResult.grantedEvaluationIds,
      MEDIA_ACCESS_SYNC_SOURCES.ENROLLMENT_CREATED,
    );
    await this.mediaAccessMembershipDispatchService.enqueueGrantForUserCourseCycles(
      dto.userId,
      transactionResult.grantedCourseCycleIds,
      MEDIA_ACCESS_SYNC_SOURCES.ENROLLMENT_CREATED_COURSE_CYCLE,
    );

    return transactionResult.enrollment;
  }

  async cancelEnrollment(enrollmentId: string): Promise<void> {
    const enrollment = await this.enrollmentRepository.findById(enrollmentId);
    if (!enrollment) {
      throw new BadRequestException('Matricula no encontrada.');
    }
    const evaluationIdsToRevoke =
      await this.enrollmentEvaluationRepository.findEvaluationIdsToRevokeAfterEnrollmentCancellation(
        enrollment.userId,
        enrollmentId,
      );
    const courseCycleIdsToRevoke =
      await this.enrollmentEvaluationRepository.findCourseCycleIdsToRevokeAfterEnrollmentCancellation(
        enrollment.userId,
        enrollmentId,
      );

    await this.enrollmentRepository.update(enrollmentId, {
      cancelledAt: new Date(),
    });

    await Promise.all([
      this.cacheService.del(ENROLLMENT_CACHE_KEYS.DASHBOARD(enrollment.userId)),
      this.cacheService.invalidateGroup(
        ENROLLMENT_CACHE_KEYS.USER_ACCESS_GROUP(enrollment.userId),
      ),
      this.cacheService.invalidateGroup(
        CLASS_EVENT_CACHE_KEYS.USER_SCHEDULE_GROUP(enrollment.userId),
      ),
    ]);
    await this.mediaAccessMembershipDispatchService.enqueueRevokeForUserEvaluations(
      enrollment.userId,
      evaluationIdsToRevoke,
      MEDIA_ACCESS_SYNC_SOURCES.ENROLLMENT_CANCELLED,
    );
    await this.mediaAccessMembershipDispatchService.enqueueRevokeForUserCourseCycles(
      enrollment.userId,
      courseCycleIdsToRevoke.length > 0
        ? courseCycleIdsToRevoke
        : [enrollment.courseCycleId],
      MEDIA_ACCESS_SYNC_SOURCES.ENROLLMENT_CANCELLED_COURSE_CYCLE,
    );

    this.logger.log({
      message: 'Matricula cancelada e invalidacion de cache procesada',
      userId: enrollment.userId,
      enrollmentId,
      revokedEvaluations: evaluationIdsToRevoke.length,
      revokedCourseCycles: courseCycleIdsToRevoke.length,
      timestamp: new Date().toISOString(),
    });
  }

  async getEnrollmentOptionsByCourseCycle(
    courseCycleId: string,
  ): Promise<EnrollmentOptionsResponseDto> {
    const baseRows = await this.dataSource.query<
      Array<{
        baseCourseCycleId: string;
        courseId: string;
        courseCode: string;
        courseName: string;
        academicCycleCode: string;
        academicCycleStartDate: Date;
      }>
    >(
      `
        SELECT
          cc.id AS baseCourseCycleId,
          c.id AS courseId,
          c.code AS courseCode,
          c.name AS courseName,
          ac.code AS academicCycleCode,
          ac.start_date AS academicCycleStartDate
        FROM course_cycle cc
        INNER JOIN course c ON c.id = cc.course_id
        INNER JOIN academic_cycle ac ON ac.id = cc.academic_cycle_id
        WHERE cc.id = ?
        LIMIT 1
      `,
      [courseCycleId],
    );

    const base = baseRows[0];
    if (!base) {
      throw new BadRequestException('Ciclo de curso no encontrado.');
    }

    const [evaluationRows, historicalRows] = await Promise.all([
      this.dataSource.query<
        Array<{
          id: string;
          evaluationTypeCode: string;
          evaluationTypeName: string;
          evaluationNumber: number;
        }>
      >(
        `
          SELECT
            e.id AS id,
            et.code AS evaluationTypeCode,
            et.name AS evaluationTypeName,
            e.number AS evaluationNumber
          FROM evaluation e
          INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
          WHERE e.course_cycle_id = ?
            AND UPPER(TRIM(et.code)) <> ?
          ORDER BY e.start_date ASC, e.number ASC, e.id ASC
        `,
        [courseCycleId, EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS],
      ),
      this.dataSource.query<
        Array<{
          courseCycleId: string;
          academicCycleCode: string;
        }>
      >(
        `
          SELECT
            cc.id AS courseCycleId,
            ac.code AS academicCycleCode
          FROM course_cycle cc
          INNER JOIN academic_cycle ac ON ac.id = cc.academic_cycle_id
          WHERE cc.course_id = ?
            AND ac.start_date < ?
          ORDER BY ac.start_date DESC, cc.id DESC
        `,
        [base.courseId, base.academicCycleStartDate],
      ),
    ]);

    return {
      baseCourseCycleId: base.baseCourseCycleId,
      courseId: base.courseId,
      courseCode: base.courseCode,
      courseName: base.courseName,
      academicCycleCode: base.academicCycleCode,
      evaluations: evaluationRows.map((row) => ({
        id: row.id,
        evaluationTypeCode: row.evaluationTypeCode,
        shortName: `${row.evaluationTypeCode}${row.evaluationNumber}`,
        fullName: `${row.evaluationTypeName} ${row.evaluationNumber}`,
      })),
      historicalCycles: historicalRows.map((row) => ({
        courseCycleId: row.courseCycleId,
        academicCycleCode: row.academicCycleCode,
      })),
    };
  }

  async getEnrollmentCourseCycleOptions(courseId: string): Promise<{
    courseId: string;
    courseCode: string;
    courseName: string;
    currentCycle: { courseCycleId: string; academicCycleCode: string } | null;
    historicalCycles: Array<{ courseCycleId: string; academicCycleCode: string }>;
  }> {
    const normalizedCourseId = String(courseId || '').trim();
    if (!normalizedCourseId) {
      throw new BadRequestException('courseId es requerido');
    }

    const courseRows = await this.dataSource.query<
      Array<{ courseId: string; courseCode: string; courseName: string }>
    >(
      `
        SELECT
          c.id AS courseId,
          c.code AS courseCode,
          c.name AS courseName
        FROM course c
        WHERE c.id = ?
        LIMIT 1
      `,
      [normalizedCourseId],
    );
    const course = courseRows[0];
    if (!course) {
      throw new BadRequestException('Curso no encontrado');
    }

    const activeCycleId = await this.settingsService.getString('ACTIVE_CYCLE_ID');
    const currentRows = await this.dataSource.query<
      Array<{
        courseCycleId: string;
        academicCycleCode: string;
        academicCycleStartDate: Date;
      }>
    >(
      `
        SELECT
          cc.id AS courseCycleId,
          ac.code AS academicCycleCode,
          ac.start_date AS academicCycleStartDate
        FROM course_cycle cc
        INNER JOIN academic_cycle ac ON ac.id = cc.academic_cycle_id
        WHERE cc.course_id = ?
          AND cc.academic_cycle_id = ?
        ORDER BY cc.id ASC
        LIMIT 1
      `,
      [normalizedCourseId, activeCycleId],
    );
    const current = currentRows[0] || null;

    let historicalCycles: Array<{
      courseCycleId: string;
      academicCycleCode: string;
    }> = [];
    if (current) {
      historicalCycles = await this.dataSource.query<
        Array<{ courseCycleId: string; academicCycleCode: string }>
      >(
        `
          SELECT
            cc.id AS courseCycleId,
            ac.code AS academicCycleCode
          FROM course_cycle cc
          INNER JOIN academic_cycle ac ON ac.id = cc.academic_cycle_id
          WHERE cc.course_id = ?
            AND ac.start_date < ?
          ORDER BY ac.start_date DESC, cc.id DESC
        `,
        [normalizedCourseId, current.academicCycleStartDate],
      );
    }

    return {
      courseId: course.courseId,
      courseCode: course.courseCode,
      courseName: course.courseName,
      currentCycle: current
        ? {
            courseCycleId: current.courseCycleId,
            academicCycleCode: current.academicCycleCode,
          }
        : null,
      historicalCycles,
    };
  }

  private async assertUserIsActiveStudent(
    userId: string,
    manager: EntityManager,
  ): Promise<void> {
    if (typeof manager.query === 'function') {
      const rows = await manager.query<
        Array<{ isActiveStudent: number | string }>
      >(
        `
          SELECT EXISTS(
            SELECT 1
            FROM user u
            INNER JOIN user_role ur
              ON ur.user_id = u.id
            INNER JOIN role r
              ON r.id = ur.role_id
            WHERE u.id = ?
              AND u.is_active = 1
              AND r.code = ?
          ) AS isActiveStudent
        `,
        [userId, ROLE_CODES.STUDENT],
      );

      if (Number(rows[0]?.isActiveStudent) === 1) {
        return;
      }
    } else {
      const user = await manager.getRepository(User).findOne({
        where: { id: userId, isActive: true },
        relations: { roles: true },
      });

      if (user?.roles?.some((role) => role.code === ROLE_CODES.STUDENT)) {
        return;
      }
    }

    throw new BadRequestException(
      'El usuario debe ser un alumno activo para matricularse.',
    );
  }

  private isActiveEnrollmentDuplicateError(error: unknown): boolean {
    const errno = getErrnoFromDbError(error as DatabaseError);
    if (errno !== MySqlErrorCode.DUPLICATE_ENTRY) {
      return false;
    }

    const message = String(
      (error as { message?: unknown })?.message ??
        (error as { driverError?: { message?: unknown } })?.driverError
          ?.message ??
        '',
    ).toLowerCase();

    return message.includes('uq_enrollment_active_user_course_cycle');
  }
}

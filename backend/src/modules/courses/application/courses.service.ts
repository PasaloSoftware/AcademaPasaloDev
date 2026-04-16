import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  InternalServerErrorException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { CourseRepository } from '@modules/courses/infrastructure/course.repository';
import { CourseTypeRepository } from '@modules/courses/infrastructure/course-type.repository';
import { CycleLevelRepository } from '@modules/courses/infrastructure/cycle-level.repository';
import { CourseCycleRepository } from '@modules/courses/infrastructure/course-cycle.repository';
import { CourseCycleProfessorRepository } from '@modules/courses/infrastructure/course-cycle-professor.repository';
import { CourseCycleAllowedEvaluationTypeRepository } from '@modules/courses/infrastructure/course-cycle-allowed-evaluation-type.repository';
import { EvaluationRepository } from '@modules/evaluations/infrastructure/evaluation.repository';
import { CyclesService } from '@modules/cycles/application/cycles.service';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { Course } from '@modules/courses/domain/course.entity';
import { CourseType } from '@modules/courses/domain/course-type.entity';
import { CycleLevel } from '@modules/courses/domain/cycle-level.entity';
import { CourseCycle } from '@modules/courses/domain/course-cycle.entity';
import { CreateCourseDto } from '@modules/courses/dto/create-course.dto';
import { UpdateCourseDto } from '@modules/courses/dto/update-course.dto';
import { AssignCourseToCycleDto } from '@modules/courses/dto/assign-course-to-cycle.dto';
import {
  AdminCourseCycleListQueryDto,
  AdminCourseCycleListResponseDto,
} from '@modules/courses/dto/admin-course-cycle-list.dto';
import { CourseContentResponseDto } from '@modules/courses/dto/course-content.dto';
import {
  StudentCurrentCycleContentResponseDto,
  StudentBankStructureResponseDto,
  StudentPreviousCycleContentResponseDto,
  StudentPreviousCycleListResponseDto,
} from '@modules/courses/dto/student-course-view.dto';
import { Evaluation } from '@modules/evaluations/domain/evaluation.entity';
import { EnrollmentEvaluation } from '@modules/enrollments/domain/enrollment-evaluation.entity';
import { EVALUATION_TYPE_CODES } from '@modules/evaluations/domain/evaluation.constants';
import { COURSE_CACHE_KEYS } from '@modules/courses/domain/course.constants';
import { ENROLLMENT_CACHE_KEYS } from '@modules/enrollments/domain/enrollment.constants';
import { CLASS_EVENT_CACHE_KEYS } from '@modules/events/domain/class-event.constants';
import { technicalSettings } from '@config/technical-settings';
import { User } from '@/modules/users/domain/user.entity';
import { ENROLLMENT_TYPE_CODES } from '@modules/enrollments/domain/enrollment.constants';
import {
  STUDENT_EVALUATION_LABELS,
  StudentEvaluationLabel,
} from '@modules/courses/domain/student-course.constants';
import {
  ADMIN_ROLE_CODES,
  ROLE_CODES,
} from '@common/constants/role-codes.constants';
import { ACCESS_MESSAGES } from '@common/constants/access-messages.constants';
import {
  MEDIA_ACCESS_MODES,
  MEDIA_CONTENT_KINDS,
  MEDIA_VIDEO_LINK_MODES,
} from '@modules/media-access/domain/media-access.constants';
import {
  buildDrivePreviewUrl,
  extractDriveFileIdFromUrl,
} from '@modules/media-access/domain/media-access-url.util';
import {
  FOLDER_STATUS_CODES,
  MATERIAL_CACHE_KEYS,
  MATERIAL_STATUS_CODES,
  STORAGE_PROVIDER_CODES,
} from '@modules/materials/domain/material.constants';
import { AuthorizedCourseIntroVideoLinkDto } from '@modules/courses/dto/authorized-course-intro-video-link.dto';
import { MediaAccessMembershipDispatchService } from '@modules/media-access/application/media-access-membership-dispatch.service';
import { MEDIA_ACCESS_SYNC_SOURCES } from '@modules/media-access/domain/media-access.constants';
import { CourseCycleDriveProvisioningService } from '@modules/media-access/application/course-cycle-drive-provisioning.service';
import {
  toBusinessDayEndUtc,
  toBusinessDayStartUtc,
} from '@common/utils/peru-time.util';
import { formatCycleLevelName } from '@common/utils/cycle-level-format.util';
import { MyEnrollmentsResponseDto } from '@modules/enrollments/dto/my-enrollments-response.dto';
import { CourseCycleProfessor } from '@modules/courses/domain/course-cycle-professor.entity';
import { StorageService } from '@infrastructure/storage/storage.service';
import { MaterialFolderRepository } from '@modules/materials/infrastructure/material-folder.repository';
import { MaterialRepository } from '@modules/materials/infrastructure/material.repository';
import { FileResourceRepository } from '@modules/materials/infrastructure/file-resource.repository';
import { MaterialCatalogRepository } from '@modules/materials/infrastructure/material-catalog.repository';
import { MaterialFolder } from '@modules/materials/domain/material-folder.entity';
import { Material } from '@modules/materials/domain/material.entity';
import { FileResource } from '@modules/materials/domain/file-resource.entity';
import { MaterialVersion } from '@modules/materials/domain/material-version.entity';
import { getErrnoFromDbError } from '@common/utils/mysql-error.util';
import { MySqlErrorCode } from '@common/interfaces/database-error.interface';
import {
  UploadBankDocumentDto,
  UploadBankDocumentResponseDto,
  UpdateBankFolderDto,
  UpdateBankFolderResponseDto,
} from '@modules/courses/dto/bank-documents.dto';
import { UpdateCourseStatusDto } from '@modules/courses/dto/update-course-status.dto';

type EvaluationWithAccess = Evaluation & {
  enrollmentEvaluations?: EnrollmentEvaluation[];
};

type StudentCourseAccessContext = {
  cycle: CourseCycle;
  enrollmentTypeCode: string;
  canViewPreviousCycles: boolean;
};

type BankCardMeta = {
  evaluationId: string | null;
  evaluationTypeId: string;
  evaluationTypeCode: string;
  evaluationTypeName: string;
  evaluationNumber: number;
  groupFolderName: string;
  leafFolderName: string;
};

type StudentBankFolderEntry = {
  evaluationId: string | null;
  evaluationTypeCode: string;
  evaluationTypeName: string;
  evaluationNumber: number;
  label: string;
  folderId: string | null;
  folderName: string | null;
};

type LoadedBankFolderTree = {
  roots: MaterialFolder[];
  leafFolders: Array<{ root: MaterialFolder; folder: MaterialFolder }>;
};

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);
  private readonly CONTENT_CACHE_TTL =
    technicalSettings.cache.courses.courseContentCacheTtlSeconds;
  private readonly BANK_STRUCTURE_CACHE_TTL =
    technicalSettings.cache.courses.courseContentCacheTtlSeconds;
  private readonly PROFESSOR_ASSIGNMENT_CACHE_TTL =
    technicalSettings.cache.courses.professorAssignmentCacheTtlSeconds;
  private readonly COURSE_CYCLE_EXISTS_CACHE_TTL =
    technicalSettings.cache.courses.courseCycleExistsCacheTtlSeconds;

  constructor(
    private readonly dataSource: DataSource,
    private readonly courseRepository: CourseRepository,
    private readonly courseTypeRepository: CourseTypeRepository,
    private readonly cycleLevelRepository: CycleLevelRepository,
    private readonly courseCycleRepository: CourseCycleRepository,
    private readonly courseCycleProfessorRepository: CourseCycleProfessorRepository,
    private readonly courseCycleAllowedEvaluationTypeRepository: CourseCycleAllowedEvaluationTypeRepository,
    private readonly evaluationRepository: EvaluationRepository,
    private readonly cyclesService: CyclesService,
    private readonly cacheService: RedisCacheService,
    private readonly mediaAccessMembershipDispatchService: MediaAccessMembershipDispatchService,
    private readonly courseCycleDriveProvisioningService: CourseCycleDriveProvisioningService,
    private readonly storageService: StorageService,
    private readonly materialFolderRepository: MaterialFolderRepository,
    private readonly materialRepository: MaterialRepository,
    private readonly fileResourceRepository: FileResourceRepository,
    private readonly materialCatalogRepository: MaterialCatalogRepository,
  ) {}

  async findAllCourses(): Promise<Course[]> {
    return await this.courseRepository.findAll();
  }

  async findAdminCourseCycles(
    query: AdminCourseCycleListQueryDto,
  ): Promise<AdminCourseCycleListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const { rows, totalItems } =
      await this.courseCycleRepository.findAdminCourseCyclesPage({
        page,
        pageSize,
        search: query.search,
      });

    const now = new Date();
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

    return {
      items: rows.map((row) => {
        const startDate = toBusinessDayStartUtc(row.academicCycleStartDate);
        const endDate = toBusinessDayEndUtc(row.academicCycleEndDate);
        return {
          courseCycleId: row.courseCycleId,
          course: {
            id: row.courseId,
            code: row.courseCode,
            name: row.courseName,
          },
          academicCycle: {
            id: row.academicCycleId,
            code: row.academicCycleCode,
            startDate,
            endDate,
            isCurrent: now >= startDate && now <= endDate,
          },
          professors: row.professors,
        };
      }),
      page,
      pageSize,
      totalItems,
      totalPages,
    };
  }

  async findCourseById(id: string): Promise<Course> {
    const course = await this.courseRepository.findById(id);
    if (!course) {
      this.logger.warn({
        message: 'Consulta de materia inexistente',
        courseId: id,
        timestamp: new Date().toISOString(),
      });
      throw new NotFoundException(
        'La materia solicitada no se encuentra disponible.',
      );
    }
    return course;
  }

  async create(dto: CreateCourseDto): Promise<Course> {
    const existing = await this.courseRepository.findByCode(dto.code);
    if (existing) {
      throw new ConflictException(
        'Ya existe una materia registrada con ese código.',
      );
    }

    const course = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Course);
      const newCourse = repo.create({
        code: dto.code,
        name: dto.name,
        primaryColor: dto.primaryColor,
        secondaryColor: dto.secondaryColor,
        courseTypeId: dto.courseTypeId,
        cycleLevelId: dto.cycleLevelId,
        createdAt: new Date(),
      });
      return await repo.save(newCourse);
    });

    return await this.findCourseById(course.id);
  }

  async update(id: string, dto: UpdateCourseDto): Promise<Course> {
    const course = await this.findCourseById(id);

    if (dto.code && dto.code !== course.code) {
      const existing = await this.courseRepository.findByCode(dto.code);
      if (existing) {
        throw new ConflictException(
          'Ya existe una materia registrada con ese código.',
        );
      }
    }

    const updatedCourse = await this.dataSource.transaction(async (manager) => {
      return await this.courseRepository.updateAndReturn(
        id,
        {
          ...(dto.code && { code: dto.code }),
          ...(dto.name && { name: dto.name }),
          ...(dto.primaryColor !== undefined && {
            primaryColor: dto.primaryColor,
          }),
          ...(dto.secondaryColor !== undefined && {
            secondaryColor: dto.secondaryColor,
          }),
          ...(dto.courseTypeId && { courseTypeId: dto.courseTypeId }),
          ...(dto.cycleLevelId && { cycleLevelId: dto.cycleLevelId }),
        },
        manager,
      );
    });

    await Promise.all([
      this.cacheService.invalidateGroup(COURSE_CACHE_KEYS.GLOBAL_CONTENT_GROUP),
      this.cacheService.invalidateGroup(
        ENROLLMENT_CACHE_KEYS.GLOBAL_DASHBOARD_GROUP,
      ),
      this.cacheService.invalidateGroup(
        CLASS_EVENT_CACHE_KEYS.GLOBAL_SCHEDULE_GROUP,
      ),
      this.cacheService.invalidateGroup(
        CLASS_EVENT_CACHE_KEYS.GLOBAL_EVALUATION_LIST_GROUP,
      ),
    ]);

    return updatedCourse;
  }

  async updateStatus(id: string, dto: UpdateCourseStatusDto): Promise<Course> {
    await this.findCourseById(id);

    const updatedCourse = await this.courseRepository.updateAndReturn(id, {
      isActive: dto.isActive,
    });

    this.logger.log({
      message: 'Estado de materia actualizado exitosamente',
      courseId: id,
      isActive: dto.isActive,
      timestamp: new Date().toISOString(),
    });

    return updatedCourse;
  }

  async delete(id: string): Promise<void> {
    await this.findCourseById(id);

    try {
      await this.courseRepository.deleteById(id);
    } catch (error) {
      const dbErrno = getErrnoFromDbError(error);
      if (dbErrno === MySqlErrorCode.FOREIGN_KEY_CONSTRAINT_FAIL) {
        throw new ConflictException(
          'No se puede eliminar la materia porque tiene curso-ciclos o registros relacionados.',
        );
      }
      throw error;
    }

    this.logger.log({
      message: 'Materia eliminada exitosamente',
      courseId: id,
      timestamp: new Date().toISOString(),
    });
  }

  async assignToCycle(dto: AssignCourseToCycleDto): Promise<CourseCycle> {
    const course = await this.findCourseById(dto.courseId);
    const cycle = await this.cyclesService.findOne(dto.academicCycleId);

    const existing = await this.courseCycleRepository.findByCourseAndCycle(
      dto.courseId,
      dto.academicCycleId,
    );
    if (existing) {
      throw new ConflictException(
        'Esta materia ya se encuentra vinculada al ciclo seleccionado.',
      );
    }

    const courseCycle = await this.dataSource.transaction(async (manager) => {
      const courseCycle = await this.courseCycleRepository.create(
        {
          courseId: course.id,
          academicCycleId: cycle.id,
        },
        manager,
      );

      const bancoType = await this.evaluationRepository.findTypeByCode(
        EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS,
        manager,
      );
      if (!bancoType) {
        this.logger.error({
          message: `Tipo de evaluación ${EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS} no configurado en el catálogo`,
          timestamp: new Date().toISOString(),
        });
        throw new InternalServerErrorException(
          'Error de configuración del sistema: Tipo de evaluación faltante.',
        );
      }

      await this.evaluationRepository.create(
        {
          courseCycleId: courseCycle.id,
          evaluationTypeId: bancoType.id,
          number: 0,
          startDate: toBusinessDayStartUtc(cycle.startDate),
          endDate: toBusinessDayEndUtc(cycle.endDate),
        },
        manager,
      );

      this.logger.log({
        message:
          'Materia vinculada a ciclo exitosamente con Banco de Enunciados',
        courseId: course.id,
        cycleId: cycle.id,
        courseCycleId: courseCycle.id,
        timestamp: new Date().toISOString(),
      });

      return courseCycle;
    });

    await this.cacheService.invalidateGroup(
      COURSE_CACHE_KEYS.GLOBAL_COURSE_CYCLE_EXISTS_GROUP,
    );

    return courseCycle;
  }

  async assignProfessorToCourseCycle(
    courseCycleId: string,
    professorUserId: string,
  ): Promise<void> {
    const cycle = await this.courseCycleRepository.findById(courseCycleId);
    if (!cycle) {
      throw new NotFoundException('Ciclo del curso no encontrado');
    }
    await this.assertUserIsActiveProfessor(professorUserId);

    await this.dataSource.transaction(async (manager) => {
      await this.courseCycleProfessorRepository.upsertAssign(
        courseCycleId,
        professorUserId,
        manager,
      );
    });

    const evaluationIds =
      await this.listEvaluationIdsByCourseCycle(courseCycleId);
    await this.invalidateProfessorAccessCache(
      professorUserId,
      [courseCycleId],
      evaluationIds,
    );
    await this.mediaAccessMembershipDispatchService.enqueueGrantForUserCourseCycles(
      professorUserId,
      [courseCycleId],
      MEDIA_ACCESS_SYNC_SOURCES.PROFESSOR_ASSIGNED_COURSE_CYCLE,
    );
    await this.mediaAccessMembershipDispatchService.enqueueGrantForUserEvaluations(
      professorUserId,
      evaluationIds,
      MEDIA_ACCESS_SYNC_SOURCES.PROFESSOR_ASSIGNED_COURSE_CYCLE,
    );
  }

  async revokeProfessorFromCourseCycle(
    courseCycleId: string,
    professorUserId: string,
  ): Promise<void> {
    const cycle = await this.courseCycleRepository.findById(courseCycleId);
    if (!cycle) {
      throw new NotFoundException('Ciclo del curso no encontrado');
    }

    await this.dataSource.transaction(async (manager) => {
      await this.courseCycleProfessorRepository.revoke(
        courseCycleId,
        professorUserId,
        manager,
      );
    });

    const evaluationIds =
      await this.listEvaluationIdsByCourseCycle(courseCycleId);
    await this.invalidateProfessorAccessCache(
      professorUserId,
      [courseCycleId],
      evaluationIds,
    );
    await this.mediaAccessMembershipDispatchService.enqueueRevokeForUserCourseCycles(
      professorUserId,
      [courseCycleId],
      MEDIA_ACCESS_SYNC_SOURCES.PROFESSOR_REVOKED_COURSE_CYCLE,
    );
    await this.mediaAccessMembershipDispatchService.enqueueRevokeForUserEvaluations(
      professorUserId,
      evaluationIds,
      MEDIA_ACCESS_SYNC_SOURCES.PROFESSOR_REVOKED_COURSE_CYCLE,
    );
  }

  private async listEvaluationIdsByCourseCycle(
    courseCycleId: string,
  ): Promise<string[]> {
    const rows = await this.dataSource.query<Array<{ id: string }>>(
      `
        SELECT id
        FROM evaluation
        WHERE course_cycle_id = ?
      `,
      [courseCycleId],
    );
    return rows
      .map((row) => String(row.id || '').trim())
      .filter((id) => id.length > 0);
  }

  async getProfessorsByCourseCycle(
    courseCycleId: string,
    requesterUserId?: string,
    requesterActiveRole?: string,
  ): Promise<User[]> {
    if (
      this.isProfessorRole(requesterActiveRole) &&
      requesterUserId !== undefined
    ) {
      await this.assertProfessorCanReadCourseCycle(
        courseCycleId,
        requesterUserId,
      );
    }

    const cacheKey = COURSE_CACHE_KEYS.PROFESSORS_LIST(courseCycleId);
    const cached = await this.cacheService.get<User[]>(cacheKey);
    if (cached) return cached;

    const cycle = await this.courseCycleRepository.findById(courseCycleId);
    if (!cycle) {
      throw new NotFoundException('Ciclo del curso no encontrado');
    }

    const assignments =
      await this.courseCycleProfessorRepository.findByCourseCycleId(
        courseCycleId,
      );
    const professors = assignments.map((a) => a.professor);

    await this.cacheService.set(
      cacheKey,
      professors,
      this.PROFESSOR_ASSIGNMENT_CACHE_TTL,
    );
    return professors;
  }

  async getMyCourseCycles(
    professorUserId: string,
  ): Promise<MyEnrollmentsResponseDto[]> {
    const assignments =
      await this.courseCycleProfessorRepository.findByProfessorUserId(
        professorUserId,
      );
    return assignments
      .map((assignment) => this.mapProfessorDashboardAssignment(assignment))
      .filter((item) => item.courseCycle.academicCycle.isCurrent);
  }

  async findAllTypes(): Promise<CourseType[]> {
    return await this.courseTypeRepository.findAll();
  }

  async findAllLevels(): Promise<CycleLevel[]> {
    return await this.cycleLevelRepository.findAll();
  }

  async updateCourseCycleEvaluationStructure(
    courseCycleId: string,
    rawEvaluationTypeIds: string[],
  ): Promise<{ courseCycleId: string; evaluationTypeIds: string[] }> {
    const cycle = await this.courseCycleRepository.findById(courseCycleId);
    if (!cycle) {
      throw new NotFoundException('Ciclo del curso no encontrado');
    }

    const evaluationTypeIds = rawEvaluationTypeIds.map((id) => id.trim());
    if (evaluationTypeIds.length === 0) {
      throw new BadRequestException(
        'Debes enviar al menos un tipo de evaluacion.',
      );
    }
    if (evaluationTypeIds.some((id) => id.length === 0)) {
      throw new BadRequestException(
        'Los ids de tipo de evaluacion no pueden estar vacios.',
      );
    }

    const uniqueIds = [...new Set(evaluationTypeIds)];
    if (uniqueIds.length !== evaluationTypeIds.length) {
      throw new BadRequestException(
        'No se permiten ids de tipo de evaluacion duplicados.',
      );
    }

    const existingTypes =
      await this.evaluationRepository.findTypesByIds(evaluationTypeIds);
    if (existingTypes.length !== evaluationTypeIds.length) {
      const existingIds = new Set(existingTypes.map((type) => String(type.id)));
      const missingIds = evaluationTypeIds.filter((id) => !existingIds.has(id));
      throw new BadRequestException(
        `Tipos de evaluacion no encontrados: ${missingIds.join(', ')}`,
      );
    }

    const currentAllowed =
      await this.courseCycleAllowedEvaluationTypeRepository.findActiveByCourseCycleId(
        courseCycleId,
      );
    const currentIds = new Set(
      currentAllowed.map((row) => String(row.evaluationTypeId)),
    );
    const requestedIds = new Set(evaluationTypeIds);
    const unchanged =
      currentIds.size === requestedIds.size &&
      [...requestedIds].every((id) => currentIds.has(id));

    if (unchanged) {
      return {
        courseCycleId,
        evaluationTypeIds,
      };
    }

    await this.dataSource.transaction(async (manager) => {
      await this.courseCycleAllowedEvaluationTypeRepository.replaceAllowedTypes(
        courseCycleId,
        evaluationTypeIds,
        manager,
      );
    });

    await Promise.all([
      this.cacheService.invalidateIndex(
        COURSE_CACHE_KEYS.CONTENT_BY_CYCLE_INDEX(courseCycleId),
      ),
      this.cacheService.del(COURSE_CACHE_KEYS.BANK_STRUCTURE(courseCycleId)),
    ]);

    return {
      courseCycleId,
      evaluationTypeIds,
    };
  }

  async getCourseContent(
    courseCycleId: string,
    userId: string,
    requesterActiveRole?: string,
  ): Promise<CourseContentResponseDto> {
    const hasFullEvaluationAccess =
      this.hasFullEvaluationAccess(requesterActiveRole);
    const cacheKey = hasFullEvaluationAccess
      ? COURSE_CACHE_KEYS.COURSE_CONTENT_FULL_ACCESS(courseCycleId)
      : COURSE_CACHE_KEYS.COURSE_CONTENT_USER(courseCycleId, userId);

    if (this.isProfessorRole(requesterActiveRole)) {
      await this.assertProfessorCanReadCourseCycle(courseCycleId, userId);
    }

    let rawData = await this.cacheService.get<{
      cycle: CourseCycle;
      evaluations: EvaluationWithAccess[];
    }>(cacheKey);

    if (!rawData) {
      const fullCycle =
        await this.courseCycleRepository.findFullById(courseCycleId);
      if (!fullCycle) throw new NotFoundException('Curso no encontrado');

      const evaluations = hasFullEvaluationAccess
        ? await this.evaluationRepository.findByCourseCycle(courseCycleId)
        : await this.evaluationRepository.findAllWithUserAccess(
            courseCycleId,
            userId,
          );

      rawData = {
        cycle: fullCycle,
        evaluations: evaluations as EvaluationWithAccess[],
      };
      await Promise.all([
        this.cacheService.set(cacheKey, rawData, this.CONTENT_CACHE_TTL),
        this.cacheService.addToIndex(
          COURSE_CACHE_KEYS.CONTENT_BY_CYCLE_INDEX(courseCycleId),
          cacheKey,
          this.CONTENT_CACHE_TTL,
        ),
      ]);
    }

    return this.buildCourseContentResponse(rawData, hasFullEvaluationAccess);
  }

  async updateCourseCycleIntroVideo(
    courseCycleId: string,
    introVideoUrl?: string | null,
  ): Promise<void> {
    const cycle = await this.courseCycleRepository.findById(courseCycleId);
    if (!cycle) {
      throw new NotFoundException('Ciclo del curso no encontrado');
    }

    const normalizedUrl = String(introVideoUrl || '').trim();
    if (!normalizedUrl) {
      await this.dataSource.query(
        `
          UPDATE course_cycle
          SET intro_video_url = NULL,
              intro_video_file_id = NULL
          WHERE id = ?
        `,
        [courseCycleId],
      );
      await this.cacheService.invalidateIndex(
        COURSE_CACHE_KEYS.CONTENT_BY_CYCLE_INDEX(courseCycleId),
      );
      return;
    }

    const introVideoFileId = extractDriveFileIdFromUrl(normalizedUrl);
    if (!introVideoFileId) {
      throw new BadRequestException(
        'La URL del video introductorio debe ser un enlace de Google Drive valido',
      );
    }

    await this.storageService.enforceNoCopyForViewersOnDriveFile(
      introVideoFileId,
    );

    await this.dataSource.query(
      `
        UPDATE course_cycle
        SET intro_video_url = ?,
            intro_video_file_id = ?
        WHERE id = ?
      `,
      [normalizedUrl, introVideoFileId, courseCycleId],
    );

    await this.cacheService.invalidateIndex(
      COURSE_CACHE_KEYS.CONTENT_BY_CYCLE_INDEX(courseCycleId),
    );
  }

  async getAuthorizedCourseIntroVideoLink(
    user: User,
    courseCycleId: string,
    requesterActiveRole: string | undefined,
  ): Promise<AuthorizedCourseIntroVideoLinkDto> {
    await this.assertCourseCycleExists(courseCycleId);
    await this.assertCanAccessCourseCycleIntroVideo(
      user.id,
      courseCycleId,
      requesterActiveRole,
    );

    const rows = await this.dataSource.query<
      Array<{ introVideoUrl: string | null; introVideoFileId: string | null }>
    >(
      `
        SELECT
          intro_video_url AS introVideoUrl,
          intro_video_file_id AS introVideoFileId
        FROM course_cycle
        WHERE id = ?
        LIMIT 1
      `,
      [courseCycleId],
    );
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Ciclo del curso no encontrado');
    }

    const driveFileId =
      String(row.introVideoFileId || '').trim() ||
      extractDriveFileIdFromUrl(String(row.introVideoUrl || ''));
    if (!driveFileId) {
      throw new NotFoundException(
        'Video introductorio no disponible para este curso',
      );
    }

    const url = buildDrivePreviewUrl(driveFileId);

    return {
      contentKind: MEDIA_CONTENT_KINDS.VIDEO,
      accessMode: MEDIA_ACCESS_MODES.DIRECT_URL,
      courseCycleId,
      driveFileId,
      url,
      expiresAt: null,
      requestedMode: MEDIA_VIDEO_LINK_MODES.EMBED,
      fileName: null,
      mimeType: null,
      storageProvider: STORAGE_PROVIDER_CODES.GDRIVE,
    };
  }

  private async assertCourseCycleExists(courseCycleId: string): Promise<void> {
    const existsKey = COURSE_CACHE_KEYS.COURSE_CYCLE_EXISTS(courseCycleId);
    const cachedExists = await this.cacheService.get<boolean>(existsKey);
    if (cachedExists !== null) {
      if (!cachedExists) {
        throw new NotFoundException('Ciclo del curso no encontrado');
      }
      return;
    }

    const cycle = await this.courseCycleRepository.findById(courseCycleId);
    const exists = cycle !== null;
    await this.cacheService.set(
      existsKey,
      exists,
      this.COURSE_CYCLE_EXISTS_CACHE_TTL,
    );

    if (!exists) {
      throw new NotFoundException('Ciclo del curso no encontrado');
    }
  }

  private async assertProfessorCanReadCourseCycle(
    courseCycleId: string,
    userId: string,
  ): Promise<void> {
    const isAssigned =
      await this.courseCycleProfessorRepository.canProfessorReadCourseCycle(
        courseCycleId,
        userId,
      );

    if (!isAssigned) {
      await this.assertCourseCycleExists(courseCycleId);
      throw new ForbiddenException(ACCESS_MESSAGES.COURSE_CONTENT_FORBIDDEN);
    }
  }

  private hasFullEvaluationAccess(requesterActiveRole?: string): boolean {
    return (
      this.isProfessorRole(requesterActiveRole) ||
      this.isAdminRole(requesterActiveRole)
    );
  }

  private async invalidateProfessorAccessCache(
    professorUserId: string,
    courseCycleIds: string[],
    evaluationIds: string[],
  ): Promise<void> {
    const keys = [
      ...courseCycleIds.map((courseCycleId) =>
        COURSE_CACHE_KEYS.PROFESSOR_ASSIGNMENT_COURSE_CYCLE(
          courseCycleId,
          professorUserId,
        ),
      ),
      ...courseCycleIds.map((courseCycleId) =>
        COURSE_CACHE_KEYS.PROFESSORS_LIST(courseCycleId),
      ),
      ...evaluationIds.map((evaluationId) =>
        COURSE_CACHE_KEYS.PROFESSOR_ASSIGNMENT(evaluationId, professorUserId),
      ),
    ];

    const uniqueKeys = [...new Set(keys)];
    if (uniqueKeys.length === 0) {
      return;
    }

    await this.cacheService.delMany(uniqueKeys);
  }

  private buildCourseContentResponse(
    rawData: {
      cycle: CourseCycle;
      evaluations: EvaluationWithAccess[];
    },
    hasFullEvaluationAccess: boolean,
  ): CourseContentResponseDto {
    const now = new Date();
    const cycleStartDate = toBusinessDayStartUtc(
      rawData.cycle.academicCycle.startDate,
    );
    const cycleEndDate = toBusinessDayEndUtc(
      rawData.cycle.academicCycle.endDate,
    );
    const isCurrent = now >= cycleStartDate && now <= cycleEndDate;

    return {
      courseCycleId: rawData.cycle.id,
      courseName: rawData.cycle.course.name,
      courseCode: rawData.cycle.course.code,
      cycleCode: rawData.cycle.academicCycle.code,
      isCurrentCycle: isCurrent,
      evaluations: this.filterOutBankEvaluations(rawData.evaluations).map(
        (evaluation) => {
          const startDate = new Date(evaluation.startDate);
          const endDate = new Date(evaluation.endDate);

          return {
            id: evaluation.id,
            evaluationTypeCode: evaluation.evaluationType.code,
            shortName: this.buildEvaluationShortName(evaluation),
            fullName: this.buildEvaluationFullName(evaluation),
            label: this.buildStaffCourseContentLabel(
              evaluation,
              hasFullEvaluationAccess,
              startDate,
              endDate,
              now,
            ),
          };
        },
      ),
    };
  }

  private buildStaffCourseContentLabel(
    evaluation: EvaluationWithAccess,
    hasFullEvaluationAccess: boolean,
    evaluationStartDate: Date,
    evaluationEndDate: Date,
    now: Date,
  ): StudentEvaluationLabel {
    if (hasFullEvaluationAccess) {
      if (now > evaluationEndDate) {
        return STUDENT_EVALUATION_LABELS.COMPLETED;
      }
      if (now >= evaluationStartDate && now <= evaluationEndDate) {
        return STUDENT_EVALUATION_LABELS.IN_PROGRESS;
      }
      return STUDENT_EVALUATION_LABELS.UPCOMING;
    }

    const access =
      evaluation.enrollmentEvaluations && evaluation.enrollmentEvaluations[0]
        ? evaluation.enrollmentEvaluations[0]
        : null;

    if (!access || !access.isActive) {
      return STUDENT_EVALUATION_LABELS.LOCKED;
    }

    const accessStartDate = new Date(access.accessStartDate);
    const accessEndDate = new Date(access.accessEndDate);

    if (now > accessEndDate) {
      return STUDENT_EVALUATION_LABELS.COMPLETED;
    }
    if (now < accessStartDate) {
      return STUDENT_EVALUATION_LABELS.UPCOMING;
    }
    return STUDENT_EVALUATION_LABELS.IN_PROGRESS;
  }

  async getStudentCurrentCycleContent(
    courseCycleId: string,
    userId: string,
  ): Promise<StudentCurrentCycleContentResponseDto> {
    const accessContext = await this.getStudentCourseAccessContext(
      courseCycleId,
      userId,
    );

    const now = new Date();
    const evaluations = await this.evaluationRepository.findAllWithUserAccess(
      courseCycleId,
      userId,
    );

    const visibleEvaluations = this.filterOutBankEvaluations(
      evaluations as EvaluationWithAccess[],
    );

    return {
      courseCycleId: accessContext.cycle.id,
      cycleCode: accessContext.cycle.academicCycle.code,
      canViewPreviousCycles: accessContext.canViewPreviousCycles,
      evaluations: visibleEvaluations.map((evaluation) => {
        const startDate = new Date(evaluation.startDate);
        const endDate = new Date(evaluation.endDate);
        const hasAccess = this.hasActiveAccess(evaluation);

        let label: StudentEvaluationLabel;
        if (now > endDate) {
          label = hasAccess
            ? STUDENT_EVALUATION_LABELS.COMPLETED
            : STUDENT_EVALUATION_LABELS.LOCKED;
        } else if (now >= startDate && now <= endDate) {
          label = STUDENT_EVALUATION_LABELS.IN_PROGRESS;
        } else {
          label = hasAccess
            ? STUDENT_EVALUATION_LABELS.UPCOMING
            : STUDENT_EVALUATION_LABELS.LOCKED;
        }

        return {
          id: evaluation.id,
          evaluationTypeCode: evaluation.evaluationType.code,
          shortName: this.buildEvaluationShortName(evaluation),
          fullName: this.buildEvaluationFullName(evaluation),
          hasAccess,
          label,
        };
      }),
    };
  }

  async getStudentPreviousCycles(
    courseCycleId: string,
    userId: string,
    activeRole?: string,
  ): Promise<StudentPreviousCycleListResponseDto> {
    const accessContext = await this.getStudentCourseAccessContext(
      courseCycleId,
      userId,
      activeRole,
    );
    if (!accessContext.canViewPreviousCycles) {
      throw new ForbiddenException(
        'No tienes acceso para consultar ciclos anteriores de este curso.',
      );
    }

    const previousCycles =
      await this.courseCycleRepository.findPreviousByCourseId(
        accessContext.cycle.courseId,
        accessContext.cycle.academicCycle.startDate,
      );

    return {
      cycles: previousCycles.map((cycle) => ({
        cycleCode: cycle.academicCycle.code,
      })),
    };
  }

  async getStudentPreviousCycleContent(
    courseCycleId: string,
    previousCycleCode: string,
    userId: string,
    activeRole?: string,
  ): Promise<StudentPreviousCycleContentResponseDto> {
    const accessContext = await this.getStudentCourseAccessContext(
      courseCycleId,
      userId,
      activeRole,
    );
    if (!accessContext.canViewPreviousCycles) {
      throw new ForbiddenException(
        'No tienes acceso para consultar ciclos anteriores de este curso.',
      );
    }

    const targetCycle =
      await this.courseCycleRepository.findByCourseIdAndCycleCode(
        accessContext.cycle.courseId,
        previousCycleCode,
      );
    if (!targetCycle) {
      throw new NotFoundException('Ciclo anterior no encontrado');
    }
    if (
      new Date(targetCycle.academicCycle.startDate).getTime() >=
      new Date(accessContext.cycle.academicCycle.startDate).getTime()
    ) {
      throw new NotFoundException('Ciclo anterior no encontrado');
    }

    const hasFullHistoricalAccess = this.hasFullEvaluationAccess(activeRole);
    const evaluations = hasFullHistoricalAccess
      ? await this.evaluationRepository.findByCourseCycle(targetCycle.id)
      : await this.evaluationRepository.findAllWithUserAccess(
          targetCycle.id,
          userId,
        );

    const visibleEvaluations = this.filterOutBankEvaluations(
      evaluations as EvaluationWithAccess[],
    );

    return {
      cycleCode: previousCycleCode,
      evaluations: visibleEvaluations.map((evaluation) => {
        const hasAccess = hasFullHistoricalAccess
          ? true
          : this.hasActiveAccess(evaluation);
        return {
          id: evaluation.id,
          evaluationTypeCode: evaluation.evaluationType.code,
          shortName: this.buildEvaluationShortName(evaluation),
          fullName: this.buildEvaluationFullName(evaluation),
          hasAccess,
          label: hasAccess
            ? STUDENT_EVALUATION_LABELS.ARCHIVED
            : STUDENT_EVALUATION_LABELS.LOCKED,
        };
      }),
    };
  }

  async getStudentBankStructure(
    courseCycleId: string,
    userId: string,
    activeRole?: string,
  ): Promise<StudentBankStructureResponseDto> {
    const accessContext = await this.getStudentCourseAccessContext(
      courseCycleId,
      userId,
      activeRole,
    );

    const bankEvaluation =
      await this.findBankEvaluationEntityForCourseCycle(courseCycleId);

    const cacheKey = COURSE_CACHE_KEYS.BANK_STRUCTURE(courseCycleId);
    let items = await this.cacheService.get<
      Array<{
        evaluationTypeId: string;
        evaluationTypeCode: string;
        evaluationTypeName: string;
        entries: StudentBankFolderEntry[];
      }>
    >(cacheKey);

    if (!items) {
      const bankCards = await this.getBankCardsForCourseCycle(courseCycleId);
      const structure =
        await this.courseCycleAllowedEvaluationTypeRepository.findActiveWithTypeByCourseCycleId(
          courseCycleId,
        );
      const { entriesByTypeCode, groupNamesByTypeCode } =
        await this.resolveBankEntriesByTypeCode(
        bankEvaluation.id,
        bankCards,
        structure.map((item) => ({
          evaluationTypeId: String(item.evaluationTypeId),
          evaluationTypeCode: String(item.evaluationType?.code || '')
            .trim()
            .toUpperCase(),
          evaluationTypeName: this.getBankEvaluationTypePluralName(
            String(item.evaluationType?.code || '')
              .trim()
              .toUpperCase(),
            String(item.evaluationType?.name || '').trim(),
          ),
        })),
      );

      items = structure.map((item) => ({
        evaluationTypeId: String(item.evaluationTypeId),
        evaluationTypeCode: item.evaluationType.code,
        evaluationTypeName:
          groupNamesByTypeCode[
            String(item.evaluationType.code || '').trim().toUpperCase()
          ] ||
          this.getBankEvaluationTypePluralName(
            item.evaluationType.code,
            item.evaluationType.name,
          ),
        entries: entriesByTypeCode[item.evaluationType.code] || [],
      }));

      await this.cacheService.set(
        cacheKey,
        items,
        this.BANK_STRUCTURE_CACHE_TTL,
      );
    }

    return {
      courseCycleId: accessContext.cycle.id,
      cycleCode: accessContext.cycle.academicCycle.code,
      bankEvaluationId: bankEvaluation.id,
      items,
    };
  }

  private async resolveBankEntriesByTypeCode(
    bankEvaluationId: string,
    cards: BankCardMeta[],
    structure: Array<{
      evaluationTypeId: string;
      evaluationTypeCode: string;
      evaluationTypeName: string;
    }>,
  ): Promise<{
    entriesByTypeCode: Record<string, StudentBankFolderEntry[]>;
    groupNamesByTypeCode: Record<string, string>;
  }> {
    const bankFolderTree = await this.loadBankFolderTree(bankEvaluationId);
    const leafFolders = bankFolderTree.leafFolders.map((item) => ({
      rootName: String(item.root.name || '').trim(),
      folder: item.folder,
    }));

    const entriesByTypeCode: Record<string, StudentBankFolderEntry[]> = {};
    const groupNamesByTypeCode: Record<string, string> = {};
    const entryKeysByTypeCode = new Map<string, Set<string>>();
    const registerEntry = (
      typeCode: string,
      entry: StudentBankFolderEntry,
    ): void => {
      const normalizedTypeCode = String(typeCode || '')
        .trim()
        .toUpperCase();
      const perType = entryKeysByTypeCode.get(normalizedTypeCode) || new Set<string>();
      const key = `${entry.label}::${entry.folderId || ''}`;
      if (perType.has(key)) {
        return;
      }
      if (!entriesByTypeCode[normalizedTypeCode]) {
        entriesByTypeCode[normalizedTypeCode] = [];
      }
      entriesByTypeCode[normalizedTypeCode].push(entry);
      perType.add(key);
      entryKeysByTypeCode.set(normalizedTypeCode, perType);
    };

    for (const card of cards) {
      groupNamesByTypeCode[card.evaluationTypeCode] = card.groupFolderName;
      const folder =
        leafFolders.find(
          (item) =>
            String(item.folder.name || '').trim() === card.leafFolderName &&
            this.normalizeBankFolderName(item.rootName) ===
              this.normalizeBankFolderName(card.groupFolderName),
        )?.folder || null;
      registerEntry(card.evaluationTypeCode, {
        evaluationId: card.evaluationId,
        evaluationTypeCode: card.evaluationTypeCode,
        evaluationTypeName: card.evaluationTypeName,
        evaluationNumber: card.evaluationNumber,
        label: card.leafFolderName,
        folderId: folder?.id || null,
        folderName: folder?.name || null,
      });
    }

    const cardByTypeAndNumber = new Map<string, BankCardMeta>();
    for (const card of cards) {
      cardByTypeAndNumber.set(
        `${card.evaluationTypeCode}:${card.evaluationNumber}`,
        card,
      );
    }

    for (const item of structure) {
      const code = String(item.evaluationTypeCode || '').trim().toUpperCase();
      const matchingLeafFolders = leafFolders.filter((leaf) =>
        this.tryParseBankLeafNumber(String(leaf.folder.name || ''), code) !== null,
      );
      for (const leaf of matchingLeafFolders) {
        if (!groupNamesByTypeCode[code]) {
          groupNamesByTypeCode[code] = String(leaf.rootName || '').trim();
        }
        const evaluationNumber = this.tryParseBankLeafNumber(
          String(leaf.folder.name || ''),
          code,
        );
        if (evaluationNumber === null) {
          continue;
        }
        const matchedCard =
          cardByTypeAndNumber.get(`${code}:${evaluationNumber}`) || null;
        registerEntry(code, {
          evaluationId: matchedCard?.evaluationId || null,
          evaluationTypeCode: code,
          evaluationTypeName: item.evaluationTypeName,
          evaluationNumber,
          label: String(leaf.folder.name || '').trim(),
          folderId: leaf.folder.id || null,
          folderName: leaf.folder.name || null,
        });
      }
    }

    for (const typeCode of Object.keys(entriesByTypeCode)) {
      entriesByTypeCode[typeCode].sort(
        (left, right) => left.evaluationNumber - right.evaluationNumber,
      );
    }

    return { entriesByTypeCode, groupNamesByTypeCode };
  }

  private normalizeBankFolderName(name: string): string {
    return String(name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private async loadBankFolderTree(
    bankEvaluationId: string,
  ): Promise<LoadedBankFolderTree> {
    const activeFolderStatus = await this.getActiveFolderStatus();
    const roots = await this.materialFolderRepository.findRootsByEvaluation(
      bankEvaluationId,
      activeFolderStatus.id,
    );
    const subFolders =
      (await this.materialFolderRepository.findByParentFolderIds(
        roots.map((root) => String(root.id)),
        activeFolderStatus.id,
      )) || [];
    const rootsById = new Map(
      roots.map((root) => [String(root.id), root] as const),
    );

    return {
      roots,
      leafFolders: subFolders
        .map((folder) => {
          const root =
            rootsById.get(String(folder.parentFolderId || '')) || null;
          if (!root) {
            return null;
          }
          return { root, folder };
        })
        .filter(
          (
            item,
          ): item is {
            root: MaterialFolder;
            folder: MaterialFolder;
          } => !!item,
        ),
    };
  }

  private tryParseBankLeafNumber(label: string, evaluationTypeCode: string): number | null {
    const normalizedLabel = String(label || '').trim().toUpperCase();
    const normalizedTypeCode = String(evaluationTypeCode || '')
      .trim()
      .toUpperCase();
    const match = normalizedLabel.match(
      new RegExp(`^${normalizedTypeCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`),
    );
    if (!match) {
      return null;
    }
    const parsed = Number.parseInt(match[1], 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  private async assertCanManageCourseCycleBank(
    courseCycleId: string,
    userId: string,
    activeRole?: string,
  ): Promise<void> {
    if (this.isAdminRole(activeRole)) {
      return;
    }

    if (this.isProfessorRole(activeRole)) {
      await this.assertProfessorCanReadCourseCycle(courseCycleId, userId);
      return;
    }

    throw new ForbiddenException(
      'No tienes permiso para gestionar el banco de enunciados de este curso',
    );
  }

  private async findBankEvaluationEntityForCourseCycle(
    courseCycleId: string,
  ): Promise<Evaluation> {
    const evaluations =
      await this.evaluationRepository.findByCourseCycle(courseCycleId);
    const bankEvaluation =
      evaluations.find(
        (evaluation) =>
          String(evaluation.evaluationType?.code || '')
            .trim()
            .toUpperCase() === EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS &&
          Number(evaluation.number) === 0,
      ) || null;

    if (!bankEvaluation) {
      throw new NotFoundException(
        'No existe la evaluacion tecnica del banco para este curso/ciclo',
      );
    }

    return bankEvaluation;
  }

  private async getBankCardsForCourseCycle(
    courseCycleId: string,
  ): Promise<BankCardMeta[]> {
    const evaluations =
      await this.evaluationRepository.findByCourseCycle(courseCycleId);

    return evaluations
      .filter(
        (evaluation) =>
          String(evaluation.evaluationType?.code || '')
            .trim()
            .toUpperCase() !== EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS,
      )
      .map((evaluation) => ({
        evaluationId: evaluation.id,
        evaluationTypeId: evaluation.evaluationTypeId,
        evaluationTypeCode: String(evaluation.evaluationType?.code || '')
          .trim()
          .toUpperCase(),
        evaluationTypeName: this.getBankEvaluationTypePluralName(
          String(evaluation.evaluationType?.code || '')
            .trim()
            .toUpperCase(),
          String(evaluation.evaluationType?.name || '').trim(),
        ),
        evaluationNumber: Number(evaluation.number),
        groupFolderName: this.getBankEvaluationTypePluralName(
          String(evaluation.evaluationType?.code || '')
            .trim()
            .toUpperCase(),
          String(evaluation.evaluationType?.name || '').trim(),
        ),
        leafFolderName: `${String(evaluation.evaluationType?.code || '')
          .trim()
          .toUpperCase()}${Number(evaluation.number)}`,
      }))
      .sort((left, right) => {
        if (left.evaluationTypeCode !== right.evaluationTypeCode) {
          return left.evaluationTypeCode.localeCompare(
            right.evaluationTypeCode,
          );
        }
        return left.evaluationNumber - right.evaluationNumber;
      });
  }

  private async resolveBankTargetForUpload(
    courseCycleId: string,
    bankEvaluationId: string,
    evaluationTypeCode: string,
    evaluationNumber: number,
  ): Promise<BankCardMeta | null> {
    const normalizedTypeCode = String(evaluationTypeCode || '')
      .trim()
      .toUpperCase();
    if (!normalizedTypeCode || !Number.isInteger(evaluationNumber) || evaluationNumber <= 0) {
      return null;
    }

    const bankCards = await this.getBankCardsForCourseCycle(courseCycleId);
    const directCard =
      bankCards.find(
        (item) =>
          item.evaluationTypeCode === normalizedTypeCode &&
          item.evaluationNumber === evaluationNumber,
      ) || null;
    if (directCard) {
      const existingGroupName = await this.resolveExistingBankGroupName(
        bankEvaluationId,
        normalizedTypeCode,
      );
      return existingGroupName
        ? {
            ...directCard,
            groupFolderName: existingGroupName,
          }
        : directCard;
    }

    const structure =
      await this.courseCycleAllowedEvaluationTypeRepository.findActiveWithTypeByCourseCycleId(
        courseCycleId,
      );
    const matchedType =
      structure.find(
        (item) =>
          String(item.evaluationType?.code || '').trim().toUpperCase() ===
          normalizedTypeCode,
      ) || null;
    if (!matchedType) {
      return null;
    }

    const activeFolderStatus = await this.getActiveFolderStatus();
    const roots = await this.materialFolderRepository.findRootsByEvaluation(
      bankEvaluationId,
      activeFolderStatus.id,
    );
    const targetLeafLabel = `${normalizedTypeCode}${evaluationNumber}`;
    for (const root of roots) {
      const children = await this.materialFolderRepository.findSubFolders(
        root.id,
        activeFolderStatus.id,
      );
      const matchedLeaf =
        children.find(
          (child) =>
            String(child.name || '').trim().toUpperCase() === targetLeafLabel,
        ) || null;
      if (!matchedLeaf) {
        continue;
      }
      return {
        evaluationId: null,
        evaluationTypeId: String(matchedType.evaluationTypeId),
        evaluationTypeCode: normalizedTypeCode,
        evaluationTypeName: this.getBankEvaluationTypePluralName(
          normalizedTypeCode,
          String(matchedType.evaluationType?.name || '').trim(),
        ),
        evaluationNumber,
        groupFolderName: String(root.name || '').trim(),
        leafFolderName: String(matchedLeaf.name || '').trim(),
      };
    }

    return null;
  }

  private async resolveExistingBankGroupName(
    bankEvaluationId: string,
    evaluationTypeCode: string,
  ): Promise<string | null> {
    const bankFolderTree = await this.loadBankFolderTree(bankEvaluationId);
    const matchedLeaf =
      bankFolderTree.leafFolders.find(
        (item) =>
          this.tryParseBankLeafNumber(
            String(item.folder.name || ''),
            evaluationTypeCode,
          ) !== null,
      ) || null;
    return matchedLeaf ? String(matchedLeaf.root.name || '').trim() : null;
  }

  private resolveDesiredBankItems(
    evaluationTypeCode: string,
    requestedItems: string[] | undefined,
    academicItems: string[],
    hasAcademicEvaluations: boolean,
  ): string[] {
    const normalizedRequestedItems = Array.from(
      new Set(
        (requestedItems || [])
          .map((item) => String(item || '').trim().toUpperCase())
          .filter(Boolean),
      ),
    );

    if (hasAcademicEvaluations) {
      const normalizedAcademicItems = academicItems
        .map((item) => String(item || '').trim().toUpperCase())
        .sort((left, right) => left.localeCompare(right, 'es'));
      const requestedComparable = [...normalizedRequestedItems].sort((left, right) =>
        left.localeCompare(right, 'es'),
      );

      if (
        normalizedRequestedItems.length > 0 &&
        JSON.stringify(requestedComparable) !==
          JSON.stringify(normalizedAcademicItems)
      ) {
        throw new ConflictException(
          'No se puede alterar la lista de subcarpetas de un tipo sincronizado con evaluaciones academicas',
        );
      }

      return academicItems
        .map((item) => String(item || '').trim().toUpperCase())
        .filter(Boolean);
    }

    if (normalizedRequestedItems.length === 0) {
      throw new BadRequestException(
        'items es requerido para tipos solo-banco',
      );
    }

    for (const item of normalizedRequestedItems) {
      if (this.tryParseBankLeafNumber(item, evaluationTypeCode) === null) {
        throw new BadRequestException(
          `El item "${item}" no corresponde al tipo ${evaluationTypeCode}`,
        );
      }
    }

    return normalizedRequestedItems;
  }

  private findBankRootForType(
    bankFolderTree: LoadedBankFolderTree,
    evaluationTypeCode: string,
  ): MaterialFolder | null {
    const matchedLeaf =
      bankFolderTree.leafFolders.find(
        (item) =>
          this.tryParseBankLeafNumber(
            String(item.folder.name || ''),
            evaluationTypeCode,
          ) !== null,
      ) || null;

    return matchedLeaf ? matchedLeaf.root : null;
  }

  private async assertNoConflictingBankGroupName(
    bankFolderTree: LoadedBankFolderTree,
    evaluationTypeCode: string,
    groupName: string,
  ): Promise<void> {
    const normalizedTarget = this.normalizeBankFolderName(groupName);
    const conflictingRoot =
      bankFolderTree.roots.find((root) => {
        const rootCode = this.detectBankRootTypeCode(
          bankFolderTree,
          String(root.id),
        );
        if (!rootCode || rootCode === evaluationTypeCode) {
          return false;
        }
        return this.normalizeBankFolderName(String(root.name || '')) === normalizedTarget;
      }) || null;
    if (conflictingRoot) {
      throw new ConflictException(
        'Ya existe otra carpeta del banco con ese nombre',
      );
    }
  }

  private detectBankRootTypeCode(
    bankFolderTree: LoadedBankFolderTree,
    rootId: string,
  ): string | null {
    const matchedLeaf =
      bankFolderTree.leafFolders.find(
        (item) => String(item.root.id) === String(rootId),
      ) || null;
    if (!matchedLeaf) {
      return null;
    }
    const label = String(matchedLeaf.folder.name || '').trim().toUpperCase();
    const match = label.match(/^([A-Z0-9_-]+?)(\d+)$/);
    return match ? match[1] : null;
  }

  private async assertFoldersHaveNoMaterials(
    folders: MaterialFolder[],
  ): Promise<void> {
    const folderIds = folders.map((folder) => String(folder.id));
    const materials = await this.materialRepository.findByFolderIds(folderIds);
    if (materials.length > 0) {
      throw new ConflictException(
        'No se puede eliminar o reemplazar una carpeta del banco que ya contiene archivos',
      );
    }
  }

  private async getFolderStatusOrFail(code: string) {
    const status = await this.materialCatalogRepository.findFolderStatusByCode(
      code,
    );
    if (!status) {
      throw new InternalServerErrorException(
        `Error de configuracion: Estado ${code} de carpeta faltante`,
      );
    }
    return status;
  }

  private async invalidateBankCaches(
    courseCycleId: string,
    bankEvaluationId: string,
    folderIds: string[],
  ): Promise<void> {
    const keys = [
      COURSE_CACHE_KEYS.BANK_STRUCTURE(courseCycleId),
      MATERIAL_CACHE_KEYS.ROOTS(bankEvaluationId),
      ...folderIds.map((folderId) => MATERIAL_CACHE_KEYS.CONTENTS(folderId)),
    ];
    await this.cacheService.delMany(Array.from(new Set(keys)));
  }

  private async syncBankFolderMutationsToDrive(input: {
    cycle: CourseCycle;
    currentGroupName: string;
    nextGroupName: string;
    removedLeafNames: string[];
    createdLeafNames: string[];
    hasGroupRename: boolean;
  }): Promise<void> {
    const {
      cycle,
      currentGroupName,
      nextGroupName,
      removedLeafNames,
      createdLeafNames,
      hasGroupRename,
    } = input;
    try {
      for (const leafName of removedLeafNames) {
        await this.courseCycleDriveProvisioningService.deleteBankFolder({
          courseCycleId: String(cycle.id),
          courseCode: String(cycle.course.code || ''),
          cycleCode: String(cycle.academicCycle.code || ''),
          groupName: currentGroupName,
          leafFolderName: leafName,
        });
      }

      if (hasGroupRename) {
        await this.courseCycleDriveProvisioningService.renameBankGroupFolder({
          courseCycleId: String(cycle.id),
          courseCode: String(cycle.course.code || ''),
          cycleCode: String(cycle.academicCycle.code || ''),
          currentGroupName,
          nextGroupName,
        });
      }

      for (const leafName of createdLeafNames) {
        const matchedTypeCode = String(leafName || '')
          .trim()
          .toUpperCase()
          .replace(/\d+$/, '');
        const parsedNumber = this.tryParseBankLeafNumber(
          leafName,
          matchedTypeCode,
        );
        if (parsedNumber === null) {
          continue;
        }
        await this.courseCycleDriveProvisioningService.ensureBankLeafFolder({
          courseCycleId: String(cycle.id),
          courseCode: String(cycle.course.code || ''),
          cycleCode: String(cycle.academicCycle.code || ''),
          bankCards: [],
          bankFolders: [
            {
              groupName: nextGroupName,
              items: [leafName],
            },
          ],
          evaluationTypeCode: matchedTypeCode,
          evaluationNumber: parsedNumber,
          groupName: nextGroupName,
          leafFolderName: leafName,
        });
      }
    } catch (error) {
      this.logger.error(
        `No se pudo sincronizar completamente la mutacion del banco en Drive para course_cycle ${cycle.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async syncDeletedBankFolderToDrive(input: {
    cycle: CourseCycle;
    groupName: string;
  }): Promise<void> {
    try {
      await this.courseCycleDriveProvisioningService.deleteBankFolder({
        courseCycleId: String(input.cycle.id),
        courseCode: String(input.cycle.course.code || ''),
        cycleCode: String(input.cycle.academicCycle.code || ''),
        groupName: input.groupName,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo sincronizar la eliminacion del banco en Drive para course_cycle ${input.cycle.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async ensureBankMaterialFolders(
    bankEvaluationId: string,
    card: BankCardMeta,
    createdById: string,
  ): Promise<MaterialFolder> {
    const activeFolderStatus = await this.getActiveFolderStatus();
    const roots = await this.materialFolderRepository.findRootsByEvaluation(
      bankEvaluationId,
      activeFolderStatus.id,
    );
    let rootFolder =
      roots.find((item) => item.name === card.groupFolderName) || null;
    const now = new Date();

    if (!rootFolder) {
      rootFolder = await this.materialFolderRepository.create({
        evaluationId: bankEvaluationId,
        parentFolderId: null,
        folderStatusId: activeFolderStatus.id,
        name: card.groupFolderName,
        visibleFrom: null,
        visibleUntil: null,
        createdById,
        createdAt: now,
        updatedAt: now,
      });
    }

    const children = await this.materialFolderRepository.findSubFolders(
      rootFolder.id,
      activeFolderStatus.id,
    );
    const existingLeaf =
      children.find((item) => item.name === card.leafFolderName) || null;
    if (existingLeaf) {
      return existingLeaf;
    }

    return await this.materialFolderRepository.create({
      evaluationId: bankEvaluationId,
      parentFolderId: rootFolder.id,
      folderStatusId: activeFolderStatus.id,
      name: card.leafFolderName,
      visibleFrom: null,
      visibleUntil: null,
      createdById,
      createdAt: now,
      updatedAt: now,
    });
  }

  private async getActiveFolderStatus() {
    return await this.getFolderStatusOrFail(FOLDER_STATUS_CODES.ACTIVE);
  }

  private async getActiveMaterialStatus() {
    const status =
      await this.materialCatalogRepository.findMaterialStatusByCode(
        MATERIAL_STATUS_CODES.ACTIVE,
      );
    if (!status) {
      throw new InternalServerErrorException(
        `Error de configuracion: Estado ${MATERIAL_STATUS_CODES.ACTIVE} de material faltante`,
      );
    }
    return status;
  }

  private buildStorageObjectName(originalName: string): string {
    const normalizedOriginalName = String(originalName || '')
      .replace(/[\r\n\t]/g, ' ')
      .trim();
    if (!normalizedOriginalName) {
      return randomUUID();
    }

    if (this.storageService.isGoogleDriveStorageEnabled()) {
      return normalizedOriginalName;
    }

    const extension = path.extname(normalizedOriginalName).trim();
    return extension ? `${randomUUID()}${extension}` : randomUUID();
  }

  private normalizeUploadedOriginalName(originalName: string): string {
    const normalized = String(originalName || '').trim();
    if (!normalized || !/[ÃÂâ]/.test(normalized)) {
      return normalized;
    }

    try {
      const candidate = Buffer.from(normalized, 'latin1')
        .toString('utf8')
        .trim();
      if (!candidate || candidate.includes('\uFFFD')) {
        return normalized;
      }
      const originalMojibakeCount = (normalized.match(/[ÃÂâ]/g) || []).length;
      const candidateMojibakeCount = (candidate.match(/[ÃÂâ]/g) || []).length;
      return candidateMojibakeCount < originalMojibakeCount
        ? candidate
        : normalized;
    } catch {
      return normalized;
    }
  }

  private async rollbackFile(resource: {
    storageProvider: (typeof STORAGE_PROVIDER_CODES)[keyof typeof STORAGE_PROVIDER_CODES];
    storageKey: string;
    storageUrl: string | null;
  }) {
    await this.storageService.deleteFile(
      resource.storageKey,
      resource.storageProvider,
      resource.storageUrl,
    );
  }

  async uploadBankDocument(
    user: User,
    courseCycleId: string,
    dto: UploadBankDocumentDto,
    file: Express.Multer.File,
    activeRole?: string,
  ): Promise<UploadBankDocumentResponseDto> {
    if (!file) {
      throw new BadRequestException('Archivo requerido');
    }
    await this.assertCanManageCourseCycleBank(
      courseCycleId,
      user.id,
      activeRole,
    );

    const allowedMimeTypes: readonly string[] =
      technicalSettings.uploads.materials.allowedMimeTypes;
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Tipo de archivo no permitido. Solo se aceptan documentos educativos (PDF, imagenes, Office).',
      );
    }

    if (file.mimetype === 'application/pdf') {
      const pdfMagic = file.buffer.subarray(0, 4).toString('hex');
      if (pdfMagic !== technicalSettings.uploads.materials.pdfMagicHeaderHex) {
        throw new BadRequestException('El archivo no es un PDF valido');
      }
    }

    const cycle = await this.courseCycleRepository.findFullById(courseCycleId);
    if (!cycle) {
      throw new NotFoundException('Ciclo del curso no encontrado');
    }

    const bankEvaluation =
      await this.findBankEvaluationEntityForCourseCycle(courseCycleId);
    const normalizedTypeCode = String(dto.evaluationTypeCode || '')
      .trim()
      .toUpperCase();
    const evaluationNumber = Number.parseInt(dto.evaluationNumber, 10);
    const targetCard = await this.resolveBankTargetForUpload(
      courseCycleId,
      bankEvaluation.id,
      normalizedTypeCode,
      evaluationNumber,
    );
    if (!targetCard) {
      throw new NotFoundException(
        'No existe una tarjeta del banco para el tipo y numero enviados',
      );
    }

    const normalizedOriginalName = this.normalizeUploadedOriginalName(
      file.originalname,
    );
    const now = new Date();
    const targetFolder = await this.ensureBankMaterialFolders(
      bankEvaluation.id,
      targetCard,
      user.id,
    );
    const hash = await this.storageService.calculateHash(file.buffer);
    const duplicatedResource =
      await this.fileResourceRepository.findByHashAndSizeWithinEvaluation(
        hash,
        String(file.size),
        bankEvaluation.id,
      );
    if (duplicatedResource) {
      throw new ConflictException(
        'Ya existe un archivo identico en el banco de este curso',
      );
    }

    const driveTarget =
      await this.courseCycleDriveProvisioningService.ensureBankLeafFolder({
        courseCycleId,
        courseCode: cycle.course.code,
        cycleCode: cycle.academicCycle.code,
        bankCards: targetCard.evaluationId
          ? [
              {
                evaluationTypeCode: targetCard.evaluationTypeCode,
                number: targetCard.evaluationNumber,
              },
            ]
          : [],
        bankFolders: [
          {
            groupName: targetCard.groupFolderName,
            items: [targetCard.leafFolderName],
          },
        ],
        evaluationTypeCode: targetCard.evaluationTypeCode,
        evaluationNumber: targetCard.evaluationNumber,
        groupName: targetCard.groupFolderName,
        leafFolderName: targetCard.leafFolderName,
      });

    let savedResource: {
      storageProvider: (typeof STORAGE_PROVIDER_CODES)[keyof typeof STORAGE_PROVIDER_CODES];
      storageKey: string;
      storageUrl: string | null;
    } | null = null;
    let isNewFile = false;
    const activeMaterialStatus = await this.getActiveMaterialStatus();

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const uniqueName = this.buildStorageObjectName(normalizedOriginalName);
        savedResource = await this.storageService.saveFile(
          uniqueName,
          file.buffer,
          file.mimetype,
          { targetDriveFolderId: driveTarget.leafFolderId },
        );
        isNewFile = true;

        const resourceEntity = manager.create(FileResource, {
          checksumHash: hash,
          originalName: normalizedOriginalName,
          mimeType: file.mimetype,
          sizeBytes: String(file.size),
          storageProvider: savedResource.storageProvider,
          storageKey: savedResource.storageKey,
          storageUrl: savedResource.storageUrl,
          createdAt: now,
        });

        let finalResource: FileResource;
        try {
          finalResource = await manager.save(resourceEntity);
        } catch (error) {
          const dbErrno = getErrnoFromDbError(error);
          if (dbErrno !== MySqlErrorCode.DUPLICATE_ENTRY) {
            throw error;
          }

          const dedupResource =
            await this.fileResourceRepository.findByHashAndSizeWithinEvaluation(
              hash,
              String(file.size),
              bankEvaluation.id,
            );
          if (!dedupResource) {
            throw error;
          }

          if (savedResource) {
            await this.rollbackFile(savedResource);
            savedResource = null;
            isNewFile = false;
          }

          throw new ConflictException(
            'Ya existe un archivo identico en el banco de este curso',
          );
        }

        const materialEntity = manager.create(Material, {
          materialFolderId: targetFolder.id,
          classEventId: null,
          fileResourceId: finalResource.id,
          fileVersionId: null,
          materialStatusId: activeMaterialStatus.id,
          displayName: dto.displayName,
          visibleFrom: null,
          visibleUntil: null,
          createdById: String(user.id),
          createdAt: now,
          updatedAt: now,
        });
        const savedMaterial = await manager.save(materialEntity);
        const versionEntity = manager.create(MaterialVersion, {
          materialId: savedMaterial.id,
          fileResourceId: finalResource.id,
          versionNumber: 1,
          restoredFromMaterialVersionId: null,
          createdById: String(user.id),
          createdAt: now,
        });
        const savedVersion = await manager.save(versionEntity);
        savedMaterial.fileVersionId = savedVersion.id;
        const updatedMaterial = await manager.save(savedMaterial);

        return {
          courseCycleId,
          bankEvaluationId: bankEvaluation.id,
          evaluationId: targetCard.evaluationId,
          evaluationTypeId: targetCard.evaluationTypeId,
          evaluationTypeCode: targetCard.evaluationTypeCode,
          evaluationTypeName: targetCard.evaluationTypeName,
          evaluationNumber: targetCard.evaluationNumber,
          folderId: targetFolder.id,
          folderName: targetFolder.name,
          materialId: updatedMaterial.id,
          fileResourceId: finalResource.id,
          currentVersionId: savedVersion.id,
          displayName: updatedMaterial.displayName,
          originalName: finalResource.originalName,
          mimeType: finalResource.mimeType,
          sizeBytes: finalResource.sizeBytes,
          storageProvider: finalResource.storageProvider,
          driveFileId:
            finalResource.storageProvider === STORAGE_PROVIDER_CODES.GDRIVE
              ? finalResource.storageKey
              : null,
          downloadPath: `/materials/${encodeURIComponent(updatedMaterial.id)}/download`,
          authorizedViewPath: `/materials/${encodeURIComponent(updatedMaterial.id)}/authorized-link?mode=view`,
          lastModifiedAt:
            updatedMaterial.updatedAt ?? updatedMaterial.createdAt,
        };
      });

      return result;
    } catch (error) {
      if (isNewFile && savedResource) {
        await this.rollbackFile(savedResource);
      }
      throw error;
    }
  }

  async updateBankFolder(
    user: User,
    courseCycleId: string,
    evaluationTypeCode: string,
    dto: UpdateBankFolderDto,
    activeRole?: string,
  ): Promise<UpdateBankFolderResponseDto> {
    await this.assertCanManageCourseCycleBank(
      courseCycleId,
      user.id,
      activeRole,
    );

    const cycle = await this.courseCycleRepository.findFullById(courseCycleId);
    if (!cycle) {
      throw new NotFoundException('Ciclo del curso no encontrado');
    }

    const bankEvaluation =
      await this.findBankEvaluationEntityForCourseCycle(courseCycleId);
    const normalizedTypeCode = String(evaluationTypeCode || '')
      .trim()
      .toUpperCase();
    const normalizedGroupName = String(dto.groupName || '').trim();
    if (!normalizedGroupName) {
      throw new BadRequestException('groupName es requerido');
    }

    const structure =
      await this.courseCycleAllowedEvaluationTypeRepository.findActiveWithTypeByCourseCycleId(
        courseCycleId,
      );
    const matchedType =
      structure.find(
        (item) =>
          String(item.evaluationType?.code || '').trim().toUpperCase() ===
          normalizedTypeCode,
      ) || null;
    if (!matchedType) {
      throw new NotFoundException(
        'El tipo solicitado no existe en el banco de este curso/ciclo',
      );
    }

    const bankCards = await this.getBankCardsForCourseCycle(courseCycleId);
    const cardsForType = bankCards.filter(
      (item) => item.evaluationTypeCode === normalizedTypeCode,
    );
    const hasAcademicEvaluations = cardsForType.length > 0;
    const desiredItems = this.resolveDesiredBankItems(
      normalizedTypeCode,
      dto.items,
      cardsForType.map((item) => item.leafFolderName),
      hasAcademicEvaluations,
    );

    const bankFolderTree = await this.loadBankFolderTree(bankEvaluation.id);
    const matchedRoot = this.findBankRootForType(
      bankFolderTree,
      normalizedTypeCode,
    );
    const currentGroupName =
      String(matchedRoot?.name || '').trim() ||
      this.getBankEvaluationTypePluralName(
        normalizedTypeCode,
        String(matchedType.evaluationType?.name || '').trim(),
      );

    await this.assertNoConflictingBankGroupName(
      bankFolderTree,
      normalizedTypeCode,
      normalizedGroupName,
    );

    const currentLeafFolders = matchedRoot
      ? bankFolderTree.leafFolders
          .filter((item) => String(item.root.id) === String(matchedRoot.id))
          .map((item) => item.folder)
      : [];

    const desiredItemsSet = new Set(
      desiredItems.map((item) => item.trim().toUpperCase()),
    );
    const currentLeafByName = new Map(
      currentLeafFolders.map((folder) => [
        String(folder.name || '').trim().toUpperCase(),
        folder,
      ]),
    );
    const missingItems = desiredItems.filter(
      (item) => !currentLeafByName.has(item.trim().toUpperCase()),
    );
    const removedLeafFolders = hasAcademicEvaluations
      ? []
      : currentLeafFolders.filter(
          (folder) =>
            !desiredItemsSet.has(String(folder.name || '').trim().toUpperCase()),
        );

    if (removedLeafFolders.length > 0) {
      await this.assertFoldersHaveNoMaterials(removedLeafFolders);
    }

    const activeFolderStatus = await this.getActiveFolderStatus();
    const archivedFolderStatus = await this.getFolderStatusOrFail(
      FOLDER_STATUS_CODES.ARCHIVED,
    );
    const now = new Date();
    let persistedRoot: MaterialFolder | null = matchedRoot;

    await this.dataSource.transaction(async (manager) => {
      if (!persistedRoot) {
        persistedRoot = await this.materialFolderRepository.create({
          evaluationId: bankEvaluation.id,
          parentFolderId: null,
          folderStatusId: activeFolderStatus.id,
          name: normalizedGroupName,
          visibleFrom: null,
          visibleUntil: null,
          createdById: String(user.id),
          createdAt: now,
          updatedAt: now,
        }, manager);
      } else if (String(persistedRoot.name || '').trim() !== normalizedGroupName) {
        persistedRoot.name = normalizedGroupName;
        persistedRoot.updatedAt = now;
        persistedRoot = await this.materialFolderRepository.save(
          persistedRoot,
          manager,
        );
      }

      for (const folder of removedLeafFolders) {
        folder.folderStatusId = archivedFolderStatus.id;
        folder.updatedAt = now;
        await this.materialFolderRepository.save(folder, manager);
      }

      for (const itemName of missingItems) {
        await this.materialFolderRepository.create({
          evaluationId: bankEvaluation.id,
          parentFolderId: persistedRoot!.id,
          folderStatusId: activeFolderStatus.id,
          name: itemName,
          visibleFrom: null,
          visibleUntil: null,
          createdById: String(user.id),
          createdAt: now,
          updatedAt: now,
        }, manager);
      }
    });

    await this.invalidateBankCaches(
      courseCycleId,
      bankEvaluation.id,
      persistedRoot ? [persistedRoot.id] : [],
    );

    await this.syncBankFolderMutationsToDrive({
      cycle,
      currentGroupName,
      nextGroupName: normalizedGroupName,
      removedLeafNames: removedLeafFolders.map((folder) =>
        String(folder.name || '').trim(),
      ),
      createdLeafNames: missingItems,
      hasGroupRename:
        currentGroupName.localeCompare(normalizedGroupName, 'es', {
          sensitivity: 'base',
        }) !== 0,
    });

    return {
      courseCycleId,
      bankEvaluationId: bankEvaluation.id,
      evaluationTypeId: String(matchedType.evaluationTypeId),
      evaluationTypeCode: normalizedTypeCode,
      evaluationTypeName: normalizedGroupName,
      groupName: normalizedGroupName,
      items: desiredItems,
      hasAcademicEvaluations,
    };
  }

  async deleteBankFolder(
    user: User,
    courseCycleId: string,
    evaluationTypeCode: string,
    activeRole?: string,
  ): Promise<void> {
    await this.assertCanManageCourseCycleBank(
      courseCycleId,
      user.id,
      activeRole,
    );

    const cycle = await this.courseCycleRepository.findFullById(courseCycleId);
    if (!cycle) {
      throw new NotFoundException('Ciclo del curso no encontrado');
    }

    const bankEvaluation =
      await this.findBankEvaluationEntityForCourseCycle(courseCycleId);
    const normalizedTypeCode = String(evaluationTypeCode || '')
      .trim()
      .toUpperCase();
    const structure =
      await this.courseCycleAllowedEvaluationTypeRepository.findActiveWithTypeByCourseCycleId(
        courseCycleId,
      );
    const matchedType =
      structure.find(
        (item) =>
          String(item.evaluationType?.code || '').trim().toUpperCase() ===
          normalizedTypeCode,
      ) || null;
    if (!matchedType) {
      throw new NotFoundException(
        'El tipo solicitado no existe en el banco de este curso/ciclo',
      );
    }

    const bankCards = await this.getBankCardsForCourseCycle(courseCycleId);
    if (bankCards.some((item) => item.evaluationTypeCode === normalizedTypeCode)) {
      throw new ConflictException(
        'No se puede eliminar una carpeta del banco sincronizada con evaluaciones academicas. Modifica primero la estructura de evaluaciones.',
      );
    }

    const bankFolderTree = await this.loadBankFolderTree(bankEvaluation.id);
    const matchedRoot = this.findBankRootForType(
      bankFolderTree,
      normalizedTypeCode,
    );
    const currentGroupName =
      String(matchedRoot?.name || '').trim() ||
      this.getBankEvaluationTypePluralName(
        normalizedTypeCode,
        String(matchedType.evaluationType?.name || '').trim(),
      );
    const currentLeafFolders = matchedRoot
      ? bankFolderTree.leafFolders
          .filter((item) => String(item.root.id) === String(matchedRoot.id))
          .map((item) => item.folder)
      : [];

    if (currentLeafFolders.length > 0) {
      await this.assertFoldersHaveNoMaterials(currentLeafFolders);
    }

    const archivedFolderStatus = await this.getFolderStatusOrFail(
      FOLDER_STATUS_CODES.ARCHIVED,
    );
    const now = new Date();

    await this.dataSource.transaction(async (manager) => {
      for (const folder of currentLeafFolders) {
        folder.folderStatusId = archivedFolderStatus.id;
        folder.updatedAt = now;
        await this.materialFolderRepository.save(folder, manager);
      }
      if (matchedRoot) {
        matchedRoot.folderStatusId = archivedFolderStatus.id;
        matchedRoot.updatedAt = now;
        await this.materialFolderRepository.save(matchedRoot, manager);
      }

      const remainingEvaluationTypeIds = structure
        .filter(
          (item) =>
            String(item.evaluationType?.code || '').trim().toUpperCase() !==
            normalizedTypeCode,
        )
        .map((item) => String(item.evaluationTypeId));

      await this.courseCycleAllowedEvaluationTypeRepository.replaceAllowedTypes(
        courseCycleId,
        remainingEvaluationTypeIds,
        manager,
      );
    });

    await this.invalidateBankCaches(
      courseCycleId,
      bankEvaluation.id,
      matchedRoot
        ? [matchedRoot.id, ...currentLeafFolders.map((item) => String(item.id))]
        : [],
    );

    await this.syncDeletedBankFolderToDrive({
      cycle,
      groupName: currentGroupName,
    });
  }

  private async getStudentCourseAccessContext(
    courseCycleId: string,
    userId: string,
    activeRole?: string,
  ): Promise<StudentCourseAccessContext> {
    const cycle = await this.courseCycleRepository.findFullById(courseCycleId);
    if (!cycle) {
      throw new NotFoundException('Ciclo del curso no encontrado');
    }

    if (this.isProfessorRole(activeRole)) {
      await this.assertProfessorCanReadCourseCycle(courseCycleId, userId);
      return {
        cycle,
        enrollmentTypeCode: ENROLLMENT_TYPE_CODES.FULL,
        canViewPreviousCycles: true,
      };
    }
    if (this.isAdminRole(activeRole)) {
      return {
        cycle,
        enrollmentTypeCode: ENROLLMENT_TYPE_CODES.FULL,
        canViewPreviousCycles: true,
      };
    }

    const enrollmentTypeCode = await this.getActiveEnrollmentTypeCode(
      userId,
      courseCycleId,
    );
    if (!enrollmentTypeCode) {
      throw new ForbiddenException('No tienes matrícula activa en este curso.');
    }

    const canViewPreviousCycles =
      enrollmentTypeCode === ENROLLMENT_TYPE_CODES.FULL
        ? true
        : await this.courseCycleRepository.hasAccessiblePreviousByCourseIdAndUserId(
            cycle.courseId,
            cycle.academicCycle.startDate,
            userId,
          );

    return {
      cycle,
      enrollmentTypeCode,
      canViewPreviousCycles,
    };
  }

  private async getActiveEnrollmentTypeCode(
    userId: string,
    courseCycleId: string,
  ): Promise<string | null> {
    const rows = await this.dataSource.query<
      Array<{ typeCode: string | null }>
    >(
      `SELECT et.code as typeCode
       FROM enrollment e
       INNER JOIN enrollment_type et
         ON et.id = e.enrollment_type_id
       WHERE e.user_id = ?
         AND e.course_cycle_id = ?
         AND e.cancelled_at IS NULL
       LIMIT 1`,
      [userId, courseCycleId],
    );

    return rows[0]?.typeCode ?? null;
  }

  private async assertCanAccessCourseCycleIntroVideo(
    userId: string,
    courseCycleId: string,
    requesterActiveRole: string | undefined,
  ): Promise<void> {
    if (this.isAdminRole(requesterActiveRole)) {
      return;
    }

    if (this.isProfessorRole(requesterActiveRole)) {
      await this.assertProfessorCanReadCourseCycle(courseCycleId, userId);
      return;
    }

    const enrollmentTypeCode = await this.getActiveEnrollmentTypeCode(
      userId,
      courseCycleId,
    );
    if (!enrollmentTypeCode) {
      throw new ForbiddenException('No tienes matricula activa en este curso.');
    }
  }

  private hasActiveAccess(evaluation: EvaluationWithAccess): boolean {
    const access =
      evaluation.enrollmentEvaluations && evaluation.enrollmentEvaluations[0]
        ? evaluation.enrollmentEvaluations[0]
        : null;
    return !!access && access.isActive;
  }

  private normalizeRole(activeRole?: string): string {
    return String(activeRole || '')
      .trim()
      .toUpperCase();
  }

  private isProfessorRole(activeRole?: string): boolean {
    return this.normalizeRole(activeRole) === ROLE_CODES.PROFESSOR;
  }

  private isAdminRole(activeRole?: string): boolean {
    return ADMIN_ROLE_CODES.includes(this.normalizeRole(activeRole));
  }

  private filterOutBankEvaluations(
    evaluations: EvaluationWithAccess[],
  ): EvaluationWithAccess[] {
    return (evaluations || []).filter(
      (evaluation) =>
        String(evaluation.evaluationType?.code || '')
          .trim()
          .toUpperCase() !== EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS,
    );
  }

  private buildEvaluationShortName(evaluation: Evaluation): string {
    return `${evaluation.evaluationType.code}${evaluation.number}`;
  }

  private buildEvaluationFullName(evaluation: Evaluation): string {
    const typeName = this.toTitleCase(evaluation.evaluationType.name);
    return `${typeName} ${evaluation.number}`;
  }

  private mapProfessorDashboardAssignment(
    assignment: CourseCycleProfessor,
  ): MyEnrollmentsResponseDto {
    const academicCycle = assignment.courseCycle.academicCycle;
    const cycleStartDate = toBusinessDayStartUtc(academicCycle.startDate);
    const cycleEndDate = toBusinessDayEndUtc(academicCycle.endDate);
    const now = new Date();

    return {
      id: assignment.courseCycle.id,
      enrolledAt: assignment.assignedAt,
      courseCycle: {
        id: assignment.courseCycle.id,
        course: {
          id: assignment.courseCycle.course.id,
          code: assignment.courseCycle.course.code,
          name: assignment.courseCycle.course.name,
          courseType: {
            code: assignment.courseCycle.course.courseType.code,
            name: assignment.courseCycle.course.courseType.name,
          },
          cycleLevel: {
            name: formatCycleLevelName(
              assignment.courseCycle.course.cycleLevel.levelNumber,
            ),
          },
        },
        academicCycle: {
          id: academicCycle.id,
          code: academicCycle.code,
          startDate: academicCycle.startDate,
          endDate: academicCycle.endDate,
          isCurrent: now >= cycleStartDate && now <= cycleEndDate,
        },
        professors: (assignment.courseCycle.professors || []).map((link) => ({
          id: link.professor.id,
          firstName: link.professor.firstName,
          lastName1: link.professor.lastName1 || '',
          lastName2: link.professor.lastName2 || '',
          profilePhotoUrl: link.professor.profilePhotoUrl || null,
        })),
      },
    };
  }

  private toTitleCase(value: string): string {
    return value
      .toLocaleLowerCase('es-PE')
      .split(/\s+/)
      .filter((word) => word.length > 0)
      .map((word) => word.charAt(0).toLocaleUpperCase('es-PE') + word.slice(1))
      .join(' ');
  }

  private getBankEvaluationTypePluralName(
    evaluationTypeCode: string,
    evaluationTypeName: string,
  ): string {
    const code = String(evaluationTypeCode || '')
      .trim()
      .toUpperCase();
    switch (code) {
      case 'PC':
        return 'Practicas Calificadas';
      case 'EX':
        return 'Examenes';
      case 'PD':
        return 'Practicas Dirigidas';
      case 'LAB':
        return 'Laboratorios';
      case 'TUTORING':
        return 'Tutorias Especializadas';
      default: {
        const normalizedName = String(evaluationTypeName || '').trim();
        if (!normalizedName) {
          return normalizedName;
        }
        if (/[sS]$/.test(normalizedName)) {
          return normalizedName;
        }
        return `${normalizedName}s`;
      }
    }
  }

  private async assertUserIsActiveProfessor(userId: string): Promise<void> {
    const rows = await this.dataSource.query<
      Array<{ isActiveProfessor: number | string }>
    >(
      `SELECT EXISTS(
        SELECT 1
        FROM user u
        INNER JOIN user_role ur
          ON ur.user_id = u.id
        INNER JOIN role r
          ON r.id = ur.role_id
        WHERE u.id = ?
          AND u.is_active = 1
          AND r.code = ?
        LIMIT 1
      ) AS isActiveProfessor`,
      [userId, ROLE_CODES.PROFESSOR],
    );

    if (Number(rows[0]?.isActiveProfessor) !== 1) {
      throw new BadRequestException(
        'El usuario seleccionado no es un profesor activo.',
      );
    }
  }
}

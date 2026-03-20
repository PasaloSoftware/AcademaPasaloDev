import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassEvent } from '@modules/events/domain/class-event.entity';
import { ClassEventProfessor } from '@modules/events/domain/class-event-professor.entity';
import { Enrollment } from '@modules/enrollments/domain/enrollment.entity';
import { EnrollmentStatus } from '@modules/enrollments/domain/enrollment-status.entity';
import { Material } from '@modules/materials/domain/material.entity';
import { CourseCycleProfessor } from '@modules/courses/domain/course-cycle-professor.entity';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { ENROLLMENT_STATUS_CODES } from '@modules/enrollments/domain/enrollment.constants';
import { NOTIFICATION_CACHE_KEYS } from '@modules/notifications/domain/notification.constants';
import { technicalSettings } from '@config/technical-settings';
import {
  ClassEventContext,
  MaterialContext,
} from '@modules/notifications/interfaces';
import {
  NotificationIntegrityError,
  NotificationTargetNotFoundError,
} from '@modules/notifications/domain/notification.errors';

@Injectable()
export class NotificationRecipientsService {
  private readonly logger = new Logger(NotificationRecipientsService.name);

  constructor(
    @InjectRepository(ClassEvent)
    private readonly classEventRepo: Repository<ClassEvent>,

    @InjectRepository(ClassEventProfessor)
    private readonly classEventProfessorRepo: Repository<ClassEventProfessor>,

    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,

    @InjectRepository(EnrollmentStatus)
    private readonly enrollmentStatusRepo: Repository<EnrollmentStatus>,

    @InjectRepository(Material)
    private readonly materialRepo: Repository<Material>,

    @InjectRepository(CourseCycleProfessor)
    private readonly courseCycleProfessorRepo: Repository<CourseCycleProfessor>,

    private readonly cacheService: RedisCacheService,
  ) {}

  async resolveClassEventContext(
    classEventId: string,
  ): Promise<ClassEventContext> {
    const row = await this.classEventRepo
      .createQueryBuilder('ce')
      .select('ce.id', 'classEventId')
      .addSelect('ev.id', 'evaluationId')
      .addSelect('ce.session_number', 'sessionNumber')
      .addSelect('ce.title', 'classTitle')
      .addSelect('ce.start_datetime', 'startDatetime')
      .addSelect('ev.course_cycle_id', 'courseCycleId')
      .addSelect('et.code', 'evaluationTypeCode')
      .addSelect('ev.number', 'evaluationNumber')
      .addSelect('course.name', 'courseName')
      .innerJoin('ce.evaluation', 'ev')
      .innerJoin('ev.evaluationType', 'et')
      .innerJoin('ev.courseCycle', 'cc')
      .innerJoin('cc.course', 'course')
      .where('ce.id = :classEventId', { classEventId })
      .getRawOne<{
        classEventId: string;
        evaluationId: string;
        sessionNumber: number;
        classTitle: string;
        startDatetime: Date;
        courseCycleId: string;
        evaluationTypeCode: string;
        evaluationNumber: number;
        courseName: string;
      }>();

    if (!row) {
      throw new NotificationTargetNotFoundError(
        `No se encontro el class_event ${classEventId} al resolver destinatarios`,
      );
    }

    const activeStatusId = await this.resolveActiveEnrollmentStatusId();

    const [classProfs, activeStudents] = await Promise.all([
      this.classEventProfessorRepo
        .createQueryBuilder('cep')
        .select('cep.professor_user_id', 'userId')
        .innerJoin('cep.professor', 'professor')
        .where('cep.class_event_id = :classEventId', { classEventId })
        .andWhere('cep.revoked_at IS NULL')
        .andWhere('professor.is_active = :isActive', { isActive: true })
        .getRawMany<{ userId: string }>(),

      this.enrollmentRepo
        .createQueryBuilder('en')
        .select('en.user_id', 'userId')
        .innerJoin('en.user', 'student')
        .where('en.course_cycle_id = :courseCycleId', {
          courseCycleId: row.courseCycleId,
        })
        .andWhere('en.enrollment_status_id = :statusId', {
          statusId: activeStatusId,
        })
        .andWhere('en.cancelled_at IS NULL')
        .andWhere('student.is_active = :isActive', { isActive: true })
        .getRawMany<{ userId: string }>(),
    ]);

    return {
      classEventId,
      evaluationId: row.evaluationId,
      sessionNumber: Number(row.sessionNumber),
      classTitle: row.classTitle,
      startDatetime: row.startDatetime,
      courseCycleId: row.courseCycleId,
      evaluationLabel: `${row.evaluationTypeCode}${row.evaluationNumber}`,
      courseName: row.courseName,
      recipientUserIds: this.mergeUniqueUserIds(classProfs, activeStudents),
    };
  }

  async resolveMaterialContext(
    materialId: string,
    folderId: string,
  ): Promise<MaterialContext> {
    const row = await this.materialRepo
      .createQueryBuilder('m')
      .select('m.id', 'materialId')
      .addSelect('m.display_name', 'materialDisplayName')
      .addSelect('m.material_folder_id', 'folderId')
      .addSelect('m.class_event_id', 'classEventId')
      .addSelect('ev.id', 'evaluationId')
      .addSelect('ev.course_cycle_id', 'courseCycleId')
      .addSelect('et.code', 'evaluationTypeCode')
      .addSelect('ev.number', 'evaluationNumber')
      .addSelect('ce.session_number', 'sessionNumber')
      .addSelect('course.name', 'courseName')
      .innerJoin('m.materialFolder', 'mf')
      .innerJoin('mf.evaluation', 'ev')
      .innerJoin('ev.evaluationType', 'et')
      .innerJoin('ev.courseCycle', 'cc')
      .innerJoin('cc.course', 'course')
      .leftJoin('m.classEvent', 'ce')
      .where('m.id = :materialId AND m.material_folder_id = :folderId', {
        materialId,
        folderId,
      })
      .getRawOne<{
        materialId: string;
        materialDisplayName: string;
        folderId: string;
        classEventId: string | null;
        evaluationId: string;
        courseCycleId: string;
        evaluationTypeCode: string;
        evaluationNumber: number;
        sessionNumber: number | null;
        courseName: string;
      }>();

    if (!row) {
      throw new NotificationTargetNotFoundError(
        `No se encontro el material ${materialId} en folder ${folderId} al resolver destinatarios`,
      );
    }

    const activeStatusId = await this.resolveActiveEnrollmentStatusId();

    const [cycleProfs, activeStudents] = await Promise.all([
      this.courseCycleProfessorRepo
        .createQueryBuilder('ccp')
        .select('ccp.professor_user_id', 'userId')
        .innerJoin('ccp.professor', 'professor')
        .where('ccp.course_cycle_id = :courseCycleId', {
          courseCycleId: row.courseCycleId,
        })
        .andWhere('ccp.revoked_at IS NULL')
        .andWhere('professor.is_active = :isActive', { isActive: true })
        .getRawMany<{ userId: string }>(),

      this.enrollmentRepo
        .createQueryBuilder('en')
        .select('en.user_id', 'userId')
        .innerJoin('en.user', 'student')
        .where('en.course_cycle_id = :courseCycleId', {
          courseCycleId: row.courseCycleId,
        })
        .andWhere('en.enrollment_status_id = :statusId', {
          statusId: activeStatusId,
        })
        .andWhere('en.cancelled_at IS NULL')
        .andWhere('student.is_active = :isActive', { isActive: true })
        .getRawMany<{ userId: string }>(),
    ]);

    return {
      materialId: row.materialId,
      folderId: row.folderId,
      classEventId: row.classEventId,
      evaluationId: row.evaluationId,
      sessionNumber:
        row.sessionNumber === null || row.sessionNumber === undefined
          ? null
          : Number(row.sessionNumber),
      materialDisplayName: row.materialDisplayName,
      courseCycleId: row.courseCycleId,
      evaluationLabel: `${row.evaluationTypeCode}${row.evaluationNumber}`,
      courseName: row.courseName,
      recipientUserIds: this.mergeUniqueUserIds(cycleProfs, activeStudents),
    };
  }

  private async resolveActiveEnrollmentStatusId(): Promise<string> {
    const cacheKey = NOTIFICATION_CACHE_KEYS.ACTIVE_ENROLLMENT_STATUS_ID;
    const cached = await this.cacheService.get<string>(cacheKey);

    if (cached) {
      return cached;
    }

    const status = await this.enrollmentStatusRepo.findOne({
      where: { code: ENROLLMENT_STATUS_CODES.ACTIVE },
    });

    if (!status) {
      this.logger.error({
        context: NotificationRecipientsService.name,
        message:
          'Critico: No existe el estado de matricula ACTIVE en la base de datos',
        code: ENROLLMENT_STATUS_CODES.ACTIVE,
      });
      throw new NotificationIntegrityError(
        'Error de integridad: estado de matricula ACTIVE no configurado',
      );
    }

    await this.cacheService.set(
      cacheKey,
      status.id,
      technicalSettings.cache.notifications
        .activeEnrollmentStatusCacheTtlSeconds,
    );

    return status.id;
  }

  private mergeUniqueUserIds(...lists: Array<{ userId: string }[]>): string[] {
    const seen = new Set<string>();
    for (const list of lists) {
      for (const row of list) {
        seen.add(row.userId);
      }
    }
    return Array.from(seen);
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CourseCycleProfessor } from '@modules/courses/domain/course-cycle-professor.entity';
import { Evaluation } from '@modules/evaluations/domain/evaluation.entity';
import { ROLE_CODES } from '@common/constants/role-codes.constants';

@Injectable()
export class CourseCycleProfessorRepository {
  constructor(
    @InjectRepository(CourseCycleProfessor)
    private readonly ormRepository: Repository<CourseCycleProfessor>,
  ) {}

  async findActive(
    courseCycleId: string,
    professorUserId: string,
    manager?: EntityManager,
  ): Promise<CourseCycleProfessor | null> {
    const repo = manager
      ? manager.getRepository(CourseCycleProfessor)
      : this.ormRepository;
    return await repo.findOne({
      where: {
        courseCycleId,
        professorUserId,
        revokedAt: null,
      },
    });
  }

  async upsertAssign(
    courseCycleId: string,
    professorUserId: string,
    manager?: EntityManager,
  ): Promise<CourseCycleProfessor> {
    const repo = manager
      ? manager.getRepository(CourseCycleProfessor)
      : this.ormRepository;

    const existing = await repo.findOne({
      where: {
        courseCycleId,
        professorUserId,
      },
    });

    const now = new Date();

    if (!existing) {
      const created = repo.create({
        courseCycleId,
        professorUserId,
        assignedAt: now,
        revokedAt: null,
      });
      return await repo.save(created);
    }

    existing.assignedAt = now;
    existing.revokedAt = null;
    return await repo.save(existing);
  }

  async isProfessorAssigned(
    courseCycleId: string,
    professorUserId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const repo = manager
      ? manager.getRepository(CourseCycleProfessor)
      : this.ormRepository;

    const result = await repo
      .createQueryBuilder('ccp')
      .select('1', 'exists')
      .innerJoin('ccp.professor', 'professor')
      .innerJoin('professor.roles', 'role', 'role.code = :roleCode', {
        roleCode: ROLE_CODES.PROFESSOR,
      })
      .where('ccp.course_cycle_id = :courseCycleId', { courseCycleId })
      .andWhere('ccp.professor_user_id = :professorUserId', { professorUserId })
      .andWhere('ccp.revoked_at IS NULL')
      .andWhere('professor.is_active = :isActive', { isActive: true })
      .limit(1)
      .getRawOne<{ exists: string }>();

    return !!result;
  }

  async isProfessorAssignedToEvaluation(
    evaluationId: string,
    professorUserId: string,
    manager?: EntityManager,
  ): Promise<boolean>;
  async isProfessorAssignedToEvaluation(
    evaluationIds: string[],
    professorUserId: string,
    manager?: EntityManager,
  ): Promise<Map<string, boolean>>;
  async isProfessorAssignedToEvaluation(
    evaluationIdOrIds: string | string[],
    professorUserId: string,
    manager?: EntityManager,
  ): Promise<boolean | Map<string, boolean>> {
    const repo = manager
      ? manager.getRepository(CourseCycleProfessor)
      : this.ormRepository;

    const isArray = Array.isArray(evaluationIdOrIds);
    const ids: string[] = isArray ? evaluationIdOrIds : [evaluationIdOrIds];

    if (ids.length === 0) {
      return isArray ? new Map() : false;
    }

    const query = repo
      .createQueryBuilder('ccp')
      .select('ev.id', 'evaluationId')
      .innerJoin(Evaluation, 'ev', 'ev.course_cycle_id = ccp.course_cycle_id')
      .innerJoin('ccp.professor', 'professor')
      .innerJoin('professor.roles', 'role', 'role.code = :roleCode', {
        roleCode: ROLE_CODES.PROFESSOR,
      })
      .where('ev.id IN (:...ids)', { ids })
      .andWhere('ccp.professor_user_id = :professorUserId', { professorUserId })
      .andWhere('ccp.revoked_at IS NULL')
      .andWhere('professor.is_active = :isActive', { isActive: true });

    const results = await query.getRawMany<{ evaluationId: string }>();

    if (!isArray) {
      return results.length > 0;
    }

    const resultMap = new Map<string, boolean>();
    ids.forEach((id) => resultMap.set(id, false));
    results.forEach((r) => resultMap.set(r.evaluationId, true));

    return resultMap;
  }

  async canProfessorReadCourseCycle(
    courseCycleId: string,
    professorUserId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const row = await this.resolveProfessorReadContext(
      `
        FROM course_cycle cc
        INNER JOIN academic_cycle ac
          ON ac.id = cc.academic_cycle_id
        WHERE cc.id = ?
        LIMIT 1
      `,
      courseCycleId,
      professorUserId,
      manager,
    );
    return this.canReadFromContext(row);
  }

  async canProfessorReadEvaluation(
    evaluationId: string,
    professorUserId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const row = await this.resolveProfessorReadContext(
      `
        FROM evaluation ev
        INNER JOIN course_cycle cc
          ON cc.id = ev.course_cycle_id
        INNER JOIN academic_cycle ac
          ON ac.id = cc.academic_cycle_id
        WHERE ev.id = ?
        LIMIT 1
      `,
      evaluationId,
      professorUserId,
      manager,
    );
    return this.canReadFromContext(row);
  }

  private async resolveProfessorReadContext(
    fromClause: string,
    targetId: string,
    professorUserId: string,
    manager?: EntityManager,
  ): Promise<{
    exactAssigned: number | string;
    sameCourseAssigned: number | string;
    cycleEndDate: Date | string | null;
  } | null> {
    const repo = manager
      ? manager.getRepository(CourseCycleProfessor)
      : this.ormRepository;

    const rows = await repo.query<
      Array<{
        exactAssigned: number | string;
        sameCourseAssigned: number | string;
        cycleEndDate: Date | string | null;
      }>
    >(
      `
        SELECT
          EXISTS(
            SELECT 1
            FROM course_cycle_professor exact_ccp
            INNER JOIN user exact_professor
              ON exact_professor.id = exact_ccp.professor_user_id
            INNER JOIN user_role exact_ur
              ON exact_ur.user_id = exact_professor.id
            INNER JOIN role exact_role
              ON exact_role.id = exact_ur.role_id
            WHERE exact_ccp.course_cycle_id = cc.id
              AND exact_ccp.professor_user_id = ?
              AND exact_ccp.revoked_at IS NULL
              AND exact_professor.is_active = 1
              AND exact_role.code = ?
            LIMIT 1
          ) AS exactAssigned,
          EXISTS(
            SELECT 1
            FROM course_cycle_professor course_ccp
            INNER JOIN course_cycle assigned_cc
              ON assigned_cc.id = course_ccp.course_cycle_id
            INNER JOIN user course_professor
              ON course_professor.id = course_ccp.professor_user_id
            INNER JOIN user_role course_ur
              ON course_ur.user_id = course_professor.id
            INNER JOIN role course_role
              ON course_role.id = course_ur.role_id
            WHERE assigned_cc.course_id = cc.course_id
              AND course_ccp.professor_user_id = ?
              AND course_ccp.revoked_at IS NULL
              AND course_professor.is_active = 1
              AND course_role.code = ?
            LIMIT 1
          ) AS sameCourseAssigned,
          ac.end_date AS cycleEndDate
        ${fromClause}
      `,
      [
        professorUserId,
        ROLE_CODES.PROFESSOR,
        professorUserId,
        ROLE_CODES.PROFESSOR,
        targetId,
      ],
    );

    return rows[0] ?? null;
  }

  private canReadFromContext(
    row: {
      exactAssigned: number | string;
      sameCourseAssigned: number | string;
      cycleEndDate: Date | string | null;
    } | null,
  ): boolean {
    if (!row) {
      return false;
    }

    if (Number(row.exactAssigned) === 1) {
      return true;
    }

    const cycleEndDate = row.cycleEndDate ? new Date(row.cycleEndDate) : null;
    if (!cycleEndDate || Number.isNaN(cycleEndDate.getTime())) {
      return false;
    }

    return cycleEndDate < new Date() && Number(row.sameCourseAssigned) === 1;
  }

  async revoke(
    courseCycleId: string,
    professorUserId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(CourseCycleProfessor)
      : this.ormRepository;
    await repo
      .createQueryBuilder()
      .update(CourseCycleProfessor)
      .set({ revokedAt: new Date() })
      .where('course_cycle_id = :courseCycleId', { courseCycleId })
      .andWhere('professor_user_id = :professorUserId', { professorUserId })
      .andWhere('revoked_at IS NULL')
      .execute();
  }

  async findByCourseCycleId(
    courseCycleId: string,
  ): Promise<CourseCycleProfessor[]> {
    return await this.ormRepository
      .createQueryBuilder('ccp')
      .innerJoinAndSelect('ccp.professor', 'professor')
      .innerJoin('professor.roles', 'role', 'role.code = :roleCode', {
        roleCode: ROLE_CODES.PROFESSOR,
      })
      .where('ccp.course_cycle_id = :courseCycleId', { courseCycleId })
      .andWhere('ccp.revoked_at IS NULL')
      .andWhere('professor.is_active = :isActive', { isActive: true })
      .getMany();
  }

  async findByProfessorUserId(
    professorUserId: string,
  ): Promise<CourseCycleProfessor[]> {
    return await this.ormRepository
      .createQueryBuilder('ccp')
      .innerJoinAndSelect('ccp.courseCycle', 'cc')
      .innerJoinAndSelect('cc.course', 'course')
      .innerJoinAndSelect('course.courseType', 'courseType')
      .innerJoinAndSelect('course.cycleLevel', 'cycleLevel')
      .innerJoinAndSelect('cc.academicCycle', 'cycle')
      .leftJoinAndSelect(
        'cc.professors',
        'assignedProfessorLink',
        'assignedProfessorLink.revokedAt IS NULL',
      )
      .leftJoinAndSelect('assignedProfessorLink.professor', 'assignedProfessor')
      .innerJoin('ccp.professor', 'professor')
      .innerJoin('professor.roles', 'role', 'role.code = :roleCode', {
        roleCode: ROLE_CODES.PROFESSOR,
      })
      .where('ccp.professor_user_id = :professorUserId', { professorUserId })
      .andWhere('ccp.revoked_at IS NULL')
      .andWhere('professor.is_active = :isActive', { isActive: true })
      .orderBy('cycle.startDate', 'DESC')
      .addOrderBy('course.name', 'ASC')
      .getMany();
  }
}

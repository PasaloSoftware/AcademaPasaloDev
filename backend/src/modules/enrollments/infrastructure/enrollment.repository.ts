import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, IsNull } from 'typeorm';
import { Enrollment } from '@modules/enrollments/domain/enrollment.entity';

export type AdminCourseCycleStudentRow = {
  enrollmentId: string;
  userId: string;
  fullName: string;
  email: string;
};

@Injectable()
export class EnrollmentRepository {
  constructor(
    @InjectRepository(Enrollment)
    private readonly ormRepository: Repository<Enrollment>,
  ) {}

  async create(
    data: Partial<Enrollment>,
    manager?: EntityManager,
  ): Promise<Enrollment> {
    const repo = manager
      ? manager.getRepository(Enrollment)
      : this.ormRepository;
    const enrollment = repo.create(data);
    return await repo.save(enrollment);
  }

  async findActiveByUserAndCourseCycle(
    userId: string,
    courseCycleId: string,
    manager?: EntityManager,
  ): Promise<Enrollment | null> {
    const repo = manager
      ? manager.getRepository(Enrollment)
      : this.ormRepository;
    return await repo.findOne({
      where: {
        userId,
        courseCycleId,
        cancelledAt: IsNull(),
      },
    });
  }

  async findMyEnrollments(
    userId: string,
    activeCycleId?: string,
  ): Promise<Enrollment[]> {
    const qb = this.ormRepository
      .createQueryBuilder('enrollment')
      .innerJoinAndSelect('enrollment.courseCycle', 'courseCycle')
      .innerJoinAndSelect('courseCycle.course', 'course')
      .innerJoinAndSelect('course.courseType', 'courseType')
      .innerJoinAndSelect('course.cycleLevel', 'cycleLevel')
      .innerJoinAndSelect('courseCycle.academicCycle', 'academicCycle')
      .leftJoinAndSelect(
        'courseCycle.professors',
        'courseCycleProfessor',
        'courseCycleProfessor.revokedAt IS NULL',
      )
      .leftJoinAndSelect('courseCycleProfessor.professor', 'professor')
      .where('enrollment.userId = :userId', { userId })
      .andWhere('enrollment.cancelledAt IS NULL')
      .orderBy('enrollment.enrolledAt', 'DESC');

    if (activeCycleId) {
      qb.andWhere('courseCycle.academicCycleId = :activeCycleId', {
        activeCycleId,
      });
    }

    return await qb.getMany();
  }

  async findById(id: string): Promise<Enrollment | null> {
    return await this.ormRepository.findOne({ where: { id } });
  }

  async findAdminStudentsByCourseCyclePage(params: {
    courseCycleId: string;
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<{ rows: AdminCourseCycleStudentRow[]; totalItems: number }> {
    const page = Math.max(1, params.page);
    const pageSize = Math.max(1, params.pageSize);
    const search = params.search?.trim().toLowerCase();

    const baseQb = this.ormRepository
      .createQueryBuilder('enrollment')
      .innerJoin('enrollment.user', 'user')
      .where('enrollment.courseCycleId = :courseCycleId', {
        courseCycleId: params.courseCycleId,
      })
      .andWhere('enrollment.cancelledAt IS NULL');

    if (search) {
      baseQb.andWhere(
        [
          'LOWER(user.email) LIKE :search',
          "OR LOWER(CONCAT_WS(' ', user.firstName, user.lastName1, user.lastName2)) LIKE :search",
        ].join(' '),
        { search: `%${search}%` },
      );
    }

    const totalItems = await baseQb.getCount();

    const rows = await this.ormRepository
      .createQueryBuilder('enrollment')
      .innerJoin('enrollment.user', 'user')
      .where('enrollment.courseCycleId = :courseCycleId', {
        courseCycleId: params.courseCycleId,
      })
      .andWhere('enrollment.cancelledAt IS NULL')
      .andWhere(
        search
          ? [
              '(',
              'LOWER(user.email) LIKE :search',
              "OR LOWER(CONCAT_WS(' ', user.firstName, user.lastName1, user.lastName2)) LIKE :search",
              ')',
            ].join(' ')
          : '1 = 1',
        search ? { search: `%${search}%` } : {},
      )
      .select([
        'enrollment.id AS enrollmentId',
        'user.id AS userId',
        "TRIM(CONCAT_WS(' ', user.first_name, user.last_name_1, user.last_name_2)) AS fullName",
        'user.email AS email',
      ])
      .orderBy('user.firstName', 'ASC')
      .addOrderBy('user.lastName1', 'ASC')
      .addOrderBy('user.lastName2', 'ASC')
      .addOrderBy('user.email', 'ASC')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany<AdminCourseCycleStudentRow>();

    return { rows, totalItems };
  }

  async update(id: string, data: Partial<Enrollment>): Promise<void> {
    await this.ormRepository.update(id, data);
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CourseTestimony } from '@modules/feedback/domain/course-testimony.entity';

export interface AdminFeedbackFilters {
  courseCycleId?: string;
  courseId?: string;
  careerId?: number;
  rating?: number;
  isActive?: boolean;
  search?: string;
}

export interface AdminFeedbackRawStats {
  total: string;
  average: string | null;
  r1: string;
  r2: string;
  r3: string;
  r4: string;
  r5: string;
}

@Injectable()
export class CourseTestimonyRepository {
  constructor(
    @InjectRepository(CourseTestimony)
    private readonly ormRepository: Repository<CourseTestimony>,
  ) {}

  async create(entity: Partial<CourseTestimony>): Promise<CourseTestimony> {
    const newTestimony = this.ormRepository.create(entity);
    return await this.ormRepository.save(newTestimony);
  }

  async findAdminPaginated(
    filters: AdminFeedbackFilters,
    page: number,
    pageSize: number,
  ): Promise<[CourseTestimony[], number]> {
    const qb = this.ormRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.user', 'u')
      .leftJoinAndSelect('u.career', 'career')
      .leftJoinAndSelect('t.courseCycle', 'cc')
      .leftJoinAndSelect('cc.course', 'c')
      .orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    this.applyAdminFilters(qb, filters);
    return qb.getManyAndCount();
  }

  async getAdminAggregates(
    filters: AdminFeedbackFilters,
  ): Promise<AdminFeedbackRawStats> {
    const qb = this.ormRepository
      .createQueryBuilder('t')
      .leftJoin('t.user', 'u')
      .leftJoin('t.courseCycle', 'cc')
      .select('COUNT(*)', 'total')
      .addSelect('AVG(t.rating)', 'average')
      .addSelect('SUM(CASE WHEN t.rating = 1 THEN 1 ELSE 0 END)', 'r1')
      .addSelect('SUM(CASE WHEN t.rating = 2 THEN 1 ELSE 0 END)', 'r2')
      .addSelect('SUM(CASE WHEN t.rating = 3 THEN 1 ELSE 0 END)', 'r3')
      .addSelect('SUM(CASE WHEN t.rating = 4 THEN 1 ELSE 0 END)', 'r4')
      .addSelect('SUM(CASE WHEN t.rating = 5 THEN 1 ELSE 0 END)', 'r5');

    this.applyAdminFilters(qb, filters);
    return qb.getRawOne<AdminFeedbackRawStats>();
  }

  async findActivePublic(limit: number): Promise<CourseTestimony[]> {
    return await this.ormRepository.find({
      where: { isActive: true },
      relations: {
        user: { career: true },
        courseCycle: { course: true },
      },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async countActive(): Promise<number> {
    return await this.ormRepository.count({
      where: { isActive: true },
    });
  }

  async findById(id: string): Promise<CourseTestimony | null> {
    return await this.ormRepository.findOne({
      where: { id },
      relations: { user: true },
    });
  }

  async save(entity: CourseTestimony): Promise<CourseTestimony> {
    return await this.ormRepository.save(entity);
  }

  private applyAdminFilters(
    qb: SelectQueryBuilder<CourseTestimony>,
    filters: AdminFeedbackFilters,
  ): void {
    if (filters.courseCycleId) {
      qb.andWhere('t.courseCycleId = :courseCycleId', {
        courseCycleId: filters.courseCycleId,
      });
    }
    if (filters.courseId) {
      qb.andWhere('cc.courseId = :courseId', { courseId: filters.courseId });
    }
    if (filters.careerId != null) {
      qb.andWhere('u.careerId = :careerId', { careerId: filters.careerId });
    }
    if (filters.rating != null) {
      qb.andWhere('t.rating = :rating', { rating: filters.rating });
    }
    if (filters.isActive != null) {
      qb.andWhere('t.isActive = :isActive', { isActive: filters.isActive });
    }
    if (filters.search) {
      const escaped = filters.search.toLowerCase().replace(/[%_\\]/g, '\\$&');
      const like = `%${escaped}%`;
      qb.andWhere(
        `(LOWER(CONCAT_WS(' ', u.first_name, u.last_name_1, u.last_name_2)) LIKE :like OR LOWER(t.comment) LIKE :like)`,
        { like },
      );
    }
  }
}

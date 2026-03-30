import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseTestimony } from '@modules/feedback/domain/course-testimony.entity';

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

  async findByCycleId(courseCycleId: string): Promise<CourseTestimony[]> {
    return await this.ormRepository.find({
      where: { courseCycleId },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
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
}

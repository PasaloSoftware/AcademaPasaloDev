import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Course } from '@modules/courses/domain/course.entity';

@Injectable()
export class CourseRepository {
  constructor(
    @InjectRepository(Course)
    private readonly ormRepository: Repository<Course>,
  ) {}

  async findAll(): Promise<Course[]> {
    return await this.ormRepository.find({
      relations: {
        courseType: true,
        cycleLevel: true,
      },
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<Course | null> {
    return await this.ormRepository.findOne({
      where: { id },
      relations: {
        courseType: true,
        cycleLevel: true,
      },
    });
  }

  async findByCode(code: string): Promise<Course | null> {
    return await this.ormRepository.findOne({
      where: { code },
    });
  }

  async updateAndReturn(
    id: string,
    data: Partial<Course>,
    manager?: EntityManager,
  ): Promise<Course> {
    const repo = manager ? manager.getRepository(Course) : this.ormRepository;
    const result = await repo.update(id, data);

    if ((result.affected ?? 0) === 0) {
      throw new NotFoundException(
        'La materia solicitada no se encuentra disponible.',
      );
    }

    const updated = await repo.findOne({
      where: { id },
      relations: {
        courseType: true,
        cycleLevel: true,
      },
    });

    if (!updated) {
      throw new InternalServerErrorException(
        'No se pudo reconstruir la materia actualizada.',
      );
    }

    return updated;
  }
}

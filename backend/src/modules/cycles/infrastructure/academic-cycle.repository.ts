import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AcademicCycle } from '@modules/cycles/domain/academic-cycle.entity';

export const CYCLES_HISTORY_PAGE_SIZE = 4;

@Injectable()
export class AcademicCycleRepository {
  constructor(
    @InjectRepository(AcademicCycle)
    private readonly ormRepository: Repository<AcademicCycle>,
  ) {}

  async findAll(): Promise<AcademicCycle[]> {
    return await this.ormRepository.find({
      order: { startDate: 'DESC' },
    });
  }

  async findById(
    id: string,
    manager?: EntityManager,
  ): Promise<AcademicCycle | null> {
    const repo = manager
      ? manager.getRepository(AcademicCycle)
      : this.ormRepository;
    return await repo.findOne({
      where: { id },
    });
  }

  async findHistoryPaginated(
    excludeId: string | null,
    page: number,
    pageSize: number,
  ): Promise<[AcademicCycle[], number]> {
    const qb = this.ormRepository
      .createQueryBuilder('c')
      .orderBy('c.startDate', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (excludeId) {
      qb.where('c.id != :excludeId', { excludeId });
    }

    return qb.getManyAndCount();
  }
}

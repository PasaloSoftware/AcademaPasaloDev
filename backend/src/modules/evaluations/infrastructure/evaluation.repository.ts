import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, In } from 'typeorm';
import { Evaluation } from '@modules/evaluations/domain/evaluation.entity';
import { EvaluationType } from '@modules/evaluations/domain/evaluation-type.entity';
import { EVALUATION_TYPE_CODES } from '@modules/evaluations/domain/evaluation.constants';

@Injectable()
export class EvaluationRepository {
  private hasDisplayOrderColumnCache: boolean | null = null;

  constructor(
    @InjectRepository(Evaluation)
    private readonly evaluationOrm: Repository<Evaluation>,
    @InjectRepository(EvaluationType)
    private readonly typeOrm: Repository<EvaluationType>,
  ) {}

  async findTypeByCode(
    code: string,
    manager?: EntityManager,
  ): Promise<EvaluationType | null> {
    const repo = manager ? manager.getRepository(EvaluationType) : this.typeOrm;
    return await repo.findOne({ where: { code } });
  }

  async findTypesByIds(ids: string[]): Promise<EvaluationType[]> {
    if (ids.length === 0) {
      return [];
    }

    return await this.typeOrm.find({
      where: { id: In(ids) },
      order: { id: 'ASC' },
    });
  }

  async findAcademicTypes(): Promise<EvaluationType[]> {
    return await this.typeOrm
      .createQueryBuilder('evaluationType')
      .where('UPPER(TRIM(evaluationType.code)) <> :bankCode', {
        bankCode: EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS,
      })
      .orderBy('evaluationType.name', 'ASC')
      .addOrderBy('evaluationType.id', 'ASC')
      .getMany();
  }

  async findByCourseCycle(courseCycleId: string): Promise<Evaluation[]> {
    const query = this.evaluationOrm
      .createQueryBuilder('evaluation')
      .leftJoinAndSelect('evaluation.evaluationType', 'evaluationType')
      .where('evaluation.courseCycleId = :courseCycleId', { courseCycleId });

    if (await this.hasDisplayOrderColumn()) {
      query.orderBy('evaluation.display_order', 'ASC');
    } else {
      query.orderBy('evaluation.startDate', 'ASC');
    }

    query
      .addOrderBy('evaluation.startDate', 'ASC')
      .addOrderBy('evaluation.number', 'ASC')
      .addOrderBy('evaluation.id', 'ASC');

    return await query.getMany();
  }

  async findById(id: string): Promise<Evaluation | null> {
    return await this.evaluationOrm.findOne({
      where: { id },
    });
  }

  async findByIdWithCycle(id: string): Promise<Evaluation | null> {
    return await this.evaluationOrm.findOne({
      where: { id },
      relations: [
        'courseCycle',
        'courseCycle.academicCycle',
        'courseCycle.course',
      ],
    });
  }

  async create(
    data: Partial<Evaluation> & { displayOrder?: number },
    manager?: EntityManager,
  ): Promise<Evaluation> {
    const repo = manager
      ? manager.getRepository(Evaluation)
      : this.evaluationOrm;
    const evaluation = repo.create(data);
    const saved = await repo.save(evaluation);

    if (
      data.displayOrder !== undefined &&
      (await this.hasDisplayOrderColumn(manager))
    ) {
      await this.updateDisplayOrder(saved.id, data.displayOrder, manager);
    }

    return saved;
  }

  async findMaxDisplayOrderByCourseCycle(
    courseCycleId: string,
    manager?: EntityManager,
  ): Promise<number> {
    if (!(await this.hasDisplayOrderColumn(manager))) {
      return 0;
    }

    const executor = manager ?? this.evaluationOrm;
    const rows = (await executor.query(
      'SELECT MAX(display_order) AS maxDisplayOrder FROM evaluation WHERE course_cycle_id = ?',
      [courseCycleId],
    )) as unknown;
    const row = Array.isArray(rows)
      ? (rows[0] as { maxDisplayOrder?: string | number | null } | undefined)
      : undefined;

    return Number(row?.maxDisplayOrder ?? 0);
  }

  async updateDisplayOrder(
    id: string,
    displayOrder: number,
    manager?: EntityManager,
  ): Promise<void> {
    if (!(await this.hasDisplayOrderColumn(manager))) {
      return;
    }

    const executor = manager ?? this.evaluationOrm;
    await executor.query(
      'UPDATE evaluation SET display_order = ? WHERE id = ?',
      [displayOrder, id],
    );
  }

  async findAllWithUserAccess(
    courseCycleId: string,
    userId: string,
  ): Promise<Evaluation[]> {
    const query = this.evaluationOrm
      .createQueryBuilder('evaluation')
      .innerJoinAndSelect('evaluation.evaluationType', 'evaluationType')
      .leftJoinAndSelect(
        'evaluation.enrollmentEvaluations',
        'access',
        'access.enrollmentId IN (SELECT id FROM enrollment WHERE user_id = :userId AND cancelled_at IS NULL)',
        { userId },
      )
      .where('evaluation.courseCycleId = :courseCycleId', { courseCycleId });

    if (await this.hasDisplayOrderColumn()) {
      query.orderBy('evaluation.display_order', 'ASC');
    } else {
      query.orderBy('evaluation.startDate', 'ASC');
    }

    query
      .addOrderBy('evaluation.startDate', 'ASC')
      .addOrderBy('evaluation.number', 'ASC')
      .addOrderBy('evaluation.id', 'ASC');

    return await query.getMany();
  }

  async hasDisplayOrderColumn(manager?: EntityManager): Promise<boolean> {
    if (!manager && this.hasDisplayOrderColumnCache !== null) {
      return this.hasDisplayOrderColumnCache;
    }

    const executor = manager ?? this.evaluationOrm;
    const rows = (await executor.query(
      [
        'SELECT COUNT(*) AS total',
        'FROM information_schema.COLUMNS',
        'WHERE TABLE_SCHEMA = DATABASE()',
        "AND TABLE_NAME = 'evaluation'",
        "AND COLUMN_NAME = 'display_order'",
      ].join(' '),
    )) as unknown;

    const row = Array.isArray(rows)
      ? (rows[0] as { total?: string | number } | undefined)
      : undefined;
    const exists = Number(row?.total ?? 0) > 0;

    if (!manager) {
      this.hasDisplayOrderColumnCache = exists;
    }

    return exists;
  }
}

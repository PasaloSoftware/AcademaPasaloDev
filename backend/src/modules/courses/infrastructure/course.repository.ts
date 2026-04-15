import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Course } from '@modules/courses/domain/course.entity';

@Injectable()
export class CourseRepository {
  private hasIsActiveColumnCache: boolean | null = null;

  constructor(
    @InjectRepository(Course)
    private readonly ormRepository: Repository<Course>,
  ) {}

  async findAll(): Promise<Course[]> {
    const courses = await this.ormRepository.find({
      relations: {
        courseType: true,
        cycleLevel: true,
      },
      order: { name: 'ASC' },
    });

    return await this.attachIsActive(courses);
  }

  async findById(id: string): Promise<Course | null> {
    const course = await this.ormRepository.findOne({
      where: { id },
      relations: {
        courseType: true,
        cycleLevel: true,
      },
    });

    if (!course) {
      return null;
    }

    const [courseWithStatus] = await this.attachIsActive([course]);
    return courseWithStatus || null;
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
    const { isActive, ...safeData } = data;
    const result = await repo.update(id, safeData);

    if ((result.affected ?? 0) === 0) {
      throw new NotFoundException(
        'La materia solicitada no se encuentra disponible.',
      );
    }

    if (isActive !== undefined) {
      if (!(await this.hasIsActiveColumn(manager))) {
        throw new BadRequestException(
          'La base de datos aun no esta preparada para actualizar el estado de materias. Ejecute el script backend/db/2026-04-15_add_course_is_active.sql.',
        );
      }

      const executor = manager ?? this.ormRepository;
      await executor.query('UPDATE course SET is_active = ? WHERE id = ?', [
        isActive,
        id,
      ]);
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

    const [updatedWithStatus] = await this.attachIsActive([updated], manager);
    return updatedWithStatus;
  }

  async deleteById(id: string, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(Course) : this.ormRepository;
    const result = await repo.delete(id);

    if ((result.affected ?? 0) === 0) {
      throw new NotFoundException(
        'La materia solicitada no se encuentra disponible.',
      );
    }
  }

  private async attachIsActive(
    courses: Course[],
    manager?: EntityManager,
  ): Promise<Course[]> {
    if (courses.length === 0) {
      return [];
    }

    const hasIsActiveColumn = await this.hasIsActiveColumn(manager);
    if (!hasIsActiveColumn) {
      return courses.map((course) => ({ ...course, isActive: true }));
    }

    const executor = manager ?? this.ormRepository;
    const ids = courses.map((course) => String(course.id));
    const rowsRaw: unknown = await executor.query(
      `SELECT id, is_active AS isActive FROM course WHERE id IN (${ids.map(() => '?').join(', ')})`,
      ids,
    );
    const rows = Array.isArray(rowsRaw)
      ? (rowsRaw as Array<{
          id: string | number;
          isActive: string | number | boolean;
        }>)
      : [];

    const activeMap = new Map(
      rows.map((row) => [String(row.id), Boolean(Number(row.isActive))]),
    );

    return courses.map((course) => ({
      ...course,
      isActive: activeMap.get(String(course.id)) ?? true,
    }));
  }

  async hasIsActiveColumn(manager?: EntityManager): Promise<boolean> {
    if (!manager && this.hasIsActiveColumnCache !== null) {
      return this.hasIsActiveColumnCache;
    }

    const executor = manager ?? this.ormRepository;
    const rowsRaw: unknown = await executor.query(
      [
        'SELECT COUNT(*) AS total',
        'FROM information_schema.COLUMNS',
        'WHERE TABLE_SCHEMA = DATABASE()',
        "AND TABLE_NAME = 'course'",
        "AND COLUMN_NAME = 'is_active'",
      ].join(' '),
    );
    const rows = Array.isArray(rowsRaw)
      ? (rowsRaw as Array<{ total?: string | number }>)
      : [];

    const exists = Number(rows[0]?.total ?? 0) > 0;

    if (!manager) {
      this.hasIsActiveColumnCache = exists;
    }

    return exists;
  }
}

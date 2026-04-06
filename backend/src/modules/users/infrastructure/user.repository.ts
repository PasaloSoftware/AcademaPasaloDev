import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { User } from '@modules/users/domain/user.entity';

export type AdminUsersPageParams = {
  page: number;
  pageSize: number;
  search?: string;
  roleCodes?: string[];
  careerIds?: number[];
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
};

export type AdminUsersPageRow = {
  id: string;
  email: string;
  firstName: string;
  lastName1: string | null;
  lastName2: string | null;
  isActive: boolean;
  createdAt: Date;
  careerId: number | null;
  careerName: string | null;
  roleCodes: string[];
};

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly ormRepository: Repository<User>,
  ) {}

  private getRepository(manager?: EntityManager): Repository<User> {
    return manager ? manager.getRepository(User) : this.ormRepository;
  }

  async create(
    userData: Omit<Partial<User>, 'createdAt' | 'updatedAt'> & {
      createdAt: Date;
      updatedAt: Date | null;
    },
    manager?: EntityManager,
  ): Promise<User> {
    const repo = this.getRepository(manager);
    const user = repo.create(userData);
    return await repo.save(user);
  }

  async findAll(): Promise<User[]> {
    return await this.ormRepository.find({
      relations: ['roles', 'career'],
    });
  }

  async findAdminUsersPage(
    params: AdminUsersPageParams,
  ): Promise<{ rows: AdminUsersPageRow[]; totalItems: number }> {
    const page = Math.max(1, params.page);
    const pageSize = Math.max(1, params.pageSize);
    const roleCodes = (params.roleCodes ?? []).map((code) =>
      String(code || '')
        .trim()
        .toUpperCase(),
    );
    const search = String(params.search || '').trim();
    const careerIds = (params.careerIds ?? [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);

    const baseQb = this.ormRepository.createQueryBuilder('u');

    baseQb.leftJoin('user_role', 'ur', 'ur.user_id = u.id');
    baseQb.leftJoin('role', 'r', 'r.id = ur.role_id');
    baseQb.leftJoin('careers', 'c', 'c.id = u.career_id');

    if (roleCodes.length > 0) {
      baseQb.andWhere('r.code IN (:...roleCodes)', { roleCodes });
    }
    if (search.length > 0) {
      const booleanQuery = this.buildFulltextBooleanQuery(search);
      if (booleanQuery) {
        baseQb.andWhere(
          'MATCH(u.search_text) AGAINST (:searchBoolean IN BOOLEAN MODE)',
          { searchBoolean: booleanQuery },
        );
      } else {
        const normalizedLike = `%${search.toLowerCase()}%`;
        baseQb.andWhere(
          `(
            LOWER(u.email) LIKE :normalizedLike
            OR LOWER(CONCAT_WS(' ', u.first_name, u.last_name_1, u.last_name_2)) LIKE :normalizedLike
          )`,
          { normalizedLike },
        );
      }
    }
    if (careerIds.length > 0) {
      baseQb.andWhere('u.career_id IN (:...careerIds)', { careerIds });
    }
    if (typeof params.isActive === 'boolean') {
      baseQb.andWhere('u.is_active = :isActive', {
        isActive: params.isActive ? 1 : 0,
      });
    }

    const countResult = await baseQb
      .clone()
      .select('COUNT(DISTINCT u.id)', 'totalItems')
      .getRawOne<{ totalItems: string }>();
    const totalItems = Number(countResult?.totalItems || 0);

    if (totalItems === 0) {
      return { rows: [], totalItems: 0 };
    }

    // Map sortBy to DB column
    const sortColumnMap: Record<string, string> = {
      fullName: "CONCAT_WS(' ', u.first_name, u.last_name_1, u.last_name_2)",
      email: 'u.email',
      careerName: 'c.name',
    };
    const sortExpr = params.sortBy ? sortColumnMap[params.sortBy] : undefined;
    const sortDir: 'ASC' | 'DESC' = params.sortOrder || 'DESC';

    const pageIdQb = baseQb
      .clone()
      .select('u.id', 'id')
      .addSelect('u.created_at', 'createdAt')
      .distinct(true);

    // Always add is_active to SELECT for DISTINCT compatibility
    pageIdQb.addSelect('u.is_active', 'isActive');

    if (sortExpr) {
      // Add sort expression to SELECT so DISTINCT is happy
      pageIdQb.addSelect(sortExpr, 'sortVal');
      pageIdQb.orderBy('u.is_active', 'DESC'); // Active first
      pageIdQb.addOrderBy(sortExpr, sortDir);
      pageIdQb.addOrderBy('u.id', 'DESC');
    } else {
      // Default: active first, then newest first
      pageIdQb.orderBy('u.is_active', 'DESC');
      pageIdQb.addOrderBy('u.created_at', 'DESC');
      pageIdQb.addOrderBy('u.id', 'DESC');
    }

    const pageIdRows = await pageIdQb
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany<{ id: string }>();
    const ids = pageIdRows.map((row) => String(row.id || '').trim());

    if (!ids.length) {
      return { rows: [], totalItems };
    }

    const rawRows = await this.ormRepository
      .createQueryBuilder('u')
      .leftJoin('user_role', 'ur', 'ur.user_id = u.id')
      .leftJoin('role', 'r', 'r.id = ur.role_id')
      .leftJoin('careers', 'c', 'c.id = u.career_id')
      .select([
        'u.id AS id',
        'u.email AS email',
        'u.first_name AS firstName',
        'u.last_name_1 AS lastName1',
        'u.last_name_2 AS lastName2',
        'u.is_active AS isActive',
        'u.created_at AS createdAt',
        'u.career_id AS careerId',
        'c.name AS careerName',
        'r.code AS roleCode',
      ])
      .where('u.id IN (:...ids)', { ids })
      .orderBy('u.is_active', 'DESC')
      .addOrderBy(sortExpr || 'u.created_at', sortDir)
      .addOrderBy('u.id', 'DESC')
      .getRawMany<{
        id: string;
        email: string;
        firstName: string;
        lastName1: string | null;
        lastName2: string | null;
        isActive: number | boolean;
        createdAt: Date;
        careerId: number | null;
        careerName: string | null;
        roleCode: string | null;
      }>();

    const byId = new Map<string, AdminUsersPageRow>();
    for (const row of rawRows) {
      const id = String(row.id || '').trim();
      if (!id) continue;
      const existing = byId.get(id);
      if (!existing) {
        byId.set(id, {
          id,
          email: row.email,
          firstName: row.firstName,
          lastName1: row.lastName1 ?? null,
          lastName2: row.lastName2 ?? null,
          isActive:
            row.isActive === true ||
            row.isActive === 1 ||
            String(row.isActive) === '1',
          createdAt: row.createdAt,
          careerId:
            row.careerId == null || Number.isNaN(Number(row.careerId))
              ? null
              : Number(row.careerId),
          careerName: row.careerName ?? null,
          roleCodes: row.roleCode ? [String(row.roleCode).trim()] : [],
        });
      } else if (row.roleCode) {
        const normalizedRoleCode = String(row.roleCode).trim();
        if (!existing.roleCodes.includes(normalizedRoleCode)) {
          existing.roleCodes.push(normalizedRoleCode);
        }
      }
    }

    const rows = ids
      .map((id) => byId.get(id))
      .filter((item): item is AdminUsersPageRow => Boolean(item));

    return { rows, totalItems };
  }

  private buildFulltextBooleanQuery(search: string): string | null {
    const tokens = search
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .map((token) => token.replace(/[+\-<>()~*"@]+/g, '').trim())
      .filter((token) => token.length >= 3);

    if (!tokens.length) {
      return null;
    }

    return tokens.map((token) => `+${token}*`).join(' ');
  }

  async findById(id: string, manager?: EntityManager): Promise<User | null> {
    const repo = this.getRepository(manager);
    return await repo.findOne({
      where: { id },
      relations: ['roles', 'career'],
    });
  }

  async findByEmail(
    email: string,
    manager?: EntityManager,
  ): Promise<User | null> {
    const repo = this.getRepository(manager);
    return await repo.findOne({
      where: { email },
      relations: ['roles', 'career'],
    });
  }

  async delete(id: string, manager?: EntityManager): Promise<void> {
    const repo = this.getRepository(manager);
    await repo.delete(id);
  }

  async save(user: User, manager?: EntityManager): Promise<User> {
    const repo = this.getRepository(manager);
    return await repo.save(user);
  }
}

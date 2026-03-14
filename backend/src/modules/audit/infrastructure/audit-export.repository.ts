import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  AUDIT_LABELS,
  AUDIT_SOURCES,
  type AuditSource,
} from '@modules/audit/interfaces/audit.constants';
import { ParsedAuditHistoryFilters } from '@modules/audit/interfaces/audit-export.interface';
import { UnifiedAuditHistoryDto } from '@modules/audit/dto/unified-audit-history.dto';

type UnifiedAuditRow = {
  id: string;
  datetime: Date | string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  actionCode: string;
  actionName: string;
  source: AuditSource;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | string | null;
};

@Injectable()
export class AuditExportRepository {
  constructor(private readonly dataSource: DataSource) {}

  async countUnifiedHistory(filters: ParsedAuditHistoryFilters): Promise<number> {
    const { sql, params } = this.buildUnifiedCountQuery(filters);
    const rows = await this.dataSource.query<{ total: number | string }[]>(
      sql,
      params,
    );
    const total = rows[0]?.total ?? 0;
    return Number(total);
  }

  async findUnifiedHistory(
    filters: ParsedAuditHistoryFilters,
    limit: number,
    offset = 0,
  ): Promise<UnifiedAuditHistoryDto[]> {
    const safeLimit = Math.max(1, limit);
    const safeOffset = Math.max(0, offset);

    const { sql, params } = this.buildUnifiedSelect(filters, {
      limit: safeLimit,
      offset: safeOffset,
    });

    const rows = await this.dataSource.query<UnifiedAuditRow[]>(sql, params);
    return rows.map((row) => this.mapUnifiedRow(row));
  }

  private mapUnifiedRow(row: UnifiedAuditRow): UnifiedAuditHistoryDto {
    const metadata =
      row.metadata == null
        ? undefined
        : typeof row.metadata === 'string'
          ? (JSON.parse(row.metadata) as Record<string, unknown>)
          : row.metadata;

    return {
      id: row.id,
      datetime:
        row.datetime instanceof Date ? row.datetime : new Date(row.datetime),
      userId: String(row.userId),
      userName: row.userName,
      userEmail: row.userEmail,
      userRole: row.userRole,
      actionCode: row.actionCode,
      actionName: row.actionName,
      source: row.source,
      ipAddress: row.ipAddress ?? undefined,
      userAgent: row.userAgent ?? undefined,
      metadata,
    };
  }

  private buildUnifiedSelect(
    filters: ParsedAuditHistoryFilters,
    options: {
      limit: number;
      offset: number;
    },
  ): { sql: string; params: unknown[] } {
    const branches: string[] = [];
    const params: unknown[] = [];

    if (!filters.source || filters.source === AUDIT_SOURCES.SECURITY) {
      branches.push(this.buildSecurityBranch(filters, params));
    }

    if (!filters.source || filters.source === AUDIT_SOURCES.AUDIT) {
      branches.push(this.buildAuditBranch(filters, params));
    }

    const unionSql = branches.join(' UNION ALL ');

    params.push(options.limit, options.offset);
    return {
      sql: `SELECT * FROM (${unionSql}) unified_history ORDER BY datetime DESC, id DESC LIMIT ? OFFSET ?`,
      params,
    };
  }

  private buildUnifiedCountQuery(
    filters: ParsedAuditHistoryFilters,
  ): { sql: string; params: unknown[] } {
    const branches: string[] = [];
    const params: unknown[] = [];

    if (!filters.source || filters.source === AUDIT_SOURCES.SECURITY) {
      branches.push(this.buildSecurityCountBranch(filters, params));
    }

    if (!filters.source || filters.source === AUDIT_SOURCES.AUDIT) {
      branches.push(this.buildAuditCountBranch(filters, params));
    }

    return {
      sql: `SELECT COALESCE(SUM(total), 0) AS total FROM (${branches.join(
        ' UNION ALL ',
      )}) unified_count`,
      params,
    };
  }

  private buildSecurityBranch(
    filters: ParsedAuditHistoryFilters,
    params: unknown[],
  ): string {
    const whereParams: unknown[] = [];
    const where = this.buildWhereClause(filters, whereParams, 'e', 'et');

    params.push(
      AUDIT_LABELS.UNKNOWN_USER,
      AUDIT_LABELS.NOT_AVAILABLE,
      AUDIT_LABELS.UNKNOWN_ROLE,
      AUDIT_LABELS.UNKNOWN_ACTION,
      AUDIT_LABELS.SOURCE_SECURITY,
      AUDIT_SOURCES.SECURITY,
      ...whereParams,
    );

    return `
      SELECT
        CONCAT('sec-', e.id) AS id,
        e.event_datetime AS datetime,
        CAST(e.user_id AS CHAR) AS userId,
        COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name_1, ''))), ''), ?) AS userName,
        COALESCE(u.email, ?) AS userEmail,
        COALESCE(
          lar.name,
          fr.name,
          ?
        ) AS userRole,
        COALESCE(et.code, ?) AS actionCode,
        COALESCE(et.name, ?) AS actionName,
        ? AS source,
        e.ip_address AS ipAddress,
        e.user_agent AS userAgent,
        e.metadata AS metadata
      FROM security_event e
      LEFT JOIN security_event_type et ON et.id = e.security_event_type_id
      LEFT JOIN user u ON u.id = e.user_id
      LEFT JOIN role lar ON lar.id = u.last_active_role_id
      LEFT JOIN (
        SELECT ur.user_id, MIN(ur.role_id) AS fallback_role_id
        FROM user_role ur
        GROUP BY ur.user_id
      ) fur ON fur.user_id = u.id
      LEFT JOIN role fr ON fr.id = fur.fallback_role_id
      WHERE ${where}
    `;
  }

  private buildAuditBranch(
    filters: ParsedAuditHistoryFilters,
    params: unknown[],
  ): string {
    const whereParams: unknown[] = [];
    const where = this.buildWhereClause(filters, whereParams, 'l', 'a');

    params.push(
      AUDIT_LABELS.UNKNOWN_USER,
      AUDIT_LABELS.NOT_AVAILABLE,
      AUDIT_LABELS.UNKNOWN_ROLE,
      AUDIT_LABELS.UNKNOWN_ACTION,
      AUDIT_LABELS.SOURCE_AUDIT,
      AUDIT_SOURCES.AUDIT,
      ...whereParams,
    );

    return `
      SELECT
        CONCAT('aud-', l.id) AS id,
        l.event_datetime AS datetime,
        CAST(l.user_id AS CHAR) AS userId,
        COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name_1, ''))), ''), ?) AS userName,
        COALESCE(u.email, ?) AS userEmail,
        COALESCE(
          lar.name,
          fr.name,
          ?
        ) AS userRole,
        COALESCE(a.code, ?) AS actionCode,
        COALESCE(a.name, ?) AS actionName,
        ? AS source,
        NULL AS ipAddress,
        NULL AS userAgent,
        NULL AS metadata
      FROM audit_log l
      LEFT JOIN audit_action a ON a.id = l.audit_action_id
      LEFT JOIN user u ON u.id = l.user_id
      LEFT JOIN role lar ON lar.id = u.last_active_role_id
      LEFT JOIN (
        SELECT ur.user_id, MIN(ur.role_id) AS fallback_role_id
        FROM user_role ur
        GROUP BY ur.user_id
      ) fur ON fur.user_id = u.id
      LEFT JOIN role fr ON fr.id = fur.fallback_role_id
      WHERE ${where}
    `;
  }

  private buildSecurityCountBranch(
    filters: ParsedAuditHistoryFilters,
    params: unknown[],
  ): string {
    const where = this.buildWhereClause(filters, params, 'e', 'et');
    const actionJoin = filters.actionCode
      ? 'INNER JOIN security_event_type et ON et.id = e.security_event_type_id'
      : '';

    return `
      SELECT COUNT(*) AS total
      FROM security_event e
      ${actionJoin}
      WHERE ${where}
    `;
  }

  private buildAuditCountBranch(
    filters: ParsedAuditHistoryFilters,
    params: unknown[],
  ): string {
    const where = this.buildWhereClause(filters, params, 'l', 'a');
    const actionJoin = filters.actionCode
      ? 'INNER JOIN audit_action a ON a.id = l.audit_action_id'
      : '';

    return `
      SELECT COUNT(*) AS total
      FROM audit_log l
      ${actionJoin}
      WHERE ${where}
    `;
  }

  private buildWhereClause(
    filters: ParsedAuditHistoryFilters,
    params: unknown[],
    eventAlias: 'e' | 'l',
    actionAlias: 'et' | 'a',
  ): string {
    const conditions = ['1 = 1'];

    if (filters.startDate) {
      conditions.push(`${eventAlias}.event_datetime >= ?`);
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`${eventAlias}.event_datetime <= ?`);
      params.push(filters.endDate);
    }

    if (filters.userId) {
      conditions.push(`${eventAlias}.user_id = ?`);
      params.push(filters.userId);
    }

    if (filters.actionCode) {
      conditions.push(`${actionAlias}.code = ?`);
      params.push(filters.actionCode);
    }

    return conditions.join(' AND ');
  }
}

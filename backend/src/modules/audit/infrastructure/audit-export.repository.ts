import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  AUDIT_LABELS,
  AUDIT_SOURCES,
  type AuditSource,
} from '@modules/audit/interfaces/audit.constants';
import {
  AuditExportCursor,
  ParsedAuditHistoryFilters,
} from '@modules/audit/interfaces/audit-export.interface';
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
  sortSourceRank: number;
  sortEntityId: number;
};

type InvalidMetadataWarningState = {
  warningCount: number;
  warningsSuppressed: boolean;
};

@Injectable()
export class AuditExportRepository {
  private readonly logger = new Logger(AuditExportRepository.name);

  constructor(private readonly dataSource: DataSource) {}

  async countUnifiedHistory(
    filters: ParsedAuditHistoryFilters,
  ): Promise<number> {
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
    const warningState: InvalidMetadataWarningState = {
      warningCount: 0,
      warningsSuppressed: false,
    };
    return rows.map((row) => this.mapUnifiedRow(row, warningState));
  }

  async findAuditLogById(
    entityId: number,
  ): Promise<UnifiedAuditHistoryDto | null> {
    const params: unknown[] = [
      AUDIT_LABELS.UNKNOWN_USER,
      AUDIT_LABELS.NOT_AVAILABLE,
      AUDIT_LABELS.UNKNOWN_ROLE,
      AUDIT_LABELS.UNKNOWN_ACTION,
      AUDIT_LABELS.UNKNOWN_ACTION,
      AUDIT_SOURCES.AUDIT,
      entityId,
    ];

    const sql = `
      SELECT
        CONCAT('aud-', l.id) AS id,
        l.event_datetime AS datetime,
        CAST(l.user_id AS CHAR) AS userId,
        COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name_1, ''))), ''), ?) AS userName,
        COALESCE(u.email, ?) AS userEmail,
        COALESCE(lar.name, fr.name, ?) AS userRole,
        COALESCE(a.code, ?) AS actionCode,
        COALESCE(a.name, ?) AS actionName,
        ? AS source,
        NULL AS ipAddress,
        NULL AS userAgent,
        NULL AS metadata,
        1 AS sortSourceRank,
        l.id AS sortEntityId
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
      WHERE l.id = ?
      LIMIT 1
    `;

    const rows = await this.dataSource.query<UnifiedAuditRow[]>(sql, params);
    if (!rows.length) {
      return null;
    }

    const warningState: InvalidMetadataWarningState = {
      warningCount: 0,
      warningsSuppressed: false,
    };
    return this.mapUnifiedRow(rows[0], warningState);
  }

  async findSecurityEventById(
    entityId: number,
  ): Promise<UnifiedAuditHistoryDto | null> {
    const params: unknown[] = [
      AUDIT_LABELS.UNKNOWN_USER,
      AUDIT_LABELS.NOT_AVAILABLE,
      AUDIT_LABELS.UNKNOWN_ROLE,
      AUDIT_LABELS.UNKNOWN_ACTION,
      AUDIT_LABELS.UNKNOWN_ACTION,
      AUDIT_SOURCES.SECURITY,
      entityId,
    ];

    const sql = `
      SELECT
        CONCAT('sec-', e.id) AS id,
        e.event_datetime AS datetime,
        CAST(e.user_id AS CHAR) AS userId,
        COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name_1, ''))), ''), ?) AS userName,
        COALESCE(u.email, ?) AS userEmail,
        COALESCE(lar.name, fr.name, ?) AS userRole,
        COALESCE(et.code, ?) AS actionCode,
        COALESCE(et.name, ?) AS actionName,
        ? AS source,
        e.ip_address AS ipAddress,
        e.user_agent AS userAgent,
        e.metadata AS metadata,
        2 AS sortSourceRank,
        e.id AS sortEntityId
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
      WHERE e.id = ?
      LIMIT 1
    `;

    const rows = await this.dataSource.query<UnifiedAuditRow[]>(sql, params);
    if (!rows.length) {
      return null;
    }

    const warningState: InvalidMetadataWarningState = {
      warningCount: 0,
      warningsSuppressed: false,
    };
    return this.mapUnifiedRow(rows[0], warningState);
  }

  async findUnifiedHistoryChunk(
    filters: ParsedAuditHistoryFilters,
    limit: number,
    cursor?: AuditExportCursor,
  ): Promise<UnifiedAuditHistoryDto[]> {
    const safeLimit = Math.max(1, limit);
    const { sql, params } = this.buildUnifiedSelect(filters, {
      limit: safeLimit,
      cursor,
    });

    const rows = await this.dataSource.query<UnifiedAuditRow[]>(sql, params);
    const warningState: InvalidMetadataWarningState = {
      warningCount: 0,
      warningsSuppressed: false,
    };
    return rows.map((row) => this.mapUnifiedRow(row, warningState));
  }

  private mapUnifiedRow(
    row: UnifiedAuditRow,
    warningState: InvalidMetadataWarningState,
  ): UnifiedAuditHistoryDto {
    let metadata: Record<string, unknown> | undefined;
    if (row.metadata != null) {
      if (typeof row.metadata === 'string') {
        try {
          metadata = JSON.parse(row.metadata) as Record<string, unknown>;
        } catch (error) {
          if (warningState.warningCount < 5) {
            this.logger.warn({
              context: AuditExportRepository.name,
              message:
                'Se omitio metadata invalida en una fila de auditoria unificada',
              auditRowId: row.id,
              error: error instanceof Error ? error.message : String(error),
            });
            warningState.warningCount += 1;
          } else if (!warningState.warningsSuppressed) {
            this.logger.warn({
              context: AuditExportRepository.name,
              message:
                'Se suprimiran warnings adicionales de metadata invalida para evitar ruido en logs',
            });
            warningState.warningsSuppressed = true;
          }
          metadata = undefined;
        }
      } else {
        metadata = row.metadata;
      }
    }

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
      offset?: number;
      cursor?: AuditExportCursor;
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
    const clauses = [`SELECT * FROM (${unionSql}) unified_history`];

    if (options.cursor) {
      clauses.push(
        'WHERE (datetime < ? OR (datetime = ? AND sortSourceRank < ?) OR (datetime = ? AND sortSourceRank = ? AND sortEntityId < ?))',
      );
      params.push(
        options.cursor.datetime,
        options.cursor.datetime,
        options.cursor.sourceRank,
        options.cursor.datetime,
        options.cursor.sourceRank,
        options.cursor.entityId,
      );
      clauses.push(
        'ORDER BY datetime DESC, sortSourceRank DESC, sortEntityId DESC LIMIT ?',
      );
      params.push(options.limit);
      return {
        sql: clauses.join(' '),
        params,
      };
    }

    clauses.push(
      'ORDER BY datetime DESC, sortSourceRank DESC, sortEntityId DESC LIMIT ? OFFSET ?',
    );
    params.push(options.limit, options.offset ?? 0);
    return {
      sql: clauses.join(' '),
      params,
    };
  }

  private buildUnifiedCountQuery(filters: ParsedAuditHistoryFilters): {
    sql: string;
    params: unknown[];
  } {
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
      AUDIT_LABELS.UNKNOWN_ACTION,
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
        e.metadata AS metadata,
        2 AS sortSourceRank,
        e.id AS sortEntityId
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
      AUDIT_LABELS.UNKNOWN_ACTION,
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
        NULL AS metadata,
        1 AS sortSourceRank,
        l.id AS sortEntityId
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
    const userJoins =
      filters.roleCode || filters.userSearch ? this.buildUserJoins('e') : '';

    return `
      SELECT COUNT(*) AS total
      FROM security_event e
      ${actionJoin}
      ${userJoins}
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
    const userJoins =
      filters.roleCode || filters.userSearch ? this.buildUserJoins('l') : '';

    return `
      SELECT COUNT(*) AS total
      FROM audit_log l
      ${actionJoin}
      ${userJoins}
      WHERE ${where}
    `;
  }

  private buildUserJoins(eventAlias: 'e' | 'l'): string {
    return `
      LEFT JOIN user u ON u.id = ${eventAlias}.user_id
      LEFT JOIN role lar ON lar.id = u.last_active_role_id
      LEFT JOIN (
        SELECT ur.user_id, MIN(ur.role_id) AS fallback_role_id
        FROM user_role ur
        GROUP BY ur.user_id
      ) fur ON fur.user_id = u.id
      LEFT JOIN role fr ON fr.id = fur.fallback_role_id
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

    if (filters.roleCode) {
      conditions.push(`(lar.code = ? OR (lar.code IS NULL AND fr.code = ?))`);
      params.push(filters.roleCode, filters.roleCode);
    }

    if (filters.userSearch) {
      const term = filters.userSearch.trim();
      if (term.length > 0) {
        const booleanTerm = term
          .split(/\s+/)
          .filter((w) => w.length > 0)
          .map((w) => `${w}*`)
          .join(' ');
        conditions.push('MATCH(u.search_text) AGAINST (? IN BOOLEAN MODE)');
        params.push(booleanTerm);
      }
    }

    return conditions.join(' AND ');
  }
}

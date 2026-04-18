import { DataSource } from 'typeorm';
import { AuditExportRepository } from './audit-export.repository';
import {
  AUDIT_LABELS,
  AUDIT_SOURCES,
} from '@modules/audit/interfaces/audit.constants';
import { ROLE_CODES } from '@common/constants/role-codes.constants';

describe('AuditExportRepository', () => {
  let repository: AuditExportRepository;
  let dataSource: Partial<DataSource>;

  beforeEach(() => {
    dataSource = {
      query: jest.fn().mockResolvedValue([]),
    };

    repository = new AuditExportRepository(dataSource as DataSource);
  });

  it('should map fallback placeholders correctly for the security branch', async () => {
    await repository.findUnifiedHistory(
      {
        source: AUDIT_SOURCES.SECURITY,
      },
      10,
    );

    const [, params] = (dataSource.query as jest.Mock).mock.calls[0] as [
      string,
      unknown[],
    ];

    expect(params.slice(0, 5)).toEqual([
      AUDIT_LABELS.UNKNOWN_USER,
      AUDIT_LABELS.NOT_AVAILABLE,
      AUDIT_LABELS.UNKNOWN_ROLE,
      AUDIT_LABELS.UNKNOWN_ACTION,
      AUDIT_LABELS.UNKNOWN_ACTION,
    ]);
    expect(params[5]).toBe(AUDIT_SOURCES.SECURITY);
  });

  it('should map fallback placeholders correctly for the audit branch', async () => {
    await repository.findUnifiedHistory(
      {
        source: AUDIT_SOURCES.AUDIT,
      },
      10,
    );

    const [, params] = (dataSource.query as jest.Mock).mock.calls[0] as [
      string,
      unknown[],
    ];

    expect(params.slice(0, 5)).toEqual([
      AUDIT_LABELS.UNKNOWN_USER,
      AUDIT_LABELS.NOT_AVAILABLE,
      AUDIT_LABELS.UNKNOWN_ROLE,
      AUDIT_LABELS.UNKNOWN_ACTION,
      AUDIT_LABELS.UNKNOWN_ACTION,
    ]);
    expect(params[5]).toBe(AUDIT_SOURCES.AUDIT);
  });

  it('should keep the count query free of user and role joins', async () => {
    await repository.countUnifiedHistory({});

    const [sql] = (dataSource.query as jest.Mock).mock.calls[0] as [
      string,
      unknown[],
    ];

    expect(sql).toContain('FROM security_event e');
    expect(sql).toContain('FROM audit_log l');
    expect(sql).not.toContain('LEFT JOIN user u');
    expect(sql).not.toContain('LEFT JOIN role');
  });

  it('should tolerate invalid metadata payloads without crashing the export row mapping', async () => {
    (dataSource.query as jest.Mock).mockResolvedValueOnce([
      {
        id: 'sec-1',
        datetime: '2026-03-14T12:00:00.000Z',
        userId: '1',
        userName: 'Admin',
        userEmail: 'admin@test.com',
        userRole: 'Admin',
        actionCode: 'LOGIN',
        actionName: 'Login',
        source: AUDIT_SOURCES.SECURITY,
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
        metadata: '{invalid',
        sortSourceRank: 2,
        sortEntityId: 1,
      },
    ]);

    const rows = await repository.findUnifiedHistory(
      {
        source: AUDIT_SOURCES.SECURITY,
      },
      10,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].metadata).toBeUndefined();
  });

  describe('roleCode filter', () => {
    it('should include the role condition in the WHERE clause for the security branch', async () => {
      await repository.findUnifiedHistory(
        { source: AUDIT_SOURCES.SECURITY, roleCode: ROLE_CODES.STUDENT },
        10,
      );

      const [sql, params] = (dataSource.query as jest.Mock).mock
        .calls[0] as [string, unknown[]];

      expect(sql).toContain('lar.code = ?');
      expect(sql).toContain('fr.code = ?');
      const roleMatches = (params as string[]).filter(
        (p) => p === ROLE_CODES.STUDENT,
      );
      expect(roleMatches).toHaveLength(2);
    });

    it('should include the role condition in the WHERE clause for the audit branch', async () => {
      await repository.findUnifiedHistory(
        { source: AUDIT_SOURCES.AUDIT, roleCode: ROLE_CODES.PROFESSOR },
        10,
      );

      const [sql, params] = (dataSource.query as jest.Mock).mock
        .calls[0] as [string, unknown[]];

      expect(sql).toContain('lar.code = ?');
      expect(sql).toContain('fr.code = ?');
      const roleMatches = (params as string[]).filter(
        (p) => p === ROLE_CODES.PROFESSOR,
      );
      expect(roleMatches).toHaveLength(2);
    });

    it('should add user and role joins to the count query when filtering by roleCode', async () => {
      await repository.countUnifiedHistory({ roleCode: ROLE_CODES.ADMIN });

      const [sql] = (dataSource.query as jest.Mock).mock.calls[0] as [
        string,
        unknown[],
      ];

      expect(sql).toContain('LEFT JOIN user u');
      expect(sql).toContain('LEFT JOIN role lar');
      expect(sql).toContain('LEFT JOIN role fr');
    });

    it('should keep the count query free of user and role joins when roleCode is absent', async () => {
      await repository.countUnifiedHistory({});

      const [sql] = (dataSource.query as jest.Mock).mock.calls[0] as [
        string,
        unknown[],
      ];

      expect(sql).not.toContain('LEFT JOIN user u');
      expect(sql).not.toContain('LEFT JOIN role');
    });
  });

  describe('userSearch filter', () => {
    it('should add a FULLTEXT condition to the WHERE clause for the security branch', async () => {
      await repository.findUnifiedHistory(
        { source: AUDIT_SOURCES.SECURITY, userSearch: 'ana' },
        10,
      );

      const [sql, params] = (dataSource.query as jest.Mock).mock
        .calls[0] as [string, unknown[]];

      expect(sql).toContain('MATCH(u.search_text) AGAINST (? IN BOOLEAN MODE)');
      expect(params).toContain('ana*');
    });

    it('should add a FULLTEXT condition to the WHERE clause for the audit branch', async () => {
      await repository.findUnifiedHistory(
        { source: AUDIT_SOURCES.AUDIT, userSearch: 'torres' },
        10,
      );

      const [sql, params] = (dataSource.query as jest.Mock).mock
        .calls[0] as [string, unknown[]];

      expect(sql).toContain('MATCH(u.search_text) AGAINST (? IN BOOLEAN MODE)');
      expect(params).toContain('torres*');
    });

    it('should append a wildcard suffix to each word of the search term', async () => {
      await repository.findUnifiedHistory(
        { source: AUDIT_SOURCES.SECURITY, userSearch: 'ana torres' },
        10,
      );

      const [, params] = (dataSource.query as jest.Mock).mock
        .calls[0] as [string, unknown[]];

      expect(params).toContain('ana* torres*');
    });

    it('should add user joins to the count query when userSearch is present', async () => {
      await repository.countUnifiedHistory({ userSearch: 'jose' });

      const [sql] = (dataSource.query as jest.Mock).mock.calls[0] as [
        string,
        unknown[],
      ];

      expect(sql).toContain('LEFT JOIN user u');
      expect(sql).toContain('MATCH(u.search_text) AGAINST (? IN BOOLEAN MODE)');
    });

    it('should not add any FULLTEXT condition when userSearch is absent', async () => {
      await repository.findUnifiedHistory(
        { source: AUDIT_SOURCES.SECURITY },
        10,
      );

      const [sql] = (dataSource.query as jest.Mock).mock.calls[0] as [
        string,
        unknown[],
      ];

      expect(sql).not.toContain('MATCH(u.search_text)');
    });

    it('should not add any FULLTEXT condition when userSearch is an empty string', async () => {
      await repository.findUnifiedHistory(
        { source: AUDIT_SOURCES.SECURITY, userSearch: '   ' },
        10,
      );

      const [sql] = (dataSource.query as jest.Mock).mock.calls[0] as [
        string,
        unknown[],
      ];

      expect(sql).not.toContain('MATCH(u.search_text)');
    });

    it('should combine userSearch and roleCode in the same WHERE clause', async () => {
      await repository.findUnifiedHistory(
        {
          source: AUDIT_SOURCES.AUDIT,
          roleCode: ROLE_CODES.STUDENT,
          userSearch: 'maria',
        },
        10,
      );

      const [sql, params] = (dataSource.query as jest.Mock).mock
        .calls[0] as [string, unknown[]];

      expect(sql).toContain('lar.code = ?');
      expect(sql).toContain('MATCH(u.search_text) AGAINST (? IN BOOLEAN MODE)');
      expect(params).toContain(ROLE_CODES.STUDENT);
      expect(params).toContain('maria*');
    });

    it('should include the role condition in the WHERE clause for both sources when no source filter is set', async () => {
      await repository.findUnifiedHistory(
        { roleCode: ROLE_CODES.STUDENT },
        10,
      );

      const [sql, params] = (dataSource.query as jest.Mock).mock
        .calls[0] as [string, unknown[]];

      expect(sql).toContain('FROM security_event e');
      expect(sql).toContain('FROM audit_log l');
      const roleMatches = (params as string[]).filter(
        (p) => p === ROLE_CODES.STUDENT,
      );
      expect(roleMatches).toHaveLength(4);
    });

    it('should not include any role condition when roleCode is absent', async () => {
      await repository.findUnifiedHistory(
        { source: AUDIT_SOURCES.SECURITY },
        10,
      );

      const [sql, params] = (dataSource.query as jest.Mock).mock
        .calls[0] as [string, unknown[]];

      expect(sql).not.toContain('lar.code');
      expect(sql).not.toContain('fr.code');
      expect(params).not.toContain(ROLE_CODES.ADMIN);
    });

    it('should combine roleCode and source filters correctly', async () => {
      await repository.findUnifiedHistory(
        { source: AUDIT_SOURCES.AUDIT, roleCode: ROLE_CODES.ADMIN },
        5,
      );

      const [sql, params] = (dataSource.query as jest.Mock).mock
        .calls[0] as [string, unknown[]];

      expect(sql).not.toContain('FROM security_event e');
      expect(sql).toContain('FROM audit_log l');
      expect(sql).toContain('lar.code = ?');
      const roleMatches = (params as string[]).filter(
        (p) => p === ROLE_CODES.ADMIN,
      );
      expect(roleMatches).toHaveLength(2);
    });

    it('should add role params after the SELECT label params in the security branch', async () => {
      await repository.findUnifiedHistory(
        { source: AUDIT_SOURCES.SECURITY, roleCode: ROLE_CODES.STUDENT },
        10,
      );

      const [, params] = (dataSource.query as jest.Mock).mock.calls[0] as [
        string,
        unknown[],
      ];

      expect(params[5]).toBe(AUDIT_SOURCES.SECURITY);

      const roleStart = (params as string[]).indexOf(ROLE_CODES.STUDENT, 6);
      expect(roleStart).toBeGreaterThan(5);
      expect(params[roleStart + 1]).toBe(ROLE_CODES.STUDENT);
    });
  });

  describe('findAuditLogById', () => {
    it('should query only the audit_log table without a UNION', async () => {
      await repository.findAuditLogById(42);

      const [sql] = (dataSource.query as jest.Mock).mock.calls[0] as [
        string,
        unknown[],
      ];

      expect(sql).toContain('FROM audit_log l');
      expect(sql).not.toContain('UNION');
      expect(sql).not.toContain('FROM security_event');
    });

    it('should apply a WHERE clause on the audit_log primary key', async () => {
      await repository.findAuditLogById(42);

      const [sql, params] = (dataSource.query as jest.Mock).mock
        .calls[0] as [string, unknown[]];

      expect(sql).toContain('WHERE l.id = ?');
      expect(params).toContain(42);
    });

    it('should include a LIMIT 1 to prevent over-fetching', async () => {
      await repository.findAuditLogById(1);

      const [sql] = (dataSource.query as jest.Mock).mock.calls[0] as [
        string,
        unknown[],
      ];

      expect(sql).toContain('LIMIT 1');
    });

    it('should return null when no rows are found', async () => {
      (dataSource.query as jest.Mock).mockResolvedValueOnce([]);

      const result = await repository.findAuditLogById(999);

      expect(result).toBeNull();
    });

    it('should map the row to UnifiedAuditHistoryDto and fix the source to AUDIT', async () => {
      (dataSource.query as jest.Mock).mockResolvedValueOnce([
        {
          id: 'aud-7',
          datetime: '2026-03-14T15:00:00.000Z',
          userId: '7',
          userName: 'Ana Torres',
          userEmail: 'ana@test.com',
          userRole: 'Estudiante',
          actionCode: 'FILE_UPLOAD',
          actionName: 'Subida de archivo',
          source: AUDIT_SOURCES.AUDIT,
          ipAddress: null,
          userAgent: null,
          metadata: null,
          sortSourceRank: 1,
          sortEntityId: 7,
        },
      ]);

      const result = await repository.findAuditLogById(7);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('aud-7');
      expect(result!.source).toBe(AUDIT_SOURCES.AUDIT);
      expect(result!.datetime).toBeInstanceOf(Date);
      expect(result!.ipAddress).toBeUndefined();
    });
  });

  describe('findSecurityEventById', () => {
    it('should query only the security_event table without a UNION', async () => {
      await repository.findSecurityEventById(1);

      const [sql] = (dataSource.query as jest.Mock).mock.calls[0] as [
        string,
        unknown[],
      ];

      expect(sql).toContain('FROM security_event e');
      expect(sql).not.toContain('UNION');
      expect(sql).not.toContain('FROM audit_log');
    });

    it('should apply a WHERE clause on the security_event primary key', async () => {
      await repository.findSecurityEventById(5);

      const [sql, params] = (dataSource.query as jest.Mock).mock
        .calls[0] as [string, unknown[]];

      expect(sql).toContain('WHERE e.id = ?');
      expect(params).toContain(5);
    });

    it('should include a LIMIT 1 to prevent over-fetching', async () => {
      await repository.findSecurityEventById(1);

      const [sql] = (dataSource.query as jest.Mock).mock.calls[0] as [
        string,
        unknown[],
      ];

      expect(sql).toContain('LIMIT 1');
    });

    it('should return null when no rows are found', async () => {
      (dataSource.query as jest.Mock).mockResolvedValueOnce([]);

      const result = await repository.findSecurityEventById(999);

      expect(result).toBeNull();
    });

    it('should map the row to UnifiedAuditHistoryDto with security source and parse metadata', async () => {
      (dataSource.query as jest.Mock).mockResolvedValueOnce([
        {
          id: 'sec-3',
          datetime: '2026-03-14T12:00:00.000Z',
          userId: '3',
          userName: 'Carlos Ruiz',
          userEmail: 'carlos@test.com',
          userRole: 'Admin',
          actionCode: 'LOGIN',
          actionName: 'Login',
          source: AUDIT_SOURCES.SECURITY,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: JSON.stringify({ deviceId: 'dev-1', city: 'Lima' }),
          sortSourceRank: 2,
          sortEntityId: 3,
        },
      ]);

      const result = await repository.findSecurityEventById(3);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('sec-3');
      expect(result!.source).toBe(AUDIT_SOURCES.SECURITY);
      expect(result!.datetime).toBeInstanceOf(Date);
      expect(result!.ipAddress).toBe('192.168.1.1');
      expect(result!.userAgent).toBe('Mozilla/5.0');
      expect(result!.metadata).toEqual({ deviceId: 'dev-1', city: 'Lima' });
    });

    it('should include ip_address and user_agent in the query', async () => {
      await repository.findSecurityEventById(1);

      const [sql] = (dataSource.query as jest.Mock).mock.calls[0] as [
        string,
        unknown[],
      ];

      expect(sql).toContain('ip_address');
      expect(sql).toContain('user_agent');
    });

    it('should include the metadata column in the query', async () => {
      await repository.findSecurityEventById(1);

      const [sql] = (dataSource.query as jest.Mock).mock.calls[0] as [
        string,
        unknown[],
      ];

      expect(sql).toContain('metadata');
    });

    it('should tolerate null ipAddress and userAgent without crashing', async () => {
      (dataSource.query as jest.Mock).mockResolvedValueOnce([
        {
          id: 'sec-4',
          datetime: '2026-03-14T12:00:00.000Z',
          userId: '4',
          userName: 'Maria Lopez',
          userEmail: 'maria@test.com',
          userRole: 'Estudiante',
          actionCode: 'LOGOUT',
          actionName: 'Logout',
          source: AUDIT_SOURCES.SECURITY,
          ipAddress: null,
          userAgent: null,
          metadata: null,
          sortSourceRank: 2,
          sortEntityId: 4,
        },
      ]);

      const result = await repository.findSecurityEventById(4);

      expect(result).not.toBeNull();
      expect(result!.ipAddress).toBeUndefined();
      expect(result!.userAgent).toBeUndefined();
      expect(result!.metadata).toBeUndefined();
    });
  });

  it('should reset invalid metadata warning throttling per repository call', async () => {
    const warnSpy = jest.spyOn((repository as any).logger, 'warn');
    (dataSource.query as jest.Mock)
      .mockResolvedValueOnce(
        Array.from({ length: 6 }, (_, index) => ({
          id: `sec-${index + 1}`,
          datetime: '2026-03-14T12:00:00.000Z',
          userId: '1',
          userName: 'Admin',
          userEmail: 'admin@test.com',
          userRole: 'Admin',
          actionCode: 'LOGIN',
          actionName: 'Login',
          source: AUDIT_SOURCES.SECURITY,
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
          metadata: '{invalid',
          sortSourceRank: 2,
          sortEntityId: index + 1,
        })),
      )
      .mockResolvedValueOnce([
        {
          id: 'sec-7',
          datetime: '2026-03-14T12:00:00.000Z',
          userId: '1',
          userName: 'Admin',
          userEmail: 'admin@test.com',
          userRole: 'Admin',
          actionCode: 'LOGIN',
          actionName: 'Login',
          source: AUDIT_SOURCES.SECURITY,
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
          metadata: '{invalid',
          sortSourceRank: 2,
          sortEntityId: 7,
        },
      ]);

    await repository.findUnifiedHistory({ source: AUDIT_SOURCES.SECURITY }, 10);
    await repository.findUnifiedHistory({ source: AUDIT_SOURCES.SECURITY }, 10);

    expect(warnSpy).toHaveBeenCalledTimes(7);
  });
});

import { DataSource } from 'typeorm';
import { AuditExportRepository } from './audit-export.repository';
import {
  AUDIT_LABELS,
  AUDIT_SOURCES,
} from '@modules/audit/interfaces/audit.constants';

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

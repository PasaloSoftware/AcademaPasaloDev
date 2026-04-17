import mysql from 'mysql2/promise';
import { google, admin_directory_v1 } from 'googleapis';

type DbConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

type ProfessorRow = {
  courseCycleId: string;
  professorGroupEmail: string;
  professorEmail: string;
};

function env(name: string): string {
  return String(process.env[name] || '').trim();
}

function toBool(value: string | undefined, fallback = false): boolean {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'y', 'on'].includes(value.toLowerCase());
}

function getDelegatedAdminEmail(): string {
  const delegated =
    env('GOOGLE_WORKSPACE_DELEGATED_ADMIN_EMAIL') ||
    env('GOOGLE_WORKSPACE_ADMIN_EMAIL') ||
    env('GOOGLE_ADMIN_EMAIL');
  if (!delegated) {
    throw new Error(
      'Falta email de admin delegado. Configure GOOGLE_WORKSPACE_DELEGATED_ADMIN_EMAIL (o GOOGLE_WORKSPACE_ADMIN_EMAIL).',
    );
  }
  return delegated;
}

function getDbConfigFromEnv(): DbConfig {
  const host = env('DB_HOST');
  const port = Number(env('DB_PORT') || '3306');
  const user = env('DB_USER');
  const password = String(process.env.DB_PASSWORD || '');
  const database = env('DB_NAME');

  if (!host) throw new Error('Falta DB_HOST');
  if (!Number.isFinite(port) || port <= 0) throw new Error('DB_PORT invalido');
  if (!user) throw new Error('Falta DB_USER');
  if (!database) throw new Error('Falta DB_NAME');

  return { host, port, user, password, database };
}

function getCycleFilter(): string[] {
  const raw = env('SYNC_CYCLE_CODES');
  if (!raw) return [];
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

async function createDirectoryClient(
  delegatedAdminEmail: string,
): Promise<admin_directory_v1.Admin> {
  const auth = new google.auth.GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/admin.directory.group',
      'https://www.googleapis.com/auth/admin.directory.group.member',
    ],
    clientOptions: { subject: delegatedAdminEmail },
  });

  const authClient = await auth.getClient();
  return google.admin({ version: 'directory_v1', auth: authClient });
}

async function ensureGroupExists(
  directory: admin_directory_v1.Admin,
  groupEmail: string,
): Promise<void> {
  try {
    await directory.groups.get({ groupKey: groupEmail });
    return;
  } catch (error: any) {
    const status = Number(error?.code || error?.response?.status || 0);
    if (status !== 404) throw error;
  }

  const nameFromEmail = groupEmail.split('@')[0] || groupEmail;
  await directory.groups.insert({
    requestBody: {
      email: groupEmail,
      name: nameFromEmail,
      description: `Grupo sincronizado para producción (${groupEmail})`,
    },
  });
}

async function listGroupMembersEmails(
  directory: admin_directory_v1.Admin,
  groupEmail: string,
): Promise<Set<string>> {
  const result = new Set<string>();
  let pageToken: string | undefined = undefined;

  do {
    const response = await directory.members.list({
      groupKey: groupEmail,
      maxResults: 200,
      pageToken,
    });

    for (const member of response.data.members || []) {
      const email = String(member.email || '').trim().toLowerCase();
      if (email) result.add(email);
    }

    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return result;
}

async function addMemberIfMissing(
  directory: admin_directory_v1.Admin,
  groupEmail: string,
  memberEmail: string,
): Promise<'added' | 'exists'> {
  try {
    await directory.members.insert({
      groupKey: groupEmail,
      requestBody: {
        email: memberEmail,
        role: 'MEMBER',
      },
    });
    return 'added';
  } catch (error: any) {
    const status = Number(error?.code || error?.response?.status || 0);
    if (status === 409) return 'exists';
    throw error;
  }
}

async function removeMemberIfPresent(
  directory: admin_directory_v1.Admin,
  groupEmail: string,
  memberEmail: string,
): Promise<'removed' | 'missing'> {
  try {
    await directory.members.delete({
      groupKey: groupEmail,
      memberKey: memberEmail,
    });
    return 'removed';
  } catch (error: any) {
    const status = Number(error?.code || error?.response?.status || 0);
    if (status === 404) return 'missing';
    throw error;
  }
}

async function fetchProfessorAssignments(
  db: mysql.Connection,
  cycleCodes: string[],
): Promise<ProfessorRow[]> {
  const cycleFilterSql =
    cycleCodes.length > 0
      ? `AND ac.code IN (${cycleCodes.map(() => '?').join(',')})`
      : '';

  const [rows] = await db.query(
    `
      SELECT
        cc.id AS courseCycleId,
        TRIM(ccda.professor_group_email) AS professorGroupEmail,
        LOWER(TRIM(u.email)) AS professorEmail
      FROM course_cycle_drive_access ccda
      INNER JOIN course_cycle cc
        ON cc.id = ccda.course_cycle_id
      INNER JOIN academic_cycle ac
        ON ac.id = cc.academic_cycle_id
      INNER JOIN course_cycle_professor ccp
        ON ccp.course_cycle_id = cc.id
      INNER JOIN \`user\` u
        ON u.id = ccp.professor_id
      WHERE ccda.professor_group_email IS NOT NULL
        AND TRIM(ccda.professor_group_email) <> ''
        AND u.email IS NOT NULL
        AND TRIM(u.email) <> ''
        AND u.is_active = 1
        ${cycleFilterSql}
      ORDER BY cc.id ASC
    `,
    cycleCodes,
  );

  return (rows as any[]).map((row) => ({
    courseCycleId: String(row.courseCycleId),
    professorGroupEmail: String(row.professorGroupEmail).toLowerCase(),
    professorEmail: String(row.professorEmail).toLowerCase(),
  }));
}

async function run(): Promise<void> {
  const dbConfig = getDbConfigFromEnv();
  const delegatedAdminEmail = getDelegatedAdminEmail();
  const pruneExtraMembers = toBool(process.env.SYNC_PRUNE_EXTRA_MEMBERS, false);
  const cycleCodes = getCycleFilter();

  console.log('[INFO] DB:', dbConfig.database);
  console.log('[INFO] Delegated admin:', delegatedAdminEmail);
  console.log('[INFO] Prune extra members:', pruneExtraMembers ? 'YES' : 'NO');
  console.log(
    '[INFO] Cycle filter:',
    cycleCodes.length ? cycleCodes.join(', ') : '(sin filtro)',
  );

  const db = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    charset: 'utf8mb4',
  });

  try {
    const rows = await fetchProfessorAssignments(db, cycleCodes);
    if (!rows.length) {
      console.log('[INFO] No se encontraron asignaciones de profesores para sincronizar.');
      return;
    }

    const directory = await createDirectoryClient(delegatedAdminEmail);

    const expectedByGroup = new Map<string, Set<string>>();
    for (const row of rows) {
      if (!expectedByGroup.has(row.professorGroupEmail)) {
        expectedByGroup.set(row.professorGroupEmail, new Set<string>());
      }
      expectedByGroup.get(row.professorGroupEmail)!.add(row.professorEmail);
    }

    let totalAdded = 0;
    let totalRemoved = 0;
    let totalGroups = 0;

    for (const [groupEmail, expectedMembers] of expectedByGroup.entries()) {
      totalGroups += 1;
      await ensureGroupExists(directory, groupEmail);
      const currentMembers = await listGroupMembersEmails(directory, groupEmail);

      let added = 0;
      let removed = 0;

      for (const memberEmail of expectedMembers) {
        const result = await addMemberIfMissing(directory, groupEmail, memberEmail);
        if (result === 'added') added += 1;
      }

      if (pruneExtraMembers) {
        for (const memberEmail of currentMembers) {
          if (!expectedMembers.has(memberEmail)) {
            const result = await removeMemberIfPresent(
              directory,
              groupEmail,
              memberEmail,
            );
            if (result === 'removed') removed += 1;
          }
        }
      }

      totalAdded += added;
      totalRemoved += removed;
      console.log(
        `[OK ] ${groupEmail} expected=${expectedMembers.size} added=${added} removed=${removed}`,
      );
    }

    console.log(
      `[DONE] Grupos sincronizados=${totalGroups} miembrosAgregados=${totalAdded} miembrosRemovidos=${totalRemoved}`,
    );
  } finally {
    await db.end();
  }
}

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[ERROR]', message);
  process.exitCode = 1;
});


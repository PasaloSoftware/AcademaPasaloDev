import mysql from 'mysql2/promise';
import { google, admin_directory_v1, drive_v3 } from 'googleapis';

type DbConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

function env(name: string): string {
  return String(process.env[name] || '').trim();
}

function toBool(value: string | undefined, fallback = false): boolean {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'y', 'on'].includes(value.toLowerCase());
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

function getStaffGroupEmail(): string {
  const groupEmail = env('GOOGLE_WORKSPACE_STAFF_VIEWERS_GROUP_EMAIL');
  if (!groupEmail) {
    throw new Error('Falta GOOGLE_WORKSPACE_STAFF_VIEWERS_GROUP_EMAIL');
  }
  return groupEmail.toLowerCase();
}

function getRootFolderId(): string {
  const folderId = env('GOOGLE_DRIVE_REAL_ROOT_FOLDER_ID');
  if (!folderId) {
    throw new Error('Falta GOOGLE_DRIVE_REAL_ROOT_FOLDER_ID');
  }
  return folderId;
}

async function createGoogleClients(delegatedAdminEmail: string): Promise<{
  directory: admin_directory_v1.Admin;
  drive: drive_v3.Drive;
}> {
  const auth = new google.auth.GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/admin.directory.group',
      'https://www.googleapis.com/auth/admin.directory.group.member',
      'https://www.googleapis.com/auth/drive',
    ],
    clientOptions: { subject: delegatedAdminEmail },
  });

  const authClient = await auth.getClient();
  return {
    directory: google.admin({ version: 'directory_v1', auth: authClient }),
    drive: google.drive({ version: 'v3', auth: authClient }),
  };
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
      description: `Grupo staff sincronizado para producción (${groupEmail})`,
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

async function fetchAdminAndSuperadminEmails(db: mysql.Connection): Promise<Set<string>> {
  const [rows] = await db.query(
    `
      SELECT DISTINCT LOWER(TRIM(u.email)) AS email
      FROM user_role ur
      INNER JOIN role r
        ON r.id = ur.role_id
      INNER JOIN \`user\` u
        ON u.id = ur.user_id
      WHERE r.code IN ('ADMIN', 'SUPER_ADMIN')
        AND u.email IS NOT NULL
        AND TRIM(u.email) <> ''
        AND u.is_active = 1
    `,
  );

  const result = new Set<string>();
  for (const row of rows as any[]) {
    const email = String(row.email || '').trim().toLowerCase();
    if (email) result.add(email);
  }
  return result;
}

async function ensureGroupWriterOnRootFolder(
  drive: drive_v3.Drive,
  rootFolderId: string,
  groupEmail: string,
): Promise<'created' | 'updated' | 'already'> {
  const existing = await drive.permissions.list({
    fileId: rootFolderId,
    supportsAllDrives: true,
    fields: 'permissions(id,emailAddress,type,role)',
    pageSize: 200,
  });

  const permissions = existing.data.permissions || [];
  const target = permissions.find(
    (permission) =>
      String(permission.type || '').toLowerCase() === 'group' &&
      String(permission.emailAddress || '').toLowerCase() === groupEmail.toLowerCase(),
  );

  if (!target?.id) {
    await drive.permissions.create({
      fileId: rootFolderId,
      supportsAllDrives: true,
      sendNotificationEmail: false,
      requestBody: {
        type: 'group',
        role: 'writer',
        emailAddress: groupEmail,
      },
    });
    return 'created';
  }

  if (String(target.role || '').toLowerCase() === 'writer') {
    return 'already';
  }

  await drive.permissions.update({
    fileId: rootFolderId,
    permissionId: target.id,
    supportsAllDrives: true,
    requestBody: { role: 'writer' },
  });
  return 'updated';
}

async function run(): Promise<void> {
  const dbConfig = getDbConfigFromEnv();
  const delegatedAdminEmail = getDelegatedAdminEmail();
  const staffGroupEmail = getStaffGroupEmail();
  const driveRootFolderId = getRootFolderId();
  const pruneExtraMembers = toBool(process.env.SYNC_PRUNE_EXTRA_MEMBERS, false);

  console.log('[INFO] DB:', dbConfig.database);
  console.log('[INFO] Delegated admin:', delegatedAdminEmail);
  console.log('[INFO] Staff group:', staffGroupEmail);
  console.log('[INFO] Drive root folder:', driveRootFolderId);
  console.log('[INFO] Prune extra members:', pruneExtraMembers ? 'YES' : 'NO');

  const db = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    charset: 'utf8mb4',
  });

  try {
    const expectedMembers = await fetchAdminAndSuperadminEmails(db);
    const { directory, drive } = await createGoogleClients(delegatedAdminEmail);

    await ensureGroupExists(directory, staffGroupEmail);

    const currentMembers = await listGroupMembersEmails(directory, staffGroupEmail);
    let added = 0;
    let removed = 0;

    for (const email of expectedMembers) {
      const result = await addMemberIfMissing(directory, staffGroupEmail, email);
      if (result === 'added') added += 1;
    }

    if (pruneExtraMembers) {
      for (const email of currentMembers) {
        if (!expectedMembers.has(email)) {
          const result = await removeMemberIfPresent(directory, staffGroupEmail, email);
          if (result === 'removed') removed += 1;
        }
      }
    }

    const permissionResult = await ensureGroupWriterOnRootFolder(
      drive,
      driveRootFolderId,
      staffGroupEmail,
    );

    console.log(
      `[OK ] staff-group membersExpected=${expectedMembers.size} added=${added} removed=${removed}`,
    );
    console.log(`[OK ] root-folder-writer ${permissionResult}`);
    console.log('[DONE] Sincronizacion de admins/superadmins completada.');
  } finally {
    await db.end();
  }
}

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[ERROR]', message);
  process.exitCode = 1;
});

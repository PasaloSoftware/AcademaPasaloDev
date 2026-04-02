import { GoogleAuth } from 'google-auth-library';
import mysql from 'mysql2/promise';

type GoogleRequestMethod = 'GET' | 'POST';
type GoogleRequest = {
  url: string;
  method: GoogleRequestMethod;
  data?: unknown;
  headers?: Record<string, string>;
};
type GoogleResponse<T> = { data: T };

interface GoogleRequestClient {
  request<T = unknown>(request: GoogleRequest): Promise<GoogleResponse<T>>;
}

type DriveFileListResponse = {
  files?: Array<{ id: string }>;
};

type DrivePermissionsListResponse = {
  permissions?: Array<{
    type?: string;
    role?: string;
    emailAddress?: string;
  }>;
  nextPageToken?: string;
};

type CourseCycleRow = {
  courseCycleId: string | number;
  courseCode: string;
  cycleCode: string;
};

function normalizeId(raw: string | number): string {
  const normalized = String(raw || '').trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`ID invalido detectado: "${raw}"`);
  }
  return normalized;
}

function normalizeToken(raw: string): string {
  const normalized = String(raw || '').trim();
  if (!normalized) {
    throw new Error('Token vacio para nombre de carpeta');
  }
  return normalized.replace(/[^A-Za-z0-9_-]/g, '-').replace(/-+/g, '-');
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function getRequiredEnv(name: string): string {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw new Error(`Falta ${name}`);
  }
  return value;
}

async function getDriveClient(): Promise<GoogleRequestClient> {
  const keyFile = getRequiredEnv('GOOGLE_APPLICATION_CREDENTIALS');
  const auth = new GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  const client = (await auth.getClient()) as unknown as GoogleRequestClient;
  if (typeof client.request !== 'function') {
    throw new Error('Cliente Google Drive invalido');
  }
  return client;
}

async function findFolderUnderParent(
  client: GoogleRequestClient,
  parentFolderId: string,
  folderName: string,
): Promise<string | null> {
  const query = `'${parentFolderId}' in parents and name='${escapeDriveQueryValue(
    folderName,
  )}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const response = await client.request<DriveFileListResponse>({
    url: `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)&pageSize=2&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    method: 'GET',
  });
  const files = response.data.files || [];
  if (files.length === 0) return null;
  if (files.length > 1) {
    throw new Error(`Nombre ambiguo detectado: "${folderName}"`);
  }
  return files[0].id;
}

async function listPermissions(
  client: GoogleRequestClient,
  folderId: string,
): Promise<DrivePermissionsListResponse['permissions']> {
  const all: NonNullable<DrivePermissionsListResponse['permissions']> = [];
  let pageToken = '';
  do {
    const params = new URLSearchParams({
      fields: 'permissions(id,type,role,emailAddress),nextPageToken',
      supportsAllDrives: 'true',
    });
    if (pageToken) params.set('pageToken', pageToken);
    const response = await client.request<DrivePermissionsListResponse>({
      url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}/permissions?${params.toString()}`,
      method: 'GET',
    });
    all.push(...(response.data.permissions || []));
    pageToken = String(response.data.nextPageToken || '').trim();
  } while (pageToken);
  return all;
}

async function ensureGroupWriterPermission(
  client: GoogleRequestClient,
  folderId: string,
  groupEmail: string,
): Promise<'exists' | 'created'> {
  const normalizedGroupEmail = groupEmail.trim().toLowerCase();
  const permissions = await listPermissions(client, folderId);
  const existing = permissions.find(
    (permission) =>
      permission.type === 'group' &&
      String(permission.emailAddress || '').trim().toLowerCase() ===
        normalizedGroupEmail,
  );
  if (existing) {
    return 'exists';
  }

  await client.request({
    url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}/permissions?supportsAllDrives=true&sendNotificationEmail=false`,
    method: 'POST',
    data: {
      type: 'group',
      role: 'writer',
      emailAddress: normalizedGroupEmail,
    },
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return 'created';
}

async function getActiveCourseCyclesFromDb(): Promise<CourseCycleRow[]> {
  const conn = await mysql.createConnection({
    host: getRequiredEnv('DB_HOST'),
    port: Number(process.env.DB_PORT || '3306'),
    user: getRequiredEnv('DB_USER'),
    password: String(process.env.DB_PASSWORD || ''),
    database: getRequiredEnv('DB_NAME'),
  });

  try {
    const [rows] = await conn.query(
      `
      SELECT
        cc.id AS courseCycleId,
        c.code AS courseCode,
        ac.code AS cycleCode
      FROM course_cycle cc
      INNER JOIN course c ON c.id = cc.course_id
      INNER JOIN academic_cycle ac ON ac.id = cc.academic_cycle_id
      WHERE cc.academic_cycle_id = COALESCE(
        (
          SELECT CAST(ss.setting_value AS UNSIGNED)
          FROM system_setting ss
          WHERE ss.setting_key = 'ACTIVE_CYCLE_ID'
          LIMIT 1
        ),
        (
          SELECT ac2.id
          FROM academic_cycle ac2
          ORDER BY ac2.id DESC
          LIMIT 1
        )
      )
      ORDER BY cc.id ASC
      `,
    );
    return rows as CourseCycleRow[];
  } finally {
    await conn.end();
  }
}

async function main(): Promise<void> {
  const driveClient = await getDriveClient();
  const rootFolderId = getRequiredEnv('GOOGLE_DRIVE_REAL_ROOT_FOLDER_ID');
  const workspaceDomain = getRequiredEnv('GOOGLE_WORKSPACE_GROUP_DOMAIN')
    .toLowerCase()
    .trim();

  const courseCyclesRootId = await findFolderUnderParent(
    driveClient,
    rootFolderId,
    'course_cycles',
  );
  if (!courseCyclesRootId) {
    throw new Error('No existe carpeta "course_cycles" bajo el root real');
  }

  const cycles = await getActiveCourseCyclesFromDb();
  if (!cycles.length) {
    console.log('No se encontraron course_cycle del ciclo activo.');
    return;
  }

  let ok = 0;
  let missing = 0;
  let createdPermissions = 0;
  const failures: string[] = [];

  for (const row of cycles) {
    const courseCycleId = normalizeId(row.courseCycleId);
    const cycleCode = normalizeToken(String(row.cycleCode || ''));
    const courseCode = normalizeToken(String(row.courseCode || ''));
    const professorGroupEmail = `cc-${courseCycleId}-professors@${workspaceDomain}`;

    try {
      const cycleFolderId = await findFolderUnderParent(
        driveClient,
        courseCyclesRootId,
        cycleCode,
      );
      if (!cycleFolderId) {
        missing += 1;
        failures.push(
          `[MISSING] cycleFolder no encontrado: cycle=${cycleCode} cc=${courseCycleId}`,
        );
        continue;
      }

      const scopeFolderName = `cc_${courseCycleId}_${courseCode}`;
      const scopeFolderId = await findFolderUnderParent(
        driveClient,
        cycleFolderId,
        scopeFolderName,
      );
      if (!scopeFolderId) {
        missing += 1;
        failures.push(
          `[MISSING] scopeFolder no encontrado: ${scopeFolderName}`,
        );
        continue;
      }

      const status = await ensureGroupWriterPermission(
        driveClient,
        scopeFolderId,
        professorGroupEmail,
      );
      if (status === 'created') createdPermissions += 1;
      ok += 1;
      console.log(
        `[OK] cc=${courseCycleId} group=${professorGroupEmail} scope=${scopeFolderId} permission=${status}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`[ERROR] cc=${courseCycleId} -> ${message}`);
    }
  }

  console.log('----------------------------------------');
  console.log(
    JSON.stringify(
      {
        processed: cycles.length,
        ok,
        missing,
        createdPermissions,
        failed: failures.length,
        failures,
      },
      null,
      2,
    ),
  );
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ERROR] ${message}`);
  process.exitCode = 1;
});

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

type DriveFileLookupResponse = {
  id?: string;
  mimeType?: string;
  trashed?: boolean;
};

type DriveFileListResponse = {
  files?: Array<{ id: string }>;
};

type DriveCreateResponse = {
  id?: string;
};

type CourseCycleRow = {
  courseCycleId: string | number;
  courseCode: string;
  cycleCode: string;
};

type CourseCycleEvaluationGroup = {
  evaluationTypeCode: string;
  maxNumber: number;
};

const COURSE_CYCLES_PARENT_FOLDER = 'course_cycles';
const INTRO_VIDEO_FOLDER = 'intro_video';
const BANK_FOLDER = 'bank_documents';
const TARGET_HISTORICAL_CYCLES = ['2026-0', '2025-2', '2025-1'] as const;
const GROUP_ORDER: Record<string, number> = {
  LAB: 1,
  PC: 2,
  PD: 3,
  EX: 4,
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

function getRootFolderIdFromEnv(): string {
  const preferred = String(process.env.GOOGLE_DRIVE_REAL_ROOT_FOLDER_ID || '').trim();
  if (preferred) return preferred;
  throw new Error('Falta GOOGLE_DRIVE_REAL_ROOT_FOLDER_ID');
}

async function getDriveClient(): Promise<GoogleRequestClient> {
  const keyFile = String(process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
  if (!keyFile) {
    throw new Error('Falta GOOGLE_APPLICATION_CREDENTIALS');
  }

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

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function validateRootFolder(
  client: GoogleRequestClient,
  rootFolderId: string,
): Promise<void> {
  const response = await client.request<DriveFileLookupResponse>({
    url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(rootFolderId)}?fields=id,mimeType,trashed&supportsAllDrives=true`,
    method: 'GET',
  });
  const root = response.data;
  if (!root.id) {
    throw new Error('Root folder invalido: no existe');
  }
  if (root.mimeType !== 'application/vnd.google-apps.folder') {
    throw new Error('Root folder debe apuntar a una carpeta o raiz de Shared Drive');
  }
  if (root.trashed) {
    throw new Error('Root folder apunta a carpeta en papelera');
  }
}

async function findOrCreateFolderUnderParent(
  client: GoogleRequestClient,
  parentFolderId: string,
  folderName: string,
): Promise<string> {
  const query = `'${parentFolderId}' in parents and name='${escapeDriveQueryValue(
    folderName,
  )}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const listResponse = await client.request<DriveFileListResponse>({
    url: `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)&pageSize=2&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    method: 'GET',
  });

  const files = listResponse.data.files || [];
  if (files.length === 1) {
    return files[0].id;
  }
  if (files.length > 1) {
    throw new Error(
      `Nombre ambiguo detectado bajo el mismo padre: "${folderName}"`,
    );
  }

  const createResponse = await client.request<DriveCreateResponse>({
    url: 'https://www.googleapis.com/drive/v3/files?supportsAllDrives=true',
    method: 'POST',
    data: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const createdId = String(createResponse.data.id || '').trim();
  if (!createdId) {
    throw new Error(`Google Drive no devolvio id para carpeta "${folderName}"`);
  }

  return createdId;
}

async function getDbConnection(): Promise<mysql.Connection> {
  const host = String(process.env.DB_HOST || '').trim();
  const port = Number(process.env.DB_PORT || '3306');
  const user = String(process.env.DB_USER || '').trim();
  const password = String(process.env.DB_PASSWORD || '');
  const database = String(process.env.DB_NAME || '').trim();

  if (!host || !user || !database) {
    throw new Error('Faltan variables DB_HOST / DB_USER / DB_NAME');
  }
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error('DB_PORT invalido');
  }

  return mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
  });
}

async function getCourseCyclesFromDb(): Promise<CourseCycleRow[]> {
  const conn = await getDbConnection();
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
      WHERE ac.code IN (?, ?, ?)
      ORDER BY ac.start_date DESC, cc.id ASC
      `,
      [...TARGET_HISTORICAL_CYCLES],
    );
    return rows as CourseCycleRow[];
  } finally {
    await conn.end();
  }
}

function getBankFolderDefinition(
  evaluationTypeCode: string,
): { folderName: string; prefix: string } {
  const code = String(evaluationTypeCode || '').trim().toUpperCase();
  if (code === 'LAB') return { folderName: 'Laboratorios', prefix: 'LAB' };
  if (code === 'PC') return { folderName: 'Practicas Calificadas', prefix: 'PC' };
  if (code === 'PD') return { folderName: 'Practicas Dirigidas', prefix: 'PD' };
  if (code === 'EX') return { folderName: 'Examenes', prefix: 'EX' };
  return {
    folderName: `Tipo_${normalizeToken(code || 'UNKNOWN')}`,
    prefix: normalizeToken(code || 'EV'),
  };
}

async function getEvaluationGroupsByCourseCycle(): Promise<
  Map<string, CourseCycleEvaluationGroup[]>
> {
  const conn = await getDbConnection();
  try {
    const [rows] = await conn.query(
      `
      SELECT
        cc.id AS courseCycleId,
        et.code AS evaluationTypeCode,
        MAX(ev.number) AS maxNumber
      FROM course_cycle cc
      INNER JOIN academic_cycle ac ON ac.id = cc.academic_cycle_id
      INNER JOIN evaluation ev ON ev.course_cycle_id = cc.id
      INNER JOIN evaluation_type et ON et.id = ev.evaluation_type_id
      WHERE ac.code IN (?, ?, ?)
      GROUP BY cc.id, et.code
      `,
      [...TARGET_HISTORICAL_CYCLES],
    );

    const map = new Map<string, CourseCycleEvaluationGroup[]>();
    for (const row of rows as Array<{
      courseCycleId: string | number;
      evaluationTypeCode: string;
      maxNumber: number;
    }>) {
      const key = normalizeId(row.courseCycleId);
      const current = map.get(key) || [];
      current.push({
        evaluationTypeCode: String(row.evaluationTypeCode || '').trim().toUpperCase(),
        maxNumber: Number(row.maxNumber || 0),
      });
      map.set(key, current);
    }

    for (const [key, groups] of map.entries()) {
      groups.sort((a, b) => {
        const oa = GROUP_ORDER[a.evaluationTypeCode] ?? 99;
        const ob = GROUP_ORDER[b.evaluationTypeCode] ?? 99;
        if (oa !== ob) return oa - ob;
        return a.evaluationTypeCode.localeCompare(b.evaluationTypeCode);
      });
      map.set(key, groups);
    }

    return map;
  } finally {
    await conn.end();
  }
}

async function main(): Promise<void> {
  const rootFolderId = getRootFolderIdFromEnv();
  const driveClient = await getDriveClient();
  await validateRootFolder(driveClient, rootFolderId);

  const cycles = await getCourseCyclesFromDb();
  const evaluationGroupsByCourseCycle = await getEvaluationGroupsByCourseCycle();
  if (!cycles.length) {
    console.log(
      `[INFO] No se encontraron course_cycle para ciclos historicos: ${TARGET_HISTORICAL_CYCLES.join(', ')}`,
    );
    return;
  }

  const courseCyclesParentFolderId = await findOrCreateFolderUnderParent(
    driveClient,
    rootFolderId,
    COURSE_CYCLES_PARENT_FOLDER,
  );

  console.log(
    `[INFO] Creando estructura de course_cycles historicos para: ${TARGET_HISTORICAL_CYCLES.join(', ')}`,
  );

  let processed = 0;
  const details: Array<{
    courseCycleId: string;
    cycleCode: string;
    courseCode: string;
    cycleFolderId: string;
    scopeFolderId: string;
    introFolderId: string;
    bankFolderId: string;
    bankGroups: Array<{ evaluationTypeCode: string; folderName: string; count: number }>;
  }> = [];

  for (const row of cycles) {
    const courseCycleId = normalizeId(row.courseCycleId);
    const cycleCode = normalizeToken(String(row.cycleCode || ''));
    const courseCode = normalizeToken(String(row.courseCode || ''));

    const cycleFolderId = await findOrCreateFolderUnderParent(
      driveClient,
      courseCyclesParentFolderId,
      cycleCode,
    );
    const scopeFolderId = await findOrCreateFolderUnderParent(
      driveClient,
      cycleFolderId,
      `cc_${courseCycleId}_${courseCode}`,
    );
    const introFolderId = await findOrCreateFolderUnderParent(
      driveClient,
      scopeFolderId,
      INTRO_VIDEO_FOLDER,
    );
    const bankFolderId = await findOrCreateFolderUnderParent(
      driveClient,
      scopeFolderId,
      BANK_FOLDER,
    );

    const groups = evaluationGroupsByCourseCycle.get(courseCycleId) || [];
    for (const group of groups) {
      if (group.maxNumber <= 0) continue;
      const def = getBankFolderDefinition(group.evaluationTypeCode);
      const groupFolderId = await findOrCreateFolderUnderParent(
        driveClient,
        bankFolderId,
        def.folderName,
      );
      for (let i = 1; i <= group.maxNumber; i += 1) {
        await findOrCreateFolderUnderParent(
          driveClient,
          groupFolderId,
          `${def.prefix}${i}`,
        );
      }
    }

    processed += 1;
    details.push({
      courseCycleId,
      cycleCode,
      courseCode,
      cycleFolderId,
      scopeFolderId,
      introFolderId,
      bankFolderId,
      bankGroups: groups
        .filter((g) => g.maxNumber > 0)
        .map((g) => {
          const def = getBankFolderDefinition(g.evaluationTypeCode);
          return {
            evaluationTypeCode: g.evaluationTypeCode,
            folderName: def.folderName,
            count: g.maxNumber,
          };
        }),
    });
  }

  console.log(
    JSON.stringify(
      {
        rootFolderId,
        targetCycles: TARGET_HISTORICAL_CYCLES,
        processedCourseCycles: processed,
        courseCyclesParentFolderId,
        details,
      },
      null,
      2,
    ),
  );
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ERROR] ${message}`);
  process.exitCode = 1;
});


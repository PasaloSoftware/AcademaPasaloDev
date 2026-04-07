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

type DriveFileListResponse = { files?: Array<{ id: string }> };
type DriveCreateResponse = { id?: string };

type EvaluationRow = {
  evaluationId: string | number;
  courseCycleId: string | number;
  courseCode: string;
  cycleCode: string;
  evaluationTypeCode: string;
  evaluationNumber: number;
};

function envOrThrow(name: string): string {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`Falta ${name}`);
  return value;
}

function normalizeId(raw: string | number, field: string): string {
  const v = String(raw || '').trim();
  if (!/^\d+$/.test(v)) throw new Error(`${field} invalido: "${raw}"`);
  return v;
}

function normalizeToken(raw: string, field: string): string {
  const v = String(raw || '').trim();
  if (!v) throw new Error(`${field} vacio`);
  return v.replace(/[^A-Za-z0-9_-]/g, '-').replace(/-+/g, '-');
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function getDriveClient(): Promise<GoogleRequestClient> {
  const keyFile = envOrThrow('GOOGLE_APPLICATION_CREDENTIALS');
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

async function findOrCreateFolderUnderParent(
  client: GoogleRequestClient,
  parentFolderId: string,
  folderName: string,
): Promise<string> {
  const query = `'${parentFolderId}' in parents and name='${escapeDriveQueryValue(
    folderName,
  )}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const list = await client.request<DriveFileListResponse>({
    url: `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)&pageSize=2&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    method: 'GET',
  });

  const files = list.data.files || [];
  if (files.length === 1) return files[0].id;
  if (files.length > 1) {
    throw new Error(`Nombre ambiguo bajo el mismo padre: ${folderName}`);
  }

  const created = await client.request<DriveCreateResponse>({
    url: 'https://www.googleapis.com/drive/v3/files?supportsAllDrives=true',
    method: 'POST',
    data: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    headers: { 'Content-Type': 'application/json' },
  });
  const id = String(created.data.id || '').trim();
  if (!id) throw new Error(`Google no devolvio id para ${folderName}`);
  return id;
}

async function getEvaluationsFromDb(): Promise<EvaluationRow[]> {
  const conn = await mysql.createConnection({
    host: envOrThrow('DB_HOST'),
    port: Number(process.env.DB_PORT || '3306'),
    user: envOrThrow('DB_USER'),
    password: String(process.env.DB_PASSWORD || ''),
    database: envOrThrow('DB_NAME'),
    connectTimeout: 10000,
  });
  try {
    const [rows] = await conn.query(
      `
      SELECT
        ev.id AS evaluationId,
        cc.id AS courseCycleId,
        c.code AS courseCode,
        ac.code AS cycleCode,
        et.code AS evaluationTypeCode,
        ev.number AS evaluationNumber
      FROM evaluation ev
      INNER JOIN course_cycle cc ON cc.id = ev.course_cycle_id
      INNER JOIN course c ON c.id = cc.course_id
      INNER JOIN academic_cycle ac ON ac.id = cc.academic_cycle_id
      INNER JOIN evaluation_type et ON et.id = ev.evaluation_type_id
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
        AND et.code <> 'BANCO_ENUNCIADOS'
        AND ev.number > 0
      ORDER BY ev.id ASC
      `,
    );
    return rows as EvaluationRow[];
  } finally {
    await conn.end();
  }
}

async function main(): Promise<void> {
  const rootFolderId = envOrThrow('GOOGLE_DRIVE_REAL_ROOT_FOLDER_ID');
  console.log(`[INFO] Root real detectado: ${rootFolderId}`);
  const driveClient = await getDriveClient();
  console.log('[INFO] Cliente Drive autenticado');

  const evaluationsRootId = await findOrCreateFolderUnderParent(
    driveClient,
    rootFolderId,
    'evaluations',
  );
  console.log(`[INFO] Carpeta base "evaluations" lista: ${evaluationsRootId}`);

  const evaluations = await getEvaluationsFromDb();
  if (!evaluations.length) {
    console.log('No se encontraron evaluaciones del ciclo activo.');
    return;
  }
  console.log(`[INFO] Evaluaciones encontradas en BD: ${evaluations.length}`);

  let ok = 0;
  let fail = 0;
  const failures: string[] = [];

  for (const row of evaluations) {
    try {
      const evaluationId = normalizeId(row.evaluationId, 'evaluationId');
      const courseCycleId = normalizeId(row.courseCycleId, 'courseCycleId');
      const cycleCode = normalizeToken(row.cycleCode, 'cycleCode');
      const courseCode = normalizeToken(row.courseCode, 'courseCode');
      const typeCode = normalizeToken(row.evaluationTypeCode, 'evaluationTypeCode').toUpperCase();
      const evalNumber = Number(row.evaluationNumber || 0);
      if (!Number.isInteger(evalNumber) || evalNumber <= 0) {
        throw new Error(`evaluationNumber invalido: "${row.evaluationNumber}"`);
      }

      const cycleFolderId = await findOrCreateFolderUnderParent(
        driveClient,
        evaluationsRootId,
        cycleCode,
      );
      const courseCycleFolderId = await findOrCreateFolderUnderParent(
        driveClient,
        cycleFolderId,
        `cc_${courseCycleId}_${courseCode}`,
      );
      const scopeFolderId = await findOrCreateFolderUnderParent(
        driveClient,
        courseCycleFolderId,
        `ev_${evaluationId}_${typeCode}${evalNumber}`,
      );
      await findOrCreateFolderUnderParent(driveClient, scopeFolderId, 'videos');
      await findOrCreateFolderUnderParent(driveClient, scopeFolderId, 'documentos');
      await findOrCreateFolderUnderParent(driveClient, scopeFolderId, 'archivado');

      ok += 1;
      console.log(
        `[OK] ev=${evaluationId} cc=${courseCycleId} type=${typeCode}${evalNumber} scope=${scopeFolderId}`,
      );
    } catch (error) {
      fail += 1;
      failures.push(
        `[ERROR] ev=${String(row.evaluationId)} -> ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  console.log('----------------------------------------');
  console.log(`Provision evaluations folders completada. OK=${ok} FAIL=${fail}`);
  if (failures.length > 0) {
    console.log('Errores detectados:');
    for (const f of failures) console.log(f);
    process.exitCode = 1;
  }
}

void main().catch((error: unknown) => {
  console.error(`[ERROR] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

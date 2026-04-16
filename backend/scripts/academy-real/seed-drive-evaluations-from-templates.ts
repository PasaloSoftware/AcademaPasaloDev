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

type DriveFile = {
  id?: string;
  name?: string;
  mimeType?: string;
  trashed?: boolean;
};

type DriveFileListResponse = {
  files?: DriveFile[];
};

type EvaluationRow = {
  evaluationId: string | number;
  courseCycleId: string | number;
  courseCode: string;
  cycleCode: string;
  evaluationTypeCode: string;
  evaluationNumber: number;
};

const EVALUATIONS_ROOT_FOLDER = 'evaluations';
const TEMPLATES_FOLDER = 'templates';
const TEMPLATE_VIDEO_FOLDER = 'videos';
const TEMPLATE_MATERIAL_FOLDER = 'material';
const TEMPLATE_DOCS_COUNT = 3;

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

function normalizeDriveFileName(name: string): string {
  return String(name || '').replace(/[\r\n\t]/g, ' ').trim();
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
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

async function validateRootFolder(
  client: GoogleRequestClient,
  rootFolderId: string,
): Promise<void> {
  const response = await client.request<DriveFile>({
    url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(rootFolderId)}?fields=id,mimeType,trashed&supportsAllDrives=true`,
    method: 'GET',
  });

  const root = response.data;
  if (!root.id) throw new Error('Root folder invalido: no existe');
  if (root.mimeType !== 'application/vnd.google-apps.folder') {
    throw new Error('Root folder debe apuntar a carpeta o raiz de Shared Drive');
  }
  if (root.trashed) throw new Error('Root folder apunta a carpeta en papelera');
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
    url: `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=2&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    method: 'GET',
  });

  const files = response.data.files || [];
  if (!files.length) return null;
  if (files.length > 1) {
    throw new Error(`Nombre ambiguo detectado bajo el mismo padre: "${folderName}"`);
  }
  return String(files[0].id || '').trim() || null;
}

async function findOrCreateFolderUnderParent(
  client: GoogleRequestClient,
  parentFolderId: string,
  folderName: string,
): Promise<string> {
  const existing = await findFolderUnderParent(client, parentFolderId, folderName);
  if (existing) return existing;

  const response = await client.request<DriveFile>({
    url: 'https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name,mimeType',
    method: 'POST',
    data: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    headers: { 'Content-Type': 'application/json' },
  });

  const createdId = String(response.data.id || '').trim();
  if (!createdId) {
    throw new Error(`Google Drive no devolvio id para carpeta "${folderName}"`);
  }
  return createdId;
}

async function listFilesInFolder(
  client: GoogleRequestClient,
  folderId: string,
): Promise<Array<{ id: string; name: string; mimeType: string }>> {
  const query = `'${folderId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`;
  const response = await client.request<DriveFileListResponse>({
    url: `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType)&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true&orderBy=name_natural`,
    method: 'GET',
  });

  return (response.data.files || [])
    .map((f) => ({
      id: String(f.id || '').trim(),
      name: normalizeDriveFileName(String(f.name || '')),
      mimeType: String(f.mimeType || '').trim(),
    }))
    .filter((f) => !!f.id && !!f.name && !!f.mimeType);
}

async function findFileInFolderByName(
  client: GoogleRequestClient,
  folderId: string,
  fileName: string,
): Promise<string | null> {
  const query = `'${folderId}' in parents and name='${escapeDriveQueryValue(fileName)}' and trashed=false`;
  const response = await client.request<DriveFileListResponse>({
    url: `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=2&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    method: 'GET',
  });

  const files = response.data.files || [];
  if (!files.length) return null;
  if (files.length > 1) {
    throw new Error(`Ambiguedad: mas de un archivo con nombre "${fileName}" en folder ${folderId}`);
  }
  return String(files[0].id || '').trim() || null;
}

async function copyFileKeepingNameIfMissing(
  client: GoogleRequestClient,
  sourceFileId: string,
  targetFolderId: string,
  originalName: string,
): Promise<'copied' | 'skipped_exists'> {
  const existing = await findFileInFolderByName(client, targetFolderId, originalName);
  if (existing) return 'skipped_exists';

  await client.request<DriveFile>({
    url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(sourceFileId)}/copy?supportsAllDrives=true&fields=id,name`,
    method: 'POST',
    data: {
      name: originalName,
      parents: [targetFolderId],
    },
    headers: { 'Content-Type': 'application/json' },
  });

  return 'copied';
}

async function getEvaluationsFromDb(): Promise<EvaluationRow[]> {
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

  const conn = await mysql.createConnection({ host, port, user, password, database });

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
      ORDER BY cc.id ASC, et.code ASC, ev.number ASC
      `,
    );

    return rows as EvaluationRow[];
  } finally {
    await conn.end();
  }
}

async function main(): Promise<void> {
  const rootFolderId = getRootFolderIdFromEnv();
  const driveClient = await getDriveClient();

  console.log('[INFO] Validando root real de Drive...');
  await validateRootFolder(driveClient, rootFolderId);

  const templatesFolderId = await findFolderUnderParent(
    driveClient,
    rootFolderId,
    TEMPLATES_FOLDER,
  );
  if (!templatesFolderId) {
    throw new Error('No existe carpeta "templates" bajo el root real');
  }

  const templateVideoFolderId = await findFolderUnderParent(
    driveClient,
    templatesFolderId,
    TEMPLATE_VIDEO_FOLDER,
  );
  if (!templateVideoFolderId) {
    throw new Error('No existe carpeta de video en templates (video)');
  }

  const templateMaterialFolderId = await findFolderUnderParent(
    driveClient,
    templatesFolderId,
    TEMPLATE_MATERIAL_FOLDER,
  );
  if (!templateMaterialFolderId) {
    throw new Error('No existe carpeta de material en templates (material)');
  }

  const templateVideos = (await listFilesInFolder(driveClient, templateVideoFolderId)).filter(
    (f) => f.mimeType.toLowerCase().startsWith('video/'),
  );
  if (!templateVideos.length) {
    throw new Error('templates/video no contiene un archivo de video');
  }
  const selectedVideo = templateVideos[0];

  const templateMaterials = (await listFilesInFolder(driveClient, templateMaterialFolderId)).filter(
    (f) => !f.mimeType.toLowerCase().startsWith('video/'),
  );
  if (templateMaterials.length < TEMPLATE_DOCS_COUNT) {
    throw new Error(
      `templates/material no tiene suficientes archivos (${templateMaterials.length}); se requieren ${TEMPLATE_DOCS_COUNT}`,
    );
  }
  const selectedDocs = templateMaterials.slice(-TEMPLATE_DOCS_COUNT);

  console.log(
    `[INFO] Plantillas detectadas -> video: ${selectedVideo.name}; ultimos docs: ${selectedDocs.map((d) => d.name).join(', ')}`,
  );

  const evaluationsRootId = await findOrCreateFolderUnderParent(
    driveClient,
    rootFolderId,
    EVALUATIONS_ROOT_FOLDER,
  );

  const evaluations = await getEvaluationsFromDb();
  if (!evaluations.length) {
    console.log('[INFO] No hay evaluaciones en ciclo activo.');
    return;
  }

  let copiedVideos = 0;
  let copiedDocs = 0;
  let skippedExisting = 0;

  for (const ev of evaluations) {
    const evId = normalizeId(ev.evaluationId);
    const ccId = normalizeId(ev.courseCycleId);
    const cycleCode = normalizeToken(String(ev.cycleCode || ''));
    const courseCode = normalizeToken(String(ev.courseCode || ''));
    const typeCode = normalizeToken(String(ev.evaluationTypeCode || '').toUpperCase());
    const evNumber = Number(ev.evaluationNumber || 0);

    const cycleFolderId = await findOrCreateFolderUnderParent(
      driveClient,
      evaluationsRootId,
      cycleCode,
    );
    const courseCycleFolderId = await findOrCreateFolderUnderParent(
      driveClient,
      cycleFolderId,
      `cc_${ccId}_${courseCode}`,
    );
    const evaluationFolderId = await findOrCreateFolderUnderParent(
      driveClient,
      courseCycleFolderId,
      `ev_${evId}_${typeCode}${evNumber}`,
    );

    const docsFolderId = await findOrCreateFolderUnderParent(
      driveClient,
      evaluationFolderId,
      'documentos',
    );
    const videosFolderId = await findOrCreateFolderUnderParent(
      driveClient,
      evaluationFolderId,
      'videos',
    );

    const videoResult = await copyFileKeepingNameIfMissing(
      driveClient,
      selectedVideo.id,
      videosFolderId,
      selectedVideo.name,
    );
    if (videoResult === 'copied') copiedVideos += 1;
    else skippedExisting += 1;

    let docsCopiedForEval = 0;
    let docsSkippedForEval = 0;

    for (const doc of selectedDocs) {
      const result = await copyFileKeepingNameIfMissing(
        driveClient,
        doc.id,
        docsFolderId,
        doc.name,
      );

      if (result === 'copied') {
        copiedDocs += 1;
        docsCopiedForEval += 1;
      } else {
        skippedExisting += 1;
        docsSkippedForEval += 1;
      }
    }

    console.log(
      `[OK] ev_${evId}_${typeCode}${evNumber}: video=${videoResult}, docs_copied=${docsCopiedForEval}, docs_skipped=${docsSkippedForEval}`,
    );
  }

  console.log(
    JSON.stringify(
      {
        rootFolderId,
        evaluationsProcessed: evaluations.length,
        templateVideo: selectedVideo.name,
        templateDocs: selectedDocs.map((d) => d.name),
        copiedVideos,
        copiedDocs,
        skippedExisting,
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

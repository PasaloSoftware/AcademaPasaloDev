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
};

type DriveFileLookupResponse = {
  id?: string;
  mimeType?: string;
  trashed?: boolean;
};

type DriveFileListResponse = {
  files?: DriveFile[];
  nextPageToken?: string;
};

type CourseCycleRow = {
  courseCycleId: string | number;
  courseCode: string;
  cycleCode: string;
};

const COURSE_CYCLES_PARENT_FOLDER = 'course_cycles';
const INTRO_VIDEO_FOLDER = 'intro_video';
const BANK_FOLDER = 'bank_documents';
const TEMPLATES_FOLDER = 'templates';
const VIDEO_FOLDER_NAME = 'videos';
const DOCUMENTS_FOLDER_NAME = 'material';
const TEMPLATE_DOCS_REQUIRED = 3;

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

function getOptionalTargetCourseCode(): string | null {
  const argValue = String(process.argv[2] || '').trim();
  if (argValue) return argValue.toUpperCase();
  const envValue = String(process.env.TARGET_COURSE_CODE || '').trim();
  if (envValue) return envValue.toUpperCase();
  return null;
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

async function findFolderUnderParent(
  client: GoogleRequestClient,
  parentFolderId: string,
  folderName: string,
): Promise<string | null> {
  const query = `'${parentFolderId}' in parents and name='${escapeDriveQueryValue(
    folderName,
  )}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const listResponse = await client.request<DriveFileListResponse>({
    url: `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=2&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    method: 'GET',
  });

  const files = listResponse.data.files || [];
  if (files.length === 0) return null;
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

  const createResponse = await client.request<DriveFile>({
    url: 'https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name,mimeType',
    method: 'POST',
    data: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    headers: { 'Content-Type': 'application/json' },
  });

  const createdId = String(createResponse.data.id || '').trim();
  if (!createdId) {
    throw new Error(`Google Drive no devolvio id para carpeta "${folderName}"`);
  }
  return createdId;
}

async function listChildFolders(
  client: GoogleRequestClient,
  parentFolderId: string,
): Promise<Array<{ id: string; name: string }>> {
  const query = `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const response = await client.request<DriveFileListResponse>({
    url: `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true&orderBy=name_natural`,
    method: 'GET',
  });

  return (response.data.files || [])
    .map((file) => ({
      id: String(file.id || '').trim(),
      name: normalizeDriveFileName(String(file.name || '')),
    }))
    .filter((f) => !!f.id);
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
    .map((file) => ({
      id: String(file.id || '').trim(),
      name: normalizeDriveFileName(String(file.name || '')),
      mimeType: String(file.mimeType || '').trim(),
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
  if (files.length === 0) return null;
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
  if (existing) {
    return 'skipped_exists';
  }

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

async function getCourseCyclesFromDb(
  targetCourseCode: string | null,
): Promise<CourseCycleRow[]> {
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
    const params: unknown[] = [];
    const filterSql = targetCourseCode ? 'AND UPPER(c.code) = ?' : '';
    if (targetCourseCode) params.push(targetCourseCode);

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
      ${filterSql}
      ORDER BY cc.id ASC
      `,
      params,
    );

    return rows as CourseCycleRow[];
  } finally {
    await conn.end();
  }
}

async function main(): Promise<void> {
  const rootFolderId = getRootFolderIdFromEnv();
  const targetCourseCode = getOptionalTargetCourseCode();
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

  const templateVideosFolderId = await findFolderUnderParent(
    driveClient,
    templatesFolderId,
    VIDEO_FOLDER_NAME,
  );
  if (!templateVideosFolderId) {
    throw new Error('No existe carpeta de videos en templates (videos)');
  }

  const templateDocumentsFolderId = await findFolderUnderParent(
    driveClient,
    templatesFolderId,
    DOCUMENTS_FOLDER_NAME,
  );
  if (!templateDocumentsFolderId) {
    throw new Error('No existe carpeta de documentos en templates (material)');
  }

  const templateVideoFiles = (await listFilesInFolder(driveClient, templateVideosFolderId)).filter(
    (file) => file.mimeType.toLowerCase().startsWith('video/'),
  );
  if (!templateVideoFiles.length) {
    throw new Error('templates/videos no contiene archivos de video');
  }
  const templateVideo = templateVideoFiles[0];

  const templateDocumentFiles = (await listFilesInFolder(driveClient, templateDocumentsFolderId)).filter(
    (file) => !file.mimeType.toLowerCase().startsWith('video/'),
  );
  if (templateDocumentFiles.length < TEMPLATE_DOCS_REQUIRED) {
    throw new Error(
      `templates/material no tiene suficientes archivos (${templateDocumentFiles.length}); se requieren ${TEMPLATE_DOCS_REQUIRED}`,
    );
  }
  const selectedDocuments = templateDocumentFiles.slice(0, TEMPLATE_DOCS_REQUIRED);

  console.log(
    `[INFO] Plantillas detectadas -> video: ${templateVideo.name}; documentos: ${selectedDocuments.map((d) => d.name).join(', ')}`,
  );

  const courseCycles = await getCourseCyclesFromDb(targetCourseCode);
  if (!courseCycles.length) {
    throw new Error(
      targetCourseCode
        ? `No se encontraron course_cycles para el curso ${targetCourseCode} en ciclo activo`
        : 'No se encontraron course_cycles en el ciclo activo',
    );
  }

  const courseCyclesFolderId = await findOrCreateFolderUnderParent(
    driveClient,
    rootFolderId,
    COURSE_CYCLES_PARENT_FOLDER,
  );

  let copiedVideos = 0;
  let copiedDocuments = 0;
  let skippedExisting = 0;

  const details: Array<{
    courseCycleId: string;
    courseCode: string;
    cycleCode: string;
    introVideoFolderId: string;
    bankLeafFoldersProcessed: number;
    videoResult: 'copied' | 'skipped_exists';
    documentCopies: number;
    documentSkipped: number;
  }> = [];

  for (const row of courseCycles) {
    const courseCycleId = normalizeId(row.courseCycleId);
    const cycleCode = normalizeToken(String(row.cycleCode || ''));
    const courseCode = normalizeToken(String(row.courseCode || ''));

    const cycleFolderId = await findOrCreateFolderUnderParent(
      driveClient,
      courseCyclesFolderId,
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

    const videoResult = await copyFileKeepingNameIfMissing(
      driveClient,
      templateVideo.id,
      introFolderId,
      templateVideo.name,
    );
    if (videoResult === 'copied') copiedVideos += 1;
    else skippedExisting += 1;

    const groupFolders = await listChildFolders(driveClient, bankFolderId);
    let bankLeafFoldersProcessed = 0;
    let documentCopies = 0;
    let documentSkipped = 0;

    for (const groupFolder of groupFolders) {
      const subFolders = await listChildFolders(driveClient, groupFolder.id);
      if (!subFolders.length) {
        continue;
      }

      for (const leafFolder of subFolders) {
        bankLeafFoldersProcessed += 1;
        for (const doc of selectedDocuments) {
          const result = await copyFileKeepingNameIfMissing(
            driveClient,
            doc.id,
            leafFolder.id,
            doc.name,
          );
          if (result === 'copied') {
            copiedDocuments += 1;
            documentCopies += 1;
          } else {
            skippedExisting += 1;
            documentSkipped += 1;
          }
        }
      }
    }

    details.push({
      courseCycleId,
      courseCode,
      cycleCode,
      introVideoFolderId: introFolderId,
      bankLeafFoldersProcessed,
      videoResult,
      documentCopies,
      documentSkipped,
    });

    console.log(
      `[OK] cc_${courseCycleId}_${courseCode}: intro_video=${videoResult}, bank_leafs=${bankLeafFoldersProcessed}, docs_copied=${documentCopies}, docs_skipped=${documentSkipped}`,
    );
  }

  console.log(
    JSON.stringify(
      {
        rootFolderId,
        targetCourseCode: targetCourseCode || null,
        templateVideo: templateVideo.name,
        templateDocuments: selectedDocuments.map((d) => d.name),
        processedCourseCycles: details.length,
        copiedVideos,
        copiedDocuments,
        skippedExisting,
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


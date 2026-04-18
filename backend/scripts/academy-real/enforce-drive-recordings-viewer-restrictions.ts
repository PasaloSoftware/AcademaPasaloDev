import { GoogleAuth } from 'google-auth-library';
import mysql from 'mysql2/promise';

type GoogleRequestMethod = 'PATCH';
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

type RestrictionResponse = {
  id?: string;
  copyRequiresWriterPermission?: boolean;
};

function envOrThrow(name: string): string {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`Falta ${name}`);
  return value;
}

async function getDriveClient(): Promise<GoogleRequestClient> {
  const auth = new GoogleAuth({
    keyFile: envOrThrow('GOOGLE_APPLICATION_CREDENTIALS'),
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  const client = (await auth.getClient()) as unknown as GoogleRequestClient;
  if (typeof client.request !== 'function') {
    throw new Error('Cliente Google Drive invalido');
  }
  return client;
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log('[START] enforce-drive-recordings-viewer-restrictions');
  console.log(
    `[ENV] DB=${String(process.env.DB_HOST || '').trim()}:${String(
      process.env.DB_PORT || '3306',
    ).trim()} / ${String(process.env.DB_NAME || '').trim()}`,
  );

  console.log('[STEP] Conectando a MySQL...');
  const conn = await mysql.createConnection({
    host: envOrThrow('DB_HOST'),
    port: Number(process.env.DB_PORT || '3306'),
    user: envOrThrow('DB_USER'),
    password: String(process.env.DB_PASSWORD || ''),
    database: envOrThrow('DB_NAME'),
  });
  console.log('[OK] Conexión MySQL lista');

  console.log('[STEP] Inicializando cliente Google Drive...');
  const drive = await getDriveClient();
  console.log('[OK] Cliente Google Drive listo');

  try {
    console.log('[STEP] Consultando grabaciones del ciclo activo...');
    const [rows] = await conn.query(
      `
      SELECT DISTINCT ce.recording_file_id AS recordingFileId
      FROM class_event ce
      INNER JOIN evaluation ev ON ev.id = ce.evaluation_id
      INNER JOIN course_cycle cc ON cc.id = ev.course_cycle_id
      WHERE cc.academic_cycle_id = COALESCE(
        (SELECT CAST(setting_value AS UNSIGNED) FROM system_setting WHERE setting_key='ACTIVE_CYCLE_ID' LIMIT 1),
        (SELECT id FROM academic_cycle ORDER BY id DESC LIMIT 1)
      )
        AND ce.recording_file_id IS NOT NULL
        AND ce.recording_file_id <> ''
      ORDER BY ce.recording_file_id ASC
      `,
    ) as [Array<{ recordingFileId: string }>, unknown];

    console.log(`[INFO] Archivos de grabacion a endurecer: ${rows.length}`);
    if (rows.length === 0) {
      console.log('[DONE] No se encontraron grabaciones para procesar.');
    }

    let ok = 0;
    let fail = 0;
    let skipped = 0;
    for (let i = 0; i < rows.length; i += 1) {
      const fileId = String(rows[i].recordingFileId || '').trim();
      if (!fileId) {
        skipped += 1;
        continue;
      }

      try {
        const response = await drive.request<RestrictionResponse>({
          url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true&fields=id,copyRequiresWriterPermission`,
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json; charset=UTF-8' },
          data: { copyRequiresWriterPermission: true },
        });
        const enforced = Boolean(response.data?.copyRequiresWriterPermission);
        if (!enforced) throw new Error('Drive no confirmo copyRequiresWriterPermission');
        ok += 1;
        console.log(`[OK] [${i + 1}/${rows.length}] ${fileId}`);
      } catch (error) {
        fail += 1;
        console.log(
          `[FAIL] [${i + 1}/${rows.length}] ${fileId} -> ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      if ((i + 1) % 25 === 0 || i + 1 === rows.length) {
        console.log(
          `[PROGRESS] ${i + 1}/${rows.length} | ok=${ok} fail=${fail} skipped=${skipped}`,
        );
      }
    }

    console.log('----------------------------------------');
    console.log(
      JSON.stringify(
        {
          total: rows.length,
          ok,
          fail,
          skipped,
          elapsedMs: Date.now() - startedAt,
        },
        null,
        2,
      ),
    );
    if (fail > 0) process.exitCode = 1;
  } finally {
    console.log('[STEP] Cerrando conexión MySQL...');
    await conn.end();
    console.log('[DONE] Script finalizado');
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

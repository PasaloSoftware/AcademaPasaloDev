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
  const conn = await mysql.createConnection({
    host: envOrThrow('DB_HOST'),
    port: Number(process.env.DB_PORT || '3306'),
    user: envOrThrow('DB_USER'),
    password: String(process.env.DB_PASSWORD || ''),
    database: envOrThrow('DB_NAME'),
  });
  const drive = await getDriveClient();

  try {
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

    let ok = 0;
    let fail = 0;
    for (let i = 0; i < rows.length; i += 1) {
      const fileId = String(rows[i].recordingFileId || '').trim();
      if (!fileId) continue;

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
    }

    console.log('----------------------------------------');
    console.log(JSON.stringify({ total: rows.length, ok, fail }, null, 2));
    if (fail > 0) process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});


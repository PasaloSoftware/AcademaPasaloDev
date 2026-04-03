import { NestFactory } from '@nestjs/core';
import { AppModule } from '@src/app.module';
import { ConfigService } from '@nestjs/config';
import { GoogleAuth } from 'google-auth-library';

type GoogleRequestMethod = 'GET';
type GoogleRequest = {
  url: string;
  method: GoogleRequestMethod;
};
type GoogleResponse<T> = { data: T };

interface GoogleRequestClient {
  request<T = unknown>(request: GoogleRequest): Promise<GoogleResponse<T>>;
}

type DriveFileResponse = {
  id?: string;
  name?: string;
  mimeType?: string;
  trashed?: boolean;
};

type SharedDriveResponse = {
  id?: string;
  name?: string;
};

function getCliInput(): string {
  const cliArg = process.argv[2];
  if (String(cliArg || '').trim()) {
    return String(cliArg).trim();
  }

  const fromEnvUrl = String(process.env.GOOGLE_DRIVE_REAL_PARENT_URL || '').trim();
  if (fromEnvUrl) return fromEnvUrl;

  const fromEnvId = String(process.env.GOOGLE_DRIVE_REAL_PARENT_ID || '').trim();
  if (fromEnvId) return fromEnvId;

  const fromEnvRealRoot = String(process.env.GOOGLE_DRIVE_REAL_ROOT_FOLDER_ID || '').trim();
  if (fromEnvRealRoot) return fromEnvRealRoot;

  const fromEnvCurrentRoot = String(process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '').trim();
  if (fromEnvCurrentRoot) return fromEnvCurrentRoot;

  throw new Error(
    'Debes enviar URL/ID o definir GOOGLE_DRIVE_REAL_ROOT_FOLDER_ID / GOOGLE_DRIVE_REAL_PARENT_URL / GOOGLE_DRIVE_REAL_PARENT_ID',
  );
}

function extractId(input: string): string {
  const raw = String(input || '').trim();
  if (!raw) {
    throw new Error('Entrada vacia para URL/ID');
  }

  const folderMatch = raw.match(/\/folders\/([A-Za-z0-9_-]+)/i);
  if (folderMatch?.[1]) return folderMatch[1];

  const idMatch = raw.match(/[?&]id=([A-Za-z0-9_-]+)/i);
  if (idMatch?.[1]) return idMatch[1];

  if (/^[A-Za-z0-9_-]{10,}$/.test(raw)) return raw;

  throw new Error(`No se pudo extraer ID desde: ${raw}`);
}

async function getClient(configService: ConfigService): Promise<GoogleRequestClient> {
  const keyFile = String(
    configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS', '') || '',
  ).trim();
  if (!keyFile) {
    throw new Error('Falta GOOGLE_APPLICATION_CREDENTIALS en el entorno');
  }

  const auth = new GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  const client = (await auth.getClient()) as unknown as GoogleRequestClient;
  if (typeof client.request !== 'function') {
    throw new Error('No se pudo inicializar cliente de Google Drive');
  }
  return client;
}

async function tryGetFolder(
  client: GoogleRequestClient,
  id: string,
): Promise<DriveFileResponse | null> {
  try {
    const response = await client.request<DriveFileResponse>({
      url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        id,
      )}?fields=id,name,mimeType,trashed&supportsAllDrives=true`,
      method: 'GET',
    });
    return response.data;
  } catch {
    return null;
  }
}

async function tryGetSharedDrive(
  client: GoogleRequestClient,
  id: string,
): Promise<SharedDriveResponse | null> {
  try {
    const response = await client.request<SharedDriveResponse>({
      url: `https://www.googleapis.com/drive/v3/drives/${encodeURIComponent(
        id,
      )}?fields=id,name`,
      method: 'GET',
    });
    return response.data;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const configService = app.get(ConfigService);
    const input = getCliInput();
    const targetId = extractId(input);
    const client = await getClient(configService);

    const sharedDrive = await tryGetSharedDrive(client, targetId);
    if (sharedDrive?.id) {
      console.log('[OK] Tipo: Shared Drive');
      console.log(`[OK] ID: ${sharedDrive.id}`);
      console.log(`[OK] Nombre: ${sharedDrive.name || '(sin nombre)'}`);
      return;
    }

    const folder = await tryGetFolder(client, targetId);
    if (folder?.id) {
      if (folder.trashed) {
        throw new Error(`El folder existe pero está en papelera: ${folder.id}`);
      }
      if (folder.mimeType !== 'application/vnd.google-apps.folder') {
        throw new Error(
          `El ID apunta a un archivo, no a carpeta. mimeType=${folder.mimeType || 'desconocido'}`,
        );
      }
      console.log('[OK] Tipo: Folder');
      console.log(`[OK] ID: ${folder.id}`);
      console.log(`[OK] Nombre: ${folder.name || '(sin nombre)'}`);
      return;
    }

    throw new Error(
      `No se encontró el recurso con ID "${targetId}" (ni como folder ni como shared drive).`,
    );
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ERROR] ${message}`);
  process.exitCode = 1;
});

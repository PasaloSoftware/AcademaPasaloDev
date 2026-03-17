import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuth } from 'google-auth-library';

type GoogleRequestMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

type GoogleRequest = {
  url: string;
  method: GoogleRequestMethod;
  data?: unknown;
  headers?: Record<string, string>;
};

type GoogleResponse<T> = {
  data: T;
  headers?: Record<string, string | string[] | undefined>;
};

interface GoogleRequestClient {
  request<T = unknown>(request: GoogleRequest): Promise<GoogleResponse<T>>;
}

@Injectable()
export class ClassEventRecordingDriveService {
  private readonly logger = new Logger(ClassEventRecordingDriveService.name);
  private driveClientPromise: Promise<GoogleRequestClient> | null = null;

  constructor(private readonly configService: ConfigService) {}

  async createResumableUploadSession(input: {
    classEventId: string;
    evaluationId: string;
    driveVideosFolderId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<{ resumableSessionUrl: string }> {
    const client = await this.getDriveClient();

    try {
      const response = await client.request<{
        id?: string;
        name?: string;
        parents?: string[];
      }>({
        url: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,parents&supportsAllDrives=true',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': input.mimeType,
          'X-Upload-Content-Length': String(input.sizeBytes),
        },
        data: {
          name: input.fileName,
          parents: [input.driveVideosFolderId],
        },
      });

      const locationHeader = response.headers?.location;
      const resumableSessionUrl = Array.isArray(locationHeader)
        ? String(locationHeader[0] || '').trim()
        : String(locationHeader || '').trim();

      if (!resumableSessionUrl) {
        throw new BadGatewayException(
          'Google Drive no devolvió una sesión resumable válida',
        );
      }

      this.logger.log({
        message: 'Sesion resumable de grabacion creada en Google Drive',
        classEventId: input.classEventId,
        evaluationId: input.evaluationId,
        driveVideosFolderId: input.driveVideosFolderId,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: String(input.sizeBytes),
      });

      return { resumableSessionUrl };
    } catch (error) {
      const maybeError = error as {
        code?: number | string;
        response?: { status?: number; data?: unknown };
        message?: string;
      };
      this.logger.error({
        message: 'Fallo la creacion de sesion resumable para grabacion',
        classEventId: input.classEventId,
        evaluationId: input.evaluationId,
        driveVideosFolderId: input.driveVideosFolderId,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: String(input.sizeBytes),
        status: maybeError.response?.status ?? maybeError.code ?? null,
        error: maybeError.message || String(error),
      });
      if (error instanceof BadGatewayException) {
        throw error;
      }
      throw new BadGatewayException(
        'No se pudo crear la sesión resumable en Google Drive',
      );
    }
  }

  private async getDriveClient(): Promise<GoogleRequestClient> {
    if (this.driveClientPromise === null) {
      this.driveClientPromise = this.initDriveClient();
    }
    return this.driveClientPromise;
  }

  private async initDriveClient(): Promise<GoogleRequestClient> {
    const keyFile = this.configService.get<string>(
      'GOOGLE_APPLICATION_CREDENTIALS',
      '',
    );
    if (!keyFile) {
      throw new InternalServerErrorException(
        'Falta GOOGLE_APPLICATION_CREDENTIALS en configuración',
      );
    }

    const auth = new GoogleAuth({
      keyFile,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    const client = await auth.getClient();
    const requestClient = client as unknown as GoogleRequestClient;
    if (typeof requestClient.request !== 'function') {
      throw new InternalServerErrorException('Cliente de Google Drive inválido');
    }
    return requestClient;
  }
}

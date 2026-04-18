import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
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
  headers?:
    | Record<string, string | string[] | undefined>
    | { get?: (name: string) => string | null | undefined };
};

interface GoogleRequestClient {
  request<T = unknown>(request: GoogleRequest): Promise<GoogleResponse<T>>;
}

export type DriveUploadedFileMetadata = {
  fileId: string;
  name: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  parents: string[];
  webViewLink: string | null;
  trashed: boolean;
};

type DriveContentRestrictionUpdateResponse = {
  id?: string;
  copyRequiresWriterPermission?: boolean;
};

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
  }): Promise<{ resumableSessionUrl: string; fileId: string | null }> {
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

      const resumableSessionUrl = this.extractHeaderValue(
        response.headers,
        'location',
      );

      if (!resumableSessionUrl) {
        const headerKeys =
          response.headers &&
          typeof response.headers === 'object' &&
          !('get' in response.headers)
            ? Object.keys(response.headers)
            : [];
        throw new BadGatewayException(
          `Google Drive no devolvio una sesion resumable valida${
            headerKeys.length ? ` (headers: ${headerKeys.join(',')})` : ''
          }`,
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

      const driveFileId = String(response.data?.id || '').trim() || null;

      return {
        resumableSessionUrl,
        fileId: driveFileId,
      };
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
        'No se pudo crear la sesion resumable en Google Drive',
      );
    }
  }

  async getUploadedFileMetadata(
    fileId: string,
  ): Promise<DriveUploadedFileMetadata> {
    const normalizedFileId = String(fileId || '').trim();
    if (!normalizedFileId) {
      throw new NotFoundException('FileId de Drive invalido');
    }

    const client = await this.getDriveClient();

    try {
      const response = await client.request<{
        id?: string;
        name?: string;
        mimeType?: string;
        size?: string;
        parents?: string[];
        webViewLink?: string;
        trashed?: boolean;
      }>({
        url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(normalizedFileId)}?fields=id,name,mimeType,size,parents,webViewLink,trashed&supportsAllDrives=true`,
        method: 'GET',
      });

      const file = response.data || {};
      return {
        fileId: String(file.id || normalizedFileId).trim(),
        name: String(file.name || '').trim() || null,
        mimeType: String(file.mimeType || '').trim() || null,
        sizeBytes: this.parseSizeBytes(file.size),
        parents: Array.isArray(file.parents)
          ? file.parents
              .map((parentId) => String(parentId || '').trim())
              .filter(Boolean)
          : [],
        webViewLink: String(file.webViewLink || '').trim() || null,
        trashed: Boolean(file.trashed),
      };
    } catch (error) {
      const maybeError = error as {
        code?: number | string;
        response?: { status?: number; data?: unknown };
        message?: string;
      };
      const status = maybeError.response?.status ?? maybeError.code ?? null;
      this.logger.error({
        message:
          'Fallo la verificacion de metadata del archivo en Google Drive',
        fileId: normalizedFileId,
        status,
        error: maybeError.message || String(error),
      });
      if (status === 404) {
        throw new NotFoundException(
          'Archivo de grabacion no encontrado en Drive',
        );
      }
      throw new BadGatewayException(
        'No se pudo verificar el archivo subido en Google Drive',
      );
    }
  }

  async deleteUploadedFile(fileId: string): Promise<void> {
    const normalizedFileId = String(fileId || '').trim();
    if (!normalizedFileId) {
      return;
    }

    const client = await this.getDriveClient();
    try {
      await client.request({
        url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(normalizedFileId)}?supportsAllDrives=true`,
        method: 'DELETE',
      });
      this.logger.log({
        message: 'Archivo de grabacion eliminado de Google Drive',
        fileId: normalizedFileId,
      });
    } catch (error) {
      const maybeError = error as {
        code?: number | string;
        response?: { status?: number; data?: unknown };
        message?: string;
      };
      const status = maybeError.response?.status ?? maybeError.code ?? null;
      if (status === 404) {
        this.logger.warn({
          message:
            'Archivo de grabacion no encontrado al intentar cleanup en Drive; se considera eliminado',
          fileId: normalizedFileId,
        });
        return;
      }
      this.logger.error({
        message: 'Fallo el cleanup del archivo de grabacion en Google Drive',
        fileId: normalizedFileId,
        status,
        error: maybeError.message || String(error),
      });
      throw new BadGatewayException(
        'No se pudo eliminar el archivo de grabacion en Google Drive',
      );
    }
  }

  async enforceNoCopyForViewers(fileId: string): Promise<void> {
    const normalizedFileId = String(fileId || '').trim();
    if (!normalizedFileId) {
      throw new NotFoundException('FileId de Drive invalido');
    }

    const client = await this.getDriveClient();
    try {
      const response =
        await client.request<DriveContentRestrictionUpdateResponse>({
          url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(normalizedFileId)}?supportsAllDrives=true&fields=id,copyRequiresWriterPermission`,
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json; charset=UTF-8',
          },
          data: {
            copyRequiresWriterPermission: true,
          },
        });

      const enforced = Boolean(response.data?.copyRequiresWriterPermission);
      if (!enforced) {
        throw new BadGatewayException(
          'Google Drive no confirmo la restriccion de copia/descarga para viewers',
        );
      }
      this.logger.log({
        message: 'Restricciones de viewers aplicadas a grabacion',
        fileId: normalizedFileId,
        copyRequiresWriterPermission: true,
      });
    } catch (error) {
      const maybeError = error as {
        code?: number | string;
        response?: { status?: number; data?: unknown };
        message?: string;
      };
      const status = maybeError.response?.status ?? maybeError.code ?? null;
      this.logger.error({
        message:
          'Fallo al aplicar restriccion de copia/descarga para viewers en Drive',
        fileId: normalizedFileId,
        status,
        error: maybeError.message || String(error),
      });
      if (status === 404) {
        throw new NotFoundException(
          'Archivo de grabacion no encontrado en Drive',
        );
      }
      if (error instanceof BadGatewayException) {
        throw error;
      }
      throw new BadGatewayException(
        'No se pudo endurecer permisos del archivo de grabacion en Drive',
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
        'Falta GOOGLE_APPLICATION_CREDENTIALS en configuracion',
      );
    }

    const auth = new GoogleAuth({
      keyFile,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    const client = await auth.getClient();
    const requestClient = client as unknown as GoogleRequestClient;
    if (typeof requestClient.request !== 'function') {
      throw new InternalServerErrorException(
        'Cliente de Google Drive invalido',
      );
    }
    return requestClient;
  }

  private parseSizeBytes(sizeRaw: string | undefined): number | null {
    const normalized = String(sizeRaw || '').trim();
    if (!normalized) {
      return null;
    }
    const parsed = Number.parseInt(normalized, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private extractHeaderValue(
    headers: GoogleResponse<unknown>['headers'],
    headerName: string,
  ): string {
    if (!headers) {
      return '';
    }

    if (
      typeof headers === 'object' &&
      'get' in headers &&
      typeof headers.get === 'function'
    ) {
      const getHeader = headers.get.bind(headers);
      const value =
        getHeader(headerName) ?? getHeader(headerName.toLowerCase());
      return String(value || '').trim();
    }

    const record = headers as Record<string, string | string[] | undefined>;
    const directValue =
      record[headerName] ??
      record[headerName.toLowerCase()] ??
      record[headerName.toUpperCase()] ??
      record.Location ??
      record.LOCATION;

    return Array.isArray(directValue)
      ? String(directValue[0] || '').trim()
      : String(directValue || '').trim();
  }
}

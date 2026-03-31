import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuth } from 'google-auth-library';

type DriveFolderLookupResponse = {
  id?: string;
  name?: string;
  mimeType?: string;
  trashed?: boolean;
};

type DriveFolderSearchResponse = {
  files?: Array<{ id: string }>;
};

type DriveFolderCreateResponse = {
  id?: string;
};

type DrivePermission = {
  id?: string;
  type?: string;
  role?: string;
  emailAddress?: string;
};

type DrivePermissionsListResponse = {
  permissions?: DrivePermission[];
  nextPageToken?: string;
};

type GoogleRequestMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

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

const DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

@Injectable()
export class DriveScopeProvisioningService {
  private readonly logger = new Logger(DriveScopeProvisioningService.name);
  private driveClientPromise: Promise<GoogleRequestClient> | null = null;

  constructor(private readonly configService: ConfigService) {}

  async provisionFolders(input: {
    parentFolderNames?: string[];
    baseFolderName: string;
    videosFolderName: string;
    documentsFolderName: string;
    archivedFolderName: string;
  }): Promise<{
    scopeFolderId: string;
    videosFolderId: string;
    documentsFolderId: string;
    archivedFolderId: string;
  }> {
    const rootFolderId = this.getRootFolderId();
    await this.validateRootFolder();

    const parentChain = this.normalizeFolderNames(
      input.parentFolderNames || [],
    );
    let baseParentFolderId = rootFolderId;
    for (const parentName of parentChain) {
      baseParentFolderId = await this.findOrCreateDriveFolderUnderParent(
        baseParentFolderId,
        parentName,
      );
    }

    const scopeFolderId = await this.findOrCreateDriveFolderUnderParent(
      baseParentFolderId,
      input.baseFolderName,
    );
    const videosFolderId = await this.findOrCreateDriveFolderUnderParent(
      scopeFolderId,
      input.videosFolderName,
    );
    const documentsFolderId = await this.findOrCreateDriveFolderUnderParent(
      scopeFolderId,
      input.documentsFolderName,
    );
    const archivedFolderId = await this.findOrCreateDriveFolderUnderParent(
      scopeFolderId,
      input.archivedFolderName,
    );

    return {
      scopeFolderId,
      videosFolderId,
      documentsFolderId,
      archivedFolderId,
    };
  }

  async ensureGroupReaderPermission(
    folderId: string,
    groupEmail: string,
  ): Promise<void> {
    await this.ensureGroupPermission(folderId, groupEmail, 'reader');
  }

  async ensureGroupWriterPermission(
    folderId: string,
    groupEmail: string,
  ): Promise<void> {
    await this.ensureGroupPermission(folderId, groupEmail, 'writer');
  }

  private async ensureGroupPermission(
    folderId: string,
    groupEmail: string,
    role: 'reader' | 'writer',
  ): Promise<void> {
    const normalizedGroupEmail = groupEmail.trim().toLowerCase();
    const permissions = await this.listPermissions(folderId);
    const existingPermission = permissions.find(
      (permission) =>
        permission.type === 'group' &&
        (permission.emailAddress || '').toLowerCase() === normalizedGroupEmail,
    );
    if (existingPermission) {
      return;
    }

    try {
      const client = await this.getDriveClient();
      await client.request({
        url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}/permissions?supportsAllDrives=true&sendNotificationEmail=false`,
        method: 'POST',
        data: {
          type: 'group',
          role,
          emailAddress: normalizedGroupEmail,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      const status = this.getStatusFromError(error);
      if (status !== 409) {
        throw error;
      }
      return;
    }

    this.logger.log({
      message: 'Permiso de grupo aplicado en carpeta Drive',
      folderId,
      groupEmail: normalizedGroupEmail,
      role,
    });
  }

  async findOrCreateDriveFolderUnderParent(
    parentFolderId: string,
    folderName: string,
  ): Promise<string> {
    const client = await this.getDriveClient();
    const query = `'${parentFolderId}' in parents and name='${folderName}' and mimeType='${DRIVE_FOLDER_MIME_TYPE}' and trashed=false`;
    const searchResponse = await client.request<DriveFolderSearchResponse>({
      url: `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)&pageSize=2&supportsAllDrives=true&includeItemsFromAllDrives=true`,
      method: 'GET',
    });

    const matchedFolders = searchResponse.data.files || [];
    if (matchedFolders.length === 1) {
      return matchedFolders[0].id;
    }
    if (matchedFolders.length > 1) {
      throw new InternalServerErrorException(
        `Nombre de carpeta ambiguo bajo el mismo padre: ${folderName}`,
      );
    }

    try {
      const createResponse = await client.request<DriveFolderCreateResponse>({
        url: 'https://www.googleapis.com/drive/v3/files?supportsAllDrives=true',
        method: 'POST',
        data: {
          name: folderName,
          mimeType: DRIVE_FOLDER_MIME_TYPE,
          parents: [parentFolderId],
        },
        headers: { 'Content-Type': 'application/json' },
      });

      const payload = createResponse.data;
      if (!payload.id) {
        throw new InternalServerErrorException(
          `Google Drive no devolvió ID de carpeta ${folderName}`,
        );
      }
      return payload.id;
    } catch (error) {
      const status = this.getStatusFromError(error);
      if (status !== 409) {
        throw error;
      }
      const retrySearch = await client.request<DriveFolderSearchResponse>({
        url: `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)&pageSize=2&supportsAllDrives=true&includeItemsFromAllDrives=true`,
        method: 'GET',
      });
      const retryMatches = retrySearch.data.files || [];
      if (retryMatches.length === 1) {
        return retryMatches[0].id;
      }
      throw new InternalServerErrorException(
        `Conflicto al crear carpeta ${folderName} y no fue posible resolver estado final`,
      );
    }
  }

  async getDriveFolderMetadata(folderId: string): Promise<{
    id: string;
    name: string;
    mimeType: string;
    trashed: boolean;
  }> {
    const normalizedFolderId = String(folderId || '').trim();
    if (!normalizedFolderId) {
      throw new InternalServerErrorException('folderId invalido para Drive');
    }

    const client = await this.getDriveClient();
    const response = await client.request<DriveFolderLookupResponse>({
      url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(normalizedFolderId)}?fields=id,name,mimeType,trashed&supportsAllDrives=true`,
      method: 'GET',
    });

    return {
      id: String(response.data.id || ''),
      name: String(response.data.name || ''),
      mimeType: String(response.data.mimeType || ''),
      trashed: Boolean(response.data.trashed),
    };
  }

  getRootFolderId(): string {
    const rootFolderId = (
      this.configService.get<string>('GOOGLE_DRIVE_ROOT_FOLDER_ID', '') || ''
    ).trim();
    if (!rootFolderId) {
      throw new InternalServerErrorException(
        'Falta GOOGLE_DRIVE_ROOT_FOLDER_ID en configuración',
      );
    }
    return rootFolderId;
  }

  async validateRootFolder(): Promise<void> {
    const client = await this.getDriveClient();
    const folderId = this.getRootFolderId();
    const response = await client.request<DriveFolderLookupResponse>({
      url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,mimeType,trashed&supportsAllDrives=true`,
      method: 'GET',
    });
    const payload = response.data;

    if (!payload.id) {
      throw new InternalServerErrorException(
        'GOOGLE_DRIVE_ROOT_FOLDER_ID inválido: no existe',
      );
    }
    if (payload.mimeType !== DRIVE_FOLDER_MIME_TYPE) {
      throw new InternalServerErrorException(
        'GOOGLE_DRIVE_ROOT_FOLDER_ID debe apuntar a carpeta',
      );
    }
    if (payload.trashed) {
      throw new InternalServerErrorException(
        'GOOGLE_DRIVE_ROOT_FOLDER_ID apunta a carpeta en papelera',
      );
    }
  }

  private getDriveClient(): Promise<GoogleRequestClient> {
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
      throw new InternalServerErrorException(
        'Cliente de Google Drive inválido',
      );
    }
    return requestClient;
  }

  private async listPermissions(folderId: string): Promise<DrivePermission[]> {
    const client = await this.getDriveClient();
    const allPermissions: DrivePermission[] = [];
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams({
        fields: 'permissions(id,type,role,emailAddress),nextPageToken',
        supportsAllDrives: 'true',
      });
      if (pageToken) {
        params.set('pageToken', pageToken);
      }
      const response = await client.request<DrivePermissionsListResponse>({
        url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}/permissions?${params.toString()}`,
        method: 'GET',
      });

      const permissions = response.data.permissions || [];
      allPermissions.push(...permissions);
      pageToken = response.data.nextPageToken;
    } while (pageToken);

    return allPermissions;
  }

  private normalizeFolderNames(folderNames: string[]): string[] {
    return folderNames
      .map((name) => String(name || '').trim())
      .filter((name) => name.length > 0);
  }

  private getStatusFromError(error: unknown): number | undefined {
    const maybeError = error as {
      code?: number;
      response?: { status?: number };
    };
    return maybeError.response?.status ?? maybeError.code;
  }
}

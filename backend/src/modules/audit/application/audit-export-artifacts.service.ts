import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { technicalSettings } from '@config/technical-settings';
import { AUDIT_EXCEL_CONFIG } from '@modules/audit/interfaces/audit.constants';
import archiver, { Archiver, ArchiverOptions } from 'archiver';
import * as fs from 'fs';
import * as path from 'path';

type AuditArtifactFileRef = {
  fileName: string;
  filePath: string;
  storageKey: string;
};

@Injectable()
export class AuditExportArtifactsService implements OnModuleInit {
  private readonly rootPath: string;
  private readonly tempPath: string;
  private readonly artifactPath: string;

  constructor(private readonly configService: ConfigService) {
    const storagePath = this.configService.get<string>(
      'STORAGE_PATH',
      technicalSettings.uploads.storage.storagePathFallback,
    );

    this.rootPath = path.join(storagePath, 'audit-exports');
    this.tempPath = path.join(this.rootPath, 'temp');
    this.artifactPath = path.join(this.rootPath, 'artifacts');
  }

  async onModuleInit(): Promise<void> {
    await Promise.all([
      fs.promises.mkdir(this.tempPath, { recursive: true }),
      fs.promises.mkdir(this.artifactPath, { recursive: true }),
    ]);
  }

  buildSyncFileName(now: Date): string {
    return `reporte-auditoria_${this.formatTimestamp(now)}.xlsx`;
  }

  buildAsyncZipName(now: Date): string {
    return `reporte-auditoria-masivo_${this.formatTimestamp(now)}.zip`;
  }

  buildAsyncPartFileName(index: number, total: number): string {
    return `reporte-auditoria_parte-${String(index).padStart(3, '0')}_de-${String(total).padStart(3, '0')}.xlsx`;
  }

  async createSyncTempFile(fileName: string): Promise<string> {
    await fs.promises.mkdir(this.tempPath, { recursive: true });
    return path.join(this.tempPath, `${Date.now()}-${fileName}`);
  }

  async createWorkspace(jobId: string): Promise<string> {
    const workspace = path.join(this.tempPath, `${jobId}-${Date.now()}`);
    await fs.promises.mkdir(workspace, { recursive: true });
    return workspace;
  }

  async reserveArtifact(fileName: string): Promise<AuditArtifactFileRef> {
    await fs.promises.mkdir(this.artifactPath, { recursive: true });
    const storageKey = `${Date.now()}-${fileName}`;
    return {
      fileName,
      storageKey,
      filePath: path.join(this.artifactPath, storageKey),
    };
  }

  getArtifactPath(storageKey: string): string {
    return path.join(this.artifactPath, storageKey);
  }

  async assertArtifactExists(storageKey: string): Promise<string> {
    const filePath = this.getArtifactPath(storageKey);
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return filePath;
    } catch {
      throw new NotFoundException('El artefacto temporal ya no existe');
    }
  }

  createReadStream(filePath: string): NodeJS.ReadableStream {
    return fs.createReadStream(filePath);
  }

  async deleteFileIfExists(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async deleteArtifactByStorageKey(storageKey?: string | null): Promise<void> {
    if (!storageKey) {
      return;
    }

    await this.deleteFileIfExists(this.getArtifactPath(storageKey));
  }

  async deleteDirectoryIfExists(directoryPath: string): Promise<void> {
    try {
      await fs.promises.rm(directoryPath, {
        recursive: true,
        force: true,
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async zipFiles(
    sourceFiles: Array<{ filePath: string; entryName: string }>,
    destinationPath: string,
  ): Promise<void> {
    if (!sourceFiles.length) {
      throw new InternalServerErrorException(
        'No hay archivos para empaquetar en el zip de auditoria',
      );
    }

    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(destinationPath);
      const createArchiver = archiver as unknown as (
        format: string,
        options?: ArchiverOptions,
      ) => Archiver;
      const archive = createArchiver('zip', {
        zlib: { level: 9 },
      });

      output.on('close', resolve);
      output.on('error', reject);
      archive.on('error', reject);
      archive.pipe(output);

      for (const file of sourceFiles) {
        archive.file(file.filePath, { name: file.entryName });
      }

      void archive.finalize().catch(reject);
    });
  }

  private formatTimestamp(now: Date): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: AUDIT_EXCEL_CONFIG.TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const get = (type: Intl.DateTimeFormatPartTypes): string =>
      parts.find((part) => part.type === type)?.value ?? '00';
    const year = get('year');
    const month = get('month');
    const day = get('day');
    const hour = get('hour');
    const minute = get('minute');
    const second = get('second');

    return `${year}-${month}-${day}_${hour}-${minute}-${second}`;
  }
}

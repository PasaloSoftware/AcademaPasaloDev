import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@src/app.module';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { GoogleAuth } from 'google-auth-library';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { MEDIA_ACCESS_DRIVE_FOLDERS } from '@modules/media-access/domain/media-access.constants';
import { STORAGE_PROVIDER_CODES } from '@modules/materials/domain/material.constants';

type GoogleRequestMethod = 'GET';
type GoogleRequest = {
  url: string;
  method: GoogleRequestMethod;
};
type GoogleResponse<T> = { data: T };

interface GoogleRequestClient {
  request<T = unknown>(request: GoogleRequest): Promise<GoogleResponse<T>>;
}

type DriveFile = {
  id?: string;
  name?: string;
  mimeType?: string;
  size?: string;
  webViewLink?: string;
};

type DriveListResponse = {
  files?: DriveFile[];
};

type CourseCycleRow = {
  courseCycleId: string | number;
  courseCode: string;
  cycleCode: string;
};

type BankLeafWithFiles = {
  typeFolderName: string;
  leafFolderName: string;
  files: Array<{
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    viewUrl: string;
  }>;
};

const BANK_FOLDER_NAME = 'bank_documents';
const BANK_TYPE_FOLDERS = [
  'Practicas Calificadas',
  'Practicas Dirigidas',
  'Examenes',
];

function escapeSql(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "''");
}

function toSqlString(value: string): string {
  return `'${escapeSql(value)}'`;
}

function normalizeDriveName(value: string): string {
  return String(value || '')
    .replace(/[\r\n\t]/g, ' ')
    .trim();
}

function normalizeNumericId(raw: string | number): string {
  const normalized = String(raw || '').trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`ID invalido detectado: ${raw}`);
  }
  return normalized;
}

async function getDriveClient(configService: ConfigService): Promise<{
  client: GoogleRequestClient;
  rootFolderId: string;
}> {
  const keyFile = String(
    configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS', '') || '',
  ).trim();
  const rootFolderId = String(
    configService.get<string>('GOOGLE_DRIVE_ROOT_FOLDER_ID', '') || '',
  ).trim();

  if (!keyFile) {
    throw new Error('Falta GOOGLE_APPLICATION_CREDENTIALS');
  }
  if (!rootFolderId) {
    throw new Error('Falta GOOGLE_DRIVE_ROOT_FOLDER_ID');
  }

  const auth = new GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  const client = (await auth.getClient()) as unknown as GoogleRequestClient;
  if (typeof client.request !== 'function') {
    throw new Error('Cliente Google Drive invalido');
  }

  return { client, rootFolderId };
}

async function listFoldersInParent(
  client: GoogleRequestClient,
  parentFolderId: string,
): Promise<Array<{ id: string; name: string }>> {
  const query = `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const response = await client.request<DriveListResponse>({
    url: `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    method: 'GET',
  });
  const files = response.data.files || [];
  return files
    .map((file) => ({
      id: String(file.id || '').trim(),
      name: normalizeDriveName(String(file.name || '')),
    }))
    .filter((file) => !!file.id && !!file.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function listFilesInParent(
  client: GoogleRequestClient,
  parentFolderId: string,
): Promise<
  Array<{
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    viewUrl: string;
  }>
> {
  const query = `'${parentFolderId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`;
  const response = await client.request<DriveListResponse>({
    url: `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,webViewLink)&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    method: 'GET',
  });
  const files = response.data.files || [];
  return files
    .map((file) => {
      const id = String(file.id || '').trim();
      const name = normalizeDriveName(String(file.name || ''));
      const mimeType = String(file.mimeType || '').trim();
      const parsedSize = Number.parseInt(String(file.size || ''), 10);
      const sizeBytes = Number.isFinite(parsedSize) && parsedSize > 0 ? parsedSize : 1;
      const viewUrl =
        String(file.webViewLink || '').trim() ||
        `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;
      return { id, name, mimeType, sizeBytes, viewUrl };
    })
    .filter((file) => !!file.id && !!file.name && !!file.mimeType)
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function findFolderByName(
  client: GoogleRequestClient,
  parentFolderId: string,
  folderName: string,
): Promise<string | null> {
  const escapedName = folderName.replace(/'/g, "\\'");
  const query = `'${parentFolderId}' in parents and name='${escapedName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const response = await client.request<DriveListResponse>({
    url: `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=2&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    method: 'GET',
  });
  const files = response.data.files || [];
  if (files.length === 0) {
    return null;
  }
  if (files.length > 1) {
    throw new Error(
      `Ambiguedad: mas de una carpeta "${folderName}" bajo parent=${parentFolderId}`,
    );
  }
  return String(files[0].id || '').trim() || null;
}

async function getActiveCourseCycles(dataSource: DataSource): Promise<CourseCycleRow[]> {
  const rows = (await dataSource.query(
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
      ORDER BY cc.id ASC
    `,
  )) as CourseCycleRow[];

  return rows;
}

function buildBancoEvaluationSubquery(courseCycleId: string): string {
  return `(
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = ${courseCycleId}
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )`;
}

function buildTypeFolderSubquery(
  bancoEvaluationSubquery: string,
  typeFolderName: string,
): string {
  return `(
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = ${bancoEvaluationSubquery}
      AND mf.parent_folder_id IS NULL
      AND mf.name = ${toSqlString(typeFolderName)}
    ORDER BY mf.id ASC
    LIMIT 1
  )`;
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const dataSource = app.get(DataSource);
    const configService = app.get(ConfigService);
    const cycles = await getActiveCourseCycles(dataSource);
    if (!cycles.length) {
      throw new Error('No hay course_cycle activos');
    }

    const { client: driveClient, rootFolderId } = await getDriveClient(configService);
    const courseCyclesParentFolderId = await findFolderByName(
      driveClient,
      rootFolderId,
      MEDIA_ACCESS_DRIVE_FOLDERS.COURSE_CYCLES_PARENT,
    );
    if (!courseCyclesParentFolderId) {
      throw new Error(
        `No existe carpeta ${MEDIA_ACCESS_DRIVE_FOLDERS.COURSE_CYCLES_PARENT} en root`,
      );
    }

    const lines: string[] = [];
    lines.push('-- Seed SQL: banco de enunciados con archivos de Google Drive');
    lines.push('-- Generado automaticamente desde estado actual de Drive + BD');
    lines.push('SET NAMES utf8mb4;');
    lines.push('SET @actor_user_id = 1;');
    lines.push(
      "SET @folder_status_active = (SELECT id FROM folder_status WHERE code = 'ACTIVE' LIMIT 1);",
    );
    lines.push(
      "SET @material_status_active = (SELECT id FROM material_status WHERE code = 'ACTIVE' LIMIT 1);",
    );
    lines.push(
      "SET @evaluation_type_banco = (SELECT id FROM evaluation_type WHERE code = 'BANCO_ENUNCIADOS' LIMIT 1);",
    );
    lines.push('');

    let totalFiles = 0;
    let totalLeafFolders = 0;

    for (const cycle of cycles) {
      const courseCycleId = normalizeNumericId(cycle.courseCycleId);
      const ccFolderId = await findFolderByName(
        driveClient,
        courseCyclesParentFolderId,
        `cc_${courseCycleId}`,
      );
      if (!ccFolderId) {
        throw new Error(`No existe carpeta Drive cc_${courseCycleId}`);
      }
      const bankFolderId = await findFolderByName(
        driveClient,
        ccFolderId,
        BANK_FOLDER_NAME,
      );
      if (!bankFolderId) {
        throw new Error(`No existe carpeta ${BANK_FOLDER_NAME} en cc_${courseCycleId}`);
      }

      const typeFolders = await listFoldersInParent(driveClient, bankFolderId);
      const selectedTypeFolders = typeFolders.filter((folder) =>
        BANK_TYPE_FOLDERS.includes(folder.name),
      );

      if (selectedTypeFolders.length === 0) {
        throw new Error(`No se encontraron carpetas de tipo de banco en cc_${courseCycleId}`);
      }

      lines.push(
        `-- course_cycle ${courseCycleId} (${String(cycle.courseCode || '').trim()} - ${String(cycle.cycleCode || '').trim()})`,
      );
      lines.push(
        `INSERT INTO evaluation (course_cycle_id, evaluation_type_id, number, start_date, end_date)`,
      );
      lines.push('SELECT');
      lines.push(`  ${courseCycleId},`);
      lines.push('  @evaluation_type_banco,');
      lines.push('  0,');
      lines.push(
        `  (SELECT ac.start_date FROM academic_cycle ac INNER JOIN course_cycle cc ON cc.academic_cycle_id = ac.id WHERE cc.id = ${courseCycleId} LIMIT 1),`,
      );
      lines.push(
        `  (SELECT ac.end_date FROM academic_cycle ac INNER JOIN course_cycle cc ON cc.academic_cycle_id = ac.id WHERE cc.id = ${courseCycleId} LIMIT 1)`,
      );
      lines.push('WHERE NOT EXISTS (');
      lines.push('  SELECT 1 FROM evaluation e');
      lines.push(
        '  WHERE e.course_cycle_id = ' +
          courseCycleId +
          ' AND e.evaluation_type_id = @evaluation_type_banco AND e.number = 0',
      );
      lines.push(');');
      lines.push('');

      const bancoEvaluationSubquery = buildBancoEvaluationSubquery(courseCycleId);

      const leafRows: BankLeafWithFiles[] = [];
      for (const typeFolder of selectedTypeFolders) {
        const leafFolders = await listFoldersInParent(driveClient, typeFolder.id);
        for (const leafFolder of leafFolders) {
          const files = await listFilesInParent(driveClient, leafFolder.id);
          leafRows.push({
            typeFolderName: typeFolder.name,
            leafFolderName: leafFolder.name,
            files,
          });
          totalLeafFolders += 1;
          totalFiles += files.length;
        }
      }

      for (const typeFolderName of BANK_TYPE_FOLDERS) {
        lines.push(
          `INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)`,
        );
        lines.push('SELECT');
        lines.push(`  ${bancoEvaluationSubquery},`);
        lines.push('  NULL,');
        lines.push('  @folder_status_active,');
        lines.push(`  ${toSqlString(typeFolderName)},`);
        lines.push('  NULL, NULL, @actor_user_id, NOW(), NOW()');
        lines.push('WHERE NOT EXISTS (');
        lines.push('  SELECT 1');
        lines.push('  FROM material_folder mf');
        lines.push(`  WHERE mf.evaluation_id = ${bancoEvaluationSubquery}`);
        lines.push('    AND mf.parent_folder_id IS NULL');
        lines.push(`    AND mf.name = ${toSqlString(typeFolderName)}`);
        lines.push(');');
        lines.push('');
      }

      for (const leaf of leafRows) {
        const typeFolderSubquery = buildTypeFolderSubquery(
          bancoEvaluationSubquery,
          leaf.typeFolderName,
        );

        lines.push(
          `INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)`,
        );
        lines.push('SELECT');
        lines.push(`  ${bancoEvaluationSubquery},`);
        lines.push(`  ${typeFolderSubquery},`);
        lines.push('  @folder_status_active,');
        lines.push(`  ${toSqlString(leaf.leafFolderName)},`);
        lines.push('  NULL, NULL, @actor_user_id, NOW(), NOW()');
        lines.push('WHERE NOT EXISTS (');
        lines.push('  SELECT 1');
        lines.push('  FROM material_folder mf');
        lines.push(`  WHERE mf.evaluation_id = ${bancoEvaluationSubquery}`);
        lines.push(`    AND mf.parent_folder_id = ${typeFolderSubquery}`);
        lines.push(`    AND mf.name = ${toSqlString(leaf.leafFolderName)}`);
        lines.push(');');
        lines.push('');

        const leafFolderSubquery = `(
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = ${bancoEvaluationSubquery}
            AND mf.parent_folder_id = ${typeFolderSubquery}
            AND mf.name = ${toSqlString(leaf.leafFolderName)}
          ORDER BY mf.id ASC
          LIMIT 1
        )`;

        for (const file of leaf.files) {
          const checksum = `gdrive-seed-${file.id}`;
          lines.push(
            'INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)',
          );
          lines.push('SELECT');
          lines.push(`  ${toSqlString(checksum)},`);
          lines.push(`  ${toSqlString(file.name)},`);
          lines.push(`  ${toSqlString(file.mimeType)},`);
          lines.push(`  ${file.sizeBytes},`);
          lines.push(`  ${toSqlString(STORAGE_PROVIDER_CODES.GDRIVE)},`);
          lines.push(`  ${toSqlString(file.id)},`);
          lines.push(`  ${toSqlString(file.viewUrl)},`);
          lines.push('  NOW()');
          lines.push('WHERE NOT EXISTS (');
          lines.push('  SELECT 1 FROM file_resource fr');
          lines.push(
            `  WHERE fr.storage_provider = ${toSqlString(STORAGE_PROVIDER_CODES.GDRIVE)} AND fr.storage_key = ${toSqlString(file.id)}`,
          );
          lines.push(');');
          lines.push('');

          lines.push(
            'INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)',
          );
          lines.push('SELECT');
          lines.push('  fr.id,');
          lines.push('  1,');
          lines.push(`  ${toSqlString(file.viewUrl)},`);
          lines.push('  NOW(),');
          lines.push('  @actor_user_id');
          lines.push('FROM file_resource fr');
          lines.push(
            `WHERE fr.storage_provider = ${toSqlString(STORAGE_PROVIDER_CODES.GDRIVE)} AND fr.storage_key = ${toSqlString(file.id)}`,
          );
          lines.push('  AND NOT EXISTS (');
          lines.push('    SELECT 1 FROM file_version fv');
          lines.push('    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1');
          lines.push('  );');
          lines.push('');

          lines.push(
            'INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)',
          );
          lines.push('SELECT');
          lines.push(`  ${leafFolderSubquery},`);
          lines.push('  NULL,');
          lines.push('  fr.id,');
          lines.push('  fv.id,');
          lines.push('  @material_status_active,');
          lines.push(`  ${toSqlString(file.name)},`);
          lines.push('  NULL, NULL, @actor_user_id, NOW(), NOW()');
          lines.push('FROM file_resource fr');
          lines.push('INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1');
          lines.push(
            `WHERE fr.storage_provider = ${toSqlString(STORAGE_PROVIDER_CODES.GDRIVE)} AND fr.storage_key = ${toSqlString(file.id)}`,
          );
          lines.push('  AND NOT EXISTS (');
          lines.push('    SELECT 1 FROM material m');
          lines.push(`    WHERE m.material_folder_id = ${leafFolderSubquery}`);
          lines.push('      AND m.file_resource_id = fr.id');
          lines.push('  );');
          lines.push('');
        }
      }
      lines.push('');
    }

    lines.push(`-- Summary: leafFolders=${totalLeafFolders}, files=${totalFiles}`);

    const outputPath = path.resolve(
      process.cwd(),
      'db',
      'datos_prueba_banco_enunciados_drive.sql',
    );
    await fs.writeFile(outputPath, `${lines.join('\n')}\n`, 'utf8');

    console.log(
      JSON.stringify(
        {
          outputPath,
          activeCourseCycles: cycles.length,
          bankLeafFolders: totalLeafFolders,
          bankFiles: totalFiles,
        },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
}

void main();

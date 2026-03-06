import 'reflect-metadata';
import { config as dotenvConfig } from 'dotenv';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@src/app.module';
import { DataSource } from 'typeorm';
import { JWT } from 'google-auth-library';
import * as fs from 'fs';

dotenvConfig();

type WorkspaceGroup = {
  id?: string;
  email?: string;
  name?: string;
};

type WorkspaceGroupsListResponse = {
  groups?: WorkspaceGroup[];
  nextPageToken?: string;
};

type ScriptOptions = {
  apply: boolean;
};

function parseArgs(argv: string[]): ScriptOptions {
  const raw = argv.slice(2).map((item) => String(item || '').trim());
  let apply = false;

  for (const arg of raw) {
    if (!arg) {
      continue;
    }
    if (arg === '--apply') {
      apply = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printUsageAndExit(0);
    }
    throw new Error(`Flag no soportado: ${arg}`);
  }

  return { apply };
}

function printUsageAndExit(code: number): never {
  console.log(`
Uso:
  npx ts-node -r tsconfig-paths/register scripts/cleanup-workspace-groups.ts [--apply]

Comportamiento:
  - Por defecto es DRY_RUN.
  - --apply elimina grupos ev-*-viewers fuera del set valido.
  - Siempre conserva el grupo staff configurado.
`);
  process.exit(code);
}

async function getWorkspaceJwt(config: ConfigService): Promise<JWT> {
  const keyFile = String(
    config.get<string>('GOOGLE_APPLICATION_CREDENTIALS', '') || '',
  ).trim();
  const adminEmail = String(
    config.get<string>('GOOGLE_WORKSPACE_ADMIN_EMAIL', '') || '',
  )
    .trim()
    .toLowerCase();

  if (!keyFile || !adminEmail) {
    throw new Error(
      'Faltan GOOGLE_APPLICATION_CREDENTIALS o GOOGLE_WORKSPACE_ADMIN_EMAIL',
    );
  }
  if (!fs.existsSync(keyFile)) {
    throw new Error(`No existe keyFile: ${keyFile}`);
  }

  const raw = await fs.promises.readFile(keyFile, 'utf8');
  const parsed = JSON.parse(raw) as { client_email?: string; private_key?: string };
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('Credenciales invalidas para Workspace');
  }

  const jwt = new JWT({
    email: parsed.client_email,
    key: parsed.private_key,
    scopes: [
      'https://www.googleapis.com/auth/admin.directory.group',
      'https://www.googleapis.com/auth/admin.directory.group.member',
    ],
    subject: adminEmail,
  });
  await jwt.authorize();
  return jwt;
}

async function listWorkspaceGroupsByDomain(
  jwt: JWT,
  domain: string,
): Promise<WorkspaceGroup[]> {
  const groups: WorkspaceGroup[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      domain,
      maxResults: '200',
    });
    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const response = await jwt.request<WorkspaceGroupsListResponse>({
      url: `https://admin.googleapis.com/admin/directory/v1/groups?${params.toString()}`,
      method: 'GET',
    });

    groups.push(...(response.data.groups || []));
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return groups;
}

async function deleteWorkspaceGroup(jwt: JWT, groupEmail: string): Promise<void> {
  await jwt.request({
    url: `https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(groupEmail)}`,
    method: 'DELETE',
  });
}

async function fetchValidEvaluationViewerGroups(
  dataSource: DataSource,
): Promise<Set<string>> {
  const rows = (await dataSource.query(
    `
    SELECT DISTINCT LOWER(TRIM(eda.viewer_group_email)) AS viewerGroupEmail
    FROM evaluation_drive_access eda
    INNER JOIN evaluation ev ON ev.id = eda.evaluation_id
    INNER JOIN course_cycle cc ON cc.id = ev.course_cycle_id
    WHERE eda.is_active = 1
      AND eda.viewer_group_email IS NOT NULL
      AND TRIM(eda.viewer_group_email) <> ''
      AND cc.academic_cycle_id = COALESCE(
        (
          SELECT CAST(ss.setting_value AS UNSIGNED)
          FROM system_setting ss
          WHERE ss.setting_key = 'ACTIVE_CYCLE_ID'
          LIMIT 1
        ),
        (
          SELECT ac.id
          FROM academic_cycle ac
          ORDER BY ac.id DESC
          LIMIT 1
        )
      )
    `,
  )) as Array<{ viewerGroupEmail: string | null }>;

  const result = new Set<string>();
  for (const row of rows) {
    const email = String(row.viewerGroupEmail || '').trim().toLowerCase();
    if (!email) {
      continue;
    }
    result.add(email);
  }
  return result;
}

function isEvaluationViewerGroup(email: string): boolean {
  return /^ev-\d+-viewers@/i.test(email);
}

async function main(): Promise<void> {
  let options: ScriptOptions;
  try {
    options = parseArgs(process.argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error de argumentos: ${message}`);
    printUsageAndExit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const config = app.get(ConfigService);
    const dataSource = app.get(DataSource);

    const workspaceDomain = String(
      config.get<string>('GOOGLE_WORKSPACE_GROUP_DOMAIN', '') || '',
    )
      .trim()
      .toLowerCase();
    const staffGroupEmail = String(
      config.get<string>('GOOGLE_WORKSPACE_STAFF_VIEWERS_GROUP_EMAIL', '') || '',
    )
      .trim()
      .toLowerCase();

    if (!workspaceDomain) {
      throw new Error('Falta GOOGLE_WORKSPACE_GROUP_DOMAIN');
    }
    if (!staffGroupEmail) {
      throw new Error('Falta GOOGLE_WORKSPACE_STAFF_VIEWERS_GROUP_EMAIL');
    }

    const validEvalGroups = await fetchValidEvaluationViewerGroups(dataSource);
    const keepSet = new Set<string>([staffGroupEmail, ...validEvalGroups]);

    const jwt = await getWorkspaceJwt(config);
    const workspaceGroups = await listWorkspaceGroupsByDomain(jwt, workspaceDomain);
    const normalizedGroups = workspaceGroups
      .map((group) => ({
        id: String(group.id || '').trim(),
        email: String(group.email || '').trim().toLowerCase(),
        name: String(group.name || '').trim(),
      }))
      .filter((group) => !!group.email);

    const evaluationViewerGroups = normalizedGroups.filter((group) =>
      isEvaluationViewerGroup(group.email),
    );
    const toDelete = evaluationViewerGroups.filter(
      (group) => !keepSet.has(group.email),
    );

    const mode = options.apply ? 'APPLY' : 'DRY_RUN';
    const summary = {
      mode,
      workspaceDomain,
      staffGroupEmail,
      validEvaluationGroupsInDb: validEvalGroups.size,
      evaluationViewerGroupsInWorkspace: evaluationViewerGroups.length,
      keepCount: evaluationViewerGroups.filter((group) => keepSet.has(group.email))
        .length,
      deleteCount: toDelete.length,
      deleteEmails: toDelete.map((group) => group.email),
    };
    console.log(JSON.stringify(summary, null, 2));

    if (!options.apply) {
      return;
    }

    for (const group of toDelete) {
      await deleteWorkspaceGroup(jwt, group.email);
      console.log(`[DELETED] ${group.email}`);
    }
  } finally {
    await app.close();
  }
}

void main();


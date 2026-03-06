import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@src/app.module';
import { DataSource } from 'typeorm';
import { WorkspaceGroupsService } from '@modules/media-access/application/workspace-groups.service';
import { ConfigService } from '@nestjs/config';
import { JWT } from 'google-auth-library';
import * as fs from 'fs';

type GroupRow = {
  evaluationId: string | number;
  viewerGroupEmail: string | null;
};

type WorkspaceGroup = {
  email?: string;
};

type WorkspaceGroupsListResponse = {
  groups?: WorkspaceGroup[];
  nextPageToken?: string;
};

const DEFAULT_TARGET_EMAILS = [
  'a20192393@pucp.edu.pe',
  'alumnopasalo@gmail.com',
];

async function getWorkspaceJwt(config: ConfigService): Promise<JWT> {
  const keyFile = String(
    config.get<string>('GOOGLE_APPLICATION_CREDENTIALS', '') || '',
  ).trim();
  const adminEmail = String(
    config.get<string>('GOOGLE_WORKSPACE_ADMIN_EMAIL', '') || '',
  ).trim();

  if (!keyFile || !adminEmail) {
    throw new Error(
      'Faltan GOOGLE_APPLICATION_CREDENTIALS o GOOGLE_WORKSPACE_ADMIN_EMAIL',
    );
  }
  if (!fs.existsSync(keyFile)) {
    throw new Error(`No existe archivo de credenciales: ${keyFile}`);
  }

  const raw = await fs.promises.readFile(keyFile, 'utf8');
  const parsed = JSON.parse(raw) as {
    client_email?: string;
    private_key?: string;
  };
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

async function listWorkspaceEvaluationGroups(
  jwt: JWT,
  domain: string,
): Promise<string[]> {
  const normalizedDomain = domain.trim().toLowerCase();
  const groups = new Set<string>();
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      domain: normalizedDomain,
      maxResults: '200',
    });
    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const response = await jwt.request<WorkspaceGroupsListResponse>({
      url: `https://admin.googleapis.com/admin/directory/v1/groups?${params.toString()}`,
      method: 'GET',
    });

    const current = response.data.groups || [];
    for (const group of current) {
      const email = String(group.email || '').trim().toLowerCase();
      if (!email) {
        continue;
      }
      if (/^ev-\d+-viewers@/.test(email)) {
        groups.add(email);
      }
    }
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return Array.from(groups.values());
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  try {
    const dataSource = app.get(DataSource);
    const workspaceGroupsService = app.get(WorkspaceGroupsService);
    const config = app.get(ConfigService);

    const userId = Number(process.argv[2] || '1');
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error('userId invalido');
    }

    const targetEmails = (process.argv.length > 3
      ? process.argv.slice(3)
      : DEFAULT_TARGET_EMAILS
    )
      .map((email) => String(email || '').trim().toLowerCase())
      .filter((email, index, arr) => !!email && arr.indexOf(email) === index);

    if (targetEmails.length === 0) {
      throw new Error('Debes indicar al menos un email objetivo');
    }

    const eligibleRows = (await dataSource.query(
      `
        SELECT DISTINCT
          ee.evaluation_id AS evaluationId,
          LOWER(TRIM(eda.viewer_group_email)) AS viewerGroupEmail
        FROM enrollment_evaluation ee
        INNER JOIN enrollment e
          ON e.id = ee.enrollment_id
        INNER JOIN enrollment_status es
          ON es.id = e.enrollment_status_id
        INNER JOIN evaluation_drive_access eda
          ON eda.evaluation_id = ee.evaluation_id
         AND eda.is_active = 1
        WHERE e.user_id = ?
          AND es.code = 'ACTIVE'
          AND e.cancelled_at IS NULL
          AND ee.is_active = 1
          AND ee.access_start_date <= NOW()
          AND ee.access_end_date >= NOW()
          AND eda.viewer_group_email IS NOT NULL
          AND TRIM(eda.viewer_group_email) <> ''
      `,
      [userId],
    )) as GroupRow[];

    const eligibleGroups = new Set<string>();
    for (const row of eligibleRows) {
      const groupEmail = String(row.viewerGroupEmail || '').trim().toLowerCase();
      if (groupEmail) {
        eligibleGroups.add(groupEmail);
      }
    }

    const workspaceDomain = String(
      config.get<string>('GOOGLE_WORKSPACE_GROUP_DOMAIN', '') || '',
    ).trim();
    if (!workspaceDomain) {
      throw new Error('Falta GOOGLE_WORKSPACE_GROUP_DOMAIN');
    }

    const jwt = await getWorkspaceJwt(config);
    const allEvalGroups = await listWorkspaceEvaluationGroups(jwt, workspaceDomain);

    let added = 0;
    let removed = 0;
    for (const groupEmail of allEvalGroups) {
      const shouldBeMember = eligibleGroups.has(groupEmail);
      for (const memberEmail of targetEmails) {
        if (shouldBeMember) {
          await workspaceGroupsService.ensureMemberInGroup({
            groupEmail,
            memberEmail,
          });
          added += 1;
        } else {
          await workspaceGroupsService.removeMemberFromGroup({
            groupEmail,
            memberEmail,
          });
          removed += 1;
        }
      }
    }

    console.log(
      JSON.stringify(
        {
          userId,
          targetEmails,
          eligibleGroupsCount: eligibleGroups.size,
          workspaceEvalGroupsCount: allEvalGroups.length,
          operationsAddOrEnsure: added,
          operationsRemoveOrEnsure: removed,
          eligibleGroups: Array.from(eligibleGroups.values()).sort(),
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

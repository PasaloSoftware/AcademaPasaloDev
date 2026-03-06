import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@src/app.module';
import { DataSource } from 'typeorm';
import { WorkspaceGroupsService } from '@modules/media-access/application/workspace-groups.service';
import { DriveScopeProvisioningService } from '@modules/media-access/application/drive-scope-provisioning.service';

type ScopeRow = {
  id: string | number;
  evaluationId: string | number;
  driveScopeFolderId: string | null;
};

type UserRow = {
  email: string | null;
};

function getStaffGroupEmail(): string {
  return String(process.env.GOOGLE_WORKSPACE_STAFF_VIEWERS_GROUP_EMAIL || '')
    .trim()
    .toLowerCase();
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.toLowerCase().includes('rate limit') ||
    message.toLowerCase().includes('user rate limit exceeded') ||
    message.toLowerCase().includes('quota')
  );
}

async function withRetry(
  task: () => Promise<void>,
  maxRetries: number,
  baseDelayMs: number,
): Promise<void> {
  let attempt = 0;
  while (true) {
    try {
      await task();
      return;
    } catch (error) {
      attempt += 1;
      if (attempt > maxRetries || !isRateLimitError(error)) {
        throw error;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
}

async function main(): Promise<void> {
  const staffGroupEmail = getStaffGroupEmail();
  if (!staffGroupEmail) {
    throw new Error('Falta GOOGLE_WORKSPACE_STAFF_VIEWERS_GROUP_EMAIL');
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const dataSource = app.get(DataSource);
    const workspaceGroupsService = app.get(WorkspaceGroupsService);
    const driveScopeProvisioningService = app.get(DriveScopeProvisioningService);

    const group = await workspaceGroupsService.findOrCreateGroup({
      email: staffGroupEmail,
      name: 'Staff viewers',
      description: 'Acceso viewer global para admins y superadmins',
    });

    const staffUsers = (await dataSource.query(
      `
      SELECT DISTINCT LOWER(TRIM(u.email)) AS email
      FROM user u
      INNER JOIN user_role ur ON ur.user_id = u.id
      INNER JOIN role r ON r.id = ur.role_id
      WHERE u.is_active = 1
        AND r.code IN ('ADMIN', 'SUPER_ADMIN')
        AND u.email IS NOT NULL
        AND TRIM(u.email) <> ''
      `,
    )) as UserRow[];

    let membersAddedOrEnsured = 0;
    for (const row of staffUsers) {
      const email = String(row.email || '').trim().toLowerCase();
      if (!email) {
        continue;
      }
      await workspaceGroupsService.ensureMemberInGroup({
        groupEmail: group.email,
        memberEmail: email,
      });
      membersAddedOrEnsured += 1;
    }

    const scopes = (await dataSource.query(
      `
      SELECT id, evaluation_id AS evaluationId, drive_scope_folder_id AS driveScopeFolderId
      FROM evaluation_drive_access
      WHERE is_active = 1
        AND drive_scope_folder_id IS NOT NULL
        AND TRIM(drive_scope_folder_id) <> ''
      ORDER BY id ASC
      `,
    )) as ScopeRow[];

    let scopesApplied = 0;
    const failures: Array<{ evaluationId: string; reason: string }> = [];
    for (const scope of scopes) {
      const folderId = String(scope.driveScopeFolderId || '').trim();
      if (!folderId) {
        continue;
      }
      try {
        await withRetry(
          async () => {
            await driveScopeProvisioningService.ensureGroupReaderPermission(
              folderId,
              group.email,
            );
          },
          5,
          2000,
        );
        scopesApplied += 1;
        await sleep(250);
      } catch (error) {
        failures.push({
          evaluationId: String(scope.evaluationId),
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log(
      JSON.stringify(
        {
          staffGroupEmail: group.email,
          expectedStaffMembers: staffUsers.length,
          membersAddedOrEnsured,
          activeScopes: scopes.length,
          scopesApplied,
          scopesFailed: failures.length,
          failures,
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

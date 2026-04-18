import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@src/app.module';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WorkspaceGroupsService } from '@modules/media-access/application/workspace-groups.service';
import { DriveScopeProvisioningService } from '@modules/media-access/application/drive-scope-provisioning.service';

type StaffUserRow = {
  email: string;
};

function requireRealRootAndOverrideRuntimeRoot(): string {
  const realRoot = String(process.env.GOOGLE_DRIVE_REAL_ROOT_FOLDER_ID || '').trim();
  if (!realRoot) {
    throw new Error('Falta GOOGLE_DRIVE_REAL_ROOT_FOLDER_ID');
  }
  process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = realRoot;
  return realRoot;
}

function requireStaffGroupEmail(configService: ConfigService): string {
  const email = String(
    configService.get<string>('GOOGLE_WORKSPACE_STAFF_VIEWERS_GROUP_EMAIL', '') || '',
  )
    .trim()
    .toLowerCase();
  if (!email) {
    throw new Error('Falta GOOGLE_WORKSPACE_STAFF_VIEWERS_GROUP_EMAIL');
  }
  return email;
}

function requireWorkspaceDomain(configService: ConfigService): string {
  const workspaceDomain = String(
    configService.get<string>('GOOGLE_WORKSPACE_GROUP_DOMAIN', '') || '',
  )
    .trim()
    .toLowerCase();
  if (!workspaceDomain) {
    throw new Error('Falta GOOGLE_WORKSPACE_GROUP_DOMAIN');
  }
  return workspaceDomain;
}

async function main(): Promise<void> {
  process.env.DISABLE_REPEAT_SCHEDULERS = '1';

  const realRoot = requireRealRootAndOverrideRuntimeRoot();
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const dataSource = app.get(DataSource);
    const configService = app.get(ConfigService);
    const workspaceGroupsService = app.get(WorkspaceGroupsService);
    const driveScopeProvisioningService = app.get(DriveScopeProvisioningService);

    const staffGroupEmail = requireStaffGroupEmail(configService);
    const workspaceDomain = requireWorkspaceDomain(configService);
    if (!staffGroupEmail.endsWith(`@${workspaceDomain}`)) {
      throw new Error(
        `GOOGLE_WORKSPACE_STAFF_VIEWERS_GROUP_EMAIL fuera de dominio permitido (${workspaceDomain})`,
      );
    }

    await driveScopeProvisioningService.validateRootFolder();
    const runtimeRoot = driveScopeProvisioningService.getRootFolderId();
    if (runtimeRoot !== realRoot) {
      throw new Error(
        `Guard rail: root runtime (${runtimeRoot}) no coincide con real (${realRoot})`,
      );
    }

    const staffUsers = await dataSource.query<StaffUserRow[]>(
      `
      SELECT DISTINCT LOWER(TRIM(u.email)) AS email
      FROM user_role ur
      INNER JOIN role r ON r.id = ur.role_id
      INNER JOIN \`user\` u ON u.id = ur.user_id
      WHERE r.code IN ('ADMIN', 'SUPER_ADMIN')
        AND u.is_active = 1
        AND u.email IS NOT NULL
        AND TRIM(u.email) <> ''
      ORDER BY email ASC
      `,
    );

    await workspaceGroupsService.findOrCreateGroup({
      email: staffGroupEmail,
      name: 'staff',
      description: 'Staff global de producción',
    });

    let membersProcessed = 0;
    for (const row of staffUsers) {
      const email = String(row.email || '').trim().toLowerCase();
      if (!email) continue;
      await workspaceGroupsService.ensureMemberInGroup({
        groupEmail: staffGroupEmail,
        memberEmail: email,
      });
      membersProcessed += 1;
    }

    await driveScopeProvisioningService.ensureGroupWriterPermission(
      realRoot,
      staffGroupEmail,
    );

    console.log(
      `[DONE] staffGroup=${staffGroupEmail} staffMembersProcessed=${membersProcessed} rootWriterEnsured=YES`,
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

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@src/app.module';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WorkspaceGroupsService } from '@modules/media-access/application/workspace-groups.service';

type ProfessorAssignmentRow = {
  courseCycleId: string | number;
  professorGroupEmail: string;
  professorEmail: string;
};

type FailedMemberSync = {
  groupEmail: string;
  memberEmail: string;
  reason: string;
};

function normalizeEmail(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/^"+|"+$/g, '');
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

function getCycleFilter(): string[] {
  const raw = String(process.env.SYNC_CYCLE_CODES || '').trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function main(): Promise<void> {
  process.env.DISABLE_REPEAT_SCHEDULERS = '1';

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const dataSource = app.get(DataSource);
    const configService = app.get(ConfigService);
    const workspaceGroupsService = app.get(WorkspaceGroupsService);
    const cycleFilter = getCycleFilter();
    const workspaceDomain = requireWorkspaceDomain(configService);

    const cycleFilterSql =
      cycleFilter.length > 0
        ? `AND ac.code IN (${cycleFilter.map(() => '?').join(', ')})`
        : '';

    const rows = await dataSource.query<ProfessorAssignmentRow[]>(
      `
      SELECT
        cc.id AS courseCycleId,
        LOWER(CONCAT('cc-', cc.id, '-professors@', ?)) AS professorGroupEmail,
        LOWER(TRIM(u.email)) AS professorEmail
      FROM course_cycle cc
      INNER JOIN academic_cycle ac ON ac.id = cc.academic_cycle_id
      INNER JOIN course_cycle_professor ccp ON ccp.course_cycle_id = cc.id
      INNER JOIN \`user\` u ON u.id = ccp.professor_user_id
      WHERE ccp.revoked_at IS NULL
        AND u.is_active = 1
        AND u.email IS NOT NULL
        AND TRIM(u.email) <> ''
        ${cycleFilterSql}
      ORDER BY cc.id ASC, professorEmail ASC
      `,
      [workspaceDomain, ...cycleFilter],
    );

    if (!rows.length) {
      console.log('[INFO] No se encontraron profesores para sincronizar.');
      return;
    }

    const expectedByGroup = new Map<string, Set<string>>();
    let skippedInvalidEmails = 0;
    for (const row of rows) {
      const groupEmail = normalizeEmail(row.professorGroupEmail);
      const memberEmail = normalizeEmail(row.professorEmail);
      if (!groupEmail || !memberEmail) continue;
      if (!groupEmail.endsWith(`@${workspaceDomain}`)) {
        throw new Error(
          `Grupo fuera de dominio permitido: ${groupEmail} (dominio esperado: ${workspaceDomain})`,
        );
      }
      if (!isValidEmail(memberEmail)) {
        skippedInvalidEmails += 1;
        console.warn(
          `[WARN] Email de profesor invalido, omitido: cc=${String(row.courseCycleId)} email="${memberEmail}"`,
        );
        continue;
      }
      if (!expectedByGroup.has(groupEmail)) {
        expectedByGroup.set(groupEmail, new Set<string>());
      }
      expectedByGroup.get(groupEmail)?.add(memberEmail);
    }

    let groupsProcessed = 0;
    let membersAdded = 0;
    let memberErrors = 0;
    const failedMembers: FailedMemberSync[] = [];

    for (const [groupEmail, memberEmails] of expectedByGroup.entries()) {
      groupsProcessed += 1;
      await workspaceGroupsService.findOrCreateGroup({
        email: groupEmail,
        name: `CC ${groupEmail.split('@')[0]}`,
        description: `Grupo de profesores sincronizado para producción (${groupEmail})`,
      });

      let addedInGroup = 0;
      for (const memberEmail of memberEmails) {
        try {
          await workspaceGroupsService.ensureMemberInGroup({
            groupEmail,
            memberEmail,
          });
          addedInGroup += 1;
        } catch (error: unknown) {
          memberErrors += 1;
          const message = error instanceof Error ? error.message : String(error);
          failedMembers.push({
            groupEmail,
            memberEmail,
            reason: message,
          });
          console.error(
            `[ERROR] Sync profesor fallo group=${groupEmail} member=${memberEmail} reason=${message}`,
          );
        }
      }
      membersAdded += addedInGroup;
      console.log(
        `[OK ] ${groupEmail} profesoresEsperados=${memberEmails.size} miembrosProcesados=${addedInGroup}`,
      );
    }

    if (skippedInvalidEmails > 0) {
      console.warn(`[WARN] Emails invalidos omitidos=${skippedInvalidEmails}`);
    }
    console.log(
      `[DONE] groupsProcessed=${groupsProcessed} membersProcessed=${membersAdded}`,
    );

    if (memberErrors > 0) {
      console.error('[ERROR] Detalle de miembros no agregados:');
      for (const failed of failedMembers) {
        console.error(
          `  - group=${failed.groupEmail} member=${failed.memberEmail} reason=${failed.reason}`,
        );
      }

      const uniqueMembers = new Set(
        failedMembers.map((failed) => failed.memberEmail),
      );
      console.error(
        `[ERROR] Resumen fallos: total=${failedMembers.length} correosUnicos=${uniqueMembers.size}`,
      );

      throw new Error(`Sincronizacion finalizada con errores en miembros=${memberErrors}`);
    }
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ERROR] ${message}`);
  process.exitCode = 1;
});

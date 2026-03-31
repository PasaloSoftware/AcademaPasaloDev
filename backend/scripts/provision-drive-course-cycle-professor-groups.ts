import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@src/app.module';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WorkspaceGroupsService } from '@modules/media-access/application/workspace-groups.service';
import { technicalSettings } from '@src/config/technical-settings';

type CourseCycleRow = {
  courseCycleId: string | number;
  courseCode: string;
  cycleCode: string;
};

type EmailRow = {
  email: string | null;
};

const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function normalizeId(raw: string | number): string {
  const normalized = String(raw || '').trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`ID invalido detectado: "${raw}"`);
  }
  return normalized;
}

function isValidEmail(email: string): boolean {
  return SIMPLE_EMAIL_REGEX.test(String(email || '').trim());
}

function buildCourseCycleProfessorGroupEmail(
  courseCycleId: string,
  workspaceDomain: string,
): string {
  return `cc-${courseCycleId}-professors@${workspaceDomain}`;
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
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

async function getEligibleProfessorEmails(
  dataSource: DataSource,
  courseCycleId: string,
): Promise<string[]> {
  const rows = (await dataSource.query(
    `
      SELECT DISTINCT LOWER(TRIM(u.email)) AS email
      FROM course_cycle_professor ccp
      INNER JOIN user u ON u.id = ccp.professor_user_id
      WHERE ccp.course_cycle_id = ?
        AND ccp.revoked_at IS NULL
        AND u.is_active = 1
        AND u.email IS NOT NULL
        AND TRIM(u.email) <> ''
    `,
    [courseCycleId],
  )) as EmailRow[];

  return rows
    .map((row) => String(row.email || '').trim().toLowerCase())
    .filter((email) => !!email);
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const dataSource = app.get(DataSource);
    const configService = app.get(ConfigService);
    const workspaceGroupsService = app.get(WorkspaceGroupsService);

    const workspaceDomain = String(
      configService.get<string>('GOOGLE_WORKSPACE_GROUP_DOMAIN', '') || '',
    )
      .trim()
      .toLowerCase();
    if (!workspaceDomain) {
      throw new Error('Falta GOOGLE_WORKSPACE_GROUP_DOMAIN');
    }

    const mutationDelayMs = Math.max(
      0,
      Number(technicalSettings.mediaAccess.reconciliationMutationDelayMs || 0),
    );

    const cycles = await getActiveCourseCycles(dataSource);
    if (!cycles.length) {
      console.log('No se encontraron course_cycle del ciclo activo.');
      return;
    }

    let ok = 0;
    let failed = 0;
    const failures: string[] = [];
    console.log(`Course cycles detectados: ${cycles.length}`);

    for (const cycle of cycles) {
      const courseCycleId = normalizeId(cycle.courseCycleId);
      try {
        const professorGroupEmail = buildCourseCycleProfessorGroupEmail(
          courseCycleId,
          workspaceDomain,
        );
        const group = await workspaceGroupsService.findOrCreateGroup({
          email: professorGroupEmail,
          name: `CC ${courseCycleId} Professors`,
          description: `Grupo de profesores para cc_${courseCycleId}`,
        });

        const professorEmails = await getEligibleProfessorEmails(
          dataSource,
          courseCycleId,
        );
        let syncedMembers = 0;

        for (const memberEmail of professorEmails) {
          if (!isValidEmail(memberEmail)) {
            console.warn(
              `[WARN] email de profesor invalido omitido para cc=${courseCycleId}: ${memberEmail}`,
            );
            continue;
          }
          try {
            await workspaceGroupsService.ensureMemberInGroup({
              groupEmail: group.email,
              memberEmail,
            });
            syncedMembers += 1;
            await sleep(mutationDelayMs);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(
              `[WARN] no se pudo agregar profesor ${memberEmail} a ${group.email}: ${message}`,
            );
          }
        }

        ok += 1;
        console.log(
          `[OK] cc=${courseCycleId} cycle=${cycle.cycleCode} course=${cycle.courseCode} professorGroup=${group.email} professorsSynced=${syncedMembers} professorsCandidate=${professorEmails.length}`,
        );
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        const failure = `[ERROR] cc=${courseCycleId} -> ${message}`;
        failures.push(failure);
        console.error(failure);
      }
    }

    console.log('----------------------------------------');
    console.log(
      `Provision grupos de profesores completada. OK=${ok} FAIL=${failed}`,
    );
    if (failures.length > 0) {
      console.log('Errores detectados:');
      for (const failure of failures) {
        console.log(failure);
      }
      process.exitCode = 1;
    }
  } finally {
    await app.close();
  }
}

void main();

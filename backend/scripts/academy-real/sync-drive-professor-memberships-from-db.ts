import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@src/app.module';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WorkspaceGroupsService } from '@modules/media-access/application/workspace-groups.service';
import { DriveScopeProvisioningService } from '@modules/media-access/application/drive-scope-provisioning.service';

type ProfessorAssignmentRow = {
  courseCycleId: string | number;
  courseCode: string;
  cycleCode: string;
  professorEmail: string;
};

type EvaluationRow = {
  evaluationId: string | number;
  courseCycleId: string | number;
  evaluationTypeCode: string;
  evaluationNumber: number;
};

function normalizeId(raw: string | number, field: string): string {
  const normalized = String(raw || '').trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${field} invalido: "${raw}"`);
  }
  return normalized;
}

function normalizeToken(raw: string): string {
  const normalized = String(raw || '').trim();
  if (!normalized) {
    throw new Error('Token vacio para nombre de carpeta');
  }
  return normalized.replace(/[^A-Za-z0-9_-]/g, '-').replace(/-+/g, '-');
}

function requireRealRootAndOverrideRuntimeRoot(): string {
  const realRoot = String(process.env.GOOGLE_DRIVE_REAL_ROOT_FOLDER_ID || '').trim();
  if (!realRoot) {
    throw new Error('Falta GOOGLE_DRIVE_REAL_ROOT_FOLDER_ID');
  }
  process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = realRoot;
  return realRoot;
}

async function main(): Promise<void> {
  const realRoot = requireRealRootAndOverrideRuntimeRoot();
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const dataSource = app.get(DataSource);
    const configService = app.get(ConfigService);
    const workspaceGroupsService = app.get(WorkspaceGroupsService);
    const driveScopeProvisioningService = app.get(DriveScopeProvisioningService);

    const workspaceDomain = String(
      configService.get<string>('GOOGLE_WORKSPACE_GROUP_DOMAIN', '') || '',
    )
      .trim()
      .toLowerCase();
    if (!workspaceDomain) throw new Error('Falta GOOGLE_WORKSPACE_GROUP_DOMAIN');

    await driveScopeProvisioningService.validateRootFolder();
    const runtimeRoot = driveScopeProvisioningService.getRootFolderId();
    if (runtimeRoot !== realRoot) {
      throw new Error(
        `Guard rail: root runtime (${runtimeRoot}) no coincide con real (${realRoot})`,
      );
    }

    const [assignments, evaluations] = await Promise.all([
      dataSource.query<ProfessorAssignmentRow[]>(
        `
        SELECT
          ccp.course_cycle_id AS courseCycleId,
          c.code AS courseCode,
          ac.code AS cycleCode,
          LOWER(TRIM(u.email)) AS professorEmail
        FROM course_cycle_professor ccp
        INNER JOIN user u ON u.id = ccp.professor_user_id
        INNER JOIN course_cycle cc ON cc.id = ccp.course_cycle_id
        INNER JOIN course c ON c.id = cc.course_id
        INNER JOIN academic_cycle ac ON ac.id = cc.academic_cycle_id
        WHERE ccp.revoked_at IS NULL
          AND u.is_active = 1
          AND u.email IS NOT NULL
          AND TRIM(u.email) <> ''
        ORDER BY cc.id ASC, professorEmail ASC
        `,
      ),
      dataSource.query<EvaluationRow[]>(
        `
        SELECT
          ev.id AS evaluationId,
          ev.course_cycle_id AS courseCycleId,
          et.code AS evaluationTypeCode,
          ev.number AS evaluationNumber
        FROM evaluation ev
        INNER JOIN evaluation_type et ON et.id = ev.evaluation_type_id
        WHERE et.code <> 'BANCO_ENUNCIADOS'
          AND ev.number > 0
        ORDER BY ev.id ASC
        `,
      ),
    ]);

    if (!assignments.length) {
      console.log('[INFO] No hay asignaciones de profesor activas en DB.');
      return;
    }

    const courseCyclesRoot =
      await driveScopeProvisioningService.findOrCreateDriveFolderUnderParent(
        realRoot,
        'course_cycles',
      );
    const evaluationsRoot =
      await driveScopeProvisioningService.findOrCreateDriveFolderUnderParent(
        realRoot,
        'evaluations',
      );

    const assignmentsByCourseCycle = new Map<
      string,
      {
        courseCode: string;
        cycleCode: string;
        professorEmails: Set<string>;
      }
    >();

    for (const row of assignments) {
      const ccId = normalizeId(row.courseCycleId, 'courseCycleId');
      const courseCode = normalizeToken(String(row.courseCode || ''));
      const cycleCode = normalizeToken(String(row.cycleCode || ''));
      const email = String(row.professorEmail || '').trim().toLowerCase();
      if (!email) continue;
      if (!assignmentsByCourseCycle.has(ccId)) {
        assignmentsByCourseCycle.set(ccId, {
          courseCode,
          cycleCode,
          professorEmails: new Set<string>(),
        });
      }
      assignmentsByCourseCycle.get(ccId)?.professorEmails.add(email);
    }

    const evalsByCourseCycle = new Map<string, EvaluationRow[]>();
    for (const row of evaluations) {
      const ccId = normalizeId(row.courseCycleId, 'courseCycleId');
      const current = evalsByCourseCycle.get(ccId) || [];
      current.push(row);
      evalsByCourseCycle.set(ccId, current);
    }

    let groupsEnsured = 0;
    let memberAddsOk = 0;
    let memberAddsFail = 0;
    let ccWriterEnsured = 0;
    let evWriterEnsured = 0;

    for (const [courseCycleId, info] of assignmentsByCourseCycle.entries()) {
      const professorGroupEmail = `cc-${courseCycleId}-professors@${workspaceDomain}`;
      const group = await workspaceGroupsService.findOrCreateGroup({
        email: professorGroupEmail,
        name: `CC ${courseCycleId} Professors`,
        description: `Grupo de profesores para cc_${courseCycleId}`,
      });
      groupsEnsured += 1;

      for (const professorEmail of info.professorEmails) {
        try {
          await workspaceGroupsService.ensureMemberInGroup({
            groupEmail: group.email,
            memberEmail: professorEmail,
          });
          memberAddsOk += 1;
        } catch (error) {
          memberAddsFail += 1;
          console.warn(
            `[WARN] No se pudo agregar ${professorEmail} a ${group.email}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      const ccCycleFolder =
        await driveScopeProvisioningService.findOrCreateDriveFolderUnderParent(
          courseCyclesRoot,
          info.cycleCode,
        );
      const ccScopeFolder =
        await driveScopeProvisioningService.findOrCreateDriveFolderUnderParent(
          ccCycleFolder,
          `cc_${courseCycleId}_${info.courseCode}`,
        );
      await driveScopeProvisioningService.ensureGroupWriterPermission(
        ccScopeFolder,
        group.email,
      );
      ccWriterEnsured += 1;

      const evCycleFolder =
        await driveScopeProvisioningService.findOrCreateDriveFolderUnderParent(
          evaluationsRoot,
          info.cycleCode,
        );
      const evCourseCycleFolder =
        await driveScopeProvisioningService.findOrCreateDriveFolderUnderParent(
          evCycleFolder,
          `cc_${courseCycleId}_${info.courseCode}`,
        );

      const evalRows = evalsByCourseCycle.get(courseCycleId) || [];
      for (const ev of evalRows) {
        const evalId = normalizeId(ev.evaluationId, 'evaluationId');
        const evalTypeCode = normalizeToken(String(ev.evaluationTypeCode || '')).toUpperCase();
        const evalNumber = Number(ev.evaluationNumber || 0);
        if (!Number.isInteger(evalNumber) || evalNumber <= 0) continue;

        const evScopeFolder =
          await driveScopeProvisioningService.findOrCreateDriveFolderUnderParent(
            evCourseCycleFolder,
            `ev_${evalId}_${evalTypeCode}${evalNumber}`,
          );
        await driveScopeProvisioningService.ensureGroupWriterPermission(
          evScopeFolder,
          group.email,
        );
        evWriterEnsured += 1;
      }
    }

    console.log(
      JSON.stringify(
        {
          rootFolderId: realRoot,
          courseCyclesProcessed: assignmentsByCourseCycle.size,
          groupsEnsured,
          memberAddsOk,
          memberAddsFail,
          ccWriterEnsured,
          evWriterEnsured,
        },
        null,
        2,
      ),
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

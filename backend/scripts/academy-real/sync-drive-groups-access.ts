import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@src/app.module';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WorkspaceGroupsService } from '@modules/media-access/application/workspace-groups.service';
import { DriveScopeProvisioningService } from '@modules/media-access/application/drive-scope-provisioning.service';

type CourseCycleRow = {
  courseCycleId: string | number;
  courseCode: string;
  cycleCode: string;
};

type EvaluationRow = {
  evaluationId: string | number;
  courseCycleId: string | number;
  courseCode: string;
  cycleCode: string;
  evaluationTypeCode: string;
  evaluationNumber: number;
};

type EmailRow = { email: string | null };
type IdRow = { id: string | number };

const STUDENT_EMAIL = 'alumnopasalo@gmail.com';
const TEACHER_ADMIN_EMAIL = 'docentepasalo@gmail.com';

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
    if (!workspaceDomain) {
      throw new Error('Falta GOOGLE_WORKSPACE_GROUP_DOMAIN');
    }

    const staffGroupEmail = String(
      process.env.GOOGLE_WORKSPACE_STAFF_VIEWERS_GROUP_EMAIL || '',
    )
      .trim()
      .toLowerCase();

    await driveScopeProvisioningService.validateRootFolder();
    const rootFolderId = driveScopeProvisioningService.getRootFolderId();
    if (rootFolderId !== realRoot) {
      throw new Error(
        `Guard rail: root en runtime (${rootFolderId}) no coincide con real (${realRoot})`,
      );
    }

    const [courseCycles, evaluations] = await Promise.all([
      dataSource.query<CourseCycleRow[]>(
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
      ),
      dataSource.query<EvaluationRow[]>(
        `
        SELECT
          ev.id AS evaluationId,
          cc.id AS courseCycleId,
          c.code AS courseCode,
          ac.code AS cycleCode,
          et.code AS evaluationTypeCode,
          ev.number AS evaluationNumber
        FROM evaluation ev
        INNER JOIN course_cycle cc ON cc.id = ev.course_cycle_id
        INNER JOIN course c ON c.id = cc.course_id
        INNER JOIN academic_cycle ac ON ac.id = cc.academic_cycle_id
        INNER JOIN evaluation_type et ON et.id = ev.evaluation_type_id
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
        ORDER BY ev.id ASC
        `,
      ),
    ]);

    if (!courseCycles.length) {
      console.log('No se encontraron course_cycle del ciclo activo.');
      return;
    }

    const courseCyclesRoot =
      await driveScopeProvisioningService.findOrCreateDriveFolderUnderParent(
        rootFolderId,
        'course_cycles',
      );
    const evaluationsRoot =
      await driveScopeProvisioningService.findOrCreateDriveFolderUnderParent(
        rootFolderId,
        'evaluations',
      );

    let ccPermissionsApplied = 0;
    let evPermissionsApplied = 0;

    for (const cc of courseCycles) {
      const courseCycleId = normalizeId(cc.courseCycleId, 'courseCycleId');
      const cycleCode = normalizeToken(String(cc.cycleCode || ''));
      const courseCode = normalizeToken(String(cc.courseCode || ''));

      const viewerGroupEmail = `cc-${courseCycleId}-viewers@${workspaceDomain}`;
      const professorGroupEmail = `cc-${courseCycleId}-professors@${workspaceDomain}`;

      const viewerGroup = await workspaceGroupsService.findOrCreateGroup({
        email: viewerGroupEmail,
        name: `CC ${courseCycleId} Viewers`,
        description: `Acceso viewer para contenido de course_cycle ${courseCycleId}`,
      });
      const professorGroup = await workspaceGroupsService.findOrCreateGroup({
        email: professorGroupEmail,
        name: `CC ${courseCycleId} Professors`,
        description: `Grupo de profesores para cc_${courseCycleId}`,
      });

      const ccCycleFolder =
        await driveScopeProvisioningService.findOrCreateDriveFolderUnderParent(
          courseCyclesRoot,
          cycleCode,
        );
      const ccScopeFolder =
        await driveScopeProvisioningService.findOrCreateDriveFolderUnderParent(
          ccCycleFolder,
          `cc_${courseCycleId}_${courseCode}`,
        );

      await driveScopeProvisioningService.ensureGroupReaderPermission(
        ccScopeFolder,
        viewerGroup.email,
      );
      await driveScopeProvisioningService.ensureGroupWriterPermission(
        ccScopeFolder,
        professorGroup.email,
      );
      ccPermissionsApplied += 2;

      const evForCourseCycle = evaluations.filter(
        (e) => normalizeId(e.courseCycleId, 'courseCycleId') === courseCycleId,
      );
      for (const ev of evForCourseCycle) {
        const evaluationId = normalizeId(ev.evaluationId, 'evaluationId');
        const evalTypeCode = normalizeToken(String(ev.evaluationTypeCode || '')).toUpperCase();
        const evalNumber = Number(ev.evaluationNumber || 0);
        if (!Number.isInteger(evalNumber) || evalNumber <= 0) continue;

        const evViewerEmail = `ev-${evaluationId}-viewers@${workspaceDomain}`;
        const evViewerGroup = await workspaceGroupsService.findOrCreateGroup({
          email: evViewerEmail,
          name: `Evaluacion ${evaluationId} viewers`,
          description: `Acceso viewer para evaluacion ${evaluationId}`,
        });

        const evCycleFolder =
          await driveScopeProvisioningService.findOrCreateDriveFolderUnderParent(
            evaluationsRoot,
            cycleCode,
          );
        const evCourseCycleFolder =
          await driveScopeProvisioningService.findOrCreateDriveFolderUnderParent(
            evCycleFolder,
            `cc_${courseCycleId}_${courseCode}`,
          );
        const evScopeFolder =
          await driveScopeProvisioningService.findOrCreateDriveFolderUnderParent(
            evCourseCycleFolder,
            `ev_${evaluationId}_${evalTypeCode}${evalNumber}`,
          );

        await driveScopeProvisioningService.ensureGroupReaderPermission(
          evScopeFolder,
          evViewerGroup.email,
        );
        await driveScopeProvisioningService.ensureGroupWriterPermission(
          evScopeFolder,
          professorGroup.email,
        );
        evPermissionsApplied += 2;
      }
    }

    // Membresias alumno (viewer por course_cycle + evaluation)
    const studentCourseCycles = await dataSource.query<IdRow[]>(
      `
      SELECT DISTINCT e.course_cycle_id AS id
      FROM enrollment e
      INNER JOIN user u ON u.id = e.user_id
      INNER JOIN course_cycle cc ON cc.id = e.course_cycle_id
      WHERE LOWER(TRIM(u.email)) = ?
        AND u.is_active = 1
        AND e.cancelled_at IS NULL
        AND cc.academic_cycle_id = COALESCE(
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
      `,
      [STUDENT_EMAIL],
    );

    for (const row of studentCourseCycles) {
      const ccId = normalizeId(row.id, 'courseCycleId');
      await workspaceGroupsService.ensureMemberInGroup({
        groupEmail: `cc-${ccId}-viewers@${workspaceDomain}`,
        memberEmail: STUDENT_EMAIL,
      });
    }

    const studentEvaluations = await dataSource.query<IdRow[]>(
      `
      SELECT DISTINCT ev.id AS id
      FROM enrollment_evaluation ee
      INNER JOIN enrollment e ON e.id = ee.enrollment_id
      INNER JOIN user u ON u.id = e.user_id
      INNER JOIN evaluation ev ON ev.id = ee.evaluation_id
      INNER JOIN course_cycle cc ON cc.id = ev.course_cycle_id
      WHERE LOWER(TRIM(u.email)) = ?
        AND u.is_active = 1
        AND e.cancelled_at IS NULL
        AND ee.is_active = 1
        AND cc.academic_cycle_id = COALESCE(
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
      `,
      [STUDENT_EMAIL],
    );

    for (const row of studentEvaluations) {
      const evId = normalizeId(row.id, 'evaluationId');
      await workspaceGroupsService.ensureMemberInGroup({
        groupEmail: `ev-${evId}-viewers@${workspaceDomain}`,
        memberEmail: STUDENT_EMAIL,
      });
    }

    // Membresias docente (profesor) en sus course_cycles activos
    const teacherCourseCycles = await dataSource.query<IdRow[]>(
      `
      SELECT DISTINCT ccp.course_cycle_id AS id
      FROM course_cycle_professor ccp
      INNER JOIN user u ON u.id = ccp.professor_user_id
      INNER JOIN course_cycle cc ON cc.id = ccp.course_cycle_id
      WHERE LOWER(TRIM(u.email)) = ?
        AND u.is_active = 1
        AND ccp.revoked_at IS NULL
        AND cc.academic_cycle_id = COALESCE(
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
      `,
      [TEACHER_ADMIN_EMAIL],
    );

    for (const row of teacherCourseCycles) {
      const ccId = normalizeId(row.id, 'courseCycleId');
      await workspaceGroupsService.ensureMemberInGroup({
        groupEmail: `cc-${ccId}-professors@${workspaceDomain}`,
        memberEmail: TEACHER_ADMIN_EMAIL,
      });
    }

    // Staff/Admin group (incluye docentepasalo por su rol admin/superadmin)
    let staffSynced = 0;
    if (staffGroupEmail) {
      const staffGroup = await workspaceGroupsService.findOrCreateGroup({
        email: staffGroupEmail,
        name: 'Staff viewers',
        description: 'Acceso global para ADMIN y SUPER_ADMIN',
      });

      const adminEmails = await dataSource.query<EmailRow[]>(
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
      );

      for (const row of adminEmails) {
        const email = String(row.email || '').trim().toLowerCase();
        if (!email) continue;
        await workspaceGroupsService.ensureMemberInGroup({
          groupEmail: staffGroup.email,
          memberEmail: email,
        });
        staffSynced += 1;
      }
    }

    console.log('----------------------------------------');
    console.log(
      JSON.stringify(
        {
          rootFolderId,
          activeCourseCycles: courseCycles.length,
          activeEvaluations: evaluations.length,
          ccPermissionsApplied,
          evPermissionsApplied,
          studentEmail: STUDENT_EMAIL,
          studentCourseCycleGroups: studentCourseCycles.length,
          studentEvaluationGroups: studentEvaluations.length,
          teacherAdminEmail: TEACHER_ADMIN_EMAIL,
          teacherProfessorGroups: teacherCourseCycles.length,
          staffGroupEmail: staffGroupEmail || null,
          staffMembersSynced: staffSynced,
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

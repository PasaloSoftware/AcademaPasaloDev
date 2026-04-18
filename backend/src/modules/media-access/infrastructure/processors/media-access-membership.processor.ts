import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { QUEUES } from '@infrastructure/queue/queue.constants';
import { User } from '@modules/users/domain/user.entity';
import { EvaluationDriveAccess } from '@modules/media-access/domain/evaluation-drive-access.entity';
import {
  MEDIA_ACCESS_JOB_NAMES,
  MEDIA_ACCESS_MEMBERSHIP_ACTIONS,
  MEDIA_ACCESS_SYNC_SOURCES,
  isGoogleGroupMemberRemovable,
} from '@modules/media-access/domain/media-access.constants';
import { EVALUATION_TYPE_CODES } from '@modules/evaluations/domain/evaluation.constants';
import { WorkspaceGroupsService } from '@modules/media-access/application/workspace-groups.service';
import { EvaluationDriveAccessProvisioningService } from '@modules/media-access/application/evaluation-drive-access-provisioning.service';
import { EvaluationDriveAccessRepository } from '@modules/media-access/infrastructure/evaluation-drive-access.repository';
import {
  MediaAccessMembershipSyncJobPayload,
  MediaAccessRecoverScopeJobPayload,
  MediaAccessCourseCycleMembershipSyncJobPayload,
} from '@modules/media-access/application/media-access-membership-dispatch.service';
import { MediaAccessReconciliationService } from '@modules/media-access/application/media-access-reconciliation.service';
import { ConfigService } from '@nestjs/config';
import { MediaAccessReconciliationSafetyStopError } from '@modules/media-access/domain/media-access.errors';

@Injectable()
@Processor(QUEUES.MEDIA_ACCESS)
export class MediaAccessMembershipProcessor extends WorkerHost {
  private readonly logger = new Logger(MediaAccessMembershipProcessor.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly workspaceGroupsService: WorkspaceGroupsService,
    private readonly provisioningService: EvaluationDriveAccessProvisioningService,
    private readonly evaluationDriveAccessRepository: EvaluationDriveAccessRepository,
    private readonly reconciliationService: MediaAccessReconciliationService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === MEDIA_ACCESS_JOB_NAMES.RECONCILE_SCOPES) {
      await this.runReconciliationJob();
      return;
    }
    if (job.name === MEDIA_ACCESS_JOB_NAMES.SYNC_STAFF_VIEWERS) {
      await this.runStaffViewersSyncJob();
      return;
    }
    if (job.name === MEDIA_ACCESS_JOB_NAMES.SYNC_MEMBERSHIP) {
      await this.handleSyncMembership(
        job as Job<MediaAccessMembershipSyncJobPayload>,
      );
      return;
    }
    if (job.name === MEDIA_ACCESS_JOB_NAMES.SYNC_COURSE_CYCLE_MEMBERSHIP) {
      await this.handleSyncCourseCycleMembership(
        job as Job<MediaAccessCourseCycleMembershipSyncJobPayload>,
      );
      return;
    }
    if (job.name === MEDIA_ACCESS_JOB_NAMES.RECOVER_EVALUATION_SCOPE) {
      await this.handleRecoverEvaluationScope(
        job as Job<MediaAccessRecoverScopeJobPayload>,
      );
      return;
    }
    this.logger.warn({
      context: MediaAccessMembershipProcessor.name,
      message: 'Job de media-access desconocido, ignorado',
      jobId: job.id,
      jobName: job.name,
    });
    throw new UnrecoverableError(
      `Job media-access no soportado: ${String(job.name)}`,
    );
  }

  private async runReconciliationJob(): Promise<void> {
    try {
      await this.reconciliationService.runReconciliation();
    } catch (error) {
      if (error instanceof MediaAccessReconciliationSafetyStopError) {
        throw new UnrecoverableError(error.message);
      }
      throw error;
    }
  }

  private async runStaffViewersSyncJob(): Promise<void> {
    try {
      await this.reconciliationService.runStaffViewersSyncOnly();
    } catch (error) {
      if (error instanceof MediaAccessReconciliationSafetyStopError) {
        throw new UnrecoverableError(error.message);
      }
      throw error;
    }
  }

  @OnWorkerEvent('error')
  onWorkerError(error: Error): void {
    this.logger.warn({
      context: MediaAccessMembershipProcessor.name,
      message: 'Worker media-access emitió error',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  private async handleRecoverEvaluationScope(
    job: Job<MediaAccessRecoverScopeJobPayload>,
  ): Promise<void> {
    const payload = job.data || ({} as MediaAccessRecoverScopeJobPayload);
    const evaluationId = String(payload.evaluationId || '').trim();
    const requestedByUserId = String(payload.requestedByUserId || '').trim();
    const reconcileMembers = payload.reconcileMembers !== false;
    const pruneExtraMembers = payload.pruneExtraMembers === true;
    const source =
      String(payload.source || '').trim() ||
      MEDIA_ACCESS_SYNC_SOURCES.ADMIN_MANUAL_RECOVERY;

    if (!evaluationId || !requestedByUserId) {
      throw new UnrecoverableError(
        'Payload incompleto para recover scope de media-access',
      );
    }
    if (pruneExtraMembers && !reconcileMembers) {
      throw new UnrecoverableError(
        'Configuración inválida: pruneExtraMembers requiere reconcileMembers',
      );
    }

    const evaluationTypeCode =
      await this.resolveEvaluationTypeCode(evaluationId);
    if (evaluationTypeCode === EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS) {
      throw new UnrecoverableError(
        `BANCO_ENUNCIADOS no se recupera como scope de evaluacion Drive (evaluationId=${evaluationId})`,
      );
    }

    const scope =
      await this.provisioningService.provisionByEvaluationId(evaluationId);
    if (!scope.isActive || !scope.viewerGroupEmail) {
      throw new UnrecoverableError(
        `Scope Drive incompleto tras recover para evaluación ${evaluationId}`,
      );
    }

    if (!reconcileMembers) {
      this.logger.log({
        context: MediaAccessMembershipProcessor.name,
        message: 'Recover scope ejecutado sin reconciliación de miembros',
        evaluationId,
        requestedByUserId,
        source,
      });
      return;
    }

    const expectedEmails = await this.listExpectedMemberEmails(evaluationId);
    const currentMembers = await this.workspaceGroupsService.listGroupMembers(
      scope.viewerGroupEmail,
    );
    const normalizedMembers = this.normalizeGroupMembers(currentMembers);
    const currentEmails = Array.from(
      new Set(normalizedMembers.map((member) => member.email)),
    );
    const removableEmails = new Set(
      normalizedMembers
        .filter((member) => this.isRemovableMemberRole(member.role))
        .map((member) => member.email),
    );

    const currentEmailSet = new Set(currentEmails);
    const expectedEmailSet = new Set(expectedEmails);
    const toAdd = expectedEmails.filter((email) => !currentEmailSet.has(email));
    const toRemove = pruneExtraMembers
      ? currentEmails.filter(
          (email) => removableEmails.has(email) && !expectedEmailSet.has(email),
        )
      : [];

    for (const email of toAdd) {
      await this.workspaceGroupsService.ensureMemberInGroup({
        groupEmail: scope.viewerGroupEmail,
        memberEmail: email,
      });
    }
    for (const email of toRemove) {
      await this.workspaceGroupsService.removeMemberFromGroup({
        groupEmail: scope.viewerGroupEmail,
        memberEmail: email,
      });
    }

    this.logger.log({
      context: MediaAccessMembershipProcessor.name,
      message: 'Recover scope ejecutado con reconciliación de miembros',
      evaluationId,
      requestedByUserId,
      source,
      expectedMembers: expectedEmails.length,
      currentMembers: currentEmails.length,
      added: toAdd.length,
      removed: toRemove.length,
      pruneExtraMembers,
    });
  }

  private async handleSyncMembership(
    job: Job<MediaAccessMembershipSyncJobPayload>,
  ): Promise<void> {
    const { action, userId, evaluationId, source } = job.data || {};
    const normalizedAction = String(action || '')
      .trim()
      .toUpperCase();
    const normalizedUserId = String(userId || '').trim();
    const normalizedEvaluationId = String(evaluationId || '').trim();
    const normalizedSource = String(source || '').trim() || 'UNSPECIFIED';

    if (
      normalizedAction !== MEDIA_ACCESS_MEMBERSHIP_ACTIONS.GRANT &&
      normalizedAction !== MEDIA_ACCESS_MEMBERSHIP_ACTIONS.REVOKE
    ) {
      throw new UnrecoverableError(
        `Acción de sync de membresía inválida: ${String(action)}`,
      );
    }
    if (!normalizedUserId || !normalizedEvaluationId) {
      throw new UnrecoverableError(
        'Payload incompleto para sync de membresía media-access',
      );
    }

    const evaluationTypeCode = await this.resolveEvaluationTypeCode(
      normalizedEvaluationId,
    );
    if (evaluationTypeCode === EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS) {
      this.logger.log({
        context: MediaAccessMembershipProcessor.name,
        message:
          'Sync de membresia omitido: BANCO_ENUNCIADOS no usa scope de evaluacion Drive',
        evaluationId: normalizedEvaluationId,
        userId: normalizedUserId,
        source: normalizedSource,
      });
      return;
    }

    const user = await this.userRepository.findOne({
      where: { id: normalizedUserId },
    });
    if (!user?.email) {
      throw new UnrecoverableError(
        `Usuario ${normalizedUserId} no encontrado para sync de membresía`,
      );
    }
    const normalizedUserEmail = user.email.trim().toLowerCase();

    if (normalizedAction === MEDIA_ACCESS_MEMBERSHIP_ACTIONS.GRANT) {
      const hasEffectiveAccess = await this.userHasEffectiveAccess(
        normalizedUserId,
        normalizedEvaluationId,
      );
      if (!hasEffectiveAccess) {
        this.logger.log({
          context: MediaAccessMembershipProcessor.name,
          message:
            'Grant omitido: el usuario no tiene acceso efectivo vigente a la evaluación',
          evaluationId: normalizedEvaluationId,
          userId: normalizedUserId,
          source: normalizedSource,
        });
        return;
      }

      const driveAccess = await this.ensureActiveDriveAccess(
        normalizedEvaluationId,
      );
      await this.workspaceGroupsService.ensureMemberInGroup({
        groupEmail: driveAccess.viewerGroupEmail,
        memberEmail: normalizedUserEmail,
      });

      this.logger.log({
        context: MediaAccessMembershipProcessor.name,
        message: 'Membresía Drive otorgada',
        evaluationId: normalizedEvaluationId,
        userId: normalizedUserId,
        userEmail: normalizedUserEmail,
        groupEmail: driveAccess.viewerGroupEmail,
        source: normalizedSource,
      });
      return;
    }

    const driveAccess =
      await this.evaluationDriveAccessRepository.findByEvaluationId(
        normalizedEvaluationId,
      );
    if (!driveAccess?.isActive || !driveAccess.viewerGroupEmail) {
      this.logger.log({
        context: MediaAccessMembershipProcessor.name,
        message:
          'Revocación omitida: evaluación sin scope activo persistido en Drive',
        evaluationId: normalizedEvaluationId,
        userId: normalizedUserId,
        source: normalizedSource,
      });
      return;
    }

    const hasEffectiveAccess = await this.userHasEffectiveAccess(
      normalizedUserId,
      normalizedEvaluationId,
    );
    if (hasEffectiveAccess) {
      this.logger.log({
        context: MediaAccessMembershipProcessor.name,
        message:
          'Revocación omitida: el usuario mantiene acceso efectivo a la evaluación',
        evaluationId: normalizedEvaluationId,
        userId: normalizedUserId,
        source: normalizedSource,
      });
      return;
    }

    await this.workspaceGroupsService.removeMemberFromGroup({
      groupEmail: driveAccess.viewerGroupEmail,
      memberEmail: normalizedUserEmail,
    });

    this.logger.log({
      context: MediaAccessMembershipProcessor.name,
      message: 'Membresía Drive revocada',
      evaluationId: normalizedEvaluationId,
      userId: normalizedUserId,
      userEmail: normalizedUserEmail,
      groupEmail: driveAccess.viewerGroupEmail,
      source: normalizedSource,
    });
  }

  private async handleSyncCourseCycleMembership(
    job: Job<MediaAccessCourseCycleMembershipSyncJobPayload>,
  ): Promise<void> {
    const { action, userId, courseCycleId, source } = job.data || {};
    const normalizedAction = String(action || '')
      .trim()
      .toUpperCase();
    const normalizedUserId = String(userId || '').trim();
    const normalizedCourseCycleId = String(courseCycleId || '').trim();
    const normalizedSource = String(source || '').trim() || 'UNSPECIFIED';

    if (
      normalizedAction !== MEDIA_ACCESS_MEMBERSHIP_ACTIONS.GRANT &&
      normalizedAction !== MEDIA_ACCESS_MEMBERSHIP_ACTIONS.REVOKE
    ) {
      throw new UnrecoverableError(
        `Accion de sync de membresia course_cycle invalida: ${String(action)}`,
      );
    }
    if (!normalizedUserId || !normalizedCourseCycleId) {
      throw new UnrecoverableError(
        'Payload incompleto para sync de membresia course_cycle',
      );
    }

    const user = await this.userRepository.findOne({
      where: { id: normalizedUserId },
    });
    if (!user?.email) {
      throw new UnrecoverableError(
        `Usuario ${normalizedUserId} no encontrado para sync de membresia course_cycle`,
      );
    }
    const normalizedUserEmail = user.email.trim().toLowerCase();
    const viewerGroupEmail = this.buildCourseCycleViewerGroupEmail(
      normalizedCourseCycleId,
    );
    const professorGroupEmail = this.buildCourseCycleProfessorGroupEmail(
      normalizedCourseCycleId,
    );

    const [shouldBeViewerMember, shouldBeProfessorMember] = await Promise.all([
      this.userHasActiveEnrollmentInCourseCycle(
        normalizedUserId,
        normalizedCourseCycleId,
      ),
      this.userHasActiveProfessorAssignmentInCourseCycle(
        normalizedUserId,
        normalizedCourseCycleId,
      ),
    ]);

    await this.syncCourseCycleGroupMembership({
      groupEmail: viewerGroupEmail,
      groupName: `CC ${normalizedCourseCycleId} Viewers`,
      groupDescription: `Acceso viewer para contenido de course_cycle ${normalizedCourseCycleId}`,
      shouldHaveMembership: shouldBeViewerMember,
      memberEmail: normalizedUserEmail,
    });
    await this.syncCourseCycleGroupMembership({
      groupEmail: professorGroupEmail,
      groupName: `CC ${normalizedCourseCycleId} Professors`,
      groupDescription: `Grupo de profesores para cc_${normalizedCourseCycleId}`,
      shouldHaveMembership: shouldBeProfessorMember,
      memberEmail: normalizedUserEmail,
    });

    this.logger.log({
      context: MediaAccessMembershipProcessor.name,
      message: 'Membresia Drive de course_cycle sincronizada',
      action: normalizedAction,
      courseCycleId: normalizedCourseCycleId,
      userId: normalizedUserId,
      userEmail: normalizedUserEmail,
      viewerGroupEmail,
      professorGroupEmail,
      viewerMembership: shouldBeViewerMember,
      professorMembership: shouldBeProfessorMember,
      source: normalizedSource,
    });
  }

  private async ensureActiveDriveAccess(
    evaluationId: string,
  ): Promise<EvaluationDriveAccess> {
    const existing =
      await this.evaluationDriveAccessRepository.findByEvaluationId(
        evaluationId,
      );
    if (existing?.isActive && existing.viewerGroupEmail) {
      return existing;
    }

    const provisioned =
      await this.provisioningService.provisionByEvaluationId(evaluationId);
    if (!provisioned.isActive || !provisioned.viewerGroupEmail) {
      throw new UnrecoverableError(
        `Scope Drive incompleto para evaluación ${evaluationId}`,
      );
    }
    return provisioned;
  }

  private async userHasEffectiveAccess(
    userId: string,
    evaluationId: string,
  ): Promise<boolean> {
    const now = new Date();
    const result = await this.dataSource.query<
      Array<{ hasAccess: number | string }>
    >(
      `SELECT EXISTS(
         SELECT 1
         FROM enrollment_evaluation ee
         INNER JOIN enrollment e ON e.id = ee.enrollment_id
         INNER JOIN user u ON u.id = e.user_id
         WHERE ee.evaluation_id = ?
           AND ee.is_active = 1
           AND ee.access_start_date <= ?
           AND ee.access_end_date >= ?
           AND e.user_id = ?
           AND e.cancelled_at IS NULL
           AND u.is_active = 1
         LIMIT 1
       ) AS hasAccess`,
      [evaluationId, now, now, userId],
    );
    const hasEnrollmentAccess = Number(result[0]?.hasAccess) === 1;
    if (hasEnrollmentAccess) {
      return true;
    }

    return false;
  }

  private async resolveEvaluationTypeCode(
    evaluationId: string,
  ): Promise<string | null> {
    const rows = await this.dataSource.query<
      Array<{ typeCode: string | null }>
    >(
      `
        SELECT et.code AS typeCode
        FROM evaluation ev
        INNER JOIN evaluation_type et
          ON et.id = ev.evaluation_type_id
        WHERE ev.id = ?
        LIMIT 1
      `,
      [evaluationId],
    );

    const normalized = String(rows[0]?.typeCode || '')
      .trim()
      .toUpperCase();
    return normalized.length > 0 ? normalized : null;
  }

  private async userHasActiveEnrollmentInCourseCycle(
    userId: string,
    courseCycleId: string,
  ): Promise<boolean> {
    const enrollmentResult = await this.dataSource.query<
      Array<{ hasAccess: number | string }>
    >(
      `SELECT EXISTS(
         SELECT 1
         FROM enrollment e
         INNER JOIN user u ON u.id = e.user_id
         WHERE e.course_cycle_id = ?
           AND e.user_id = ?
           AND e.cancelled_at IS NULL
           AND u.is_active = 1
         LIMIT 1
       ) AS hasAccess`,
      [courseCycleId, userId],
    );
    return Number(enrollmentResult[0]?.hasAccess) === 1;
  }

  private async userHasActiveProfessorAssignmentInCourseCycle(
    userId: string,
    courseCycleId: string,
  ): Promise<boolean> {
    const professorResult = await this.dataSource.query<
      Array<{ hasAccess: number | string }>
    >(
      `SELECT EXISTS(
         SELECT 1
         FROM course_cycle_professor ccp
         INNER JOIN user u ON u.id = ccp.professor_user_id
         WHERE ccp.course_cycle_id = ?
           AND ccp.professor_user_id = ?
           AND ccp.revoked_at IS NULL
           AND u.is_active = 1
         LIMIT 1
       ) AS hasAccess`,
      [courseCycleId, userId],
    );
    return Number(professorResult[0]?.hasAccess) === 1;
  }

  private async listExpectedMemberEmails(
    evaluationId: string,
  ): Promise<string[]> {
    const result = await this.dataSource.query<Array<{ email: string | null }>>(
      `SELECT DISTINCT email
       FROM (
         SELECT LOWER(TRIM(u.email)) AS email
         FROM enrollment_evaluation ee
         INNER JOIN enrollment e ON e.id = ee.enrollment_id
         INNER JOIN user u ON u.id = e.user_id
         WHERE ee.evaluation_id = ?
           AND ee.is_active = 1
           AND ee.access_start_date <= NOW()
           AND ee.access_end_date >= NOW()
           AND e.cancelled_at IS NULL
           AND u.is_active = 1
           AND u.email IS NOT NULL
           AND TRIM(u.email) <> ''

       ) expected_members
       ORDER BY email ASC`,
      [evaluationId],
    );

    return result
      .map((row) =>
        String(row.email || '')
          .trim()
          .toLowerCase(),
      )
      .filter((email) => !!email);
  }

  private normalizeGroupMembers(
    members: Array<{ email?: string; role?: string }>,
  ): Array<{ email: string; role: string }> {
    const deduplicated = new Map<string, { email: string; role: string }>();
    for (const member of members || []) {
      const email = String(member?.email || '')
        .trim()
        .toLowerCase();
      if (!email) {
        continue;
      }
      if (!deduplicated.has(email)) {
        deduplicated.set(email, {
          email,
          role: String(member?.role || '')
            .trim()
            .toUpperCase(),
        });
      }
    }
    return Array.from(deduplicated.values());
  }

  private isRemovableMemberRole(role: string): boolean {
    return isGoogleGroupMemberRemovable(role);
  }

  private buildCourseCycleViewerGroupEmail(courseCycleId: string): string {
    const domain = String(
      this.configService.get<string>('GOOGLE_WORKSPACE_GROUP_DOMAIN', '') || '',
    )
      .trim()
      .toLowerCase();
    if (!domain) {
      throw new UnrecoverableError(
        'Falta GOOGLE_WORKSPACE_GROUP_DOMAIN para sync course_cycle',
      );
    }
    return `cc-${courseCycleId}-viewers@${domain}`;
  }

  private buildCourseCycleProfessorGroupEmail(courseCycleId: string): string {
    const domain = String(
      this.configService.get<string>('GOOGLE_WORKSPACE_GROUP_DOMAIN', '') || '',
    )
      .trim()
      .toLowerCase();
    if (!domain) {
      throw new UnrecoverableError(
        'Falta GOOGLE_WORKSPACE_GROUP_DOMAIN para sync course_cycle',
      );
    }
    return `cc-${courseCycleId}-professors@${domain}`;
  }

  private async syncCourseCycleGroupMembership(input: {
    groupEmail: string;
    groupName: string;
    groupDescription: string;
    shouldHaveMembership: boolean;
    memberEmail: string;
  }): Promise<void> {
    if (input.shouldHaveMembership) {
      await this.workspaceGroupsService.findOrCreateGroup({
        email: input.groupEmail,
        name: input.groupName,
        description: input.groupDescription,
      });
      await this.workspaceGroupsService.ensureMemberInGroup({
        groupEmail: input.groupEmail,
        memberEmail: input.memberEmail,
      });
      return;
    }
    await this.workspaceGroupsService.removeMemberFromGroup({
      groupEmail: input.groupEmail,
      memberEmail: input.memberEmail,
    });
  }
}

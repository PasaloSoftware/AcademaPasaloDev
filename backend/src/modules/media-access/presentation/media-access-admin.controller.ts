import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auth } from '@common/decorators/auth.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { UserWithSession } from '@modules/auth/strategies/jwt.strategy';
import { ROLE_CODES } from '@common/constants/role-codes.constants';
import { ResponseMessage } from '@common/decorators/response-message.decorator';
import { MediaAccessMembershipDispatchService } from '@modules/media-access/application/media-access-membership-dispatch.service';
import { CourseCycleDriveProvisioningService } from '@modules/media-access/application/course-cycle-drive-provisioning.service';
import { RecoverEvaluationScopeDto } from '@modules/media-access/dto/recover-evaluation-scope.dto';
import { MEDIA_ACCESS_SYNC_SOURCES } from '@modules/media-access/domain/media-access.constants';
import { Evaluation } from '@modules/evaluations/domain/evaluation.entity';

@Controller('admin/media-access')
@Auth(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
export class MediaAccessAdminController {
  constructor(
    @InjectRepository(Evaluation)
    private readonly evaluationRepository: Repository<Evaluation>,
    private readonly mediaAccessMembershipDispatchService: MediaAccessMembershipDispatchService,
    private readonly courseCycleDriveProvisioningService: CourseCycleDriveProvisioningService,
  ) {}

  @Post('evaluations/:evaluationId/recover-scope')
  @HttpCode(HttpStatus.ACCEPTED)
  @ResponseMessage('Recuperación de scope Drive encolada exitosamente')
  async recoverEvaluationScope(
    @CurrentUser() user: UserWithSession,
    @Param('evaluationId') evaluationId: string,
    @Body() dto: RecoverEvaluationScopeDto,
  ) {
    const normalizedEvaluationId = String(evaluationId || '').trim();
    const evaluation = await this.evaluationRepository.findOne({
      where: { id: normalizedEvaluationId },
      select: { id: true },
    });
    if (!evaluation) {
      throw new NotFoundException('Evaluación no encontrada');
    }

    const reconcileMembers = dto.reconcileMembers !== false;
    const pruneExtraMembers = dto.pruneExtraMembers === true;
    const result =
      await this.mediaAccessMembershipDispatchService.enqueueRecoverEvaluationScope(
        {
          evaluationId: normalizedEvaluationId,
          requestedByUserId: user.id,
          reconcileMembers,
          pruneExtraMembers,
          source: MEDIA_ACCESS_SYNC_SOURCES.ADMIN_MANUAL_RECOVERY,
        },
      );

    return {
      jobId: result.jobId,
      status: 'ENQUEUED',
      evaluationId: normalizedEvaluationId,
      reconcileMembers,
      pruneExtraMembers,
    };
  }

  @Post('course-cycles/:id/reprovision-drive')
  @HttpCode(HttpStatus.ACCEPTED)
  @ResponseMessage('Reprovisioning Drive encolado exitosamente')
  async reprovisionCourseCycleDrive(@Param('id') id: string) {
    const courseCycleId = String(id || '').trim();
    if (!courseCycleId) {
      throw new BadRequestException('courseCycleId es obligatorio');
    }

    const data =
      await this.courseCycleDriveProvisioningService.loadReprovisionData(
        courseCycleId,
      );
    if (!data) {
      throw new NotFoundException('Course cycle no encontrado');
    }

    await this.mediaAccessMembershipDispatchService.enqueueProvisionCourseSetup(
      {
        courseCycleId,
        courseCode: data.courseCode,
        cycleCode: data.cycleCode,
        evaluationIds: data.evaluationIds,
        bankCards: data.bankCards,
        bankFolders: data.bankFolders,
      },
    );

    return {
      status: 'ENQUEUED',
      courseCycleId,
      evaluationsToProvision: data.evaluationIds.length,
      bankFolderGroups: data.bankFolders.length,
    };
  }
}

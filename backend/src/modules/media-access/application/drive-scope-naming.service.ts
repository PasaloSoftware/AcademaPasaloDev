import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MEDIA_ACCESS_DRIVE_FOLDERS } from '@modules/media-access/domain/media-access.constants';

export type DriveEvaluationScopeNames = {
  evaluationId: string;
  scopeKey: string;
  parentFolderNames: string[];
  baseFolderName: string;
  videosFolderName: string;
  documentsFolderName: string;
  archivedFolderName: string;
  viewerGroupEmail: string;
};

@Injectable()
export class DriveScopeNamingService {
  constructor(private readonly configService: ConfigService) {}

  buildForEvaluation(evaluationId: string): DriveEvaluationScopeNames {
    const normalizedEvaluationId = this.normalizeEvaluationId(evaluationId);
    const workspaceDomain = this.getWorkspaceGroupDomain();

    return {
      evaluationId: normalizedEvaluationId,
      scopeKey: `ev_${normalizedEvaluationId}`,
      parentFolderNames: [MEDIA_ACCESS_DRIVE_FOLDERS.EVALUATIONS_PARENT],
      baseFolderName: `ev_${normalizedEvaluationId}`,
      videosFolderName: MEDIA_ACCESS_DRIVE_FOLDERS.EVALUATION_VIDEOS,
      documentsFolderName: MEDIA_ACCESS_DRIVE_FOLDERS.EVALUATION_DOCUMENTS,
      archivedFolderName: MEDIA_ACCESS_DRIVE_FOLDERS.EVALUATION_ARCHIVED,
      viewerGroupEmail: `ev-${normalizedEvaluationId}-viewers@${workspaceDomain}`,
    };
  }

  private normalizeEvaluationId(evaluationId: string): string {
    const normalized = String(evaluationId || '').trim();
    if (!/^\d+$/.test(normalized)) {
      throw new InternalServerErrorException(
        'evaluationId inválido para naming de Drive',
      );
    }
    return normalized;
  }

  private getWorkspaceGroupDomain(): string {
    const domain = (
      this.configService.get<string>('GOOGLE_WORKSPACE_GROUP_DOMAIN', '') || ''
    )
      .trim()
      .toLowerCase();

    if (!domain) {
      throw new InternalServerErrorException(
        'Falta GOOGLE_WORKSPACE_GROUP_DOMAIN en configuración',
      );
    }

    return domain;
  }
}

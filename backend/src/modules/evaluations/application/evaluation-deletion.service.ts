import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EvaluationRepository } from '@modules/evaluations/infrastructure/evaluation.repository';
import { EvaluationDriveAccessProvisioningService } from '@modules/media-access/application/evaluation-drive-access-provisioning.service';
import { MediaAccessMembershipDispatchService } from '@modules/media-access/application/media-access-membership-dispatch.service';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { COURSE_CACHE_KEYS } from '@modules/courses/domain/course.constants';
import { EVALUATION_TYPE_CODES } from '@modules/evaluations/domain/evaluation.constants';

@Injectable()
export class EvaluationDeletionService {
  private readonly logger = new Logger(EvaluationDeletionService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly evaluationRepository: EvaluationRepository,
    private readonly driveAccessProvisioningService: EvaluationDriveAccessProvisioningService,
    private readonly mediaAccessDispatch: MediaAccessMembershipDispatchService,
    private readonly cacheService: RedisCacheService,
  ) {}

  async delete(evaluationId: string): Promise<void> {
    const normalizedId = String(evaluationId || '').trim();
    if (!normalizedId) {
      throw new BadRequestException('El id de evaluacion es obligatorio.');
    }

    const evaluation =
      await this.evaluationRepository.findByIdWithType(normalizedId);
    if (!evaluation) {
      throw new NotFoundException('Evaluación no encontrada.');
    }

    const typeCode = String(evaluation.evaluationType?.code || '')
      .trim()
      .toUpperCase();
    if (typeCode === EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS) {
      throw new BadRequestException(
        'No se puede eliminar una evaluación de tipo Banco de Enunciados.',
      );
    }

    const driveSnapshot =
      await this.driveAccessProvisioningService.getDriveAccessSnapshot(
        normalizedId,
      );

    const currentDisplayOrder =
      await this.evaluationRepository.findDisplayOrderById(normalizedId);

    await this.dataSource.transaction(async (manager) => {
      // 1. Eliminar materiales de las carpetas de esta evaluacion (1 query, sin N+1)
      await manager.query(
        `DELETE m FROM material m
         INNER JOIN material_folder mf ON mf.id = m.material_folder_id
         WHERE mf.evaluation_id = ?`,
        [normalizedId],
      );

      // 2. Eliminar material_folder respetando la FK autorreferencial (depth max: technicalSettings.materials.maxFolderDepth)
      // Nivel 3: hijos cuyos padres tienen padre (hojas de tercer nivel)
      await manager.query(
        `DELETE mf FROM material_folder mf
         INNER JOIN material_folder parent ON mf.parent_folder_id = parent.id
         WHERE mf.evaluation_id = ? AND parent.parent_folder_id IS NOT NULL`,
        [normalizedId],
      );
      // Nivel 2: hijos directos de las raices
      await manager.query(
        `DELETE FROM material_folder WHERE evaluation_id = ? AND parent_folder_id IS NOT NULL`,
        [normalizedId],
      );
      // Nivel 1: raices
      await manager.query(
        `DELETE FROM material_folder WHERE evaluation_id = ?`,
        [normalizedId],
      );

      // 3. Eliminar accesos de estudiantes
      await manager.query(
        `DELETE FROM enrollment_evaluation WHERE evaluation_id = ?`,
        [normalizedId],
      );

      // 4. Eliminar registro de acceso Drive (los IDs se capturaron antes de la transaccion)
      await manager.query(
        `DELETE FROM evaluation_drive_access WHERE evaluation_id = ?`,
        [normalizedId],
      );

      // 5. Renumerar evaluaciones del mismo tipo que tengan number mayor al eliminado
      await manager.query(
        `UPDATE evaluation
         SET number = number - 1
         WHERE course_cycle_id = ?
           AND evaluation_type_id = ?
           AND number > ?`,
        [
          evaluation.courseCycleId,
          evaluation.evaluationTypeId,
          evaluation.number,
        ],
      );

      // 6. Compactar display_order si la columna existe
      if (currentDisplayOrder !== null) {
        await manager.query(
          `UPDATE evaluation
           SET display_order = display_order - 1
           WHERE course_cycle_id = ?
             AND display_order > ?`,
          [evaluation.courseCycleId, currentDisplayOrder],
        );
      }

      // 7. Eliminar la evaluacion
      await manager.query(`DELETE FROM evaluation WHERE id = ?`, [
        normalizedId,
      ]);
    });

    if (driveSnapshot) {
      await this.mediaAccessDispatch.enqueueEvaluationScopeTeardown({
        evaluationId: normalizedId,
        viewerGroupEmail: driveSnapshot.viewerGroupEmail,
        driveScopeFolderId: driveSnapshot.driveScopeFolderId,
      });
    }

    await this.cacheService.invalidateIndex(
      COURSE_CACHE_KEYS.CONTENT_BY_CYCLE_INDEX(evaluation.courseCycleId),
    );

    this.logger.log({
      message: 'Evaluación eliminada exitosamente',
      evaluationId: normalizedId,
      courseCycleId: evaluation.courseCycleId,
      evaluationTypeId: evaluation.evaluationTypeId,
      number: evaluation.number,
      driveSnapshotFound: driveSnapshot !== null,
    });
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvaluationDriveAccess } from '@modules/media-access/domain/evaluation-drive-access.entity';
import { DriveScopeNamingService } from '@modules/media-access/application/drive-scope-naming.service';
import { DriveAccessScopeService } from '@modules/media-access/application/drive-access-scope.service';
import { EvaluationDriveAccessRepository } from '@modules/media-access/infrastructure/evaluation-drive-access.repository';

@Module({
  imports: [TypeOrmModule.forFeature([EvaluationDriveAccess])],
  providers: [
    DriveScopeNamingService,
    DriveAccessScopeService,
    EvaluationDriveAccessRepository,
  ],
  exports: [
    DriveScopeNamingService,
    DriveAccessScopeService,
    EvaluationDriveAccessRepository,
  ],
})
export class MediaAccessModule {}


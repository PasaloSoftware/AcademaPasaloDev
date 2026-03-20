import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialsService } from './application/materials.service';
import { MaterialsDeletionService } from './application/materials-deletion.service';
import { MaterialsFolderService } from './application/materials-folder.service';
import { MaterialsExplorerService } from './application/materials-explorer.service';
import { MaterialsReadService } from './application/materials-read.service';
import { MaterialsAdminService } from './application/materials-admin.service';
import { MaterialsController } from './presentation/materials.controller';

import { MaterialsAdminController } from './presentation/materials-admin.controller';
import { AuditModule } from '@modules/audit/audit.module';
import { MaterialFolder } from './domain/material-folder.entity';
import { Material } from './domain/material.entity';
import { FileResource } from './domain/file-resource.entity';
import { MaterialVersion } from './domain/material-version.entity';
import { DeletionRequest } from './domain/deletion-request.entity';
import { FolderStatus } from './domain/folder-status.entity';
import { MaterialStatus } from './domain/material-status.entity';
import { DeletionRequestStatus } from './domain/deletion-request-status.entity';

import { MaterialFolderRepository } from './infrastructure/material-folder.repository';
import { MaterialRepository } from './infrastructure/material.repository';
import { FileResourceRepository } from './infrastructure/file-resource.repository';
import { MaterialVersionRepository } from './infrastructure/material-version.repository';
import { MaterialVersionHistoryRepository } from './infrastructure/material-version-history.repository';
import { DeletionRequestRepository } from './infrastructure/deletion-request.repository';
import { MaterialCatalogRepository } from './infrastructure/material-catalog.repository';
import { StorageModule } from '@infrastructure/storage/storage.module';
import { EnrollmentsModule } from '@modules/enrollments/enrollments.module';
import { CoursesModule } from '@modules/courses/courses.module';
import { ClassEventsModule } from '@modules/events/class-events.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { MediaAccessModule } from '@modules/media-access/media-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MaterialFolder,
      Material,
      FileResource,
      MaterialVersion,
      DeletionRequest,
      FolderStatus,
      MaterialStatus,
      DeletionRequestStatus,
    ]),
    StorageModule,
    EnrollmentsModule,
    CoursesModule,
    ClassEventsModule,
    MediaAccessModule,
    AuditModule,
    NotificationsModule,
  ],
  controllers: [MaterialsController, MaterialsAdminController],
  providers: [
    MaterialsService,
    MaterialsDeletionService,
    MaterialsFolderService,
    MaterialsExplorerService,
    MaterialsReadService,
    MaterialsAdminService,
    MaterialFolderRepository,
    MaterialRepository,
    FileResourceRepository,
    MaterialVersionRepository,
    MaterialVersionHistoryRepository,
    DeletionRequestRepository,
    MaterialCatalogRepository,
  ],
  exports: [MaterialsService, MaterialsAdminService],
})
export class MaterialsModule {}

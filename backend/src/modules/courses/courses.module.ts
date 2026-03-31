import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '@modules/courses/domain/course.entity';
import { CourseType } from '@modules/courses/domain/course-type.entity';
import { CycleLevel } from '@modules/courses/domain/cycle-level.entity';
import { CourseCycle } from '@modules/courses/domain/course-cycle.entity';
import { CourseCycleProfessor } from '@modules/courses/domain/course-cycle-professor.entity';
import { CourseCycleAllowedEvaluationType } from '@modules/courses/domain/course-cycle-allowed-evaluation-type.entity';
import { MaterialFolder } from '@modules/materials/domain/material-folder.entity';
import { Material } from '@modules/materials/domain/material.entity';
import { FileResource } from '@modules/materials/domain/file-resource.entity';
import { MaterialVersion } from '@modules/materials/domain/material-version.entity';
import { FolderStatus } from '@modules/materials/domain/folder-status.entity';
import { MaterialStatus } from '@modules/materials/domain/material-status.entity';
import { DeletionRequestStatus } from '@modules/materials/domain/deletion-request-status.entity';
import { CourseRepository } from '@modules/courses/infrastructure/course.repository';
import { CourseTypeRepository } from '@modules/courses/infrastructure/course-type.repository';
import { CycleLevelRepository } from '@modules/courses/infrastructure/cycle-level.repository';
import { CourseCycleRepository } from '@modules/courses/infrastructure/course-cycle.repository';
import { CourseCycleProfessorRepository } from '@modules/courses/infrastructure/course-cycle-professor.repository';
import { CourseCycleAllowedEvaluationTypeRepository } from '@modules/courses/infrastructure/course-cycle-allowed-evaluation-type.repository';
import { CoursesService } from '@modules/courses/application/courses.service';
import { CourseSetupService } from '@modules/courses/application/course-setup.service';
import { CoursesController } from '@modules/courses/presentation/courses.controller';
import { AuthModule } from '@modules/auth/auth.module';
import { EvaluationsModule } from '@modules/evaluations/evaluations.module';
import { CyclesModule } from '@modules/cycles/cycles.module';
import { MediaAccessModule } from '@modules/media-access/media-access.module';
import { StorageModule } from '@infrastructure/storage/storage.module';
import { MaterialFolderRepository } from '@modules/materials/infrastructure/material-folder.repository';
import { MaterialRepository } from '@modules/materials/infrastructure/material.repository';
import { FileResourceRepository } from '@modules/materials/infrastructure/file-resource.repository';
import { MaterialCatalogRepository } from '@modules/materials/infrastructure/material-catalog.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      CourseType,
      CycleLevel,
      CourseCycle,
      CourseCycleProfessor,
      CourseCycleAllowedEvaluationType,
      MaterialFolder,
      Material,
      FileResource,
      MaterialVersion,
      FolderStatus,
      MaterialStatus,
      DeletionRequestStatus,
    ]),
    AuthModule,
    forwardRef(() => EvaluationsModule),
    CyclesModule,
    MediaAccessModule,
    StorageModule,
  ],
  controllers: [CoursesController],
  providers: [
    CourseRepository,
    CourseTypeRepository,
    CycleLevelRepository,
    CourseCycleRepository,
    CourseCycleProfessorRepository,
    CourseCycleAllowedEvaluationTypeRepository,
    MaterialFolderRepository,
    MaterialRepository,
    FileResourceRepository,
    MaterialCatalogRepository,
    CoursesService,
    CourseSetupService,
  ],
  exports: [
    CourseRepository,
    CourseTypeRepository,
    CycleLevelRepository,
    CourseCycleRepository,
    CourseCycleProfessorRepository,
    CourseCycleAllowedEvaluationTypeRepository,
    MaterialFolderRepository,
    MaterialRepository,
    FileResourceRepository,
    MaterialCatalogRepository,
    CoursesService,
    CourseSetupService,
  ],
})
export class CoursesModule {}

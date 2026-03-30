import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedbackController } from '@modules/feedback/presentation/feedback.controller';
import { FeedbackService } from '@modules/feedback/application/feedback.service';
import { CourseTestimony } from '@modules/feedback/domain/course-testimony.entity';
import { CourseTestimonyRepository } from '@modules/feedback/infrastructure/course-testimony.repository';
import { EnrollmentsModule } from '@modules/enrollments/enrollments.module';

@Module({
  imports: [TypeOrmModule.forFeature([CourseTestimony]), EnrollmentsModule],
  controllers: [FeedbackController],
  providers: [FeedbackService, CourseTestimonyRepository],
})
export class FeedbackModule {}

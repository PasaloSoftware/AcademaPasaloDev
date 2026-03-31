import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FeedbackService } from '@modules/feedback/application/feedback.service';
import { CreateTestimonyDto } from '@modules/feedback/dto/create-testimony.dto';
import { FeatureTestimonyDto } from '@modules/feedback/dto/feature-testimony.dto';
import {
  PublicTestimonyResponseDto,
  TestimonyResponseDto,
} from '@modules/feedback/dto/feedback-response.dto';
import { Auth } from '@common/decorators/auth.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ResponseMessage } from '@common/decorators/response-message.decorator';
import { User } from '@modules/users/domain/user.entity';
import { plainToInstance } from 'class-transformer';
import { ROLE_CODES } from '@common/constants/role-codes.constants';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @Auth()
  @Roles(ROLE_CODES.STUDENT)
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Gracias por tu opinion!')
  async create(@CurrentUser() user: User, @Body() dto: CreateTestimonyDto) {
    const testimony = await this.feedbackService.createTestimony(user.id, dto);
    return plainToInstance(TestimonyResponseDto, testimony, {
      excludeExtraneousValues: true,
    });
  }

  @Post('admin/:id/feature')
  @Auth()
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Visibilidad de testimonio actualizada')
  async feature(
    @CurrentUser() user: User,
    @Param('id') testimonyId: string,
    @Body() dto: FeatureTestimonyDto,
  ) {
    const testimony = await this.feedbackService.featureTestimony(
      user.id,
      testimonyId,
      dto,
    );
    return plainToInstance(TestimonyResponseDto, testimony, {
      excludeExtraneousValues: true,
    });
  }

  @Get('public')
  @ResponseMessage('Testimonios destacados obtenidos')
  async getPublic() {
    const testimonies = await this.feedbackService.getPublicTestimonies();
    const payload = testimonies.map((testimony) => ({
      id: testimony.id,
      rating: testimony.rating,
      comment: testimony.comment,
      createdAt: testimony.createdAt,
      user: {
        firstName: testimony.user?.firstName,
        lastName1: testimony.user?.lastName1,
        profilePhotoUrl: testimony.user?.profilePhotoUrl ?? null,
        careerName: testimony.user?.career?.name ?? null,
      },
      courseName: testimony.courseCycle?.course?.name ?? '',
    }));

    return plainToInstance(PublicTestimonyResponseDto, payload, {
      excludeExtraneousValues: true,
    });
  }

  @Get('admin/course-cycle/:id')
  @Auth()
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Listado completo de testimonios')
  async getAdmin(@Param('id') courseCycleId: string) {
    const testimonies =
      await this.feedbackService.getAllTestimoniesAdmin(courseCycleId);
    return plainToInstance(TestimonyResponseDto, testimonies, {
      excludeExtraneousValues: true,
    });
  }
}

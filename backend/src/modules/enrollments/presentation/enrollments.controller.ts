import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EnrollmentsService } from '@modules/enrollments/application/enrollments.service';
import { CreateEnrollmentDto } from '@modules/enrollments/dto/create-enrollment.dto';
import { Auth } from '@common/decorators/auth.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@modules/users/domain/user.entity';
import { ResponseMessage } from '@common/decorators/response-message.decorator';
import { ROLE_CODES } from '@common/constants/role-codes.constants';
import {
  EnrollmentCourseCycleOptionsResponseDto,
  EnrollmentOptionsResponseDto,
} from '@modules/enrollments/dto/enrollment-options.dto';
import { plainToInstance } from 'class-transformer';
import {
  AdminCourseCycleStudentsQueryDto,
  AdminCourseCycleStudentsResponseDto,
} from '@modules/enrollments/dto/admin-course-cycle-students.dto';

@Controller('enrollments')
@Auth()
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Usuario matriculado exitosamente en el curso')
  async enroll(@Body() dto: CreateEnrollmentDto) {
    const enrollment = await this.enrollmentsService.enroll(dto);
    return enrollment;
  }

  @Get('options/course-cycle/:courseCycleId')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Opciones de matricula obtenidas exitosamente')
  async getEnrollmentOptions(@Param('courseCycleId') courseCycleId: string) {
    const data =
      await this.enrollmentsService.getEnrollmentOptionsByCourseCycle(
        courseCycleId,
      );
    return plainToInstance(EnrollmentOptionsResponseDto, data, {
      excludeExtraneousValues: true,
    });
  }

  @Get('options/course/:courseId/cycles')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Opciones de ciclo por curso obtenidas exitosamente')
  async getCourseCycleOptionsByCourse(@Param('courseId') courseId: string) {
    const data =
      await this.enrollmentsService.getEnrollmentCourseCycleOptions(courseId);
    return plainToInstance(EnrollmentCourseCycleOptionsResponseDto, data, {
      excludeExtraneousValues: true,
    });
  }

  @Get('course-cycle/:courseCycleId/students')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Alumnos matriculados obtenidos exitosamente')
  async getAdminStudentsByCourseCycle(
    @Param('courseCycleId') courseCycleId: string,
    @Query() query: AdminCourseCycleStudentsQueryDto,
  ) {
    const data = await this.enrollmentsService.findAdminStudentsByCourseCycle(
      courseCycleId,
      query,
    );
    return plainToInstance(AdminCourseCycleStudentsResponseDto, data, {
      excludeExtraneousValues: true,
    });
  }

  @Get('my-courses')
  @Roles(
    ROLE_CODES.STUDENT,
    ROLE_CODES.ADMIN,
    ROLE_CODES.PROFESSOR,
    ROLE_CODES.SUPER_ADMIN,
  )
  @ResponseMessage('Listado de cursos obtenido exitosamente')
  async getMyCourses(@CurrentUser() user: User) {
    return await this.enrollmentsService.findMyEnrollments(user.id);
  }

  @Delete(':id')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ResponseMessage('Matrícula cancelada exitosamente')
  async cancel(@Param('id') id: string) {
    await this.enrollmentsService.cancelEnrollment(id);
  }
}

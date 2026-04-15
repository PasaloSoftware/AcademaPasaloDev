import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CoursesService } from '@modules/courses/application/courses.service';
import {
  CourseResponseDto,
  CourseTypeResponseDto,
  CycleLevelResponseDto,
} from '@modules/courses/dto/course-response.dto';
import { CourseContentResponseDto } from '@modules/courses/dto/course-content.dto';
import {
  StudentBankStructureResponseDto,
  StudentCurrentCycleContentResponseDto,
  StudentPreviousCycleContentResponseDto,
  StudentPreviousCycleListResponseDto,
} from '@modules/courses/dto/student-course-view.dto';
import { UserResponseDto } from '@modules/users/dto/user-response.dto';
import { UpdateCourseDto } from '@modules/courses/dto/update-course.dto';
import { UpdateCourseStatusDto } from '@modules/courses/dto/update-course-status.dto';
import { AssignCourseCycleProfessorDto } from '@modules/courses/dto/assign-course-cycle-professor.dto';
import { UpdateCourseCycleEvaluationStructureDto } from '@modules/courses/dto/update-course-cycle-evaluation-structure.dto';
import { UpdateCourseCycleIntroVideoDto } from '@modules/courses/dto/update-course-cycle-intro-video.dto';
import { CreateCourseSetupDto } from '@modules/courses/dto/create-course-setup.dto';
import {
  UploadBankDocumentDto,
  UploadBankDocumentResponseDto,
} from '@modules/courses/dto/bank-documents.dto';
import {
  AdminCourseCycleListQueryDto,
  AdminCourseCycleListResponseDto,
} from '@modules/courses/dto/admin-course-cycle-list.dto';
import { Auth } from '@common/decorators/auth.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@modules/users/domain/user.entity';
import { ResponseMessage } from '@common/decorators/response-message.decorator';
import { plainToInstance } from 'class-transformer';
import { ROLE_CODES } from '@common/constants/role-codes.constants';
import type { UserWithSession } from '@modules/auth/strategies/jwt.strategy';
import { CourseSetupService } from '@modules/courses/application/course-setup.service';
import { MyEnrollmentsResponseDto } from '@modules/enrollments/dto/my-enrollments-response.dto';

@Controller('courses')
@Auth()
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly courseSetupService: CourseSetupService,
  ) {}

  @Post('setup')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Configuracion integral de curso creada exitosamente')
  async createCourseSetup(
    @CurrentUser() user: UserWithSession,
    @Body() dto: CreateCourseSetupDto,
  ) {
    return await this.courseSetupService.createFullCourseSetup(user, dto);
  }

  @Get('cycle/:id/content')
  @Roles(ROLE_CODES.PROFESSOR, ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Contenido del curso obtenido exitosamente')
  async getCourseContent(
    @Param('id') courseCycleId: string,
    @CurrentUser() user: User,
  ) {
    const content = await this.coursesService.getCourseContent(
      courseCycleId,
      user.id,
      (user as UserWithSession).activeRole,
    );
    return plainToInstance(CourseContentResponseDto, content, {
      excludeExtraneousValues: true,
    });
  }

  @Get('cycle/:id/current')
  @Roles(ROLE_CODES.STUDENT)
  @ResponseMessage(
    'Contenido del ciclo vigente del curso obtenido exitosamente',
  )
  async getCurrentCycleContentForStudent(
    @Param('id') courseCycleId: string,
    @CurrentUser() user: User,
  ) {
    const content = await this.coursesService.getStudentCurrentCycleContent(
      courseCycleId,
      user.id,
    );
    return plainToInstance(StudentCurrentCycleContentResponseDto, content, {
      excludeExtraneousValues: true,
    });
  }

  @Get('cycle/:id/previous-cycles')
  @Roles(
    ROLE_CODES.STUDENT,
    ROLE_CODES.PROFESSOR,
    ROLE_CODES.ADMIN,
    ROLE_CODES.SUPER_ADMIN,
  )
  @ResponseMessage('Ciclos anteriores del curso obtenidos exitosamente')
  async getPreviousCyclesForStudent(
    @Param('id') courseCycleId: string,
    @CurrentUser() user: User,
  ) {
    const cycles = await this.coursesService.getStudentPreviousCycles(
      courseCycleId,
      user.id,
      (user as UserWithSession).activeRole,
    );
    return plainToInstance(StudentPreviousCycleListResponseDto, cycles, {
      excludeExtraneousValues: true,
    });
  }

  @Get('cycle/:id/previous-cycles/:cycleCode/content')
  @Roles(
    ROLE_CODES.STUDENT,
    ROLE_CODES.PROFESSOR,
    ROLE_CODES.ADMIN,
    ROLE_CODES.SUPER_ADMIN,
  )
  @ResponseMessage(
    'Contenido del ciclo anterior del curso obtenido exitosamente',
  )
  async getPreviousCycleContentForStudent(
    @Param('id') courseCycleId: string,
    @Param('cycleCode') cycleCode: string,
    @CurrentUser() user: User,
  ) {
    const content = await this.coursesService.getStudentPreviousCycleContent(
      courseCycleId,
      cycleCode,
      user.id,
      (user as UserWithSession).activeRole,
    );
    return plainToInstance(StudentPreviousCycleContentResponseDto, content, {
      excludeExtraneousValues: true,
    });
  }

  @Get('cycle/:id/bank-structure')
  @Roles(
    ROLE_CODES.STUDENT,
    ROLE_CODES.PROFESSOR,
    ROLE_CODES.ADMIN,
    ROLE_CODES.SUPER_ADMIN,
  )
  @ResponseMessage(
    'Estructura del banco de enunciados del curso obtenida exitosamente',
  )
  async getBankStructureForStudent(
    @Param('id') courseCycleId: string,
    @CurrentUser() user: User,
  ) {
    const structure = await this.coursesService.getStudentBankStructure(
      courseCycleId,
      user.id,
      (user as UserWithSession).activeRole,
    );
    return plainToInstance(StudentBankStructureResponseDto, structure, {
      excludeExtraneousValues: true,
    });
  }

  @Post('cycle/:id/bank-documents')
  @Roles(ROLE_CODES.PROFESSOR, ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Archivo del banco subido exitosamente')
  async uploadBankDocument(
    @Param('id') courseCycleId: string,
    @CurrentUser() user: User,
    @Body() dto: UploadBankDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const material = await this.coursesService.uploadBankDocument(
      user,
      courseCycleId,
      dto,
      file,
      (user as UserWithSession).activeRole,
    );
    return plainToInstance(UploadBankDocumentResponseDto, material, {
      excludeExtraneousValues: true,
    });
  }

  @Get('cycle/:id/intro-video-link')
  @Roles(
    ROLE_CODES.STUDENT,
    ROLE_CODES.PROFESSOR,
    ROLE_CODES.ADMIN,
    ROLE_CODES.SUPER_ADMIN,
  )
  @ResponseMessage(
    'URL autorizada de video introductorio obtenida exitosamente',
  )
  async getAuthorizedIntroVideoLink(
    @Param('id') courseCycleId: string,
    @CurrentUser() user: User,
  ) {
    return await this.coursesService.getAuthorizedCourseIntroVideoLink(
      user,
      courseCycleId,
      (user as UserWithSession).activeRole,
    );
  }

  @Patch(':id')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Materia actualizada exitosamente')
  async update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ) {
    const course = await this.coursesService.update(id, updateCourseDto);
    return plainToInstance(CourseResponseDto, course, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id/status')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Estado de materia actualizado exitosamente')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCourseStatusDto,
  ) {
    const course = await this.coursesService.updateStatus(id, dto);
    return plainToInstance(CourseResponseDto, course, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ResponseMessage('Materia eliminada exitosamente')
  async delete(@Param('id') id: string): Promise<void> {
    await this.coursesService.delete(id);
  }

  @Put('cycle/:id/evaluation-structure')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Estructura de evaluacion actualizada exitosamente')
  async updateEvaluationStructure(
    @Param('id') courseCycleId: string,
    @Body() dto: UpdateCourseCycleEvaluationStructureDto,
  ) {
    return await this.coursesService.updateCourseCycleEvaluationStructure(
      courseCycleId,
      dto.evaluationTypeIds,
    );
  }

  @Patch('cycle/:id/intro-video')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Video introductorio del curso actualizado exitosamente')
  async updateCourseCycleIntroVideo(
    @Param('id') courseCycleId: string,
    @Body() dto: UpdateCourseCycleIntroVideoDto,
  ): Promise<void> {
    await this.coursesService.updateCourseCycleIntroVideo(
      courseCycleId,
      dto.introVideoUrl,
    );
  }

  @Get('cycle/:id/professors')
  @Roles(ROLE_CODES.PROFESSOR, ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Profesores del curso obtenidos exitosamente')
  async getProfessorsByCycle(
    @Param('id') courseCycleId: string,
    @CurrentUser() user: User,
  ) {
    const professors = await this.coursesService.getProfessorsByCourseCycle(
      courseCycleId,
      user.id,
      (user as UserWithSession).activeRole,
    );
    return plainToInstance(UserResponseDto, professors, {
      excludeExtraneousValues: true,
    });
  }

  @Post('cycle/:id/professors')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Profesor asignado al curso/ciclo exitosamente')
  async assignProfessorToCycle(
    @Param('id') courseCycleId: string,
    @Body() dto: AssignCourseCycleProfessorDto,
  ): Promise<void> {
    await this.coursesService.assignProfessorToCourseCycle(
      courseCycleId,
      dto.professorUserId,
    );
  }

  @Delete('cycle/:id/professors/:professorUserId')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ResponseMessage('Profesor removido del curso/ciclo exitosamente')
  async revokeProfessorFromCycle(
    @Param('id') courseCycleId: string,
    @Param('professorUserId') professorUserId: string,
  ): Promise<void> {
    await this.coursesService.revokeProfessorFromCourseCycle(
      courseCycleId,
      professorUserId,
    );
  }

  @Get('my-courses')
  @Roles(ROLE_CODES.PROFESSOR)
  @ResponseMessage('Cursos del profesor obtenidos exitosamente')
  async getMyCourses(
    @CurrentUser() user: User,
  ): Promise<MyEnrollmentsResponseDto[]> {
    return await this.coursesService.getMyCourseCycles(user.id);
  }

  @Get()
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Materias obtenidas exitosamente')
  async findAll() {
    const courses = await this.coursesService.findAllCourses();
    return plainToInstance(CourseResponseDto, courses, {
      excludeExtraneousValues: true,
    });
  }

  @Get('course-cycles')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Curso-ciclos obtenidos exitosamente')
  async findAllCourseCycles(@Query() query: AdminCourseCycleListQueryDto) {
    const data = await this.coursesService.findAdminCourseCycles(query);
    return plainToInstance(AdminCourseCycleListResponseDto, data, {
      excludeExtraneousValues: true,
    });
  }

  @Get('types')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Tipos de curso obtenidos exitosamente')
  async findAllTypes() {
    const types = await this.coursesService.findAllTypes();
    return plainToInstance(CourseTypeResponseDto, types, {
      excludeExtraneousValues: true,
    });
  }

  @Get('levels')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Niveles académicos obtenidos exitosamente')
  async findAllLevels() {
    const levels = await this.coursesService.findAllLevels();
    return plainToInstance(CycleLevelResponseDto, levels, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Materia obtenida exitosamente')
  async findOne(@Param('id') id: string) {
    const course = await this.coursesService.findCourseById(id);
    return plainToInstance(CourseResponseDto, course, {
      excludeExtraneousValues: true,
    });
  }
}

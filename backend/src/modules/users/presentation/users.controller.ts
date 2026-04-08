import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { UsersService } from '@modules/users/application/users.service';
import { CareersCatalogService } from '@modules/users/application/careers-catalog.service';
import { CreateUserDto } from '@modules/users/dto/create-user.dto';
import { UpdateUserDto } from '@modules/users/dto/update-user.dto';
import { UserResponseDto } from '@modules/users/dto/user-response.dto';
import { CareerCatalogItemDto } from '@modules/users/dto/career-catalog-item.dto';
import {
  AdminUsersListQueryDto,
  AdminUsersRoleFilterOptionDto,
  AdminUsersListResponseDto,
  AdminUsersStatusFilterOptionDto,
} from '@modules/users/dto/admin-users-list.dto';
import {
  AdminCourseOptionDto,
  AdminUserDetailResponseDto,
} from '@modules/users/dto/admin-user-detail.dto';
import {
  AdminUserOnboardingDto,
  AdminUserOnboardingResponseDto,
} from '@modules/users/dto/admin-user-onboarding.dto';
import {
  AdminUserEditDto,
  AdminUserEditResponseDto,
} from '@modules/users/dto/admin-user-edit.dto';
import { UpdateUserStatusDto } from '@modules/users/dto/update-user-status.dto';
import { ResponseMessage } from '@common/decorators/response-message.decorator';
import { plainToInstance } from 'class-transformer';
import { Auth } from '@common/decorators/auth.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@modules/users/domain/user.entity';
import {
  ADMIN_ROLE_CODES,
  ROLE_CODES,
} from '@common/constants/role-codes.constants';

@Controller('users')
@Auth()
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly careersCatalogService: CareersCatalogService,
  ) {}

  @Get('catalog/careers')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Carreras obtenidas exitosamente')
  async listCareers() {
    const careers = await this.careersCatalogService.listCareers();
    return careers.map((career) =>
      plainToInstance(CareerCatalogItemDto, career, {
        excludeExtraneousValues: true,
      }),
    );
  }

  @Post()
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Usuario creado exitosamente')
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Post('students')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Alumno creado exitosamente')
  async createStudent(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.createWithRole(
      createUserDto,
      ROLE_CODES.STUDENT,
    );
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Post('professors')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Profesor creado exitosamente')
  async createProfessor(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.createWithRole(
      createUserDto,
      ROLE_CODES.PROFESSOR,
    );
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Post('admins')
  @Roles(ROLE_CODES.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Administrador creado exitosamente')
  async createAdmin(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.createWithRole(
      createUserDto,
      ROLE_CODES.ADMIN,
    );
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Post('admin-onboarding')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Usuario registrado integralmente exitosamente')
  async adminOnboarding(@Body() dto: AdminUserOnboardingDto) {
    const response = await this.usersService.adminOnboard(dto);
    return plainToInstance(AdminUserOnboardingResponseDto, response, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Usuarios obtenidos exitosamente')
  async findAll(@Query() query: AdminUsersListQueryDto) {
    const response = await this.usersService.findAdminUsersTable(query);
    return plainToInstance(AdminUsersListResponseDto, response, {
      excludeExtraneousValues: true,
    });
  }

  @Get('filters/roles')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Filtros de roles obtenidos exitosamente')
  listRoleFilters() {
    return plainToInstance(
      AdminUsersRoleFilterOptionDto,
      this.usersService.listAdminRoleFilterOptions(),
      { excludeExtraneousValues: true },
    );
  }

  @Get('filters/statuses')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Filtros de estado obtenidos exitosamente')
  listStatusFilters() {
    return plainToInstance(
      AdminUsersStatusFilterOptionDto,
      this.usersService.listAdminStatusFilterOptions(),
      { excludeExtraneousValues: true },
    );
  }

  @Get('catalog/courses')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Cursos obtenidos exitosamente')
  async listCoursesCatalog() {
    const items = await this.usersService.listAdminCourseOptions();
    return plainToInstance(AdminCourseOptionDto, items, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id/admin-detail')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Detalle administrativo de usuario obtenido exitosamente')
  async findAdminDetail(@Param('id') id: string) {
    const response = await this.usersService.findAdminUserDetail(id);
    return plainToInstance(AdminUserDetailResponseDto, response, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  @ResponseMessage('Usuario obtenido exitosamente')
  async findOne(@Param('id') id: string, @CurrentUser() currentUser: User) {
    const isAdmin = currentUser.roles.some((r) =>
      ADMIN_ROLE_CODES.includes(r.code),
    );

    if (!isAdmin && currentUser.id !== id) {
      throw new ForbiddenException(
        'No tienes permiso para acceder a este perfil',
      );
    }

    const user = await this.usersService.findOne(id);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id/admin-edit')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Usuario editado integralmente exitosamente')
  async adminEdit(
    @Param('id') id: string,
    @Body() dto: AdminUserEditDto,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug({
      message: 'Request admin-edit recibida',
      targetUserId: id,
      performedByUserId: currentUser.id,
      roleCodesFinal: dto.roleCodesFinal || [],
      studentStateFinal: {
        enrollments: (dto.studentStateFinal?.enrollments || []).map(
          (enrollment) => ({
            courseCycleId: enrollment.courseCycleId,
            enrollmentTypeCode: enrollment.enrollmentTypeCode,
            evaluationIds: enrollment.evaluationIds || [],
            historicalCourseCycleIds:
              enrollment.historicalCourseCycleIds || [],
          }),
        ),
      },
      professorStateFinal: {
        courseCycleIds: dto.professorStateFinal?.courseCycleIds || [],
      },
      timestamp: new Date().toISOString(),
    });

    const response = await this.usersService.adminEdit(id, dto, currentUser.id);
    return plainToInstance(AdminUserEditResponseDto, response, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Usuario actualizado exitosamente')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(id, updateUserDto);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id/status')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Estado de usuario actualizado exitosamente')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() currentUser: User,
  ) {
    if (currentUser.id === id && dto.isActive === false) {
      throw new ForbiddenException('No puedes desactivar tu propia cuenta');
    }

    const user = await this.usersService.update(id, { isActive: dto.isActive });
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id/ban')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Usuario baneado exitosamente')
  async banUser(@Param('id') id: string, @CurrentUser() currentUser: User) {
    if (currentUser.id === id) {
      throw new ForbiddenException('No puedes banear tu propia cuenta');
    }

    const user = await this.usersService.update(id, { isActive: false });
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ResponseMessage('Usuario eliminado exitosamente')
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
  }

  @Post(':id/roles/:roleCode')
  @Roles(ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Rol asignado exitosamente')
  async assignRole(
    @Param('id') id: string,
    @Param('roleCode') roleCode: string,
  ) {
    const user = await this.usersService.assignRole(id, roleCode);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id/roles/:roleCode')
  @Roles(ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Rol removido exitosamente')
  async removeRole(
    @Param('id') id: string,
    @Param('roleCode') roleCode: string,
  ) {
    const user = await this.usersService.removeRole(id, roleCode);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }
}

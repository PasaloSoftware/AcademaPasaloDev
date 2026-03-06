import {
  Injectable,
  NotFoundException,
  ConflictException,
  ServiceUnavailableException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { User } from '@modules/users/domain/user.entity';
import { UserRepository } from '@modules/users/infrastructure/user.repository';
import { RoleRepository } from '@modules/users/infrastructure/role.repository';
import { CreateUserDto } from '@modules/users/dto/create-user.dto';
import { UpdateUserDto } from '@modules/users/dto/update-user.dto';
import { IdentitySecurityService } from '@modules/users/application/identity-security.service';
import { IDENTITY_INVALIDATION_REASONS } from '@modules/auth/interfaces/security.constants';
import { QUEUES } from '@infrastructure/queue/queue.constants';
import {
  MEDIA_ACCESS_JOB_NAMES,
  MEDIA_ACCESS_SYNC_SOURCES,
} from '@modules/media-access/domain/media-access.constants';
import {
  DatabaseError,
  MySqlErrorCode,
} from '@common/interfaces/database-error.interface';
import { getErrnoFromDbError } from '@common/utils/mysql-error.util';
import { ADMIN_ROLE_CODES } from '@common/constants/role-codes.constants';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly identitySecurityService: IdentitySecurityService,
    @InjectQueue(QUEUES.MEDIA_ACCESS)
    private readonly mediaAccessQueue: Queue,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(
      createUserDto.email,
    );

    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    const now = new Date();
    try {
      return await this.userRepository.create({
        ...createUserDto,
        createdAt: now,
        updatedAt: null,
      });
    } catch (error) {
      const errno = getErrnoFromDbError(error as DatabaseError);
      if (errno === MySqlErrorCode.DUPLICATE_ENTRY) {
        throw new ConflictException('El correo electrónico ya está registrado');
      }
      throw error;
    }
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.findAll();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findByEmail(email);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    return await this.dataSource.transaction(async (manager) => {
      const user = await this.userRepository.findById(id, manager);
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      const shouldInvalidateIdentity = this.shouldInvalidateIdentityOnUpdate(
        user,
        updateUserDto,
      );
      const shouldRevokeSessions =
        updateUserDto.isActive === false && user.isActive !== false;

      if (updateUserDto.email && updateUserDto.email !== user.email) {
        const existingUser = await this.userRepository.findByEmail(
          updateUserDto.email,
          manager,
        );

        if (existingUser) {
          throw new ConflictException(
            'El correo electrónico ya está registrado',
          );
        }
      }

      Object.assign(user, updateUserDto);
      user.updatedAt = new Date();

      let updatedUser: User;
      try {
        updatedUser = await this.userRepository.save(user, manager);
      } catch (error) {
        const errno = getErrnoFromDbError(error as DatabaseError);
        if (errno === MySqlErrorCode.DUPLICATE_ENTRY) {
          throw new ConflictException(
            'El correo electrónico ya está registrado',
          );
        }
        throw error;
      }

      if (shouldInvalidateIdentity) {
        await this.identitySecurityService.invalidateUserIdentity(id, {
          revokeSessions: shouldRevokeSessions,
          reason: shouldRevokeSessions
            ? IDENTITY_INVALIDATION_REASONS.USER_BANNED
            : IDENTITY_INVALIDATION_REASONS.SENSITIVE_UPDATE,
          manager,
        });
      }

      return updatedUser;
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.userRepository.delete(id);
  }

  async assignRole(userId: string, roleCode: string): Promise<User> {
    const transactionResult = await this.dataSource.transaction(
      async (manager) => {
        const user = await this.userRepository.findById(userId, manager);
        if (!user) {
          throw new NotFoundException('Usuario no encontrado');
        }

        const role = await this.roleRepository.findByCode(roleCode, manager);
        if (!role) {
          throw new NotFoundException(`Rol ${roleCode} no encontrado`);
        }

        const hasRole = user.roles.some((r) => r.code === roleCode);
        if (hasRole) {
          throw new ConflictException('El usuario ya tiene este rol asignado');
        }

        user.roles.push(role);
        user.updatedAt = new Date();

        let updatedUser: User;
        try {
          updatedUser = await this.userRepository.save(user, manager);
        } catch (error) {
          const errno = getErrnoFromDbError(error as DatabaseError);
          if (errno === MySqlErrorCode.DUPLICATE_ENTRY) {
            throw new ConflictException(
              'El usuario ya tiene este rol asignado',
            );
          }
          throw error;
        }

        this.logger.log({
          level: 'info',
          context: UsersService.name,
          message: 'Rol asignado al usuario',
          userId,
          roleCode,
        });

        await this.identitySecurityService.invalidateUserIdentity(userId, {
          revokeSessions: false,
          reason: IDENTITY_INVALIDATION_REASONS.ROLE_CHANGE,
          manager,
        });

        return {
          updatedUser,
          shouldEnqueueStaffReconciliation:
            this.shouldTriggerStaffReconciliationForRoleCode(roleCode),
        };
      },
    );

    await this.enqueueImmediateStaffReconciliationIfNeeded({
      userId,
      roleCode,
      event: 'ASSIGN_ROLE',
      shouldEnqueue: transactionResult.shouldEnqueueStaffReconciliation,
    });

    return transactionResult.updatedUser;
  }

  async removeRole(userId: string, roleCode: string): Promise<User> {
    const transactionResult = await this.dataSource.transaction(
      async (manager) => {
        const user = await this.userRepository.findById(userId, manager);
        if (!user) {
          throw new NotFoundException('Usuario no encontrado');
        }

        const roleIndex = user.roles.findIndex((r) => r.code === roleCode);
        if (roleIndex === -1) {
          throw new NotFoundException('El usuario no tiene este rol asignado');
        }

        user.roles.splice(roleIndex, 1);
        user.updatedAt = new Date();

        let updatedUser: User;
        try {
          updatedUser = await this.userRepository.save(user, manager);
        } catch (error) {
          const errno = getErrnoFromDbError(error as DatabaseError);

          if (
            errno === MySqlErrorCode.LOCK_WAIT_TIMEOUT ||
            errno === MySqlErrorCode.DEADLOCK
          ) {
            throw new ServiceUnavailableException(
              'La operación no pudo completarse por alta concurrencia. Intente nuevamente.',
            );
          }

          if (errno === MySqlErrorCode.FOREIGN_KEY_CONSTRAINT_FAIL) {
            throw new ConflictException(
              'No se pudo remover el rol por restricciones de integridad.',
            );
          }

          throw new InternalServerErrorException(
            'No se pudo remover el rol. Intente nuevamente.',
          );
        }

        this.logger.log({
          level: 'info',
          context: UsersService.name,
          message: 'Rol removido del usuario',
          userId,
          roleCode,
        });

        await this.identitySecurityService.invalidateUserIdentity(userId, {
          revokeSessions: false,
          reason: IDENTITY_INVALIDATION_REASONS.ROLE_CHANGE,
          manager,
        });

        return {
          updatedUser,
          shouldEnqueueStaffReconciliation:
            this.shouldTriggerStaffReconciliationForRoleCode(roleCode),
        };
      },
    );

    await this.enqueueImmediateStaffReconciliationIfNeeded({
      userId,
      roleCode,
      event: 'REMOVE_ROLE',
      shouldEnqueue: transactionResult.shouldEnqueueStaffReconciliation,
    });

    return transactionResult.updatedUser;
  }

  private async enqueueImmediateStaffReconciliationIfNeeded(input: {
    userId: string;
    roleCode: string;
    event: 'ASSIGN_ROLE' | 'REMOVE_ROLE';
    shouldEnqueue: boolean;
  }): Promise<void> {
    if (!input.shouldEnqueue) {
      return;
    }
    const normalizedRoleCode = String(input.roleCode || '')
      .trim()
      .toUpperCase();

    try {
      await this.mediaAccessQueue.add(
        MEDIA_ACCESS_JOB_NAMES.SYNC_STAFF_VIEWERS,
        {
          source: MEDIA_ACCESS_SYNC_SOURCES.USERS_ROLE_CHANGE_IMMEDIATE,
          event: input.event,
          userId: input.userId,
          roleCode: normalizedRoleCode,
          triggeredAt: new Date().toISOString(),
        },
        {
          removeOnComplete: true,
          removeOnFail: 50,
        },
      );
    } catch (error) {
      this.logger.error({
        context: UsersService.name,
        message: 'No se pudo encolar reconciliacion inmediata de media access',
        userId: input.userId,
        roleCode: normalizedRoleCode,
        event: input.event,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private shouldTriggerStaffReconciliationForRoleCode(
    roleCode: string,
  ): boolean {
    const normalizedRoleCode = String(roleCode || '')
      .trim()
      .toUpperCase();
    return ADMIN_ROLE_CODES.includes(normalizedRoleCode);
  }

  private shouldInvalidateIdentityOnUpdate(
    currentUser: User,
    updateUserDto: UpdateUserDto,
  ): boolean {
    const fieldsToCompare: (keyof UpdateUserDto)[] = [
      'email',
      'firstName',
      'lastName1',
      'lastName2',
      'phone',
      'career',
      'profilePhotoUrl',
      'isActive',
    ];

    return fieldsToCompare.some((field) => {
      const newValue = updateUserDto[field];
      if (newValue === undefined) return false;
      return newValue !== currentUser[field];
    });
  }
}

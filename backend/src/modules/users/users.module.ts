import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { UsersService } from '@modules/users/application/users.service';
import { CareersCatalogService } from '@modules/users/application/careers-catalog.service';
import { IdentitySecurityService } from '@modules/users/application/identity-security.service';
import { UsersController } from '@modules/users/presentation/users.controller';
import { User } from '@modules/users/domain/user.entity';
import { Career } from '@modules/users/domain/career.entity';
import { Role } from '@modules/users/domain/role.entity';
import { UserSession } from '@modules/auth/domain/user-session.entity';
import { SessionStatus } from '@modules/auth/domain/session-status.entity';
import { UserRepository } from '@modules/users/infrastructure/user.repository';
import { CareerRepository } from '@modules/users/infrastructure/career.repository';
import { RoleRepository } from '@modules/users/infrastructure/role.repository';
import { UserSessionRepository } from '@modules/auth/infrastructure/user-session.repository';
import { SessionStatusRepository } from '@modules/auth/infrastructure/session-status.repository';
import { RedisCacheModule } from '@infrastructure/cache/redis-cache.module';
import { QUEUES } from '@infrastructure/queue/queue.constants';
import { MediaAccessModule } from '@modules/media-access/media-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Career, Role, UserSession, SessionStatus]),
    BullModule.registerQueue({ name: QUEUES.MEDIA_ACCESS }),
    RedisCacheModule,
    MediaAccessModule,
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    CareersCatalogService,
    IdentitySecurityService,
    UserRepository,
    CareerRepository,
    RoleRepository,
    UserSessionRepository,
    SessionStatusRepository,
  ],
  exports: [
    UsersService,
    CareersCatalogService,
    IdentitySecurityService,
    UserRepository,
    RoleRepository,
  ],
})
export class UsersModule {}

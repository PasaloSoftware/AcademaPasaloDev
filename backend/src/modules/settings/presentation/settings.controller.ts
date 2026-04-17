import { Body, Controller, Get, Put } from '@nestjs/common';
import { AdminSettingsService } from '@modules/settings/application/admin-settings.service';
import { UpdateAdminSettingsDto } from '@modules/settings/dto/admin-settings.dto';
import { Auth } from '@common/decorators/auth.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { ResponseMessage } from '@common/decorators/response-message.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@modules/users/domain/user.entity';
import { ROLE_CODES } from '@common/constants/role-codes.constants';

@Controller('settings')
@Auth()
export class SettingsController {
  constructor(private readonly adminSettingsService: AdminSettingsService) {}

  @Get('admin')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Configuración del sistema obtenida')
  async getBundle() {
    return this.adminSettingsService.getBundle();
  }

  @Put('admin')
  @Roles(ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)
  @ResponseMessage('Configuración del sistema actualizada')
  async updateBundle(
    @CurrentUser() user: User,
    @Body() dto: UpdateAdminSettingsDto,
  ) {
    return this.adminSettingsService.updateBundle(user.id, dto);
  }
}

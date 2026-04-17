import { Module } from '@nestjs/common';
import { SettingsModule } from '@modules/settings/settings.module';
import { CyclesModule } from '@modules/cycles/cycles.module';
import { AdminSettingsService } from '@modules/settings/application/admin-settings.service';
import { SettingsController } from '@modules/settings/presentation/settings.controller';

@Module({
  imports: [SettingsModule, CyclesModule],
  controllers: [SettingsController],
  providers: [AdminSettingsService],
})
export class AdminSettingsModule {}

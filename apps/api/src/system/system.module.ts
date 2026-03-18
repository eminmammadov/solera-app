import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OhlcModule } from '../ohlc/ohlc.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SystemController } from './system.controller';
import { SystemHeaderSettingsService } from './system-header-settings.service';
import { SystemMetricsService } from './system-metrics.service';
import { SystemPlatformSettingsService } from './system-platform-settings.service';
import { SystemProxyBackendService } from './system-proxy-backend.service';
import { SystemRaOhlcSyncService } from './system-ra-ohlc-sync.service';
import { SystemRaService } from './system-ra.service';
import { SystemService } from './system.service';

@Module({
  imports: [PrismaModule, AuthModule, OhlcModule],
  controllers: [SystemController],
  providers: [
    SystemService,
    SystemHeaderSettingsService,
    SystemPlatformSettingsService,
    SystemProxyBackendService,
    SystemRaService,
    SystemRaOhlcSyncService,
    SystemMetricsService,
  ],
})
export class SystemModule {}

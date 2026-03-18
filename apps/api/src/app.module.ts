import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { resolveBackendEnvFilePaths } from './common/env';
import { GlobalRateLimitGuard } from './common/global-rate-limit.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BlogModule } from './blog/blog.module';
import { SystemModule } from './system/system.module';
import { NewsModule } from './news/news.module';
import { DocsModule } from './docs/docs.module';
import { UsersModule } from './users/users.module';
import { OhlcModule } from './ohlc/ohlc.module';
import { MarketModule } from './market/market.module';
import { AuditModule } from './audit/audit.module';
import { AdminAuditInterceptor } from './audit/admin-audit.interceptor';
import { RuntimeReadinessService } from './common/runtime-readiness.service';
import { StakingOnchainModule } from './solana/staking/staking-onchain.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolveBackendEnvFilePaths(),
    }),
    PrismaModule,
    AuthModule,
    BlogModule,
    NewsModule,
    DocsModule,
    SystemModule,
    UsersModule,
    OhlcModule,
    AuditModule,
    MarketModule,
    StakingOnchainModule,
  ],
  providers: [
    RuntimeReadinessService,
    {
      provide: APP_GUARD,
      useClass: GlobalRateLimitGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AdminAuditInterceptor,
    },
  ],
})
export class AppModule {}

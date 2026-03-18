import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OhlcAdminService } from './ohlc-admin.service';
import { OhlcController } from './ohlc.controller';
import { OhlcPersistenceService } from './ohlc-persistence.service';
import { OhlcQueryService } from './ohlc-query.service';
import { OhlcRuntimeService } from './ohlc-runtime.service';
import { OhlcService } from './ohlc.service';

@Module({
  imports: [AuthModule],
  controllers: [OhlcController],
  providers: [
    OhlcService,
    OhlcAdminService,
    OhlcPersistenceService,
    OhlcQueryService,
    OhlcRuntimeService,
  ],
  exports: [OhlcService],
})
export class OhlcModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MarketModule } from '../market/market.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StakingOnchainModule } from '../solana/staking/staking-onchain.module';
import { UsersController } from './users.controller';
import { UsersWalletAuthService } from './users-wallet-auth.service';
import { UsersConvertService } from './users-convert.service';
import { UsersOnlineStateService } from './users-online-state.service';
import { UsersStakingSessionService } from './users-staking-session.service';
import { UsersService } from './users.service';
import { UsersStakingService } from './users-staking.service';
import { UsersWalletStateService } from './users-wallet-state.service';

@Module({
  imports: [PrismaModule, AuthModule, MarketModule, StakingOnchainModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersOnlineStateService,
    UsersWalletStateService,
    UsersWalletAuthService,
    UsersStakingService,
    UsersStakingSessionService,
    UsersConvertService,
  ],
  exports: [UsersService],
})
export class UsersModule {}

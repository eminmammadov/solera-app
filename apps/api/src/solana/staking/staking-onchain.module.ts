import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StakingAdminController } from './staking-admin.controller';
import { StakingAdminExecutionService } from './staking-admin-execution.service';
import { StakingAdminReadService } from './staking-admin-read.service';
import { StakingAdminService } from './staking-admin.service';
import { StakingConfigService } from './staking-config.service';
import { StakingCutoverPolicyService } from './staking-cutover-policy.service';
import { StakingMainnetHardeningService } from './staking-mainnet-hardening.service';
import { StakingMirrorService } from './staking-mirror.service';
import { StakingMigrationService } from './staking-migration.service';
import { StakingNetworkRegistryService } from './staking-network-registry.service';
import { StakingPdaService } from './staking-pda.service';
import { StakingPreparationModeService } from './staking-preparation-mode.service';
import { StakingSolanaConnectionService } from './staking-solana-connection.service';
import { StakingTransactionService } from './staking-transaction.service';

@Module({
  imports: [PrismaModule],
  controllers: [StakingAdminController],
  providers: [
    StakingAdminExecutionService,
    StakingAdminReadService,
    StakingAdminService,
    StakingConfigService,
    StakingCutoverPolicyService,
    StakingMainnetHardeningService,
    StakingMirrorService,
    StakingMigrationService,
    StakingNetworkRegistryService,
    StakingPdaService,
    StakingPreparationModeService,
    StakingSolanaConnectionService,
    StakingTransactionService,
  ],
  exports: [
    StakingAdminExecutionService,
    StakingAdminReadService,
    StakingAdminService,
    StakingConfigService,
    StakingCutoverPolicyService,
    StakingMainnetHardeningService,
    StakingMirrorService,
    StakingMigrationService,
    StakingNetworkRegistryService,
    StakingPdaService,
    StakingPreparationModeService,
    StakingSolanaConnectionService,
    StakingTransactionService,
  ],
})
export class StakingOnchainModule {}

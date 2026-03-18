import { BadRequestException, Injectable } from '@nestjs/common';
import { readBooleanEnv, readOptionalEnv } from '../../common/env';
import type { PrepareAdminStakingInstructionDto } from './dto/prepare-admin-staking-instruction.dto';
import { MAINNET_NETWORK } from './staking.constants';
import type {
  PreparedAdminStakingExecution,
  RuntimeNetwork,
  StakingMainnetHardeningSnapshot,
  StakingProgramRegistryEntry,
} from './staking.types';

type MainnetCriticalAction = PreparedAdminStakingExecution['action'];

@Injectable()
export class StakingMainnetHardeningService {
  getSnapshot(
    registry: StakingProgramRegistryEntry,
  ): StakingMainnetHardeningSnapshot {
    const configuredMultisigAuthority = readOptionalEnv(
      'STAKING_MAINNET_MULTISIG_AUTHORITY',
    );
    const requireMultisigAuthority = readBooleanEnv(
      'STAKING_MAINNET_REQUIRE_MULTISIG',
      {
        fallback: true,
      },
    );
    const allowBootstrapActions = readBooleanEnv(
      'STAKING_MAINNET_ALLOW_BOOTSTRAP',
      {
        fallback: false,
      },
    );
    const allowConfigUpdates = readBooleanEnv(
      'STAKING_MAINNET_ALLOW_CONFIG_UPDATES',
      {
        fallback: false,
      },
    );
    const allowFundingBatch = readBooleanEnv(
      'STAKING_MAINNET_ALLOW_FUNDING_BATCH',
      {
        fallback: false,
      },
    );
    const warnings: string[] = [];

    if (!registry.isReady) {
      warnings.push(
        'Mainnet staking registry is incomplete. Program IDs or reward vault are missing.',
      );
    }
    if (!configuredMultisigAuthority) {
      warnings.push(
        'STAKING_MAINNET_MULTISIG_AUTHORITY is not configured yet.',
      );
    }
    if (requireMultisigAuthority) {
      warnings.push(
        'Mainnet critical actions require an explicit multisig authority.',
      );
    }
    if (!allowBootstrapActions) {
      warnings.push(
        'Mainnet bootstrap actions are disabled until STAKING_MAINNET_ALLOW_BOOTSTRAP is enabled.',
      );
    }
    if (!allowConfigUpdates) {
      warnings.push(
        'Mainnet config updates are disabled until STAKING_MAINNET_ALLOW_CONFIG_UPDATES is enabled.',
      );
    }
    if (!allowFundingBatch) {
      warnings.push(
        'Mainnet funding batches are disabled until STAKING_MAINNET_ALLOW_FUNDING_BATCH is enabled.',
      );
    }

    return {
      network: MAINNET_NETWORK,
      registryReady: registry.isReady,
      configuredMultisigAuthority,
      requireMultisigAuthority,
      allowBootstrapActions,
      allowConfigUpdates,
      allowFundingBatch,
      readyForBootstrap: registry.isReady && allowBootstrapActions,
      readyForConfigUpdates: registry.isReady && allowConfigUpdates,
      readyForFundingBatch: registry.isReady && allowFundingBatch,
      warnings,
    };
  }

  resolveBootstrapMultisigAuthority(input: {
    network: RuntimeNetwork;
    registry: StakingProgramRegistryEntry;
    dto: Pick<PrepareAdminStakingInstructionDto, 'multisigAuthority'>;
    walletAddress: string;
  }): string {
    if (input.network !== MAINNET_NETWORK) {
      return input.dto.multisigAuthority ?? input.walletAddress;
    }

    const snapshot = this.getSnapshot(input.registry);
    if (!snapshot.requireMultisigAuthority) {
      return input.dto.multisigAuthority ?? input.walletAddress;
    }
    if (!snapshot.configuredMultisigAuthority) {
      throw new BadRequestException(
        'Mainnet multisig authority is not configured. Set STAKING_MAINNET_MULTISIG_AUTHORITY before preparing bootstrap actions.',
      );
    }
    if (
      input.dto.multisigAuthority &&
      input.dto.multisigAuthority !== snapshot.configuredMultisigAuthority
    ) {
      throw new BadRequestException(
        'Provided multisigAuthority does not match the configured mainnet multisig authority.',
      );
    }

    return snapshot.configuredMultisigAuthority;
  }

  assertCriticalActionAllowed(input: {
    network: RuntimeNetwork;
    action: MainnetCriticalAction;
    registry: StakingProgramRegistryEntry;
    dto: Pick<PrepareAdminStakingInstructionDto, 'multisigAuthority'>;
  }) {
    if (input.network !== MAINNET_NETWORK) {
      return;
    }

    const snapshot = this.getSnapshot(input.registry);
    if (!snapshot.registryReady) {
      throw new BadRequestException(
        'Mainnet staking registry is incomplete. Configure program IDs and reward vault before preparing critical actions.',
      );
    }
    if (
      snapshot.configuredMultisigAuthority &&
      input.dto.multisigAuthority &&
      input.dto.multisigAuthority !== snapshot.configuredMultisigAuthority
    ) {
      throw new BadRequestException(
        'Provided multisigAuthority does not match the configured mainnet multisig authority.',
      );
    }
    if (
      ['INITIALIZE_GLOBAL_CONFIG', 'INITIALIZE_SWAP_NODE'].includes(
        input.action,
      )
    ) {
      if (!snapshot.configuredMultisigAuthority) {
        throw new BadRequestException(
          'Mainnet multisig authority is not configured. Set STAKING_MAINNET_MULTISIG_AUTHORITY before preparing bootstrap actions.',
        );
      }
      if (
        input.dto.multisigAuthority &&
        input.dto.multisigAuthority !== snapshot.configuredMultisigAuthority
      ) {
        throw new BadRequestException(
          'Provided multisigAuthority does not match the configured mainnet multisig authority.',
        );
      }
      if (!snapshot.allowBootstrapActions) {
        throw new BadRequestException(
          'Mainnet bootstrap actions are disabled. Enable STAKING_MAINNET_ALLOW_BOOTSTRAP to continue.',
        );
      }
      return;
    }

    if (
      [
        'UPDATE_GLOBAL_CONFIG',
        'UPDATE_SWAP_NODE_CONFIG',
        'UPSERT_TOKEN_STAKE_CONFIG',
      ].includes(input.action)
    ) {
      if (
        snapshot.requireMultisigAuthority &&
        !snapshot.configuredMultisigAuthority
      ) {
        throw new BadRequestException(
          'Mainnet config updates require STAKING_MAINNET_MULTISIG_AUTHORITY to be configured.',
        );
      }
      if (!snapshot.allowConfigUpdates) {
        throw new BadRequestException(
          'Mainnet config updates are disabled. Enable STAKING_MAINNET_ALLOW_CONFIG_UPDATES to continue.',
        );
      }
      return;
    }

    if (
      snapshot.requireMultisigAuthority &&
      !snapshot.configuredMultisigAuthority
    ) {
      throw new BadRequestException(
        'Mainnet critical actions require STAKING_MAINNET_MULTISIG_AUTHORITY to be configured.',
      );
    }

    if (
      input.action === 'EXECUTE_FUNDING_BATCH' &&
      !snapshot.allowFundingBatch
    ) {
      throw new BadRequestException(
        'Mainnet funding batches are disabled. Enable STAKING_MAINNET_ALLOW_FUNDING_BATCH to continue.',
      );
    }
  }
}

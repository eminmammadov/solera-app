import { createHash } from 'crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PublicKey } from '@solana/web3.js';
import {
  SPL_ASSOCIATED_TOKEN_PROGRAM_ID,
  SPL_TOKEN_PROGRAM_ID,
} from '../../common/solana.constants';
import { getAssociatedTokenAddressSync } from '../../common/solana-token';
import {
  STAKING_GLOBAL_CONFIG_SEED,
  STAKING_TOKEN_CONFIG_SEED,
  STAKING_POSITION_SEED,
  STAKING_FUNDING_BATCH_SEED,
  STAKING_SWAP_NODE_CONFIG_SEED,
  STAKING_SWAP_NODE_INPUT_VAULT_SEED,
} from './staking.constants';
import { StakingNetworkRegistryService } from './staking-network-registry.service';
import type {
  RuntimeNetwork,
  StakePositionDerivedAddresses,
  StakingDerivedAddresses,
} from './staking.types';

@Injectable()
export class StakingPdaService {
  constructor(
    private readonly networkRegistry: StakingNetworkRegistryService,
  ) {}

  deriveTokenConfigAddresses(
    network: RuntimeNetwork,
    mintAddress: string,
  ): StakingDerivedAddresses {
    const registry = this.networkRegistry.getRegistry(network);
    if (!registry.stakePoolProgramId) {
      throw new BadRequestException(
        `Stake pool program ID is not configured for ${network}.`,
      );
    }

    const programId = new PublicKey(registry.stakePoolProgramId);
    const mint = new PublicKey(mintAddress);

    const globalConfigPda = this.deriveGlobalConfigAddress(network);

    const [tokenConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from(STAKING_TOKEN_CONFIG_SEED, 'utf8'), mint.toBuffer()],
      programId,
    );

    return {
      globalConfigPda,
      tokenConfigPda: tokenConfigPda.toBase58(),
    };
  }

  deriveGlobalConfigAddress(network: RuntimeNetwork): string {
    const registry = this.networkRegistry.getRegistry(network);
    if (!registry.stakePoolProgramId) {
      throw new BadRequestException(
        `Stake pool program ID is not configured for ${network}.`,
      );
    }

    const [globalConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from(STAKING_GLOBAL_CONFIG_SEED, 'utf8')],
      new PublicKey(registry.stakePoolProgramId),
    );
    return globalConfigPda.toBase58();
  }

  deriveSwapNodeConfigAddress(network: RuntimeNetwork): string {
    const registry = this.networkRegistry.getRegistry(network);
    if (!registry.swapNodeProgramId) {
      throw new BadRequestException(
        `Swap-node program ID is not configured for ${network}.`,
      );
    }

    const [swapNodeConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from(STAKING_SWAP_NODE_CONFIG_SEED, 'utf8')],
      new PublicKey(registry.swapNodeProgramId),
    );
    return swapNodeConfigPda.toBase58();
  }

  deriveFundingBatchAddress(input: {
    network: RuntimeNetwork;
    inputMintAddress: string;
    batchId: string;
  }): string {
    const registry = this.networkRegistry.getRegistry(input.network);
    if (!registry.swapNodeProgramId) {
      throw new BadRequestException(
        `Swap-node program ID is not configured for ${input.network}.`,
      );
    }

    const batchSeed = createHash('sha256')
      .update(input.batchId)
      .digest()
      .subarray(0, 16);
    const [fundingBatchPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(STAKING_FUNDING_BATCH_SEED, 'utf8'),
        new PublicKey(input.inputMintAddress).toBuffer(),
        batchSeed,
      ],
      new PublicKey(registry.swapNodeProgramId),
    );
    return fundingBatchPda.toBase58();
  }

  deriveStakePositionAddresses(
    network: RuntimeNetwork,
    input: {
      walletAddress: string;
      mintAddress: string;
      sessionId: string;
    },
  ): StakePositionDerivedAddresses {
    const registry = this.networkRegistry.getRegistry(network);
    if (
      !registry.stakePoolProgramId ||
      !registry.swapNodeProgramId ||
      !registry.rewardVaultAddress
    ) {
      throw new BadRequestException(
        `Staking programs are not fully configured for ${network}.`,
      );
    }

    const owner = new PublicKey(input.walletAddress);
    const mint = new PublicKey(input.mintAddress);
    const stakePoolProgramId = new PublicKey(registry.stakePoolProgramId);
    const swapNodeProgramId = new PublicKey(registry.swapNodeProgramId);
    const sessionSeed = createHash('sha256')
      .update(input.sessionId)
      .digest()
      .subarray(0, 32);

    const baseAddresses = this.deriveTokenConfigAddresses(
      network,
      input.mintAddress,
    );

    const [userStakePositionPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(STAKING_POSITION_SEED, 'utf8'),
        owner.toBuffer(),
        sessionSeed,
      ],
      stakePoolProgramId,
    );

    const [swapNodeVaultPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(STAKING_SWAP_NODE_INPUT_VAULT_SEED, 'utf8'),
        mint.toBuffer(),
      ],
      swapNodeProgramId,
    );

    const userInputAta = getAssociatedTokenAddressSync({
      mint,
      owner,
      allowOwnerOffCurve: false,
      tokenProgramId: SPL_TOKEN_PROGRAM_ID,
      associatedTokenProgramId: SPL_ASSOCIATED_TOKEN_PROGRAM_ID,
    });

    const swapNodeVaultAta = getAssociatedTokenAddressSync({
      mint,
      owner: swapNodeVaultPda,
      allowOwnerOffCurve: true,
      tokenProgramId: SPL_TOKEN_PROGRAM_ID,
      associatedTokenProgramId: SPL_ASSOCIATED_TOKEN_PROGRAM_ID,
    });

    return {
      ...baseAddresses,
      userStakePositionPda: userStakePositionPda.toBase58(),
      userInputAta: userInputAta.toBase58(),
      swapNodeVaultPda: swapNodeVaultPda.toBase58(),
      swapNodeVaultAta: swapNodeVaultAta.toBase58(),
      rewardVaultAddress: registry.rewardVaultAddress,
    };
  }
}

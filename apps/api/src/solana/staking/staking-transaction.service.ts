import { createHash } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  SPL_ASSOCIATED_TOKEN_PROGRAM_ID,
  SPL_TOKEN_PROGRAM_ADDRESS,
  SPL_TOKEN_PROGRAM_ID,
} from '../../common/solana.constants';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from '../../common/solana-token';
import { StakingConfigService } from './staking-config.service';
import { StakingNetworkRegistryService } from './staking-network-registry.service';
import { StakingPdaService } from './staking-pda.service';
import type {
  PreparedAnchorInstructionPayload,
  RuntimeNetwork,
  StakePositionDerivedAddresses,
  TokenStakeSyncPreparation,
} from './staking.types';

@Injectable()
export class StakingTransactionService {
  constructor(
    private readonly stakingConfig: StakingConfigService,
    private readonly networkRegistry: StakingNetworkRegistryService,
    private readonly pdaService: StakingPdaService,
  ) {}

  async prepareTokenStakeConfigSync(
    tokenId: string,
    network?: RuntimeNetwork,
  ): Promise<TokenStakeSyncPreparation> {
    const targetNetwork =
      network ?? (await this.networkRegistry.resolveActiveNetwork());
    const token = await this.stakingConfig.getTokenStakeConfigProjection(
      tokenId,
      targetNetwork,
    );

    if (!token) {
      throw new NotFoundException('Stake config candidate not found');
    }

    const programs = this.networkRegistry.getRegistry(targetNetwork);
    const derivedAddresses =
      token.mintAddress && programs.isReady
        ? this.pdaService.deriveTokenConfigAddresses(
            targetNetwork,
            token.mintAddress,
          )
        : null;
    const instructionPayload =
      token.mintAddress && programs.stakePoolProgramId && derivedAddresses
        ? this.buildInstructionPayload({
            programId: programs.stakePoolProgramId,
            instructionName: 'upsert_token_stake_config',
            accounts: [
              {
                name: 'authority',
                address: null,
                isSigner: true,
                isWritable: true,
              },
              {
                name: 'globalConfig',
                address: derivedAddresses.globalConfigPda,
                isSigner: false,
                isWritable: true,
              },
              {
                name: 'tokenMint',
                address: token.mintAddress,
                isSigner: false,
                isWritable: false,
              },
              {
                name: 'tokenConfig',
                address: derivedAddresses.tokenConfigPda,
                isSigner: false,
                isWritable: true,
              },
              {
                name: 'systemProgram',
                address: SystemProgram.programId.toBase58(),
                isSigner: false,
                isWritable: false,
              },
            ],
            argsData: this.encodeUpsertTokenStakeConfigArgs({
              enabled: token.enabled,
              minStakeUsd: token.minStakeUsd,
              maxStakeUsd: token.maxStakeUsd,
              aprBps: [
                token.apr7dBps,
                token.apr1mBps,
                token.apr3mBps,
                token.apr6mBps,
                token.apr12mBps,
              ],
              configVersion: 1,
            }),
          })
        : null;

    return {
      network: targetNetwork,
      action: 'UPSERT_TOKEN_STAKE_CONFIG',
      token,
      programs,
      derivedAddresses,
      instructionPayload,
      requiresOperatorSignature: true,
      requiresMultisigApproval: false,
      mirrorSyncRecommended: targetNetwork === 'devnet',
      preparedAt: new Date().toISOString(),
    };
  }

  prepareInitializeGlobalConfigInstruction(input: {
    network: RuntimeNetwork;
    walletAddress: string;
    operatorAuthority?: string;
    multisigAuthority?: string;
    raMintAddress: string;
  }): {
    instructionPayload: PreparedAnchorInstructionPayload;
    globalConfigPda: string;
    instructions: TransactionInstruction[];
  } {
    const registry = this.networkRegistry.getRegistry(input.network);
    if (
      !registry.stakePoolProgramId ||
      !registry.swapNodeProgramId ||
      !registry.rewardVaultAddress ||
      !registry.isReady
    ) {
      throw new NotFoundException(
        `Staking registry is not fully configured for ${input.network}.`,
      );
    }

    const globalConfigPda = this.pdaService.deriveGlobalConfigAddress(
      input.network,
    );
    const instructionPayload = this.buildInstructionPayload({
      programId: registry.stakePoolProgramId,
      instructionName: 'initialize_global_config',
      accounts: [
        {
          name: 'authority',
          address: input.walletAddress,
          isSigner: true,
          isWritable: true,
        },
        {
          name: 'globalConfig',
          address: globalConfigPda,
          isSigner: false,
          isWritable: true,
        },
        {
          name: 'systemProgram',
          address: SystemProgram.programId.toBase58(),
          isSigner: false,
          isWritable: false,
        },
      ],
      argsData: this.encodeInitializeGlobalConfigArgs({
        activeNetwork: input.network === 'mainnet' ? 1 : 0,
        operatorAuthority: input.operatorAuthority ?? input.walletAddress,
        multisigAuthority: input.multisigAuthority ?? input.walletAddress,
        rewardVaultAddress: registry.rewardVaultAddress,
        raMintAddress: input.raMintAddress,
        swapNodeProgramId: registry.swapNodeProgramId,
      }),
    });

    const instructions: TransactionInstruction[] = [];
    const derivedRewardVaultAta = getAssociatedTokenAddressSync({
      mint: new PublicKey(input.raMintAddress),
      owner: new PublicKey(globalConfigPda),
      allowOwnerOffCurve: true,
      tokenProgramId: SPL_TOKEN_PROGRAM_ID,
      associatedTokenProgramId: SPL_ASSOCIATED_TOKEN_PROGRAM_ID,
    });
    if (derivedRewardVaultAta.toBase58() === registry.rewardVaultAddress) {
      instructions.push(
        createAssociatedTokenAccountIdempotentInstruction({
          payer: new PublicKey(input.walletAddress),
          associatedToken: derivedRewardVaultAta,
          owner: new PublicKey(globalConfigPda),
          mint: new PublicKey(input.raMintAddress),
          tokenProgramId: SPL_TOKEN_PROGRAM_ID,
          associatedTokenProgramId: SPL_ASSOCIATED_TOKEN_PROGRAM_ID,
        }),
      );
    }
    instructions.push(
      new TransactionInstruction({
        programId: new PublicKey(registry.stakePoolProgramId),
        keys: instructionPayload.accounts
          .filter(
            (account): account is typeof account & { address: string } =>
              typeof account.address === 'string' && account.address.length > 0,
          )
          .map((account) => ({
            pubkey: new PublicKey(account.address),
            isSigner: account.isSigner,
            isWritable: account.isWritable,
          })),
        data: Buffer.from(instructionPayload.dataBase64, 'base64'),
      }),
    );

    return {
      instructionPayload,
      globalConfigPda,
      instructions,
    };
  }

  prepareUpdateGlobalConfigInstruction(input: {
    network: RuntimeNetwork;
    walletAddress: string;
    raMintAddress: string;
    rewardVaultAddress: string;
  }): {
    instructionPayload: PreparedAnchorInstructionPayload;
    globalConfigPda: string;
    instructions: TransactionInstruction[];
  } {
    const registry = this.networkRegistry.getRegistry(input.network);
    if (!registry.stakePoolProgramId || !registry.swapNodeProgramId) {
      throw new NotFoundException(
        `Stake-pool registry is not fully configured for ${input.network}.`,
      );
    }

    const globalConfigPda = this.pdaService.deriveGlobalConfigAddress(
      input.network,
    );
    const instructionPayload = this.buildInstructionPayload({
      programId: registry.stakePoolProgramId,
      instructionName: 'update_global_config',
      accounts: [
        {
          name: 'authority',
          address: input.walletAddress,
          isSigner: true,
          isWritable: true,
        },
        {
          name: 'globalConfig',
          address: globalConfigPda,
          isSigner: false,
          isWritable: true,
        },
      ],
      argsData: this.encodeUpdateGlobalConfigArgs({
        activeNetwork: input.network === 'mainnet' ? 1 : 0,
        rewardVaultAddress: input.rewardVaultAddress,
        raMintAddress: input.raMintAddress,
        swapNodeProgramId: registry.swapNodeProgramId,
      }),
    });

    return {
      instructionPayload,
      globalConfigPda,
      instructions: [
        new TransactionInstruction({
          programId: new PublicKey(registry.stakePoolProgramId),
          keys: instructionPayload.accounts
            .filter(
              (account): account is typeof account & { address: string } =>
                typeof account.address === 'string' &&
                account.address.length > 0,
            )
            .map((account) => ({
              pubkey: new PublicKey(account.address),
              isSigner: account.isSigner,
              isWritable: account.isWritable,
            })),
          data: Buffer.from(instructionPayload.dataBase64, 'base64'),
        }),
      ],
    };
  }

  prepareCreateStakePositionInstruction(input: {
    network: RuntimeNetwork;
    walletAddress: string;
    mintAddress: string;
    sessionId: string;
    inputAmountRaw: bigint;
    inputTokenDecimals: number;
    amount: number;
    amountUsd: number;
    principalRa: number;
    rewardRa: number;
    finalRaPayout: number;
    apy: number;
    periodDays: number;
    unlockAt: Date;
  }): {
    instructionPayload: PreparedAnchorInstructionPayload;
    derivedAddresses: StakePositionDerivedAddresses;
    instructions: TransactionInstruction[];
  } {
    const registry = this.networkRegistry.getRegistry(input.network);
    if (!registry.stakePoolProgramId || !registry.isReady) {
      throw new NotFoundException(
        `Stake pool program is not configured for ${input.network}.`,
      );
    }

    const derivedAddresses = this.pdaService.deriveStakePositionAddresses(
      input.network,
      input,
    );

    const accounts = [
      {
        name: 'owner',
        address: input.walletAddress,
        isSigner: true,
        isWritable: true,
      },
      {
        name: 'globalConfig',
        address: derivedAddresses.globalConfigPda,
        isSigner: false,
        isWritable: false,
      },
      {
        name: 'tokenConfig',
        address: derivedAddresses.tokenConfigPda,
        isSigner: false,
        isWritable: false,
      },
      {
        name: 'userStakePosition',
        address: derivedAddresses.userStakePositionPda,
        isSigner: false,
        isWritable: true,
      },
      {
        name: 'inputMint',
        address: input.mintAddress,
        isSigner: false,
        isWritable: false,
      },
      {
        name: 'userInputAta',
        address: derivedAddresses.userInputAta,
        isSigner: false,
        isWritable: true,
      },
      {
        name: 'swapNodeVaultAuthority',
        address: derivedAddresses.swapNodeVaultPda,
        isSigner: false,
        isWritable: false,
      },
      {
        name: 'swapNodeVault',
        address: derivedAddresses.swapNodeVaultAta,
        isSigner: false,
        isWritable: true,
      },
      {
        name: 'rewardVault',
        address: derivedAddresses.rewardVaultAddress,
        isSigner: false,
        isWritable: true,
      },
      {
        name: 'swapNodeProgram',
        address: registry.swapNodeProgramId,
        isSigner: false,
        isWritable: false,
      },
      {
        name: 'tokenProgram',
        address: SPL_TOKEN_PROGRAM_ADDRESS,
        isSigner: false,
        isWritable: false,
      },
      {
        name: 'systemProgram',
        address: SystemProgram.programId.toBase58(),
        isSigner: false,
        isWritable: false,
      },
    ];

    const instructionPayload = this.buildInstructionPayload({
      programId: registry.stakePoolProgramId,
      instructionName: 'create_stake_position',
      accounts,
      argsData: this.encodeCreateStakePositionArgs(input),
    });

    const ensureSwapNodeVaultAtaInstruction =
      createAssociatedTokenAccountIdempotentInstruction({
        payer: new PublicKey(input.walletAddress),
        associatedToken: new PublicKey(derivedAddresses.swapNodeVaultAta),
        owner: new PublicKey(derivedAddresses.swapNodeVaultPda),
        mint: new PublicKey(input.mintAddress),
        tokenProgramId: SPL_TOKEN_PROGRAM_ID,
        associatedTokenProgramId: SPL_ASSOCIATED_TOKEN_PROGRAM_ID,
      });

    const stakeInstruction = new TransactionInstruction({
      programId: new PublicKey(registry.stakePoolProgramId),
      keys: instructionPayload.accounts
        .filter(
          (account): account is typeof account & { address: string } =>
            typeof account.address === 'string' && account.address.length > 0,
        )
        .map((account) => ({
          pubkey: new PublicKey(account.address),
          isSigner: account.isSigner,
          isWritable: account.isWritable,
        })),
      data: Buffer.from(instructionPayload.dataBase64, 'base64'),
    });

    return {
      instructionPayload,
      derivedAddresses,
      instructions: [ensureSwapNodeVaultAtaInstruction, stakeInstruction],
    };
  }

  prepareInitializeSwapNodeInstruction(input: {
    network: RuntimeNetwork;
    walletAddress: string;
    operatorAuthority?: string;
    multisigAuthority?: string;
    raMintAddress: string;
  }): {
    instructionPayload: PreparedAnchorInstructionPayload;
    swapNodeConfigPda: string;
    instructions: TransactionInstruction[];
  } {
    const registry = this.networkRegistry.getRegistry(input.network);
    if (
      !registry.stakePoolProgramId ||
      !registry.swapNodeProgramId ||
      !registry.rewardVaultAddress ||
      !registry.isReady
    ) {
      throw new NotFoundException(
        `Swap-node registry is not fully configured for ${input.network}.`,
      );
    }

    const swapNodeConfigPda = this.pdaService.deriveSwapNodeConfigAddress(
      input.network,
    );
    const instructionPayload = this.buildInstructionPayload({
      programId: registry.swapNodeProgramId,
      instructionName: 'initialize_swap_node',
      accounts: [
        {
          name: 'authority',
          address: input.walletAddress,
          isSigner: true,
          isWritable: true,
        },
        {
          name: 'swapNodeConfig',
          address: swapNodeConfigPda,
          isSigner: false,
          isWritable: true,
        },
        {
          name: 'systemProgram',
          address: SystemProgram.programId.toBase58(),
          isSigner: false,
          isWritable: false,
        },
      ],
      argsData: this.encodeInitializeSwapNodeArgs({
        operatorAuthority: input.operatorAuthority ?? input.walletAddress,
        multisigAuthority: input.multisigAuthority ?? input.walletAddress,
        stakePoolProgramId: registry.stakePoolProgramId,
        raMintAddress: input.raMintAddress,
        rewardVaultAddress: registry.rewardVaultAddress,
      }),
    });

    return {
      instructionPayload,
      swapNodeConfigPda,
      instructions: [
        new TransactionInstruction({
          programId: new PublicKey(registry.swapNodeProgramId),
          keys: instructionPayload.accounts
            .filter(
              (account): account is typeof account & { address: string } =>
                typeof account.address === 'string' &&
                account.address.length > 0,
            )
            .map((account) => ({
              pubkey: new PublicKey(account.address),
              isSigner: account.isSigner,
              isWritable: account.isWritable,
            })),
          data: Buffer.from(instructionPayload.dataBase64, 'base64'),
        }),
      ],
    };
  }

  prepareUpdateSwapNodeInstruction(input: {
    network: RuntimeNetwork;
    walletAddress: string;
    raMintAddress: string;
    rewardVaultAddress: string;
  }): {
    instructionPayload: PreparedAnchorInstructionPayload;
    swapNodeConfigPda: string;
    instructions: TransactionInstruction[];
  } {
    const registry = this.networkRegistry.getRegistry(input.network);
    if (!registry.stakePoolProgramId || !registry.swapNodeProgramId) {
      throw new NotFoundException(
        `Swap-node registry is not fully configured for ${input.network}.`,
      );
    }

    const swapNodeConfigPda = this.pdaService.deriveSwapNodeConfigAddress(
      input.network,
    );
    const instructionPayload = this.buildInstructionPayload({
      programId: registry.swapNodeProgramId,
      instructionName: 'update_swap_node_config',
      accounts: [
        {
          name: 'authority',
          address: input.walletAddress,
          isSigner: true,
          isWritable: true,
        },
        {
          name: 'swapNodeConfig',
          address: swapNodeConfigPda,
          isSigner: false,
          isWritable: true,
        },
      ],
      argsData: this.encodeUpdateSwapNodeConfigArgs({
        stakePoolProgramId: registry.stakePoolProgramId,
        raMintAddress: input.raMintAddress,
        rewardVaultAddress: input.rewardVaultAddress,
      }),
    });

    return {
      instructionPayload,
      swapNodeConfigPda,
      instructions: [
        new TransactionInstruction({
          programId: new PublicKey(registry.swapNodeProgramId),
          keys: instructionPayload.accounts
            .filter(
              (account): account is typeof account & { address: string } =>
                typeof account.address === 'string' &&
                account.address.length > 0,
            )
            .map((account) => ({
              pubkey: new PublicKey(account.address),
              isSigner: account.isSigner,
              isWritable: account.isWritable,
            })),
          data: Buffer.from(instructionPayload.dataBase64, 'base64'),
        }),
      ],
    };
  }

  prepareRewardVaultCoverageBatchInstruction(input: {
    network: RuntimeNetwork;
    walletAddress: string;
    batchId: string;
    raMintAddress: string;
    plannedRewardRa: number;
  }): {
    instructionPayload: PreparedAnchorInstructionPayload;
    fundingBatchPda: string;
    instructions: TransactionInstruction[];
  } {
    const registry = this.networkRegistry.getRegistry(input.network);
    if (
      !registry.stakePoolProgramId ||
      !registry.swapNodeProgramId ||
      !registry.rewardVaultAddress ||
      !registry.isReady
    ) {
      throw new NotFoundException(
        `Funding registry is not fully configured for ${input.network}.`,
      );
    }

    const swapNodeConfigPda = this.pdaService.deriveSwapNodeConfigAddress(
      input.network,
    );
    const globalConfigPda = this.pdaService.deriveGlobalConfigAddress(
      input.network,
    );
    const fundingBatchPda = this.pdaService.deriveFundingBatchAddress({
      network: input.network,
      inputMintAddress: input.raMintAddress,
      batchId: input.batchId,
    });
    const fundingSourceAta = getAssociatedTokenAddressSync({
      mint: new PublicKey(input.raMintAddress),
      owner: new PublicKey(input.walletAddress),
      allowOwnerOffCurve: false,
      tokenProgramId: SPL_TOKEN_PROGRAM_ID,
      associatedTokenProgramId: SPL_ASSOCIATED_TOKEN_PROGRAM_ID,
    });
    const rawFundingAmount = this.toScaledU64(input.plannedRewardRa);

    const approvePayload = this.buildInstructionPayload({
      programId: registry.swapNodeProgramId,
      instructionName: 'approve_funding_batch',
      accounts: [
        {
          name: 'authority',
          address: input.walletAddress,
          isSigner: true,
          isWritable: true,
        },
        {
          name: 'swapNodeConfig',
          address: swapNodeConfigPda,
          isSigner: false,
          isWritable: false,
        },
        {
          name: 'inputMint',
          address: input.raMintAddress,
          isSigner: false,
          isWritable: false,
        },
        {
          name: 'fundingBatch',
          address: fundingBatchPda,
          isSigner: false,
          isWritable: true,
        },
        {
          name: 'systemProgram',
          address: SystemProgram.programId.toBase58(),
          isSigner: false,
          isWritable: false,
        },
      ],
      argsData: this.encodeApproveFundingBatchArgs({
        batchId: input.batchId,
        approvedInputAmountRaw: rawFundingAmount,
        plannedRewardAmountRaw: rawFundingAmount,
      }),
    });
    const executePayload = this.buildInstructionPayload({
      programId: registry.swapNodeProgramId,
      instructionName: 'execute_funding_batch',
      accounts: [
        {
          name: 'authority',
          address: input.walletAddress,
          isSigner: true,
          isWritable: true,
        },
        {
          name: 'swapNodeConfig',
          address: swapNodeConfigPda,
          isSigner: false,
          isWritable: false,
        },
        {
          name: 'inputMint',
          address: input.raMintAddress,
          isSigner: false,
          isWritable: false,
        },
        {
          name: 'fundingBatch',
          address: fundingBatchPda,
          isSigner: false,
          isWritable: true,
        },
        {
          name: 'fundingSourceAta',
          address: fundingSourceAta.toBase58(),
          isSigner: false,
          isWritable: true,
        },
        {
          name: 'rewardVaultAuthority',
          address: globalConfigPda,
          isSigner: false,
          isWritable: false,
        },
        {
          name: 'rewardVault',
          address: registry.rewardVaultAddress,
          isSigner: false,
          isWritable: true,
        },
        {
          name: 'tokenProgram',
          address: SPL_TOKEN_PROGRAM_ADDRESS,
          isSigner: false,
          isWritable: false,
        },
      ],
      argsData: this.encodeExecuteFundingBatchArgs({
        fundedRewardAmountRaw: rawFundingAmount,
      }),
    });

    const ensureFundingSourceAtaInstruction =
      createAssociatedTokenAccountIdempotentInstruction({
        payer: new PublicKey(input.walletAddress),
        associatedToken: fundingSourceAta,
        owner: new PublicKey(input.walletAddress),
        mint: new PublicKey(input.raMintAddress),
        tokenProgramId: SPL_TOKEN_PROGRAM_ID,
        associatedTokenProgramId: SPL_ASSOCIATED_TOKEN_PROGRAM_ID,
      });
    const approveInstruction = new TransactionInstruction({
      programId: new PublicKey(registry.swapNodeProgramId),
      keys: approvePayload.accounts
        .filter(
          (account): account is typeof account & { address: string } =>
            typeof account.address === 'string' && account.address.length > 0,
        )
        .map((account) => ({
          pubkey: new PublicKey(account.address),
          isSigner: account.isSigner,
          isWritable: account.isWritable,
        })),
      data: Buffer.from(approvePayload.dataBase64, 'base64'),
    });
    const executeInstruction = new TransactionInstruction({
      programId: new PublicKey(registry.swapNodeProgramId),
      keys: executePayload.accounts
        .filter(
          (account): account is typeof account & { address: string } =>
            typeof account.address === 'string' && account.address.length > 0,
        )
        .map((account) => ({
          pubkey: new PublicKey(account.address),
          isSigner: account.isSigner,
          isWritable: account.isWritable,
        })),
      data: Buffer.from(executePayload.dataBase64, 'base64'),
    });

    return {
      instructionPayload: executePayload,
      fundingBatchPda,
      instructions: [
        ensureFundingSourceAtaInstruction,
        approveInstruction,
        executeInstruction,
      ],
    };
  }

  prepareClaimStakePositionInstruction(input: {
    network: RuntimeNetwork;
    walletAddress: string;
    raMintAddress: string;
    rewardGrossRa: number;
    rewardNetRa: number;
    claimFeeRa: number;
    sessionId: string;
  }): {
    instructionPayload: PreparedAnchorInstructionPayload;
    userRewardAta: string;
    instructions: TransactionInstruction[];
  } {
    const registry = this.networkRegistry.getRegistry(input.network);
    if (!registry.stakePoolProgramId || !registry.rewardVaultAddress) {
      throw new NotFoundException(
        `Stake pool program is not configured for ${input.network}.`,
      );
    }

    const globalConfigPda = this.pdaService.deriveGlobalConfigAddress(
      input.network,
    );
    const owner = new PublicKey(input.walletAddress);
    const raMint = new PublicKey(input.raMintAddress);
    const registryForPosition = this.networkRegistry.getRegistry(input.network);
    if (!registryForPosition.stakePoolProgramId) {
      throw new NotFoundException(
        `Stake pool program is not configured for ${input.network}.`,
      );
    }
    const ownerSeed = createHash('sha256')
      .update(input.sessionId)
      .digest()
      .subarray(0, 32);
    const [stakePositionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('stake-position', 'utf8'), owner.toBuffer(), ownerSeed],
      new PublicKey(registryForPosition.stakePoolProgramId),
    );

    const userRewardAta = getAssociatedTokenAddressSync({
      mint: raMint,
      owner,
      allowOwnerOffCurve: false,
      tokenProgramId: SPL_TOKEN_PROGRAM_ID,
      associatedTokenProgramId: SPL_ASSOCIATED_TOKEN_PROGRAM_ID,
    });

    const resolvedUserRewardAta =
      createAssociatedTokenAccountIdempotentInstruction({
        payer: owner,
        associatedToken: userRewardAta,
        owner,
        mint: raMint,
        tokenProgramId: SPL_TOKEN_PROGRAM_ID,
        associatedTokenProgramId: SPL_ASSOCIATED_TOKEN_PROGRAM_ID,
      });
    const userRewardAddress = userRewardAta.toBase58();

    const instructionPayload = this.buildInstructionPayload({
      programId: registry.stakePoolProgramId,
      instructionName: 'claim_stake_position',
      accounts: [
        {
          name: 'owner',
          address: input.walletAddress,
          isSigner: true,
          isWritable: true,
        },
        {
          name: 'globalConfig',
          address: globalConfigPda,
          isSigner: false,
          isWritable: false,
        },
        {
          name: 'stakePosition',
          address: stakePositionPda.toBase58(),
          isSigner: false,
          isWritable: true,
        },
        {
          name: 'rewardVault',
          address: registry.rewardVaultAddress,
          isSigner: false,
          isWritable: true,
        },
        {
          name: 'userRewardAta',
          address: userRewardAddress,
          isSigner: false,
          isWritable: true,
        },
        {
          name: 'raMint',
          address: input.raMintAddress,
          isSigner: false,
          isWritable: false,
        },
        {
          name: 'tokenProgram',
          address: SPL_TOKEN_PROGRAM_ADDRESS,
          isSigner: false,
          isWritable: false,
        },
        {
          name: 'systemProgram',
          address: SystemProgram.programId.toBase58(),
          isSigner: false,
          isWritable: false,
        },
      ],
      argsData: this.encodeClaimStakePositionArgs({
        rewardGrossRa: input.rewardGrossRa,
        rewardNetRa: input.rewardNetRa,
        claimFeeRa: input.claimFeeRa,
      }),
    });

    const claimInstruction = new TransactionInstruction({
      programId: new PublicKey(registry.stakePoolProgramId),
      keys: instructionPayload.accounts
        .filter(
          (account): account is typeof account & { address: string } =>
            typeof account.address === 'string' && account.address.length > 0,
        )
        .map((account) => ({
          pubkey: new PublicKey(account.address),
          isSigner: account.isSigner,
          isWritable: account.isWritable,
        })),
      data: Buffer.from(instructionPayload.dataBase64, 'base64'),
    });

    return {
      instructionPayload,
      userRewardAta: userRewardAddress,
      instructions: [resolvedUserRewardAta, claimInstruction],
    };
  }

  private buildInstructionPayload(input: {
    programId: string;
    instructionName: string;
    accounts: PreparedAnchorInstructionPayload['accounts'];
    argsData?: Buffer;
  }): PreparedAnchorInstructionPayload {
    const data = this.buildAnchorInstructionData(
      input.instructionName,
      input.argsData,
    );
    return {
      programId: input.programId,
      instructionName: input.instructionName,
      discriminatorHex: data.toString('hex'),
      dataBase64: data.toString('base64'),
      accounts: input.accounts,
    };
  }

  private buildAnchorInstructionData(
    instructionName: string,
    argsData?: Buffer,
  ): Buffer {
    const discriminator = createHash('sha256')
      .update(`global:${instructionName}`)
      .digest()
      .subarray(0, 8);
    return argsData && argsData.length > 0
      ? Buffer.concat([discriminator, argsData])
      : discriminator;
  }

  private encodeUpsertTokenStakeConfigArgs(input: {
    enabled: boolean;
    minStakeUsd: number;
    maxStakeUsd: number;
    aprBps: [number, number, number, number, number];
    configVersion: number;
  }): Buffer {
    return Buffer.concat([
      this.encodeBool(input.enabled),
      this.encodeU64(this.toScaledU64(input.minStakeUsd)),
      this.encodeU64(this.toScaledU64(input.maxStakeUsd)),
      Buffer.concat(input.aprBps.map((value) => this.encodeU16(value))),
      this.encodeU32(input.configVersion),
    ]);
  }

  private encodeInitializeGlobalConfigArgs(input: {
    activeNetwork: number;
    operatorAuthority: string;
    multisigAuthority: string;
    rewardVaultAddress: string;
    raMintAddress: string;
    swapNodeProgramId: string;
  }): Buffer {
    return Buffer.concat([
      Buffer.from([
        Math.max(0, Math.min(255, Math.trunc(input.activeNetwork))),
      ]),
      new PublicKey(input.operatorAuthority).toBuffer(),
      new PublicKey(input.multisigAuthority).toBuffer(),
      new PublicKey(input.rewardVaultAddress).toBuffer(),
      new PublicKey(input.raMintAddress).toBuffer(),
      new PublicKey(input.swapNodeProgramId).toBuffer(),
    ]);
  }

  private encodeInitializeSwapNodeArgs(input: {
    operatorAuthority: string;
    multisigAuthority: string;
    stakePoolProgramId: string;
    raMintAddress: string;
    rewardVaultAddress: string;
  }): Buffer {
    return Buffer.concat([
      new PublicKey(input.operatorAuthority).toBuffer(),
      new PublicKey(input.multisigAuthority).toBuffer(),
      new PublicKey(input.stakePoolProgramId).toBuffer(),
      new PublicKey(input.raMintAddress).toBuffer(),
      new PublicKey(input.rewardVaultAddress).toBuffer(),
    ]);
  }

  private encodeUpdateGlobalConfigArgs(input: {
    activeNetwork: number;
    rewardVaultAddress: string;
    raMintAddress: string;
    swapNodeProgramId: string;
  }): Buffer {
    return Buffer.concat([
      Buffer.from([
        Math.max(0, Math.min(255, Math.trunc(input.activeNetwork))),
      ]),
      new PublicKey(input.rewardVaultAddress).toBuffer(),
      new PublicKey(input.raMintAddress).toBuffer(),
      new PublicKey(input.swapNodeProgramId).toBuffer(),
    ]);
  }

  private encodeUpdateSwapNodeConfigArgs(input: {
    stakePoolProgramId: string;
    raMintAddress: string;
    rewardVaultAddress: string;
  }): Buffer {
    return Buffer.concat([
      new PublicKey(input.stakePoolProgramId).toBuffer(),
      new PublicKey(input.raMintAddress).toBuffer(),
      new PublicKey(input.rewardVaultAddress).toBuffer(),
    ]);
  }

  private encodeCreateStakePositionArgs(input: {
    sessionId: string;
    inputAmountRaw: bigint;
    inputTokenDecimals: number;
    amount: number;
    amountUsd: number;
    principalRa: number;
    rewardRa: number;
    finalRaPayout: number;
    apy: number;
    periodDays: number;
    unlockAt: Date;
  }): Buffer {
    return Buffer.concat([
      this.encodeSessionSeed(input.sessionId),
      this.encodeU64(input.inputAmountRaw),
      Buffer.from([
        Math.max(0, Math.min(255, Math.trunc(input.inputTokenDecimals))),
      ]),
      this.encodeU64(this.toScaledU64(input.amount)),
      this.encodeU64(this.toScaledU64(input.amountUsd)),
      this.encodeU64(this.toScaledU64(input.principalRa)),
      this.encodeU64(this.toScaledU64(input.rewardRa)),
      this.encodeU64(this.toScaledU64(input.finalRaPayout)),
      this.encodeU16(Math.round(input.apy * 100)),
      this.encodeU16(input.periodDays),
      this.encodeI64(BigInt(Math.trunc(input.unlockAt.getTime() / 1000))),
    ]);
  }

  private encodeClaimStakePositionArgs(input: {
    rewardGrossRa: number;
    rewardNetRa: number;
    claimFeeRa: number;
  }): Buffer {
    return Buffer.concat([
      this.encodeU64(this.toScaledU64(input.rewardGrossRa)),
      this.encodeU64(this.toScaledU64(input.rewardNetRa)),
      this.encodeU64(this.toScaledU64(input.claimFeeRa)),
    ]);
  }

  private encodeApproveFundingBatchArgs(input: {
    batchId: string;
    approvedInputAmountRaw: bigint;
    plannedRewardAmountRaw: bigint;
  }): Buffer {
    return Buffer.concat([
      this.encodeBatchSeed(input.batchId),
      this.encodeU64(input.approvedInputAmountRaw),
      this.encodeU64(input.plannedRewardAmountRaw),
    ]);
  }

  private encodeExecuteFundingBatchArgs(input: {
    fundedRewardAmountRaw: bigint;
  }): Buffer {
    return this.encodeU64(input.fundedRewardAmountRaw);
  }

  private encodeSessionSeed(sessionId: string): Buffer {
    return createHash('sha256').update(sessionId).digest().subarray(0, 32);
  }

  private encodeBatchSeed(batchId: string): Buffer {
    return createHash('sha256').update(batchId).digest().subarray(0, 16);
  }

  private toScaledU64(value: number, scale = 1_000_000): bigint {
    const normalized = Number.isFinite(value) ? Math.max(0, value) : 0;
    return BigInt(Math.round(normalized * scale));
  }

  private encodeBool(value: boolean): Buffer {
    return Buffer.from([value ? 1 : 0]);
  }

  private encodeU16(value: number): Buffer {
    const buffer = Buffer.alloc(2);
    buffer.writeUInt16LE(Math.max(0, Math.trunc(value)), 0);
    return buffer;
  }

  private encodeU32(value: number): Buffer {
    const buffer = Buffer.alloc(4);
    buffer.writeUInt32LE(Math.max(0, Math.trunc(value)), 0);
    return buffer;
  }

  private encodeU64(value: bigint): Buffer {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(value, 0);
    return buffer;
  }

  private encodeI64(value: bigint): Buffer {
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64LE(value, 0);
    return buffer;
  }
}

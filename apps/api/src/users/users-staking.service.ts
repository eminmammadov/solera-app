import { createHash, randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  Prisma,
  StakePositionStatus,
  WalletActivityStatus,
  WalletActivityType,
} from '@prisma/client';
import {
  Connection,
  PublicKey,
  SendTransactionError,
  TransactionInstruction,
  VersionedTransaction,
} from '@solana/web3.js';
import { encodeBase58 } from '../common/base58';
import { buildSolscanTxUrl } from '../common/external.constants';
import { toNumber } from '../common/numeric';
import { WRAPPED_SOL_MINT_ADDRESS } from '../common/solana.constants';
import { PrismaService } from '../prisma/prisma.service';
import { ClaimUserStakePositionDto } from './dto/claim-user-stake-position.dto';
import { CreateUserStakePositionDto } from './dto/create-user-stake-position.dto';
import { ExecuteWalletClaimDto } from './dto/execute-wallet-claim.dto';
import { ExecuteWalletStakeDto } from './dto/execute-wallet-stake.dto';
import { PrepareWalletClaimDto } from './dto/prepare-wallet-claim.dto';
import { PrepareWalletStakeDto } from './dto/prepare-wallet-stake.dto';
import { PreviewWalletStakeDto } from './dto/preview-wallet-stake.dto';
import { STAKE_PERIOD_DAYS } from './users.constants';
import { toStakePositionPayload } from './users.presenter';
import { StakingMirrorService } from '../solana/staking/staking-mirror.service';
import { StakingNetworkRegistryService } from '../solana/staking/staking-network-registry.service';
import { StakingPreparationModeService } from '../solana/staking/staking-preparation-mode.service';
import { StakingTransactionService } from '../solana/staking/staking-transaction.service';
import type {
  UsersRaRuntimeSettings,
  UsersRequestContext,
  WalletClaimExecutionPayload,
  WalletClaimPreparationPayload,
  WalletHeaderRuntimeSettings,
  WalletStakeExecutionPayload,
  WalletStakePreparationPayload,
  WalletStakeQuotePayload,
  WalletStakePositionPayload,
} from './users.types';
import { normalizeWalletAddress } from './users.utils';
import { UsersWalletStateService } from './users-wallet-state.service';
import {
  PreparedClaimSession,
  PreparedStakeSession,
  ResolvedStakeQuote,
  STAKE_SIGNED_SOURCE_MODE,
  UsersStakingSessionService,
} from './users-staking-session.service';

interface UsersStakingServiceDependencies {
  validateProxyKey(proxyKey?: string): void;
  assertWalletConnectionsEnabled(): Promise<WalletHeaderRuntimeSettings>;
  assertWalletAccessToken(
    authorization: string | undefined,
    walletAddress: string,
  ): void;
  consumeRateLimit(key: string, limit: number, windowMs: number): Promise<void>;
  resolveCountryCode(context: UsersRequestContext): Promise<string | null>;
  loadRaRuntimeSettings(): Promise<UsersRaRuntimeSettings>;
  resolveRaPriceUsd(
    settings: UsersRaRuntimeSettings,
    network: 'devnet' | 'mainnet',
  ): Promise<number>;
  resolveStakeTokenPriceUsd(input: {
    ticker: string;
    mintAddress?: string | null;
    persistedPriceUsd: number;
    network: 'devnet' | 'mainnet';
  }): Promise<number>;
  syncUserTrackedOnchainBalances(
    userId: string,
    walletAddress: string,
    network: 'devnet' | 'mainnet',
    settings?: UsersRaRuntimeSettings,
  ): Promise<number>;
  calculateFeeUsd(amountUsd: number, feeBps: number): number;
  normalizeTicker(value: string): string;
  normalizePeriodLabel(value: string): string;
  normalizeTokenName(value?: string): string | null;
  createWalletActivityRecord(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      walletAddress: string;
      type: WalletActivityType;
      status?: WalletActivityStatus;
      tokenTicker: string;
      tokenName?: string | null;
      amount: number;
      amountUsd?: number;
      referenceId?: string | null;
      metadata?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
      createdAt?: Date;
      network?: 'devnet' | 'mainnet';
    },
  ): Promise<{ id: string }>;
  getSolanaConnection(network: 'devnet' | 'mainnet'): Connection;
  buildVersionedTransactionBase64(input: {
    connection: Connection;
    payer: PublicKey;
    instructions: TransactionInstruction[];
  }): Promise<{
    transactionBase64: string;
    messageHash: string;
    lastValidBlockHeight: number;
  }>;
}

interface SignedStakeEnvelope {
  messageHash: string;
  walletSignature: string;
}

const STAKE_PREPARE_SESSION_TTL_MS = 5 * 60 * 1000;
const CLAIM_PREPARE_SESSION_TTL_MS = 5 * 60 * 1000;
const STAKE_PREPARE_RATE_LIMIT = 24;
const STAKE_PREVIEW_RATE_LIMIT = 36;
const STAKE_EXECUTE_RATE_LIMIT = 24;
const NATIVE_SOL_TICKER = 'SOL';

@Injectable()
export class UsersStakingService {
  private readonly logger = new Logger(UsersStakingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersWalletStateService: UsersWalletStateService,
    private readonly usersStakingSessionService: UsersStakingSessionService,
    private readonly stakingPreparationMode: StakingPreparationModeService,
    private readonly stakingNetworkRegistry: StakingNetworkRegistryService,
    private readonly stakingTransactionService: StakingTransactionService,
    private readonly stakingMirror: StakingMirrorService,
  ) {}

  async previewStakePosition(input: {
    dto: PreviewWalletStakeDto;
    context: UsersRequestContext;
    authorization?: string;
    proxyKey?: string;
    deps: UsersStakingServiceDependencies;
  }): Promise<WalletStakeQuotePayload> {
    const { dto, context, authorization, proxyKey, deps } = input;

    deps.validateProxyKey(proxyKey);
    const walletAddress = normalizeWalletAddress(dto.walletAddress);
    const headerRuntime = await deps.assertWalletConnectionsEnabled();
    deps.assertWalletAccessToken(authorization, walletAddress);

    await deps.consumeRateLimit(
      `users:stake:preview:${context.requesterKey}:${walletAddress}`,
      STAKE_PREVIEW_RATE_LIMIT,
      60_000,
    );
    await this.usersWalletStateService.assertWalletNotBlocked(walletAddress);

    const resolvedCountry = await deps.resolveCountryCode(context);
    const { user } = await this.usersWalletStateService.upsertWalletUser(
      walletAddress,
      context,
      resolvedCountry,
    );
    const raSettings = await deps.loadRaRuntimeSettings();
    await deps.syncUserTrackedOnchainBalances(
      user.id,
      walletAddress,
      headerRuntime.network,
      raSettings,
    );

    const quote = await this.resolveStakeQuote({
      tokenTicker: dto.tokenTicker,
      amount: dto.amount,
      periodLabel: dto.periodLabel,
      network: headerRuntime.network,
      raSettings,
      deps,
    });

    return {
      sessionId: randomUUID(),
      walletAddress,
      network: headerRuntime.network,
      tokenTicker: quote.tokenTicker,
      tokenName: quote.tokenName,
      tokenMintAddress: quote.tokenMintAddress,
      amount: quote.amount,
      amountUsd: quote.amountUsd,
      periodLabel: quote.periodLabel,
      periodDays: quote.periodDays,
      apy: quote.apy,
      priceSnapshotUsd: quote.priceSnapshotUsd,
      raPriceSnapshotUsd: quote.raPriceSnapshotUsd,
      principalRa: quote.principalRa,
      rewardRa: quote.rewardRa,
      finalRaPayout: quote.finalRaPayout,
      requiresWalletSignature: true,
      expiresAt: new Date(
        Date.now() + STAKE_PREPARE_SESSION_TTL_MS,
      ).toISOString(),
    };
  }

  async prepareStakePosition(input: {
    dto: PrepareWalletStakeDto;
    context: UsersRequestContext;
    authorization?: string;
    proxyKey?: string;
    deps: UsersStakingServiceDependencies;
  }): Promise<WalletStakePreparationPayload> {
    const { dto, context, authorization, proxyKey, deps } = input;

    deps.validateProxyKey(proxyKey);
    const walletAddress = normalizeWalletAddress(dto.walletAddress);
    const headerRuntime = await deps.assertWalletConnectionsEnabled();
    deps.assertWalletAccessToken(authorization, walletAddress);

    await deps.consumeRateLimit(
      `users:stake:prepare:${context.requesterKey}:${walletAddress}`,
      STAKE_PREPARE_RATE_LIMIT,
      60_000,
    );
    await this.usersWalletStateService.assertWalletNotBlocked(walletAddress);

    const resolvedCountry = await deps.resolveCountryCode(context);
    const { user } = await this.usersWalletStateService.upsertWalletUser(
      walletAddress,
      context,
      resolvedCountry,
    );
    const raSettings = await deps.loadRaRuntimeSettings();
    await deps.syncUserTrackedOnchainBalances(
      user.id,
      walletAddress,
      headerRuntime.network,
      raSettings,
    );

    const quote = await this.resolveStakeQuote({
      tokenTicker: dto.tokenTicker,
      amount: dto.amount,
      periodLabel: dto.periodLabel,
      network: headerRuntime.network,
      raSettings,
      deps,
    });

    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + STAKE_PREPARE_SESSION_TTL_MS);
    const startedAt = new Date();
    const unlockAt = new Date(
      startedAt.getTime() + quote.periodDays * 24 * 60 * 60 * 1000,
    );
    const stakeMintAddress = quote.tokenMintAddress;
    const preparationResolution =
      await this.stakingPreparationMode.resolveStakePreparation({
        canPrepare: Boolean(stakeMintAddress),
        missingReason: 'Token mint is missing for on-chain staking prepare.',
        prepare: stakeMintAddress
          ? async () => {
              const connection = deps.getSolanaConnection(
                headerRuntime.network,
              );
              const inputTokenDecimals = await this.resolveMintDecimals(
                connection,
                stakeMintAddress,
              );
              const inputAmountRaw = this.toTokenRawAmount(
                quote.amount,
                inputTokenDecimals,
              );
              const preparedInstruction =
                this.stakingTransactionService.prepareCreateStakePositionInstruction(
                  {
                    network: headerRuntime.network,
                    walletAddress,
                    mintAddress: stakeMintAddress,
                    sessionId,
                    inputAmountRaw,
                    inputTokenDecimals,
                    amount: quote.amount,
                    amountUsd: quote.amountUsd,
                    principalRa: quote.principalRa,
                    rewardRa: quote.rewardRa,
                    finalRaPayout: quote.finalRaPayout,
                    apy: quote.apy,
                    periodDays: quote.periodDays,
                    unlockAt,
                  },
                );
              await this.assertPreparedStakeExecutionReady(
                connection,
                preparedInstruction.instructionPayload,
              );
              const preparedTransaction =
                await deps.buildVersionedTransactionBase64({
                  connection,
                  payer: new PublicKey(walletAddress),
                  instructions: preparedInstruction.instructions,
                });

              return {
                instruction: preparedInstruction.instructionPayload,
                transactionBase64: preparedTransaction.transactionBase64,
                messageHash: preparedTransaction.messageHash,
                lastValidBlockHeight: preparedTransaction.lastValidBlockHeight,
              };
            }
          : undefined,
      });
    const instruction = preparationResolution.payload.instruction;
    const transactionBase64 = preparationResolution.payload.transactionBase64;
    const messageHash = preparationResolution.payload.messageHash;
    const lastValidBlockHeight =
      preparationResolution.payload.lastValidBlockHeight;

    const session: PreparedStakeSession = {
      sessionId,
      walletAddress,
      network: headerRuntime.network,
      mode: STAKE_SIGNED_SOURCE_MODE,
      tokenTicker: quote.tokenTicker,
      tokenName: quote.tokenName,
      tokenMintAddress: quote.tokenMintAddress,
      amount: quote.amount,
      amountUsd: quote.amountUsd,
      periodLabel: quote.periodLabel,
      periodDays: quote.periodDays,
      apy: quote.apy,
      priceSnapshotUsd: quote.priceSnapshotUsd,
      raPriceSnapshotUsd: quote.raPriceSnapshotUsd,
      principalRa: quote.principalRa,
      rewardRa: quote.rewardRa,
      finalRaPayout: quote.finalRaPayout,
      instruction,
      transactionBase64,
      messageHash,
      lastValidBlockHeight,
      startedAt: startedAt.toISOString(),
      unlockAt: unlockAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    await this.usersStakingSessionService.savePreparedStakeSession(
      session,
      STAKE_PREPARE_SESSION_TTL_MS,
    );

    return {
      sessionId,
      walletAddress,
      network: headerRuntime.network,
      tokenTicker: quote.tokenTicker,
      tokenName: quote.tokenName,
      tokenMintAddress: quote.tokenMintAddress,
      amount: quote.amount,
      amountUsd: quote.amountUsd,
      periodLabel: quote.periodLabel,
      periodDays: quote.periodDays,
      apy: quote.apy,
      priceSnapshotUsd: quote.priceSnapshotUsd,
      raPriceSnapshotUsd: quote.raPriceSnapshotUsd,
      principalRa: quote.principalRa,
      rewardRa: quote.rewardRa,
      finalRaPayout: quote.finalRaPayout,
      requiresWalletSignature: true,
      expiresAt: expiresAt.toISOString(),
      mode: STAKE_SIGNED_SOURCE_MODE,
      instruction,
      transactionBase64,
      messageHash,
      lastValidBlockHeight,
    };
  }

  async createStakePosition(input: {
    dto: CreateUserStakePositionDto;
    context: UsersRequestContext;
    authorization?: string;
    proxyKey?: string;
    deps: UsersStakingServiceDependencies;
  }): Promise<WalletStakePositionPayload> {
    const { dto, context, authorization, proxyKey, deps } = input;

    deps.validateProxyKey(proxyKey);
    const walletAddress = normalizeWalletAddress(dto.walletAddress);
    const headerRuntime = await deps.assertWalletConnectionsEnabled();
    deps.assertWalletAccessToken(authorization, walletAddress);

    await deps.consumeRateLimit(
      `users:stake:${context.requesterKey}:${walletAddress}`,
      60,
      60_000,
    );
    await this.usersWalletStateService.assertWalletNotBlocked(walletAddress);
    const resolvedCountry = await deps.resolveCountryCode(context);

    const { user } = await this.usersWalletStateService.upsertWalletUser(
      walletAddress,
      context,
      resolvedCountry,
    );
    const raSettings = await deps.loadRaRuntimeSettings();
    const raPriceUsd = await deps.resolveRaPriceUsd(
      raSettings,
      headerRuntime.network,
    );
    await deps.syncUserTrackedOnchainBalances(
      user.id,
      walletAddress,
      headerRuntime.network,
      raSettings,
    );
    if (!dto.prepareSessionId) {
      throw new BadRequestException(
        'Legacy staking flow is retired. Prepare and sign the on-chain stake transaction first.',
      );
    }

    const preparedSession =
      await this.usersStakingSessionService.loadPreparedStakeSession(
        dto.prepareSessionId,
      );
    const valuation =
      this.usersStakingSessionService.validatePreparedStakeSession(
        preparedSession,
        {
          walletAddress,
          network: headerRuntime.network,
          tokenTicker: dto.tokenTicker,
          amount: dto.amount,
          periodLabel: dto.periodLabel,
        },
      );
    this.stakingPreparationMode.assertStakeWriteAllowedForSource(
      STAKE_SIGNED_SOURCE_MODE,
    );
    if (!dto.signedTransactionBase64) {
      throw new BadRequestException(
        'Signed on-chain stake transaction is required before persisting the stake position.',
      );
    }
    if (!preparedSession.messageHash) {
      throw new BadRequestException(
        'Prepared stake session is missing its message hash.',
      );
    }
    if (!dto.executionSignature) {
      throw new BadRequestException(
        'On-chain stake execution must complete before persisting the stake position.',
      );
    }
    const signedEnvelope = this.validateSignedEnvelope(
      dto.signedTransactionBase64,
      preparedSession.messageHash,
    );
    const feeUsd = deps.calculateFeeUsd(
      valuation.amountUsd,
      raSettings.stakeFeeBps,
    );
    const feeRa = raPriceUsd > 0 ? feeUsd / raPriceUsd : 0;
    const now = new Date(preparedSession.startedAt);
    const unlockAt = new Date(preparedSession.unlockAt);
    const sourceMode = STAKE_SIGNED_SOURCE_MODE;

    const createdPosition = await this.prisma.$transaction(async (tx) => {
      const stake = await tx.walletStakePosition.create({
        data: {
          userId: user.id,
          network: headerRuntime.network,
          tokenTicker: valuation.tokenTicker,
          tokenName: valuation.tokenName,
          amount: valuation.amount,
          amountUsd: valuation.amountUsd,
          periodLabel: valuation.periodLabel,
          periodDays: valuation.periodDays,
          apy: valuation.apy,
          rewardEstimate: valuation.finalRaPayout,
          rewardToken: raSettings.tokenSymbol,
          status: StakePositionStatus.ACTIVE,
          startedAt: now,
          unlockAt,
        },
        include: {
          user: {
            select: {
              walletAddress: true,
            },
          },
        },
      });

      await deps.createWalletActivityRecord(tx, {
        userId: user.id,
        walletAddress,
        network: headerRuntime.network,
        type: WalletActivityType.STAKE,
        status: WalletActivityStatus.COMPLETED,
        tokenTicker: valuation.tokenTicker,
        tokenName: valuation.tokenName,
        amount: valuation.amount,
        amountUsd: valuation.amountUsd,
        referenceId: stake.id,
        metadata: {
          periodLabel: valuation.periodLabel,
          periodDays: valuation.periodDays,
          apr: valuation.apy,
          rewardEstimate: valuation.finalRaPayout,
          principalRa: valuation.principalRa,
          rewardRa: valuation.rewardRa,
          finalRaPayout: valuation.finalRaPayout,
          priceSnapshotUsd: valuation.priceSnapshotUsd,
          raPriceSnapshotUsd: valuation.raPriceSnapshotUsd,
          feeBps: raSettings.stakeFeeBps,
          feeUsd,
          feeRa,
          raPriceUsd,
          treasuryAddress:
            headerRuntime.network === 'mainnet'
              ? raSettings.treasuryMainnet
              : raSettings.treasuryDevnet,
          oracleProvider: raSettings.oraclePrimary,
          sourceMode,
          prepareSessionId: preparedSession.sessionId,
          preparedMessageHash: signedEnvelope.messageHash,
          walletSignature: signedEnvelope.walletSignature,
          executionSignature: dto.executionSignature,
          executionExplorerUrl: dto.executionExplorerUrl ?? null,
          raModelVersion: 3,
        },
        createdAt: now,
      });

      await tx.walletUser.update({
        where: { id: user.id },
        data: {
          totalStakePositions: { increment: 1 },
          activeStakePositions: { increment: 1 },
          totalStakedAmountUsd: { increment: valuation.amountUsd },
          lastSeenAt: now,
          lastSeenIp: context.ipAddress ?? user.lastSeenIp,
          lastSeenCountry: resolvedCountry ?? user.lastSeenCountry,
        },
      });

      return stake;
    });

    await this.syncStakingMirrorPosition({
      network: headerRuntime.network,
      stakePositionId: createdPosition.id,
      walletAddress,
      sourceMode,
      valuation,
      status: createdPosition.status,
      prepareSessionId: preparedSession.sessionId,
      preparedMessageHash: signedEnvelope.messageHash,
      walletSignature: signedEnvelope.walletSignature,
      startedAt: now,
      unlockAt,
      claimedAt: null,
    });

    return toStakePositionPayload(createdPosition);
  }

  async executeStakePosition(input: {
    dto: ExecuteWalletStakeDto;
    context: UsersRequestContext;
    authorization?: string;
    proxyKey?: string;
    deps: UsersStakingServiceDependencies;
  }): Promise<WalletStakeExecutionPayload> {
    const { dto, context, authorization, proxyKey, deps } = input;

    deps.validateProxyKey(proxyKey);
    const walletAddress = normalizeWalletAddress(dto.walletAddress);
    const headerRuntime = await deps.assertWalletConnectionsEnabled();
    deps.assertWalletAccessToken(authorization, walletAddress);

    await deps.consumeRateLimit(
      `users:stake:execute:${context.requesterKey}:${walletAddress}`,
      STAKE_EXECUTE_RATE_LIMIT,
      60_000,
    );
    await this.usersWalletStateService.assertWalletNotBlocked(walletAddress);

    const preparedSession =
      await this.usersStakingSessionService.loadPreparedStakeSession(
        dto.sessionId,
      );
    if (!preparedSession.messageHash) {
      throw new BadRequestException(
        'Prepared stake session is missing its message hash.',
      );
    }

    if (preparedSession.walletAddress !== walletAddress) {
      throw new BadRequestException(
        'Prepared stake session no longer matches this wallet.',
      );
    }
    if (preparedSession.network !== headerRuntime.network) {
      throw new BadRequestException(
        'Prepared stake session belongs to a different Solana network.',
      );
    }

    this.validateSignedEnvelope(
      dto.signedTransactionBase64,
      preparedSession.messageHash,
    );
    const signedTransaction = VersionedTransaction.deserialize(
      Buffer.from(dto.signedTransactionBase64, 'base64'),
    );
    const connection = deps.getSolanaConnection(preparedSession.network);
    if (preparedSession.instruction) {
      await this.assertPreparedStakeExecutionReady(
        connection,
        preparedSession.instruction,
      );
    }

    const signature = await this.sendSignedTransactionOrThrow(
      connection,
      signedTransaction,
    );

    const confirmation = await this.confirmSignedTransactionOrThrow(
      connection,
      signedTransaction,
      signature,
      preparedSession.lastValidBlockHeight ?? null,
    );

    if (confirmation.value.err) {
      throw new BadRequestException(
        typeof confirmation.value.err === 'string'
          ? confirmation.value.err
          : JSON.stringify(confirmation.value.err),
      );
    }

    const confirmedAt = new Date().toISOString();
    const explorerUrl = this.buildStakeExplorerUrl(
      preparedSession.network,
      signature,
    );

    if (preparedSession.network === 'devnet') {
      try {
        await this.stakingMirror.appendFundingEvent({
          network: preparedSession.network,
          eventType: 'POSITION_EXECUTED',
          sourceMode: STAKE_SIGNED_SOURCE_MODE,
          walletAddress,
          stakePositionId: null,
          tokenTicker: preparedSession.tokenTicker,
          principalRa: preparedSession.principalRa,
          rewardRa: preparedSession.rewardRa,
          finalRaPayout: preparedSession.finalRaPayout,
          referenceId: preparedSession.sessionId,
          message: `Prepared stake position broadcast to devnet: ${signature}`,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown devnet mirror error';
        this.logger.warn(`Stake execution mirror event skipped: ${message}`);
      }
    }

    return {
      sessionId: preparedSession.sessionId,
      walletAddress,
      network: preparedSession.network,
      mode: 'ONCHAIN_EXECUTED',
      signature,
      explorerUrl,
      confirmedAt,
      slot: confirmation.context.slot ?? null,
    };
  }

  async prepareClaimStakePosition(input: {
    stakePositionId: string;
    dto: PrepareWalletClaimDto;
    context: UsersRequestContext;
    authorization?: string;
    proxyKey?: string;
    deps: UsersStakingServiceDependencies;
  }): Promise<WalletClaimPreparationPayload> {
    const { stakePositionId, dto, context, authorization, proxyKey, deps } =
      input;

    deps.validateProxyKey(proxyKey);
    const walletAddress = normalizeWalletAddress(dto.walletAddress);
    const headerRuntime = await deps.assertWalletConnectionsEnabled();
    deps.assertWalletAccessToken(authorization, walletAddress);

    await deps.consumeRateLimit(
      `users:claim:prepare:${context.requesterKey}:${walletAddress}`,
      STAKE_PREPARE_RATE_LIMIT,
      60_000,
    );
    await this.usersWalletStateService.assertWalletNotBlocked(walletAddress);

    const existing = await this.prisma.walletStakePosition.findUnique({
      where: { id: stakePositionId },
      include: { user: true },
    });

    if (!existing) {
      throw new NotFoundException('Stake position not found');
    }
    if (existing.user.walletAddress !== walletAddress) {
      throw new UnauthorizedException(
        'Stake position does not belong to wallet',
      );
    }
    if (existing.network !== headerRuntime.network) {
      throw new BadRequestException(
        'Stake position belongs to a different Solana network.',
      );
    }

    const raSettings = await deps.loadRaRuntimeSettings();
    const rewardGrossRa = Math.max(0, toNumber(existing.rewardEstimate));
    const raPriceUsd = await deps.resolveRaPriceUsd(
      raSettings,
      headerRuntime.network,
    );
    const claimFeeUsd = deps.calculateFeeUsd(
      rewardGrossRa * raPriceUsd,
      raSettings.claimFeeBps,
    );
    const claimFeeRa = raPriceUsd > 0 ? claimFeeUsd / raPriceUsd : 0;
    const rewardNetRa = Math.max(0, rewardGrossRa - claimFeeRa);

    const originalStakeSessionId =
      await this.resolveStakePositionSessionId(stakePositionId);
    const claimPrepareSessionId = originalStakeSessionId ?? randomUUID();
    const expiresAt = new Date(Date.now() + CLAIM_PREPARE_SESSION_TTL_MS);
    const claimPreparationResolution =
      await this.stakingPreparationMode.resolveClaimPreparation({
        canPrepare: Boolean(originalStakeSessionId),
        missingReason:
          'Legacy claim flow is retired. This stake position must be migrated to an on-chain stake session before it can be claimed.',
        prepare: originalStakeSessionId
          ? async () => {
              const preparedInstruction =
                this.stakingTransactionService.prepareClaimStakePositionInstruction(
                  {
                    network: headerRuntime.network,
                    walletAddress,
                    raMintAddress:
                      headerRuntime.network === 'mainnet'
                        ? raSettings.mintMainnet
                        : raSettings.mintDevnet,
                    rewardGrossRa,
                    rewardNetRa,
                    claimFeeRa,
                    sessionId: originalStakeSessionId,
                  },
                );
              const connection = deps.getSolanaConnection(
                headerRuntime.network,
              );
              await this.assertPreparedClaimExecutionReady(
                connection,
                preparedInstruction.instructionPayload,
              );
              const preparedTransaction =
                await deps.buildVersionedTransactionBase64({
                  connection,
                  payer: new PublicKey(walletAddress),
                  instructions: preparedInstruction.instructions,
                });

              return {
                transactionBase64: preparedTransaction.transactionBase64,
                messageHash: preparedTransaction.messageHash,
                lastValidBlockHeight: preparedTransaction.lastValidBlockHeight,
              };
            }
          : undefined,
      });
    const transactionBase64 =
      claimPreparationResolution.payload.transactionBase64;
    const messageHash = claimPreparationResolution.payload.messageHash;
    const lastValidBlockHeight =
      claimPreparationResolution.payload.lastValidBlockHeight;

    const session: PreparedClaimSession = {
      sessionId: claimPrepareSessionId,
      stakePositionId,
      walletAddress,
      network: headerRuntime.network,
      transactionBase64,
      messageHash,
      lastValidBlockHeight,
      grossRewardRa: rewardGrossRa,
      netRewardRa: rewardNetRa,
      claimFeeRa,
      expiresAt: expiresAt.toISOString(),
    };

    await this.usersStakingSessionService.savePreparedClaimSession(
      session,
      CLAIM_PREPARE_SESSION_TTL_MS,
    );

    return {
      sessionId: claimPrepareSessionId,
      stakePositionId,
      walletAddress,
      network: headerRuntime.network,
      grossRewardRa: rewardGrossRa,
      claimFeeRa,
      netRewardRa: rewardNetRa,
      requiresWalletSignature: true,
      transactionBase64,
      messageHash,
      lastValidBlockHeight,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async executeClaimStakePosition(input: {
    stakePositionId: string;
    dto: ExecuteWalletClaimDto;
    context: UsersRequestContext;
    authorization?: string;
    proxyKey?: string;
    deps: UsersStakingServiceDependencies;
  }): Promise<WalletClaimExecutionPayload> {
    const { stakePositionId, dto, context, authorization, proxyKey, deps } =
      input;

    deps.validateProxyKey(proxyKey);
    const walletAddress = normalizeWalletAddress(dto.walletAddress);
    const headerRuntime = await deps.assertWalletConnectionsEnabled();
    deps.assertWalletAccessToken(authorization, walletAddress);

    await deps.consumeRateLimit(
      `users:claim:execute:${context.requesterKey}:${walletAddress}`,
      STAKE_EXECUTE_RATE_LIMIT,
      60_000,
    );
    await this.usersWalletStateService.assertWalletNotBlocked(walletAddress);

    const preparedSession =
      await this.usersStakingSessionService.loadPreparedClaimSession(
        dto.sessionId,
      );
    if (
      preparedSession.walletAddress !== walletAddress ||
      preparedSession.stakePositionId !== stakePositionId ||
      preparedSession.network !== headerRuntime.network
    ) {
      throw new BadRequestException(
        'Prepared claim session no longer matches this wallet.',
      );
    }

    this.validateSignedEnvelope(
      dto.signedTransactionBase64,
      preparedSession.messageHash,
    );
    const signedTransaction = VersionedTransaction.deserialize(
      Buffer.from(dto.signedTransactionBase64, 'base64'),
    );
    const connection = deps.getSolanaConnection(preparedSession.network);
    const signature = await this.sendSignedTransactionOrThrow(
      connection,
      signedTransaction,
    );
    const confirmation = await this.confirmSignedTransactionOrThrow(
      connection,
      signedTransaction,
      signature,
      preparedSession.lastValidBlockHeight,
    );

    if (confirmation.value.err) {
      throw new BadRequestException(
        typeof confirmation.value.err === 'string'
          ? confirmation.value.err
          : JSON.stringify(confirmation.value.err),
      );
    }

    return {
      sessionId: preparedSession.sessionId,
      stakePositionId,
      walletAddress,
      network: preparedSession.network,
      mode: 'ONCHAIN_EXECUTED',
      signature,
      explorerUrl: this.buildStakeExplorerUrl(
        preparedSession.network,
        signature,
      ),
      confirmedAt: new Date().toISOString(),
      slot: confirmation.context.slot ?? null,
    };
  }

  async claimStakePosition(input: {
    stakePositionId: string;
    dto: ClaimUserStakePositionDto;
    context: UsersRequestContext;
    authorization?: string;
    proxyKey?: string;
    deps: UsersStakingServiceDependencies;
  }): Promise<WalletStakePositionPayload> {
    const { stakePositionId, dto, context, authorization, proxyKey, deps } =
      input;

    deps.validateProxyKey(proxyKey);
    const walletAddress = normalizeWalletAddress(dto.walletAddress);
    const headerRuntime = await deps.assertWalletConnectionsEnabled();
    deps.assertWalletAccessToken(authorization, walletAddress);

    await deps.consumeRateLimit(
      `users:claim:${context.requesterKey}:${walletAddress}`,
      80,
      60_000,
    );
    await this.usersWalletStateService.assertWalletNotBlocked(walletAddress);
    const resolvedCountry = await deps.resolveCountryCode(context);

    const existing = await this.prisma.walletStakePosition.findUnique({
      where: { id: stakePositionId },
      include: {
        user: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Stake position not found');
    }

    if (existing.user.walletAddress !== walletAddress) {
      throw new UnauthorizedException(
        'Stake position does not belong to wallet',
      );
    }

    if (existing.network !== headerRuntime.network) {
      throw new BadRequestException(
        'Stake position belongs to a different Solana network.',
      );
    }

    if (existing.status !== StakePositionStatus.ACTIVE) {
      return toStakePositionPayload(existing);
    }

    const raSettings = await deps.loadRaRuntimeSettings();
    const raPriceUsd = await deps.resolveRaPriceUsd(
      raSettings,
      headerRuntime.network,
    );
    await deps.syncUserTrackedOnchainBalances(
      existing.user.id,
      walletAddress,
      headerRuntime.network,
      raSettings,
    );
    const rewardGrossRa = Math.max(0, toNumber(existing.rewardEstimate));
    const claimFeeUsd = deps.calculateFeeUsd(
      rewardGrossRa * raPriceUsd,
      raSettings.claimFeeBps,
    );
    const claimFeeRa = raPriceUsd > 0 ? claimFeeUsd / raPriceUsd : 0;
    const rewardNetRa = Math.max(0, rewardGrossRa - claimFeeRa);
    const now = new Date();

    this.stakingPreparationMode.assertClaimWriteAllowedForExecution(
      dto.executionSignature,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.walletUser.findUnique({
        where: { id: existing.user.id },
      });
      if (!user) {
        throw new NotFoundException('Wallet user not found');
      }

      const nextActivePositions = Math.max(0, user.activeStakePositions - 1);
      const nextStakedUsd = Math.max(
        0,
        toNumber(user.totalStakedAmountUsd) - toNumber(existing.amountUsd),
      );

      const position = await tx.walletStakePosition.update({
        where: { id: existing.id },
        data: {
          status: StakePositionStatus.CLAIMED,
          rewardEstimate: rewardNetRa,
          claimedAt: now,
        },
        include: {
          user: {
            select: {
              walletAddress: true,
            },
          },
        },
      });

      await deps.createWalletActivityRecord(tx, {
        userId: existing.user.id,
        walletAddress,
        network: headerRuntime.network,
        type: WalletActivityType.CLAIM,
        status: WalletActivityStatus.COMPLETED,
        tokenTicker: raSettings.tokenSymbol,
        tokenName: raSettings.tokenName,
        amount: rewardNetRa,
        amountUsd: Math.max(0, rewardNetRa * raPriceUsd),
        referenceId: position.id,
        metadata: {
          unlockAt: position.unlockAt.toISOString(),
          claimedAt: now.toISOString(),
          grossRewardRa: rewardGrossRa,
          netRewardRa: rewardNetRa,
          feeBps: raSettings.claimFeeBps,
          feeUsd: claimFeeUsd,
          feeRa: claimFeeRa,
          raPriceUsd,
          treasuryAddress:
            headerRuntime.network === 'mainnet'
              ? raSettings.treasuryMainnet
              : raSettings.treasuryDevnet,
          oracleProvider: raSettings.oraclePrimary,
          executionSignature: dto.executionSignature,
          executionExplorerUrl: dto.executionExplorerUrl ?? null,
          raModelVersion: 3,
        },
        createdAt: now,
      });

      await tx.walletUser.update({
        where: { id: existing.user.id },
        data: {
          activeStakePositions: nextActivePositions,
          totalStakedAmountUsd: nextStakedUsd,
          lastSeenAt: now,
          lastSeenIp: context.ipAddress ?? user.lastSeenIp,
          lastSeenCountry: resolvedCountry ?? user.lastSeenCountry,
        },
      });

      return position;
    });

    await this.syncStakingMirrorPosition({
      network: headerRuntime.network,
      stakePositionId: updated.id,
      walletAddress,
      sourceMode: 'CLAIM_SETTLED',
      valuation: {
        tokenTicker: updated.tokenTicker,
        tokenName: updated.tokenName,
        tokenMintAddress: null,
        amount: toNumber(updated.amount),
        amountUsd: toNumber(updated.amountUsd),
        periodLabel: updated.periodLabel,
        periodDays: updated.periodDays,
        apy: updated.apy,
        priceSnapshotUsd: 0,
        raPriceSnapshotUsd: raPriceUsd,
        principalRa: 0,
        rewardRa: rewardNetRa,
        finalRaPayout: rewardNetRa,
      },
      status: updated.status,
      prepareSessionId: null,
      preparedMessageHash: null,
      walletSignature: null,
      startedAt: updated.startedAt,
      unlockAt: updated.unlockAt,
      claimedAt: now,
    });

    return toStakePositionPayload(updated);
  }

  private async resolveStakeQuote(input: {
    tokenTicker: string;
    amount: number;
    periodLabel: string;
    network: 'devnet' | 'mainnet';
    raSettings: UsersRaRuntimeSettings;
    deps: UsersStakingServiceDependencies;
  }): Promise<ResolvedStakeQuote> {
    const tokenTicker = input.deps.normalizeTicker(input.tokenTicker);
    const periodLabel = input.deps.normalizePeriodLabel(input.periodLabel);
    const periodDays = this.resolveStakePeriodDays(periodLabel);
    const marketToken = await this.prisma.marketToken.findUnique({
      where: { ticker: tokenTicker },
      select: {
        name: true,
        isActive: true,
        stakeEnabled: true,
        mintAddress: true,
        price: true,
        stake7d: true,
        stake1m: true,
        stake3m: true,
        stake6m: true,
        stake12m: true,
      },
    });

    if (!marketToken || !marketToken.isActive || !marketToken.stakeEnabled) {
      throw new BadRequestException('tokenTicker is not supported for staking');
    }

    const amount = Number.isFinite(input.amount)
      ? Math.max(0, input.amount)
      : 0;
    if (amount <= 0) {
      throw new BadRequestException('Stake amount must be greater than zero.');
    }

    const priceSnapshotUsd = Math.max(
      0,
      await input.deps.resolveStakeTokenPriceUsd({
        ticker: tokenTicker,
        mintAddress: marketToken.mintAddress,
        persistedPriceUsd: toNumber(marketToken.price),
        network: input.network,
      }),
    );
    if (priceSnapshotUsd <= 0) {
      throw new BadRequestException(
        'Live token price is unavailable for staking right now.',
      );
    }

    const raPriceSnapshotUsd = await input.deps.resolveRaPriceUsd(
      input.raSettings,
      input.network,
    );
    if (!(raPriceSnapshotUsd > 0)) {
      throw new BadRequestException(
        'RA price is unavailable for staking right now.',
      );
    }

    const amountUsd = Math.max(0, amount * priceSnapshotUsd);
    if (amountUsd < input.raSettings.stakeMinUsd) {
      throw new BadRequestException(
        `Minimum stake is $${input.raSettings.stakeMinUsd.toFixed(2)}.`,
      );
    }
    if (amountUsd > input.raSettings.stakeMaxUsd) {
      throw new BadRequestException(
        `Maximum stake is $${input.raSettings.stakeMaxUsd.toFixed(2)}.`,
      );
    }

    const apy = this.resolveStakeAprForPeriod(marketToken, periodLabel);
    const principalRa = amountUsd / raPriceSnapshotUsd;
    const rewardRa = principalRa * (apy / 100);
    const finalRaPayout = principalRa + rewardRa;

    if (!(principalRa > 0) || !(finalRaPayout > 0)) {
      throw new BadRequestException('Unable to value stake route right now.');
    }

    return {
      tokenTicker,
      tokenName: marketToken.name ?? null,
      tokenMintAddress: this.resolveStakeMintAddress(
        tokenTicker,
        marketToken.mintAddress,
      ),
      amount,
      amountUsd,
      periodLabel,
      periodDays,
      apy,
      priceSnapshotUsd,
      raPriceSnapshotUsd,
      principalRa,
      rewardRa,
      finalRaPayout,
    };
  }

  private resolveStakeMintAddress(
    ticker: string,
    mintAddress: string | null | undefined,
  ): string | null {
    if (ticker.trim().toUpperCase() === NATIVE_SOL_TICKER) {
      return WRAPPED_SOL_MINT_ADDRESS;
    }

    const normalized = mintAddress?.trim();
    return normalized ? normalized : null;
  }

  private async resolveStakePositionSessionId(
    stakePositionId: string,
  ): Promise<string | null> {
    const activity = await this.prisma.walletUserActivity.findFirst({
      where: {
        type: WalletActivityType.STAKE,
        referenceId: stakePositionId,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        metadata: true,
      },
    });

    const metadata = activity?.metadata;
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }

    const rawSessionId = (metadata as Record<string, unknown>).prepareSessionId;
    return typeof rawSessionId === 'string' && rawSessionId.length > 0
      ? rawSessionId
      : null;
  }

  private validateSignedEnvelope(
    signedTransactionBase64: string,
    expectedMessageHash: string,
  ): SignedStakeEnvelope {
    const signedTransaction = VersionedTransaction.deserialize(
      Buffer.from(signedTransactionBase64, 'base64'),
    );
    const messageHash = createHash('sha256')
      .update(signedTransaction.message.serialize())
      .digest('hex');

    if (messageHash !== expectedMessageHash) {
      throw new BadRequestException(
        'Signed stake envelope does not match the prepared transaction.',
      );
    }

    const walletSignatureBytes = signedTransaction.signatures[0];
    if (!walletSignatureBytes || walletSignatureBytes.length === 0) {
      throw new BadRequestException(
        'Stake transaction is missing the wallet signature.',
      );
    }

    return {
      messageHash,
      walletSignature: encodeBase58(walletSignatureBytes),
    };
  }

  private async sendSignedTransactionOrThrow(
    connection: Connection,
    signedTransaction: VersionedTransaction,
  ): Promise<string> {
    try {
      return await connection.sendRawTransaction(
        Buffer.from(signedTransaction.serialize()),
        {
          skipPreflight: false,
          maxRetries: 3,
        },
      );
    } catch (error) {
      throw this.toOnchainBadRequest(error);
    }
  }

  private async confirmSignedTransactionOrThrow(
    connection: Connection,
    signedTransaction: VersionedTransaction,
    signature: string,
    lastValidBlockHeight: number | null,
  ) {
    try {
      return lastValidBlockHeight
        ? await connection.confirmTransaction(
            {
              signature,
              blockhash: signedTransaction.message.recentBlockhash,
              lastValidBlockHeight,
            },
            'confirmed',
          )
        : await connection.confirmTransaction(signature, 'confirmed');
    } catch (error) {
      throw this.toOnchainBadRequest(error);
    }
  }

  private toOnchainBadRequest(error: unknown): BadRequestException {
    if (error instanceof BadRequestException) {
      return error;
    }

    if (error instanceof SendTransactionError) {
      const logMessage =
        error.logs?.find((entry) => entry.includes('Error Message:')) ??
        error.logs?.find((entry) => entry.includes('custom program error')) ??
        null;
      const fallback = error.message || 'On-chain transaction failed.';
      return new BadRequestException(
        logMessage
          ? logMessage.replace(/^Program log:\s*/, '').trim()
          : fallback,
      );
    }

    if (error instanceof Error) {
      const message = error.message?.trim();
      if (message) {
        return new BadRequestException(message);
      }
    }

    return new BadRequestException('On-chain transaction failed.');
  }

  private async resolveMintDecimals(
    connection: Connection,
    mintAddress: string,
  ): Promise<number> {
    const mintInfo = await connection.getParsedAccountInfo(
      new PublicKey(mintAddress),
      'confirmed',
    );
    const parsed = mintInfo.value?.data;
    if (!parsed || typeof parsed !== 'object' || !('parsed' in parsed)) {
      throw new BadRequestException(
        'Unable to resolve stake token decimals from Solana RPC.',
      );
    }

    const parsedField = (parsed as Record<string, unknown>).parsed;
    if (typeof parsedField !== 'object' || parsedField === null) {
      throw new BadRequestException(
        'Unable to resolve stake token decimals from Solana RPC.',
      );
    }

    const infoField = (parsedField as Record<string, unknown>).info;
    if (typeof infoField !== 'object' || infoField === null) {
      throw new BadRequestException(
        'Unable to resolve stake token decimals from Solana RPC.',
      );
    }

    const decimals = (infoField as Record<string, unknown>).decimals;
    if (typeof decimals !== 'number' || !Number.isFinite(decimals)) {
      throw new BadRequestException(
        'Unable to resolve stake token decimals from Solana RPC.',
      );
    }

    return Math.max(0, Math.trunc(decimals));
  }

  private toTokenRawAmount(amount: number, decimals: number): bigint {
    const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    const normalizedDecimals = Math.max(0, Math.min(18, Math.trunc(decimals)));
    const [wholePart, fractionPart = ''] = safeAmount
      .toFixed(normalizedDecimals)
      .split('.');
    const paddedFraction = `${fractionPart}000000000000000000`.slice(
      0,
      normalizedDecimals,
    );
    const raw = `${wholePart}${paddedFraction}`.replace(/^0+(?=\d)/, '');
    return BigInt(raw || '0');
  }

  private async assertPreparedStakeExecutionReady(
    connection: Connection,
    instructionPayload: WalletStakePreparationPayload['instruction'],
  ) {
    if (!instructionPayload) {
      throw new BadRequestException(
        'Prepared stake instruction payload is missing.',
      );
    }

    const programId = new PublicKey(instructionPayload.programId);
    const runtimeAccounts = instructionPayload.accounts.filter(
      (account): account is typeof account & { address: string } =>
        (account.name === 'globalConfig' || account.name === 'tokenConfig') &&
        typeof account.address === 'string' &&
        account.address.length > 0,
    );
    if (runtimeAccounts.length < 2) {
      throw new BadRequestException(
        'Prepared stake runtime accounts are incomplete.',
      );
    }
    const [programInfo, ...accountInfos] =
      await connection.getMultipleAccountsInfo(
        [
          programId,
          ...runtimeAccounts.map((account) => new PublicKey(account.address)),
        ],
        'confirmed',
      );

    if (!programInfo?.executable) {
      throw new BadRequestException(
        'Stake pool program is not deployed or not executable yet on this network.',
      );
    }

    const missingRuntimeAccount = runtimeAccounts.find((account, index) => {
      const info = accountInfos[index];
      return !info || info.owner.toBase58() !== instructionPayload.programId;
    });

    if (missingRuntimeAccount) {
      throw new BadRequestException(
        `${missingRuntimeAccount.name} is not initialized on-chain yet.`,
      );
    }
  }

  private async assertPreparedClaimExecutionReady(
    connection: Connection,
    instructionPayload: WalletStakePreparationPayload['instruction'],
  ) {
    if (!instructionPayload) {
      throw new BadRequestException(
        'Prepared claim instruction payload is missing.',
      );
    }

    const requiredAccounts = instructionPayload.accounts.filter(
      (account): account is typeof account & { address: string } =>
        ['globalConfig', 'stakePosition', 'rewardVault', 'raMint'].includes(
          account.name,
        ) &&
        typeof account.address === 'string' &&
        account.address.length > 0,
    );
    if (requiredAccounts.length < 4) {
      throw new BadRequestException(
        'Prepared claim runtime accounts are incomplete.',
      );
    }

    const [programInfo, ...accountInfos] =
      await connection.getMultipleAccountsInfo(
        [
          new PublicKey(instructionPayload.programId),
          ...requiredAccounts.map((account) => new PublicKey(account.address)),
        ],
        'confirmed',
      );
    if (!programInfo?.executable) {
      throw new BadRequestException(
        'Stake pool program is not deployed or not executable yet on this network.',
      );
    }
    const missingAccount = requiredAccounts.find((account, index) => {
      const info = accountInfos[index];
      return !info;
    });
    if (missingAccount) {
      throw new BadRequestException(
        `${missingAccount.name} is not initialized on-chain yet.`,
      );
    }
  }

  private buildStakeExplorerUrl(
    network: 'devnet' | 'mainnet',
    signature: string,
  ) {
    return buildSolscanTxUrl(signature, network);
  }

  private async syncStakingMirrorPosition(input: {
    network: 'devnet' | 'mainnet';
    stakePositionId: string;
    walletAddress: string;
    sourceMode: string;
    valuation: ResolvedStakeQuote;
    status: StakePositionStatus;
    prepareSessionId: string | null;
    preparedMessageHash: string | null;
    walletSignature: string | null;
    startedAt: Date;
    unlockAt: Date;
    claimedAt: Date | null;
  }) {
    if (input.network !== 'devnet') {
      return;
    }

    try {
      await this.stakingMirror.upsertPositionProjection({
        network: input.network,
        stakePositionId: input.stakePositionId,
        walletAddress: input.walletAddress,
        sourceMode: input.sourceMode,
        tokenTicker: input.valuation.tokenTicker,
        tokenName: input.valuation.tokenName,
        amount: input.valuation.amount,
        amountUsd: input.valuation.amountUsd,
        periodLabel: input.valuation.periodLabel,
        periodDays: input.valuation.periodDays,
        apy: input.valuation.apy,
        principalRa: input.valuation.principalRa,
        rewardRa: input.valuation.rewardRa,
        finalRaPayout: input.valuation.finalRaPayout,
        status: input.status,
        prepareSessionId: input.prepareSessionId,
        preparedMessageHash: input.preparedMessageHash,
        walletSignature: input.walletSignature,
        startedAt: input.startedAt,
        unlockAt: input.unlockAt,
        claimedAt: input.claimedAt,
      });

      await this.stakingMirror.appendFundingEvent({
        network: input.network,
        eventType:
          input.status === StakePositionStatus.CLAIMED
            ? 'LIABILITY_SETTLED'
            : 'LIABILITY_CREATED',
        sourceMode: input.sourceMode,
        walletAddress: input.walletAddress,
        stakePositionId: input.stakePositionId,
        tokenTicker: input.valuation.tokenTicker,
        principalRa: input.valuation.principalRa,
        rewardRa: input.valuation.rewardRa,
        finalRaPayout: input.valuation.finalRaPayout,
        referenceId: input.prepareSessionId,
        message:
          input.status === StakePositionStatus.CLAIMED
            ? 'Stake liability settled and claim mirrored.'
            : 'Stake liability created and mirrored from wallet flow.',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown staking mirror error';
      this.logger.warn(`Stake mirror sync skipped: ${message}`);
    }
  }

  private resolveStakePeriodDays(periodLabel: string): number {
    const days = STAKE_PERIOD_DAYS[periodLabel];
    if (!days) {
      throw new BadRequestException('Unsupported staking period label');
    }
    return days;
  }

  private resolveStakeAprForPeriod(
    marketToken: {
      stake7d: number;
      stake1m: number;
      stake3m: number;
      stake6m: number;
      stake12m: number;
    },
    periodLabel: string,
  ): number {
    switch (periodLabel) {
      case '7D':
        return Math.max(0, marketToken.stake7d);
      case '1M':
        return Math.max(0, marketToken.stake1m);
      case '3M':
        return Math.max(0, marketToken.stake3m);
      case '6M':
        return Math.max(0, marketToken.stake6m);
      case '12M':
        return Math.max(0, marketToken.stake12m);
      default:
        throw new BadRequestException('Unsupported staking period label');
    }
  }
}

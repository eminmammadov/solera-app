import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  WalletActivityStatus,
  WalletActivityType,
  WalletConversionLegStatus,
  WalletConversionStatus,
} from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import {
  Connection,
  PublicKey,
  TransactionInstruction,
  VersionedTransaction,
} from '@solana/web3.js';
import { SPL_ASSOCIATED_TOKEN_PROGRAM_ID } from '../common/solana.constants';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from '../common/solana-token';
import { PrismaService } from '../prisma/prisma.service';
import { ExecuteWalletConvertDto } from './dto/execute-wallet-convert.dto';
import { PrepareWalletConvertDto } from './dto/prepare-wallet-convert.dto';
import { PreviewWalletConvertDto } from './dto/preview-wallet-convert.dto';
import { toNumber } from '../common/numeric';
import type {
  UsersRaRuntimeSettings,
  UsersRequestContext,
  WalletConvertExecutionLegPayload,
  WalletConvertExecutionPayload,
  WalletConvertPreparationLegPayload,
  WalletConvertPreparationPayload,
  WalletConvertPreviewPayload,
  WalletConvertPreviewTokenPayload,
  WalletHeaderRuntimeSettings,
} from './users.types';
import { normalizeWalletAddress } from './users.utils';
import { UsersWalletStateService } from './users-wallet-state.service';

interface UsersConvertResolvedRaMintTarget {
  raMintAddress: string;
  raMintDecimals: number;
  raTokenProgramId: PublicKey;
}

interface UsersConvertRoutePlanStep {
  poolId?: string;
  inputMint?: string;
  outputMint?: string;
}

interface UsersConvertRaydiumComputeSwapResponse {
  id?: string;
  success?: boolean;
  version?: string;
  data?: {
    swapType?: string;
    inputMint?: string;
    inputAmount?: string;
    outputMint?: string;
    outputAmount?: string;
    otherAmountThreshold?: string;
    slippageBps?: number;
    priceImpactPct?: string | number;
    routePlan?: UsersConvertRoutePlanStep[];
  };
}

interface UsersConvertCandidate {
  ticker: string;
  name: string;
  mintAddress: string;
  amount: number;
  amountRaw: string;
  decimals: number;
  tokenAccountAddress: string;
  amountUsd: number;
  quotedRaOut: number;
  slippageBps: number;
  routeQuote: UsersConvertRaydiumComputeSwapResponse;
  routeTransactionCount: number;
}

interface UsersConvertCandidatesResult {
  candidates: UsersConvertCandidate[];
  hiddenTokenCount: number;
  unavailableCount: number;
  note: string | null;
  availableSolBalance: number;
  estimatedNetworkFeeSol: number;
  canExecute: boolean;
  feeWarning: string | null;
  raTarget: UsersConvertResolvedRaMintTarget;
  userRaTokenAccount: string;
  needsUserRaTokenAccount: boolean;
}

interface UsersConvertServiceDependencies {
  validateProxyKey(proxyKey?: string): void;
  assertWalletConnectionsEnabled(): Promise<WalletHeaderRuntimeSettings>;
  assertWalletAccessToken(
    authorization: string | undefined,
    walletAddress: string,
  ): void;
  consumeRateLimit(key: string, limit: number, windowMs: number): Promise<void>;
  resolveCountryCode(context: UsersRequestContext): Promise<string | null>;
  loadRaRuntimeSettings(force?: boolean): Promise<UsersRaRuntimeSettings>;
  normalizeConvertTokenTickers(tokens: Array<{ ticker: string }>): string[];
  listWalletConvertCandidates(input: {
    userId: string;
    walletAddress: string;
    network: 'devnet' | 'mainnet';
    settings: UsersRaRuntimeSettings;
    requestedTickers?: string[];
  }): Promise<UsersConvertCandidatesResult>;
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
  buildRaydiumSwapTransactions(input: {
    network: 'devnet' | 'mainnet';
    walletAddress: string;
    inputAccount: string;
    outputAccount?: string;
    swapResponse: UsersConvertRaydiumComputeSwapResponse;
  }): Promise<string[]>;
  buildPreparedMessageHash(transactionBase64: string): string;
  resolveRaMintTarget(
    network: 'devnet' | 'mainnet',
    settings: UsersRaRuntimeSettings,
  ): Promise<UsersConvertResolvedRaMintTarget>;
  getTokenAccountUiBalance(
    connection: Connection,
    tokenAccountAddress: string,
  ): Promise<number>;
  bigintToBase58Signature(signatureBytes: Uint8Array): string | null;
  resolveRaPriceUsd(
    settings: UsersRaRuntimeSettings,
    network: 'devnet' | 'mainnet',
  ): Promise<number>;
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
  syncUserTrackedOnchainBalances(
    userId: string,
    walletAddress: string,
    network: 'devnet' | 'mainnet',
    settings?: UsersRaRuntimeSettings,
  ): Promise<number>;
}

const CONVERT_SESSION_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class UsersConvertService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersWalletStateService: UsersWalletStateService,
  ) {}

  async previewWalletConvert(input: {
    dto: PreviewWalletConvertDto;
    context: UsersRequestContext;
    authorization?: string;
    proxyKey?: string;
    deps: UsersConvertServiceDependencies;
  }): Promise<WalletConvertPreviewPayload> {
    const { dto, context, authorization, proxyKey, deps } = input;

    deps.validateProxyKey(proxyKey);

    const walletAddress = normalizeWalletAddress(dto.walletAddress);
    const headerRuntime = await deps.assertWalletConnectionsEnabled();
    deps.assertWalletAccessToken(authorization, walletAddress);

    await deps.consumeRateLimit(
      `users:convert:preview:${context.requesterKey}:${walletAddress}`,
      30,
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

    if (!raSettings.convertEnabled) {
      return {
        walletAddress,
        network: headerRuntime.network,
        maxTokensPerSession: raSettings.convertMaxTokensPerSession,
        hiddenTokenCount: 0,
        unavailableCount: 0,
        note: 'Convert small balances is currently unavailable.',
        availableSolBalance: 0,
        estimatedNetworkFeeSol: 0,
        canExecute: false,
        feeWarning: 'Convert small balances is currently unavailable.',
        tokens: [],
      };
    }

    const preview = await deps.listWalletConvertCandidates({
      userId: user.id,
      walletAddress,
      network: headerRuntime.network,
      settings: raSettings,
    });

    return {
      walletAddress,
      network: headerRuntime.network,
      maxTokensPerSession: raSettings.convertMaxTokensPerSession,
      hiddenTokenCount: preview.hiddenTokenCount,
      unavailableCount: preview.unavailableCount,
      note: preview.note,
      availableSolBalance: preview.availableSolBalance,
      estimatedNetworkFeeSol: preview.estimatedNetworkFeeSol,
      canExecute: preview.canExecute,
      feeWarning: preview.feeWarning,
      tokens: preview.candidates.map(
        (candidate, index): WalletConvertPreviewTokenPayload => ({
          ticker: candidate.ticker,
          name: candidate.name,
          mintAddress: candidate.mintAddress,
          amount: candidate.amount,
          amountUsd: candidate.amountUsd,
          quotedRaOut: candidate.quotedRaOut,
          quotedFeeRa: 0,
          quotedFeeUsd: 0,
          transactionCount:
            candidate.routeTransactionCount +
            (preview.needsUserRaTokenAccount && index === 0 ? 1 : 0),
        }),
      ),
    };
  }

  async prepareWalletConvert(input: {
    dto: PrepareWalletConvertDto;
    context: UsersRequestContext;
    authorization?: string;
    proxyKey?: string;
    deps: UsersConvertServiceDependencies;
  }): Promise<WalletConvertPreparationPayload> {
    const { dto, context, authorization, proxyKey, deps } = input;

    deps.validateProxyKey(proxyKey);

    const walletAddress = normalizeWalletAddress(dto.walletAddress);
    const headerRuntime = await deps.assertWalletConnectionsEnabled();
    deps.assertWalletAccessToken(authorization, walletAddress);

    await deps.consumeRateLimit(
      `users:convert:prepare:${context.requesterKey}:${walletAddress}`,
      24,
      60_000,
    );
    await this.usersWalletStateService.assertWalletNotBlocked(walletAddress);

    const requestedTickers = deps.normalizeConvertTokenTickers(dto.tokens);
    const resolvedCountry = await deps.resolveCountryCode(context);
    const { user } = await this.usersWalletStateService.upsertWalletUser(
      walletAddress,
      context,
      resolvedCountry,
    );
    const raSettings = await deps.loadRaRuntimeSettings();
    if (!raSettings.convertEnabled) {
      throw new BadRequestException(
        'Convert small balances is currently disabled.',
      );
    }
    if (requestedTickers.length > raSettings.convertMaxTokensPerSession) {
      throw new BadRequestException(
        `You can convert at most ${raSettings.convertMaxTokensPerSession} tokens per session.`,
      );
    }

    const preview = await deps.listWalletConvertCandidates({
      userId: user.id,
      walletAddress,
      network: headerRuntime.network,
      settings: raSettings,
      requestedTickers,
    });
    const candidateByTicker = new Map(
      preview.candidates.map((candidate) => [candidate.ticker, candidate]),
    );

    for (const ticker of requestedTickers) {
      if (!candidateByTicker.has(ticker)) {
        throw new BadRequestException(
          `${ticker} is not currently routable to ${raSettings.tokenSymbol} on the selected network.`,
        );
      }
    }
    if (!preview.canExecute) {
      throw new BadRequestException(
        preview.feeWarning ??
          'Not enough SOL is available to cover conversion network fees.',
      );
    }

    const connection = deps.getSolanaConnection(headerRuntime.network);
    const expiresAt = new Date(Date.now() + CONVERT_SESSION_TTL_MS);
    const sessionId = randomUUID();
    let shouldAttachUserRaAtaInit = preview.needsUserRaTokenAccount;

    const preparedLegs = await Promise.all(
      requestedTickers.map(async (ticker, index) => {
        const candidate = candidateByTicker.get(ticker);
        if (!candidate) {
          throw new BadRequestException(
            `${ticker} is not currently routable to ${raSettings.tokenSymbol} on the selected network.`,
          );
        }

        const preparedTransactions: string[] = [];
        const preparedMessageHashes: string[] = [];
        let preparedLastValidBlockHeight: number | null = null;

        if (shouldAttachUserRaAtaInit) {
          const ataCreation = await deps.buildVersionedTransactionBase64({
            connection,
            payer: new PublicKey(walletAddress),
            instructions: [
              createAssociatedTokenAccountIdempotentInstruction({
                payer: new PublicKey(walletAddress),
                associatedToken: new PublicKey(preview.userRaTokenAccount),
                owner: new PublicKey(walletAddress),
                mint: new PublicKey(preview.raTarget.raMintAddress),
                tokenProgramId: preview.raTarget.raTokenProgramId,
                associatedTokenProgramId: SPL_ASSOCIATED_TOKEN_PROGRAM_ID,
              }),
            ],
          });
          preparedTransactions.push(ataCreation.transactionBase64);
          preparedMessageHashes.push(ataCreation.messageHash);
          preparedLastValidBlockHeight = ataCreation.lastValidBlockHeight;
          shouldAttachUserRaAtaInit = false;
        }

        const raydiumTransactions = await deps.buildRaydiumSwapTransactions({
          network: headerRuntime.network,
          walletAddress,
          inputAccount: candidate.tokenAccountAddress,
          outputAccount: preview.userRaTokenAccount,
          swapResponse: candidate.routeQuote,
        });
        for (const transactionBase64 of raydiumTransactions) {
          preparedTransactions.push(transactionBase64);
          preparedMessageHashes.push(
            deps.buildPreparedMessageHash(transactionBase64),
          );
        }

        return {
          id: randomUUID(),
          sequence: index,
          ticker: candidate.ticker,
          name: candidate.name,
          inputMintAddress: candidate.mintAddress,
          inputAmount: candidate.amount,
          inputAmountRaw: candidate.amountRaw,
          inputDecimals: candidate.decimals,
          quotedInputUsd: candidate.amountUsd,
          quotedRaOut: candidate.quotedRaOut,
          quotedFeeRa: 0,
          quotedFeeUsd: 0,
          feeBps: 0,
          slippageBps: candidate.slippageBps,
          routeProvider: 'RAYDIUM',
          routeQuote: candidate.routeQuote as unknown as Prisma.InputJsonValue,
          preparedTransactions,
          preparedMessageHashes,
          preparedTransactionsCount: preparedTransactions.length,
          preparedLastValidBlockHeight,
        };
      }),
    );

    const totalInputUsd = preparedLegs.reduce(
      (sum, leg) => sum + leg.quotedInputUsd,
      0,
    );
    const totalQuotedRaOut = preparedLegs.reduce(
      (sum, leg) => sum + leg.quotedRaOut,
      0,
    );
    const totalFeeRa = 0;
    const totalFeeUsd = 0;

    await this.prisma.walletConversionSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        walletAddress,
        network: headerRuntime.network,
        status: WalletConversionStatus.PREPARED,
        totalInputUsd,
        quotedRaOut: totalQuotedRaOut,
        totalFeeRa,
        totalFeeUsd,
        requesterIp: context.ipAddress,
        requesterCountry: resolvedCountry,
        userAgent: context.userAgent,
        expiresAt,
        legs: {
          create: preparedLegs.map((leg) => ({
            id: leg.id,
            sequence: leg.sequence,
            status: WalletConversionLegStatus.PREPARED,
            inputTicker: leg.ticker,
            inputTokenName: leg.name,
            inputMintAddress: leg.inputMintAddress,
            inputAmount: leg.inputAmount,
            inputAmountRaw: leg.inputAmountRaw,
            inputDecimals: leg.inputDecimals,
            quotedInputUsd: leg.quotedInputUsd,
            quotedRaOut: leg.quotedRaOut,
            quotedFeeRa: leg.quotedFeeRa,
            quotedFeeUsd: leg.quotedFeeUsd,
            feeBps: leg.feeBps,
            slippageBps: leg.slippageBps,
            routeProvider: leg.routeProvider,
            routeQuote: leg.routeQuote,
            preparedTransactions:
              leg.preparedTransactions as unknown as Prisma.InputJsonValue,
            preparedMessageHashes:
              leg.preparedMessageHashes as unknown as Prisma.InputJsonValue,
            preparedTransactionsCount: leg.preparedTransactionsCount,
            preparedLastValidBlockHeight: leg.preparedLastValidBlockHeight,
          })),
        },
      },
    });

    return {
      sessionId,
      walletAddress,
      network: headerRuntime.network,
      expiresAt: expiresAt.toISOString(),
      totalInputUsd,
      totalQuotedRaOut,
      totalFeeRa,
      totalFeeUsd,
      legs: preparedLegs.map(
        (leg): WalletConvertPreparationLegPayload => ({
          legId: leg.id,
          ticker: leg.ticker,
          name: leg.name,
          mintAddress: leg.inputMintAddress,
          amount: leg.inputAmount,
          amountUsd: leg.quotedInputUsd,
          quotedRaOut: leg.quotedRaOut,
          quotedFeeRa: leg.quotedFeeRa,
          quotedFeeUsd: leg.quotedFeeUsd,
          slippageBps: leg.slippageBps,
          transactionBase64List: leg.preparedTransactions,
          transactionCount: leg.preparedTransactionsCount,
          expiresAt: expiresAt.toISOString(),
        }),
      ),
    };
  }

  async executeWalletConvert(input: {
    dto: ExecuteWalletConvertDto;
    context: UsersRequestContext;
    authorization?: string;
    proxyKey?: string;
    deps: UsersConvertServiceDependencies;
  }): Promise<WalletConvertExecutionPayload> {
    const { dto, context, authorization, proxyKey, deps } = input;

    deps.validateProxyKey(proxyKey);

    const walletAddress = normalizeWalletAddress(dto.walletAddress);
    const headerRuntime = await deps.assertWalletConnectionsEnabled();
    deps.assertWalletAccessToken(authorization, walletAddress);

    await deps.consumeRateLimit(
      `users:convert:execute:${context.requesterKey}:${walletAddress}`,
      18,
      60_000,
    );
    await this.usersWalletStateService.assertWalletNotBlocked(walletAddress);

    const session = await this.prisma.walletConversionSession.findUnique({
      where: { id: dto.sessionId },
      include: {
        user: true,
        legs: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!session || session.walletAddress !== walletAddress) {
      throw new NotFoundException('Conversion session not found.');
    }

    if (session.network !== headerRuntime.network) {
      throw new BadRequestException(
        'Conversion session network changed. Prepare conversion again.',
      );
    }

    if (session.status !== WalletConversionStatus.PREPARED) {
      const completedAt = session.completedAt ?? session.updatedAt;
      return {
        sessionId: session.id,
        walletAddress: session.walletAddress,
        network: session.network,
        status:
          session.status === WalletConversionStatus.COMPLETED
            ? 'COMPLETED'
            : session.status === WalletConversionStatus.PARTIAL_SUCCESS
              ? 'PARTIAL_SUCCESS'
              : 'FAILED',
        completedLegs: session.legs.filter(
          (leg) => leg.status === WalletConversionLegStatus.COMPLETED,
        ).length,
        failedLegs: session.legs.filter(
          (leg) => leg.status !== WalletConversionLegStatus.COMPLETED,
        ).length,
        actualRaOut: toNumber(session.actualRaOut),
        totalFeeRa: toNumber(session.totalFeeRa),
        totalFeeUsd: toNumber(session.totalFeeUsd),
        legs: session.legs.map(
          (leg): WalletConvertExecutionLegPayload => ({
            legId: leg.id,
            ticker: leg.inputTicker,
            status:
              leg.status === WalletConversionLegStatus.COMPLETED
                ? 'COMPLETED'
                : 'FAILED',
            signature: leg.signature,
            signatures: leg.signature ? [leg.signature] : [],
            actualRaOut: toNumber(leg.actualRaOut),
            feeRa: toNumber(leg.actualFeeRa),
            errorMessage: leg.errorMessage,
          }),
        ),
        completedAt: completedAt.toISOString(),
      };
    }

    const now = new Date();
    if (session.expiresAt <= now) {
      await this.prisma.$transaction(async (tx) => {
        await tx.walletConversionSession.update({
          where: { id: session.id },
          data: {
            status: WalletConversionStatus.EXPIRED,
            completedAt: now,
          },
        });
        await tx.walletConversionLeg.updateMany({
          where: {
            sessionId: session.id,
            status: WalletConversionLegStatus.PREPARED,
          },
          data: {
            status: WalletConversionLegStatus.EXPIRED,
            errorMessage: 'Conversion session expired before execution.',
          },
        });
      });

      throw new BadRequestException(
        'Conversion session expired. Prepare again.',
      );
    }

    const submittedLegMap = new Map<string, { signedTransactions: string[] }>();
    for (const leg of dto.legs) {
      if (submittedLegMap.has(leg.legId)) {
        throw new BadRequestException(
          'Duplicate convert leg submission detected.',
        );
      }
      submittedLegMap.set(leg.legId, {
        signedTransactions: leg.signedTransactions,
      });
    }

    const preparedLegIds = new Set(
      session.legs
        .filter((leg) => leg.status === WalletConversionLegStatus.PREPARED)
        .map((leg) => leg.id),
    );
    for (const legId of submittedLegMap.keys()) {
      if (!preparedLegIds.has(legId)) {
        throw new BadRequestException(
          'Convert leg does not belong to active session.',
        );
      }
    }

    const raSettings = await deps.loadRaRuntimeSettings();
    const connection = deps.getSolanaConnection(headerRuntime.network);
    const raTarget = await deps.resolveRaMintTarget(
      headerRuntime.network,
      raSettings,
    );
    let raPriceUsd = 0;
    try {
      raPriceUsd = await deps.resolveRaPriceUsd(
        raSettings,
        headerRuntime.network,
      );
    } catch {
      raPriceUsd = 0;
    }
    const userRaTokenAccount = getAssociatedTokenAddressSync({
      mint: new PublicKey(raTarget.raMintAddress),
      owner: new PublicKey(walletAddress),
      allowOwnerOffCurve: false,
      tokenProgramId: raTarget.raTokenProgramId,
      associatedTokenProgramId: SPL_ASSOCIATED_TOKEN_PROGRAM_ID,
    }).toBase58();

    const legResults: WalletConvertExecutionLegPayload[] = [];
    let actualRaOut = 0;
    let totalFeeRa = 0;
    let completedLegs = 0;
    let hasExecutionWarnings = false;

    for (const leg of session.legs) {
      const submittedLeg = submittedLegMap.get(leg.id);
      if (!submittedLeg) {
        await this.prisma.walletConversionLeg.update({
          where: { id: leg.id },
          data: {
            status: WalletConversionLegStatus.FAILED,
            errorMessage: 'Wallet did not sign this conversion leg.',
          },
        });
        legResults.push({
          legId: leg.id,
          ticker: leg.inputTicker,
          status: 'FAILED',
          signature: null,
          signatures: [],
          actualRaOut: 0,
          feeRa: 0,
          errorMessage: 'Wallet did not sign this conversion leg.',
        });
        continue;
      }

      const preparedMessageHashes = Array.isArray(leg.preparedMessageHashes)
        ? leg.preparedMessageHashes.filter(
            (value): value is string =>
              typeof value === 'string' && value.length > 0,
          )
        : [];

      if (
        preparedMessageHashes.length === 0 ||
        preparedMessageHashes.length !==
          submittedLeg.signedTransactions.length ||
        leg.preparedTransactionsCount !== submittedLeg.signedTransactions.length
      ) {
        throw new BadRequestException(
          `${leg.inputTicker} signed transaction count does not match prepared conversion leg.`,
        );
      }

      const preUserRaBalance = await deps.getTokenAccountUiBalance(
        connection,
        userRaTokenAccount,
      );
      const sentSignatures: string[] = [];

      try {
        for (const [
          index,
          signedTransactionBase64,
        ] of submittedLeg.signedTransactions.entries()) {
          const signedTransaction = VersionedTransaction.deserialize(
            Buffer.from(signedTransactionBase64, 'base64'),
          );
          const signedMessageHash = createHash('sha256')
            .update(signedTransaction.message.serialize())
            .digest('hex');

          if (signedMessageHash !== preparedMessageHashes[index]) {
            throw new BadRequestException(
              `${leg.inputTicker} signed transaction payload does not match prepared quote.`,
            );
          }

          const walletSignature =
            deps.bigintToBase58Signature(signedTransaction.signatures[0]) ??
            null;
          if (!walletSignature) {
            throw new BadRequestException(
              `${leg.inputTicker} transaction is missing wallet signature.`,
            );
          }

          const rawTransaction = Buffer.from(signedTransaction.serialize());
          const sentSignature = await connection.sendRawTransaction(
            rawTransaction,
            {
              skipPreflight: false,
              maxRetries: 3,
            },
          );
          sentSignatures.push(sentSignature);

          const confirmation = await connection.confirmTransaction(
            sentSignature,
            'confirmed',
          );
          if (confirmation.value.err) {
            throw new Error(
              typeof confirmation.value.err === 'string'
                ? confirmation.value.err
                : JSON.stringify(confirmation.value.err),
            );
          }
        }

        const postUserRaBalance = await deps.getTokenAccountUiBalance(
          connection,
          userRaTokenAccount,
        );
        const actualLegRaOut = Math.max(
          0,
          postUserRaBalance - preUserRaBalance,
        );
        const actualLegFeeRa = 0;

        await this.prisma.$transaction(async (tx) => {
          const activity = await deps.createWalletActivityRecord(tx, {
            userId: session.userId,
            walletAddress,
            network: headerRuntime.network,
            type: WalletActivityType.CONVERT,
            status: WalletActivityStatus.COMPLETED,
            tokenTicker: leg.inputTicker,
            tokenName: leg.inputTokenName,
            amount: toNumber(leg.inputAmount),
            amountUsd: toNumber(leg.quotedInputUsd),
            referenceId: session.id,
            metadata: {
              sessionId: session.id,
              legId: leg.id,
              signatures: sentSignatures,
              inputMintAddress: leg.inputMintAddress,
              routeProvider: leg.routeProvider,
              quotedRaOut: leg.quotedRaOut,
              actualRaOut: actualLegRaOut,
              raPriceUsd,
              oracleProvider: raSettings.oraclePrimary,
              raModelVersion: 2,
            } as Prisma.InputJsonValue,
            createdAt: new Date(),
          });

          await tx.walletConversionLeg.update({
            where: { id: leg.id },
            data: {
              status: WalletConversionLegStatus.COMPLETED,
              signature: sentSignatures[0] ?? null,
              actualRaOut: actualLegRaOut,
              actualFeeRa: actualLegFeeRa,
              referenceActivityId: activity.id,
              errorMessage: null,
            },
          });
        });

        actualRaOut += actualLegRaOut;
        totalFeeRa += actualLegFeeRa;
        completedLegs += 1;
        legResults.push({
          legId: leg.id,
          ticker: leg.inputTicker,
          status: 'COMPLETED',
          signature: sentSignatures[0] ?? null,
          signatures: sentSignatures,
          actualRaOut: actualLegRaOut,
          feeRa: actualLegFeeRa,
          errorMessage: null,
        });
      } catch (error) {
        const postUserRaBalance = await deps.getTokenAccountUiBalance(
          connection,
          userRaTokenAccount,
        );
        const actualLegRaOut = Math.max(
          0,
          postUserRaBalance - preUserRaBalance,
        );
        const actualLegFeeRa = 0;
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Conversion leg failed to execute.';
        const normalizedErrorMessage = errorMessage.toLowerCase();
        const userFacingErrorMessage = normalizedErrorMessage.includes(
          'blockhash not found',
        )
          ? 'Prepared transactions expired before submission. Reopen Convert Small Balances and sign again.'
          : normalizedErrorMessage.includes('not enough sol')
            ? 'Not enough SOL is available to cover conversion network fees.'
            : errorMessage;
        const legCompleted = actualLegRaOut > 0;
        const completionWarning = legCompleted
          ? 'Conversion completed on-chain, but a post-trade confirmation step did not fully settle.'
          : userFacingErrorMessage;

        let activityId: string | null = null;
        if (
          sentSignatures.length > 0 ||
          actualLegRaOut > 0 ||
          actualLegFeeRa > 0
        ) {
          await this.prisma.$transaction(async (tx) => {
            const activity = await deps.createWalletActivityRecord(tx, {
              userId: session.userId,
              walletAddress,
              network: headerRuntime.network,
              type: WalletActivityType.CONVERT,
              status: legCompleted
                ? WalletActivityStatus.COMPLETED
                : WalletActivityStatus.FAILED,
              tokenTicker: leg.inputTicker,
              tokenName: leg.inputTokenName,
              amount: toNumber(leg.inputAmount),
              amountUsd: toNumber(leg.quotedInputUsd),
              referenceId: session.id,
              metadata: {
                sessionId: session.id,
                legId: leg.id,
                signatures: sentSignatures,
                inputMintAddress: leg.inputMintAddress,
                routeProvider: leg.routeProvider,
                quotedRaOut: leg.quotedRaOut,
                actualRaOut: actualLegRaOut,
                raPriceUsd,
                oracleProvider: raSettings.oraclePrimary,
                raModelVersion: 2,
                errorMessage: legCompleted
                  ? completionWarning
                  : userFacingErrorMessage,
              } as Prisma.InputJsonValue,
              createdAt: new Date(),
            });
            activityId = activity.id;
          });
        }

        await this.prisma.walletConversionLeg.update({
          where: { id: leg.id },
          data: {
            status: legCompleted
              ? WalletConversionLegStatus.COMPLETED
              : WalletConversionLegStatus.FAILED,
            signature: sentSignatures[0] ?? null,
            actualRaOut: actualLegRaOut,
            actualFeeRa: actualLegFeeRa,
            referenceActivityId: activityId,
            errorMessage: legCompleted
              ? completionWarning
              : userFacingErrorMessage,
          },
        });

        actualRaOut += actualLegRaOut;
        totalFeeRa += actualLegFeeRa;
        if (legCompleted) {
          completedLegs += 1;
          hasExecutionWarnings = true;
        }
        legResults.push({
          legId: leg.id,
          ticker: leg.inputTicker,
          status: legCompleted ? 'COMPLETED' : 'FAILED',
          signature: sentSignatures[0] ?? null,
          signatures: sentSignatures,
          actualRaOut: actualLegRaOut,
          feeRa: actualLegFeeRa,
          errorMessage: legCompleted
            ? completionWarning
            : userFacingErrorMessage,
        });
      }
    }

    const failedLegs = legResults.filter(
      (leg) => leg.status === 'FAILED',
    ).length;
    const hasPartialOnchainEffects = actualRaOut > 0;
    const status =
      completedLegs > 0 && failedLegs === 0 && !hasExecutionWarnings
        ? WalletConversionStatus.COMPLETED
        : completedLegs > 0 || hasPartialOnchainEffects
          ? WalletConversionStatus.PARTIAL_SUCCESS
          : WalletConversionStatus.FAILED;
    const completedAt = new Date();
    const totalFeeUsd = 0;

    await this.prisma.walletConversionSession.update({
      where: { id: session.id },
      data: {
        status,
        actualRaOut,
        totalFeeRa,
        totalFeeUsd,
        completedAt,
      },
    });

    await deps.syncUserTrackedOnchainBalances(
      session.userId,
      walletAddress,
      headerRuntime.network,
      raSettings,
    );
    const resolvedCountry = await deps.resolveCountryCode(context);
    await this.prisma.walletUser.update({
      where: { id: session.userId },
      data: {
        lastSeenAt: completedAt,
        lastSeenIp: context.ipAddress ?? session.user.lastSeenIp,
        lastSeenCountry: resolvedCountry ?? session.user.lastSeenCountry,
      },
    });

    return {
      sessionId: session.id,
      walletAddress,
      network: headerRuntime.network,
      status:
        status === WalletConversionStatus.COMPLETED
          ? 'COMPLETED'
          : status === WalletConversionStatus.PARTIAL_SUCCESS
            ? 'PARTIAL_SUCCESS'
            : 'FAILED',
      completedLegs,
      failedLegs,
      actualRaOut,
      totalFeeRa,
      totalFeeUsd,
      legs: legResults,
      completedAt: completedAt.toISOString(),
    };
  }
}

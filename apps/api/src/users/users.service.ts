import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  Prisma,
  StakePositionStatus,
  WalletActivityStatus,
  WalletActivityType,
  WalletUserRole,
} from '@prisma/client';
import { createHash } from 'crypto';
import {
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { validateProxySharedKey } from '../common/proxy-key';
import { getSharedRedisJsonCache } from '../common/redis-cache';
import { getSharedRateLimitStore } from '../common/rate-limit-store';
import { readOptionalEnv } from '../common/env';
import { encodeBase58 } from '../common/base58';
import {
  DEXSCREENER_API_BASE_URL,
  RAYDIUM_TRADE_API_BASE_URL,
} from '../common/external.constants';
import { toNumber, toNullableNumber } from '../common/numeric';
import { getAssociatedTokenAddressSync } from '../common/solana-token';
import {
  SPL_ASSOCIATED_TOKEN_PROGRAM_ID,
  SPL_TOKEN_2022_PROGRAM_ID,
  SPL_TOKEN_PROGRAM_ID,
  WRAPPED_SOL_MINT_ADDRESS,
} from '../common/solana.constants';
import { MarketService } from '../market/market.service';
import { VerifyWalletDto } from '../auth/dto/verify-wallet.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ClaimUserStakePositionDto } from './dto/claim-user-stake-position.dto';
import { CreateWalletActivityDto } from './dto/create-wallet-activity.dto';
import { CreateUserStakePositionDto } from './dto/create-user-stake-position.dto';
import { ExecuteWalletClaimDto } from './dto/execute-wallet-claim.dto';
import { ExecuteWalletConvertDto } from './dto/execute-wallet-convert.dto';
import { ExecuteWalletStakeDto } from './dto/execute-wallet-stake.dto';
import { EndUserSessionDto } from './dto/end-user-session.dto';
import { HeartbeatUserSessionDto } from './dto/heartbeat-user-session.dto';
import { PrepareWalletStakeDto } from './dto/prepare-wallet-stake.dto';
import { PrepareWalletClaimDto } from './dto/prepare-wallet-claim.dto';
import { PrepareWalletConvertDto } from './dto/prepare-wallet-convert.dto';
import { PreviewWalletStakeDto } from './dto/preview-wallet-stake.dto';
import { PreviewWalletConvertDto } from './dto/preview-wallet-convert.dto';
import { StartUserSessionDto } from './dto/start-user-session.dto';
import { UpdateWalletUserBlockDto } from './dto/update-wallet-user-block.dto';
import { UsersOnlineStateService } from './users-online-state.service';
import { UsersWalletAuthService } from './users-wallet-auth.service';
import { UsersConvertService } from './users-convert.service';
import { UsersStakingService } from './users-staking.service';
import { UsersWalletStateService } from './users-wallet-state.service';
import {
  CONNECT_DISABLED_MESSAGE,
  DEFAULT_HEADER_NETWORK,
  DEFAULT_RA_LOGO_URL,
  DEFAULT_RA_TOKEN_NAME,
  DEFAULT_RA_TOKEN_SYMBOL,
  DEFAULT_RA_CLAIM_FEE_BPS,
  DEFAULT_RA_CONVERT_ENABLED,
  DEFAULT_RA_CONVERT_EXECUTION_MODE,
  DEFAULT_RA_CONVERT_MAX_TOKENS_PER_SESSION,
  DEFAULT_RA_CONVERT_MAX_USD,
  DEFAULT_RA_CONVERT_MIN_USD,
  DEFAULT_RA_CONVERT_POOL_ID_DEVNET,
  DEFAULT_RA_CONVERT_POOL_ID_MAINNET,
  DEFAULT_RA_CONVERT_PROVIDER,
  DEFAULT_RA_CONVERT_QUOTE_MINT_DEVNET,
  DEFAULT_RA_CONVERT_QUOTE_MINT_MAINNET,
  DEFAULT_RA_CONVERT_ROUTE_POLICY,
  DEFAULT_RA_CONVERT_SLIPPAGE_BPS,
  DEFAULT_RA_MINT_DEVNET,
  DEFAULT_RA_MINT_MAINNET,
  DEFAULT_RA_ORACLE_PRIMARY,
  DEFAULT_RA_ORACLE_SECONDARY,
  DEFAULT_RA_PRICE_USD,
  DEFAULT_RA_STAKE_FEE_BPS,
  DEFAULT_RA_STAKE_MAX_USD,
  DEFAULT_RA_STAKE_MIN_USD,
  DEFAULT_RA_TREASURY_DEVNET,
  DEFAULT_RA_TREASURY_MAINNET,
  EXPLORER_ACTIVITY_STATUSES,
  EXPLORER_FEED_DEFAULT_LIMIT,
  EXPLORER_FEED_MAX_LIMIT,
  GEO_CACHE_TTL_MS,
  GEO_LOOKUP_TIMEOUT_MS,
  GEO_NEGATIVE_CACHE_TTL_MS,
  HEADER_SETTINGS_CACHE_TTL_MS,
  HEADER_SETTINGS_ID,
  MANUAL_EXPLORER_ACTIVITY_TYPES,
  RA_ORACLE_RAYDIUM_API_BASE,
  RA_SETTINGS_CACHE_TTL_MS,
  RA_RUNTIME_SETTINGS_ID,
  STAKE_PERIOD_DAYS,
  TOKEN_LOGO_BY_TICKER,
  USER_AUTH_TOKEN_TYPE,
  WALLET_AUTH_NONCE_PER_MINUTE,
  WALLET_AUTH_VERIFY_PER_MINUTE,
} from './users.constants';
import {
  createExplorerActivityHash,
  formatNumber,
  normalizeIpAddress,
  normalizeWalletAddress,
} from './users.utils';
import {
  toExplorerActivityPayload,
  toProfileTransactionPayload,
  toStakePositionPayload,
  toWalletSessionPayload,
  toWalletUserSummary,
} from './users.presenter';
import {
  AdminPortfolioEligibilityPayload,
  AdminWalletUserDetailPayload,
  AdminWalletUsersListPayload,
  DeleteWalletUserPayload,
  EndUserSessionPayload,
  HeartbeatUserSessionPayload,
  StartUserSessionPayload,
  UsersRequestContext,
  WalletClaimExecutionPayload,
  WalletClaimPreparationPayload,
  WalletAccessPayload,
  WalletAuthNoncePayload,
  WalletAuthVerifyPayload,
  WalletConvertExecutionPayload,
  WalletConvertPreviewPayload,
  WalletConvertPreparationPayload,
  WalletStakeExecutionPayload,
  WalletStakePreparationPayload,
  WalletStakeQuotePayload,
  WalletExplorerActivityPayload,
  WalletExplorerFeedPayload,
  WalletHeaderRuntimeSettings,
  WalletProfileActiveStakingPayload,
  WalletProfilePortfolioTokenPayload,
  WalletStakePositionPayload,
  WalletUserProfilePayload,
  WalletUserSummary,
  WalletUsersMetricsPayload,
  UsersRaRuntimeSettings,
} from './users.types';

type RaOracleProvider = 'DEXSCREENER' | 'RAYDIUM';
type RaConvertProvider = 'RAYDIUM' | 'JUPITER';
type RaConvertExecutionMode = 'AUTO' | 'SINGLE_TX_ONLY' | 'ALLOW_MULTI_TX';
type RaConvertRoutePolicy = 'TOKEN_TO_SOL_TO_RA';

type RaRuntimeSettings = UsersRaRuntimeSettings;
type RaRuntimeSettingsRecord = {
  logoUrl?: string | null;
  tokenSymbol?: string | null;
  tokenName?: string | null;
  mintDevnet?: string | null;
  mintMainnet?: string | null;
  treasuryDevnet?: string | null;
  treasuryMainnet?: string | null;
  oraclePrimary?: string | null;
  oracleSecondary?: string | null;
  stakeFeeBps?: number | null;
  claimFeeBps?: number | null;
  stakeMinUsd?: Prisma.Decimal | number | null;
  stakeMaxUsd?: Prisma.Decimal | number | null;
  convertMinUsd?: Prisma.Decimal | number | null;
  convertMaxUsd?: Prisma.Decimal | number | null;
  convertEnabled?: boolean | null;
  convertProvider?: string | null;
  convertExecutionMode?: string | null;
  convertRoutePolicy?: string | null;
  convertSlippageBps?: number | null;
  convertMaxTokensPerSession?: number | null;
  convertPoolIdDevnet?: string | null;
  convertPoolIdMainnet?: string | null;
  convertQuoteMintDevnet?: string | null;
  convertQuoteMintMainnet?: string | null;
};

interface DexTokenSearchResponse {
  pairs?: Array<{
    baseToken?: {
      address?: string;
    };
    priceUsd?: string | number;
  }>;
}

interface RaydiumMintPriceResponse {
  success?: boolean;
  data?: Record<string, string | number | null | undefined>;
}

interface RaydiumRoutePlanStep {
  poolId?: string;
  inputMint?: string;
  outputMint?: string;
}

interface RaydiumComputeSwapResponse {
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
    routePlan?: RaydiumRoutePlanStep[];
  };
}

interface RaydiumPriorityFeeResponse {
  success?: boolean;
  data?: {
    default?: {
      vh?: number;
      h?: number;
      m?: number;
    };
  };
}

interface RaydiumBuildTransactionsResponse {
  id?: string;
  success?: boolean;
  version?: string;
  msg?: string;
  data?: Array<{
    transaction?: string;
  }>;
}

interface OnChainTokenBalanceDetail {
  mintAddress: string;
  amountUi: number;
  amountRaw: bigint;
  decimals: number;
  tokenAccountAddress: string | null;
}

interface ParsedTokenAmountInfo {
  amount?: string;
  decimals?: number;
}

interface ParsedTokenAccountInfo {
  mint?: string;
  tokenAmount?: ParsedTokenAmountInfo;
}

interface WalletConvertCandidate {
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
  routeQuote: RaydiumComputeSwapResponse;
  routeTransactionCount: number;
}

const ONCHAIN_BALANCE_SYNC_MIN_INTERVAL_MS = 25_000;
const NATIVE_SOL_TICKER = 'SOL';
const CONVERT_ROUTE_CACHE_TTL_MS = 15_000;
const CONVERT_PREPARED_CACHE_TTL_MS = 60_000;
const CONVERT_NETWORK_FEE_SOL_PER_TX_ESTIMATE = 0.0001;
const CONVERT_NETWORK_FEE_SOL_BUFFER = 0.00005;

@Injectable()
export class UsersService {
  private readonly maxQueryLimit = 100;
  private readonly maxQueryOffset = 10_000;
  private headerRuntimeCache: {
    value: WalletHeaderRuntimeSettings;
    expiresAt: number;
  } | null = null;
  private headerRuntimeInFlight: Promise<WalletHeaderRuntimeSettings> | null =
    null;
  private raRuntimeCache: {
    value: RaRuntimeSettings;
    expiresAt: number;
  } | null = null;
  private raRuntimeInFlight: Promise<RaRuntimeSettings> | null = null;
  private readonly rateLimitStore = getSharedRateLimitStore();
  private readonly redisJsonCache = getSharedRedisJsonCache();
  private readonly geoCountryCache = new Map<
    string,
    { countryCode: string | null; expiresAt: number }
  >();
  private readonly geoLookupInFlight = new Map<
    string,
    Promise<string | null>
  >();
  private readonly solanaConnectionByNetwork = new Map<
    'devnet' | 'mainnet',
    Connection
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly marketService: MarketService,
    private readonly usersOnlineStateService: UsersOnlineStateService,
    private readonly usersWalletAuthService: UsersWalletAuthService,
    private readonly usersWalletStateService: UsersWalletStateService,
    private readonly usersStakingService: UsersStakingService,
    private readonly usersConvertService: UsersConvertService,
  ) {}

  private normalizeHeaderNetwork(
    headerNetwork: string | null | undefined,
  ): 'devnet' | 'mainnet' {
    return headerNetwork === 'mainnet' ? 'mainnet' : DEFAULT_HEADER_NETWORK;
  }

  private async loadWalletHeaderRuntimeSettings(
    force = false,
  ): Promise<WalletHeaderRuntimeSettings> {
    const now = Date.now();
    if (
      !force &&
      this.headerRuntimeCache &&
      this.headerRuntimeCache.expiresAt > now
    ) {
      return this.headerRuntimeCache.value;
    }

    if (this.headerRuntimeInFlight) {
      return this.headerRuntimeInFlight;
    }

    this.headerRuntimeInFlight = this.prisma.headerSetting
      .findUnique({
        where: { id: HEADER_SETTINGS_ID },
        select: {
          connectEnabled: true,
          network: true,
        },
      })
      .then((settings) => {
        const value: WalletHeaderRuntimeSettings = {
          connectEnabled: settings?.connectEnabled ?? true,
          network: this.normalizeHeaderNetwork(settings?.network),
        };

        this.headerRuntimeCache = {
          value,
          expiresAt: Date.now() + HEADER_SETTINGS_CACHE_TTL_MS,
        };

        return value;
      })
      .finally(() => {
        this.headerRuntimeInFlight = null;
      });

    return this.headerRuntimeInFlight;
  }

  private async assertWalletConnectionsEnabled(): Promise<WalletHeaderRuntimeSettings> {
    const settings = await this.loadWalletHeaderRuntimeSettings();
    if (!settings.connectEnabled) {
      throw new ForbiddenException(CONNECT_DISABLED_MESSAGE);
    }
    return settings;
  }

  private sanitizeRaOracleProvider(
    value: string | null | undefined,
    fallback: RaOracleProvider,
  ): RaOracleProvider {
    if (!value) return fallback;
    const normalized = value.trim().toUpperCase();
    if (normalized === 'DEXSCREENER' || normalized === 'RAYDIUM') {
      return normalized;
    }
    return fallback;
  }

  private sanitizeRaConvertProvider(
    value: string | null | undefined,
    fallback: RaConvertProvider,
  ): RaConvertProvider {
    if (!value) return fallback;
    const normalized = value.trim().toUpperCase();
    if (normalized === 'RAYDIUM' || normalized === 'JUPITER') {
      return normalized;
    }
    return fallback;
  }

  private sanitizeRaConvertExecutionMode(
    value: string | null | undefined,
    fallback: RaConvertExecutionMode,
  ): RaConvertExecutionMode {
    if (!value) return fallback;
    const normalized = value.trim().toUpperCase();
    if (
      normalized === 'AUTO' ||
      normalized === 'SINGLE_TX_ONLY' ||
      normalized === 'ALLOW_MULTI_TX'
    ) {
      return normalized;
    }
    return fallback;
  }

  private sanitizeRaConvertRoutePolicy(
    value: string | null | undefined,
    fallback: RaConvertRoutePolicy,
  ): RaConvertRoutePolicy {
    if (!value) return fallback;
    const normalized = value.trim().toUpperCase();
    if (normalized === 'TOKEN_TO_SOL_TO_RA') {
      return normalized;
    }
    return fallback;
  }

  private sanitizeRaAddress(
    value: string | null | undefined,
    fallback: string,
  ): string {
    const candidate = (value ?? fallback).trim();
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(candidate)) {
      throw new BadRequestException('RA runtime settings are invalid.');
    }
    return candidate;
  }

  private sanitizeRaLogoUrl(value: string | null | undefined): string {
    const trimmed = value?.trim();
    if (!trimmed) {
      return DEFAULT_RA_LOGO_URL;
    }

    if (!trimmed.startsWith('/')) {
      throw new BadRequestException('RA runtime settings are invalid.');
    }

    return trimmed;
  }

  private sanitizeRaTokenSymbol(value: string | null | undefined): string {
    const candidate = value?.trim().toUpperCase() || DEFAULT_RA_TOKEN_SYMBOL;
    if (!/^[A-Z0-9]{1,12}$/.test(candidate)) {
      throw new BadRequestException('RA runtime settings are invalid.');
    }
    return candidate;
  }

  private sanitizeRaTokenName(value: string | null | undefined): string {
    const candidate = value?.trim() || DEFAULT_RA_TOKEN_NAME;
    if (candidate.length < 2 || candidate.length > 40) {
      throw new BadRequestException('RA runtime settings are invalid.');
    }
    return candidate;
  }

  private isRaRuntimeTicker(
    ticker: string | null | undefined,
    settings: RaRuntimeSettings,
  ): boolean {
    const normalized = ticker?.trim().toUpperCase();
    if (!normalized) return false;
    return (
      normalized === DEFAULT_RA_TOKEN_SYMBOL ||
      normalized === settings.tokenSymbol
    );
  }

  private sanitizeFeeBps(
    value: number | null | undefined,
    fallback: number,
  ): number {
    const candidate = Number.isFinite(value)
      ? Math.trunc(value as number)
      : fallback;
    if (candidate < 0 || candidate > 10_000) {
      throw new BadRequestException('RA fee configuration is invalid.');
    }
    return candidate;
  }

  private sanitizeUsdRule(
    value: number | null | undefined,
    fallback: number,
  ): number {
    const candidate = Number.isFinite(value) ? (value as number) : fallback;
    if (candidate < 0) {
      throw new BadRequestException(
        'RA USD threshold configuration is invalid.',
      );
    }
    return candidate;
  }

  private async loadRaRuntimeSettings(
    force = false,
  ): Promise<RaRuntimeSettings> {
    const now = Date.now();
    if (!force && this.raRuntimeCache && this.raRuntimeCache.expiresAt > now) {
      return this.raRuntimeCache.value;
    }

    if (this.raRuntimeInFlight) {
      return this.raRuntimeInFlight;
    }

    this.raRuntimeInFlight = (
      this.prisma.raRuntimeSetting.findUnique({
        where: { id: RA_RUNTIME_SETTINGS_ID },
      }) as Promise<RaRuntimeSettingsRecord | null>
    )
      .then((settings) => {
        const stakeMinUsd = this.sanitizeUsdRule(
          toNullableNumber(settings?.stakeMinUsd),
          DEFAULT_RA_STAKE_MIN_USD,
        );
        const stakeMaxUsd = this.sanitizeUsdRule(
          toNullableNumber(settings?.stakeMaxUsd),
          DEFAULT_RA_STAKE_MAX_USD,
        );
        const convertMinUsd = this.sanitizeUsdRule(
          toNullableNumber(settings?.convertMinUsd),
          DEFAULT_RA_CONVERT_MIN_USD,
        );
        const convertMaxUsd = this.sanitizeUsdRule(
          toNullableNumber(settings?.convertMaxUsd),
          DEFAULT_RA_CONVERT_MAX_USD,
        );

        const value: RaRuntimeSettings = {
          logoUrl: this.sanitizeRaLogoUrl(settings?.logoUrl),
          tokenSymbol: this.sanitizeRaTokenSymbol(settings?.tokenSymbol),
          tokenName: this.sanitizeRaTokenName(settings?.tokenName),
          mintDevnet: this.sanitizeRaAddress(
            settings?.mintDevnet,
            DEFAULT_RA_MINT_DEVNET,
          ),
          mintMainnet: this.sanitizeRaAddress(
            settings?.mintMainnet,
            DEFAULT_RA_MINT_MAINNET,
          ),
          treasuryDevnet: this.sanitizeRaAddress(
            settings?.treasuryDevnet,
            DEFAULT_RA_TREASURY_DEVNET,
          ),
          treasuryMainnet: this.sanitizeRaAddress(
            settings?.treasuryMainnet,
            DEFAULT_RA_TREASURY_MAINNET,
          ),
          oraclePrimary: this.sanitizeRaOracleProvider(
            settings?.oraclePrimary,
            DEFAULT_RA_ORACLE_PRIMARY as RaOracleProvider,
          ),
          oracleSecondary: settings?.oracleSecondary
            ? this.sanitizeRaOracleProvider(
                settings.oracleSecondary,
                DEFAULT_RA_ORACLE_SECONDARY as RaOracleProvider,
              )
            : this.sanitizeRaOracleProvider(
                DEFAULT_RA_ORACLE_SECONDARY,
                DEFAULT_RA_ORACLE_SECONDARY as RaOracleProvider,
              ),
          stakeFeeBps: this.sanitizeFeeBps(
            settings?.stakeFeeBps,
            DEFAULT_RA_STAKE_FEE_BPS,
          ),
          claimFeeBps: this.sanitizeFeeBps(
            settings?.claimFeeBps,
            DEFAULT_RA_CLAIM_FEE_BPS,
          ),
          stakeMinUsd,
          stakeMaxUsd: Math.max(stakeMinUsd, stakeMaxUsd),
          convertMinUsd,
          convertMaxUsd: Math.max(convertMinUsd, convertMaxUsd),
          convertEnabled:
            settings?.convertEnabled ?? DEFAULT_RA_CONVERT_ENABLED,
          convertProvider: this.sanitizeRaConvertProvider(
            settings?.convertProvider,
            DEFAULT_RA_CONVERT_PROVIDER as RaConvertProvider,
          ),
          convertExecutionMode: this.sanitizeRaConvertExecutionMode(
            settings?.convertExecutionMode,
            DEFAULT_RA_CONVERT_EXECUTION_MODE as RaConvertExecutionMode,
          ),
          convertRoutePolicy: this.sanitizeRaConvertRoutePolicy(
            settings?.convertRoutePolicy,
            DEFAULT_RA_CONVERT_ROUTE_POLICY as RaConvertRoutePolicy,
          ),
          convertSlippageBps: this.sanitizeFeeBps(
            settings?.convertSlippageBps,
            DEFAULT_RA_CONVERT_SLIPPAGE_BPS,
          ),
          convertMaxTokensPerSession: Math.max(
            1,
            Math.min(
              5,
              Math.trunc(
                settings?.convertMaxTokensPerSession ??
                  DEFAULT_RA_CONVERT_MAX_TOKENS_PER_SESSION,
              ),
            ),
          ),
          convertPoolIdDevnet: this.sanitizeRaAddress(
            settings?.convertPoolIdDevnet,
            DEFAULT_RA_CONVERT_POOL_ID_DEVNET,
          ),
          convertPoolIdMainnet: this.sanitizeRaAddress(
            settings?.convertPoolIdMainnet,
            DEFAULT_RA_CONVERT_POOL_ID_MAINNET,
          ),
          convertQuoteMintDevnet: this.sanitizeRaAddress(
            settings?.convertQuoteMintDevnet,
            DEFAULT_RA_CONVERT_QUOTE_MINT_DEVNET,
          ),
          convertQuoteMintMainnet: this.sanitizeRaAddress(
            settings?.convertQuoteMintMainnet,
            DEFAULT_RA_CONVERT_QUOTE_MINT_MAINNET,
          ),
        };

        this.raRuntimeCache = {
          value,
          expiresAt: Date.now() + RA_SETTINGS_CACHE_TTL_MS,
        };

        return value;
      })
      .finally(() => {
        this.raRuntimeInFlight = null;
      });

    return this.raRuntimeInFlight;
  }

  private resolveRaMintForNetwork(
    network: 'devnet' | 'mainnet',
    settings: RaRuntimeSettings,
  ): string {
    return network === 'mainnet' ? settings.mintMainnet : settings.mintDevnet;
  }

  private resolveSolanaRpcUrl(network: 'devnet' | 'mainnet'): string {
    const envName =
      network === 'mainnet'
        ? 'SOLANA_MAINNET_RPC_URL'
        : 'SOLANA_DEVNET_RPC_URL';
    const value = readOptionalEnv(envName);
    if (!value) {
      throw new HttpException(
        `${envName} is not configured on API runtime.`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return value;
  }

  private getSolanaConnection(network: 'devnet' | 'mainnet'): Connection {
    const existing = this.solanaConnectionByNetwork.get(network);
    if (existing) return existing;

    const endpoint = this.resolveSolanaRpcUrl(network);
    const connection = new Connection(endpoint, 'confirmed');
    this.solanaConnectionByNetwork.set(network, connection);
    return connection;
  }

  private normalizeMintAddress(
    value: string | null | undefined,
  ): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return new PublicKey(trimmed).toBase58();
    } catch {
      return null;
    }
  }

  private isNativeSolTicker(value: string | null | undefined): boolean {
    return (
      typeof value === 'string' &&
      value.trim().toUpperCase() === NATIVE_SOL_TICKER
    );
  }

  private resolveTrackedMintAddress(input: {
    ticker?: string | null;
    mintAddress?: string | null | undefined;
  }): string | null {
    if (this.isNativeSolTicker(input.ticker)) {
      return WRAPPED_SOL_MINT_ADDRESS;
    }

    return this.normalizeMintAddress(input.mintAddress);
  }

  private convertRawAmountToUi(rawAmount: bigint, decimals: number): number {
    if (rawAmount <= 0n) return 0;

    const divisor = 10 ** decimals;
    if (!Number.isFinite(divisor) || divisor <= 0) return 0;

    const uiAmount = Number(rawAmount) / divisor;
    return Number.isFinite(uiAmount) ? uiAmount : 0;
  }

  private buildPreparedMessageHash(transactionBase64: string): string {
    const transaction = VersionedTransaction.deserialize(
      Buffer.from(transactionBase64, 'base64'),
    );
    return createHash('sha256')
      .update(transaction.message.serialize())
      .digest('hex');
  }

  private async fetchOnChainTokenBalanceDetails(
    walletAddress: string,
    network: 'devnet' | 'mainnet',
  ): Promise<Map<string, OnChainTokenBalanceDetail>> {
    const connection = this.getSolanaConnection(network);
    const owner = new PublicKey(walletAddress);
    const [solBalanceResult, ...tokenAccountFetchResults] =
      await Promise.allSettled([
        connection.getBalance(owner),
        connection.getParsedTokenAccountsByOwner(owner, {
          programId: SPL_TOKEN_PROGRAM_ID,
        }),
        connection.getParsedTokenAccountsByOwner(owner, {
          programId: SPL_TOKEN_2022_PROGRAM_ID,
        }),
      ]);

    const hadTokenFetchSuccess = tokenAccountFetchResults.some(
      (result) => result.status === 'fulfilled',
    );
    const hasSolFetchSuccess = solBalanceResult.status === 'fulfilled';

    if (!hasSolFetchSuccess && !hadTokenFetchSuccess) {
      throw new Error('Failed to read wallet balances from Solana RPC.');
    }

    const balancesByMint = new Map<string, OnChainTokenBalanceDetail>();

    if (solBalanceResult.status === 'fulfilled') {
      const lamports = BigInt(Math.max(0, solBalanceResult.value));
      const amountUi = this.convertRawAmountToUi(lamports, 9);
      if (amountUi > 0) {
        balancesByMint.set(WRAPPED_SOL_MINT_ADDRESS.toLowerCase(), {
          mintAddress: WRAPPED_SOL_MINT_ADDRESS,
          amountUi,
          amountRaw: lamports,
          decimals: 9,
          tokenAccountAddress: null,
        });
      }
    }

    for (const result of tokenAccountFetchResults) {
      if (result.status !== 'fulfilled') continue;

      for (const item of result.value.value) {
        const parsedData = item.account.data as {
          parsed: {
            info: ParsedTokenAccountInfo;
          };
        };
        const parsedInfo = parsedData.parsed.info;
        const mintAddress = this.normalizeMintAddress(parsedInfo?.mint);
        if (!mintAddress) continue;

        const tokenAmount = parsedInfo?.tokenAmount;
        const rawAmountString =
          typeof tokenAmount?.amount === 'string' ? tokenAmount.amount : '0';
        const decimals =
          typeof tokenAmount?.decimals === 'number' &&
          Number.isInteger(tokenAmount.decimals) &&
          tokenAmount.decimals >= 0
            ? tokenAmount.decimals
            : 0;

        let rawAmount = 0n;
        try {
          rawAmount = BigInt(rawAmountString);
        } catch {
          rawAmount = 0n;
        }

        if (rawAmount <= 0n) continue;
        const amountUi = this.convertRawAmountToUi(rawAmount, decimals);
        if (amountUi <= 0) continue;

        const key = mintAddress.toLowerCase();
        const existing = balancesByMint.get(key);
        if (!existing) {
          balancesByMint.set(key, {
            mintAddress,
            amountUi,
            amountRaw: rawAmount,
            decimals,
            tokenAccountAddress: item.pubkey.toBase58(),
          });
          continue;
        }

        const nextRawAmount = existing.amountRaw + rawAmount;
        balancesByMint.set(key, {
          mintAddress,
          amountUi: this.convertRawAmountToUi(nextRawAmount, existing.decimals),
          amountRaw: nextRawAmount,
          decimals: existing.decimals,
          tokenAccountAddress:
            existing.tokenAccountAddress ?? item.pubkey.toBase58(),
        });
      }
    }

    return balancesByMint;
  }

  private async fetchOnChainTokenBalancesMap(
    walletAddress: string,
    network: 'devnet' | 'mainnet',
  ): Promise<Map<string, number>> {
    const detailedBalances = await this.fetchOnChainTokenBalanceDetails(
      walletAddress,
      network,
    );
    return new Map(
      Array.from(detailedBalances.entries()).map(([mintKey, detail]) => [
        mintKey,
        detail.amountUi,
      ]),
    );
  }

  private async syncUserTrackedOnchainBalances(
    userId: string,
    walletAddress: string,
    network: 'devnet' | 'mainnet',
    settings?: RaRuntimeSettings,
  ): Promise<number> {
    const runtimeSettings = settings ?? (await this.loadRaRuntimeSettings());
    const raMintAddress = this.resolveRaMintForNetwork(
      network,
      runtimeSettings,
    );
    const normalizedRaMintAddress =
      this.normalizeMintAddress(raMintAddress) ?? raMintAddress;
    const normalizedRaMintKey = normalizedRaMintAddress.toLowerCase();

    const listedTokens = await this.prisma.marketToken.findMany({
      where: {
        isActive: true,
      },
      select: {
        ticker: true,
        name: true,
        mintAddress: true,
      },
    });

    const trackedByMint = new Map<
      string,
      { mintAddress: string; ticker: string; tokenName: string | null }
    >();

    for (const token of listedTokens) {
      const trackedMintAddress = this.resolveTrackedMintAddress(token);
      if (!trackedMintAddress) continue;
      const mintKey = trackedMintAddress.toLowerCase();

      if (!trackedByMint.has(mintKey)) {
        trackedByMint.set(mintKey, {
          mintAddress: trackedMintAddress,
          ticker: token.ticker.toUpperCase(),
          tokenName: token.name,
        });
      }
    }

    trackedByMint.set(normalizedRaMintKey, {
      mintAddress: normalizedRaMintAddress,
      ticker: runtimeSettings.tokenSymbol,
      tokenName: runtimeSettings.tokenName,
    });

    let balancesByMint: Map<string, number>;
    try {
      balancesByMint = await this.fetchOnChainTokenBalancesMap(
        walletAddress,
        network,
      );
    } catch (error) {
      throw new HttpException(
        error instanceof Error
          ? `Unable to sync wallet on-chain balances: ${error.message}`
          : 'Unable to sync wallet on-chain balances.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const now = new Date();
    const trackedHoldings = Array.from(trackedByMint.values()).map(
      (tracked) => ({
        ...tracked,
        amount: Math.max(
          0,
          balancesByMint.get(tracked.mintAddress.toLowerCase()) ?? 0,
        ),
      }),
    );
    const trackedMintAddresses = trackedHoldings.map(
      (holding) => holding.mintAddress,
    );
    const raBalance = Math.max(0, balancesByMint.get(normalizedRaMintKey) ?? 0);

    await this.prisma.$transaction(async (tx) => {
      await Promise.all(
        trackedHoldings.map((holding) =>
          tx.walletTokenHolding.upsert({
            where: {
              userId_network_mintAddress: {
                userId,
                network,
                mintAddress: holding.mintAddress,
              },
            },
            create: {
              userId,
              network,
              mintAddress: holding.mintAddress,
              ticker: holding.ticker,
              tokenName: holding.tokenName,
              amount: holding.amount,
              lastSyncedAt: now,
            },
            update: {
              ticker: holding.ticker,
              tokenName: holding.tokenName,
              amount: holding.amount,
              lastSyncedAt: now,
            },
          }),
        ),
      );

      await tx.walletTokenHolding.deleteMany({
        where: {
          userId,
          network,
          mintAddress: {
            notIn: trackedMintAddresses,
          },
        },
      });

      await tx.walletUser.update({
        where: { id: userId },
        data: {
          raOnchainBalance: raBalance,
          raOnchainBalanceUpdatedAt: now,
        },
      });
    });

    return raBalance;
  }

  private shouldSyncWalletOnchainBalances(
    lastSyncedAt: Date | null | undefined,
  ) {
    if (!lastSyncedAt) return true;
    return (
      Date.now() - lastSyncedAt.getTime() >=
      ONCHAIN_BALANCE_SYNC_MIN_INTERVAL_MS
    );
  }

  private async getLiveMarketSnapshotsByMints(mints: string[]) {
    const normalizedMints = Array.from(
      new Set(
        mints
          .map((mint) => this.normalizeMintAddress(mint))
          .filter((mint): mint is string => Boolean(mint)),
      ),
    );

    if (normalizedMints.length === 0) {
      return new Map<
        string,
        {
          mint: string;
          priceUsd: number;
          change24h: number;
          ticker: string;
          name: string;
          logoUrl: string;
        }
      >();
    }

    const batches: string[][] = [];
    for (let index = 0; index < normalizedMints.length; index += 30) {
      batches.push(normalizedMints.slice(index, index + 30));
    }

    const responses = await Promise.all(
      batches.map((batch) =>
        this.marketService.getTokenSnapshotsByMints(batch),
      ),
    );

    return new Map(
      responses.flat().map((item) => [
        item.mint.toLowerCase(),
        {
          mint: item.mint,
          priceUsd:
            Number.isFinite(item.priceUsd) && item.priceUsd > 0
              ? item.priceUsd
              : 0,
          change24h: Number.isFinite(item.change24h) ? item.change24h : 0,
          ticker: item.ticker,
          name: item.name,
          logoUrl: item.logoUrl,
        },
      ]),
    );
  }

  private async resolveRaPriceUsd(
    settings: RaRuntimeSettings,
    network: 'devnet' | 'mainnet',
  ): Promise<number> {
    const mintAddress = this.resolveRaMintForNetwork(network, settings);

    const tryDexscreener = async (): Promise<number | null> => {
      const response = await fetch(
        `${DEXSCREENER_API_BASE_URL}/latest/dex/tokens/${encodeURIComponent(
          mintAddress,
        )}`,
        {
          method: 'GET',
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(4_000),
        },
      );
      if (!response.ok) return null;

      const payload = (await response.json()) as DexTokenSearchResponse;
      const pairs = Array.isArray(payload.pairs) ? payload.pairs : [];
      const preferred =
        pairs.find(
          (pair) =>
            pair.baseToken?.address?.toLowerCase() ===
            mintAddress.toLowerCase(),
        ) ?? pairs[0];
      const parsed = Number(preferred?.priceUsd);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    };

    const tryRaydium = async (): Promise<number | null> => {
      const url = new URL('/mint/price', RA_ORACLE_RAYDIUM_API_BASE);
      url.searchParams.set('mints', mintAddress);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(4_000),
      });
      if (!response.ok) return null;

      const payload = (await response.json()) as RaydiumMintPriceResponse;
      const parsed = Number(payload.data?.[mintAddress]);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    };

    const tryProvider = async (
      provider: RaOracleProvider,
    ): Promise<number | null> => {
      try {
        if (provider === 'RAYDIUM') {
          return await tryRaydium();
        }
        return await tryDexscreener();
      } catch {
        return null;
      }
    };

    const primaryPrice = await tryProvider(settings.oraclePrimary);
    if (primaryPrice && primaryPrice > 0) return primaryPrice;

    if (
      settings.oracleSecondary &&
      settings.oracleSecondary !== settings.oraclePrimary
    ) {
      const secondaryPrice = await tryProvider(settings.oracleSecondary);
      if (secondaryPrice && secondaryPrice > 0) return secondaryPrice;
    }

    const marketFallback = await this.resolveTokenPriceUsd('RA', 0);
    if (marketFallback > 0) return marketFallback;

    if (network === 'devnet') {
      return DEFAULT_RA_PRICE_USD;
    }

    throw new BadRequestException(
      `Unable to resolve RA price from ${settings.oraclePrimary}${
        settings.oracleSecondary ? ` or ${settings.oracleSecondary}` : ''
      }.`,
    );
  }

  private calculateFeeUsd(amountUsd: number, feeBps: number): number {
    return Math.max(0, (amountUsd * feeBps) / 10_000);
  }

  private extractBearerToken(authorization?: string): string {
    const normalized = authorization?.trim();
    if (!normalized) {
      throw new UnauthorizedException(
        'Wallet session is missing. Reconnect and sign again.',
      );
    }

    const match = normalized.match(/^Bearer\s+(.+)$/i);
    if (!match || !match[1]) {
      throw new UnauthorizedException(
        'Wallet session token format is invalid.',
      );
    }

    return match[1].trim();
  }

  private assertWalletAccessToken(
    authorization: string | undefined,
    walletAddress: string,
  ) {
    const token = this.extractBearerToken(authorization);

    try {
      const payload = this.jwtService.verify<{
        walletAddress?: string;
        tokenType?: string;
      }>(token);

      if (payload?.tokenType !== USER_AUTH_TOKEN_TYPE) {
        throw new UnauthorizedException('Wallet session token is invalid.');
      }

      if (payload.walletAddress !== walletAddress) {
        throw new UnauthorizedException(
          'Wallet session does not match requested wallet address.',
        );
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(
        'Wallet session is expired or invalid. Reconnect and sign again.',
      );
    }
  }

  private normalizeSessionKey(sessionKey?: string | null): string | null {
    if (typeof sessionKey !== 'string') return null;
    const trimmed = sessionKey.trim();
    if (!trimmed) return null;
    if (!/^[A-Za-z0-9:_-]{6,120}$/.test(trimmed)) {
      throw new BadRequestException('sessionKey is invalid');
    }
    return trimmed;
  }

  private normalizeTicker(value: string): string {
    const normalized = value.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('tokenTicker is required');
    }
    if (!/^[A-Z0-9._$-]{1,16}$/.test(normalized)) {
      throw new BadRequestException('tokenTicker is invalid');
    }
    return normalized;
  }

  private normalizePeriodLabel(value: string): string {
    const normalized = value.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('periodLabel is required');
    }
    if (!/^[A-Z0-9]{1,16}$/.test(normalized)) {
      throw new BadRequestException('periodLabel is invalid');
    }
    return normalized;
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

  private async resolveTokenPriceUsd(
    tokenTicker: string,
    fallback = 0,
  ): Promise<number> {
    const marketToken = await this.prisma.marketToken.findUnique({
      where: { ticker: tokenTicker.toUpperCase() },
      select: { price: true },
    });

    return Math.max(0, toNumber(marketToken?.price, fallback));
  }

  private async resolveStakeTokenPriceUsd(input: {
    ticker: string;
    mintAddress?: string | null;
    persistedPriceUsd: number;
    network: 'devnet' | 'mainnet';
  }): Promise<number> {
    const normalizedPersistedPrice = Math.max(0, input.persistedPriceUsd || 0);
    const trackingMint =
      this.normalizeTicker(input.ticker) === NATIVE_SOL_TICKER
        ? WRAPPED_SOL_MINT_ADDRESS
        : this.normalizeMintAddress(input.mintAddress);

    if (trackingMint) {
      try {
        const snapshots = await this.getLiveMarketSnapshotsByMints([
          trackingMint,
        ]);
        const livePrice = snapshots.get(trackingMint.toLowerCase())?.priceUsd;
        if (
          typeof livePrice === 'number' &&
          Number.isFinite(livePrice) &&
          livePrice > 0
        ) {
          return livePrice;
        }
      } catch {
        // Fall back to the persisted token price when live pricing is unavailable.
      }
    }

    if (normalizedPersistedPrice > 0) {
      return normalizedPersistedPrice;
    }

    return this.resolveTokenPriceUsd(input.ticker, normalizedPersistedPrice);
  }

  private normalizeConvertTokenTickers(
    tokens: Array<{ ticker: string }>,
  ): string[] {
    const normalized = new Set<string>();

    for (const item of tokens) {
      const ticker = this.normalizeTicker(item.ticker);
      if (ticker === 'RA') {
        continue;
      }
      if (ticker === NATIVE_SOL_TICKER) {
        throw new BadRequestException(
          'SOL cannot be converted in Convert Small Balances.',
        );
      }
      normalized.add(ticker);
    }

    if (normalized.size === 0) {
      throw new BadRequestException(
        'No eligible tokens selected for conversion.',
      );
    }

    return Array.from(normalized);
  }

  private bigintToBase58Signature(signatureBytes: Uint8Array): string | null {
    if (!signatureBytes || signatureBytes.length === 0) return null;
    const hasSignature = signatureBytes.some((value) => value !== 0);
    if (!hasSignature) return null;
    return encodeBase58(signatureBytes);
  }

  private normalizeUiTokenAmount(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private computeParsedTokenDelta(
    transaction: Awaited<ReturnType<Connection['getParsedTransaction']>>,
    owner: string,
    mintAddress: string,
  ): number {
    if (!transaction?.meta) return 0;

    const mintKey = mintAddress.toLowerCase();
    const ownerKey = owner.toLowerCase();
    const sumTokenBalances = (
      balances:
        | ReadonlyArray<{
            mint: string;
            owner?: string;
            uiTokenAmount: {
              uiAmount?: number | null;
              uiAmountString?: string;
            };
          }>
        | null
        | undefined,
    ) =>
      (balances ?? []).reduce((sum, balance) => {
        if (balance.mint.toLowerCase() !== mintKey) return sum;
        if ((balance.owner ?? '').toLowerCase() !== ownerKey) return sum;

        return (
          sum +
          this.normalizeUiTokenAmount(
            balance.uiTokenAmount.uiAmountString ??
              balance.uiTokenAmount.uiAmount ??
              0,
          )
        );
      }, 0);

    const pre = sumTokenBalances(transaction.meta.preTokenBalances);
    const post = sumTokenBalances(transaction.meta.postTokenBalances);
    const delta = post - pre;
    return Number.isFinite(delta) && delta > 0 ? delta : 0;
  }

  private async fetchMintMetadata(
    connection: Connection,
    mintAddress: string,
  ): Promise<{
    mint: PublicKey;
    decimals: number;
    tokenProgramId: PublicKey;
  }> {
    const mint = new PublicKey(mintAddress);
    const response = await connection.getParsedAccountInfo(mint, 'confirmed');
    const accountInfo = response.value;
    if (!accountInfo) {
      throw new BadRequestException(
        `Mint account not found for ${mintAddress}.`,
      );
    }

    const data = accountInfo.data;
    if (!data || typeof data !== 'object' || !('parsed' in data)) {
      throw new BadRequestException(
        `Mint account for ${mintAddress} is invalid.`,
      );
    }

    const parsed = data.parsed as {
      type?: string;
      info?: { decimals?: number };
    };
    if (parsed.type !== 'mint') {
      throw new BadRequestException(
        `Account ${mintAddress} is not a token mint.`,
      );
    }

    const decimals =
      typeof parsed.info?.decimals === 'number' &&
      Number.isInteger(parsed.info.decimals) &&
      parsed.info.decimals >= 0
        ? parsed.info.decimals
        : 0;

    return {
      mint,
      decimals,
      tokenProgramId: accountInfo.owner,
    };
  }

  private async resolveRaMintTarget(
    network: 'devnet' | 'mainnet',
    settings: RaRuntimeSettings,
  ): Promise<{
    raMintAddress: string;
    raMintDecimals: number;
    raTokenProgramId: PublicKey;
  }> {
    const raMintAddress = this.resolveRaMintForNetwork(network, settings);
    const mintMetadata = await this.fetchMintMetadata(
      this.getSolanaConnection(network),
      raMintAddress,
    );

    return {
      raMintAddress,
      raMintDecimals: mintMetadata.decimals,
      raTokenProgramId: mintMetadata.tokenProgramId,
    };
  }

  private resolveConvertPoolConfigForNetwork(
    network: 'devnet' | 'mainnet',
    settings: RaRuntimeSettings,
  ) {
    return {
      poolId:
        network === 'mainnet'
          ? settings.convertPoolIdMainnet
          : settings.convertPoolIdDevnet,
      quoteMint:
        network === 'mainnet'
          ? settings.convertQuoteMintMainnet
          : settings.convertQuoteMintDevnet,
    };
  }

  private async fetchRaydiumPriorityFee(): Promise<string> {
    const cacheKey = 'users:convert:raydium:auto-fee';
    const cached = await this.redisJsonCache.get<{ fee: string }>(cacheKey);
    if (cached?.fee) return cached.fee;

    const response = await fetch(
      `${RA_ORACLE_RAYDIUM_API_BASE}/main/auto-fee`,
      {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!response.ok) {
      return '10000';
    }

    const payload = (await response.json()) as RaydiumPriorityFeeResponse;
    const feeCandidate =
      payload.data?.default?.h ??
      payload.data?.default?.m ??
      payload.data?.default?.vh ??
      10000;
    const fee = Math.max(
      1,
      Math.trunc(Number(feeCandidate) || 10000),
    ).toString();
    await this.redisJsonCache.set(
      cacheKey,
      { fee },
      CONVERT_ROUTE_CACHE_TTL_MS,
    );
    return fee;
  }

  private assertRaydiumRoutePolicy(
    routePlan: RaydiumRoutePlanStep[] | undefined,
    inputMint: string,
    outputMint: string,
    quoteMint: string,
    requiredRaPoolId: string,
    tokenSymbol: string,
  ) {
    const normalizedInput = inputMint.toLowerCase();
    const normalizedOutput = outputMint.toLowerCase();
    const normalizedQuoteMint = quoteMint.toLowerCase();
    const normalizedRequiredRaPoolId = requiredRaPoolId.toLowerCase();
    const steps = Array.isArray(routePlan) ? routePlan : [];

    if (steps.length !== 2) {
      throw new BadRequestException(
        `No supported Raydium route is available for this token. Expected TOKEN -> SOL -> ${tokenSymbol}.`,
      );
    }

    const [first, second] = steps;
    if (
      first.inputMint?.toLowerCase() !== normalizedInput ||
      first.outputMint?.toLowerCase() !== normalizedQuoteMint ||
      second.inputMint?.toLowerCase() !== normalizedQuoteMint ||
      second.outputMint?.toLowerCase() !== normalizedOutput
    ) {
      throw new BadRequestException(
        `Raydium route does not match the configured TOKEN -> SOL -> ${tokenSymbol} policy.`,
      );
    }

    if (second.poolId?.toLowerCase() !== normalizedRequiredRaPoolId) {
      throw new BadRequestException(
        'Raydium route is not using the configured RA convert pool.',
      );
    }
  }

  private async fetchRaydiumConvertQuote(input: {
    network: 'devnet' | 'mainnet';
    inputMint: string;
    outputMint: string;
    amountRaw: string;
    slippageBps: number;
    quoteMint: string;
    requiredRaPoolId: string;
    tokenSymbol: string;
  }) {
    const cacheKey = [
      'users:convert:raydium:quote',
      input.network,
      input.inputMint,
      input.outputMint,
      input.amountRaw,
      input.slippageBps,
      input.quoteMint,
    ].join(':');
    const cached =
      await this.redisJsonCache.get<RaydiumComputeSwapResponse>(cacheKey);
    if (cached?.data) {
      this.assertRaydiumRoutePolicy(
        cached.data.routePlan,
        input.inputMint,
        input.outputMint,
        input.quoteMint,
        input.requiredRaPoolId,
        input.tokenSymbol,
      );
      return cached;
    }

    const url = new URL('/compute/swap-base-in', RAYDIUM_TRADE_API_BASE_URL);
    url.searchParams.set('inputMint', input.inputMint);
    url.searchParams.set('outputMint', input.outputMint);
    url.searchParams.set('amount', input.amountRaw);
    url.searchParams.set('slippageBps', String(input.slippageBps));
    url.searchParams.set('txVersion', 'V0');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const rawMessage = await response.text();
      throw new BadRequestException(
        `Raydium quote failed: ${rawMessage || response.statusText}`,
      );
    }

    const payload = (await response.json()) as RaydiumComputeSwapResponse;
    if (!payload.success || !payload.data) {
      throw new BadRequestException(
        `No live swap route is available to convert this token into ${input.tokenSymbol} on the selected network.`,
      );
    }

    this.assertRaydiumRoutePolicy(
      payload.data.routePlan,
      input.inputMint,
      input.outputMint,
      input.quoteMint,
      input.requiredRaPoolId,
      input.tokenSymbol,
    );
    await this.redisJsonCache.set(
      cacheKey,
      payload,
      CONVERT_ROUTE_CACHE_TTL_MS,
    );
    return payload;
  }

  private async buildRaydiumSwapTransactions(input: {
    network: 'devnet' | 'mainnet';
    walletAddress: string;
    inputAccount: string;
    outputAccount?: string;
    swapResponse: RaydiumComputeSwapResponse;
  }): Promise<string[]> {
    const preparedCacheKey = [
      'users:convert:raydium:prepared',
      input.network,
      input.walletAddress,
      input.inputAccount,
      input.outputAccount ?? 'auto',
      input.swapResponse.data?.inputMint,
      input.swapResponse.data?.outputMint,
      input.swapResponse.data?.inputAmount,
      input.swapResponse.data?.otherAmountThreshold,
    ].join(':');
    const cached = await this.redisJsonCache.get<{ transactions: string[] }>(
      preparedCacheKey,
    );
    if (cached?.transactions?.length) {
      return cached.transactions;
    }

    const computeUnitPriceMicroLamports = await this.fetchRaydiumPriorityFee();
    const response = await fetch(
      `${RAYDIUM_TRADE_API_BASE_URL}/transaction/swap-base-in`,
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          computeUnitPriceMicroLamports,
          swapResponse: input.swapResponse,
          txVersion: 'V0',
          wallet: input.walletAddress,
          wrapSol: false,
          unwrapSol: false,
          inputAccount: input.inputAccount,
          ...(input.outputAccount
            ? { outputAccount: input.outputAccount }
            : {}),
        }),
        signal: AbortSignal.timeout(12_000),
      },
    );

    if (!response.ok) {
      const rawMessage = await response.text();
      throw new BadRequestException(
        `Raydium transaction build failed: ${rawMessage || response.statusText}`,
      );
    }

    const payload = (await response.json()) as RaydiumBuildTransactionsResponse;
    const transactions =
      payload.data
        ?.map((entry) => entry.transaction?.trim())
        .filter((entry): entry is string => Boolean(entry)) ?? [];

    if (!payload.success || transactions.length === 0) {
      throw new BadRequestException(
        `Raydium transaction build did not return any transactions.${
          payload.msg ? ` ${payload.msg}` : ''
        }`,
      );
    }

    await this.redisJsonCache.set(
      preparedCacheKey,
      { transactions },
      CONVERT_PREPARED_CACHE_TTL_MS,
    );
    return transactions;
  }

  private async buildVersionedTransactionBase64(input: {
    connection: Connection;
    payer: PublicKey;
    instructions: TransactionInstruction[];
  }): Promise<{
    transactionBase64: string;
    messageHash: string;
    lastValidBlockHeight: number;
  }> {
    const latestBlockhash =
      await input.connection.getLatestBlockhash('confirmed');
    const message = new TransactionMessage({
      payerKey: input.payer,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: input.instructions,
    }).compileToV0Message();

    const transaction = new VersionedTransaction(message);
    const serialized = Buffer.from(transaction.serialize()).toString('base64');
    return {
      transactionBase64: serialized,
      messageHash: this.buildPreparedMessageHash(serialized),
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    };
  }

  private async getTokenAccountUiBalance(
    connection: Connection,
    tokenAccountAddress: string,
  ): Promise<number> {
    try {
      const response = await connection.getTokenAccountBalance(
        new PublicKey(tokenAccountAddress),
        'confirmed',
      );
      return this.normalizeUiTokenAmount(
        response.value.uiAmountString ?? response.value.uiAmount ?? 0,
      );
    } catch {
      return 0;
    }
  }

  private async resolveConvertLegActuals(input: {
    connection: Connection;
    signature: string;
    walletAddress: string;
    treasuryAddress: string;
    raMintAddress: string;
    fallbackRaOut: number;
    fallbackFeeRa: number;
  }): Promise<{ actualRaOut: number; feeRa: number }> {
    try {
      const parsedTx = await input.connection.getParsedTransaction(
        input.signature,
        {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0,
        },
      );

      if (!parsedTx) {
        return {
          actualRaOut: input.fallbackRaOut,
          feeRa: input.fallbackFeeRa,
        };
      }

      const actualRaOut = this.computeParsedTokenDelta(
        parsedTx,
        input.walletAddress,
        input.raMintAddress,
      );
      const feeRa = this.computeParsedTokenDelta(
        parsedTx,
        input.treasuryAddress,
        input.raMintAddress,
      );

      return {
        actualRaOut: actualRaOut > 0 ? actualRaOut : input.fallbackRaOut,
        feeRa: feeRa > 0 ? feeRa : input.fallbackFeeRa,
      };
    } catch {
      return {
        actualRaOut: input.fallbackRaOut,
        feeRa: input.fallbackFeeRa,
      };
    }
  }

  private async listWalletConvertCandidates(input: {
    userId: string;
    walletAddress: string;
    network: 'devnet' | 'mainnet';
    settings: RaRuntimeSettings;
    requestedTickers?: string[];
  }): Promise<{
    candidates: WalletConvertCandidate[];
    hiddenTokenCount: number;
    unavailableCount: number;
    note: string | null;
    availableSolBalance: number;
    estimatedNetworkFeeSol: number;
    canExecute: boolean;
    feeWarning: string | null;
    raTarget: Awaited<ReturnType<UsersService['resolveRaMintTarget']>>;
    userRaTokenAccount: string;
    needsUserRaTokenAccount: boolean;
  }> {
    if (!input.settings.convertEnabled) {
      return {
        candidates: [],
        hiddenTokenCount: 0,
        unavailableCount: 0,
        note: 'Convert small balances is currently disabled.',
        availableSolBalance: 0,
        estimatedNetworkFeeSol: 0,
        canExecute: false,
        feeWarning: 'Convert small balances is currently unavailable.',
        raTarget: await this.resolveRaMintTarget(input.network, input.settings),
        userRaTokenAccount: '',
        needsUserRaTokenAccount: false,
      };
    }

    if (input.settings.convertProvider !== 'RAYDIUM') {
      throw new BadRequestException(
        'Only Raydium convert provider is currently supported.',
      );
    }

    const raTarget = await this.resolveRaMintTarget(
      input.network,
      input.settings,
    );
    const convertPoolConfig = this.resolveConvertPoolConfigForNetwork(
      input.network,
      input.settings,
    );
    const connection = this.getSolanaConnection(input.network);

    await this.syncUserTrackedOnchainBalances(
      input.userId,
      input.walletAddress,
      input.network,
      input.settings,
    );

    const [balancesByMint, marketTokens] = await Promise.all([
      this.fetchOnChainTokenBalanceDetails(input.walletAddress, input.network),
      this.prisma.marketToken.findMany({
        where: {
          isActive: true,
          convertEnabled: true,
          ...(input.requestedTickers?.length
            ? {
                ticker: {
                  in: input.requestedTickers,
                },
              }
            : {}),
        },
        select: {
          ticker: true,
          name: true,
          mintAddress: true,
        },
      }),
    ]);

    const requestedTickers = input.requestedTickers ?? [];
    const marketByTicker = new Map(
      marketTokens.map((token) => [token.ticker.toUpperCase(), token]),
    );

    if (requestedTickers.length > 0) {
      for (const ticker of requestedTickers) {
        if (!marketByTicker.has(ticker)) {
          throw new BadRequestException(
            `${ticker} is not an active convert token.`,
          );
        }
      }
    }

    const allTrackedMints = marketTokens
      .map((token) => this.resolveTrackedMintAddress(token))
      .filter((mint): mint is string => Boolean(mint));
    const liveSnapshots =
      await this.getLiveMarketSnapshotsByMints(allTrackedMints);

    const walletPublicKey = new PublicKey(input.walletAddress);
    const userRaTokenAccount = getAssociatedTokenAddressSync({
      mint: new PublicKey(raTarget.raMintAddress),
      owner: walletPublicKey,
      allowOwnerOffCurve: false,
      tokenProgramId: raTarget.raTokenProgramId,
      associatedTokenProgramId: SPL_ASSOCIATED_TOKEN_PROGRAM_ID,
    }).toBase58();
    const needsUserRaTokenAccount = !(await connection.getAccountInfo(
      new PublicKey(userRaTokenAccount),
      'confirmed',
    ));

    const normalizedRaMint = raTarget.raMintAddress.toLowerCase();
    const availableSolBalance =
      balancesByMint.get(WRAPPED_SOL_MINT_ADDRESS.toLowerCase())?.amountUi ?? 0;
    let unavailableCount = 0;

    const rawCandidates = await Promise.all(
      marketTokens.map(
        async (token): Promise<WalletConvertCandidate | null> => {
          const ticker = token.ticker.toUpperCase();
          if (ticker === 'RA' || this.isNativeSolTicker(ticker)) {
            return null;
          }

          const trackedMintAddress = this.resolveTrackedMintAddress(token);
          if (!trackedMintAddress) {
            return null;
          }
          if (trackedMintAddress.toLowerCase() === normalizedRaMint) {
            return null;
          }

          const balanceDetail = balancesByMint.get(
            trackedMintAddress.toLowerCase(),
          );
          if (
            !balanceDetail ||
            !balanceDetail.tokenAccountAddress ||
            balanceDetail.amountRaw <= 0n
          ) {
            return null;
          }

          const liveSnapshot = liveSnapshots.get(
            trackedMintAddress.toLowerCase(),
          );
          const priceUsd =
            liveSnapshot?.priceUsd && liveSnapshot.priceUsd > 0
              ? liveSnapshot.priceUsd
              : await this.resolveTokenPriceUsd(ticker, 0);

          if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
            unavailableCount += 1;
            return null;
          }

          const amountUsd = balanceDetail.amountUi * priceUsd;
          if (
            amountUsd < input.settings.convertMinUsd ||
            amountUsd > input.settings.convertMaxUsd
          ) {
            return null;
          }

          try {
            const quote = await this.fetchRaydiumConvertQuote({
              network: input.network,
              inputMint: trackedMintAddress,
              outputMint: raTarget.raMintAddress,
              amountRaw: balanceDetail.amountRaw.toString(),
              slippageBps: input.settings.convertSlippageBps,
              quoteMint: convertPoolConfig.quoteMint,
              requiredRaPoolId: convertPoolConfig.poolId,
              tokenSymbol: input.settings.tokenSymbol,
            });

            const guaranteedMinimumRaw = BigInt(
              quote.data?.otherAmountThreshold ?? '0',
            );
            const quotedRaOut = this.convertRawAmountToUi(
              guaranteedMinimumRaw,
              raTarget.raMintDecimals,
            );
            if (quotedRaOut <= 0) {
              unavailableCount += 1;
              return null;
            }

            return {
              ticker,
              name: token.name ?? ticker,
              mintAddress: trackedMintAddress,
              amount: balanceDetail.amountUi,
              amountRaw: balanceDetail.amountRaw.toString(),
              decimals: balanceDetail.decimals,
              tokenAccountAddress: balanceDetail.tokenAccountAddress,
              amountUsd,
              quotedRaOut,
              slippageBps: input.settings.convertSlippageBps,
              routeQuote: quote,
              routeTransactionCount: 1,
            };
          } catch {
            unavailableCount += 1;
            return null;
          }
        },
      ),
    );

    const candidateMap = new Map(
      rawCandidates
        .filter((candidate): candidate is WalletConvertCandidate =>
          Boolean(candidate),
        )
        .map((candidate) => [candidate.ticker, candidate]),
    );

    const orderedCandidates =
      requestedTickers.length > 0
        ? requestedTickers
            .map((ticker) => candidateMap.get(ticker))
            .filter((candidate): candidate is WalletConvertCandidate =>
              Boolean(candidate),
            )
        : Array.from(candidateMap.values()).sort(
            (left, right) => right.amountUsd - left.amountUsd,
          );

    const limitedCandidates = orderedCandidates.slice(
      0,
      input.settings.convertMaxTokensPerSession,
    );
    const hiddenTokenCount = Math.max(
      0,
      orderedCandidates.length - limitedCandidates.length,
    );
    const totalTransactionCount =
      limitedCandidates.reduce(
        (sum, candidate) => sum + candidate.routeTransactionCount,
        0,
      ) + (needsUserRaTokenAccount && limitedCandidates.length > 0 ? 1 : 0);
    const estimatedNetworkFeeSol =
      totalTransactionCount > 0
        ? totalTransactionCount * CONVERT_NETWORK_FEE_SOL_PER_TX_ESTIMATE +
          CONVERT_NETWORK_FEE_SOL_BUFFER
        : 0;
    const canExecute =
      totalTransactionCount === 0 ||
      availableSolBalance >= estimatedNetworkFeeSol;
    const feeWarning =
      totalTransactionCount > 0 && !canExecute
        ? `At least ${estimatedNetworkFeeSol.toFixed(
            6,
          )} SOL is required to cover conversion network fees.`
        : null;
    const note =
      unavailableCount > 0 || hiddenTokenCount > 0
        ? `Some system tokens with small balances are not currently routable to ${input.settings.tokenSymbol}.`
        : null;

    return {
      candidates: limitedCandidates,
      hiddenTokenCount,
      unavailableCount,
      note,
      availableSolBalance,
      estimatedNetworkFeeSol,
      canExecute,
      feeWarning,
      raTarget,
      userRaTokenAccount,
      needsUserRaTokenAccount,
    };
  }

  private normalizeTokenName(value?: string): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 80) : null;
  }

  private normalizeCountryCode(countryCode: string | null): string | null {
    if (!countryCode) return null;
    const normalized = countryCode.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(normalized)) return null;
    return normalized;
  }

  private isLocalOrPrivateIp(ipAddress: string): boolean {
    const ip = ipAddress.toLowerCase();

    if (
      ip === '::1' ||
      ip === 'localhost' ||
      ip.startsWith('127.') ||
      ip.startsWith('10.') ||
      ip.startsWith('192.168.') ||
      ip.startsWith('169.254.') ||
      ip.startsWith('fc') ||
      ip.startsWith('fd') ||
      ip.startsWith('fe80')
    ) {
      return true;
    }

    const private172 = /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);
    if (private172) return true;

    return false;
  }

  private async lookupCountryCodeByIp(
    ipAddress: string,
  ): Promise<string | null> {
    const now = Date.now();
    const cached = this.geoCountryCache.get(ipAddress);
    if (cached && cached.expiresAt > now) {
      return cached.countryCode;
    }

    const inFlight = this.geoLookupInFlight.get(ipAddress);
    if (inFlight) {
      return inFlight;
    }

    const lookupPromise = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), GEO_LOOKUP_TIMEOUT_MS);

      try {
        const res = await fetch(
          `https://ipwho.is/${encodeURIComponent(ipAddress)}`,
          {
            method: 'GET',
            headers: { accept: 'application/json' },
            signal: controller.signal,
          },
        );

        if (!res.ok) {
          this.geoCountryCache.set(ipAddress, {
            countryCode: null,
            expiresAt: now + GEO_NEGATIVE_CACHE_TTL_MS,
          });
          return null;
        }

        const data = (await res.json()) as {
          success?: boolean;
          country_code?: string;
        };

        const normalizedCountry = data?.success
          ? this.normalizeCountryCode(data.country_code ?? null)
          : null;

        this.geoCountryCache.set(ipAddress, {
          countryCode: normalizedCountry,
          expiresAt:
            now +
            (normalizedCountry ? GEO_CACHE_TTL_MS : GEO_NEGATIVE_CACHE_TTL_MS),
        });

        return normalizedCountry;
      } catch {
        this.geoCountryCache.set(ipAddress, {
          countryCode: null,
          expiresAt: now + GEO_NEGATIVE_CACHE_TTL_MS,
        });
        return null;
      } finally {
        clearTimeout(timer);
        this.geoLookupInFlight.delete(ipAddress);
      }
    })();

    this.geoLookupInFlight.set(ipAddress, lookupPromise);
    return lookupPromise;
  }

  private async resolveCountryCode(
    context: UsersRequestContext,
  ): Promise<string | null> {
    const normalizedHeaderCountry = this.normalizeCountryCode(
      context.countryCode,
    );
    if (normalizedHeaderCountry) {
      return normalizedHeaderCountry;
    }

    const normalizedIp = normalizeIpAddress(context.ipAddress);
    if (!normalizedIp || this.isLocalOrPrivateIp(normalizedIp)) {
      return null;
    }

    return this.lookupCountryCodeByIp(normalizedIp);
  }

  private validateProxyKey(proxyKey?: string) {
    validateProxySharedKey(proxyKey);
  }

  private async consumeRateLimit(
    key: string,
    max: number,
    windowMs: number,
  ): Promise<void> {
    const result = await this.rateLimitStore.consume({ key, max, windowMs });
    if (!result.allowed) {
      throw new HttpException(
        'Too many requests. Please retry shortly.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private resolveTokenLogoUrl(
    tokenTicker: string,
    marketToken?: { icon?: string | null; isImage?: boolean } | null,
    fallbackLogoUrl?: string | null,
  ): string {
    const fallbackIcon = fallbackLogoUrl?.trim() ?? '';
    if (fallbackIcon.startsWith('/')) {
      return fallbackIcon;
    }

    const marketIcon = marketToken?.icon?.trim() ?? '';
    const marketIconLooksLikeUrl =
      marketIcon.startsWith('/') || /^https?:\/\//i.test(marketIcon);

    if (marketToken?.isImage && marketIconLooksLikeUrl) {
      return marketIcon;
    }

    return TOKEN_LOGO_BY_TICKER[tokenTicker.toUpperCase()] ?? '';
  }

  private normalizeExplorerActivityType(input: string): WalletActivityType {
    const normalized = input?.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('Activity type is required.');
    }

    if (!(normalized in WalletActivityType)) {
      throw new BadRequestException(
        'Activity type must be one of STAKE, CLAIM, DEPOSIT, WITHDRAW, CONVERT.',
      );
    }

    return normalized as WalletActivityType;
  }

  private normalizeExplorerActivityStatus(
    input?: string | null,
  ): WalletActivityStatus {
    if (!input) return WalletActivityStatus.COMPLETED;

    const normalized = input.trim().toUpperCase();
    if (!normalized) return WalletActivityStatus.COMPLETED;

    if (!(normalized in WalletActivityStatus)) {
      throw new BadRequestException(
        'Activity status must be one of PENDING, COMPLETED, FAILED.',
      );
    }

    const status = normalized as WalletActivityStatus;
    if (!EXPLORER_ACTIVITY_STATUSES.has(status)) {
      throw new BadRequestException('Invalid activity status.');
    }

    return status;
  }

  private encodeExplorerFeedCursor(value: { createdAt: Date; id: string }) {
    const raw = JSON.stringify({
      createdAt: value.createdAt.toISOString(),
      id: value.id,
    });
    return Buffer.from(raw, 'utf8').toString('base64url');
  }

  private decodeExplorerFeedCursor(
    cursor?: string | null,
  ): { createdAt: Date; id: string } | null {
    if (!cursor) return null;

    try {
      const raw = Buffer.from(cursor, 'base64url').toString('utf8');
      const parsed = JSON.parse(raw) as { createdAt?: string; id?: string };
      if (
        !parsed ||
        typeof parsed.createdAt !== 'string' ||
        typeof parsed.id !== 'string'
      ) {
        return null;
      }

      const createdAt = new Date(parsed.createdAt);
      if (Number.isNaN(createdAt.getTime())) {
        return null;
      }

      if (!parsed.id.trim()) {
        return null;
      }

      return { createdAt, id: parsed.id.trim() };
    } catch {
      return null;
    }
  }

  private async createWalletActivityRecord(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      walletAddress: string;
      network?: 'devnet' | 'mainnet';
      type: WalletActivityType;
      status?: WalletActivityStatus;
      tokenTicker: string;
      tokenName?: string | null;
      amount: number;
      amountUsd?: number;
      referenceId?: string | null;
      metadata?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
      createdAt?: Date;
    },
  ) {
    const normalizedTicker = this.normalizeTicker(input.tokenTicker);
    const normalizedTokenName = this.normalizeTokenName(
      input.tokenName ?? undefined,
    );
    const safeAmount = Number.isFinite(input.amount)
      ? Math.max(0, input.amount)
      : 0;
    const safeAmountUsd = Number.isFinite(input.amountUsd)
      ? Math.max(0, input.amountUsd ?? 0)
      : 0;

    const created = await tx.walletUserActivity.create({
      data: {
        userId: input.userId,
        walletAddress: input.walletAddress,
        network: input.network ?? 'mainnet',
        eventHash: createExplorerActivityHash(),
        type: input.type,
        status: input.status ?? WalletActivityStatus.COMPLETED,
        tokenTicker: normalizedTicker,
        tokenName: normalizedTokenName,
        amount: safeAmount,
        amountUsd: safeAmountUsd,
        referenceId: input.referenceId ?? null,
        metadata: input.metadata,
        createdAt: input.createdAt ?? new Date(),
      },
    });

    return created;
  }

  async getWalletAuthNonce(
    walletAddressInput: string,
    context: UsersRequestContext,
    proxyKey?: string,
  ): Promise<WalletAuthNoncePayload> {
    this.validateProxyKey(proxyKey);
    const walletAddress = normalizeWalletAddress(walletAddressInput);
    await this.consumeRateLimit(
      `users:wallet-auth-nonce:${context.requesterKey}:${walletAddress}`,
      WALLET_AUTH_NONCE_PER_MINUTE,
      60_000,
    );
    const runtimeSettings = await this.assertWalletConnectionsEnabled();
    return this.usersWalletAuthService.createWalletAuthNonce(
      walletAddress,
      runtimeSettings.network,
    );
  }

  async verifyWalletAuth(
    dto: VerifyWalletDto,
    context: UsersRequestContext,
    proxyKey?: string,
  ): Promise<WalletAuthVerifyPayload> {
    this.validateProxyKey(proxyKey);
    await this.assertWalletConnectionsEnabled();

    const walletAddress = normalizeWalletAddress(dto.walletAddress);
    await this.consumeRateLimit(
      `users:wallet-auth-verify:${context.requesterKey}:${walletAddress}`,
      WALLET_AUTH_VERIFY_PER_MINUTE,
      60_000,
    );
    return this.usersWalletAuthService.verifyWalletAuth(dto);
  }

  async startSession(
    dto: StartUserSessionDto,
    context: UsersRequestContext,
    authorization?: string,
    proxyKey?: string,
  ): Promise<StartUserSessionPayload> {
    this.validateProxyKey(proxyKey);
    const walletAddress = normalizeWalletAddress(dto.walletAddress);
    const headerRuntime = await this.assertWalletConnectionsEnabled();
    this.assertWalletAccessToken(authorization, walletAddress);
    const sessionKey = this.normalizeSessionKey(dto.sessionKey);

    await this.consumeRateLimit(
      `users:start:${context.requesterKey}:${walletAddress}`,
      40,
      60_000,
    );
    await this.usersWalletStateService.assertWalletNotBlocked(walletAddress);
    await this.usersOnlineStateService.finalizeStaleSessions();
    const resolvedCountry = await this.resolveCountryCode(context);

    const { user, isNew } = await this.usersWalletStateService.upsertWalletUser(
      walletAddress,
      context,
      resolvedCountry,
    );
    const raSettings = await this.loadRaRuntimeSettings();
    await this.syncUserTrackedOnchainBalances(
      user.id,
      walletAddress,
      headerRuntime.network,
      raSettings,
    );
    const now = new Date();

    let session = null as Prisma.WalletUserSessionGetPayload<object> | null;
    if (sessionKey) {
      const existingSession = await this.prisma.walletUserSession.findUnique({
        where: { sessionKey },
      });

      if (
        existingSession &&
        existingSession.userId === user.id &&
        !existingSession.endedAt
      ) {
        session = await this.prisma.walletUserSession.update({
          where: { id: existingSession.id },
          data: {
            network: headerRuntime.network,
            lastSeenAt: now,
            ipAddress: context.ipAddress ?? existingSession.ipAddress,
            countryCode: resolvedCountry ?? existingSession.countryCode,
            userAgent: context.userAgent ?? existingSession.userAgent,
            isOnline: true,
          },
        });
      }
    }

    if (!session) {
      session = await this.prisma.walletUserSession.create({
        data: {
          userId: user.id,
          network: headerRuntime.network,
          startedAt: now,
          lastSeenAt: now,
          ipAddress: context.ipAddress,
          countryCode: resolvedCountry,
          userAgent: context.userAgent,
          sessionKey,
          isOnline: true,
        },
      });
    }

    const onlineUserIds = await this.usersOnlineStateService.getOnlineUserIdSet(
      [user.id],
    );

    return {
      sessionId: session.id,
      sessionKey: session.sessionKey,
      isNewUser: isNew,
      user: toWalletUserSummary(user, onlineUserIds.has(user.id)),
    };
  }

  async heartbeatSession(
    dto: HeartbeatUserSessionDto,
    context: UsersRequestContext,
    authorization?: string,
    proxyKey?: string,
  ): Promise<HeartbeatUserSessionPayload> {
    this.validateProxyKey(proxyKey);
    const walletAddress = normalizeWalletAddress(dto.walletAddress);
    const headerRuntime = await this.assertWalletConnectionsEnabled();
    this.assertWalletAccessToken(authorization, walletAddress);

    await this.consumeRateLimit(
      `users:heartbeat:${context.requesterKey}:${walletAddress}`,
      240,
      60_000,
    );
    await this.usersOnlineStateService.finalizeStaleSessions();
    const resolvedCountry = await this.resolveCountryCode(context);

    const now = new Date();
    const existing = await this.prisma.walletUserSession.findFirst({
      where: {
        id: dto.sessionId,
        user: { walletAddress },
      },
      include: {
        user: true,
      },
    });

    if (!existing || existing.endedAt) {
      const fallback = await this.startSession(
        { walletAddress },
        context,
        authorization,
        proxyKey,
      );

      return {
        sessionId: fallback.sessionId,
        replacedSession: true,
        lastSeenAt: now.toISOString(),
      };
    }

    const syncedUser =
      await this.usersWalletStateService.syncWalletRoleAndBlockState(
        existing.user,
      );

    if (this.usersWalletStateService.isUserBlockedForAccess(syncedUser)) {
      const durationSeconds = Math.max(
        existing.durationSeconds,
        Math.floor((now.getTime() - existing.startedAt.getTime()) / 1000),
      );
      const durationDelta = Math.max(
        0,
        durationSeconds - existing.durationSeconds,
      );

      await this.prisma.$transaction(async (tx) => {
        await tx.walletUserSession.update({
          where: { id: existing.id },
          data: {
            isOnline: false,
            lastSeenAt: now,
            endedAt: now,
            durationSeconds,
          },
        });

        if (durationDelta > 0) {
          await tx.walletUser.update({
            where: { id: syncedUser.id },
            data: {
              totalSessionSeconds: { increment: durationDelta },
              lastSeenAt: now,
            },
          });
        }
      });

      throw new ForbiddenException(
        this.usersWalletStateService.getBlockedMessage(syncedUser),
      );
    }

    if (
      this.shouldSyncWalletOnchainBalances(
        existing.user.raOnchainBalanceUpdatedAt,
      )
    ) {
      const raSettings = await this.loadRaRuntimeSettings();
      await this.syncUserTrackedOnchainBalances(
        syncedUser.id,
        walletAddress,
        headerRuntime.network,
        raSettings,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.walletUserSession.update({
        where: { id: existing.id },
        data: {
          network: headerRuntime.network,
          isOnline: true,
          lastSeenAt: now,
          ipAddress: context.ipAddress ?? existing.ipAddress,
          countryCode: resolvedCountry ?? existing.countryCode,
          userAgent: context.userAgent ?? existing.userAgent,
        },
      });

      await tx.walletUser.update({
        where: { id: syncedUser.id },
        data: {
          lastSeenAt: now,
          lastSeenIp: context.ipAddress ?? syncedUser.lastSeenIp,
          lastSeenCountry: resolvedCountry ?? syncedUser.lastSeenCountry,
        },
      });
    });

    return {
      sessionId: existing.id,
      replacedSession: false,
      lastSeenAt: now.toISOString(),
    };
  }

  async endSession(
    dto: EndUserSessionDto,
    context: UsersRequestContext,
    authorization?: string,
    proxyKey?: string,
  ): Promise<EndUserSessionPayload> {
    this.validateProxyKey(proxyKey);
    const walletAddress = normalizeWalletAddress(dto.walletAddress);
    this.assertWalletAccessToken(authorization, walletAddress);

    await this.consumeRateLimit(
      `users:end:${context.requesterKey}:${walletAddress}`,
      80,
      60_000,
    );
    const resolvedCountry = await this.resolveCountryCode(context);

    const now = new Date();
    const session = await this.prisma.walletUserSession.findFirst({
      where: {
        id: dto.sessionId,
        user: { walletAddress },
      },
      include: {
        user: true,
      },
    });

    if (!session) {
      return {
        sessionId: dto.sessionId,
        closed: false,
        durationSeconds: 0,
        totalSessionSeconds: 0,
        endedAt: now.toISOString(),
      };
    }

    if (session.endedAt) {
      return {
        sessionId: session.id,
        closed: false,
        durationSeconds: session.durationSeconds,
        totalSessionSeconds: session.user.totalSessionSeconds,
        endedAt: session.endedAt.toISOString(),
      };
    }

    const durationSeconds = Math.max(
      session.durationSeconds,
      Math.floor((now.getTime() - session.startedAt.getTime()) / 1000),
    );
    const durationDelta = Math.max(
      0,
      durationSeconds - session.durationSeconds,
    );

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      await tx.walletUserSession.update({
        where: { id: session.id },
        data: {
          isOnline: false,
          lastSeenAt: now,
          endedAt: now,
          durationSeconds,
          ipAddress: context.ipAddress ?? session.ipAddress,
          countryCode: resolvedCountry ?? session.countryCode,
          userAgent: context.userAgent ?? session.userAgent,
        },
      });

      return tx.walletUser.update({
        where: { id: session.user.id },
        data: {
          lastSeenAt: now,
          lastSeenIp: context.ipAddress ?? session.user.lastSeenIp,
          lastSeenCountry: resolvedCountry ?? session.user.lastSeenCountry,
          totalSessionSeconds: durationDelta
            ? { increment: durationDelta }
            : undefined,
        },
      });
    });

    return {
      sessionId: session.id,
      closed: true,
      durationSeconds,
      totalSessionSeconds: updatedUser.totalSessionSeconds,
      endedAt: now.toISOString(),
    };
  }

  async previewWalletConvert(
    dto: PreviewWalletConvertDto,
    context: UsersRequestContext,
    authorization?: string,
    proxyKey?: string,
  ): Promise<WalletConvertPreviewPayload> {
    return this.usersConvertService.previewWalletConvert({
      dto,
      context,
      authorization,
      proxyKey,
      deps: {
        validateProxyKey: (value) => this.validateProxyKey(value),
        assertWalletConnectionsEnabled: () =>
          this.assertWalletConnectionsEnabled(),
        assertWalletAccessToken: (value, walletAddress) =>
          this.assertWalletAccessToken(value, walletAddress),
        consumeRateLimit: (key, limit, windowMs) =>
          this.consumeRateLimit(key, limit, windowMs),
        resolveCountryCode: (requestContext) =>
          this.resolveCountryCode(requestContext),
        loadRaRuntimeSettings: (force) => this.loadRaRuntimeSettings(force),
        normalizeConvertTokenTickers: (tokens) =>
          this.normalizeConvertTokenTickers(tokens),
        listWalletConvertCandidates: (input) =>
          this.listWalletConvertCandidates(input),
        getSolanaConnection: (network) => this.getSolanaConnection(network),
        buildVersionedTransactionBase64: (input) =>
          this.buildVersionedTransactionBase64(input),
        buildRaydiumSwapTransactions: (input) =>
          this.buildRaydiumSwapTransactions(input),
        buildPreparedMessageHash: (transactionBase64) =>
          this.buildPreparedMessageHash(transactionBase64),
        resolveRaMintTarget: (network, settings) =>
          this.resolveRaMintTarget(network, settings),
        getTokenAccountUiBalance: (connection, tokenAccountAddress) =>
          this.getTokenAccountUiBalance(connection, tokenAccountAddress),
        bigintToBase58Signature: (signatureBytes) =>
          this.bigintToBase58Signature(signatureBytes),
        resolveRaPriceUsd: (settings, network) =>
          this.resolveRaPriceUsd(settings, network),
        createWalletActivityRecord: (tx, input) =>
          this.createWalletActivityRecord(tx, input),
        syncUserTrackedOnchainBalances: (
          userId,
          walletAddress,
          network,
          settings,
        ) =>
          this.syncUserTrackedOnchainBalances(
            userId,
            walletAddress,
            network,
            settings,
          ),
      },
    });
  }

  async prepareWalletConvert(
    dto: PrepareWalletConvertDto,
    context: UsersRequestContext,
    authorization?: string,
    proxyKey?: string,
  ): Promise<WalletConvertPreparationPayload> {
    return this.usersConvertService.prepareWalletConvert({
      dto,
      context,
      authorization,
      proxyKey,
      deps: {
        validateProxyKey: (value) => this.validateProxyKey(value),
        assertWalletConnectionsEnabled: () =>
          this.assertWalletConnectionsEnabled(),
        assertWalletAccessToken: (value, walletAddress) =>
          this.assertWalletAccessToken(value, walletAddress),
        consumeRateLimit: (key, limit, windowMs) =>
          this.consumeRateLimit(key, limit, windowMs),
        resolveCountryCode: (requestContext) =>
          this.resolveCountryCode(requestContext),
        loadRaRuntimeSettings: (force) => this.loadRaRuntimeSettings(force),
        normalizeConvertTokenTickers: (tokens) =>
          this.normalizeConvertTokenTickers(tokens),
        listWalletConvertCandidates: (input) =>
          this.listWalletConvertCandidates(input),
        getSolanaConnection: (network) => this.getSolanaConnection(network),
        buildVersionedTransactionBase64: (input) =>
          this.buildVersionedTransactionBase64(input),
        buildRaydiumSwapTransactions: (input) =>
          this.buildRaydiumSwapTransactions(input),
        buildPreparedMessageHash: (transactionBase64) =>
          this.buildPreparedMessageHash(transactionBase64),
        resolveRaMintTarget: (network, settings) =>
          this.resolveRaMintTarget(network, settings),
        getTokenAccountUiBalance: (connection, tokenAccountAddress) =>
          this.getTokenAccountUiBalance(connection, tokenAccountAddress),
        bigintToBase58Signature: (signatureBytes) =>
          this.bigintToBase58Signature(signatureBytes),
        resolveRaPriceUsd: (settings, network) =>
          this.resolveRaPriceUsd(settings, network),
        createWalletActivityRecord: (tx, input) =>
          this.createWalletActivityRecord(tx, input),
        syncUserTrackedOnchainBalances: (
          userId,
          walletAddress,
          network,
          settings,
        ) =>
          this.syncUserTrackedOnchainBalances(
            userId,
            walletAddress,
            network,
            settings,
          ),
      },
    });
  }

  async executeWalletConvert(
    dto: ExecuteWalletConvertDto,
    context: UsersRequestContext,
    authorization?: string,
    proxyKey?: string,
  ): Promise<WalletConvertExecutionPayload> {
    return this.usersConvertService.executeWalletConvert({
      dto,
      context,
      authorization,
      proxyKey,
      deps: {
        validateProxyKey: (value) => this.validateProxyKey(value),
        assertWalletConnectionsEnabled: () =>
          this.assertWalletConnectionsEnabled(),
        assertWalletAccessToken: (value, walletAddress) =>
          this.assertWalletAccessToken(value, walletAddress),
        consumeRateLimit: (key, limit, windowMs) =>
          this.consumeRateLimit(key, limit, windowMs),
        resolveCountryCode: (requestContext) =>
          this.resolveCountryCode(requestContext),
        loadRaRuntimeSettings: (force) => this.loadRaRuntimeSettings(force),
        normalizeConvertTokenTickers: (tokens) =>
          this.normalizeConvertTokenTickers(tokens),
        listWalletConvertCandidates: (input) =>
          this.listWalletConvertCandidates(input),
        getSolanaConnection: (network) => this.getSolanaConnection(network),
        buildVersionedTransactionBase64: (input) =>
          this.buildVersionedTransactionBase64(input),
        buildRaydiumSwapTransactions: (input) =>
          this.buildRaydiumSwapTransactions(input),
        buildPreparedMessageHash: (transactionBase64) =>
          this.buildPreparedMessageHash(transactionBase64),
        resolveRaMintTarget: (network, settings) =>
          this.resolveRaMintTarget(network, settings),
        getTokenAccountUiBalance: (connection, tokenAccountAddress) =>
          this.getTokenAccountUiBalance(connection, tokenAccountAddress),
        bigintToBase58Signature: (signatureBytes) =>
          this.bigintToBase58Signature(signatureBytes),
        resolveRaPriceUsd: (settings, network) =>
          this.resolveRaPriceUsd(settings, network),
        createWalletActivityRecord: (tx, input) =>
          this.createWalletActivityRecord(tx, input),
        syncUserTrackedOnchainBalances: (
          userId,
          walletAddress,
          network,
          settings,
        ) =>
          this.syncUserTrackedOnchainBalances(
            userId,
            walletAddress,
            network,
            settings,
          ),
      },
    });
  }

  async createStakePosition(
    dto: CreateUserStakePositionDto,
    context: UsersRequestContext,
    authorization?: string,
    proxyKey?: string,
  ): Promise<WalletStakePositionPayload> {
    return this.usersStakingService.createStakePosition({
      dto,
      context,
      authorization,
      proxyKey,
      deps: {
        validateProxyKey: (value) => this.validateProxyKey(value),
        assertWalletConnectionsEnabled: () =>
          this.assertWalletConnectionsEnabled(),
        assertWalletAccessToken: (value, walletAddress) =>
          this.assertWalletAccessToken(value, walletAddress),
        consumeRateLimit: (key, limit, windowMs) =>
          this.consumeRateLimit(key, limit, windowMs),
        resolveCountryCode: (requestContext) =>
          this.resolveCountryCode(requestContext),
        loadRaRuntimeSettings: () => this.loadRaRuntimeSettings(),
        resolveRaPriceUsd: (settings, network) =>
          this.resolveRaPriceUsd(settings, network),
        resolveStakeTokenPriceUsd: (input) =>
          this.resolveStakeTokenPriceUsd(input),
        syncUserTrackedOnchainBalances: (
          userId,
          walletAddress,
          network,
          settings,
        ) =>
          this.syncUserTrackedOnchainBalances(
            userId,
            walletAddress,
            network,
            settings,
          ),
        calculateFeeUsd: (amountUsd, feeBps) =>
          this.calculateFeeUsd(amountUsd, feeBps),
        normalizeTicker: (value) => this.normalizeTicker(value),
        normalizePeriodLabel: (value) => this.normalizePeriodLabel(value),
        normalizeTokenName: (value) => this.normalizeTokenName(value),
        createWalletActivityRecord: (tx, input) =>
          this.createWalletActivityRecord(tx, input),
        getSolanaConnection: (network) => this.getSolanaConnection(network),
        buildVersionedTransactionBase64: (input) =>
          this.buildVersionedTransactionBase64(input),
      },
    });
  }

  async previewStakePosition(
    dto: PreviewWalletStakeDto,
    context: UsersRequestContext,
    authorization?: string,
    proxyKey?: string,
  ): Promise<WalletStakeQuotePayload> {
    return this.usersStakingService.previewStakePosition({
      dto,
      context,
      authorization,
      proxyKey,
      deps: {
        validateProxyKey: (value) => this.validateProxyKey(value),
        assertWalletConnectionsEnabled: () =>
          this.assertWalletConnectionsEnabled(),
        assertWalletAccessToken: (value, walletAddress) =>
          this.assertWalletAccessToken(value, walletAddress),
        consumeRateLimit: (key, limit, windowMs) =>
          this.consumeRateLimit(key, limit, windowMs),
        resolveCountryCode: (requestContext) =>
          this.resolveCountryCode(requestContext),
        loadRaRuntimeSettings: () => this.loadRaRuntimeSettings(),
        resolveRaPriceUsd: (settings, network) =>
          this.resolveRaPriceUsd(settings, network),
        resolveStakeTokenPriceUsd: (input) =>
          this.resolveStakeTokenPriceUsd(input),
        syncUserTrackedOnchainBalances: (
          userId,
          walletAddress,
          network,
          settings,
        ) =>
          this.syncUserTrackedOnchainBalances(
            userId,
            walletAddress,
            network,
            settings,
          ),
        calculateFeeUsd: (amountUsd, feeBps) =>
          this.calculateFeeUsd(amountUsd, feeBps),
        normalizeTicker: (value) => this.normalizeTicker(value),
        normalizePeriodLabel: (value) => this.normalizePeriodLabel(value),
        normalizeTokenName: (value) => this.normalizeTokenName(value),
        createWalletActivityRecord: (tx, input) =>
          this.createWalletActivityRecord(tx, input),
        getSolanaConnection: (network) => this.getSolanaConnection(network),
        buildVersionedTransactionBase64: (input) =>
          this.buildVersionedTransactionBase64(input),
      },
    });
  }

  async prepareStakePosition(
    dto: PrepareWalletStakeDto,
    context: UsersRequestContext,
    authorization?: string,
    proxyKey?: string,
  ): Promise<WalletStakePreparationPayload> {
    return this.usersStakingService.prepareStakePosition({
      dto,
      context,
      authorization,
      proxyKey,
      deps: {
        validateProxyKey: (value) => this.validateProxyKey(value),
        assertWalletConnectionsEnabled: () =>
          this.assertWalletConnectionsEnabled(),
        assertWalletAccessToken: (value, walletAddress) =>
          this.assertWalletAccessToken(value, walletAddress),
        consumeRateLimit: (key, limit, windowMs) =>
          this.consumeRateLimit(key, limit, windowMs),
        resolveCountryCode: (requestContext) =>
          this.resolveCountryCode(requestContext),
        loadRaRuntimeSettings: () => this.loadRaRuntimeSettings(),
        resolveRaPriceUsd: (settings, network) =>
          this.resolveRaPriceUsd(settings, network),
        resolveStakeTokenPriceUsd: (input) =>
          this.resolveStakeTokenPriceUsd(input),
        syncUserTrackedOnchainBalances: (
          userId,
          walletAddress,
          network,
          settings,
        ) =>
          this.syncUserTrackedOnchainBalances(
            userId,
            walletAddress,
            network,
            settings,
          ),
        calculateFeeUsd: (amountUsd, feeBps) =>
          this.calculateFeeUsd(amountUsd, feeBps),
        normalizeTicker: (value) => this.normalizeTicker(value),
        normalizePeriodLabel: (value) => this.normalizePeriodLabel(value),
        normalizeTokenName: (value) => this.normalizeTokenName(value),
        createWalletActivityRecord: (tx, input) =>
          this.createWalletActivityRecord(tx, input),
        getSolanaConnection: (network) => this.getSolanaConnection(network),
        buildVersionedTransactionBase64: (input) =>
          this.buildVersionedTransactionBase64(input),
      },
    });
  }

  async executeStakePosition(
    dto: ExecuteWalletStakeDto,
    context: UsersRequestContext,
    authorization?: string,
    proxyKey?: string,
  ): Promise<WalletStakeExecutionPayload> {
    return this.usersStakingService.executeStakePosition({
      dto,
      context,
      authorization,
      proxyKey,
      deps: {
        validateProxyKey: (value) => this.validateProxyKey(value),
        assertWalletConnectionsEnabled: () =>
          this.assertWalletConnectionsEnabled(),
        assertWalletAccessToken: (value, walletAddress) =>
          this.assertWalletAccessToken(value, walletAddress),
        consumeRateLimit: (key, limit, windowMs) =>
          this.consumeRateLimit(key, limit, windowMs),
        resolveCountryCode: (requestContext) =>
          this.resolveCountryCode(requestContext),
        loadRaRuntimeSettings: () => this.loadRaRuntimeSettings(),
        resolveRaPriceUsd: (settings, network) =>
          this.resolveRaPriceUsd(settings, network),
        resolveStakeTokenPriceUsd: (input) =>
          this.resolveStakeTokenPriceUsd(input),
        syncUserTrackedOnchainBalances: (
          userId,
          walletAddress,
          network,
          settings,
        ) =>
          this.syncUserTrackedOnchainBalances(
            userId,
            walletAddress,
            network,
            settings,
          ),
        calculateFeeUsd: (amountUsd, feeBps) =>
          this.calculateFeeUsd(amountUsd, feeBps),
        normalizeTicker: (value) => this.normalizeTicker(value),
        normalizePeriodLabel: (value) => this.normalizePeriodLabel(value),
        normalizeTokenName: (value) => this.normalizeTokenName(value),
        createWalletActivityRecord: (tx, input) =>
          this.createWalletActivityRecord(tx, input),
        getSolanaConnection: (network) => this.getSolanaConnection(network),
        buildVersionedTransactionBase64: (input) =>
          this.buildVersionedTransactionBase64(input),
      },
    });
  }

  async claimStakePosition(
    stakePositionId: string,
    dto: ClaimUserStakePositionDto,
    context: UsersRequestContext,
    authorization?: string,
    proxyKey?: string,
  ): Promise<WalletStakePositionPayload> {
    return this.usersStakingService.claimStakePosition({
      stakePositionId,
      dto,
      context,
      authorization,
      proxyKey,
      deps: {
        validateProxyKey: (value) => this.validateProxyKey(value),
        assertWalletConnectionsEnabled: () =>
          this.assertWalletConnectionsEnabled(),
        assertWalletAccessToken: (value, walletAddress) =>
          this.assertWalletAccessToken(value, walletAddress),
        consumeRateLimit: (key, limit, windowMs) =>
          this.consumeRateLimit(key, limit, windowMs),
        resolveCountryCode: (requestContext) =>
          this.resolveCountryCode(requestContext),
        loadRaRuntimeSettings: () => this.loadRaRuntimeSettings(),
        resolveRaPriceUsd: (settings, network) =>
          this.resolveRaPriceUsd(settings, network),
        resolveStakeTokenPriceUsd: (input) =>
          this.resolveStakeTokenPriceUsd(input),
        syncUserTrackedOnchainBalances: (
          userId,
          walletAddress,
          network,
          settings,
        ) =>
          this.syncUserTrackedOnchainBalances(
            userId,
            walletAddress,
            network,
            settings,
          ),
        calculateFeeUsd: (amountUsd, feeBps) =>
          this.calculateFeeUsd(amountUsd, feeBps),
        normalizeTicker: (value) => this.normalizeTicker(value),
        normalizePeriodLabel: (value) => this.normalizePeriodLabel(value),
        normalizeTokenName: (value) => this.normalizeTokenName(value),
        createWalletActivityRecord: (tx, input) =>
          this.createWalletActivityRecord(tx, input),
        getSolanaConnection: (network) => this.getSolanaConnection(network),
        buildVersionedTransactionBase64: (input) =>
          this.buildVersionedTransactionBase64(input),
      },
    });
  }

  async prepareClaimStakePosition(
    stakePositionId: string,
    dto: PrepareWalletClaimDto,
    context: UsersRequestContext,
    authorization?: string,
    proxyKey?: string,
  ): Promise<WalletClaimPreparationPayload> {
    return this.usersStakingService.prepareClaimStakePosition({
      stakePositionId,
      dto,
      context,
      authorization,
      proxyKey,
      deps: {
        validateProxyKey: (value) => this.validateProxyKey(value),
        assertWalletConnectionsEnabled: () =>
          this.assertWalletConnectionsEnabled(),
        assertWalletAccessToken: (value, walletAddress) =>
          this.assertWalletAccessToken(value, walletAddress),
        consumeRateLimit: (key, limit, windowMs) =>
          this.consumeRateLimit(key, limit, windowMs),
        resolveCountryCode: (requestContext) =>
          this.resolveCountryCode(requestContext),
        loadRaRuntimeSettings: () => this.loadRaRuntimeSettings(),
        resolveRaPriceUsd: (settings, network) =>
          this.resolveRaPriceUsd(settings, network),
        resolveStakeTokenPriceUsd: (input) =>
          this.resolveStakeTokenPriceUsd(input),
        syncUserTrackedOnchainBalances: (
          userId,
          walletAddress,
          network,
          settings,
        ) =>
          this.syncUserTrackedOnchainBalances(
            userId,
            walletAddress,
            network,
            settings,
          ),
        calculateFeeUsd: (amountUsd, feeBps) =>
          this.calculateFeeUsd(amountUsd, feeBps),
        normalizeTicker: (value) => this.normalizeTicker(value),
        normalizePeriodLabel: (value) => this.normalizePeriodLabel(value),
        normalizeTokenName: (value) => this.normalizeTokenName(value),
        createWalletActivityRecord: (tx, input) =>
          this.createWalletActivityRecord(tx, input),
        getSolanaConnection: (network) => this.getSolanaConnection(network),
        buildVersionedTransactionBase64: (input) =>
          this.buildVersionedTransactionBase64(input),
      },
    });
  }

  async executeClaimStakePosition(
    stakePositionId: string,
    dto: ExecuteWalletClaimDto,
    context: UsersRequestContext,
    authorization?: string,
    proxyKey?: string,
  ): Promise<WalletClaimExecutionPayload> {
    return this.usersStakingService.executeClaimStakePosition({
      stakePositionId,
      dto,
      context,
      authorization,
      proxyKey,
      deps: {
        validateProxyKey: (value) => this.validateProxyKey(value),
        assertWalletConnectionsEnabled: () =>
          this.assertWalletConnectionsEnabled(),
        assertWalletAccessToken: (value, walletAddress) =>
          this.assertWalletAccessToken(value, walletAddress),
        consumeRateLimit: (key, limit, windowMs) =>
          this.consumeRateLimit(key, limit, windowMs),
        resolveCountryCode: (requestContext) =>
          this.resolveCountryCode(requestContext),
        loadRaRuntimeSettings: () => this.loadRaRuntimeSettings(),
        resolveRaPriceUsd: (settings, network) =>
          this.resolveRaPriceUsd(settings, network),
        resolveStakeTokenPriceUsd: (input) =>
          this.resolveStakeTokenPriceUsd(input),
        syncUserTrackedOnchainBalances: (
          userId,
          walletAddress,
          network,
          settings,
        ) =>
          this.syncUserTrackedOnchainBalances(
            userId,
            walletAddress,
            network,
            settings,
          ),
        calculateFeeUsd: (amountUsd, feeBps) =>
          this.calculateFeeUsd(amountUsd, feeBps),
        normalizeTicker: (value) => this.normalizeTicker(value),
        normalizePeriodLabel: (value) => this.normalizePeriodLabel(value),
        normalizeTokenName: (value) => this.normalizeTokenName(value),
        createWalletActivityRecord: (tx, input) =>
          this.createWalletActivityRecord(tx, input),
        getSolanaConnection: (network) => this.getSolanaConnection(network),
        buildVersionedTransactionBase64: (input) =>
          this.buildVersionedTransactionBase64(input),
      },
    });
  }

  async createWalletActivity(
    dto: CreateWalletActivityDto,
    context: UsersRequestContext,
    authorization?: string,
    proxyKey?: string,
  ): Promise<WalletExplorerActivityPayload> {
    this.validateProxyKey(proxyKey);

    const walletAddress = normalizeWalletAddress(dto.walletAddress);
    const headerRuntime = await this.assertWalletConnectionsEnabled();
    this.assertWalletAccessToken(authorization, walletAddress);

    await this.consumeRateLimit(
      `users:activity:${context.requesterKey}:${walletAddress}`,
      120,
      60_000,
    );
    await this.usersWalletStateService.assertWalletNotBlocked(walletAddress);

    const type = this.normalizeExplorerActivityType(dto.type);
    if (!MANUAL_EXPLORER_ACTIVITY_TYPES.has(type)) {
      throw new ForbiddenException(
        'Only DEPOSIT, WITHDRAW and CONVERT can be created directly.',
      );
    }

    const tokenTicker = this.normalizeTicker(dto.tokenTicker);
    const tokenNameInput = this.normalizeTokenName(dto.tokenName);
    const marketToken = await this.prisma.marketToken.findUnique({
      where: { ticker: tokenTicker },
      select: { name: true, price: true },
    });
    const tokenName = marketToken?.name ?? tokenNameInput;
    const status = this.normalizeExplorerActivityStatus(dto.status);
    const amount = Number.isFinite(dto.amount) ? Math.max(0, dto.amount) : 0;
    const tokenPriceUsd = Math.max(0, toNumber(marketToken?.price));
    const amountUsd = Math.max(0, amount * tokenPriceUsd);
    const resolvedCountry = await this.resolveCountryCode(context);

    const { user } = await this.usersWalletStateService.upsertWalletUser(
      walletAddress,
      context,
      resolvedCountry,
    );
    const raSettings = await this.loadRaRuntimeSettings();
    const raPriceUsd = await this.resolveRaPriceUsd(
      raSettings,
      headerRuntime.network,
    );
    await this.syncUserTrackedOnchainBalances(
      user.id,
      walletAddress,
      headerRuntime.network,
      raSettings,
    );

    if (type === WalletActivityType.CONVERT) {
      if (amountUsd < raSettings.convertMinUsd) {
        throw new BadRequestException(
          `Convert minimum is $${raSettings.convertMinUsd.toFixed(2)} per item.`,
        );
      }
      if (amountUsd > raSettings.convertMaxUsd) {
        throw new BadRequestException(
          `Convert maximum is $${raSettings.convertMaxUsd.toFixed(2)} per item.`,
        );
      }
    }

    const feeBps = 0;
    const feeUsd = this.calculateFeeUsd(amountUsd, feeBps);
    const feeRa = raPriceUsd > 0 ? feeUsd / raPriceUsd : 0;
    const now = new Date();

    const created = await this.prisma.$transaction(async (tx) => {
      const activity = await this.createWalletActivityRecord(tx, {
        userId: user.id,
        walletAddress,
        network: headerRuntime.network,
        type,
        status,
        tokenTicker,
        tokenName,
        amount,
        amountUsd,
        metadata: {
          source: 'manual',
          feeBps,
          feeUsd,
          feeRa,
          raPriceUsd,
          treasuryAddress:
            headerRuntime.network === 'mainnet'
              ? raSettings.treasuryMainnet
              : raSettings.treasuryDevnet,
          oracleProvider: raSettings.oraclePrimary,
          raModelVersion: 1,
        },
        createdAt: now,
      });

      await tx.walletUser.update({
        where: { id: user.id },
        data: {
          lastSeenAt: now,
          lastSeenIp: context.ipAddress ?? user.lastSeenIp,
          lastSeenCountry: resolvedCountry ?? user.lastSeenCountry,
        },
      });

      return activity;
    });

    return toExplorerActivityPayload(created);
  }

  async listExplorerFeed(
    context: UsersRequestContext,
    params?: {
      search?: string;
      type?: string;
      limit?: number;
      cursor?: string;
    },
    proxyKey?: string,
  ): Promise<WalletExplorerFeedPayload> {
    this.validateProxyKey(proxyKey);

    await this.consumeRateLimit(
      `users:explorer-feed:${context.requesterKey}`,
      240,
      60_000,
    );
    await this.usersOnlineStateService.finalizeStaleSessions();

    const rawLimit = params?.limit ?? EXPLORER_FEED_DEFAULT_LIMIT;
    const safeLimit = Math.min(
      EXPLORER_FEED_MAX_LIMIT,
      Math.max(1, Math.trunc(rawLimit)),
    );
    const search = params?.search?.trim().slice(0, 120) ?? '';
    const typeFilter = params?.type
      ? this.normalizeExplorerActivityType(params.type)
      : null;
    const decodedCursor = this.decodeExplorerFeedCursor(params?.cursor ?? null);

    const whereClauses: Prisma.WalletUserActivityWhereInput[] = [];
    if (typeFilter) {
      whereClauses.push({ type: typeFilter });
    }
    if (search) {
      whereClauses.push({
        OR: [
          { walletAddress: { contains: search, mode: 'insensitive' } },
          { tokenTicker: { contains: search, mode: 'insensitive' } },
          { tokenName: { contains: search, mode: 'insensitive' } },
          { eventHash: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (decodedCursor) {
      whereClauses.push({
        OR: [
          { createdAt: { lt: decodedCursor.createdAt } },
          {
            AND: [
              { createdAt: decodedCursor.createdAt },
              { id: { lt: decodedCursor.id } },
            ],
          },
        ],
      });
    }

    const where: Prisma.WalletUserActivityWhereInput =
      whereClauses.length > 0 ? { AND: whereClauses } : {};

    const rows = await this.prisma.walletUserActivity.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: safeLimit + 1,
      select: {
        id: true,
        eventHash: true,
        type: true,
        status: true,
        walletAddress: true,
        tokenTicker: true,
        tokenName: true,
        amount: true,
        amountUsd: true,
        createdAt: true,
      },
    });

    const hasMore = rows.length > safeLimit;
    const pageRows = hasMore ? rows.slice(0, safeLimit) : rows;
    const nextCursor = hasMore
      ? this.encodeExplorerFeedCursor({
          createdAt: pageRows[pageRows.length - 1].createdAt,
          id: pageRows[pageRows.length - 1].id,
        })
      : null;

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const onlineCutoff = this.usersOnlineStateService.getOnlineCutoffDate();

    const [
      totalTransactions,
      last24hTransactions,
      volumeAggregate,
      onlineRows,
    ] = await Promise.all([
      this.prisma.walletUserActivity.count(),
      this.prisma.walletUserActivity.count({
        where: { createdAt: { gte: last24h } },
      }),
      this.prisma.walletUserActivity.aggregate({
        _sum: { amountUsd: true },
      }),
      this.prisma.walletUserSession.findMany({
        where: {
          isOnline: true,
          endedAt: null,
          lastSeenAt: { gte: onlineCutoff },
        },
        distinct: ['userId'],
        select: { userId: true },
      }),
    ]);

    return {
      items: pageRows.map((row) => toExplorerActivityPayload(row)),
      nextCursor,
      stats: {
        totalTransactions,
        last24hTransactions,
        totalVolumeUsd: toNumber(volumeAggregate._sum.amountUsd),
        activeUsers: onlineRows.length,
        generatedAt: now.toISOString(),
      },
    };
  }

  async getMetrics(proxyKey?: string): Promise<WalletUsersMetricsPayload> {
    this.validateProxyKey(proxyKey);
    await this.usersOnlineStateService.finalizeStaleSessions();

    const now = new Date();
    const onlineCutoff = this.usersOnlineStateService.getOnlineCutoffDate();
    const active24hCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers24h,
      totalStakePositions,
      activeStakePositions,
      totalStakedAmountUsdAggregate,
      onlineSessionRows,
      averageSessionAggregate,
      topCountries,
    ] = await Promise.all([
      this.prisma.walletUser.count(),
      this.prisma.walletUser.count({
        where: {
          lastSeenAt: { gte: active24hCutoff },
        },
      }),
      this.prisma.walletStakePosition.count(),
      this.prisma.walletStakePosition.count({
        where: { status: StakePositionStatus.ACTIVE },
      }),
      this.prisma.walletStakePosition.aggregate({
        where: { status: StakePositionStatus.ACTIVE },
        _sum: { amountUsd: true },
      }),
      this.prisma.walletUserSession.findMany({
        where: {
          isOnline: true,
          endedAt: null,
          lastSeenAt: { gte: onlineCutoff },
        },
        distinct: ['userId'],
        select: { userId: true },
      }),
      this.prisma.walletUser.aggregate({
        _avg: { totalSessionSeconds: true },
      }),
      this.prisma.walletUser.groupBy({
        by: ['lastSeenCountry'],
        where: {
          lastSeenCountry: { not: null },
        },
        _count: {
          _all: true,
        },
        orderBy: {
          _count: {
            lastSeenCountry: 'desc',
          },
        },
        take: 5,
      }),
    ]);

    return {
      totalUsers,
      onlineUsers: onlineSessionRows.length,
      activeUsers24h,
      totalStakePositions,
      activeStakePositions,
      totalStakedAmountUsd: toNumber(
        totalStakedAmountUsdAggregate._sum.amountUsd,
      ),
      averageSessionSeconds: Math.round(
        averageSessionAggregate._avg.totalSessionSeconds ?? 0,
      ),
      topCountries: topCountries.map((entry) => ({
        country: entry.lastSeenCountry ?? 'UN',
        users: entry._count._all,
      })),
      generatedAt: now.toISOString(),
    };
  }

  async getWalletProfile(
    walletAddressInput: string,
    requesterKey?: string,
    authorization?: string,
    proxyKey?: string,
  ): Promise<WalletUserProfilePayload> {
    this.validateProxyKey(proxyKey);
    const headerRuntime = await this.assertWalletConnectionsEnabled();
    const walletAddress = normalizeWalletAddress(walletAddressInput);
    this.assertWalletAccessToken(authorization, walletAddress);
    await this.usersWalletStateService.assertWalletNotBlocked(walletAddress);
    const network = headerRuntime.network;

    await this.consumeRateLimit(
      `users:profile:${requesterKey ?? 'unknown'}:${walletAddress}`,
      80,
      60_000,
    );
    await this.usersOnlineStateService.finalizeStaleSessions();

    const user = await this.prisma.walletUser.findUnique({
      where: { walletAddress },
      include: {
        stakePositions: {
          where: { network },
          orderBy: { startedAt: 'desc' },
          take: 300,
        },
      },
    });

    const resolvedRole =
      await this.usersWalletStateService.resolveWalletRole(walletAddress);
    if (!user) {
      return {
        walletAddress,
        exists: false,
        role: resolvedRole,
        isBlocked: false,
        availableBalance: 0,
        stakedBalance: 0,
        totalEarned: 0,
        totalEarnedUsd: 0,
        portfolioValue: 0,
        portfolioChange: 0,
        activeStakings: [],
        transactions: [],
        portfolio: [],
      };
    }

    const syncedUser =
      await this.usersWalletStateService.syncWalletRoleAndBlockState(user);
    const isBlocked =
      this.usersWalletStateService.isUserBlockedForAccess(syncedUser);
    const raSettings = await this.loadRaRuntimeSettings();
    const walletActivities = await this.prisma.walletUserActivity.findMany({
      where: {
        userId: syncedUser.id,
        network,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 250,
      select: {
        id: true,
        type: true,
        status: true,
        amount: true,
        tokenTicker: true,
        createdAt: true,
      },
    });
    let onchainRaBalance = Math.max(0, toNumber(syncedUser.raOnchainBalance));

    if (
      this.shouldSyncWalletOnchainBalances(syncedUser.raOnchainBalanceUpdatedAt)
    ) {
      onchainRaBalance = await this.syncUserTrackedOnchainBalances(
        syncedUser.id,
        walletAddress,
        network,
        raSettings,
      );
    }

    const tokenHoldings = await this.prisma.walletTokenHolding.findMany({
      where: {
        userId: syncedUser.id,
        network,
      },
      orderBy: [{ updatedAt: 'desc' }],
    });
    const now = Date.now();
    const activePositions = user.stakePositions
      .filter((position) => position.status === StakePositionStatus.ACTIVE)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    const claimedPositions = user.stakePositions.filter(
      (position) => position.status === StakePositionStatus.CLAIMED,
    );

    const tokenTickers = new Set<string>([
      DEFAULT_RA_TOKEN_SYMBOL,
      raSettings.tokenSymbol,
    ]);
    for (const position of activePositions) {
      tokenTickers.add(position.tokenTicker.toUpperCase());
    }
    for (const holding of tokenHoldings) {
      tokenTickers.add(holding.ticker.toUpperCase());
    }

    const marketTokens = await this.prisma.marketToken.findMany({
      where: {
        ticker: {
          in: Array.from(tokenTickers),
        },
      },
      select: {
        ticker: true,
        name: true,
        price: true,
        chg24h: true,
        icon: true,
        isImage: true,
        mintAddress: true,
      },
    });
    const marketByTicker = new Map(
      marketTokens.map((token) => [token.ticker.toUpperCase(), token]),
    );
    const marketByMint = new Map(
      marketTokens
        .map((token) => {
          const mint = this.resolveTrackedMintAddress(token);
          if (!mint) return null;
          return [mint.toLowerCase(), token] as const;
        })
        .filter(
          (entry): entry is readonly [string, (typeof marketTokens)[number]] =>
            Boolean(entry),
        ),
    );
    const liveSnapshotsByMint = await this.getLiveMarketSnapshotsByMints(
      tokenHoldings.map((holding) => holding.mintAddress),
    );
    const resolvedRaMint = this.resolveRaMintForNetwork(network, raSettings);
    const normalizedRaMintKey = (
      this.normalizeMintAddress(resolvedRaMint) ?? resolvedRaMint
    ).toLowerCase();
    const raMarketToken =
      marketByMint.get(normalizedRaMintKey) ??
      marketByTicker.get(raSettings.tokenSymbol) ??
      marketByTicker.get(DEFAULT_RA_TOKEN_SYMBOL);
    const raLiveSnapshot = liveSnapshotsByMint.get(normalizedRaMintKey);
    let raPriceUsd = 0;
    try {
      raPriceUsd = await this.resolveRaPriceUsd(raSettings, network);
    } catch {
      raPriceUsd =
        toNumber(raLiveSnapshot?.priceUsd) > 0
          ? toNumber(raLiveSnapshot?.priceUsd)
          : toNumber(raMarketToken?.price) > 0
            ? toNumber(raMarketToken?.price)
            : DEFAULT_RA_PRICE_USD;
    }

    const stakedBalance = activePositions.reduce(
      (sum, position) => sum + Math.max(0, toNumber(position.rewardEstimate)),
      0,
    );
    const totalEarned = claimedPositions.reduce(
      (sum, position) => sum + Math.max(0, toNumber(position.rewardEstimate)),
      0,
    );
    const availableBalance = onchainRaBalance;
    const totalEarnedUsd = totalEarned * raPriceUsd;

    const activeStakings: WalletProfileActiveStakingPayload[] =
      activePositions.map((position) => {
        const marketToken = marketByTicker.get(
          position.tokenTicker.toUpperCase(),
        );
        return {
          id: position.id,
          remoteId: position.id,
          name: `${position.tokenTicker} ${position.periodLabel} Locked`,
          logo: this.resolveTokenLogoUrl(position.tokenTicker, marketToken),
          stakedAmount: `${formatNumber(toNumber(position.amount), {
            maximumFractionDigits: 4,
          })} ${position.tokenTicker}`,
          apr: `${formatNumber(position.apy, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 2,
          })}%`,
          earned: `${formatNumber(toNumber(position.rewardEstimate), {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} ${raSettings.tokenSymbol}`,
          status: position.unlockAt.getTime() <= now ? 'Completed' : 'Locked',
          startedAt: position.startedAt.getTime(),
          endTime: position.unlockAt.getTime(),
        };
      });

    const portfolioAccumulator = new Map<
      string,
      WalletProfilePortfolioTokenPayload
    >();
    for (const holding of tokenHoldings) {
      const amount = Math.max(0, toNumber(holding.amount));
      if (amount <= 0) continue;

      const mintKey = holding.mintAddress.toLowerCase();
      const marketToken =
        marketByMint.get(mintKey) ??
        marketByTicker.get(holding.ticker.toUpperCase());
      const liveSnapshot = liveSnapshotsByMint.get(mintKey);
      const ticker = (marketToken?.ticker ?? holding.ticker).toUpperCase();

      const current = portfolioAccumulator.get(ticker);
      portfolioAccumulator.set(ticker, {
        id: ticker.toLowerCase(),
        ticker,
        name:
          liveSnapshot?.name ||
          marketToken?.name ||
          holding.tokenName ||
          ticker,
        amount: (current?.amount ?? 0) + amount,
        priceUsd:
          (liveSnapshot?.priceUsd && liveSnapshot.priceUsd > 0
            ? liveSnapshot.priceUsd
            : undefined) ??
          toNullableNumber(marketToken?.price) ??
          current?.priceUsd ??
          0,
        logoUrl:
          current?.logoUrl ||
          liveSnapshot?.logoUrl ||
          this.resolveTokenLogoUrl(
            ticker,
            marketToken,
            this.isRaRuntimeTicker(ticker, raSettings)
              ? raSettings.logoUrl
              : null,
          ),
        change24h:
          (typeof liveSnapshot?.change24h === 'number' &&
          Number.isFinite(liveSnapshot.change24h)
            ? liveSnapshot.change24h
            : undefined) ??
          marketToken?.chg24h ??
          current?.change24h ??
          0,
      });
    }

    const portfolio: WalletProfilePortfolioTokenPayload[] = Array.from(
      portfolioAccumulator.values(),
    );

    const existingRa = portfolio.find(
      (token) =>
        token.id === normalizedRaMintKey ||
        this.isRaRuntimeTicker(token.ticker, raSettings),
    );
    if (existingRa) {
      existingRa.id = normalizedRaMintKey;
      existingRa.amount = onchainRaBalance;
      existingRa.ticker = raSettings.tokenSymbol;
      existingRa.name = raSettings.tokenName;
      existingRa.priceUsd = raPriceUsd;
      existingRa.change24h =
        (typeof raLiveSnapshot?.change24h === 'number' &&
        Number.isFinite(raLiveSnapshot.change24h)
          ? raLiveSnapshot.change24h
          : undefined) ??
        raMarketToken?.chg24h ??
        0;
      existingRa.logoUrl = this.resolveTokenLogoUrl(
        raSettings.tokenSymbol,
        raMarketToken,
        raSettings.logoUrl,
      );
    } else {
      portfolio.unshift({
        id: normalizedRaMintKey,
        ticker: raSettings.tokenSymbol,
        name: raSettings.tokenName,
        amount: onchainRaBalance,
        priceUsd: raPriceUsd,
        logoUrl: this.resolveTokenLogoUrl(
          raSettings.tokenSymbol,
          raMarketToken,
          raSettings.logoUrl,
        ),
        change24h:
          (typeof raLiveSnapshot?.change24h === 'number' &&
          Number.isFinite(raLiveSnapshot.change24h)
            ? raLiveSnapshot.change24h
            : undefined) ??
          raMarketToken?.chg24h ??
          0,
      });
    }

    const portfolioValue = portfolio.reduce(
      (sum, token) => sum + token.amount * token.priceUsd,
      0,
    );
    const portfolioChange =
      portfolioValue > 0
        ? portfolio.reduce((sum, token) => {
            const tokenValue = token.amount * token.priceUsd;
            const weight = tokenValue / portfolioValue;
            return sum + token.change24h * weight;
          }, 0)
        : 0;

    const transactions = walletActivities.map((activity) =>
      toProfileTransactionPayload(activity),
    );

    return {
      walletAddress,
      exists: true,
      role: syncedUser.role,
      isBlocked,
      availableBalance,
      stakedBalance,
      totalEarned,
      totalEarnedUsd,
      portfolioValue,
      portfolioChange,
      activeStakings,
      transactions: transactions.slice(0, 250),
      portfolio,
    };
  }

  async getAdminPortfolioEligibility(
    walletAddressInput: string,
    requesterKey?: string,
  ): Promise<AdminPortfolioEligibilityPayload> {
    const walletAddress = normalizeWalletAddress(walletAddressInput);
    await this.consumeRateLimit(
      `users:admin:portfolio-eligibility:${requesterKey ?? 'unknown'}:${walletAddress}`,
      30,
      60_000,
    );

    const [headerRuntime, raSettings] = await Promise.all([
      this.loadWalletHeaderRuntimeSettings(),
      this.loadRaRuntimeSettings(),
    ]);
    const network = headerRuntime.network;
    const raMint = this.resolveRaMintForNetwork(network, raSettings);
    const normalizedRaMint = this.normalizeMintAddress(raMint) ?? raMint;
    const normalizedRaMintKey = normalizedRaMint.toLowerCase();

    let balancesByMint: Map<string, number>;
    try {
      balancesByMint = await this.fetchOnChainTokenBalancesMap(
        walletAddress,
        network,
      );
    } catch (error) {
      throw new HttpException(
        error instanceof Error
          ? `Unable to read wallet token balances: ${error.message}`
          : 'Unable to read wallet token balances.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const listedTokens = await this.prisma.marketToken.findMany({
      orderBy: [{ ticker: 'asc' }],
      select: {
        ticker: true,
        name: true,
        isActive: true,
        mintAddress: true,
      },
    });

    const configuredMintSet = new Set<string>();

    const tokens = listedTokens.map((token) => {
      const mint = this.normalizeMintAddress(token.mintAddress);
      const trackingMint = this.resolveTrackedMintAddress(token);
      const trackingMintKey = trackingMint?.toLowerCase() ?? null;
      if (trackingMintKey) {
        configuredMintSet.add(trackingMintKey);
      }

      const isRaMint = trackingMintKey === normalizedRaMintKey;
      const walletAmount = trackingMintKey
        ? (balancesByMint.get(trackingMintKey) ?? 0)
        : 0;
      const visibleInPortfolio =
        token.isActive &&
        Boolean(trackingMintKey) &&
        !isRaMint &&
        walletAmount > 0;

      const reasons: string[] = [];
      if (!token.isActive) reasons.push('inactive-token');
      if (!trackingMintKey) reasons.push('missing-mint');
      if (this.isNativeSolTicker(token.ticker)) reasons.push('native-sol');
      if (isRaMint) reasons.push('ra-mint-reserved');
      if (walletAmount <= 0) reasons.push('zero-wallet-balance');
      if (visibleInPortfolio) reasons.push('eligible');

      return {
        ticker: token.ticker,
        name: token.name,
        isActive: token.isActive,
        mint,
        hasMint: Boolean(trackingMintKey),
        isRaMint,
        walletAmount,
        visibleInPortfolio,
        reasons,
      };
    });

    const unknownWalletMints = Array.from(balancesByMint.entries())
      .filter(
        ([mintKey, amount]) =>
          amount > 0 &&
          mintKey !== normalizedRaMintKey &&
          !configuredMintSet.has(mintKey),
      )
      .map(([mintKey, amount]) => ({
        mint: mintKey,
        walletAmount: amount,
      }))
      .sort((a, b) => b.walletAmount - a.walletAmount);

    const configuredTokensWithBalance = tokens.filter(
      (item) => item.hasMint && !item.isRaMint && item.walletAmount > 0,
    ).length;
    const eligibleVisibleTokens = tokens.filter(
      (item) => item.visibleInPortfolio,
    ).length;
    const configuredMints = tokens.filter((item) => item.hasMint).length;
    const activeTokens = tokens.filter((item) => item.isActive).length;

    return {
      walletAddress,
      network,
      ra: {
        mint: normalizedRaMint,
        walletAmount: balancesByMint.get(normalizedRaMintKey) ?? 0,
        visibleInPortfolio: true,
      },
      summary: {
        activeTokens,
        configuredMints,
        eligibleVisibleTokens,
        configuredTokensWithBalance,
      },
      tokens,
      unknownWalletMints,
    };
  }

  async listWalletUsers(params?: {
    search?: string;
    country?: string;
    onlineOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<AdminWalletUsersListPayload> {
    await this.usersOnlineStateService.finalizeStaleSessions();

    const search = params?.search?.trim();
    const country = this.normalizeCountryCode(params?.country?.trim() ?? null);
    const onlineOnly = Boolean(params?.onlineOnly);
    const safeLimit = Math.min(
      this.maxQueryLimit,
      Math.max(1, params?.limit ? Math.trunc(params.limit) : 25),
    );
    const safeOffset = Math.min(
      this.maxQueryOffset,
      Math.max(0, params?.offset ? Math.trunc(params.offset) : 0),
    );
    const onlineCutoff = this.usersOnlineStateService.getOnlineCutoffDate();

    const where: Prisma.WalletUserWhereInput = {
      walletAddress: search
        ? {
            contains: search,
            mode: 'insensitive',
          }
        : undefined,
      lastSeenCountry: country ?? undefined,
      sessions: onlineOnly
        ? {
            some: {
              isOnline: true,
              endedAt: null,
              lastSeenAt: { gte: onlineCutoff },
            },
          }
        : undefined,
    };

    const [total, users] = await Promise.all([
      this.prisma.walletUser.count({ where }),
      this.prisma.walletUser.findMany({
        where,
        orderBy: [{ lastSeenAt: 'desc' }, { createdAt: 'desc' }],
        skip: safeOffset,
        take: safeLimit,
      }),
    ]);

    const userIds = users.map((user) => user.id);
    const onlineUserIdSet =
      await this.usersOnlineStateService.getOnlineUserIdSet(userIds);

    return {
      total,
      limit: safeLimit,
      offset: safeOffset,
      items: users.map((user) =>
        toWalletUserSummary(user, onlineUserIdSet.has(user.id)),
      ),
    };
  }

  async getWalletUserDetail(
    walletAddressInput: string,
  ): Promise<AdminWalletUserDetailPayload> {
    await this.usersOnlineStateService.finalizeStaleSessions();
    const walletAddress = normalizeWalletAddress(walletAddressInput);

    const user = await this.prisma.walletUser.findUnique({
      where: { walletAddress },
      include: {
        sessions: {
          orderBy: { startedAt: 'desc' },
          take: 120,
        },
        stakePositions: {
          orderBy: { startedAt: 'desc' },
          take: 250,
          include: {
            user: {
              select: {
                walletAddress: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Wallet user not found');
    }

    const onlineUserIdSet =
      await this.usersOnlineStateService.getOnlineUserIdSet([user.id]);

    return {
      user: toWalletUserSummary(user, onlineUserIdSet.has(user.id)),
      sessions: user.sessions.map((session) => toWalletSessionPayload(session)),
      stakePositions: user.stakePositions.map((position) =>
        toStakePositionPayload(position),
      ),
    };
  }

  async getWalletAccess(
    walletAddressInput: string,
    requesterKey?: string,
    proxyKey?: string,
  ): Promise<WalletAccessPayload> {
    this.validateProxyKey(proxyKey);
    const walletAddress = normalizeWalletAddress(walletAddressInput);
    await this.consumeRateLimit(
      `users:access:${requesterKey ?? 'unknown'}:${walletAddress}`,
      120,
      60_000,
    );
    const existing =
      await this.usersWalletStateService.getWalletUserByAddress(walletAddress);
    const syncedUser = existing
      ? await this.usersWalletStateService.syncWalletRoleAndBlockState(existing)
      : null;
    const role =
      syncedUser?.role ??
      (await this.usersWalletStateService.resolveWalletRole(walletAddress));
    const isBlocked = syncedUser
      ? this.usersWalletStateService.isUserBlockedForAccess(syncedUser)
      : false;

    return {
      walletAddress,
      role,
      allowed: !isBlocked,
      isBlocked,
      message:
        isBlocked && syncedUser
          ? this.usersWalletStateService.getBlockedMessage(syncedUser)
          : null,
    };
  }

  async updateWalletUserBlock(
    walletAddressInput: string,
    dto: UpdateWalletUserBlockDto,
  ): Promise<WalletUserSummary> {
    const walletAddress = normalizeWalletAddress(walletAddressInput);
    const existingRaw =
      await this.usersWalletStateService.getWalletUserByAddress(walletAddress);
    if (!existingRaw) {
      throw new NotFoundException('Wallet user not found');
    }
    const existing =
      await this.usersWalletStateService.syncWalletRoleAndBlockState(
        existingRaw,
      );

    const now = new Date();
    const shouldBlock = dto.isBlocked;

    if (shouldBlock && existing.role === WalletUserRole.ADMIN) {
      throw new BadRequestException('Admin wallets cannot be blocked');
    }

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.walletUser.update({
        where: { id: existing.id },
        data: shouldBlock
          ? {
              isBlocked: true,
              blockedAt: now,
              blockMessage: this.usersWalletStateService.sanitizeBlockMessage(
                dto.blockMessage,
              ),
            }
          : {
              isBlocked: false,
              blockedAt: null,
              blockMessage: null,
            },
      });

      if (shouldBlock) {
        const openSessions = await tx.walletUserSession.findMany({
          where: {
            userId: existing.id,
            isOnline: true,
            endedAt: null,
          },
          select: {
            id: true,
            startedAt: true,
            lastSeenAt: true,
            durationSeconds: true,
          },
          take: 500,
        });

        let totalDelta = 0;
        for (const session of openSessions) {
          const durationSeconds = Math.max(
            session.durationSeconds,
            Math.floor((now.getTime() - session.startedAt.getTime()) / 1000),
          );
          totalDelta += Math.max(0, durationSeconds - session.durationSeconds);

          await tx.walletUserSession.update({
            where: { id: session.id },
            data: {
              isOnline: false,
              endedAt: now,
              lastSeenAt: now,
              durationSeconds,
            },
          });
        }

        if (totalDelta > 0) {
          await tx.walletUser.update({
            where: { id: existing.id },
            data: {
              totalSessionSeconds: { increment: totalDelta },
            },
          });
        }
      }

      return user;
    });

    const onlineUserIdSet =
      await this.usersOnlineStateService.getOnlineUserIdSet([updatedUser.id]);
    return toWalletUserSummary(
      updatedUser,
      onlineUserIdSet.has(updatedUser.id),
    );
  }

  async deleteWalletUser(
    walletAddressInput: string,
  ): Promise<DeleteWalletUserPayload> {
    const walletAddress = normalizeWalletAddress(walletAddressInput);

    const existing = await this.prisma.walletUser.findUnique({
      where: { walletAddress },
      select: { id: true, walletAddress: true },
    });

    if (!existing) {
      throw new NotFoundException('Wallet user not found');
    }

    await this.prisma.walletUser.delete({
      where: { id: existing.id },
    });

    return {
      success: true,
      walletAddress: existing.walletAddress,
    };
  }
}

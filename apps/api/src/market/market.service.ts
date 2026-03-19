import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { copyFile, mkdir, readdir, access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { join } from 'node:path';
import { DEXSCREENER_API_BASE_URL } from '../common/external.constants';
import { resolveFrontendPublicDir } from '../common/env';
import { WRAPPED_SOL_MINT_ADDRESS } from '../common/solana.constants';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMarketTokenDto } from './dto/create-market-token.dto';
import { UpdateMarketTokenDto } from './dto/update-market-token.dto';
import { UpdateMarketLivePricingSettingsDto } from './dto/update-market-live-pricing-settings.dto';
import { MarketToken, Prisma } from '@prisma/client';

interface DexPricePayload {
  price: number;
  chg24h: number;
}

interface DexPairPayload {
  chainId?: string;
  baseToken?: {
    address?: string;
    symbol?: string;
    name?: string;
  };
  priceUsd?: string | number;
  priceChange?: {
    h24?: string | number;
  };
  info?: {
    imageUrl?: string;
  };
  liquidity?: {
    usd?: string | number;
  };
}

interface DexSearchResponse {
  pairs?: DexPairPayload[];
}

interface LivePriceCacheEntry extends DexPricePayload {
  fetchedAt: number;
  expiresAt: number;
}

interface MarketLivePricingSettings {
  livePriceEnabled: boolean;
  cacheTtlMs: number;
  requestTimeoutMs: number;
  maxParallelRequests: number;
}

const DEFAULT_LIVE_PRICING_SETTINGS: MarketLivePricingSettings = {
  livePriceEnabled: true,
  cacheTtlMs: 60_000,
  requestTimeoutMs: 4_500,
  maxParallelRequests: 4,
};
const MAX_DEX_TOKEN_QUERY_MINTS = 30;
const BASE58_MINT_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const LEGACY_TOKEN_UPLOAD_PREFIX = '/uploads/tokens/';
const CANONICAL_TOKEN_UPLOAD_PREFIX = '/uploads/market/tokens/';
const NATIVE_SOL_TICKER = 'SOL';

export interface DexTokenSnapshot {
  mint: string;
  ticker: string;
  name: string;
  priceUsd: number;
  change24h: number;
  logoUrl: string;
}

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);
  private livePricingSettings: MarketLivePricingSettings = {
    ...DEFAULT_LIVE_PRICING_SETTINGS,
  };
  private livePriceCache = new Map<string, LivePriceCacheEntry>();
  private livePriceInflight = new Map<
    string,
    Promise<DexPricePayload | null>
  >();
  private lastLiveSyncAt: Date | null = null;
  private readonly uploadCompatReady: Promise<void>;

  constructor(private readonly prisma: PrismaService) {
    this.uploadCompatReady = this.ensureTokenUploadCompatibility();
  }

  private async ensureUploadCompat(): Promise<void> {
    try {
      await this.uploadCompatReady;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'unexpected upload compat failure';
      this.logger.warn(`Token upload compatibility check skipped: ${message}`);
    }
  }

  // Public/User frontend: Get only ACTIVE tokens
  async getActiveTokens() {
    await this.ensureUploadCompat();
    const tokens = await this.prisma.marketToken.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { chg24h: 'desc' }],
    });
    const enriched = await this.enrichTokensWithLivePrice(tokens);
    return enriched.map((token) => this.normalizeTokenOutput(token));
  }

  // Admin panel: List all tokens
  async getAllTokensAdmin() {
    await this.ensureUploadCompat();
    const tokens = await this.prisma.marketToken.findMany({
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
    });
    const enriched = await this.enrichTokensWithLivePrice(tokens);
    return enriched.map((token) => this.normalizeTokenOutput(token));
  }

  // Admin panel: Get a token by ID
  async getTokenAdmin(id: string) {
    await this.ensureUploadCompat();
    const token = await this.prisma.marketToken.findUnique({
      where: { id },
    });
    if (!token) {
      throw new NotFoundException('Market token not found');
    }
    const [enriched] = await this.enrichTokensWithLivePrice([token]);
    return this.normalizeTokenOutput(enriched);
  }

  getLivePricingRuntime() {
    return {
      ...this.livePricingSettings,
      cacheEntries: this.livePriceCache.size,
      inFlightRequests: this.livePriceInflight.size,
      lastSyncAt: this.lastLiveSyncAt?.toISOString() ?? null,
    };
  }

  updateLivePricingSettings(dto: UpdateMarketLivePricingSettingsDto) {
    if (typeof dto.livePriceEnabled === 'boolean') {
      this.livePricingSettings.livePriceEnabled = dto.livePriceEnabled;
      if (!dto.livePriceEnabled) {
        this.livePriceInflight.clear();
      }
    }

    if (typeof dto.cacheTtlMs === 'number') {
      this.livePricingSettings.cacheTtlMs = dto.cacheTtlMs;
      this.livePriceCache.clear();
    }

    if (typeof dto.requestTimeoutMs === 'number') {
      this.livePricingSettings.requestTimeoutMs = dto.requestTimeoutMs;
    }

    if (typeof dto.maxParallelRequests === 'number') {
      this.livePricingSettings.maxParallelRequests = dto.maxParallelRequests;
    }

    return this.getLivePricingRuntime();
  }

  async syncLivePricingNow() {
    const rows = await this.prisma.marketToken.findMany({
      where: {
        isActive: true,
      },
      select: {
        ticker: true,
        mintAddress: true,
      },
    });

    const mintAddresses = Array.from(
      new Set(
        rows
          .map((row) =>
            this.resolveTrackingMintAddress(row.ticker, row.mintAddress),
          )
          .filter((value): value is string => Boolean(value)),
      ),
    );

    if (mintAddresses.length > 0 && this.livePricingSettings.livePriceEnabled) {
      await this.mapWithConcurrency(mintAddresses, async (mintAddress) =>
        this.getLivePrice(mintAddress, true),
      );
    }

    this.lastLiveSyncAt = new Date();

    return {
      ...this.getLivePricingRuntime(),
      trackedMints: mintAddresses.length,
    };
  }

  private normalizeMintAddress(
    value: string | null | undefined,
  ): string | null {
    if (!value) return null;
    const normalized = value.trim();
    if (!normalized) return null;
    if (!BASE58_MINT_PATTERN.test(normalized)) return null;
    return normalized;
  }

  private normalizeTicker(value: string | null | undefined): string {
    return typeof value === 'string' ? value.trim().toUpperCase() : '';
  }

  private isNativeSolTicker(value: string | null | undefined): boolean {
    return this.normalizeTicker(value) === NATIVE_SOL_TICKER;
  }

  private resolveTrackingMintAddress(
    ticker: string | null | undefined,
    mintAddress: string | null | undefined,
  ): string | null {
    if (this.isNativeSolTicker(ticker)) {
      return WRAPPED_SOL_MINT_ADDRESS;
    }

    return this.normalizeMintAddress(mintAddress);
  }

  private normalizeMintAddressForPersist(
    ticker: string,
    mintAddress: string | null | undefined,
  ): string | null {
    const trimmedInput =
      typeof mintAddress === 'string' ? mintAddress.trim() : mintAddress;
    const normalizedMintAddress = this.normalizeMintAddress(trimmedInput);

    if (this.isNativeSolTicker(ticker)) {
      if (
        typeof trimmedInput === 'string' &&
        trimmedInput.length > 0 &&
        normalizedMintAddress !== WRAPPED_SOL_MINT_ADDRESS
      ) {
        throw new BadRequestException(
          'Native SOL should not use a custom mint address. Leave the field empty.',
        );
      }
      return null;
    }

    if (
      mintAddress !== undefined &&
      mintAddress !== null &&
      typeof trimmedInput === 'string' &&
      trimmedInput.length > 0 &&
      !normalizedMintAddress
    ) {
      throw new BadRequestException(
        'mint address must be a valid Solana address',
      );
    }

    return normalizedMintAddress;
  }

  private getTokenUploadsDir() {
    return join(resolveFrontendPublicDir(), 'uploads');
  }

  private async ensureTokenUploadCompatibility() {
    const uploadsRoot = this.getTokenUploadsDir();
    const legacyDir = join(uploadsRoot, 'tokens');
    const canonicalDir = join(uploadsRoot, 'market', 'tokens');
    await mkdir(canonicalDir, { recursive: true });

    let legacyFiles: string[] = [];
    try {
      legacyFiles = await readdir(legacyDir);
    } catch {
      return;
    }

    await Promise.all(
      legacyFiles.map(async (fileName) => {
        const source = join(legacyDir, fileName);
        const target = join(canonicalDir, fileName);
        try {
          await access(target, fsConstants.F_OK);
          return;
        } catch {
          // file does not exist in canonical dir
        }

        try {
          await copyFile(source, target);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'copy failure';
          this.logger.warn(
            `Token upload compatibility copy failed for ${fileName}: ${message}`,
          );
        }
      }),
    );
  }

  private rewriteLegacyIconPath(icon: string): string {
    const normalized = icon.trim();
    if (!normalized.startsWith(LEGACY_TOKEN_UPLOAD_PREFIX)) {
      return normalized;
    }

    return `${CANONICAL_TOKEN_UPLOAD_PREFIX}${normalized.slice(
      LEGACY_TOKEN_UPLOAD_PREFIX.length,
    )}`;
  }

  private normalizeTokenIconPath(token: MarketToken): MarketToken {
    const icon = token.icon?.trim();
    if (!icon) return token;
    const normalizedIcon = this.rewriteLegacyIconPath(icon);
    if (normalizedIcon === icon) return token;
    return { ...token, icon: normalizedIcon };
  }

  private normalizeTokenOutput(token: MarketToken): MarketToken {
    const normalizedToken = this.normalizeTokenIconPath(token);
    if (
      this.isNativeSolTicker(normalizedToken.ticker) &&
      normalizedToken.mintAddress !== null
    ) {
      return {
        ...normalizedToken,
        mintAddress: null,
      };
    }

    return normalizedToken;
  }

  async getTokenSnapshotsByMints(
    mintsInput: string[],
  ): Promise<DexTokenSnapshot[]> {
    const normalizedMints = Array.from(
      new Set(
        mintsInput
          .map((mint) => this.normalizeMintAddress(mint))
          .filter((mint): mint is string => Boolean(mint)),
      ),
    ).slice(0, MAX_DEX_TOKEN_QUERY_MINTS);

    if (normalizedMints.length === 0) {
      return [];
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.livePricingSettings.requestTimeoutMs,
    );

    try {
      const endpoint = `${DEXSCREENER_API_BASE_URL}/latest/dex/tokens/${encodeURIComponent(
        normalizedMints.join(','),
      )}`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        return [];
      }

      const data = (await response.json()) as DexSearchResponse;
      const pairs = Array.isArray(data.pairs) ? data.pairs : [];
      const snapshots: DexTokenSnapshot[] = [];

      for (const mint of normalizedMints) {
        const pair = this.selectBestDexPair(pairs, mint);

        snapshots.push({
          mint,
          ticker:
            pair?.baseToken?.symbol?.trim() || mint.slice(0, 4).toUpperCase(),
          name: pair?.baseToken?.name?.trim() || 'Token',
          priceUsd: Number(pair?.priceUsd) || 0,
          change24h: Number(pair?.priceChange?.h24) || 0,
          logoUrl: pair?.info?.imageUrl?.trim() || '',
        });
      }

      return snapshots;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unexpected dex fetch failure';
      this.logger.warn(`Dex token snapshot fetch failed: ${message}`);
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }

  private async mapWithConcurrency<T, TResult>(
    items: T[],
    worker: (item: T) => Promise<TResult>,
  ): Promise<TResult[]> {
    if (items.length === 0) return [];

    const concurrency = Math.max(
      1,
      Math.min(this.livePricingSettings.maxParallelRequests, items.length),
    );
    const results = new Array<TResult>(items.length);
    let cursor = 0;

    const runners = Array.from({ length: concurrency }, async () => {
      while (true) {
        const index = cursor;
        cursor += 1;
        if (index >= items.length) return;
        results[index] = await worker(items[index]);
      }
    });

    await Promise.all(runners);
    return results;
  }

  private async fetchDexPriceRaw(
    address: string,
  ): Promise<DexPricePayload | null> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.livePricingSettings.requestTimeoutMs,
    );

    try {
      const res = await fetch(
        `${DEXSCREENER_API_BASE_URL}/latest/dex/tokens/${encodeURIComponent(address)}`,
        {
          signal: controller.signal,
        },
      );
      if (!res.ok) return null;

      const data = (await res.json()) as DexSearchResponse;
      if (!Array.isArray(data.pairs) || data.pairs.length === 0) {
        return null;
      }

      const bestPair = this.selectBestDexPair(data.pairs, address);
      if (!bestPair) return null;

      return {
        price: Number(bestPair?.priceUsd) || 0,
        chg24h: Number(bestPair?.priceChange?.h24) || 0,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unexpected dex fetch failure';
      this.logger.warn(`Live price fetch failed for ${address}: ${message}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async getLivePrice(
    mintAddress: string,
    forceRefresh = false,
  ): Promise<DexPricePayload | null> {
    if (!this.livePricingSettings.livePriceEnabled) return null;

    const normalizedMint = this.normalizeMintAddress(mintAddress);
    if (!normalizedMint) return null;

    const now = Date.now();
    const cached = this.livePriceCache.get(normalizedMint);
    if (!forceRefresh && cached && cached.expiresAt > now) {
      return {
        price: cached.price,
        chg24h: cached.chg24h,
      };
    }

    const inFlight = this.livePriceInflight.get(normalizedMint);
    if (inFlight) {
      return inFlight;
    }

    const promise = (async () => {
      const fresh = await this.fetchDexPriceRaw(normalizedMint);
      if (fresh) {
        this.livePriceCache.set(normalizedMint, {
          ...fresh,
          fetchedAt: now,
          expiresAt: now + this.livePricingSettings.cacheTtlMs,
        });
      }
      return fresh;
    })();

    this.livePriceInflight.set(normalizedMint, promise);

    try {
      return await promise;
    } finally {
      this.livePriceInflight.delete(normalizedMint);
    }
  }

  private async fetchDexPrice(
    address: string,
  ): Promise<{ price: number; chg24h: number } | null> {
    return this.getLivePrice(address);
  }

  private selectBestDexPair(
    pairs: DexPairPayload[],
    mintAddress: string,
  ): DexPairPayload | null {
    const normalizedMintAddress = mintAddress.toLowerCase();

    const matchingPairs = pairs.filter(
      (pair) =>
        pair.baseToken?.address?.toLowerCase() === normalizedMintAddress,
    );
    if (matchingPairs.length === 0) return null;

    const solanaPairs = matchingPairs.filter(
      (pair) => pair.chainId?.toLowerCase() === 'solana',
    );
    const candidatePairs = solanaPairs.length > 0 ? solanaPairs : matchingPairs;

    const rankedPairs = [...candidatePairs].sort((a, b) => {
      const aHasUsdPrice =
        Number.isFinite(Number(a.priceUsd)) && Number(a.priceUsd) > 0;
      const bHasUsdPrice =
        Number.isFinite(Number(b.priceUsd)) && Number(b.priceUsd) > 0;
      if (aHasUsdPrice !== bHasUsdPrice) return aHasUsdPrice ? -1 : 1;

      const aLiquidity = Number(a.liquidity?.usd) || 0;
      const bLiquidity = Number(b.liquidity?.usd) || 0;
      return bLiquidity - aLiquidity;
    });

    return rankedPairs[0] ?? null;
  }

  private async enrichTokensWithLivePrice(
    tokens: MarketToken[],
  ): Promise<MarketToken[]> {
    if (!this.livePricingSettings.livePriceEnabled) {
      return tokens;
    }

    return this.mapWithConcurrency(tokens, async (token) => {
      const trackingMintAddress = this.resolveTrackingMintAddress(
        token.ticker,
        token.mintAddress,
      );
      if (!trackingMintAddress) {
        return token;
      }

      const liveData = await this.fetchDexPrice(trackingMintAddress);
      if (!liveData) {
        return token;
      }

      return {
        ...token,
        price: new Prisma.Decimal(liveData.price),
        chg24h: liveData.chg24h,
      };
    });
  }

  // Admin panel: Create token
  async createToken(dto: CreateMarketTokenDto) {
    await this.ensureUploadCompat();
    const tickerUpper = dto.ticker.toUpperCase();
    const existing = await this.prisma.marketToken.findUnique({
      where: { ticker: tickerUpper },
    });

    if (existing) {
      throw new BadRequestException('Token with this ticker already exists');
    }

    const normalizedMintAddress = this.normalizeMintAddressForPersist(
      tickerUpper,
      dto.mintAddress,
    );

    return this.prisma.marketToken.create({
      data: {
        ...dto,
        ticker: tickerUpper,
        price: dto.price ?? 0,
        chg24h: dto.chg24h ?? 0,
        stake7d: dto.stake7d ?? 0,
        stake1m: dto.stake1m ?? 0,
        stake3m: dto.stake3m ?? 0,
        stake6m: dto.stake6m ?? 0,
        stake12m: dto.stake12m ?? 0,
        icon: this.rewriteLegacyIconPath(dto.icon ?? ''),
        mintAddress: normalizedMintAddress,
        isImage: dto.isImage ?? false,
        isActive: dto.isActive ?? true,
        stakeEnabled: dto.stakeEnabled ?? true,
        convertEnabled: dto.convertEnabled ?? true,
        portfolioVisible: dto.portfolioVisible ?? true,
      },
    });
  }

  // Admin panel: Update token
  async updateToken(id: string, dto: UpdateMarketTokenDto) {
    await this.ensureUploadCompat();
    const existing = await this.prisma.marketToken.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Market token not found');
    }

    let effectiveTicker = existing.ticker;
    if (dto.ticker) {
      const tickerUpper = dto.ticker.toUpperCase();
      if (tickerUpper !== existing.ticker) {
        const duplicate = await this.prisma.marketToken.findUnique({
          where: { ticker: tickerUpper },
        });
        if (duplicate) {
          throw new BadRequestException(
            'Another token with this ticker already exists',
          );
        }
      }
      dto.ticker = tickerUpper;
      effectiveTicker = tickerUpper;
    }

    let mintAddressUpdate: string | null | undefined = undefined;
    if (this.isNativeSolTicker(effectiveTicker)) {
      mintAddressUpdate = null;
    } else if (dto.mintAddress !== undefined) {
      mintAddressUpdate = this.normalizeMintAddressForPersist(
        effectiveTicker,
        dto.mintAddress,
      );
    }

    return this.prisma.marketToken.update({
      where: { id },
      data: {
        ...dto,
        ...(mintAddressUpdate !== undefined
          ? {
              mintAddress: mintAddressUpdate,
            }
          : {}),
        ...(dto.icon !== undefined
          ? {
              icon: this.rewriteLegacyIconPath(dto.icon),
            }
          : {}),
        updatedAt: new Date(),
      },
    });
  }

  // Admin panel: Delete token
  async deleteToken(id: string) {
    const existing = await this.prisma.marketToken.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Market token not found');
    }

    // Since users may have staked positions on a token, maybe we shouldn't hard-delete.
    // So we just mark as inactive, or perform hard delete if acceptable.
    // Let's hard delete for now (users stake position is tied by tokenTicker string, so it won't cascade delete stakes).
    await this.prisma.marketToken.delete({
      where: { id },
    });

    return { success: true };
  }
}

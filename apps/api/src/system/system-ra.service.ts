import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Prisma, WalletActivityType } from '@prisma/client';
import { toNumber, toNullableNumber } from '../common/numeric';
import { PrismaService } from '../prisma/prisma.service';
import {
  CONVERT_EXECUTION_MODES,
  CONVERT_PROVIDERS,
  CONVERT_ROUTE_POLICIES,
  HEADER_SETTINGS_ID,
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
  DEFAULT_RA_STAKE_FEE_BPS,
  DEFAULT_RA_STAKE_MAX_USD,
  DEFAULT_RA_STAKE_MIN_USD,
  DEFAULT_RA_TREASURY_DEVNET,
  DEFAULT_RA_TREASURY_MAINNET,
  ORACLE_PROVIDERS,
  RA_RUNTIME_SETTINGS_ID,
} from './system.constants';
import { UpdateRaSettingsDto } from './dto/update-ra-settings.dto';
import { SystemRaOhlcSyncService } from './system-ra-ohlc-sync.service';
import { RaMigrationPayload, RaSettingsPayload } from './system.types';

@Injectable()
export class SystemRaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly raOhlcSyncService: SystemRaOhlcSyncService,
  ) {}

  private sanitizeBase58Address(value: string, fieldName: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException(`${fieldName} cannot be empty`);
    }
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) {
      throw new BadRequestException(
        `${fieldName} must be a valid Solana address`,
      );
    }
    return trimmed;
  }

  private sanitizeOracleProvider(
    value: string,
    fieldName: string,
  ): 'DEXSCREENER' | 'RAYDIUM' {
    const normalized = value.trim().toUpperCase();
    if (!ORACLE_PROVIDERS.has(normalized)) {
      throw new BadRequestException(
        `${fieldName} must be one of: DEXSCREENER, RAYDIUM`,
      );
    }
    return normalized as 'DEXSCREENER' | 'RAYDIUM';
  }

  private sanitizeConvertProvider(
    value: string,
    fieldName: string,
  ): 'RAYDIUM' | 'JUPITER' {
    const normalized = value.trim().toUpperCase();
    if (!CONVERT_PROVIDERS.has(normalized)) {
      throw new BadRequestException(
        `${fieldName} must be one of: RAYDIUM, JUPITER`,
      );
    }
    return normalized as 'RAYDIUM' | 'JUPITER';
  }

  private sanitizeConvertExecutionMode(
    value: string,
    fieldName: string,
  ): 'AUTO' | 'SINGLE_TX_ONLY' | 'ALLOW_MULTI_TX' {
    const normalized = value.trim().toUpperCase();
    if (!CONVERT_EXECUTION_MODES.has(normalized)) {
      throw new BadRequestException(
        `${fieldName} must be one of: AUTO, SINGLE_TX_ONLY, ALLOW_MULTI_TX`,
      );
    }
    return normalized as 'AUTO' | 'SINGLE_TX_ONLY' | 'ALLOW_MULTI_TX';
  }

  private sanitizeConvertRoutePolicy(
    value: string,
    fieldName: string,
  ): 'TOKEN_TO_SOL_TO_RA' {
    const normalized = value.trim().toUpperCase();
    if (!CONVERT_ROUTE_POLICIES.has(normalized)) {
      throw new BadRequestException(
        `${fieldName} must be one of: TOKEN_TO_SOL_TO_RA`,
      );
    }
    return normalized as 'TOKEN_TO_SOL_TO_RA';
  }

  private sanitizeFeeBps(value: number, fieldName: string): number {
    if (!Number.isFinite(value)) {
      throw new BadRequestException(`${fieldName} must be a finite number`);
    }
    const normalized = Math.trunc(value);
    if (normalized < 0 || normalized > 10_000) {
      throw new BadRequestException(`${fieldName} must be between 0 and 10000`);
    }
    return normalized;
  }

  private sanitizeUsdValue(value: number, fieldName: string): number {
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException(
        `${fieldName} must be a non-negative number`,
      );
    }
    return value;
  }

  private toRaSettingsPayload(settings: {
    logoUrl?: string | null;
    tokenSymbol?: string | null;
    tokenName?: string | null;
    mintDevnet: string | null;
    mintMainnet: string | null;
    treasuryDevnet: string | null;
    treasuryMainnet: string | null;
    oraclePrimary: string | null;
    oracleSecondary: string | null;
    stakeFeeBps: number | null;
    claimFeeBps: number | null;
    stakeMinUsd: Prisma.Decimal | number | null;
    stakeMaxUsd: Prisma.Decimal | number | null;
    convertMinUsd: Prisma.Decimal | number | null;
    convertMaxUsd: Prisma.Decimal | number | null;
    convertEnabled: boolean | null;
    convertProvider: string | null;
    convertExecutionMode: string | null;
    convertRoutePolicy: string | null;
    convertSlippageBps: number | null;
    convertMaxTokensPerSession: number | null;
    convertPoolIdDevnet: string | null;
    convertPoolIdMainnet: string | null;
    convertQuoteMintDevnet: string | null;
    convertQuoteMintMainnet: string | null;
    updatedAt: Date;
  }): RaSettingsPayload {
    const stakeMinUsd =
      toNullableNumber(settings.stakeMinUsd) ?? DEFAULT_RA_STAKE_MIN_USD;
    const stakeMaxUsd =
      toNullableNumber(settings.stakeMaxUsd) ?? DEFAULT_RA_STAKE_MAX_USD;
    const convertMinUsd =
      toNullableNumber(settings.convertMinUsd) ?? DEFAULT_RA_CONVERT_MIN_USD;
    const convertMaxUsd =
      toNullableNumber(settings.convertMaxUsd) ?? DEFAULT_RA_CONVERT_MAX_USD;

    const normalizedStakeMin = Math.max(0, stakeMinUsd);
    const normalizedStakeMax = Math.max(normalizedStakeMin, stakeMaxUsd);
    const normalizedConvertMin = Math.max(0, convertMinUsd);
    const normalizedConvertMax = Math.max(normalizedConvertMin, convertMaxUsd);

    const primary = this.sanitizeOracleProvider(
      settings.oraclePrimary ?? DEFAULT_RA_ORACLE_PRIMARY,
      'oraclePrimary',
    );
    const secondaryCandidate = settings.oracleSecondary?.trim();
    const secondary =
      secondaryCandidate && secondaryCandidate.length > 0
        ? this.sanitizeOracleProvider(secondaryCandidate, 'oracleSecondary')
        : null;

    return {
      logoUrl: this.sanitizeRaLogoUrl(settings.logoUrl),
      tokenSymbol: this.sanitizeRaTokenSymbol(settings.tokenSymbol),
      tokenName: this.sanitizeRaTokenName(settings.tokenName),
      mintDevnet: this.sanitizeBase58Address(
        settings.mintDevnet ?? DEFAULT_RA_MINT_DEVNET,
        'mintDevnet',
      ),
      mintMainnet: this.sanitizeBase58Address(
        settings.mintMainnet ?? DEFAULT_RA_MINT_MAINNET,
        'mintMainnet',
      ),
      treasuryDevnet: this.sanitizeBase58Address(
        settings.treasuryDevnet ?? DEFAULT_RA_TREASURY_DEVNET,
        'treasuryDevnet',
      ),
      treasuryMainnet: this.sanitizeBase58Address(
        settings.treasuryMainnet ?? DEFAULT_RA_TREASURY_MAINNET,
        'treasuryMainnet',
      ),
      oraclePrimary: primary,
      oracleSecondary: secondary,
      stakeFeeBps: this.sanitizeFeeBps(
        settings.stakeFeeBps ?? DEFAULT_RA_STAKE_FEE_BPS,
        'stakeFeeBps',
      ),
      claimFeeBps: this.sanitizeFeeBps(
        settings.claimFeeBps ?? DEFAULT_RA_CLAIM_FEE_BPS,
        'claimFeeBps',
      ),
      stakeMinUsd: normalizedStakeMin,
      stakeMaxUsd: normalizedStakeMax,
      convertMinUsd: normalizedConvertMin,
      convertMaxUsd: normalizedConvertMax,
      convertEnabled: settings.convertEnabled ?? DEFAULT_RA_CONVERT_ENABLED,
      convertProvider: this.sanitizeConvertProvider(
        settings.convertProvider ?? DEFAULT_RA_CONVERT_PROVIDER,
        'convertProvider',
      ),
      convertExecutionMode: this.sanitizeConvertExecutionMode(
        settings.convertExecutionMode ?? DEFAULT_RA_CONVERT_EXECUTION_MODE,
        'convertExecutionMode',
      ),
      convertRoutePolicy: this.sanitizeConvertRoutePolicy(
        settings.convertRoutePolicy ?? DEFAULT_RA_CONVERT_ROUTE_POLICY,
        'convertRoutePolicy',
      ),
      convertSlippageBps: this.sanitizeFeeBps(
        settings.convertSlippageBps ?? DEFAULT_RA_CONVERT_SLIPPAGE_BPS,
        'convertSlippageBps',
      ),
      convertMaxTokensPerSession: Math.max(
        1,
        Math.min(
          5,
          Math.trunc(
            settings.convertMaxTokensPerSession ??
              DEFAULT_RA_CONVERT_MAX_TOKENS_PER_SESSION,
          ),
        ),
      ),
      convertPoolIdDevnet: this.sanitizeBase58Address(
        settings.convertPoolIdDevnet ?? DEFAULT_RA_CONVERT_POOL_ID_DEVNET,
        'convertPoolIdDevnet',
      ),
      convertPoolIdMainnet: this.sanitizeBase58Address(
        settings.convertPoolIdMainnet ?? DEFAULT_RA_CONVERT_POOL_ID_MAINNET,
        'convertPoolIdMainnet',
      ),
      convertQuoteMintDevnet: this.sanitizeBase58Address(
        settings.convertQuoteMintDevnet ?? DEFAULT_RA_CONVERT_QUOTE_MINT_DEVNET,
        'convertQuoteMintDevnet',
      ),
      convertQuoteMintMainnet: this.sanitizeBase58Address(
        settings.convertQuoteMintMainnet ??
          DEFAULT_RA_CONVERT_QUOTE_MINT_MAINNET,
        'convertQuoteMintMainnet',
      ),
      updatedAt: settings.updatedAt.toISOString(),
    };
  }

  private sanitizeRaLogoUrl(value: string | null | undefined): string {
    const trimmed = value?.trim();
    if (!trimmed) {
      return DEFAULT_RA_LOGO_URL;
    }

    if (!trimmed.startsWith('/')) {
      throw new BadRequestException(
        'logoUrl must be a local static path (e.g. /uploads/ra/logo.png)',
      );
    }

    return trimmed;
  }

  private sanitizeRaTokenSymbol(value: string | null | undefined): string {
    const candidate = value?.trim().toUpperCase() || DEFAULT_RA_TOKEN_SYMBOL;
    if (!/^[A-Z0-9]{1,12}$/.test(candidate)) {
      throw new BadRequestException(
        'tokenSymbol must be 1-12 uppercase letters or numbers',
      );
    }
    return candidate;
  }

  private sanitizeRaTokenName(value: string | null | undefined): string {
    const candidate = value?.trim() || DEFAULT_RA_TOKEN_NAME;
    if (candidate.length < 2 || candidate.length > 40) {
      throw new BadRequestException(
        'tokenName must be between 2 and 40 characters',
      );
    }
    return candidate;
  }

  private getOrCreateRaRuntimeSettings() {
    return this.prisma.raRuntimeSetting.upsert({
      where: { id: RA_RUNTIME_SETTINGS_ID },
      update: {},
      create: { id: RA_RUNTIME_SETTINGS_ID },
    });
  }

  async getRaSettings(): Promise<RaSettingsPayload> {
    const settings = await this.getOrCreateRaRuntimeSettings();
    return this.toRaSettingsPayload(settings);
  }

  async updateRaSettings(
    dto: UpdateRaSettingsDto,
    isSuperAdmin: boolean,
  ): Promise<RaSettingsPayload> {
    if (!isSuperAdmin) {
      throw new ForbiddenException(
        'Only SUPER_ADMIN can update RA runtime settings.',
      );
    }

    const updateData: {
      logoUrl?: string | null;
      tokenSymbol?: string;
      tokenName?: string;
      mintDevnet?: string;
      mintMainnet?: string;
      treasuryDevnet?: string;
      treasuryMainnet?: string;
      oraclePrimary?: string;
      oracleSecondary?: string | null;
      stakeFeeBps?: number;
      claimFeeBps?: number;
      stakeMinUsd?: Prisma.Decimal;
      stakeMaxUsd?: Prisma.Decimal;
      convertMinUsd?: Prisma.Decimal;
      convertMaxUsd?: Prisma.Decimal;
      convertEnabled?: boolean;
      convertProvider?: string;
      convertExecutionMode?: string;
      convertRoutePolicy?: string;
      convertSlippageBps?: number;
      convertMaxTokensPerSession?: number;
      convertPoolIdDevnet?: string;
      convertPoolIdMainnet?: string;
      convertQuoteMintDevnet?: string;
      convertQuoteMintMainnet?: string;
    } = {};

    if (dto.logoUrl !== undefined) {
      updateData.logoUrl = this.sanitizeRaLogoUrl(dto.logoUrl);
    }
    if (dto.tokenSymbol !== undefined) {
      updateData.tokenSymbol = this.sanitizeRaTokenSymbol(dto.tokenSymbol);
    }
    if (dto.tokenName !== undefined) {
      updateData.tokenName = this.sanitizeRaTokenName(dto.tokenName);
    }
    if (dto.mintDevnet !== undefined) {
      updateData.mintDevnet = this.sanitizeBase58Address(
        dto.mintDevnet,
        'mintDevnet',
      );
    }
    if (dto.mintMainnet !== undefined) {
      updateData.mintMainnet = this.sanitizeBase58Address(
        dto.mintMainnet,
        'mintMainnet',
      );
    }
    if (dto.treasuryDevnet !== undefined) {
      updateData.treasuryDevnet = this.sanitizeBase58Address(
        dto.treasuryDevnet,
        'treasuryDevnet',
      );
    }
    if (dto.treasuryMainnet !== undefined) {
      updateData.treasuryMainnet = this.sanitizeBase58Address(
        dto.treasuryMainnet,
        'treasuryMainnet',
      );
    }
    if (dto.oraclePrimary !== undefined) {
      updateData.oraclePrimary = this.sanitizeOracleProvider(
        dto.oraclePrimary,
        'oraclePrimary',
      );
    }
    if (dto.oracleSecondary !== undefined) {
      updateData.oracleSecondary =
        dto.oracleSecondary === null
          ? null
          : this.sanitizeOracleProvider(dto.oracleSecondary, 'oracleSecondary');
    }
    if (dto.stakeFeeBps !== undefined) {
      updateData.stakeFeeBps = this.sanitizeFeeBps(
        dto.stakeFeeBps,
        'stakeFeeBps',
      );
    }
    if (dto.claimFeeBps !== undefined) {
      updateData.claimFeeBps = this.sanitizeFeeBps(
        dto.claimFeeBps,
        'claimFeeBps',
      );
    }
    if (dto.stakeMinUsd !== undefined) {
      updateData.stakeMinUsd = new Prisma.Decimal(
        this.sanitizeUsdValue(dto.stakeMinUsd, 'stakeMinUsd'),
      );
    }
    if (dto.stakeMaxUsd !== undefined) {
      updateData.stakeMaxUsd = new Prisma.Decimal(
        this.sanitizeUsdValue(dto.stakeMaxUsd, 'stakeMaxUsd'),
      );
    }
    if (dto.convertMinUsd !== undefined) {
      updateData.convertMinUsd = new Prisma.Decimal(
        this.sanitizeUsdValue(dto.convertMinUsd, 'convertMinUsd'),
      );
    }
    if (dto.convertMaxUsd !== undefined) {
      updateData.convertMaxUsd = new Prisma.Decimal(
        this.sanitizeUsdValue(dto.convertMaxUsd, 'convertMaxUsd'),
      );
    }
    if (dto.convertEnabled !== undefined) {
      updateData.convertEnabled = dto.convertEnabled;
    }
    if (dto.convertProvider !== undefined) {
      updateData.convertProvider = this.sanitizeConvertProvider(
        dto.convertProvider,
        'convertProvider',
      );
    }
    if (dto.convertExecutionMode !== undefined) {
      updateData.convertExecutionMode = this.sanitizeConvertExecutionMode(
        dto.convertExecutionMode,
        'convertExecutionMode',
      );
    }
    if (dto.convertRoutePolicy !== undefined) {
      updateData.convertRoutePolicy = this.sanitizeConvertRoutePolicy(
        dto.convertRoutePolicy,
        'convertRoutePolicy',
      );
    }
    if (dto.convertSlippageBps !== undefined) {
      updateData.convertSlippageBps = this.sanitizeFeeBps(
        dto.convertSlippageBps,
        'convertSlippageBps',
      );
    }
    if (dto.convertMaxTokensPerSession !== undefined) {
      if (
        !Number.isFinite(dto.convertMaxTokensPerSession) ||
        dto.convertMaxTokensPerSession < 1 ||
        dto.convertMaxTokensPerSession > 5
      ) {
        throw new BadRequestException(
          'convertMaxTokensPerSession must be between 1 and 5',
        );
      }
      updateData.convertMaxTokensPerSession = Math.trunc(
        dto.convertMaxTokensPerSession,
      );
    }
    if (dto.convertPoolIdDevnet !== undefined) {
      updateData.convertPoolIdDevnet = this.sanitizeBase58Address(
        dto.convertPoolIdDevnet,
        'convertPoolIdDevnet',
      );
    }
    if (dto.convertPoolIdMainnet !== undefined) {
      updateData.convertPoolIdMainnet = this.sanitizeBase58Address(
        dto.convertPoolIdMainnet,
        'convertPoolIdMainnet',
      );
    }
    if (dto.convertQuoteMintDevnet !== undefined) {
      updateData.convertQuoteMintDevnet = this.sanitizeBase58Address(
        dto.convertQuoteMintDevnet,
        'convertQuoteMintDevnet',
      );
    }
    if (dto.convertQuoteMintMainnet !== undefined) {
      updateData.convertQuoteMintMainnet = this.sanitizeBase58Address(
        dto.convertQuoteMintMainnet,
        'convertQuoteMintMainnet',
      );
    }

    const candidate = this.toRaSettingsPayload({
      ...(await this.getOrCreateRaRuntimeSettings()),
      ...updateData,
    });

    if (candidate.stakeMinUsd > candidate.stakeMaxUsd) {
      throw new BadRequestException(
        'stakeMinUsd must be less than or equal to stakeMaxUsd',
      );
    }
    if (candidate.convertMinUsd > candidate.convertMaxUsd) {
      throw new BadRequestException(
        'convertMinUsd must be less than or equal to convertMaxUsd',
      );
    }

    const settings = await this.prisma.raRuntimeSetting.upsert({
      where: { id: RA_RUNTIME_SETTINGS_ID },
      update: updateData,
      create: {
        id: RA_RUNTIME_SETTINGS_ID,
        ...updateData,
      },
    });

    const headerSettings = await this.prisma.headerSetting.upsert({
      where: { id: HEADER_SETTINGS_ID },
      update: {},
      create: { id: HEADER_SETTINGS_ID },
      select: { network: true },
    });

    await this.raOhlcSyncService.syncForNetwork(
      headerSettings.network === 'mainnet' ? 'mainnet' : 'devnet',
      {
        tokenSymbol: settings.tokenSymbol ?? null,
        mintDevnet: settings.mintDevnet ?? null,
        mintMainnet: settings.mintMainnet ?? null,
        convertPoolIdDevnet: settings.convertPoolIdDevnet ?? null,
        convertPoolIdMainnet: settings.convertPoolIdMainnet ?? null,
        convertQuoteMintDevnet: settings.convertQuoteMintDevnet ?? null,
        convertQuoteMintMainnet: settings.convertQuoteMintMainnet ?? null,
      },
    );

    return this.toRaSettingsPayload(settings);
  }

  async migrateRaModel(isSuperAdmin: boolean): Promise<RaMigrationPayload> {
    if (!isSuperAdmin) {
      throw new ForbiddenException(
        'Only SUPER_ADMIN can run RA model migration.',
      );
    }

    const settings = await this.getRaSettings();
    const raPriceRow = await this.prisma.marketToken.findUnique({
      where: { ticker: 'RA' },
      select: { price: true },
    });
    const raPriceUsd =
      raPriceRow && toNumber(raPriceRow.price) > 0
        ? toNumber(raPriceRow.price)
        : 0;

    const updatedStakeResult = await this.prisma.walletStakePosition.updateMany(
      {
        where: {
          rewardToken: { not: 'RA' },
        },
        data: { rewardToken: 'RA' },
      },
    );

    const activities = await this.prisma.walletUserActivity.findMany({
      where: {
        type: {
          in: [
            WalletActivityType.STAKE,
            WalletActivityType.CLAIM,
            WalletActivityType.CONVERT,
          ],
        },
      },
      select: {
        id: true,
        type: true,
        amountUsd: true,
        metadata: true,
      },
      take: 25_000,
    });

    let updatedActivityRows = 0;
    const nowIso = new Date().toISOString();

    for (const activity of activities) {
      const feeBps =
        activity.type === WalletActivityType.STAKE
          ? settings.stakeFeeBps
          : activity.type === WalletActivityType.CLAIM
            ? settings.claimFeeBps
            : 0;
      const amountUsd = Math.max(0, toNumber(activity.amountUsd));
      const feeUsd = Math.max(0, (amountUsd * feeBps) / 10_000);
      const feeRa = raPriceUsd > 0 ? feeUsd / raPriceUsd : 0;

      const currentMetadata =
        activity.metadata &&
        typeof activity.metadata === 'object' &&
        !Array.isArray(activity.metadata)
          ? (activity.metadata as Record<string, unknown>)
          : {};

      const nextMetadata = {
        ...currentMetadata,
        raModelVersion: 1,
        feeBps,
        feeUsd,
        feeRa,
        oracleProvider: settings.oraclePrimary,
        migratedAt: nowIso,
      };

      await this.prisma.walletUserActivity.update({
        where: { id: activity.id },
        data: {
          metadata: nextMetadata as Prisma.InputJsonValue,
        },
      });
      updatedActivityRows += 1;
    }

    return {
      updatedStakeRows: updatedStakeResult.count,
      updatedActivityRows,
      modelVersion: 1,
      migratedAt: nowIso,
    };
  }
}

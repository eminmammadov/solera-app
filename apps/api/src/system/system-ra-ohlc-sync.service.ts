import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { WRAPPED_SOL_MINT_ADDRESS } from '../common/solana.constants';
import { OhlcService } from '../ohlc/ohlc.service';
import { PrismaService } from '../prisma/prisma.service';
import { HEADER_SETTINGS_ID, RA_RUNTIME_SETTINGS_ID } from './system.constants';
const USDC_MAINNET_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDC_DEVNET_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
const USDT_MAINNET_MINT = 'Es9vMFrzaCERmJfrF4H2VdJvVkCkJd7wa9uRc42PFp2C';

type RuntimeNetwork = 'devnet' | 'mainnet';

type MinimalRaRuntimeSettings = {
  tokenSymbol: string | null;
  mintDevnet: string | null;
  mintMainnet: string | null;
  convertPoolIdDevnet: string | null;
  convertPoolIdMainnet: string | null;
  convertQuoteMintDevnet: string | null;
  convertQuoteMintMainnet: string | null;
};

type RaRuntimeSettingsRecord = {
  tokenSymbol?: string | null;
  mintDevnet?: string | null;
  mintMainnet?: string | null;
  convertPoolIdDevnet?: string | null;
  convertPoolIdMainnet?: string | null;
  convertQuoteMintDevnet?: string | null;
  convertQuoteMintMainnet?: string | null;
};

@Injectable()
export class SystemRaOhlcSyncService implements OnModuleInit {
  private readonly logger = new Logger(SystemRaOhlcSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ohlcService: OhlcService,
  ) {}

  private resolveRuntimeNetwork(
    value: string | null | undefined,
  ): RuntimeNetwork {
    return value === 'mainnet' ? 'mainnet' : 'devnet';
  }

  private resolveQuoteSymbol(
    quoteMint: string,
    network: RuntimeNetwork,
    fallbackQuoteSymbol?: string | null,
  ) {
    const normalizedMint = quoteMint.trim();
    if (normalizedMint === WRAPPED_SOL_MINT_ADDRESS) {
      return 'SOL';
    }
    if (
      normalizedMint === USDC_MAINNET_MINT ||
      normalizedMint === USDC_DEVNET_MINT
    ) {
      return 'USDC';
    }
    if (network === 'mainnet' && normalizedMint === USDT_MAINNET_MINT) {
      return 'USDT';
    }
    if (fallbackQuoteSymbol && fallbackQuoteSymbol.trim()) {
      return fallbackQuoteSymbol.trim().toUpperCase();
    }
    return 'QUOTE';
  }

  private buildPairInput(
    network: RuntimeNetwork,
    settings: MinimalRaRuntimeSettings,
    fallbackQuoteSymbol?: string | null,
  ) {
    const baseMint =
      network === 'mainnet' ? settings.mintMainnet : settings.mintDevnet;
    const poolId =
      network === 'mainnet'
        ? settings.convertPoolIdMainnet
        : settings.convertPoolIdDevnet;
    const quoteMint =
      network === 'mainnet'
        ? settings.convertQuoteMintMainnet
        : settings.convertQuoteMintDevnet;

    if (!baseMint?.trim() || !poolId?.trim() || !quoteMint?.trim()) {
      return null;
    }

    const quoteSymbol = this.resolveQuoteSymbol(
      quoteMint,
      network,
      fallbackQuoteSymbol,
    );
    const baseSymbol = settings.tokenSymbol?.trim().toUpperCase() || 'RA';

    return {
      pairKey: `${baseSymbol}_${quoteSymbol}`,
      poolId: poolId.trim(),
      baseMint: baseMint.trim(),
      quoteMint: quoteMint.trim(),
      baseSymbol,
      quoteSymbol,
    };
  }

  private toMinimalRaRuntimeSettings(
    settings: RaRuntimeSettingsRecord | null | undefined,
  ): MinimalRaRuntimeSettings {
    return {
      tokenSymbol: settings?.tokenSymbol ?? null,
      mintDevnet: settings?.mintDevnet ?? null,
      mintMainnet: settings?.mintMainnet ?? null,
      convertPoolIdDevnet: settings?.convertPoolIdDevnet ?? null,
      convertPoolIdMainnet: settings?.convertPoolIdMainnet ?? null,
      convertQuoteMintDevnet: settings?.convertQuoteMintDevnet ?? null,
      convertQuoteMintMainnet: settings?.convertQuoteMintMainnet ?? null,
    };
  }

  async onModuleInit() {
    try {
      await this.syncForActiveNetwork();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown OHLC bootstrap error.';
      this.logger.warn(
        `OHLC bootstrap sync could not be completed during module init: ${message}`,
      );
    }
  }

  async syncForActiveNetwork(
    raSettings?: MinimalRaRuntimeSettings,
  ): Promise<void> {
    const [headerSettings, resolvedRaSettings] = await Promise.all([
      this.prisma.headerSetting.upsert({
        where: { id: HEADER_SETTINGS_ID },
        update: {},
        create: { id: HEADER_SETTINGS_ID },
        select: { network: true },
      }),
      raSettings
        ? Promise.resolve(raSettings)
        : this.prisma.raRuntimeSetting
            .upsert({
              where: { id: RA_RUNTIME_SETTINGS_ID },
              update: {},
              create: { id: RA_RUNTIME_SETTINGS_ID },
            })
            .then((settings) =>
              this.toMinimalRaRuntimeSettings(
                settings as RaRuntimeSettingsRecord,
              ),
            ),
    ]);

    const network = this.resolveRuntimeNetwork(headerSettings.network);
    await this.syncForNetwork(network, resolvedRaSettings);
  }

  async syncForNetwork(
    network: RuntimeNetwork,
    raSettings?: MinimalRaRuntimeSettings,
  ): Promise<void> {
    const resolvedRaSettings =
      raSettings ??
      this.toMinimalRaRuntimeSettings(
        (await this.prisma.raRuntimeSetting.upsert({
          where: { id: RA_RUNTIME_SETTINGS_ID },
          update: {},
          create: { id: RA_RUNTIME_SETTINGS_ID },
        })) as RaRuntimeSettingsRecord,
      );

    const existingPair = await this.ohlcService
      .getFeaturedPair()
      .then((result) => (result?.success ? result.pair : null))
      .catch(() => null);

    const pairInput = this.buildPairInput(
      network,
      resolvedRaSettings,
      existingPair?.quoteSymbol ?? null,
    );

    if (!pairInput) {
      return;
    }

    const isCompatibleWithUpstream = await this.ohlcService
      .validateRuntimeFeaturedPair(pairInput)
      .catch(() => false);

    if (!isCompatibleWithUpstream) {
      const fallbackPair = this.ohlcService.getConfiguredCorePair();
      const fallbackIsCompatible = await this.ohlcService
        .validateRuntimeFeaturedPair(fallbackPair)
        .catch(() => false);

      this.logger.warn(
        `Skipping OHLC runtime sync for ${network}: upstream pool ${pairInput.poolId} does not match configured mints.`,
      );

      if (fallbackIsCompatible) {
        try {
          await this.ohlcService.syncRuntimeFeaturedPair(fallbackPair);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Unknown OHLC fallback sync error.';
          this.logger.warn(
            `OHLC fallback pair restore could not be completed: ${message}`,
          );
        }
      }

      return;
    }

    try {
      await this.ohlcService.syncRuntimeFeaturedPair(pairInput);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown OHLC sync error.';
      this.logger.warn(
        `RA runtime changed, but OHLC pair sync could not be completed: ${message}`,
      );
    }
  }
}

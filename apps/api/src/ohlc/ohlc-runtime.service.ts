import { Injectable } from '@nestjs/common';
import type { OhlcRuntimeContext } from './ohlc.types';

@Injectable()
export class OhlcRuntimeService {
  async initializeRuntime(context: OhlcRuntimeContext) {
    if (!context.pool) return;

    try {
      await context.pool.query('SELECT 1');
      await context.ensureSchema();
      await context.ensureDefaultTrackedPair();
      await context.ensureRuntimeSettings();
      await context.reconcileStartupPairs();

      if (context.ingestEnabled) {
        await this.pollOnce(context, true);
      }

      this.startPolling(context);
    } catch (error) {
      context.logger.error(
        'Failed to initialize OHLC service.',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async destroyRuntime(context: OhlcRuntimeContext) {
    this.stopPolling(context);
    await context.closePool();
  }

  startPolling(context: OhlcRuntimeContext) {
    this.stopPolling(context);

    if (!context.ingestEnabled) {
      context.logger.log(
        `OHLC polling paused for ${context.pairConfig.pairKey}`,
      );
      return;
    }

    const nextTimer = setInterval(() => {
      void context.pollOnce();
    }, context.currentPollIntervalMs);

    context.setRuntimeState({ pollTimer: nextTimer });
    context.logger.log(
      `OHLC polling started for ${context.pairConfig.pairKey} every ${context.currentPollIntervalMs}ms`,
    );
  }

  stopPolling(context: OhlcRuntimeContext) {
    if (!context.pollTimer) {
      return;
    }

    clearInterval(context.pollTimer);
    context.setRuntimeState({ pollTimer: null });
  }

  async pollOnce(context: OhlcRuntimeContext, force = false) {
    if (!context.pool) return;
    if (!force && !context.ingestEnabled) return;
    if (context.isPolling) return;

    context.setRuntimeState({ isPolling: true });
    try {
      const activePairs = await context.loadActivePairs();
      if (activePairs.length === 0) {
        return;
      }

      const quoteUsdCache = new Map<string, number | null>();
      for (const pair of activePairs) {
        try {
          const snapshot = await context.fetchCurrentSnapshot(
            pair,
            quoteUsdCache,
          );
          if (!snapshot) continue;
          await context.persistSnapshot(snapshot);
        } catch (pairError) {
          context.logger.warn(
            `OHLC poll failed for ${pair.pair_key}: ${
              pairError instanceof Error ? pairError.message : 'unknown error'
            }`,
          );
        }
      }
    } catch (error) {
      context.logger.warn(
        `OHLC poll failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    } finally {
      context.setRuntimeState({ isPolling: false });
    }
  }
}

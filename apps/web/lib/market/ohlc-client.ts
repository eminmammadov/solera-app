import { backendRoutes } from '@/lib/api/backend-routes';
import { publicRequestJson } from "@/lib/api/public-api";

export type OhlcInterval = '1m' | '5m' | '15m' | '1h' | '4h';

export interface OhlcBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OhlcBarsResponse {
  success: boolean;
  pair: string;
  interval: OhlcInterval;
  bars: OhlcBar[];
  count: number;
}

export interface OhlcTickerResponse {
  success: boolean;
  pair: string;
  priceUsd: number;
  change24h: number;
  updatedAt: string | null;
}

export interface OhlcFeaturedPairResponse {
  success: boolean;
  pair: {
    pairKey: string;
    poolId: string;
    baseMint: string;
    quoteMint: string;
    baseSymbol: string;
    quoteSymbol: string;
  };
}

export const fetchOhlcBars = async (
  interval: OhlcInterval,
  limit: number,
  pair?: string,
): Promise<OhlcBarsResponse> => {
  const query = new URLSearchParams();
  query.set('interval', interval);
  query.set('limit', String(limit));
  if (pair && pair.trim().length > 0) {
    query.set('pair', pair.trim());
  }

  return publicRequestJson<OhlcBarsResponse>({
    path: `${backendRoutes.ohlc.bars}?${query.toString()}`,
    fallbackMessage: "Failed to load OHLC bars.",
    cache: 'no-store',
    timeoutMs: 10_000,
    cacheTtlMs: 1_500,
    minIntervalMs: 250,
  });
};

export const fetchOhlcTicker = async (pair?: string): Promise<OhlcTickerResponse> => {
  const query = new URLSearchParams();
  if (pair && pair.trim().length > 0) {
    query.set('pair', pair.trim());
  }
  return publicRequestJson<OhlcTickerResponse>({
    path: `${backendRoutes.ohlc.ticker}?${query.toString()}`,
    fallbackMessage: "Failed to load OHLC ticker.",
    cache: "no-store",
    timeoutMs: 10_000,
    cacheTtlMs: 1_500,
    minIntervalMs: 250,
  });
};

export const fetchOhlcFeaturedPair = async (): Promise<OhlcFeaturedPairResponse> => {
  return publicRequestJson<OhlcFeaturedPairResponse>({
    path: backendRoutes.ohlc.featured,
    fallbackMessage: "Failed to load featured OHLC pair.",
    cache: "no-store",
    timeoutMs: 10_000,
    cacheTtlMs: 2_000,
    minIntervalMs: 300,
  });
};

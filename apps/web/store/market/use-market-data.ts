import { create } from 'zustand'
import { fetchMarketTokensPayload } from "@/lib/market/market-data-client"
import { notifyWarning } from "@/lib/ui/ui-feedback"

export interface MarketToken {
  id: string;
  ticker: string;
  name: string;
  price: number;
  priceFormatted: string;
  chg24h: number;
  stake7d: number;
  stake1m: number;
  stake3m: number;
  stake6m: number;
  stake12m: number;
  category: string;
  publishedAt: string;
  icon: string;
  isImage?: boolean;
  colorBg?: string;
  priceColor?: string;
  priceDecimalColor?: string;
  mintAddress?: string | null;
  stakeEnabled?: boolean;
  convertEnabled?: boolean;
  portfolioVisible?: boolean;
}

export interface MarketDataState {
  tokens: MarketToken[];
  platformTvl: number;
  platformTvlChange: number;
  activeStakers: number;
  activeStakersChange: number;
  avgApy: number;
  totalRewards: number;
  totalStakedRa: number;
  totalStakedUsd: number;
  totalUsers: number;
  onlineUsers: number;
  liveRaPrice: number;
  liveRaPriceChange: number;
  liveRaUpdatedAt: string | null;
  incrementStakers: (stakedUsdValue: number) => void;
  updateLiveRaPrice: (price: number, previousClose: number) => void;
  setLiveRaTicker: (price: number, change24h: number, updatedAt?: string | null) => void;
  isLoadingTokens: boolean;
  hasFetchedTokens: boolean;
  fetchTokens: () => Promise<void>;
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const toOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const normalizeMarketToken = (value: unknown): MarketToken | null => {
  if (!value || typeof value !== 'object') return null

  const record = value as Record<string, unknown>
  const id = typeof record.id === 'string' ? record.id : null
  const ticker = typeof record.ticker === 'string' ? record.ticker : null
  const name = typeof record.name === 'string' ? record.name : null

  if (!id || !ticker || !name) return null

  const price = toNumber(record.price)

  return {
    id,
    ticker,
    name,
    price,
    priceFormatted: price.toLocaleString(undefined, { maximumFractionDigits: 6 }),
    chg24h: toNumber(record.chg24h),
    stake7d: toNumber(record.stake7d),
    stake1m: toNumber(record.stake1m),
    stake3m: toNumber(record.stake3m),
    stake6m: toNumber(record.stake6m),
    stake12m: toNumber(record.stake12m),
    category: typeof record.category === 'string' ? record.category : 'Unknown',
    publishedAt:
      typeof record.publishedAt === 'string'
        ? record.publishedAt
        : new Date(0).toISOString(),
    icon: typeof record.icon === 'string' ? record.icon : '',
    isImage: typeof record.isImage === 'boolean' ? record.isImage : undefined,
    colorBg: toOptionalString(record.colorBg),
    priceColor: toOptionalString(record.priceColor),
    priceDecimalColor: toOptionalString(record.priceDecimalColor),
    mintAddress:
      typeof record.mintAddress === 'string' || record.mintAddress === null
        ? record.mintAddress
        : undefined,
    stakeEnabled:
      typeof record.stakeEnabled === "boolean" ? record.stakeEnabled : undefined,
    convertEnabled:
      typeof record.convertEnabled === "boolean" ? record.convertEnabled : undefined,
    portfolioVisible:
      typeof record.portfolioVisible === "boolean" ? record.portfolioVisible : undefined,
  }
}

let hasShownMarketLoadErrorNotice = false

export const useMarketData = create<MarketDataState>((set) => ({
  tokens: [],
  platformTvl: 0,
  platformTvlChange: 0,
  activeStakers: 0,
  activeStakersChange: 0,
  avgApy: 0,
  totalRewards: 0,
  totalStakedRa: 0,
  totalStakedUsd: 0,
  totalUsers: 0,
  onlineUsers: 0,
  liveRaPrice: 0,
  liveRaPriceChange: 0,
  liveRaUpdatedAt: null,

  incrementStakers: (stakedUsdValue: number) => set((state) => ({
    activeStakers: state.activeStakers + 1,
    platformTvl: state.platformTvl + stakedUsdValue,
    totalRewards: state.totalRewards + stakedUsdValue * 0.025,
    totalStakedUsd: state.totalStakedUsd + Math.floor(stakedUsdValue),
  })),

  updateLiveRaPrice: (price: number, previousClose: number) => set(() => {
    const change = previousClose > 0 ? ((price - previousClose) / previousClose) * 100 : 0;
    return {
      liveRaPrice: price,
      liveRaPriceChange: change,
      liveRaUpdatedAt: new Date().toISOString(),
    };
  }),

  setLiveRaTicker: (price: number, change24h: number, updatedAt?: string | null) => set(() => ({
    liveRaPrice: price,
    liveRaPriceChange: change24h,
    liveRaUpdatedAt: updatedAt ?? new Date().toISOString(),
  })),

  isLoadingTokens: false,
  hasFetchedTokens: false,
  fetchTokens: async () => {
    try {
      set({ isLoadingTokens: true });
      const data = await fetchMarketTokensPayload()
      if (Array.isArray(data)) {
        const mapped = data
          .map(normalizeMarketToken)
          .filter((token): token is MarketToken => token !== null);
        set({ tokens: mapped });
        hasShownMarketLoadErrorNotice = false
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sync market tokens right now.';
      if (!hasShownMarketLoadErrorNotice) {
        notifyWarning({
          title: 'Market data unavailable',
          description: message,
          dedupeKey: "market-data:load-unavailable",
          dedupeMs: 30_000,
        })
        hasShownMarketLoadErrorNotice = true
      }
    } finally {
      set({ isLoadingTokens: false, hasFetchedTokens: true });
    }
  },
}))


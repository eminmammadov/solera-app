export const ohlcRoutes = {
  bars: "/ohlc/bars",
  ticker: "/ohlc/ticker",
  featured: "/ohlc/featured",
  adminConfig: "/ohlc/admin/config",
  adminPairs: "/ohlc/admin/pairs",
  adminPairById: (pairId: number | string) =>
    `/ohlc/admin/pairs/${encodeURIComponent(String(pairId))}`,
  adminFeaturedById: (pairId: number | string) =>
    `/ohlc/admin/featured/${encodeURIComponent(String(pairId))}`,
  adminSync: "/ohlc/admin/sync",
} as const

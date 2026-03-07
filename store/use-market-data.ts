import { create } from 'zustand'

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
  
  // UI specific fields
  icon: string;
  isImage?: boolean;
  colorBg?: string;
  priceColor?: string;
  priceDecimalColor?: string;
}

const INITIAL_MARKET_DATA: MarketToken[] = [
  { id: "spx", ticker: "SPX", name: "S&P 500", price: 5670.98, priceFormatted: "5,670.98", chg24h: 0.67, stake7d: 5.32, stake1m: 8.15, stake3m: 12.67, stake6m: 18.4, stake12m: 24.5, category: "Meme tokens", publishedAt: "2026-03-01T10:00:00Z", icon: "500", colorBg: "bg-[#ef4444]" },
  { id: "ndq", ticker: "NDQ", name: "Nasdaq 100", price: 19581.78, priceFormatted: "19,581.78", chg24h: 0.75, stake7d: 2.35, stake1m: 5.20, stake3m: 8.75, stake6m: 15.2, stake12m: 28.4, category: "Meme tokens", publishedAt: "2026-03-02T11:00:00Z", icon: "100", colorBg: "bg-[#0ea5e9]", priceColor: "text-[#22c55e]" },
  { id: "dji", ticker: "DJI", name: "Dow Jones", price: 42225.32, priceFormatted: "42,225.32", chg24h: 0.56, stake7d: -1.36, stake1m: 1.45, stake3m: 4.56, stake6m: 8.9, stake12m: 14.2, category: "Meme tokens", publishedAt: "2026-03-03T09:00:00Z", icon: "30", colorBg: "bg-[#0ea5e9]" },
  { id: "vix", ticker: "VIX", name: "Volatility Index", price: 21.51, priceFormatted: "21.51", chg24h: -1.19, stake7d: 10.26, stake1m: 2.15, stake3m: -5.19, stake6m: -12.4, stake12m: -18.5, category: "Meme tokens", publishedAt: "2026-03-04T08:00:00Z", icon: "V", colorBg: "bg-[#22c55e]" },
  { id: "vix_usd", ticker: "VIX $", name: "VIX Dollar", price: 102.74, priceFormatted: "102.740", chg24h: -0.92, stake7d: -0.95, stake1m: -1.20, stake3m: -2.92, stake6m: -4.5, stake12m: -6.8, category: "Meme tokens", publishedAt: "2026-03-04T08:30:00Z", icon: "$", colorBg: "bg-[#10b981]", priceDecimalColor: "text-[#ef4444]" },
  { id: "aapl", ticker: "AAPL", name: "Apple Inc.", price: 223.89, priceFormatted: "223.89", chg24h: 0.31, stake7d: 4.70, stake1m: 8.45, stake3m: 15.31, stake6m: 22.5, stake12m: 34.2, category: "Asset tokens", publishedAt: "2026-03-01T10:00:00Z", icon: "apple", isImage: true, priceDecimalColor: "text-[#22c55e]" },
  { id: "nflx", ticker: "NFLX", name: "Netflix, Inc.", price: 282.76, priceFormatted: "282.76", chg24h: 5.33, stake7d: 1.30, stake1m: 12.4, stake3m: 25.33, stake6m: 42.1, stake12m: 68.5, category: "Asset tokens", publishedAt: "2026-03-02T11:00:00Z", icon: "N", colorBg: "bg-[#ef4444]", priceColor: "text-[#22c55e]" },
  { id: "tsla", ticker: "TSLA", name: "Tesla, Inc.", price: 395.52, priceFormatted: "395.52", chg24h: 0.77, stake7d: -3.14, stake1m: 4.25, stake3m: 10.77, stake6m: 18.4, stake12m: 25.6, category: "Asset tokens", publishedAt: "2026-03-03T09:00:00Z", icon: "T", colorBg: "bg-[#ef4444]" },
  { id: "usoil", ticker: "USOIL", name: "Crude Oil", price: 69.88, priceFormatted: "69.88", chg24h: -1.10, stake7d: -2.78, stake1m: -4.15, stake3m: -5.10, stake6m: -8.4, stake12m: -12.5, category: "Partner tokens", publishedAt: "2026-03-01T10:00:00Z", icon: "oil", isImage: true },
  { id: "gold", ticker: "GOLD", name: "Gold", price: 3129.45, priceFormatted: "3,129.455", chg24h: -0.28, stake7d: 1.83, stake1m: 4.50, stake3m: 8.28, stake6m: 14.2, stake12m: 22.4, category: "Partner tokens", publishedAt: "2026-03-02T11:00:00Z", icon: "gold", isImage: true, priceColor: "text-[#ef4444]" },
  { id: "silver", ticker: "SILVER", name: "Silver", price: 33.22, priceFormatted: "33.226", chg24h: -1.96, stake7d: -0.65, stake1m: 0.85, stake3m: 1.96, stake6m: 5.4, stake12m: 8.2, category: "Partner tokens", publishedAt: "2026-03-03T09:00:00Z", icon: "silver", isImage: true, priceDecimalColor: "text-[#ef4444]" },
  { id: "msft", ticker: "MSFT", name: "Microsoft", price: 415.32, priceFormatted: "415.32", chg24h: 1.12, stake7d: 3.45, stake1m: 7.20, stake3m: 11.50, stake6m: 16.8, stake12m: 29.1, category: "Asset tokens", publishedAt: "2026-02-28T10:00:00Z", icon: "M", colorBg: "bg-[#22c55e]" },
  { id: "amzn", ticker: "AMZN", name: "Amazon", price: 185.40, priceFormatted: "185.40", chg24h: 0.85, stake7d: 2.10, stake1m: 6.30, stake3m: 9.80, stake6m: 14.5, stake12m: 21.3, category: "Asset tokens", publishedAt: "2026-02-27T10:00:00Z", icon: "A", colorBg: "bg-[#f59e0b]" },
  { id: "googl", ticker: "GOOGL", name: "Alphabet", price: 165.20, priceFormatted: "165.20", chg24h: -0.45, stake7d: 1.15, stake1m: 4.80, stake3m: 7.90, stake6m: 12.3, stake12m: 18.7, category: "Asset tokens", publishedAt: "2026-02-26T10:00:00Z", icon: "G", colorBg: "bg-[#ef4444]" },
  { id: "meta", ticker: "META", name: "Meta", price: 510.60, priceFormatted: "510.60", chg24h: 2.30, stake7d: 6.50, stake1m: 14.20, stake3m: 22.40, stake6m: 35.6, stake12m: 55.2, category: "Asset tokens", publishedAt: "2026-02-25T10:00:00Z", icon: "M", colorBg: "bg-[#0ea5e9]" },
  { id: "nvda", ticker: "NVDA", name: "NVIDIA", price: 125.80, priceFormatted: "125.80", chg24h: 4.15, stake7d: 12.30, stake1m: 28.50, stake3m: 45.20, stake6m: 85.4, stake12m: 150.6, category: "Asset tokens", publishedAt: "2026-02-24T10:00:00Z", icon: "N", colorBg: "bg-[#22c55e]" },
  { id: "btc", ticker: "BTC", name: "Bitcoin", price: 64230.00, priceFormatted: "64,230.00", chg24h: 1.50, stake7d: 4.20, stake1m: 15.80, stake3m: 25.40, stake6m: 45.2, stake12m: 110.5, category: "Partner tokens", publishedAt: "2026-02-28T10:00:00Z", icon: "B", colorBg: "bg-[#f59e0b]" },
  { id: "eth", ticker: "ETH", name: "Ethereum", price: 3450.20, priceFormatted: "3,450.20", chg24h: 0.95, stake7d: 2.80, stake1m: 10.50, stake3m: 18.20, stake6m: 32.4, stake12m: 85.6, category: "Partner tokens", publishedAt: "2026-02-27T10:00:00Z", icon: "E", colorBg: "bg-[#6366f1]" },
  { id: "sol", ticker: "SOL", name: "Solana", price: 145.60, priceFormatted: "145.60", chg24h: 5.20, stake7d: 15.40, stake1m: 35.20, stake3m: 55.80, stake6m: 95.2, stake12m: 210.4, category: "Partner tokens", publishedAt: "2026-02-26T10:00:00Z", icon: "S", colorBg: "bg-[#14b8a6]" },
  { id: "doge", ticker: "DOGE", name: "Dogecoin", price: 0.12, priceFormatted: "0.12", chg24h: -2.50, stake7d: -5.40, stake1m: 8.20, stake3m: 12.50, stake6m: 25.4, stake12m: 45.2, category: "Meme tokens", publishedAt: "2026-02-27T10:00:00Z", icon: "D", colorBg: "bg-[#ef4444]" },
  { id: "pepe", ticker: "PEPE", name: "Pepe", price: 0.000008, priceFormatted: "0.000008", chg24h: 8.50, stake7d: 25.40, stake1m: 45.20, stake3m: 85.60, stake6m: 150.2, stake12m: 320.5, category: "Meme tokens", publishedAt: "2026-02-28T10:00:00Z", icon: "P", colorBg: "bg-[#22c55e]" },
]

interface MarketDataState {
  tokens: MarketToken[];
}

export const useMarketData = create<MarketDataState>((set) => ({
  tokens: INITIAL_MARKET_DATA,
}))

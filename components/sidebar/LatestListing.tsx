"use client"

import { Plus } from "lucide-react"
import Image from "next/image"
import { useStakeModal } from "@/store/use-stake-modal"
import { useMarketData } from "@/store/use-market-data"

type WatchlistGroup = {
  category: string;
  limit: number;
};

const watchlistCategories: WatchlistGroup[] = [
  { category: "Meme tokens", limit: 5 },
  { category: "Asset tokens", limit: 3 },
  { category: "Partner tokens", limit: 3 }
]

export function LatestListing() {
  const { openModal } = useStakeModal()
  const { tokens } = useMarketData()

  return (
    <div className="flex flex-col p-4 bg-[#111111] rounded-xl border border-neutral-800 shrink-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[17px] font-medium text-white">Latest listing</h3>
        <div className="flex items-center gap-2 text-neutral-400">
          <button 
            onClick={() => openModal({ ticker: "SPX", name: "S&P 500", price: 5670.98 })}
            className="flex items-center justify-center p-1 cursor-pointer rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-neutral-700"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="flex flex-col space-y-5">
        {watchlistCategories.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-neutral-500">
            No data available yet.
          </div>
        ) : (
          watchlistCategories.map((group) => {
            const groupItems = tokens.filter(t => t.category === group.category);
            if (groupItems.length === 0) return null;
            
            return (
            <div key={group.category}>
              <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500 mb-3 tracking-wider">
                <span>{group.category}</span>
                <div className="flex items-center gap-2 sm:gap-2 text-right">
                  <span className="w-[60px] sm:w-[70px]">Price</span>
                  <span className="w-12 sm:w-14">% 7d</span>
                  <span className="w-12 sm:w-14">% 3M</span>
                </div>
              </div>
              <div className="space-y-3">
                {[...groupItems]
                  .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
                  .slice(0, group.limit)
                  .map((item, i) => {
                  // Handle decimal coloring for price
                  let priceDisplay = <span className={item.priceColor || "text-white"}>{item.priceFormatted}</span>;
                  
                  if (item.priceDecimalColor && item.priceFormatted.includes('.')) {
                    const [whole, decimal] = item.priceFormatted.split('.');
                    priceDisplay = (
                      <span>
                        <span className="text-white">{whole}.</span>
                        <span className={item.priceDecimalColor}>{decimal}</span>
                      </span>
                    );
                  }

                  return (
                    <div key={i} className="flex items-center justify-between text-[13px]">
                      <div className="flex items-center gap-2">
                        {item.isImage ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white overflow-hidden">
                            <Image src={`https://picsum.photos/seed/${item.ticker}/20/20`} alt={item.ticker} width={20} height={20} referrerPolicy="no-referrer" />
                          </div>
                        ) : (
                          <div className={`flex h-5 w-5 items-center justify-center rounded-full ${item.colorBg} text-[9px] font-bold text-white`}>
                            {item.icon === 'V' ? (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l8 16 8-16"/></svg>
                            ) : item.icon}
                          </div>
                        )}
                        <span className="text-neutral-200 font-medium">{item.ticker}</span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-2 text-right">
                        <span className="w-[60px] sm:w-[70px] truncate">{priceDisplay}</span>
                        <span className={`w-12 sm:w-14 truncate ${item.stake7d >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>{item.stake7d >= 0 ? '+' : ''}{item.stake7d}%</span>
                        <span className={`w-12 sm:w-14 truncate ${item.stake3m >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>{item.stake3m >= 0 ? '+' : ''}{item.stake3m}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )})
        )}
      </div>
    </div>
  )
}

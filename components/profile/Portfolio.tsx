"use client"

import Image from "next/image"
import { useUserData } from "@/store/use-user-data"
import { useMarketData } from "@/store/use-market-data"

export function Portfolio() {
  const { portfolio } = useUserData()
  const { tokens } = useMarketData()

  return (
    <div className="flex flex-col h-full rounded-xl border border-neutral-800 bg-[#111111] overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-neutral-800/50">
        <h3 className="text-lg font-bold text-white">Portfolio</h3>
        <p className="text-xs text-neutral-500 mt-1">Your token balances</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {portfolio.filter(token => token.amount > 0).map((token) => {
          const marketToken = tokens.find(t => t.ticker === token.ticker);
          const currentPrice = marketToken ? marketToken.price : token.priceUsd;
          
          return (
          <div 
            key={token.id} 
            className="flex items-center justify-between py-1.5 px-2 border-b border-neutral-800/50 last:border-0 hover:bg-neutral-800/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full overflow-hidden shrink-0 bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                <Image 
                  src={token.logoUrl} 
                  alt={token.name} 
                  width={20} 
                  height={20} 
                  className="object-cover" 
                  referrerPolicy="no-referrer" 
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-white">{token.ticker}</span>
                <span className="text-[10px] text-neutral-500 hidden sm:inline">{token.name}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs text-white">
                {token.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
              <span className="text-[10px] text-neutral-500 w-12 text-right">
                ${(token.amount * currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )})}
        
        {portfolio.filter(token => token.amount > 0).length === 0 && (
          <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
            No tokens found
          </div>
        )}
      </div>
    </div>
  )
}

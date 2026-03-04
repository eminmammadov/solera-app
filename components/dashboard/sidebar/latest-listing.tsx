import { Plus } from "lucide-react"
import Image from "next/image"

type WatchlistItem = {
  ticker: string;
  icon: string;
  color?: string;
  price: string;
  priceColor?: string;
  priceDecimalColor?: string;
  pct7d: string;
  pct3m: string;
  isUp7d: boolean;
  isUp3m: boolean;
  isImage?: boolean;
};

type WatchlistGroup = {
  category: string;
  items: WatchlistItem[];
};

const watchlistData: WatchlistGroup[] = [
  { category: "Meme tokens", items: [
    { ticker: "SPX", icon: "500", color: "bg-[#ef4444]", price: "5,670.98", pct7d: "+5.32%", pct3m: "+12.67%", isUp7d: true, isUp3m: true },
    { ticker: "NDQ", icon: "100", color: "bg-[#0ea5e9]", price: "19,581.78", priceColor: "text-[#22c55e]", pct7d: "+2.35%", pct3m: "+8.75%", isUp7d: true, isUp3m: true },
    { ticker: "DJI", icon: "30", color: "bg-[#0ea5e9]", price: "42,225.32", pct7d: "-1.36%", pct3m: "+4.56%", isUp7d: false, isUp3m: true },
    { ticker: "VIX", icon: "V", color: "bg-[#22c55e]", price: "21.51", pct7d: "+10.26%", pct3m: "-5.19%", isUp7d: true, isUp3m: false },
    { ticker: "VIX", icon: "$", color: "bg-[#10b981]", price: "102.740", priceDecimalColor: "text-[#ef4444]", pct7d: "-0.95%", pct3m: "-2.92%", isUp7d: false, isUp3m: false },
  ]},
  { category: "Asset tokens", items: [
    { ticker: "AAPL", icon: "apple", isImage: true, price: "223.89", priceDecimalColor: "text-[#22c55e]", pct7d: "+4.70%", pct3m: "+15.31%", isUp7d: true, isUp3m: true },
    { ticker: "NFLX", icon: "N", color: "bg-[#ef4444]", price: "282.76", priceColor: "text-[#22c55e]", pct7d: "+1.30%", pct3m: "+25.33%", isUp7d: true, isUp3m: true },
    { ticker: "TSLA", icon: "T", color: "bg-[#ef4444]", price: "395.52", pct7d: "-3.14%", pct3m: "+10.77%", isUp7d: false, isUp3m: true },
  ]},
  { category: "Partner tokens", items: [
    { ticker: "USOIL", icon: "oil", isImage: true, price: "69.88", pct7d: "-2.78%", pct3m: "-5.10%", isUp7d: false, isUp3m: false },
    { ticker: "GOLD", icon: "gold", isImage: true, price: "3,129.455", priceColor: "text-[#ef4444]", pct7d: "+1.83%", pct3m: "+8.28%", isUp7d: true, isUp3m: true },
    { ticker: "SILVER", icon: "silver", isImage: true, price: "33.226", priceDecimalColor: "text-[#ef4444]", pct7d: "-0.65%", pct3m: "+1.96%", isUp7d: false, isUp3m: true },
  ]}
]

export function LatestListing() {
  return (
    <div className="flex flex-col p-4 bg-[#111111] rounded-xl border border-neutral-800 shrink-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[17px] font-medium text-white">Latest listing</h3>
        <div className="flex items-center gap-2 text-neutral-400">
          <button className="flex items-center justify-center p-1 cursor-pointer rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-neutral-700">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="flex flex-col space-y-5">
        {watchlistData.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-neutral-500">
            There is currently no data available.
          </div>
        ) : (
          watchlistData.map((group) => (
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
                {group.items.map((item, i) => {
                  // Handle decimal coloring for price
                  let priceDisplay = <span className={item.priceColor || "text-white"}>{item.price}</span>;
                  
                  if (item.priceDecimalColor && item.price.includes('.')) {
                    const [whole, decimal] = item.price.split('.');
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
                          <div className={`flex h-5 w-5 items-center justify-center rounded-full ${item.color} text-[9px] font-bold text-white`}>
                            {item.icon === 'V' ? (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l8 16 8-16"/></svg>
                            ) : item.icon}
                          </div>
                        )}
                        <span className="text-neutral-200 font-medium">{item.ticker}</span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-2 text-right">
                        <span className="w-[60px] sm:w-[70px] truncate">{priceDisplay}</span>
                        <span className={`w-12 sm:w-14 truncate ${item.isUp7d ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>{item.pct7d}</span>
                        <span className={`w-12 sm:w-14 truncate ${item.isUp3m ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>{item.pct3m}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

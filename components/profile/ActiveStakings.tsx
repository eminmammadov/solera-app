"use client"

import Image from "next/image"
import { useState, useEffect } from "react"
import { ClaimModal } from "@/components/modals/ClaimModal"
import { useUserData } from "@/store/use-user-data"
import { useMarketData } from "@/store/use-market-data"

const Countdown = ({ endTime }: { endTime: number }) => {
  const [timeLeft, setTimeLeft] = useState(endTime - new Date().getTime())

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(endTime - new Date().getTime())
    }, 1000)
    return () => clearInterval(interval)
  }, [endTime])

  if (timeLeft <= 0) {
    return <span className="text-green-500 font-medium">Completed</span>
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)

  return (
    <span className="text-neutral-400 font-mono text-xs">
      {days}d {hours.toString().padStart(2, '0')}h {minutes.toString().padStart(2, '0')}m {seconds.toString().padStart(2, '0')}s
    </span>
  )
}

export function ActiveStakings() {
  const [visibleCount, setVisibleCount] = useState(10)
  const [selectedStake, setSelectedStake] = useState<any>(null)
  const { activeStakings, claimStake } = useUserData()
  const { tokens } = useMarketData()
  
  // Sort stakings: completed ones first
  const sortedStakings = [...activeStakings].sort((a, b) => {
    const now = new Date().getTime()
    const aCompleted = a.endTime - now <= 0
    const bCompleted = b.endTime - now <= 0
    
    if (aCompleted && !bCompleted) return -1
    if (!aCompleted && bCompleted) return 1
    return a.endTime - b.endTime // then sort by end time ascending
  })

  const visibleStakings = sortedStakings.slice(0, visibleCount)
  const hasMore = visibleCount < sortedStakings.length

  return (
    <div className="flex flex-col p-2 sm:p-3 bg-[#111111] rounded-xl border border-neutral-800 text-neutral-100 relative h-full w-full">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h2 className="text-[17px] font-medium text-white whitespace-nowrap">Active Stakings</h2>
      </div>
      
      {sortedStakings.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-neutral-500">
          No active stakings available yet.
        </div>
      ) : (
        <div className="w-full overflow-x-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full text-xs text-left whitespace-nowrap">
            <thead className="text-[10px] uppercase text-neutral-500 border-b border-neutral-800">
              <tr>
                <th className="pb-2 px-2 font-medium">Pool</th>
                <th className="pb-2 px-2 font-medium text-right">Staked Amount</th>
                <th className="pb-2 px-2 font-medium text-right">APR</th>
                <th className="pb-2 px-2 font-medium text-right">Earned Rewards</th>
                <th className="pb-2 px-2 font-medium text-right">Time Left</th>
                <th className="pb-2 px-2 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody>
              {visibleStakings.map((stake) => {
                const isCompleted = stake.endTime - new Date().getTime() <= 0;
                const marketToken = tokens.find(t => t.ticker === stake.name);
                const displayLogo = marketToken ? `https://picsum.photos/seed/${marketToken.ticker}/20/20` : stake.logo;
                
                return (
                  <tr key={stake.id} className="border-b border-neutral-800/50 last:border-0 hover:bg-neutral-800/20 transition-colors">
                    <td className="py-1 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0">
                          <Image src={displayLogo} alt={stake.name} width={20} height={20} className="object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <span className="font-semibold text-white">{stake.name}</span>
                        <span className="text-neutral-500 hidden sm:inline">{isCompleted ? 'Completed' : stake.status}</span>
                      </div>
                    </td>
                    <td className="py-1.5 px-2 text-right text-white">{stake.stakedAmount}</td>
                    <td className="py-1.5 px-2 text-right text-green-500">{stake.apr}</td>
                    <td className="py-1.5 px-2 text-right text-white">{stake.earned}</td>
                    <td className="py-1.5 px-2 text-right">
                      <Countdown endTime={stake.endTime} />
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <button 
                        disabled={!isCompleted}
                        onClick={() => setSelectedStake(stake)}
                        className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors ${
                          isCompleted 
                            ? 'bg-white text-black hover:bg-neutral-200 cursor-pointer' 
                            : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                        }`}
                      >
                        Claim
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          
          {hasMore && (
            <div className="flex justify-center mt-2 mb-1">
              <button 
                onClick={() => setVisibleCount(prev => prev + 10)}
                className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      )}

      {selectedStake && (
        <ClaimModal 
          isOpen={!!selectedStake} 
          onClose={() => setSelectedStake(null)} 
          stake={selectedStake} 
          onClaimSuccess={() => claimStake(selectedStake.id)}
        />
      )}
    </div>
  )
}

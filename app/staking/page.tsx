import { Header } from "@/components/layout/Header"
import { NewsFeed } from "@/components/sidebar/NewsFeed"
import { TokenList } from "@/components/dashboard/TokenList"
import { StakingOverview } from "@/components/staking/StakingOverview"

export default function StakingPage() {
  return (
    <div className="flex h-screen w-full flex-col bg-[#0a0a0a] text-neutral-100 overflow-hidden font-sans">
      <Header />
      
      <main className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden p-2 sm:p-2 gap-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Left Sidebar (News Feed) */}
        <NewsFeed />

        {/* Center Column - Staking Content */}
        <div className="flex flex-1 flex-col gap-2 min-w-0 lg:overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex flex-col gap-2 pb-4">
            {/* Top Section - Staking Overview */}
            <div className="w-full">
              <StakingOverview />
            </div>
            
            {/* Bottom Section - Stake Tokens */}
            <div className="flex-1 min-h-[500px]">
              <TokenList />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

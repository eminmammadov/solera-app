import { Header } from "@/components/layout/Header"
import { MainChart } from "@/components/dashboard/MainChart"
import { TokenList } from "@/components/dashboard/TokenList"
import { AssetInfo } from "@/components/sidebar/AssetInfo"
import { LatestListing } from "@/components/sidebar/LatestListing"
import { TopNews } from "@/components/sidebar/LatestBlog"
import { NewsFeed, NewsFeedContent } from "@/components/sidebar/NewsFeed"
import { TotalStakedMetrics } from "@/components/dashboard/TotalStakedMetrics"
import { TotalTvlMetrics } from "@/components/dashboard/TotalUserMetrics"

export default function HomePage() {
  return (
    <div className="flex h-screen w-full flex-col bg-[#0a0a0a] text-neutral-100 overflow-hidden font-sans">
      <Header />
      
      <main className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden p-2 sm:p-2 gap-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Left Sidebar (News Feed) */}
        <NewsFeed />

        {/* Center Column */}
        <div className="flex flex-1 flex-col gap-2 min-w-0 lg:overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-2 min-h-[300px] lg:min-h-0 lg:flex-1 overflow-hidden">
            {/* Metrics */}
            <div className="flex flex-row sm:flex-col gap-2 shrink-0 sm:w-[200px] lg:w-[220px]">
              <div className="flex-1 min-w-0">
                <TotalStakedMetrics />
              </div>
              <div className="flex-1 min-w-0">
                <TotalTvlMetrics />
              </div>
            </div>
            
            {/* Chart */}
            <div className="flex-1 min-w-0 relative overflow-hidden">
              <MainChart />
            </div>
          </div>
          <div className="h-[400px] lg:h-[385px] shrink-0">
            <TokenList />
          </div>
        </div>
        
        {/* Right Sidebar */}
        <div className="w-full lg:w-[340px] shrink-0 flex flex-col gap-2 lg:overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
            <div className="flex-1 min-w-0">
              <AssetInfo />
            </div>
            <div className="flex-1 min-w-0 relative">
              <div className="sm:absolute sm:inset-0 lg:relative lg:inset-auto h-full">
                <TopNews />
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
            <div className="hidden sm:block lg:hidden flex-1 min-w-0 relative">
              <div className="absolute inset-0">
                <NewsFeedContent />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <LatestListing />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

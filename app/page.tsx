import { Header } from "@/components/dashboard/header"
import { MainChart } from "@/components/dashboard/main-chart"
import { TokenList } from "@/components/dashboard/token-list"
import { AssetInfo } from "@/components/dashboard/sidebar/asset-info"
import { LatestListing } from "@/components/dashboard/sidebar/latest-listing"
import { TopNews } from "@/components/dashboard/sidebar/top-news"
import { NewsFeed, NewsFeedContent } from "@/components/dashboard/sidebar/news-feed"
import { NewsReadOverlay } from "@/components/dashboard/news-read-overlay"

export default function DashboardPage() {
  return (
    <div className="flex h-screen w-full flex-col bg-[#0a0a0a] text-neutral-100 overflow-hidden font-sans">
      <Header />
      
      <main className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden p-2 sm:p-4 gap-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Left Sidebar (News Feed) */}
        <NewsFeed />

        {/* Center Column */}
        <div className="flex flex-1 flex-col gap-2 min-w-0 lg:overflow-hidden">
          <div className="min-h-[300px] lg:min-h-0 lg:flex-1 overflow-hidden relative">
            <MainChart />
            <NewsReadOverlay />
          </div>
          <div className="h-[400px] lg:h-[280px] shrink-0">
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

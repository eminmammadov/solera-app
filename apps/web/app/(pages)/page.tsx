import { PublicAppShell } from "@/app/_shared/PublicAppShell"
import { MainChart } from "@/components/home/MainChart"
import { TokenList } from "@/components/home/TokenList"
import { AssetInfo } from "@/components/panels/AssetInfo"
import { LatestListing } from "@/components/panels/LatestListing"
import { TopNews } from "@/components/panels/LatestBlog"
import { NewsFeed, NewsFeedContent } from "@/components/panels/NewsFeed"
import { TotalStakedMetrics } from "@/components/home/TotalStakedMetrics"
import { TotalUserMetrics } from "@/components/home/TotalUserMetrics"

export default function HomePage() {
  return (
    <PublicAppShell>
      <main className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden p-2 sm:p-2 gap-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <NewsFeed />

        <div className="flex flex-1 flex-col gap-2 min-w-0 lg:overflow-y-auto xl:overflow-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex flex-col xl:flex-row gap-2 min-h-[520px] xl:min-h-0 xl:flex-1 overflow-visible xl:overflow-hidden">
            <div className="grid grid-cols-2 gap-2 shrink-0 xl:w-[220px] xl:grid-cols-1">
              <div className="flex-1 min-w-0">
                <TotalStakedMetrics />
              </div>
              <div className="flex-1 min-w-0">
                <TotalUserMetrics />
              </div>
            </div>

            <div className="flex-1 min-w-0 min-h-[320px] md:min-h-[360px] xl:min-h-0 relative overflow-hidden">
              <MainChart />
            </div>
          </div>
          <div className="h-[400px] xl:h-[493px] shrink-0">
            <TokenList />
          </div>
        </div>

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
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 h-[400px] lg:h-[493px] min-h-0">
            <div className="hidden sm:block lg:hidden flex-1 min-w-0 min-h-0 relative">
              <div className="absolute inset-0">
                <NewsFeedContent />
              </div>
            </div>
            <div className="flex-1 min-w-0 min-h-0">
              <LatestListing />
            </div>
          </div>
        </div>
      </main>
    </PublicAppShell>
  )
}

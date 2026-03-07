import { Header } from "@/components/layout/Header"
import { NewsFeed } from "@/components/sidebar/NewsFeed"
import { ProfileOverview } from "@/components/profile/ProfileOverview"
import { Portfolio } from "@/components/profile/Portfolio"
import { TotalEarned } from "@/components/profile/TotalEarned"
import { ActiveStakings } from "@/components/profile/ActiveStakings"
import { TransactionHistory } from "@/components/profile/TransactionHistory"

export default function ProfilePage() {
  return (
    <div className="flex h-screen w-full flex-col bg-[#0a0a0a] text-neutral-100 overflow-hidden font-sans">
      <Header />
      
      <main className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden p-2 sm:p-2 gap-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Left Sidebar (News Feed) */}
        <NewsFeed />

        {/* Center Column - Profile Content */}
        <div className="flex flex-1 flex-col gap-2 min-w-0 lg:overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex flex-col gap-2 pb-4">
            <div className="flex flex-col lg:flex-row gap-2 items-stretch">
              <div className="flex-[1.5] min-w-0">
                <ProfileOverview />
              </div>
              <div className="flex flex-col sm:flex-row lg:contents gap-2">
                <div className="flex-1 min-w-0 relative min-h-[280px] lg:min-h-0">
                  <div className="absolute inset-0">
                    <Portfolio />
                  </div>
                </div>
                <div className="flex-1 lg:max-w-[280px] min-w-0">
                  <TotalEarned />
                </div>
              </div>
            </div>
            <div className="flex flex-col lg:flex-row gap-2">
              <div className="flex-1 min-w-0">
                <ActiveStakings />
              </div>
              <div className="flex-1 min-w-0">
                <TransactionHistory />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

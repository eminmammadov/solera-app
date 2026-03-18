import { FeedPageShell } from "@/app/_shared/PublicAppShell"
import { ProfileOverview } from "@/components/profile/ProfileOverview"
import { Portfolio } from "@/components/profile/Portfolio"
import { TotalEarned } from "@/components/profile/TotalEarned"
import { ActiveStakings } from "@/components/profile/ActiveStakings"
import { TransactionHistory } from "@/components/profile/TransactionHistory"

export default function ProfilePage() {
  return (
    <FeedPageShell innerClassName="flex flex-col gap-2 pb-4 lg:pb-0 xl:flex-1 xl:overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-2 items-stretch shrink-0 xl:h-[280px]">
        <div className="min-w-0 md:col-span-2 xl:col-span-7">
          <ProfileOverview />
        </div>
        <div className="min-w-0 relative min-h-[280px] xl:min-h-0 xl:h-full xl:col-span-3">
          <Portfolio />
        </div>
        <div className="min-w-0 md:min-h-[280px] xl:min-h-0 xl:h-full xl:col-span-2 xl:max-w-[280px] xl:w-full">
          <TotalEarned />
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 xl:mt-2 xl:flex-1 xl:min-h-0 xl:overflow-hidden">
        <div className="min-w-0 xl:overflow-hidden">
          <ActiveStakings />
        </div>
        <div className="min-w-0 xl:overflow-hidden">
          <TransactionHistory />
        </div>
      </div>
    </FeedPageShell>
  )
}

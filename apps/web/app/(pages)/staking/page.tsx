import { FeedPageShell } from "@/app/_shared/PublicAppShell"
import { TokenList } from "@/components/home/TokenList"
import { StakingOverview } from "@/components/staking/StakingOverview"

export default function StakingPage() {
  return (
    <FeedPageShell>
      <div className="w-full shrink-0">
        <StakingOverview />
      </div>
      <div className="flex-1 min-h-[500px] lg:min-h-0 lg:overflow-hidden">
        <TokenList />
      </div>
    </FeedPageShell>
  )
}

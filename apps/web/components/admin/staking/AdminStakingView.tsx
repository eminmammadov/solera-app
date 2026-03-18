"use client";

import { StakingAdminContent } from "@/components/admin/staking/StakingAdminContent";

export default function AdminStakingView() {
  return (
    <div className="admin-page flex flex-col gap-2 w-full flex-1">
      <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 sm:p-5 shrink-0">
        <h1 className="text-2xl font-bold text-white">Staking Operations</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Manage on-chain staking runtime, token config sync, funding coverage and migration controls.
        </p>
      </div>

      <StakingAdminContent />
    </div>
  );
}

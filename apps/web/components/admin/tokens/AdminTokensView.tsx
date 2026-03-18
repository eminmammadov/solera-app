"use client";

import { TokensContent } from "@/components/admin/tokens/TokensContent";

export default function AdminTokensView() {
  return (
    <div className="admin-page flex flex-col gap-2 w-full flex-1">
      <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 sm:p-5 shrink-0">
        <h1 className="text-2xl font-bold text-white">Market Tokens</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Manage token catalog data, staking rates, visibility flags and live market pricing inputs.
        </p>
      </div>

      <TokensContent />
    </div>
  );
}

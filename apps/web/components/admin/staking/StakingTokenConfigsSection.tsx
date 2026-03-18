"use client";

import { Loader2, SendHorizonal } from "lucide-react";
import type { TokenStakeConfigProjection } from "@/components/admin/staking/types";

interface StakingTokenConfigsSectionProps {
  tokenConfigs: TokenStakeConfigProjection[];
  isLoading: boolean;
  preparingTokenId: string | null;
  focusTokenId: string | null;
  onPrepareSync: (tokenId: string) => void;
}

export function StakingTokenConfigsSection({
  tokenConfigs,
  isLoading,
  preparingTokenId,
  focusTokenId,
  onPrepareSync,
}: StakingTokenConfigsSectionProps) {
  const sortedTokenConfigs = [...tokenConfigs].sort((left, right) => {
    if (left.tokenId === focusTokenId) return -1;
    if (right.tokenId === focusTokenId) return 1;
    return left.ticker.localeCompare(right.ticker);
  });

  return (
    <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Token Config Projections</h3>
          <p className="text-xs text-neutral-500 mt-1">
            Per-token on-chain staking configuration candidates and sync preparation controls.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-300">
          {tokenConfigs.length} tokens
        </span>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-900 text-neutral-400 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 font-medium">Token</th>
              <th className="px-4 py-3 font-medium">Mint</th>
              <th className="px-4 py-3 font-medium">APR (7d/1m/3m/12m)</th>
              <th className="px-4 py-3 font-medium">Limits</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                  Loading staking token projections...
                </td>
              </tr>
            ) : tokenConfigs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                  No staking token projections available.
                </td>
              </tr>
            ) : (
              sortedTokenConfigs.map((projection) => {
                const tone =
                  projection.syncStatus === "ready"
                    ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20"
                    : projection.syncStatus === "missing_mint"
                      ? "text-amber-300 bg-amber-500/10 border-amber-500/20"
                      : "text-neutral-300 bg-neutral-500/10 border-neutral-500/20";

                const label =
                  projection.syncStatus === "ready"
                    ? "Ready"
                    : projection.syncStatus === "missing_mint"
                      ? "Missing Mint"
                      : "Env Pending";

                return (
                  <tr
                    key={projection.tokenId}
                    className={`bg-neutral-950/40 ${projection.tokenId === focusTokenId ? "ring-1 ring-inset ring-sky-500/30" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-white">{projection.ticker}</div>
                        {projection.tokenId === focusTokenId ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-300">
                            Focused
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {projection.tokenName} • {projection.network}
                      </div>
                    </td>
                    <td className="px-4 py-3 break-all text-neutral-300">
                      {projection.mintAddress ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-neutral-200">
                      {[
                        `${(projection.apr7dBps / 100).toFixed(2)}%`,
                        `${(projection.apr1mBps / 100).toFixed(2)}%`,
                        `${(projection.apr3mBps / 100).toFixed(2)}%`,
                        `${(projection.apr12mBps / 100).toFixed(2)}%`,
                      ].join(" / ")}
                    </td>
                    <td className="px-4 py-3 text-neutral-300">
                      ${projection.minStakeUsd.toFixed(0)} - ${projection.maxStakeUsd.toFixed(0)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-full border ${tone}`}>
                        {label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onPrepareSync(projection.tokenId)}
                        disabled={preparingTokenId === projection.tokenId}
                        className="inline-flex items-center gap-2 rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-300 transition-colors hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {preparingTokenId === projection.tokenId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <SendHorizonal className="h-3.5 w-3.5" />
                        )}
                        Prepare Sync
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

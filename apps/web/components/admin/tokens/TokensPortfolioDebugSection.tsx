"use client";

import { Loader2, RefreshCw } from "lucide-react";
import type { AdminPortfolioEligibilityResponse } from "@/components/admin/tokens/types";

interface TokensPortfolioDebugSectionProps {
  portfolioDebugWallet: string;
  portfolioDebugLoading: boolean;
  portfolioDebugError: string | null;
  portfolioDebug: AdminPortfolioEligibilityResponse | null;
  onWalletChange: (value: string) => void;
  onRunCheck: () => void;
}

export function TokensPortfolioDebugSection({
  portfolioDebugWallet,
  portfolioDebugLoading,
  portfolioDebugError,
  portfolioDebug,
  onWalletChange,
  onRunCheck,
}: TokensPortfolioDebugSectionProps) {
  return (
    <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Portfolio Eligibility Debug</h3>
          <p className="text-xs text-neutral-500 mt-1">
            Checks why listed tokens are visible or hidden in Profile Portfolio for a wallet.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input type="text" value={portfolioDebugWallet} onChange={(event) => onWalletChange(event.target.value)} placeholder="Wallet address" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50" />
          <button onClick={onRunCheck} disabled={portfolioDebugLoading} className="px-3 py-2 bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 rounded-lg text-sm font-medium hover:bg-cyan-500/25 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 whitespace-nowrap">
            {portfolioDebugLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Run Check
          </button>
        </div>

        {portfolioDebugError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {portfolioDebugError}
          </div>
        )}

        {portfolioDebug && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px]">
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2"><div className="text-neutral-500">Network</div><div className="text-white font-semibold uppercase">{portfolioDebug.network}</div></div>
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2"><div className="text-neutral-500">Active Tokens</div><div className="text-white font-semibold">{portfolioDebug.summary.activeTokens}</div></div>
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2"><div className="text-neutral-500">Configured Mints</div><div className="text-white font-semibold">{portfolioDebug.summary.configuredMints}</div></div>
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2"><div className="text-neutral-500">Wallet Balances</div><div className="text-white font-semibold">{portfolioDebug.summary.configuredTokensWithBalance}</div></div>
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2"><div className="text-neutral-500">Portfolio Visible</div><div className="text-emerald-300 font-semibold">{portfolioDebug.summary.eligibleVisibleTokens}</div></div>
            </div>

            <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-[11px] text-neutral-300">
              RA Mint: <span className="text-white">{portfolioDebug.ra.mint}</span> · Wallet RA:{" "}
              <span className="text-emerald-300">{portfolioDebug.ra.walletAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-neutral-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-900 text-neutral-400 uppercase">
                  <tr>
                    <th className="px-3 py-2 font-medium">Token</th>
                    <th className="px-3 py-2 font-medium">Mint</th>
                    <th className="px-3 py-2 font-medium text-right">Wallet</th>
                    <th className="px-3 py-2 font-medium text-center">Visible</th>
                    <th className="px-3 py-2 font-medium">Reasons</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolioDebug.tokens.map((item) => (
                    <tr key={item.ticker} className="border-t border-neutral-800">
                      <td className="px-3 py-2"><div className="text-white font-semibold">{item.ticker}</div><div className="text-[10px] text-neutral-500">{item.name}</div></td>
                      <td className="px-3 py-2 text-neutral-300">{item.mint ?? "-"}</td>
                      <td className="px-3 py-2 text-right text-neutral-100">{item.walletAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                      <td className="px-3 py-2 text-center"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase ${item.visibleInPortfolio ? "bg-emerald-500/10 text-emerald-300" : "bg-neutral-700/40 text-neutral-300"}`}>{item.visibleInPortfolio ? "yes" : "no"}</span></td>
                      <td className="px-3 py-2 text-neutral-400">{item.reasons.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {portfolioDebug.unknownWalletMints.length > 0 && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                <div className="font-semibold mb-1">Wallet holds mints that are not in token list:</div>
                <div className="space-y-1">
                  {portfolioDebug.unknownWalletMints.slice(0, 10).map((item) => (
                    <div key={item.mint}>
                      {item.mint} · {item.walletAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

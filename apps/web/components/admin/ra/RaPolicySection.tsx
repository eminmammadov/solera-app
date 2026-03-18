"use client";

type OracleProvider = "DEXSCREENER" | "RAYDIUM";

interface RaPolicySectionProps {
  oraclePrimary: OracleProvider;
  oracleSecondary: OracleProvider | null;
  stakeFeeBps: number;
  claimFeeBps: number;
  stakeMinUsd: number;
  stakeMaxUsd: number;
  convertMinUsd: number;
  convertMaxUsd: number;
  oracleOptions: OracleProvider[];
  onOraclePrimaryChange: (value: OracleProvider) => void;
  onOracleSecondaryChange: (value: OracleProvider | null) => void;
  onStakeFeeBpsChange: (value: number) => void;
  onClaimFeeBpsChange: (value: number) => void;
  onStakeMinUsdChange: (value: number) => void;
  onStakeMaxUsdChange: (value: number) => void;
  onConvertMinUsdChange: (value: number) => void;
  onConvertMaxUsdChange: (value: number) => void;
}

export function RaPolicySection({
  oraclePrimary,
  oracleSecondary,
  stakeFeeBps,
  claimFeeBps,
  stakeMinUsd,
  stakeMaxUsd,
  convertMinUsd,
  convertMaxUsd,
  oracleOptions,
  onOraclePrimaryChange,
  onOracleSecondaryChange,
  onStakeFeeBpsChange,
  onClaimFeeBpsChange,
  onStakeMinUsdChange,
  onStakeMaxUsdChange,
  onConvertMinUsdChange,
  onConvertMaxUsdChange,
}: RaPolicySectionProps) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-[#0a0a0a] p-4 space-y-3">
      <h4 className="text-sm font-semibold text-white">Oracle & Fee Policy</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Primary Oracle</label>
          <select value={oraclePrimary} onChange={(e) => onOraclePrimaryChange((e.target.value as OracleProvider) || "DEXSCREENER")} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50">
            {oracleOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Secondary Oracle</label>
          <select value={oracleSecondary ?? ""} onChange={(e) => onOracleSecondaryChange((e.target.value as OracleProvider) || null)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50">
            <option value="">None</option>
            {oracleOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Stake Fee (bps)</label>
          <input type="number" min={0} max={10_000} value={stakeFeeBps} onChange={(e) => onStakeFeeBpsChange(Number(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50" />
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Claim Fee (bps)</label>
          <input type="number" min={0} max={10_000} value={claimFeeBps} onChange={(e) => onClaimFeeBpsChange(Number(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Stake Min USD</label>
          <input type="number" min={0} step="0.01" value={stakeMinUsd} onChange={(e) => onStakeMinUsdChange(Number(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50" />
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Stake Max USD</label>
          <input type="number" min={0} step="0.01" value={stakeMaxUsd} onChange={(e) => onStakeMaxUsdChange(Number(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50" />
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Convert Min USD</label>
          <input type="number" min={0} step="0.01" value={convertMinUsd} onChange={(e) => onConvertMinUsdChange(Number(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50" />
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Convert Max USD</label>
          <input type="number" min={0} step="0.01" value={convertMaxUsd} onChange={(e) => onConvertMaxUsdChange(Number(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50" />
        </div>
      </div>
    </div>
  );
}

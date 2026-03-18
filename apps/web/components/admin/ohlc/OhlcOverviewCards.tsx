"use client";

interface OhlcOverviewCardsProps {
  primaryPairKey: string;
  latestTickAt: string | null;
  latestPriceUsd: number | null;
  lagSeconds: number | null;
  formatDate: (value: string | null | undefined) => string;
  formatUsd: (value: number | null | undefined) => string;
}

export function OhlcOverviewCards({
  primaryPairKey,
  latestTickAt,
  latestPriceUsd,
  lagSeconds,
  formatDate,
  formatUsd,
}: OhlcOverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      <div className="rounded-xl border border-neutral-800 bg-[#0a0a0a] p-4">
        <p className="text-[11px] uppercase tracking-wide text-neutral-500">Primary Pair</p>
        <p className="text-sm text-white mt-1">{primaryPairKey}</p>
      </div>
      <div className="rounded-xl border border-neutral-800 bg-[#0a0a0a] p-4">
        <p className="text-[11px] uppercase tracking-wide text-neutral-500">Latest Tick</p>
        <p className="text-sm text-neutral-200 mt-1">{formatDate(latestTickAt)}</p>
        <p className="text-[11px] text-neutral-500 mt-1">Lag: {lagSeconds !== null ? `${lagSeconds}s` : "-"}</p>
      </div>
      <div className="rounded-xl border border-neutral-800 bg-[#0a0a0a] p-4">
        <p className="text-[11px] uppercase tracking-wide text-neutral-500">Latest Price</p>
        <p className="text-sm text-white mt-1">{formatUsd(latestPriceUsd)} USD</p>
      </div>
    </div>
  );
}

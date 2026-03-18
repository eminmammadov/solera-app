"use client";

import { Database, Loader2, RefreshCcw, Save } from "lucide-react";

type HeaderNetwork = "devnet" | "mainnet";

interface RaOverviewSectionProps {
  headerNetwork: HeaderNetwork;
  tokenSymbol: string;
  tokenName: string;
  activeMint: string;
  activeTreasury: string;
  isLoading: boolean;
  isSaving: boolean;
  isMigrating: boolean;
  hasChanges: boolean;
  onRefresh: () => void;
  onSave: () => void;
  onMigrate: () => void;
}

export function RaOverviewSection({
  headerNetwork,
  tokenSymbol,
  tokenName,
  activeMint,
  activeTreasury,
  isLoading,
  isSaving,
  isMigrating,
  hasChanges,
  onRefresh,
  onSave,
  onMigrate,
}: RaOverviewSectionProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-white">RA Policy Control</h3>
        <p className="text-xs text-neutral-500">
          Token identity: <span className="text-neutral-300">{tokenName}</span> ·{" "}
          <span className="uppercase text-neutral-300">{tokenSymbol}</span>
        </p>
        <p className="text-xs text-neutral-500">
          Active network: <span className="uppercase text-neutral-300">{headerNetwork}</span>
        </p>
        <p className="text-[11px] text-neutral-500 break-all">
          Active mint: <span className="text-neutral-300">{activeMint}</span>
        </p>
        <p className="text-[11px] text-neutral-500 break-all">
          Active treasury: <span className="text-neutral-300">{activeTreasury}</span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading || isSaving || isMigrating}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-300 border border-neutral-700 hover:bg-neutral-800 transition-colors disabled:opacity-60 cursor-pointer"
        >
          <RefreshCcw className="w-4 h-4" />
          Refresh
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!hasChanges || isSaving || isMigrating}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
        <button
          type="button"
          onClick={onMigrate}
          disabled={isMigrating || isSaving}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-200 border border-neutral-700 hover:bg-neutral-800 transition-colors disabled:opacity-60 cursor-pointer"
        >
          {isMigrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          Migrate
        </button>
      </div>
    </div>
  );
}

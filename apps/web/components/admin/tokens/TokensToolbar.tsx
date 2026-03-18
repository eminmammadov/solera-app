"use client";

import Link from "next/link";
import { Loader2, Plus, RefreshCw, Search } from "lucide-react";

interface TokensToolbarProps {
  search: string;
  isSyncingPrices: boolean;
  isRuntimeLoading: boolean;
  isEditing: boolean;
  onSearchChange: (value: string) => void;
  onSyncPrices: () => void;
  onAddNew: () => void;
}

export function TokensToolbar({
  search,
  isSyncingPrices,
  isRuntimeLoading,
  isEditing,
  onSearchChange,
  onSyncPrices,
  onAddNew,
}: TokensToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="relative w-full sm:max-w-sm sm:flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
        <input
          type="text"
          placeholder="Search token..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-[#111111] border border-neutral-800 rounded-lg pl-9 pr-4 py-2 text-sm text-neutral-200 outline-none focus:border-purple-500/50"
        />
      </div>
      <div className="flex w-full sm:w-auto items-center justify-end flex-wrap gap-2">
        <Link
          href="/admin/staking"
          className="px-3 py-2 bg-sky-500/10 text-sky-300 border border-sky-500/20 rounded-lg text-sm font-medium hover:bg-sky-500/20 transition-all flex items-center gap-2 cursor-pointer"
        >
          Staking Console
        </Link>
        <button
          onClick={onSyncPrices}
          disabled={isSyncingPrices || isRuntimeLoading}
          className="px-3 py-2 bg-neutral-900 text-neutral-200 border border-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-800 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSyncingPrices ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Sync Prices
        </button>
        <button
          onClick={onAddNew}
          disabled={isEditing}
          className="px-4 py-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg text-sm font-medium hover:bg-purple-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          New Token
        </button>
      </div>
    </div>
  );
}

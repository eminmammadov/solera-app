"use client";

import { Loader2, Save, SlidersHorizontal, Zap } from "lucide-react";
import type { MarketLivePricingRuntime } from "@/components/admin/tokens/types";

interface RuntimeDraft {
  livePriceEnabled: boolean;
  cacheTtlMs: number;
  requestTimeoutMs: number;
  maxParallelRequests: number;
}

interface TokensRuntimeSectionProps {
  runtime: MarketLivePricingRuntime;
  runtimeDraft: RuntimeDraft;
  runtimeDirty: boolean;
  isRuntimeLoading: boolean;
  isSavingRuntime: boolean;
  onRuntimeDraftChange: (nextDraft: RuntimeDraft) => void;
  onSaveRuntime: () => void;
}

export function TokensRuntimeSection({
  runtime,
  runtimeDraft,
  runtimeDirty,
  isRuntimeLoading,
  isSavingRuntime,
  onRuntimeDraftChange,
  onSaveRuntime,
}: TokensRuntimeSectionProps) {
  return (
    <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Live Price Runtime</h3>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Control DexScreener sync, cache and timeout for token price/24h change enrichment.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-full border ${
            runtime.livePriceEnabled
              ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20"
              : "text-neutral-300 bg-neutral-500/10 border-neutral-500/20"
          }`}
        >
          <Zap className="w-3 h-3" />
          {runtime.livePriceEnabled ? "Live On" : "Live Off"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
        <label className="flex items-center justify-between bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 cursor-pointer">
          <span className="text-sm text-neutral-300">Enable live price API</span>
          <input
            type="checkbox"
            checked={runtimeDraft.livePriceEnabled}
            onChange={(event) => onRuntimeDraftChange({ ...runtimeDraft, livePriceEnabled: event.target.checked })}
            className="accent-emerald-500"
          />
        </label>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Cache TTL (ms)</label>
          <input type="number" min={5000} max={300000} value={runtimeDraft.cacheTtlMs} onChange={(event) => onRuntimeDraftChange({ ...runtimeDraft, cacheTtlMs: Number(event.target.value) })} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50" />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Request Timeout (ms)</label>
          <input type="number" min={1000} max={15000} value={runtimeDraft.requestTimeoutMs} onChange={(event) => onRuntimeDraftChange({ ...runtimeDraft, requestTimeoutMs: Number(event.target.value) })} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50" />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Max Parallel Requests</label>
          <input type="number" min={1} max={10} value={runtimeDraft.maxParallelRequests} onChange={(event) => onRuntimeDraftChange({ ...runtimeDraft, maxParallelRequests: Number(event.target.value) })} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] text-neutral-500 flex flex-wrap items-center gap-3">
          <span>Cache entries: {runtime.cacheEntries}</span>
          <span>In-flight: {runtime.inFlightRequests}</span>
          <span>Tracked mints: {runtime.trackedMints ?? 0}</span>
          <span>Last sync: {runtime.lastSyncAt ? new Date(runtime.lastSyncAt).toLocaleString("en-US") : "-"}</span>
        </div>
        <button
          onClick={onSaveRuntime}
          disabled={isRuntimeLoading || isSavingRuntime || !runtimeDirty}
          className="px-3 py-2 bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 rounded-lg text-xs font-medium hover:bg-emerald-500/25 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
        >
          {isSavingRuntime ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Runtime
        </button>
      </div>
    </div>
  );
}

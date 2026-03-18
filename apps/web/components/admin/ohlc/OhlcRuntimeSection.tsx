"use client";

import { Loader2, PauseCircle, PlayCircle, RefreshCcw, Save, Zap } from "lucide-react";

interface RuntimeForm {
  ingestEnabled: boolean;
  pollIntervalMs: number;
}

interface OhlcRuntimeSectionProps {
  runtime: RuntimeForm;
  minInterval: number;
  maxInterval: number;
  runtimeDirty: boolean;
  isSavingRuntime: boolean;
  isSyncing: boolean;
  toSeconds: (ms: number) => number;
  onRuntimeChange: (nextRuntime: RuntimeForm) => void;
  onSaveRuntime: () => void;
  onSyncNow: () => void;
  onRefresh: () => void;
}

export function OhlcRuntimeSection({
  runtime,
  minInterval,
  maxInterval,
  runtimeDirty,
  isSavingRuntime,
  isSyncing,
  toSeconds,
  onRuntimeChange,
  onSaveRuntime,
  onSyncNow,
  onRefresh,
}: OhlcRuntimeSectionProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="rounded-xl border border-neutral-800 bg-[#0a0a0a] p-4">
          <label className="inline-flex items-center gap-2 text-sm text-neutral-200 cursor-pointer">
            <input
              type="checkbox"
              checked={runtime.ingestEnabled}
              onChange={(e) => onRuntimeChange({ ...runtime, ingestEnabled: e.target.checked })}
              className="accent-emerald-500"
            />
            Ingestion Enabled
          </label>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-[#0a0a0a] p-4">
          <label className="block text-sm text-neutral-200 mb-1.5">Poll Interval (seconds)</label>
          <input
            type="number"
            min={toSeconds(minInterval)}
            max={toSeconds(maxInterval)}
            value={toSeconds(runtime.pollIntervalMs)}
            onChange={(e) =>
              onRuntimeChange({
                ...runtime,
                pollIntervalMs: Number.parseInt(e.target.value || "0", 10) * 1000,
              })
            }
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onSaveRuntime}
          disabled={isSavingRuntime || !runtimeDirty}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-xs text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSavingRuntime ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Runtime
        </button>
        <button
          onClick={onSyncNow}
          disabled={isSyncing}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          Sync Now
        </button>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 cursor-pointer"
        >
          <RefreshCcw className="w-4 h-4" />
          Refresh
        </button>
        <button
          onClick={() => onRuntimeChange({ ...runtime, ingestEnabled: !runtime.ingestEnabled })}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 cursor-pointer"
        >
          {runtime.ingestEnabled ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
          {runtime.ingestEnabled ? "Pause Ingestion" : "Resume Ingestion"}
        </button>
      </div>
    </>
  );
}

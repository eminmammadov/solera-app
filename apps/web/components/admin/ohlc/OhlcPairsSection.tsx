"use client";

import { CheckCircle2, Loader2, PauseCircle, PlayCircle, Plus, Save, Trash2 } from "lucide-react";

interface OhlcPair {
  id: number;
  pairKey: string;
  poolId: string;
  baseMint: string;
  quoteMint: string;
  baseSymbol: string;
  quoteSymbol: string;
  isActive: boolean;
  isCore: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  latestTickAt: string | null;
  latestPriceUsd: number | null;
}

interface NewPairForm {
  pairKey: string;
  poolId: string;
  baseMint: string;
  quoteMint: string;
  baseSymbol: string;
  quoteSymbol: string;
  isActive: boolean;
}

interface OhlcPairsSectionProps {
  newPair: NewPairForm;
  pairs: OhlcPair[];
  pairsSynced: OhlcPair[];
  busyPairId: number | null;
  isCreatingPair: boolean;
  canCreatePair: boolean;
  formatDate: (value: string | null | undefined) => string;
  formatUsd: (value: number | null | undefined) => string;
  isPairPayloadValid: (payload: {
    pairKey: string;
    poolId: string;
    baseMint: string;
    quoteMint: string;
    baseSymbol: string;
    quoteSymbol: string;
  }) => boolean;
  rowEqual: (a: OhlcPair, b: OhlcPair) => boolean;
  onNewPairChange: (nextPair: NewPairForm) => void;
  onCreatePair: () => void;
  onPairFieldChange: (id: number, key: keyof OhlcPair, value: string | boolean) => void;
  onSavePair: (pair: OhlcPair) => void;
  onTogglePair: (pair: OhlcPair) => void;
  onSetFeaturedPair: (pair: OhlcPair) => void;
  onRemovePair: (pair: OhlcPair) => void;
}

export function OhlcPairsSection({
  newPair,
  pairs,
  pairsSynced,
  busyPairId,
  isCreatingPair,
  canCreatePair,
  formatDate,
  formatUsd,
  isPairPayloadValid,
  rowEqual,
  onNewPairChange,
  onCreatePair,
  onPairFieldChange,
  onSavePair,
  onTogglePair,
  onSetFeaturedPair,
  onRemovePair,
}: OhlcPairsSectionProps) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-[#0a0a0a] p-4 space-y-3">
      <h4 className="text-sm font-medium text-white">Pairs CRUD</h4>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
        <input value={newPair.pairKey} onChange={(e) => onNewPairChange({ ...newPair, pairKey: e.target.value })} placeholder="PAIR_KEY" className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white" />
        <input value={newPair.poolId} onChange={(e) => onNewPairChange({ ...newPair, poolId: e.target.value })} placeholder="Pool ID" className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white" />
        <input value={newPair.baseMint} onChange={(e) => onNewPairChange({ ...newPair, baseMint: e.target.value })} placeholder="Base Mint" className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white" />
        <input value={newPair.quoteMint} onChange={(e) => onNewPairChange({ ...newPair, quoteMint: e.target.value })} placeholder="Quote Mint" className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white" />
        <input value={newPair.baseSymbol} onChange={(e) => onNewPairChange({ ...newPair, baseSymbol: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16) })} placeholder="BASE" className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white" />
        <input value={newPair.quoteSymbol} onChange={(e) => onNewPairChange({ ...newPair, quoteSymbol: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16) })} placeholder="QUOTE" className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white" />
      </div>
      <div className="flex items-center gap-2">
        <label className="inline-flex items-center gap-2 text-xs text-neutral-300">
          <input type="checkbox" checked={newPair.isActive} onChange={(e) => onNewPairChange({ ...newPair, isActive: e.target.checked })} className="accent-emerald-500" />
          Active
        </label>
        <button
          onClick={onCreatePair}
          disabled={isCreatingPair || !canCreatePair}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isCreatingPair ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add Pair
        </button>
      </div>

      <div className="space-y-2 max-h-[360px] overflow-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {pairs.map((pair) => {
          const synced = pairsSynced.find((x) => x.id === pair.id);
          const dirty = synced ? !rowEqual(pair, synced) : false;
          const busy = busyPairId === pair.id;
          const editablePayloadValid = isPairPayloadValid({
            pairKey: pair.pairKey,
            poolId: pair.poolId,
            baseMint: pair.baseMint,
            quoteMint: pair.quoteMint,
            baseSymbol: pair.baseSymbol,
            quoteSymbol: pair.quoteSymbol,
          });

          return (
            <div key={pair.id} className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white">{pair.pairKey}</span>
                  {pair.isCore && <span className="text-[10px] px-2 py-0.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-300">Core</span>}
                  {pair.isFeatured && <span className="text-[10px] px-2 py-0.5 rounded-full border border-purple-500/20 bg-purple-500/10 text-purple-300">Frontend</span>}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${pair.isActive ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-neutral-500/20 bg-neutral-500/10 text-neutral-300"}`}>{pair.isActive ? "Active" : "Inactive"}</span>
                </div>
                <span className="text-[10px] text-neutral-500">Last tick: {formatDate(pair.latestTickAt)}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                <input disabled={pair.isCore} value={pair.pairKey} onChange={(e) => onPairFieldChange(pair.id, "pairKey", e.target.value)} className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed" />
                <input disabled={pair.isCore} value={pair.poolId} onChange={(e) => onPairFieldChange(pair.id, "poolId", e.target.value)} className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed" />
                <input disabled={pair.isCore} value={pair.baseMint} onChange={(e) => onPairFieldChange(pair.id, "baseMint", e.target.value)} className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed" />
                <input disabled={pair.isCore} value={pair.quoteMint} onChange={(e) => onPairFieldChange(pair.id, "quoteMint", e.target.value)} className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed" />
                <input disabled={pair.isCore} value={pair.baseSymbol} onChange={(e) => onPairFieldChange(pair.id, "baseSymbol", e.target.value)} className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed" />
                <input disabled={pair.isCore} value={pair.quoteSymbol} onChange={(e) => onPairFieldChange(pair.id, "quoteSymbol", e.target.value)} className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed" />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onSavePair(pair)} disabled={busy || !dirty || pair.isCore || !editablePayloadValid} className="inline-flex items-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1.5 text-[11px] text-emerald-300 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </button>
                <button onClick={() => onTogglePair(pair)} disabled={busy} className="inline-flex items-center gap-1.5 rounded border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 text-[11px] text-neutral-300 cursor-pointer">
                  {pair.isActive ? <PauseCircle className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                  {pair.isActive ? "Disable" : "Enable"}
                </button>
                <button onClick={() => onSetFeaturedPair(pair)} disabled={busy || pair.isFeatured || !pair.isActive} className="inline-flex items-center gap-1.5 rounded border border-purple-500/20 bg-purple-500/10 px-2.5 py-1.5 text-[11px] text-purple-300 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
                  Use On Frontend
                </button>
                {!pair.isCore && (
                  <button onClick={() => onRemovePair(pair)} disabled={busy} className="inline-flex items-center gap-1.5 rounded border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-300 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
                <span className="text-[10px] text-neutral-500 ml-auto">Price: {formatUsd(pair.latestPriceUsd)} USD</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

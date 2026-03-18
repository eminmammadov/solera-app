"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAdminOhlcPair,
  deleteAdminOhlcPair,
  fetchAdminOhlcConfig,
  fetchAdminOhlcPairs,
  setAdminOhlcFeaturedPair,
  syncAdminOhlcNow,
  updateAdminOhlcPair,
  updateAdminOhlcRuntime,
} from "@/lib/admin/ohlc-admin";
import { useAdminAsyncController } from "@/hooks/admin/use-admin-async-controller";
import { useFeedbackToast } from "@/hooks/use-feedback-toast";
import { useAdminAuth } from "@/store/admin/use-admin-auth";
import { OhlcOverviewCards } from "@/components/admin/ohlc/OhlcOverviewCards";
import { OhlcPairsSection } from "@/components/admin/ohlc/OhlcPairsSection";
import { OhlcRuntimeSection } from "@/components/admin/ohlc/OhlcRuntimeSection";
import { AlertTriangle, CheckCircle2, Clock3, Loader2 } from "lucide-react";

type OhlcStatus = "ok" | "degraded" | "paused" | "disabled";

interface OhlcConfigResponse {
  success: boolean;
  status: OhlcStatus;
  reason?: string;
  ingestEnabled: boolean;
  pollIntervalMs: number | null;
  featuredPairKey?: string | null;
  minPollIntervalMs: number;
  maxPollIntervalMs: number;
  latestTickAt?: string | null;
  latestPriceUsd?: number | null;
  lagSeconds?: number | null;
  pair: {
    pairKey: string;
    poolId: string;
    baseMint: string;
    quoteMint: string;
    baseSymbol: string;
    quoteSymbol: string;
  };
}

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

interface OhlcPairsResponse {
  success: boolean;
  pairs: OhlcPair[];
}

interface RuntimeForm {
  ingestEnabled: boolean;
  pollIntervalMs: number;
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

const DEFAULT_MIN_INTERVAL = 5000;
const DEFAULT_MAX_INTERVAL = 300000;
const PAIR_KEY_PATTERN = /^[A-Za-z0-9_:-]{2,80}$/;
const BASE58_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,64}$/;
const SYMBOL_PATTERN = /^[A-Z0-9]{2,16}$/;

const formatUsd = (value: number | null | undefined) =>
  Number.isFinite(value ?? NaN)
    ? Number(value).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
      })
    : "-";

const formatDate = (value: string | null | undefined) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-US");
};

const toSeconds = (ms: number) => Math.max(1, Math.floor(ms / 1000));

const STATUS_STYLE: Record<OhlcStatus, string> = {
  ok: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  degraded: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  paused: "bg-neutral-500/10 text-neutral-300 border-neutral-500/20",
  disabled: "bg-red-500/10 text-red-400 border-red-500/20",
};

const EMPTY_PAIR: NewPairForm = {
  pairKey: "",
  poolId: "",
  baseMint: "",
  quoteMint: "",
  baseSymbol: "",
  quoteSymbol: "",
  isActive: true,
};

const rowEqual = (a: OhlcPair, b: OhlcPair) =>
  a.pairKey === b.pairKey &&
  a.poolId === b.poolId &&
  a.baseMint === b.baseMint &&
  a.quoteMint === b.quoteMint &&
  a.baseSymbol === b.baseSymbol &&
  a.quoteSymbol === b.quoteSymbol &&
  a.isActive === b.isActive;

const isPairPayloadValid = (payload: {
  pairKey: string;
  poolId: string;
  baseMint: string;
  quoteMint: string;
  baseSymbol: string;
  quoteSymbol: string;
}) =>
  PAIR_KEY_PATTERN.test(payload.pairKey.trim()) &&
  BASE58_ADDRESS_PATTERN.test(payload.poolId.trim()) &&
  BASE58_ADDRESS_PATTERN.test(payload.baseMint.trim()) &&
  BASE58_ADDRESS_PATTERN.test(payload.quoteMint.trim()) &&
  SYMBOL_PATTERN.test(payload.baseSymbol.trim().toUpperCase()) &&
  SYMBOL_PATTERN.test(payload.quoteSymbol.trim().toUpperCase());

export function OhlcContent() {
  const { token } = useAdminAuth();
  const loadAsync = useAdminAsyncController(true);
  const runtimeAsync = useAdminAsyncController(false);
  const syncAsync = useAdminAsyncController(false);
  const pairAsync = useAdminAsyncController(false);
  const createAsync = useAdminAsyncController(false);
  const { runLoad: runOhlcLoad } = loadAsync;

  const [runtime, setRuntime] = useState<RuntimeForm>({
    ingestEnabled: true,
    pollIntervalMs: DEFAULT_MIN_INTERVAL,
  });
  const [runtimeSynced, setRuntimeSynced] = useState<RuntimeForm>({
    ingestEnabled: true,
    pollIntervalMs: DEFAULT_MIN_INTERVAL,
  });
  const [pairs, setPairs] = useState<OhlcPair[]>([]);
  const [pairsSynced, setPairsSynced] = useState<OhlcPair[]>([]);
  const [newPair, setNewPair] = useState<NewPairForm>(EMPTY_PAIR);

  const [status, setStatus] = useState<OhlcStatus>("degraded");
  const [primaryPairKey, setPrimaryPairKey] = useState("RA_SOL");
  const [latestTickAt, setLatestTickAt] = useState<string | null>(null);
  const [latestPriceUsd, setLatestPriceUsd] = useState<number | null>(null);
  const [lagSeconds, setLagSeconds] = useState<number | null>(null);
  const [minInterval, setMinInterval] = useState(DEFAULT_MIN_INTERVAL);
  const [maxInterval, setMaxInterval] = useState(DEFAULT_MAX_INTERVAL);
  const [serviceDisabled, setServiceDisabled] = useState(false);

  const [busyPairId, setBusyPairId] = useState<number | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const error =
    loadAsync.error ??
    runtimeAsync.error ??
    syncAsync.error ??
    pairAsync.error ??
    createAsync.error;

  useFeedbackToast({
    scope: "admin-ohlc",
    error,
    success,
    errorTitle: "OHLC Control Error",
    successTitle: "OHLC Control",
  });

  const runtimeDirty = useMemo(
    () =>
      runtime.ingestEnabled !== runtimeSynced.ingestEnabled ||
      runtime.pollIntervalMs !== runtimeSynced.pollIntervalMs,
    [runtime, runtimeSynced],
  );

  const applyConfig = useCallback((data: OhlcConfigResponse) => {
    const nextRuntime = {
      ingestEnabled: Boolean(data.ingestEnabled),
      pollIntervalMs: Math.max(data.pollIntervalMs ?? DEFAULT_MIN_INTERVAL, DEFAULT_MIN_INTERVAL),
    };
    setRuntime(nextRuntime);
    setRuntimeSynced(nextRuntime);
    setStatus(data.status);
    setPrimaryPairKey(data.featuredPairKey || data.pair?.pairKey || "RA_SOL");
    setLatestTickAt(data.latestTickAt ?? null);
    setLatestPriceUsd(typeof data.latestPriceUsd === "number" ? data.latestPriceUsd : null);
    setLagSeconds(typeof data.lagSeconds === "number" ? data.lagSeconds : null);
    setMinInterval(Number.isFinite(data.minPollIntervalMs) ? data.minPollIntervalMs : DEFAULT_MIN_INTERVAL);
    setMaxInterval(Number.isFinite(data.maxPollIntervalMs) ? data.maxPollIntervalMs : DEFAULT_MAX_INTERVAL);
    setServiceDisabled(data.status === "disabled" || !data.success);
  }, []);

  const applyPairs = useCallback((data: OhlcPairsResponse) => {
    const nextPairs = Array.isArray(data.pairs) ? data.pairs : [];
    setPairs(nextPairs);
    setPairsSynced(nextPairs);
  }, []);

  const loadAll = useCallback(async () => {
    const payload = await runOhlcLoad(
      () =>
        Promise.all([
          fetchAdminOhlcConfig<OhlcConfigResponse>({ token }),
          fetchAdminOhlcPairs<OhlcPairsResponse>({ token }),
        ]),
      {
        fallbackMessage: "Failed to load OHLC settings",
      },
    );

    if (!payload) {
      return;
    }

    const [cfg, pairData] = payload;
    applyConfig(cfg);
    applyPairs(pairData);
  }, [applyConfig, applyPairs, runOhlcLoad, token]);

  useEffect(() => {
    const runInitialLoad = async () => {
      await loadAll();
    };

    void runInitialLoad();
  }, [loadAll]);

  const saveRuntime = async () => {
    if (runtimeAsync.isActing || serviceDisabled) return;
    if (runtime.pollIntervalMs < minInterval || runtime.pollIntervalMs > maxInterval) {
      runtimeAsync.setError(`Poll interval must be between ${toSeconds(minInterval)}s and ${toSeconds(maxInterval)}s.`);
      return;
    }
    setSuccess(null);
    const data = await runtimeAsync.runAction(
      () =>
        updateAdminOhlcRuntime<OhlcConfigResponse, RuntimeForm>({
          token,
          payload: runtime,
        }),
      {
        fallbackMessage: "Failed to update runtime",
      },
    );

    if (!data) {
      return;
    }

    applyConfig(data);
    setSuccess("OHLC runtime updated.");
  };

  const syncNow = async () => {
    if (syncAsync.isActing || serviceDisabled) return;
    setSuccess(null);
    const data = await syncAsync.runAction(
      () =>
        syncAdminOhlcNow<OhlcConfigResponse>({
          token,
        }),
      {
        fallbackMessage: "Failed to sync",
      },
    );

    if (!data) {
      return;
    }

    applyConfig(data);
    setSuccess("Manual sync completed.");
  };

  const savePair = async (pair: OhlcPair) => {
    const payload = {
      pairKey: pair.pairKey.trim(),
      poolId: pair.poolId.trim(),
      baseMint: pair.baseMint.trim(),
      quoteMint: pair.quoteMint.trim(),
      baseSymbol: pair.baseSymbol.trim().toUpperCase(),
      quoteSymbol: pair.quoteSymbol.trim().toUpperCase(),
    };
    if (!isPairPayloadValid(payload)) {
      pairAsync.setError("Pair update fields are invalid. Check pair key, addresses and symbols.");
      return;
    }

    setBusyPairId(pair.id);
    setSuccess(null);

    const updated = await pairAsync.runAction(
      () =>
        updateAdminOhlcPair<{ success: boolean }, typeof payload & { isActive: boolean }>({
          token,
          pairId: pair.id,
          payload: {
            ...payload,
            isActive: pair.isActive,
          },
        }),
      {
        fallbackMessage: "Failed to update pair",
      },
    );

    if (updated) {
      await loadAll();
      setSuccess(`Pair "${pair.pairKey}" updated.`);
    }

    setBusyPairId(null);
  };

  const togglePair = async (pair: OhlcPair) => {
    await savePair({ ...pair, isActive: !pair.isActive });
  };

  const setFeaturedPair = async (pair: OhlcPair) => {
    if (!pair.isActive) {
      pairAsync.setError("Pair must be active before using it on frontend.");
      return;
    }

    setBusyPairId(pair.id);
    setSuccess(null);

    const data = await pairAsync.runAction(
      () =>
        setAdminOhlcFeaturedPair<OhlcConfigResponse>({
          token,
          pairId: pair.id,
        }),
      {
        fallbackMessage: "Failed to set featured pair",
      },
    );

    if (data) {
      applyConfig(data);
      await loadAll();
      setSuccess(`Frontend pair switched to "${pair.pairKey}".`);
    }

    setBusyPairId(null);
  };

  const removePair = async (pair: OhlcPair) => {
    if (!window.confirm(`Delete "${pair.pairKey}" pair permanently?`)) return;
    setBusyPairId(pair.id);
    setSuccess(null);

    const deleted = await pairAsync.runAction(
      () =>
        deleteAdminOhlcPair<{ success: boolean }>({
          token,
          pairId: pair.id,
        }),
      {
        fallbackMessage: "Failed to delete pair",
      },
    );

    if (deleted) {
      await loadAll();
      setSuccess(`Pair "${pair.pairKey}" deleted.`);
    }

    setBusyPairId(null);
  };

  const createPair = async () => {
    if (createAsync.isActing) return;
    const payload = {
      pairKey: newPair.pairKey.trim(),
      poolId: newPair.poolId.trim(),
      baseMint: newPair.baseMint.trim(),
      quoteMint: newPair.quoteMint.trim(),
      baseSymbol: newPair.baseSymbol.trim().toUpperCase(),
      quoteSymbol: newPair.quoteSymbol.trim().toUpperCase(),
    };
    if (!isPairPayloadValid(payload)) {
      createAsync.setError("Pair create fields are invalid. Check pair key, addresses and symbols.");
      return;
    }

    setSuccess(null);

    const created = await createAsync.runAction(
      () =>
        createAdminOhlcPair<{ success: boolean }, typeof payload & { isActive: boolean }>({
          token,
          payload: {
            ...payload,
            isActive: newPair.isActive,
          },
        }),
      {
        fallbackMessage: "Failed to create pair",
      },
    );

    if (created) {
      await loadAll();
      setNewPair(EMPTY_PAIR);
      setSuccess("New token pair added.");
    }
  };

  const updatePairField = (id: number, key: keyof OhlcPair, value: string | boolean) => {
    setPairs((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (key === "isActive" && typeof value === "boolean") return { ...row, isActive: value };
        if (typeof value !== "string") return row;
        if (key === "baseSymbol" || key === "quoteSymbol") {
          return { ...row, [key]: value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16) };
        }
        return { ...row, [key]: value };
      }),
    );
  };

  const canCreatePair = useMemo(
    () =>
      isPairPayloadValid({
        pairKey: newPair.pairKey,
        poolId: newPair.poolId,
        baseMint: newPair.baseMint,
        quoteMint: newPair.quoteMint,
        baseSymbol: newPair.baseSymbol,
        quoteSymbol: newPair.quoteSymbol,
      }),
    [newPair],
  );

  return (
    <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 sm:p-5 shrink-0">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">OHLC Stream Control</h3>
          <p className="text-xs text-neutral-500 mt-1">Manage ingestion and token pairs from admin.</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${STATUS_STYLE[status]}`}>
          <Clock3 className="w-3.5 h-3.5" />
          {status.toUpperCase()}
        </span>
      </div>

      {(error || success) && (
        <div className="rounded-xl border border-neutral-800 bg-[#0a0a0a] p-3 mb-3">
          {error ? <p className="text-xs text-red-300">{error}</p> : <p className="text-xs text-emerald-300">{success}</p>}
        </div>
      )}

      {loadAsync.isLoading ? (
        <div className="rounded-xl border border-neutral-800 bg-[#0a0a0a] p-4 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
        </div>
      ) : (
        <div className="space-y-4">
          <OhlcOverviewCards
            primaryPairKey={primaryPairKey}
            latestTickAt={latestTickAt}
            latestPriceUsd={latestPriceUsd}
            lagSeconds={lagSeconds}
            formatDate={formatDate}
            formatUsd={formatUsd}
          />

          {serviceDisabled ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-300">OHLC service is disabled. Configure OHLC_DATABASE_URL.</p>
            </div>
          ) : (
            <>
              <OhlcRuntimeSection
                runtime={runtime}
                minInterval={minInterval}
                maxInterval={maxInterval}
                runtimeDirty={runtimeDirty}
                isSavingRuntime={runtimeAsync.isActing}
                isSyncing={syncAsync.isActing}
                toSeconds={toSeconds}
                onRuntimeChange={setRuntime}
                onSaveRuntime={() => void saveRuntime()}
                onSyncNow={() => void syncNow()}
                onRefresh={() => void loadAll()}
              />
              <OhlcPairsSection
                newPair={newPair}
                pairs={pairs}
                pairsSynced={pairsSynced}
                busyPairId={busyPairId}
                isCreatingPair={createAsync.isActing}
                canCreatePair={canCreatePair}
                formatDate={formatDate}
                formatUsd={formatUsd}
                isPairPayloadValid={isPairPayloadValid}
                rowEqual={rowEqual}
                onNewPairChange={setNewPair}
                onCreatePair={() => void createPair()}
                onPairFieldChange={updatePairField}
                onSavePair={(pair) => void savePair(pair)}
                onTogglePair={(pair) => void togglePair(pair)}
                onSetFeaturedPair={(pair) => void setFeaturedPair(pair)}
                onRemovePair={(pair) => void removePair(pair)}
              />
            </>
          )}

          {success && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <p className="text-xs text-emerald-300">{success}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

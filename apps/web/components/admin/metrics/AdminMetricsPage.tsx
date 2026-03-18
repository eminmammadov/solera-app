"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAdminMetricsBundle } from "@/lib/admin/metrics-admin";
import { useAdminAuth } from "@/store/admin/use-admin-auth";
import { useFeedbackToast } from "@/hooks/use-feedback-toast";
import { useAdminAsyncController } from "@/hooks/admin/use-admin-async-controller";
import AdminMetricsView from "@/components/admin/metrics/AdminMetricsView";

export interface AdminMetricsPayload {
  generatedAt: string;
  users: {
    total: number;
    blocked: number;
    online: number;
    active24h: number;
    totalStakePositions: number;
    activeStakePositions: number;
    totalStakedAmountUsd: number;
    averageSessionSeconds: number;
    topCountries: Array<{ country: string; users: number }>;
  };
  content: {
    blogTotal: number;
    blogPublished: number;
    blogDraft: number;
    newsTotal: number;
    newsActive: number;
    newsInactive: number;
    newsUpvotes: number;
    newsDownvotes: number;
    docsCategories: number;
    docsPages: number;
    docsSections: number;
  };
  market: {
    tokensTotal: number;
    tokensActive: number;
  };
  system: {
    maintenanceEnabled: boolean;
    maintenanceActive: boolean;
    connectEnabled: boolean;
    headerNetwork: "devnet" | "mainnet";
    rateLimitRedisConfigured: boolean;
    rateLimitConfiguredBackend: "memory" | "redis";
    rateLimitEffectiveBackend: "memory" | "redis";
    rateLimitDegraded: boolean;
    rateLimitLastFallbackAt: string | null;
    rateLimitLastErrorMessage: string | null;
    proxySharedKeyConfigured: boolean;
    proxyAllowDevFallbacks: boolean;
  };
}

export interface AdminAuditStatusResponse {
  enabled: boolean;
  retentionDays: number;
  cleanupIntervalMs: number;
  reconnectIntervalMs?: number;
  databaseConfigured?: boolean;
  reconnecting?: boolean;
  lastErrorMessage?: string | null;
}

type OhlcStatus = "ok" | "degraded" | "paused" | "disabled";
export interface OhlcConfigResponse {
  success: boolean;
  status: OhlcStatus;
  reason?: string;
  ingestEnabled: boolean;
  pollIntervalMs: number | null;
  latestTickAt?: string | null;
  latestPriceUsd?: number | null;
  lagSeconds?: number | null;
}

const EMPTY_METRICS: AdminMetricsPayload = {
  generatedAt: new Date(0).toISOString(),
  users: {
    total: 0,
    blocked: 0,
    online: 0,
    active24h: 0,
    totalStakePositions: 0,
    activeStakePositions: 0,
    totalStakedAmountUsd: 0,
    averageSessionSeconds: 0,
    topCountries: [],
  },
  content: {
    blogTotal: 0,
    blogPublished: 0,
    blogDraft: 0,
    newsTotal: 0,
    newsActive: 0,
    newsInactive: 0,
    newsUpvotes: 0,
    newsDownvotes: 0,
    docsCategories: 0,
    docsPages: 0,
    docsSections: 0,
  },
  market: {
    tokensTotal: 0,
    tokensActive: 0,
  },
  system: {
    maintenanceEnabled: false,
    maintenanceActive: false,
    connectEnabled: true,
    headerNetwork: "devnet",
    rateLimitRedisConfigured: false,
    rateLimitConfiguredBackend: "memory",
    rateLimitEffectiveBackend: "memory",
    rateLimitDegraded: false,
    rateLimitLastFallbackAt: null,
    rateLimitLastErrorMessage: null,
    proxySharedKeyConfigured: false,
    proxyAllowDevFallbacks: false,
  },
};

const EMPTY_AUDIT: AdminAuditStatusResponse = {
  enabled: false,
  retentionDays: 0,
  cleanupIntervalMs: 0,
  reconnectIntervalMs: 0,
  databaseConfigured: false,
  reconnecting: false,
  lastErrorMessage: null,
};

const EMPTY_OHLC: OhlcConfigResponse = {
  success: false,
  status: "disabled",
  ingestEnabled: false,
  pollIntervalMs: null,
  latestTickAt: null,
  latestPriceUsd: null,
  lagSeconds: null,
};

const renderMetricValue = (loading: boolean, value: string, tone?: string) => {
  if (!loading) {
    return <p className={`text-2xl font-bold mt-2 ${tone ?? "text-white"}`}>{value}</p>;
  }

  return <div className="mt-2 h-7 w-24 rounded bg-neutral-800 animate-pulse" />;
};

export default function AdminMetricsPage() {
  const { token } = useAdminAuth();
  const asyncState = useAdminAsyncController(true);
  const { runLoad: runMetricsLoad } = asyncState;

  const [metrics, setMetrics] = useState<AdminMetricsPayload>(EMPTY_METRICS);
  const [audit, setAudit] = useState<AdminAuditStatusResponse>(EMPTY_AUDIT);
  const [ohlc, setOhlc] = useState<OhlcConfigResponse>(EMPTY_OHLC);

  useFeedbackToast({
    scope: "admin-metrics",
    error: asyncState.error,
    errorTitle: "Metrics Error",
    errorDedupeMs: 15_000,
  });

  const loadAll = useCallback(
    async (withLoader = true) => {
      await runMetricsLoad(
        async () =>
          fetchAdminMetricsBundle<
            AdminMetricsPayload,
            AdminAuditStatusResponse,
            OhlcConfigResponse
          >({
            token,
            withLoader,
          }),
        {
          withLoader,
          fallbackMessage: "Failed to load admin metrics.",
          captureError: withLoader,
          onSuccess: ({
          metrics: metricsPayload,
          audit: auditPayload,
          ohlc: ohlcPayload,
          }) => {
            setMetrics(metricsPayload);
            setAudit(auditPayload);
            setOhlc(ohlcPayload);
          },
        },
      );
    },
    [runMetricsLoad, token],
  );

  useEffect(() => {
    void loadAll(true);
  }, [loadAll]);

  useEffect(() => {
    const interval = setInterval(() => {
      void loadAll(false);
    }, 30_000);
    return () => clearInterval(interval);
  }, [loadAll]);

  const auditState = useMemo(() => {
    if (audit.enabled) {
      return { label: "Enabled", tone: "text-emerald-400" };
    }
    if (audit.databaseConfigured && audit.reconnecting) {
      return { label: "Reconnecting", tone: "text-amber-400" };
    }
    if (audit.databaseConfigured) {
      return { label: "Unavailable", tone: "text-red-400" };
    }
    return { label: "Disabled", tone: "text-red-400" };
  }, [audit.databaseConfigured, audit.enabled, audit.reconnecting]);

  const systemChecks = useMemo(
    () => [
      {
        label: "Proxy Shared Key",
        ok: metrics.system.proxySharedKeyConfigured,
      },
      {
        label: "Proxy Dev Fallbacks",
        ok: !metrics.system.proxyAllowDevFallbacks,
      },
      {
        label: "Wallet Connect",
        ok: metrics.system.connectEnabled,
      },
      {
        label: "Redis Rate-Limit",
        ok:
          metrics.system.rateLimitRedisConfigured &&
          metrics.system.rateLimitEffectiveBackend === "redis" &&
          !metrics.system.rateLimitDegraded,
      },
      {
        label: "Audit Storage",
        ok: audit.enabled,
      },
      {
        label: "OHLC Ingestion",
        ok: ohlc.ingestEnabled && ohlc.status !== "disabled",
      },
    ],
    [
      audit.enabled,
      metrics.system.connectEnabled,
      metrics.system.proxyAllowDevFallbacks,
      metrics.system.proxySharedKeyConfigured,
      metrics.system.rateLimitDegraded,
      metrics.system.rateLimitEffectiveBackend,
      metrics.system.rateLimitRedisConfigured,
      ohlc.ingestEnabled,
      ohlc.status,
    ],
  );

  return (
    <AdminMetricsView
      isLoading={asyncState.isLoading}
      error={asyncState.error}
      metrics={metrics}
      ohlc={ohlc}
      audit={audit}
      auditState={auditState}
      systemChecks={systemChecks}
      renderMetricValue={renderMetricValue}
    />
  );
}

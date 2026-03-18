"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
} from "lucide-react";
import type {
  AdminAuditStatusResponse,
  AdminMetricsPayload,
  OhlcConfigResponse,
} from "@/components/admin/metrics/AdminMetricsPage";

const formatUsd = (value: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });

const formatSeconds = (value: number) => {
  if (value <= 0) return "0s";
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = Math.floor(value % 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const formatMsDuration = (value: number) => {
  if (value <= 0) return "0m";
  const totalMinutes = Math.floor(value / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
};

interface AdminMetricsViewProps {
  isLoading: boolean;
  error: string | null;
  metrics: AdminMetricsPayload;
  ohlc: OhlcConfigResponse;
  audit: AdminAuditStatusResponse;
  auditState: { label: string; tone: string };
  systemChecks: Array<{ label: string; ok: boolean }>;
  renderMetricValue: (isLoading: boolean, value: string, colorClass?: string) => React.ReactNode;
}

export default function AdminMetricsView({
  isLoading,
  error,
  metrics,
  ohlc,
  audit,
  auditState,
  systemChecks,
  renderMetricValue,
}: AdminMetricsViewProps) {
  return (
    <div className="admin-page flex flex-col gap-2 w-full h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#111111] border border-neutral-800 rounded-xl p-4 sm:p-5 gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white">Platform Metrics</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Observe live usage, content coverage, runtime health and market ingestion status.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 shrink-0">
        <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
          <div className="text-xs text-neutral-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Total Users
          </div>
          {renderMetricValue(isLoading, metrics.users.total.toLocaleString())}
        </div>
        <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
          <div className="text-xs text-neutral-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
            Online Users
          </div>
          {renderMetricValue(isLoading, metrics.users.online.toLocaleString(), "text-blue-400")}
        </div>
        <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
          <div className="text-xs text-neutral-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
            Active Stakes
          </div>
          {renderMetricValue(
            isLoading,
            metrics.users.activeStakePositions.toLocaleString(),
            "text-purple-400",
          )}
        </div>
        <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
          <div className="text-xs text-neutral-400 flex items-center gap-2">
            <Clock3 className="w-4 h-4 text-amber-400" />
            Avg Session
          </div>
          {renderMetricValue(isLoading, formatSeconds(metrics.users.averageSessionSeconds))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-2">
        <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Users</h2>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="h-4 rounded bg-neutral-800 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-neutral-300">
                <span>Active (24h)</span>
                <span>{metrics.users.active24h.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Blocked Users</span>
                <span>{metrics.users.blocked.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Total Stake Positions</span>
                <span>{metrics.users.totalStakePositions.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Total Staked (USD)</span>
                <span>${formatUsd(metrics.users.totalStakedAmountUsd)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Content</h2>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-4 rounded bg-neutral-800 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-neutral-300">
                <span>Blog (Published / Draft)</span>
                <span>
                  {metrics.content.blogPublished}/{metrics.content.blogDraft}
                </span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>News (Active / Inactive)</span>
                <span>
                  {metrics.content.newsActive}/{metrics.content.newsInactive}
                </span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>News Votes (+/-)</span>
                <span>
                  {metrics.content.newsUpvotes}/{metrics.content.newsDownvotes}
                </span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Docs (Cat / Pages / Sections)</span>
                <span>
                  {metrics.content.docsCategories}/{metrics.content.docsPages}/
                  {metrics.content.docsSections}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Market & Network</h2>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-4 rounded bg-neutral-800 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-neutral-300">
                <span>Tokens (Active / Total)</span>
                <span>
                  {metrics.market.tokensActive}/{metrics.market.tokensTotal}
                </span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Header Network</span>
                <span className="uppercase">{metrics.system.headerNetwork}</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>OHLC Status</span>
                <span className="uppercase">{ohlc.status}</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>OHLC Poll</span>
                <span>
                  {ohlc.pollIntervalMs ? `${Math.floor(ohlc.pollIntervalMs / 1000)}s` : "-"}
                </span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>OHLC Lag</span>
                <span>{Number.isFinite(ohlc.lagSeconds ?? NaN) ? `${ohlc.lagSeconds}s` : "-"}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
        <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Top Countries</h2>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="h-8 rounded bg-neutral-800 animate-pulse" />
              ))}
            </div>
          ) : metrics.users.topCountries.length === 0 ? (
            <p className="text-xs text-neutral-500">No country activity available yet.</p>
          ) : (
            <div className="space-y-2">
              {metrics.users.topCountries.map((item) => (
                <div
                  key={item.country}
                  className="flex items-center justify-between rounded-lg border border-neutral-800 bg-[#0a0a0a] px-3 py-2 text-xs"
                >
                  <span className="text-neutral-300">{item.country}</span>
                  <span className="font-medium text-white">{item.users.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Health Checks</h2>
          <div className="space-y-2">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-8 rounded bg-neutral-800 animate-pulse" />
              ))
            ) : (
              <>
                {systemChecks.map((check) => (
                  <div
                    key={check.label}
                    className="flex items-center justify-between rounded-lg border border-neutral-800 bg-[#0a0a0a] px-3 py-2 text-xs"
                  >
                    <span className="text-neutral-300">{check.label}</span>
                    <span
                      className={`inline-flex items-center gap-1 ${
                        check.ok ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {check.ok ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      )}
                      {check.ok ? "OK" : "Issue"}
                    </span>
                  </div>
                ))}

                <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-[#0a0a0a] px-3 py-2 text-xs">
                  <span className="text-neutral-300">Maintenance</span>
                  <span
                    className={
                      metrics.system.maintenanceActive
                        ? "text-amber-400"
                        : "text-neutral-300"
                    }
                  >
                    {metrics.system.maintenanceActive
                      ? "Active"
                      : metrics.system.maintenanceEnabled
                      ? "Scheduled"
                      : "Off"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-[#0a0a0a] px-3 py-2 text-xs">
                  <span className="text-neutral-300">Rate Limit Backend</span>
                  <span className="uppercase text-white">
                    {metrics.system.rateLimitEffectiveBackend}
                    {metrics.system.rateLimitDegraded ? " (degraded)" : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-[#0a0a0a] px-3 py-2 text-xs">
                  <span className="text-neutral-300">Rate Limit Config</span>
                  <span className="uppercase text-neutral-300">
                    {metrics.system.rateLimitConfiguredBackend}
                    {metrics.system.rateLimitRedisConfigured ? " (redis)" : " (memory)"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-[#0a0a0a] px-3 py-2 text-xs">
                  <span className="text-neutral-300">Redis Fallback</span>
                  <span
                    className={
                      metrics.system.rateLimitDegraded
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }
                  >
                    {metrics.system.rateLimitDegraded ? "Active" : "No"}
                  </span>
                </div>
                {metrics.system.rateLimitLastFallbackAt && (
                  <div className="rounded-lg border border-neutral-800 bg-[#0a0a0a] px-3 py-2 text-[11px] text-neutral-400">
                    Last fallback: {formatDateTime(metrics.system.rateLimitLastFallbackAt)}
                  </div>
                )}
                {metrics.system.rateLimitLastErrorMessage && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
                    {metrics.system.rateLimitLastErrorMessage}
                  </div>
                )}
                <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-[#0a0a0a] px-3 py-2 text-xs">
                  <span className="text-neutral-300">Audit Storage</span>
                  <span className={auditState.tone}>{auditState.label}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-[#0a0a0a] px-3 py-2 text-xs">
                  <span className="text-neutral-300">Audit Cleanup</span>
                  <span className="text-neutral-300">
                    {formatMsDuration(audit.cleanupIntervalMs)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="fixed bottom-4 right-4 rounded-lg border border-neutral-800 bg-[#111111] px-3 py-2 text-xs text-neutral-300 shadow-xl">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Syncing metrics...
          </span>
        </div>
      )}
    </div>
  );
}

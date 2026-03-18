"use client";

import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  Search,
} from "lucide-react";
import type {
  AdminAuditLog,
  AdminAuditLogsResponse,
  AdminAuditStatusResponse,
  AuditStatus,
} from "@/components/admin/audit/AdminAuditPage";

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

interface AdminAuditViewProps {
  isLoading: boolean;
  error: string | null;
  logs: AdminAuditLogsResponse;
  statusInfo: AdminAuditStatusResponse;
  successCount: number;
  failureCount: number;
  currentPage: number;
  totalPages: number;
  uniqueActors: number;
  selectedLog: AdminAuditLog | null;
  actionFilter: string;
  resourceFilter: string;
  actorFilter: string;
  statusFilter: "all" | AuditStatus;
  fromFilter: string;
  toFilter: string;
  setActionFilter: (value: string) => void;
  setResourceFilter: (value: string) => void;
  setActorFilter: (value: string) => void;
  setStatusFilter: (value: "all" | AuditStatus) => void;
  setFromFilter: (value: string) => void;
  setToFilter: (value: string) => void;
  goToPage: (page: number) => void;
  setSelectedLogId: (id: string) => void;
}

export default function AdminAuditView({
  isLoading,
  error,
  logs,
  statusInfo,
  successCount,
  failureCount,
  currentPage,
  totalPages,
  uniqueActors,
  selectedLog,
  actionFilter,
  resourceFilter,
  actorFilter,
  statusFilter,
  fromFilter,
  toFilter,
  setActionFilter,
  setResourceFilter,
  setActorFilter,
  setStatusFilter,
  setFromFilter,
  setToFilter,
  goToPage,
  setSelectedLogId,
}: AdminAuditViewProps) {
  return (
    <div className="admin-page flex flex-col gap-2 w-full h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#111111] border border-neutral-800 rounded-xl p-4 sm:p-5 gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white">Audit Logs</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Inspect admin-side mutations, network requests and runtime control changes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0">
        <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-wider text-neutral-500">Total Entries</p>
          <p className="text-2xl font-bold text-white mt-2">{logs.total.toLocaleString()}</p>
        </div>
        <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-wider text-neutral-500">Success</p>
          <p className="text-xl font-bold text-emerald-400 mt-2">{successCount}</p>
        </div>
        <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-wider text-neutral-500">Failures</p>
          <p className="text-xl font-bold text-red-400 mt-2">{failureCount}</p>
        </div>
      </div>

      {!statusInfo.enabled && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          {!statusInfo.databaseConfigured ? (
            <p className="text-xs text-amber-300">
              Audit database is not configured. Set <span className="font-mono">LOG_DATABASE_URL</span> in <span className="font-mono">apps/api/.env</span> and restart API.
            </p>
          ) : (
            <p className="text-xs text-amber-300">
              Audit database is temporarily unreachable. Service is retrying automatically.
              {statusInfo.lastErrorMessage ? ` Last error: ${statusInfo.lastErrorMessage}` : ""}
            </p>
          )}
        </div>
      )}

      <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-2">
          <div className="relative xl:col-span-2">
            <Search className="w-4 h-4 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="Filter action..."
              className="h-9 w-full rounded-lg border border-neutral-700 bg-[#0a0a0a] pl-8 pr-3 text-xs text-white outline-none focus:border-neutral-500"
            />
          </div>
          <input
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            placeholder="Resource (users, system...)"
            className="h-9 rounded-lg border border-neutral-700 bg-[#0a0a0a] px-3 text-xs text-white outline-none focus:border-neutral-500"
          />
          <input
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            placeholder="Admin wallet..."
            className="h-9 rounded-lg border border-neutral-700 bg-[#0a0a0a] px-3 text-xs text-white outline-none focus:border-neutral-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | AuditStatus)}
            className="h-9 rounded-lg border border-neutral-700 bg-[#0a0a0a] px-3 text-xs text-white outline-none focus:border-neutral-500 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={fromFilter}
              onChange={(e) => setFromFilter(e.target.value)}
              className="h-9 w-full rounded-lg border border-neutral-700 bg-[#0a0a0a] px-2 text-xs text-white outline-none focus:border-neutral-500 cursor-pointer"
            />
            <input
              type="date"
              value={toFilter}
              onChange={(e) => setToFilter(e.target.value)}
              className="h-9 w-full rounded-lg border border-neutral-700 bg-[#0a0a0a] px-2 text-xs text-white outline-none focus:border-neutral-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-2 min-h-[620px]">
        <div className="bg-[#111111] border border-neutral-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
            <div className="text-xs text-neutral-400 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-purple-400" />
              {logs.total.toLocaleString()} total log entries
            </div>
            <div className="text-[11px] text-neutral-500">
              Cleanup: {formatMsDuration(statusInfo.cleanupIntervalMs)}
            </div>
          </div>

          {error && (
            <div className="mx-4 mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="overflow-auto max-h-[540px]">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 bg-[#0f0f0f] border-b border-neutral-800 z-10">
                <tr className="text-neutral-400">
                  <th className="text-left px-4 py-3 font-medium">Time</th>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                  <th className="text-left px-4 py-3 font-medium">Actor</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-neutral-400">
                      <div className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading audit logs...
                      </div>
                    </td>
                  </tr>
                ) : logs.items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-neutral-500">
                      No logs found for current filters.
                    </td>
                  </tr>
                ) : (
                  logs.items.map((item) => {
                    const isSelected = selectedLog?.id === item.id;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedLogId(item.id)}
                        className={`border-b border-neutral-900/80 cursor-pointer transition-colors ${
                          isSelected ? "bg-purple-500/10" : "hover:bg-neutral-900/70"
                        }`}
                      >
                        <td className="px-4 py-3 text-neutral-300 whitespace-nowrap">
                          {formatDateTime(item.occurredAt)}
                        </td>
                        <td className="px-4 py-3 text-white">
                          <div className="font-medium">{item.action}</div>
                          <div className="text-[11px] text-neutral-500 mt-0.5">
                            {item.resourceType || "unknown"} {item.resourceId ? `· ${item.resourceId}` : ""}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-neutral-300">
                          {item.actorName || "Admin"}{" "}
                          <span className="text-neutral-500">
                            {item.actorWalletAddress
                              ? `(${item.actorWalletAddress.slice(0, 4)}...${item.actorWalletAddress.slice(-4)})`
                              : ""}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded border text-[11px] font-medium ${
                              item.status === "success"
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                : "border-red-500/30 bg-red-500/10 text-red-300"
                            }`}
                          >
                            {item.status}
                            {item.statusCode ? ` (${item.statusCode})` : ""}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-neutral-800 flex items-center justify-between">
            <div className="text-xs text-neutral-500">
              Page {currentPage} / {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
                className="h-8 px-3 rounded-lg border border-neutral-700 bg-[#0a0a0a] text-xs text-neutral-200 hover:border-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages || isLoading}
                className="h-8 px-3 rounded-lg border border-neutral-700 bg-[#0a0a0a] text-xs text-neutral-200 hover:border-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[#111111] border border-neutral-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-800">
            <h3 className="text-sm font-semibold text-white">Entry Detail</h3>
            <p className="text-xs text-neutral-500 mt-1">
              Unique actors in current page: {uniqueActors}
            </p>
          </div>

          {!selectedLog ? (
            <div className="p-4 text-sm text-neutral-500">
              Select a log entry to inspect full metadata and route details.
            </div>
          ) : (
            <div className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-neutral-800 bg-[#0a0a0a] p-2">
                  <p className="text-neutral-500">Time</p>
                  <p className="text-neutral-200 mt-1">{formatDateTime(selectedLog.occurredAt)}</p>
                </div>
                <div className="rounded-lg border border-neutral-800 bg-[#0a0a0a] p-2">
                  <p className="text-neutral-500">Status</p>
                  <p className="text-neutral-200 mt-1">
                    {selectedLog.status}
                    {selectedLog.statusCode ? ` (${selectedLog.statusCode})` : ""}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-neutral-800 bg-[#0a0a0a] p-2">
                <p className="text-neutral-500">Action</p>
                <p className="text-neutral-200 mt-1 break-all">{selectedLog.action}</p>
              </div>

              <div className="rounded-lg border border-neutral-800 bg-[#0a0a0a] p-2">
                <p className="text-neutral-500">Route</p>
                <p className="text-neutral-200 mt-1 break-all">
                  {selectedLog.httpMethod} {selectedLog.routePath}
                </p>
              </div>

              <div className="rounded-lg border border-neutral-800 bg-[#0a0a0a] p-2">
                <p className="text-neutral-500">Actor</p>
                <p className="text-neutral-200 mt-1 break-all">
                  {selectedLog.actorName || "Admin"} {selectedLog.actorWalletAddress || ""}
                </p>
              </div>

              <div className="rounded-lg border border-neutral-800 bg-[#0a0a0a] p-2">
                <p className="text-neutral-500">Source</p>
                <p className="text-neutral-200 mt-1 break-all">
                  IP: {selectedLog.ipAddress || "-"}{"\n"}
                  Request ID: {selectedLog.requestId || "-"}
                </p>
              </div>

              {selectedLog.message && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2">
                  <p className="text-red-300">Error Message</p>
                  <p className="text-red-200 mt-1 break-words">{selectedLog.message}</p>
                </div>
              )}

              <div className="rounded-lg border border-neutral-800 bg-[#0a0a0a] p-2">
                <p className="text-neutral-500 mb-1">Metadata</p>
                <pre className="max-h-[220px] overflow-auto text-[11px] leading-relaxed text-neutral-300 whitespace-pre-wrap break-words">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

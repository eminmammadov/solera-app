"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchAdminAuditLogs,
  fetchAdminAuditStatus,
} from "@/lib/admin/audit-admin";
import { useAdminAuth } from "@/store/admin/use-admin-auth";
import { useAdminAsyncController } from "@/hooks/admin/use-admin-async-controller";
import { useFeedbackToast } from "@/hooks/use-feedback-toast";
import AdminAuditView from "@/components/admin/audit/AdminAuditView";

export type AuditStatus = "success" | "failure";

export interface AdminAuditLog {
  id: string;
  occurredAt: string;
  actorAdminId: string | null;
  actorWalletAddress: string | null;
  actorName: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  httpMethod: string;
  routePath: string;
  requestId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  status: AuditStatus;
  statusCode: number | null;
  message: string | null;
  metadata: unknown;
}

export interface AdminAuditLogsResponse {
  enabled: boolean;
  retentionDays: number;
  limit: number;
  offset: number;
  total: number;
  items: AdminAuditLog[];
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

export default function AdminAuditPage() {
  const { token } = useAdminAuth();
  const asyncState = useAdminAsyncController(true);
  const { runLoad: runAuditLoad, runAction: runAuditAction } = asyncState;
  const [statusInfo, setStatusInfo] = useState<AdminAuditStatusResponse>({
    enabled: false,
    retentionDays: 180,
    cleanupIntervalMs: 0,
    reconnectIntervalMs: 0,
    databaseConfigured: false,
    reconnecting: false,
    lastErrorMessage: null,
  });
  const [logs, setLogs] = useState<AdminAuditLogsResponse>({
    enabled: false,
    retentionDays: 180,
    limit: 50,
    offset: 0,
    total: 0,
    items: [],
  });
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AuditStatus>("all");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");

  useFeedbackToast({
    scope: "admin-audit",
    error: asyncState.error,
    errorTitle: "Audit Logs Error",
  });

  const limit = 50;

  const loadStatus = useCallback(async () => {
    await runAuditAction(
      () =>
        fetchAdminAuditStatus<AdminAuditStatusResponse>({
          token,
        }),
      {
        fallbackMessage: "Failed to load audit status.",
        onSuccess: (data) => {
          setStatusInfo(data);
        },
      },
    );
  }, [runAuditAction, token]);

  const loadLogs = useCallback(
    async (offset: number, withLoader = true) => {
      await runAuditLoad(
        () =>
          fetchAdminAuditLogs<AdminAuditLogsResponse>({
            token,
            params: {
              limit,
              offset,
              action: actionFilter.trim() || undefined,
              resourceType: resourceFilter.trim() || undefined,
              actorWallet: actorFilter.trim() || undefined,
              status: statusFilter !== "all" ? statusFilter : undefined,
              from: fromFilter || undefined,
              to: toFilter || undefined,
            },
            withLoader,
          }),
        {
          withLoader,
          fallbackMessage: "Failed to load logs.",
          onSuccess: (payload) => {
            setLogs(payload);
          },
        },
      );
    },
    [
      actionFilter,
      actorFilter,
      fromFilter,
      resourceFilter,
      runAuditLoad,
      statusFilter,
      toFilter,
      token,
    ],
  );

  useEffect(() => {
    void (async () => {
      await loadStatus();
      await loadLogs(0, true);
    })();
  }, [loadLogs, loadStatus]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLogs(0, true);
    }, 240);
    return () => window.clearTimeout(timer);
  }, [actionFilter, resourceFilter, actorFilter, statusFilter, fromFilter, toFilter, loadLogs]);

  const totalPages = Math.max(1, Math.ceil((logs.total || 0) / limit));
  const currentPage = Math.floor(logs.offset / limit) + 1;
  const selectedLog = useMemo(
    () => logs.items.find((item) => item.id === selectedLogId) ?? null,
    [logs.items, selectedLogId],
  );

  const successCount = useMemo(
    () => logs.items.filter((item) => item.status === "success").length,
    [logs.items],
  );
  const failureCount = useMemo(
    () => logs.items.filter((item) => item.status === "failure").length,
    [logs.items],
  );
  const uniqueActors = useMemo(
    () =>
      new Set(
        logs.items
          .map((item) => item.actorWalletAddress)
          .filter((value): value is string => Boolean(value)),
      ).size,
    [logs.items],
  );

  const goToPage = (page: number) => {
    const normalized = Math.min(Math.max(page, 1), totalPages);
    const nextOffset = (normalized - 1) * limit;
    void loadLogs(nextOffset, true);
  };

  return (
    <AdminAuditView
      isLoading={asyncState.isLoading}
      error={asyncState.error}
      logs={logs}
      statusInfo={statusInfo}
      successCount={successCount}
      failureCount={failureCount}
      currentPage={currentPage}
      totalPages={totalPages}
      uniqueActors={uniqueActors}
      selectedLog={selectedLog}
      actionFilter={actionFilter}
      resourceFilter={resourceFilter}
      actorFilter={actorFilter}
      statusFilter={statusFilter}
      fromFilter={fromFilter}
      toFilter={toFilter}
      setActionFilter={setActionFilter}
      setResourceFilter={setResourceFilter}
      setActorFilter={setActorFilter}
      setStatusFilter={setStatusFilter}
      setFromFilter={setFromFilter}
      setToFilter={setToFilter}
      goToPage={goToPage}
      setSelectedLogId={setSelectedLogId}
    />
  );
}

"use client";

import { useEffect, useMemo } from "react";
import { useAdminAuth } from "@/store/admin/use-admin-auth";
import { fetchAdminStakingCutoverPolicy } from "@/lib/admin/staking-admin";
import {
  fetchAdminInfraStatus,
  fetchAdminSystemMetrics,
} from "@/lib/admin/system-admin";
import { useFeedbackToast } from "@/hooks/use-feedback-toast";
import { useAdminResource } from "@/hooks/admin/use-admin-resource";
import {
  BarChart3,
  BookOpen,
  Coins,
  FileText,
  Newspaper,
} from "lucide-react";
import AdminDashboardView from "@/components/admin/dashboard/AdminDashboardView";
import type { StakingCutoverPolicySnapshot } from "@/components/admin/staking/types";

interface AdminInfraStatusResponse {
  rateLimit: {
    configuredBackend: "memory" | "redis";
    effectiveBackend: "memory" | "redis";
    redisConfigured: boolean;
    degraded: boolean;
    lastFallbackAt: string | null;
    lastErrorMessage: string | null;
  };
  proxy: {
    sharedKeyConfigured: boolean;
    allowDevFallbacks: boolean;
  };
  generatedAt: string;
}

interface AdminDashboardMetricsResponse {
  content: {
    blogTotal: number;
    newsTotal: number;
    docsPages: number;
  };
  market: {
    tokensActive: number;
  };
}

export default function AdminDashboard() {
  const { admin, token } = useAdminAuth();
  const loadDashboardData = useMemo(
    () => async () => {
      const [infraStatus, dashboardMetrics, stakingCutoverPolicy] =
        await Promise.all([
          fetchAdminInfraStatus<AdminInfraStatusResponse>({ token }),
          fetchAdminSystemMetrics<AdminDashboardMetricsResponse>({ token }),
          fetchAdminStakingCutoverPolicy({
            token,
          }).catch(() => null),
        ]);

      return {
        infraStatus,
        dashboardMetrics,
        stakingCutoverPolicy,
      };
    },
    [token],
  );
  const dashboardResource = useAdminResource<{
    infraStatus: AdminInfraStatusResponse | null;
    dashboardMetrics: AdminDashboardMetricsResponse | null;
    stakingCutoverPolicy: StakingCutoverPolicySnapshot | null;
  }>({
    initialData: {
      infraStatus: null,
      dashboardMetrics: null,
      stakingCutoverPolicy: null,
    },
    loader: loadDashboardData,
    fallbackMessage: "Failed to load dashboard data.",
  });
  const { data, error, isLoading, load } =
    dashboardResource;
  const { infraStatus, dashboardMetrics, stakingCutoverPolicy } =
    data;

  useFeedbackToast({
    scope: "admin-dashboard",
    error,
    errorTitle: "Dashboard Load Error",
    errorDedupeMs: 20_000,
  });

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load, loadDashboardData]);

  const rateLimitInfo = useMemo(() => {
    if (isLoading) {
      return { value: "Loading...", color: "text-neutral-400" };
    }

    if (!infraStatus) {
      return { value: "Unknown", color: "text-red-400" };
    }

    if (infraStatus.rateLimit.degraded) {
      return {
        value: `Degraded (${infraStatus.rateLimit.effectiveBackend.toUpperCase()})`,
        color: "text-amber-400",
      };
    }

    return {
      value: infraStatus.rateLimit.effectiveBackend.toUpperCase(),
      color: infraStatus.rateLimit.effectiveBackend === "redis" ? "text-emerald-400" : "text-blue-400",
    };
  }, [infraStatus, isLoading]);

  const infraDetails = useMemo(() => {
    if (isLoading) {
      return {
        configured: "Loading...",
        effective: "Loading...",
        degraded: "Loading...",
        lastFallback: "-",
      };
    }

    if (!infraStatus) {
      return {
        configured: "Unknown",
        effective: "Unknown",
        degraded: "Unknown",
        lastFallback: "-",
      };
    }

    return {
      configured: infraStatus.rateLimit.configuredBackend.toUpperCase(),
      effective: infraStatus.rateLimit.effectiveBackend.toUpperCase(),
      degraded: infraStatus.rateLimit.degraded ? "Yes" : "No",
      lastFallback: infraStatus.rateLimit.lastFallbackAt
        ? new Date(infraStatus.rateLimit.lastFallbackAt).toLocaleString()
        : "-",
    };
  }, [infraStatus, isLoading]);

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    purple: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
    blue: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  };

  const statCards = useMemo(
    () => [
      {
        label: "Blog Posts",
        value: dashboardMetrics ? dashboardMetrics.content.blogTotal.toLocaleString() : "—",
        icon: FileText,
        color: "purple",
      },
      {
        label: "Active Tokens",
        value: dashboardMetrics ? dashboardMetrics.market.tokensActive.toLocaleString() : "—",
        icon: Coins,
        color: "emerald",
      },
      {
        label: "News Items",
        value: dashboardMetrics ? dashboardMetrics.content.newsTotal.toLocaleString() : "—",
        icon: Newspaper,
        color: "blue",
      },
      {
        label: "Doc Pages",
        value: dashboardMetrics ? dashboardMetrics.content.docsPages.toLocaleString() : "—",
        icon: BookOpen,
        color: "amber",
      },
    ],
    [dashboardMetrics],
  );

  return (
    <AdminDashboardView
      adminWalletSnippet={admin?.walletAddress?.slice(0, 8) + "..." || "-"}
      statCards={statCards}
      colorMap={colorMap}
      rateLimitInfo={rateLimitInfo}
      infraDetails={infraDetails}
      stakingCutoverPolicy={stakingCutoverPolicy}
    />
  );
}

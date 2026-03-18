"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteAdminUser,
  fetchAdminUserDetail,
  fetchAdminUsersList,
  fetchAdminUsersMetrics,
  updateAdminUserBlockStatus,
} from "@/lib/admin/users-admin";
import { useAdminAsyncController } from "@/hooks/admin/use-admin-async-controller";
import { useAdminAuth } from "@/store/admin/use-admin-auth";
import { useFeedbackToast } from "@/hooks/use-feedback-toast";
import { notifyWarning } from "@/lib/ui/ui-feedback";
import {
  Activity,
  Clock3,
  Database,
  Loader2,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import AdminUsersView from "@/components/admin/users/AdminUsersView";

export interface WalletUserSummary {
  id: string;
  walletAddress: string;
  role: "USER" | "ADMIN";
  isBlocked: boolean;
  blockedAt: string | null;
  blockMessage: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  firstSeenCountry: string | null;
  lastSeenCountry: string | null;
  totalSessionSeconds: number;
  totalStakePositions: number;
  activeStakePositions: number;
  totalStakedAmountUsd: number;
  isOnline: boolean;
}

export interface WalletSessionPayload {
  id: string;
  startedAt: string;
  lastSeenAt: string;
  endedAt: string | null;
  durationSeconds: number;
  ipAddress: string | null;
  countryCode: string | null;
  userAgent: string | null;
  isOnline: boolean;
}

export interface WalletStakePositionPayload {
  id: string;
  walletAddress: string;
  tokenTicker: string;
  tokenName: string | null;
  amount: number;
  amountUsd: number;
  periodLabel: string;
  periodDays: number;
  apy: number;
  rewardToken: string;
  rewardEstimate: number;
  status: "ACTIVE" | "CLAIMED" | "CANCELLED";
  startedAt: string;
  unlockAt: string;
  claimedAt: string | null;
}

export interface UsersListResponse {
  total: number;
  limit: number;
  offset: number;
  items: WalletUserSummary[];
}

export interface UserDetailResponse {
  user: WalletUserSummary;
  sessions: WalletSessionPayload[];
  stakePositions: WalletStakePositionPayload[];
}

export interface WalletUserMetrics {
  totalUsers: number;
  onlineUsers: number;
  activeUsers24h: number;
  totalStakePositions: number;
  activeStakePositions: number;
  totalStakedAmountUsd: number;
  averageSessionSeconds: number;
  generatedAt: string;
}

interface AdminMetricsResponse {
  generatedAt: string;
  users: {
    total: number;
    online: number;
    active24h: number;
    totalStakePositions: number;
    activeStakePositions: number;
    totalStakedAmountUsd: number;
    averageSessionSeconds: number;
  };
}

const DEFAULT_METRICS: WalletUserMetrics = {
  totalUsers: 0,
  onlineUsers: 0,
  activeUsers24h: 0,
  totalStakePositions: 0,
  activeStakePositions: 0,
  totalStakedAmountUsd: 0,
  averageSessionSeconds: 0,
  generatedAt: new Date(0).toISOString(),
};

const DEFAULT_BLOCK_MESSAGE =
  "You are blocked. Please contact block@solera.work for assistance.";

const formatDate = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatSeconds = (value: number) => {
  if (value <= 0) return "0s";
  const days = Math.floor(value / 86400);
  const hours = Math.floor((value % 86400) / 3600);
  const minutes = Math.floor((value % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export default function AdminUsersPage() {
  const { token, isAuthenticated } = useAdminAuth();
  const listAsync = useAdminAsyncController(true);
  const detailAsync = useAdminAsyncController(false);
  const deleteAsync = useAdminAsyncController(false);
  const blockAsync = useAdminAsyncController(false);
  const { runLoad: runListLoad } = listAsync;
  const { runLoad: runDetailLoad } = detailAsync;
  const { runAction: runDeleteAction } = deleteAsync;
  const { runAction: runBlockAction } = blockAsync;
  const { isActing: isDeleting } = deleteAsync;
  const { isActing: isBlockUpdating } = blockAsync;
  const [metrics, setMetrics] = useState<WalletUserMetrics>(DEFAULT_METRICS);
  const [listState, setListState] = useState<UsersListResponse>({
    total: 0,
    limit: 25,
    offset: 0,
    items: [],
  });
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserDetailResponse | null>(null);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<WalletUserSummary | null>(null);
  const [deleteConfirmWallet, setDeleteConfirmWallet] = useState("");
  const [blockModalTarget, setBlockModalTarget] = useState<WalletUserSummary | null>(null);
  const [blockMessageInput, setBlockMessageInput] = useState(DEFAULT_BLOCK_MESSAGE);
  const selectedWalletRef = useRef<string | null>(null);

  useEffect(() => {
    selectedWalletRef.current = selectedWallet;
  }, [selectedWallet]);

  useFeedbackToast({
    scope: "admin-users",
    error: listAsync.error,
    errorTitle: "Users Panel Error",
  });

  useFeedbackToast({
    scope: "admin-users-delete",
    error: deleteAsync.error,
    errorTitle: "Delete User Error",
  });

  useFeedbackToast({
    scope: "admin-users-block",
    error: blockAsync.error,
    errorTitle: "User Access Error",
  });

  const loadMetrics = useCallback(async () => {
    if (!token && !isAuthenticated) {
      return;
    }

    try {
      const data = await fetchAdminUsersMetrics<AdminMetricsResponse>({ token });

      setMetrics({
        totalUsers: data.users.total,
        onlineUsers: data.users.online,
        activeUsers24h: data.users.active24h,
        totalStakePositions: data.users.totalStakePositions,
        activeStakePositions: data.users.activeStakePositions,
        totalStakedAmountUsd: data.users.totalStakedAmountUsd,
        averageSessionSeconds: data.users.averageSessionSeconds,
        generatedAt: data.generatedAt,
      });
    } catch {
      // Metrics failure should not block user table.
      notifyWarning({
        title: "Users Metrics Delay",
        description: "Users metrics could not be refreshed.",
        dedupeKey: "admin-users-metrics-delay",
        dedupeMs: 30_000,
      });
    }
  }, [isAuthenticated, token]);

  const loadDetail = useCallback(
    async (walletAddress: string) => {
      if (!token && !isAuthenticated) {
        setDetail(null);
        return;
      }

      const payload = await runDetailLoad(
        () =>
          fetchAdminUserDetail<UserDetailResponse>({
            token,
            walletAddress,
          }),
        {
          fallbackMessage: "Failed to load user detail.",
          captureError: false,
        },
      );

      if (payload) {
        setDetail(payload);
        return;
      }

      setDetail(null);
      notifyWarning({
        title: "User Detail Unavailable",
        description: "Selected user detail could not be loaded.",
        dedupeKey: `admin-users-detail:${walletAddress}`,
        dedupeMs: 20_000,
      });
    },
    [isAuthenticated, runDetailLoad, token],
  );

  const loadUsers = useCallback(
    async (
      currentSearch: string,
      currentCountry: string,
      currentOnlineOnly: boolean,
      withLoader = true,
    ) => {
      if (!token && !isAuthenticated) {
        setListState((prev) => ({ ...prev, items: [], total: 0 }));
        setSelectedWallet(null);
        setDetail(null);
        return;
      }

      const payload = await runListLoad(
        () =>
          fetchAdminUsersList<UsersListResponse>({
            token,
            params: {
              search: currentSearch.trim() || undefined,
              country: currentCountry.trim().toUpperCase() || undefined,
              onlineOnly: currentOnlineOnly || undefined,
              limit: 50,
              offset: 0,
            },
            withLoader,
          }),
        {
          withLoader,
          fallbackMessage: "Failed to load users",
          captureError: withLoader,
        },
      );

      if (!payload) {
        if (withLoader) {
          setListState((prev) => ({ ...prev, items: [], total: 0 }));
          setDetail(null);
        }
        return;
      }

      setListState(payload);

      const currentSelectedWallet = selectedWalletRef.current;
      const nextSelected =
        currentSelectedWallet &&
        payload.items.some((item) => item.walletAddress === currentSelectedWallet)
          ? currentSelectedWallet
          : payload.items[0]?.walletAddress ?? null;

      setSelectedWallet(nextSelected);
      if (nextSelected) {
        await loadDetail(nextSelected);
      } else {
        setDetail(null);
      }
    },
    [isAuthenticated, loadDetail, runListLoad, token],
  );

  useEffect(() => {
    if (!token && !isAuthenticated) {
      const resetTimer = window.setTimeout(() => {
        setMetrics(DEFAULT_METRICS);
        setListState({
          total: 0,
          limit: 25,
          offset: 0,
          items: [],
        });
        setSelectedWallet(null);
        setDetail(null);
      }, 0);

      return () => window.clearTimeout(resetTimer);
    }

    const runInitialMetricsLoad = async () => {
      await loadMetrics();
    };

    void runInitialMetricsLoad();
    return undefined;
  }, [isAuthenticated, loadMetrics, token]);

  useEffect(() => {
    if (!token && !isAuthenticated) {
      return;
    }

    const timer = setTimeout(() => {
      void loadUsers(search, countryFilter, onlineOnly);
    }, 220);
    return () => clearTimeout(timer);
  }, [countryFilter, isAuthenticated, loadUsers, onlineOnly, search, token]);

  useEffect(() => {
    if (!token && !isAuthenticated) {
      return;
    }

    const interval = setInterval(() => {
      void loadMetrics();
      void loadUsers(search, countryFilter, onlineOnly, false);
    }, 30_000);

    return () => clearInterval(interval);
  }, [countryFilter, isAuthenticated, loadMetrics, loadUsers, onlineOnly, search, token]);

  const handleDeleteUser = useCallback(async () => {
    if (!deleteCandidate || isDeleting) return;

    const deleted = await runDeleteAction(
      () =>
        deleteAdminUser<{ success: boolean; walletAddress: string }>({
          token,
          walletAddress: deleteCandidate.walletAddress,
        }),
      {
        fallbackMessage: "Failed to delete wallet user",
      },
    );

    if (!deleted) {
      return;
    }

    try {
      setDeleteCandidate(null);
      setDeleteConfirmWallet("");
      await loadMetrics();
      await loadUsers(search, countryFilter, onlineOnly, true);
    } catch {
      notifyWarning({
        title: "Users Refresh Pending",
        description: "The user was updated, but the list could not be refreshed immediately.",
        dedupeKey: "admin-users-delete-refresh",
        dedupeMs: 20_000,
      });
    }
  }, [
    countryFilter,
    deleteCandidate,
    isDeleting,
    loadMetrics,
    loadUsers,
    onlineOnly,
    runDeleteAction,
    search,
    token,
  ]);

  const handleUpdateBlockStatus = useCallback(
    async (walletAddress: string, nextBlocked: boolean, nextMessage?: string) => {
      const updated = await runBlockAction(
        () =>
          updateAdminUserBlockStatus<WalletUserSummary>({
            token,
            walletAddress,
            isBlocked: nextBlocked,
            blockMessage: nextMessage || DEFAULT_BLOCK_MESSAGE,
          }),
        {
          fallbackMessage: "Failed to update block status",
        },
      );

      if (!updated) {
        return;
      }

      try {
        setBlockModalTarget(null);
        setBlockMessageInput(DEFAULT_BLOCK_MESSAGE);
        await loadMetrics();
        await loadUsers(search, countryFilter, onlineOnly, true);
      } catch {
        notifyWarning({
          title: "Users Refresh Pending",
          description: "The user status changed, but the list could not be refreshed immediately.",
          dedupeKey: "admin-users-block-refresh",
          dedupeMs: 20_000,
        });
      }
    },
    [countryFilter, loadMetrics, loadUsers, onlineOnly, runBlockAction, search, token],
  );

  const selectedSummary = detail?.user ?? null;

  const detailHeadline = useMemo(() => {
    if (!selectedSummary) return "Select a wallet user";
    return `${selectedSummary.walletAddress.slice(0, 6)}...${selectedSummary.walletAddress.slice(-6)}`;
  }, [selectedSummary]);

  return (
    <AdminUsersView
      metrics={metrics}
      listState={listState}
      selectedWallet={selectedWallet}
      setSelectedWallet={setSelectedWallet}
      detail={detail}
      search={search}
      setSearch={setSearch}
      countryFilter={countryFilter}
      setCountryFilter={setCountryFilter}
      onlineOnly={onlineOnly}
      setOnlineOnly={setOnlineOnly}
      isLoadingList={listAsync.isLoading}
      isLoadingDetail={detailAsync.isLoading}
      deleteCandidate={deleteCandidate}
      setDeleteCandidate={setDeleteCandidate}
      deleteConfirmWallet={deleteConfirmWallet}
      setDeleteConfirmWallet={setDeleteConfirmWallet}
      deleteError={deleteAsync.error}
      setDeleteError={deleteAsync.setError}
      isDeleting={isDeleting}
      blockModalTarget={blockModalTarget}
      setBlockModalTarget={setBlockModalTarget}
      blockMessageInput={blockMessageInput}
      setBlockMessageInput={setBlockMessageInput}
      isBlockUpdating={isBlockUpdating}
      blockError={blockAsync.error}
      setBlockError={blockAsync.setError}
      error={listAsync.error}
      detailHeadline={detailHeadline}
      loadDetail={loadDetail}
      handleDeleteUser={handleDeleteUser}
      handleUpdateBlockStatus={handleUpdateBlockStatus}
    />
  );
}

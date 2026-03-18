"use client";

import type { Dispatch, SetStateAction } from "react";
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
import type {
  UserDetailResponse,
  UsersListResponse,
  WalletUserMetrics,
  WalletUserSummary,
} from "@/components/admin/users/AdminUsersPage";

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

interface AdminUsersViewProps {
  metrics: WalletUserMetrics;
  listState: UsersListResponse;
  selectedWallet: string | null;
  setSelectedWallet: Dispatch<SetStateAction<string | null>>;
  detail: UserDetailResponse | null;
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  countryFilter: string;
  setCountryFilter: Dispatch<SetStateAction<string>>;
  onlineOnly: boolean;
  setOnlineOnly: Dispatch<SetStateAction<boolean>>;
  isLoadingList: boolean;
  isLoadingDetail: boolean;
  deleteCandidate: WalletUserSummary | null;
  setDeleteCandidate: Dispatch<SetStateAction<WalletUserSummary | null>>;
  deleteConfirmWallet: string;
  setDeleteConfirmWallet: Dispatch<SetStateAction<string>>;
  deleteError: string | null;
  setDeleteError: Dispatch<SetStateAction<string | null>>;
  isDeleting: boolean;
  blockModalTarget: WalletUserSummary | null;
  setBlockModalTarget: Dispatch<SetStateAction<WalletUserSummary | null>>;
  blockMessageInput: string;
  setBlockMessageInput: Dispatch<SetStateAction<string>>;
  isBlockUpdating: boolean;
  blockError: string | null;
  setBlockError: Dispatch<SetStateAction<string | null>>;
  error: string | null;
  detailHeadline: string;
  loadDetail: (walletAddress: string) => Promise<void>;
  handleDeleteUser: () => Promise<void>;
  handleUpdateBlockStatus: (walletAddress: string, nextBlocked: boolean, nextMessage?: string) => Promise<void>;
}

export default function AdminUsersView({
  metrics,
  listState,
  selectedWallet,
  setSelectedWallet,
  detail,
  search,
  setSearch,
  countryFilter,
  setCountryFilter,
  onlineOnly,
  setOnlineOnly,
  isLoadingList,
  isLoadingDetail,
  deleteCandidate,
  setDeleteCandidate,
  deleteConfirmWallet,
  setDeleteConfirmWallet,
  deleteError,
  setDeleteError,
  isDeleting,
  blockModalTarget,
  setBlockModalTarget,
  blockMessageInput,
  setBlockMessageInput,
  isBlockUpdating,
  blockError,
  setBlockError,
  error,
  detailHeadline,
  loadDetail,
  handleDeleteUser,
  handleUpdateBlockStatus,
}: AdminUsersViewProps) {
  return (
    <div className="admin-page flex flex-col gap-2 w-full">
      <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 sm:p-5">
        <h1 className="text-2xl font-bold text-white">Wallet Users</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Track connected wallets, online activity, session duration and staking positions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
        <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-neutral-400 text-xs">
            <Users className="w-4 h-4" />
            Total Users
          </div>
          <p className="text-2xl font-bold text-white mt-2">{metrics.totalUsers.toLocaleString()}</p>
        </div>
        <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-neutral-400 text-xs">
            <Activity className="w-4 h-4" />
            Online Now
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{metrics.onlineUsers.toLocaleString()}</p>
        </div>
        <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-neutral-400 text-xs">
            <Database className="w-4 h-4" />
            Active Positions
          </div>
          <p className="text-2xl font-bold text-blue-400 mt-2">{metrics.activeStakePositions.toLocaleString()}</p>
        </div>
        <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-neutral-400 text-xs">
            <Clock3 className="w-4 h-4" />
            Avg Session
          </div>
          <p className="text-2xl font-bold text-white mt-2">{formatSeconds(metrics.averageSessionSeconds)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-2 min-h-[620px]">
        <div className="bg-[#111111] border border-neutral-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-neutral-800 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              {listState.total} wallet users
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search wallet..."
                  className="h-9 w-48 rounded-lg border border-neutral-700 bg-[#0a0a0a] pl-8 pr-3 text-xs text-white outline-none focus:border-neutral-500"
                />
              </div>
              <input
                type="text"
                maxLength={2}
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value.toUpperCase())}
                placeholder="Country"
                className="h-9 w-20 rounded-lg border border-neutral-700 bg-[#0a0a0a] px-2 text-xs text-white outline-none focus:border-neutral-500 uppercase"
              />
              <label className="flex items-center gap-2 text-xs text-neutral-300 select-none">
                <input
                  type="checkbox"
                  checked={onlineOnly}
                  onChange={(e) => setOnlineOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-700 bg-[#0a0a0a] accent-emerald-500 cursor-pointer"
                />
                Online only
              </label>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[560px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full text-xs">
              <thead className="text-neutral-500 border-b border-neutral-800">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Wallet</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-left px-4 py-3 font-medium">Country</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Stake Pos.</th>
                  <th className="text-right px-4 py-3 font-medium">Staked USD</th>
                  <th className="text-right px-4 py-3 font-medium">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingList && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-neutral-500">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading users...
                      </span>
                    </td>
                  </tr>
                )}

                {!isLoadingList && error && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-red-400">
                      {error}
                    </td>
                  </tr>
                )}

                {!isLoadingList && !error && listState.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-neutral-500">
                      No users found.
                    </td>
                  </tr>
                )}

                {!isLoadingList &&
                  !error &&
                  listState.items.map((user) => {
                    const isSelected = selectedWallet === user.walletAddress;
                    return (
                      <tr
                        key={user.id}
                        className={`border-b border-neutral-800/60 cursor-pointer transition-colors ${
                          isSelected ? "bg-purple-500/10" : "hover:bg-neutral-800/30"
                        }`}
                        onClick={() => {
                          setSelectedWallet(user.walletAddress);
                          void loadDetail(user.walletAddress);
                        }}
                      >
                        <td className="px-4 py-3 text-white font-mono">{user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-6)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${
                              user.role === "ADMIN"
                                ? "border-blue-500/30 text-blue-300 bg-blue-500/10"
                                : "border-neutral-700 text-neutral-300 bg-neutral-800/70"
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-300">{user.lastSeenCountry ?? "-"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${
                              user.isBlocked
                                ? "border-red-500/30 text-red-300 bg-red-500/10"
                                : user.isOnline
                                ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                                : "border-neutral-700 text-neutral-400 bg-neutral-800/60"
                            }`}
                          >
                            {user.isBlocked ? "Blocked" : user.isOnline ? "Online" : "Offline"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-white">{user.activeStakePositions}/{user.totalStakePositions}</td>
                        <td className="px-4 py-3 text-right text-neutral-200">${user.totalStakedAmountUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-right text-neutral-400">{formatDate(user.lastSeenAt)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#111111] border border-neutral-800 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-neutral-800 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-neutral-400 text-xs">
                <Wallet className="w-4 h-4" />
                User Detail
              </div>
              <h2 className="text-base font-semibold text-white mt-1">{detailHeadline}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!detail?.user) return;
                  if (detail.user.role === "ADMIN") return;
                  if (detail.user.isBlocked) {
                    void handleUpdateBlockStatus(detail.user.walletAddress, false);
                    return;
                  }

                  setBlockModalTarget(detail.user);
                  setBlockMessageInput(detail.user.blockMessage || DEFAULT_BLOCK_MESSAGE);
                  setBlockError(null);
                }}
                disabled={!detail?.user || detail.user.role === "ADMIN" || isBlockUpdating}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                  detail?.user?.isBlocked
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                }`}
                title={detail?.user?.role === "ADMIN" ? "Admin wallets cannot be blocked." : undefined}
              >
                {detail?.user?.isBlocked ? "Unblock User" : "Block User"}
              </button>
              <button
                onClick={() => {
                  if (!detail?.user) return;
                  setDeleteCandidate(detail.user);
                  setDeleteConfirmWallet("");
                  setDeleteError(null);
                }}
                disabled={!detail?.user}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete User
              </button>
            </div>
          </div>

          {isLoadingDetail && (
            <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading details...
              </span>
            </div>
          )}

          {!isLoadingDetail && !detail && (
            <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm">
              Select a wallet user from the table.
            </div>
          )}

          {!isLoadingDetail && detail && (
            <div className="p-4 space-y-3 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-neutral-800 bg-[#0a0a0a] p-3">
                  <p className="text-[10px] text-neutral-500 uppercase">Role</p>
                  <p className="text-sm font-semibold text-white mt-1">{detail.user.role}</p>
                </div>
                <div className="rounded-lg border border-neutral-800 bg-[#0a0a0a] p-3">
                  <p className="text-[10px] text-neutral-500 uppercase">Total Session</p>
                  <p className="text-sm font-semibold text-white mt-1">{formatSeconds(detail.user.totalSessionSeconds)}</p>
                </div>
                <div className="rounded-lg border border-neutral-800 bg-[#0a0a0a] p-3">
                  <p className="text-[10px] text-neutral-500 uppercase">Staked USD</p>
                  <p className="text-sm font-semibold text-white mt-1">${detail.user.totalStakedAmountUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                </div>
              </div>

              {detail.user.isBlocked && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <p className="text-[10px] uppercase text-red-300">Blocked User</p>
                  <p className="mt-1 text-xs text-red-100">
                    {detail.user.blockMessage || DEFAULT_BLOCK_MESSAGE}
                  </p>
                  {detail.user.blockedAt && (
                    <p className="mt-1 text-[10px] text-red-300/80">
                      Blocked At: {formatDate(detail.user.blockedAt)}
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-lg border border-neutral-800 bg-[#0a0a0a] overflow-hidden">
                <div className="px-3 py-2 border-b border-neutral-800 text-xs text-neutral-400">
                  Recent Sessions ({detail.sessions.length})
                </div>
                <div className="max-h-52 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {detail.sessions.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-neutral-500">No sessions yet.</p>
                  ) : (
                    detail.sessions.slice(0, 20).map((session) => (
                      <div key={session.id} className="px-3 py-2 border-b border-neutral-800/60 last:border-b-0 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-300">{formatDate(session.startedAt)}</span>
                          <span className={session.isOnline ? "text-emerald-400" : "text-neutral-500"}>
                            {session.isOnline ? "Online" : "Ended"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-neutral-500">
                          <span>{session.countryCode ?? "-"} · {session.ipAddress ?? "-"}</span>
                          <span>{formatSeconds(session.durationSeconds)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-neutral-800 bg-[#0a0a0a] overflow-hidden">
                <div className="px-3 py-2 border-b border-neutral-800 text-xs text-neutral-400">
                  Stake Positions ({detail.stakePositions.length})
                </div>
                <div className="max-h-56 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {detail.stakePositions.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-neutral-500">No stake positions.</p>
                  ) : (
                    detail.stakePositions.slice(0, 30).map((position) => (
                      <div key={position.id} className="px-3 py-2 border-b border-neutral-800/60 last:border-b-0 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">
                            {position.tokenTicker} · {position.periodLabel}
                          </span>
                          <span
                            className={
                              position.status === "ACTIVE"
                                ? "text-emerald-400"
                                : position.status === "CLAIMED"
                                ? "text-blue-400"
                                : "text-neutral-500"
                            }
                          >
                            {position.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-neutral-500">
                          <span>
                            {position.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {position.tokenTicker}
                          </span>
                          <span>${position.amountUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {blockModalTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (isBlockUpdating) return;
              setBlockModalTarget(null);
              setBlockError(null);
            }}
          />
          <div className="relative w-full max-w-[520px] rounded-xl border border-neutral-800 bg-[#111111] p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Block Wallet User</h3>
              <button
                type="button"
                onClick={() => {
                  if (isBlockUpdating) return;
                  setBlockModalTarget(null);
                  setBlockError(null);
                }}
                className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-neutral-400">
              Blocked users cannot complete wallet connect and will see your custom message.
            </p>
            <div className="mt-3 rounded-lg border border-neutral-800 bg-[#0a0a0a] px-3 py-2">
              <p className="text-[11px] text-neutral-500">Target Wallet</p>
              <p className="mt-1 text-xs font-mono text-neutral-200 break-all">
                {blockModalTarget.walletAddress}
              </p>
            </div>
            <label className="mt-3 block text-xs text-neutral-400">Block Message</label>
            <textarea
              value={blockMessageInput}
              onChange={(e) => setBlockMessageInput(e.target.value)}
              rows={4}
              maxLength={500}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-[#0a0a0a] px-3 py-2 text-xs text-white outline-none focus:border-neutral-500 resize-y"
            />
            {blockError && <p className="mt-2 text-xs text-red-400">{blockError}</p>}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isBlockUpdating) return;
                  setBlockModalTarget(null);
                  setBlockError(null);
                }}
                className="rounded-lg border border-neutral-700 bg-transparent px-3 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  void handleUpdateBlockStatus(
                    blockModalTarget.walletAddress,
                    true,
                    blockMessageInput,
                  )
                }
                disabled={isBlockUpdating}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/20 px-3 py-2 text-xs font-medium text-amber-200 hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {isBlockUpdating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Blocking...
                  </>
                ) : (
                  "Confirm Block"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteCandidate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (isDeleting) return;
              setDeleteCandidate(null);
              setDeleteConfirmWallet("");
              setDeleteError(null);
            }}
          />
          <div className="relative w-full max-w-[460px] rounded-xl border border-neutral-800 bg-[#111111] p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Delete Wallet User</h3>
              <button
                type="button"
                onClick={() => {
                  if (isDeleting) return;
                  setDeleteCandidate(null);
                  setDeleteConfirmWallet("");
                  setDeleteError(null);
                }}
                className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-neutral-400">
              This operation removes user profile, sessions and stake position history permanently.
              Type the wallet address to confirm deletion.
            </p>
            <div className="mt-3 rounded-lg border border-neutral-800 bg-[#0a0a0a] px-3 py-2">
              <p className="text-[11px] text-neutral-500">Target Wallet</p>
              <p className="mt-1 text-xs font-mono text-neutral-200 break-all">
                {deleteCandidate.walletAddress}
              </p>
            </div>
            <input
              type="text"
              value={deleteConfirmWallet}
              onChange={(e) => setDeleteConfirmWallet(e.target.value.trim())}
              placeholder="Paste wallet address to confirm"
              className="mt-3 h-10 w-full rounded-lg border border-neutral-700 bg-[#0a0a0a] px-3 text-xs text-white outline-none focus:border-neutral-500"
            />
            {deleteError && (
              <p className="mt-2 text-xs text-red-400">{deleteError}</p>
            )}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isDeleting) return;
                  setDeleteCandidate(null);
                  setDeleteConfirmWallet("");
                  setDeleteError(null);
                }}
                className="rounded-lg border border-neutral-700 bg-transparent px-3 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteUser()}
                disabled={
                  isDeleting ||
                  deleteConfirmWallet !== deleteCandidate.walletAddress
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/20 px-3 py-2 text-xs font-medium text-red-200 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete User
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

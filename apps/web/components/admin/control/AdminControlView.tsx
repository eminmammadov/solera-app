"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  Loader2,
  RefreshCw,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import type {
  AdminCreateFormState,
  AdminRecord,
  AdminRole,
  ProxyBackendConfigPayload,
} from "@/components/admin/control/AdminControlPage";

interface AdminControlViewProps {
  proxyConfig: ProxyBackendConfigPayload | null;
  proxyDraftInput: string;
  setProxyDraftInput: Dispatch<SetStateAction<string>>;
  isLoadingProxy: boolean;
  isSavingDraft: boolean;
  isPublishing: boolean;
  isRollingBack: boolean;
  proxyError: string | null;
  admins: AdminRecord[];
  createForm: AdminCreateFormState;
  setCreateForm: Dispatch<SetStateAction<AdminCreateFormState>>;
  isLoadingAdmins: boolean;
  isSavingAdminId: string | null;
  isDeletingAdminId: string | null;
  confirmDeleteAdminId: string | null;
  setConfirmDeleteAdminId: Dispatch<SetStateAction<string | null>>;
  adminError: string | null;
  isCreatingAdmin: boolean;
  isDeletingCustomRoleName: string | null;
  confirmDeleteCustomRoleName: string | null;
  setConfirmDeleteCustomRoleName: Dispatch<SetStateAction<string | null>>;
  isSuperAdmin: boolean;
  currentAdminId: string | null;
  loadProxyConfig: () => Promise<void>;
  saveProxyDraft: () => Promise<void>;
  publishProxyDraft: () => Promise<void>;
  rollbackProxyConfig: () => Promise<void>;
  updateAdminDraft: (id: string, patch: Partial<AdminRecord>) => void;
  getMergedAdmin: (item: AdminRecord) => AdminRecord;
  saveAdmin: (item: AdminRecord) => Promise<void>;
  deleteAdmin: (item: AdminRecord) => Promise<void>;
  createAdmin: () => Promise<void>;
  deleteCustomRole: (customRoleName: string) => Promise<void>;
  adminRoleSummary: {
    superAdmins: number;
    editors: number;
    viewers: number;
    custom: number;
  };
  customRoles: Array<{
    customRoleName: string;
    totalAdmins: number;
    activeAdmins: number;
  }>;
  formatDateTime: (value: string) => string;
  adminRoleOptions: AdminRole[];
}

export default function AdminControlView({
  proxyConfig,
  proxyDraftInput,
  setProxyDraftInput,
  isLoadingProxy,
  isSavingDraft,
  isPublishing,
  isRollingBack,
  proxyError,
  admins,
  createForm,
  setCreateForm,
  isLoadingAdmins,
  isSavingAdminId,
  isDeletingAdminId,
  confirmDeleteAdminId,
  setConfirmDeleteAdminId,
  adminError,
  isCreatingAdmin,
  isDeletingCustomRoleName,
  confirmDeleteCustomRoleName,
  setConfirmDeleteCustomRoleName,
  isSuperAdmin,
  currentAdminId,
  loadProxyConfig,
  saveProxyDraft,
  publishProxyDraft,
  rollbackProxyConfig,
  updateAdminDraft,
  getMergedAdmin,
  saveAdmin,
  deleteAdmin,
  createAdmin,
  deleteCustomRole,
  adminRoleSummary,
  customRoles,
  formatDateTime,
  adminRoleOptions,
}: AdminControlViewProps) {
  return (
    <div className="admin-page flex flex-col gap-2 w-full">
      <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 sm:p-5">
        <h1 className="text-2xl font-bold text-white">Control Center</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Central runtime API routing and admin access-role governance panel.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-2">
        <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-white">Backend Runtime URL</h2>
            </div>
            <button
              type="button"
              onClick={() => void loadProxyConfig()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-700 bg-[#0a0a0a] text-xs text-neutral-200 hover:border-neutral-500 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload
            </button>
          </div>

          {proxyError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {proxyError}
            </div>
          )}

          {isLoadingProxy ? (
            <div className="text-sm text-neutral-400 inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading runtime config...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-neutral-800 bg-[#0a0a0a] p-3">
                  <p className="text-neutral-500">Effective</p>
                  <p className="text-neutral-200 mt-1 break-all">
                    {proxyConfig?.effectiveBackendBaseUrl || "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-800 bg-[#0a0a0a] p-3">
                  <p className="text-neutral-500">Published</p>
                  <p className="text-neutral-200 mt-1 break-all">
                    {proxyConfig?.publishedBackendBaseUrl || "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-800 bg-[#0a0a0a] p-3">
                  <p className="text-neutral-500">Previous</p>
                  <p className="text-neutral-200 mt-1 break-all">
                    {proxyConfig?.previousBackendBaseUrl || "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-800 bg-[#0a0a0a] p-3">
                  <p className="text-neutral-500">Version</p>
                  <p className="text-neutral-200 mt-1">
                    v{proxyConfig?.version || 1} · {proxyConfig ? formatDateTime(proxyConfig.updatedAt) : "-"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-neutral-400">Draft Backend Base URL</label>
                <input
                  value={proxyDraftInput}
                  onChange={(e) => setProxyDraftInput(e.target.value)}
                  placeholder="https://api.example.com/api"
                  className="h-10 w-full rounded-lg border border-neutral-700 bg-[#0a0a0a] px-3 text-sm text-white outline-none focus:border-neutral-500"
                  disabled={!isSuperAdmin}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void saveProxyDraft()}
                    disabled={!isSuperAdmin || isSavingDraft}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0a0a0a] border border-neutral-700 text-xs text-neutral-100 hover:border-neutral-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSavingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => void publishProxyDraft()}
                    disabled={!isSuperAdmin || isPublishing}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    Publish
                  </button>
                  <button
                    type="button"
                    onClick={() => void rollbackProxyConfig()}
                    disabled={!isSuperAdmin || isRollingBack}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 hover:bg-amber-500/20 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isRollingBack ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                    Rollback
                  </button>
                </div>
              </div>

              {!isSuperAdmin && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  Only SUPER_ADMIN can change runtime backend URL (draft/publish/rollback).
                </div>
              )}
            </>
          )}
        </div>

        <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Role Summary</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-neutral-800 bg-[#0a0a0a] p-3">
              <p className="text-neutral-500">SUPER_ADMIN</p>
              <p className="text-white text-xl font-bold mt-1">{adminRoleSummary.superAdmins}</p>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-[#0a0a0a] p-3">
              <p className="text-neutral-500">EDITOR</p>
              <p className="text-white text-xl font-bold mt-1">{adminRoleSummary.editors}</p>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-[#0a0a0a] p-3">
              <p className="text-neutral-500">VIEWER</p>
              <p className="text-white text-xl font-bold mt-1">{adminRoleSummary.viewers}</p>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-[#0a0a0a] p-3">
              <p className="text-neutral-500">CUSTOM</p>
              <p className="text-white text-xl font-bold mt-1">{adminRoleSummary.custom}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-white">Admin Access Management</h2>

        {!isSuperAdmin && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            Only SUPER_ADMIN can view and manage admin role assignments.
          </div>
        )}

        {adminError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {adminError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-2">
          <input
            value={createForm.walletAddress}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, walletAddress: e.target.value }))}
            placeholder="Admin wallet address"
            className="h-9 rounded-lg border border-neutral-700 bg-[#0a0a0a] px-3 text-xs text-white outline-none focus:border-neutral-500"
          />
          <input
            value={createForm.name}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Display name"
            className="h-9 rounded-lg border border-neutral-700 bg-[#0a0a0a] px-3 text-xs text-white outline-none focus:border-neutral-500"
          />
          <select
            value={createForm.role}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, role: e.target.value as AdminRole }))
            }
            className="h-9 rounded-lg border border-neutral-700 bg-[#0a0a0a] px-3 text-xs text-white outline-none focus:border-neutral-500 cursor-pointer"
          >
            {adminRoleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <input
            value={createForm.customRoleName}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, customRoleName: e.target.value }))
            }
            placeholder="Custom role name"
            disabled={createForm.role !== "CUSTOM"}
            className="h-9 rounded-lg border border-neutral-700 bg-[#0a0a0a] px-3 text-xs text-white outline-none focus:border-neutral-500 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void createAdmin()}
            disabled={!isSuperAdmin || isCreatingAdmin}
            className="h-9 px-3 rounded-lg border border-neutral-700 bg-[#0a0a0a] text-xs text-neutral-100 hover:border-neutral-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isCreatingAdmin ? "Creating..." : "Create"}
          </button>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-[#0a0a0a] p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs font-medium text-neutral-300">Custom Roles</p>
            <p className="text-[11px] text-neutral-500">{customRoles.length} role(s)</p>
          </div>
          {customRoles.length === 0 ? (
            <p className="text-xs text-neutral-500">No custom roles found.</p>
          ) : (
            <div className="space-y-2">
              {customRoles.map((item) => {
                const isDeleting = isDeletingCustomRoleName === item.customRoleName;
                const isConfirming = confirmDeleteCustomRoleName === item.customRoleName;
                return (
                  <div
                    key={item.customRoleName}
                    className="rounded-md border border-neutral-800 bg-[#111111] p-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">{item.customRoleName}</p>
                        <p className="text-[11px] text-neutral-500">
                          {item.totalAdmins} admin(s) · {item.activeAdmins} active
                        </p>
                      </div>
                      {!isConfirming ? (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteCustomRoleName(item.customRoleName)}
                          disabled={!isSuperAdmin || Boolean(isDeletingCustomRoleName)}
                          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-red-500/30 bg-red-500/10 text-[11px] text-red-300 hover:bg-red-500/20 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteCustomRoleName(null)}
                            disabled={isDeleting}
                            className="h-7 px-2.5 rounded-md border border-neutral-700 bg-[#0a0a0a] text-[11px] text-neutral-300 hover:border-neutral-500 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteCustomRole(item.customRoleName)}
                            disabled={isDeleting}
                            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-red-500/30 bg-red-500/10 text-[11px] text-red-300 hover:bg-red-500/20 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {isDeleting ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-3.5 h-3.5" />
                                Confirm
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-neutral-500 border-b border-neutral-800">
                <th className="text-left py-2 pr-3">Wallet</th>
                <th className="text-left py-2 pr-3">Name</th>
                <th className="text-left py-2 pr-3">Role</th>
                <th className="text-left py-2 pr-3">Custom Role</th>
                <th className="text-left py-2 pr-3">Active</th>
                <th className="text-right py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingAdmins ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading admins...
                    </span>
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-500">
                    No admin accounts found.
                  </td>
                </tr>
              ) : (
                admins.map((item) => {
                  const merged = getMergedAdmin(item);
                  const isSaving = isSavingAdminId === item.id;
                  const isDeleting = isDeletingAdminId === item.id;
                  const isConfirmingDelete = confirmDeleteAdminId === item.id;
                  const isSelf = currentAdminId === item.id;

                  return (
                    <tr key={item.id} className="border-b border-neutral-800/60">
                      <td className="py-2 pr-3">
                        <p className="text-neutral-100 break-all">{item.walletAddress}</p>
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          value={merged.name}
                          onChange={(e) => updateAdminDraft(item.id, { name: e.target.value })}
                          className="h-8 w-full rounded-md border border-neutral-700 bg-[#0a0a0a] px-2 text-xs text-white outline-none focus:border-neutral-500"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <select
                          value={merged.role}
                          onChange={(e) =>
                            updateAdminDraft(item.id, {
                              role: e.target.value as AdminRole,
                              customRoleName:
                                e.target.value === "CUSTOM" ? merged.customRoleName : null,
                            })
                          }
                          className="h-8 w-full rounded-md border border-neutral-700 bg-[#0a0a0a] px-2 text-xs text-white outline-none focus:border-neutral-500 cursor-pointer"
                        >
                          {adminRoleOptions.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          value={merged.customRoleName || ""}
                          onChange={(e) =>
                            updateAdminDraft(item.id, {
                              customRoleName: e.target.value,
                            })
                          }
                          disabled={merged.role !== "CUSTOM"}
                          className="h-8 w-full rounded-md border border-neutral-700 bg-[#0a0a0a] px-2 text-xs text-white outline-none focus:border-neutral-500 disabled:opacity-50"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <label className="inline-flex items-center gap-2 text-neutral-300">
                          <input
                            type="checkbox"
                            checked={merged.isActive}
                            onChange={(e) =>
                              updateAdminDraft(item.id, { isActive: e.target.checked })
                            }
                            className="h-4 w-4 accent-emerald-500 cursor-pointer"
                          />
                          {merged.isActive ? "Yes" : "No"}
                        </label>
                      </td>
                      <td className="py-2 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void saveAdmin(item)}
                            disabled={!isSuperAdmin || isSaving || isDeleting}
                            className="h-8 px-2.5 rounded-md border border-neutral-700 bg-[#0a0a0a] text-xs text-neutral-100 hover:border-neutral-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {isSaving ? "Saving..." : "Save"}
                          </button>

                          {isSelf ? (
                            <span className="px-2 text-[11px] text-neutral-500">Current</span>
                          ) : !isConfirmingDelete ? (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteAdminId(item.id)}
                              disabled={!isSuperAdmin || Boolean(isDeletingAdminId) || isSaving}
                              className="h-8 px-2.5 rounded-md border border-red-500/30 bg-red-500/10 text-xs text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              Delete
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteAdminId(null)}
                                disabled={isDeleting}
                                className="h-8 px-2.5 rounded-md border border-neutral-700 bg-[#0a0a0a] text-xs text-neutral-300 hover:border-neutral-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteAdmin(item)}
                                disabled={isDeleting}
                                className="h-8 px-2.5 rounded-md border border-red-500/30 bg-red-500/10 text-xs text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              >
                                {isDeleting ? "Deleting..." : "Confirm"}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAdminRole,
  deleteAdminRole,
  deleteCustomAdminRole,
  fetchAdminProxyBackendConfig,
  fetchAdminRoles,
  publishAdminProxyBackendDraft,
  rollbackAdminProxyBackend,
  saveAdminProxyBackendDraft,
  updateAdminRole,
} from "@/lib/admin/control-admin";
import { useAdminAsyncController } from "@/hooks/admin/use-admin-async-controller";
import { useAdminAuth } from "@/store/admin/use-admin-auth";
import { useFeedbackToast } from "@/hooks/use-feedback-toast";
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
import AdminControlView from "@/components/admin/control/AdminControlView";

export type AdminRole = "SUPER_ADMIN" | "EDITOR" | "VIEWER" | "CUSTOM";

export interface ProxyBackendConfigPayload {
  draftBackendBaseUrl: string | null;
  publishedBackendBaseUrl: string | null;
  previousBackendBaseUrl: string | null;
  effectiveBackendBaseUrl: string | null;
  version: number;
  updatedAt: string;
}

export interface AdminRecord {
  id: string;
  walletAddress: string;
  name: string;
  role: AdminRole;
  customRoleName: string | null;
  isActive: boolean;
}

interface AdminListResponse {
  items: AdminRecord[];
}

interface DeleteCustomAdminRoleResponse {
  success: true;
  customRoleName: string;
  reassignedAdmins: number;
  replacementRole: AdminRole;
}

interface DeleteAdminResponse {
  success: true;
  id: string;
  walletAddress: string;
}

export interface AdminCreateFormState {
  walletAddress: string;
  name: string;
  role: AdminRole;
  customRoleName: string;
  isActive: boolean;
}

const ADMIN_ROLE_OPTIONS: AdminRole[] = [
  "SUPER_ADMIN",
  "EDITOR",
  "VIEWER",
  "CUSTOM",
];

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function AdminControlPage() {
  const { token, admin } = useAdminAuth();
  const proxyLoadAsync = useAdminAsyncController(true);
  const proxyDraftAsync = useAdminAsyncController(false);
  const proxyPublishAsync = useAdminAsyncController(false);
  const proxyRollbackAsync = useAdminAsyncController(false);
  const adminListAsync = useAdminAsyncController(true);
  const adminSaveAsync = useAdminAsyncController(false);
  const adminDeleteAsync = useAdminAsyncController(false);
  const adminCreateAsync = useAdminAsyncController(false);
  const customRoleDeleteAsync = useAdminAsyncController(false);
  const { clearError: clearProxyLoadError, runLoad: runProxyLoad } = proxyLoadAsync;
  const { clearError: clearProxyDraftError, runAction: runProxyDraftAction } = proxyDraftAsync;
  const { clearError: clearProxyPublishError, runAction: runProxyPublishAction } = proxyPublishAsync;
  const { clearError: clearProxyRollbackError, runAction: runProxyRollbackAction } = proxyRollbackAsync;
  const { clearError: clearAdminListError, runLoad: runAdminListLoad } = adminListAsync;
  const { clearError: clearAdminSaveError } = adminSaveAsync;
  const { clearError: clearAdminDeleteError } = adminDeleteAsync;
  const { clearError: clearAdminCreateError } = adminCreateAsync;
  const { clearError: clearCustomRoleDeleteError } = customRoleDeleteAsync;
  const [proxyConfig, setProxyConfig] = useState<ProxyBackendConfigPayload | null>(null);
  const [proxyDraftInput, setProxyDraftInput] = useState("");

  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [adminDrafts, setAdminDrafts] = useState<Record<string, Partial<AdminRecord>>>({});
  const [isSavingAdminId, setIsSavingAdminId] = useState<string | null>(null);
  const [isDeletingAdminId, setIsDeletingAdminId] = useState<string | null>(null);
  const [confirmDeleteAdminId, setConfirmDeleteAdminId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<AdminCreateFormState>({
    walletAddress: "",
    name: "",
    role: "VIEWER" as AdminRole,
    customRoleName: "",
    isActive: true,
  });
  const [isDeletingCustomRoleName, setIsDeletingCustomRoleName] = useState<string | null>(null);
  const [confirmDeleteCustomRoleName, setConfirmDeleteCustomRoleName] = useState<string | null>(null);

  const isSuperAdmin = admin?.role === "SUPER_ADMIN";
  const proxyError =
    proxyLoadAsync.error ??
    proxyDraftAsync.error ??
    proxyPublishAsync.error ??
    proxyRollbackAsync.error;
  const adminError =
    adminListAsync.error ??
    adminSaveAsync.error ??
    adminDeleteAsync.error ??
    adminCreateAsync.error ??
    customRoleDeleteAsync.error;

  const clearProxyErrors = useCallback(() => {
    clearProxyLoadError();
    clearProxyDraftError();
    clearProxyPublishError();
    clearProxyRollbackError();
  }, [clearProxyDraftError, clearProxyLoadError, clearProxyPublishError, clearProxyRollbackError]);

  const clearAdminErrors = useCallback(() => {
    clearAdminListError();
    clearAdminSaveError();
    clearAdminDeleteError();
    clearAdminCreateError();
    clearCustomRoleDeleteError();
  }, [
    clearAdminListError,
    clearAdminSaveError,
    clearAdminDeleteError,
    clearAdminCreateError,
    clearCustomRoleDeleteError,
  ]);

  useFeedbackToast({
    scope: "admin-control-proxy",
    error: proxyError,
    errorTitle: "Control Center Error",
  });

  useFeedbackToast({
    scope: "admin-control-admins",
    error: adminError,
    errorTitle: "Admin Role Error",
  });

  const loadProxyConfig = useCallback(async () => {
    clearProxyErrors();
    const payload = await runProxyLoad(
      () =>
        fetchAdminProxyBackendConfig<ProxyBackendConfigPayload>({
          token,
        }),
      {
        fallbackMessage: "Failed to load backend runtime config.",
      },
    );

    if (payload) {
      setProxyConfig(payload);
      setProxyDraftInput(payload.draftBackendBaseUrl || "");
    } else {
      setProxyConfig(null);
    }
  }, [clearProxyErrors, runProxyLoad, token]);

  const loadAdmins = useCallback(async () => {
    clearAdminErrors();
    const payload = await runAdminListLoad(
      () =>
        fetchAdminRoles<AdminListResponse>({
          token,
        }),
      {
        fallbackMessage: "Failed to load admin roles.",
      },
    );

    if (payload) {
      setAdmins(payload.items);
      setAdminDrafts({});
    } else {
      setAdmins([]);
    }
  }, [clearAdminErrors, runAdminListLoad, token]);

  useEffect(() => {
    const runInitialLoad = async () => {
      await loadProxyConfig();
        await loadAdmins();
    };

    if (isSuperAdmin) {
      void runInitialLoad();
      return;
    }

    const resetTimer = window.setTimeout(() => {
      void loadProxyConfig();
      setAdmins([]);
      setAdminDrafts({});
      clearAdminErrors();
    }, 0);

    return () => window.clearTimeout(resetTimer);
  }, [clearAdminErrors, isSuperAdmin, loadAdmins, loadProxyConfig]);

  const saveProxyDraft = async () => {
    if (!isSuperAdmin || proxyDraftAsync.isActing) return;
    clearProxyErrors();
    const payload = await runProxyDraftAction(
      () =>
        saveAdminProxyBackendDraft<ProxyBackendConfigPayload>({
          token,
          backendBaseUrl: proxyDraftInput.trim() || null,
        }),
      {
        fallbackMessage: "Failed to save draft backend URL.",
      },
    );

    if (!payload) {
      return;
    }

    setProxyConfig(payload);
    setProxyDraftInput(payload.draftBackendBaseUrl || "");
  };

  const publishProxyDraft = async () => {
    if (!isSuperAdmin || proxyPublishAsync.isActing) return;
    clearProxyErrors();
    const payload = await runProxyPublishAction(
      () =>
        publishAdminProxyBackendDraft<ProxyBackendConfigPayload>({
          token,
        }),
      {
        fallbackMessage: "Failed to publish backend URL.",
      },
    );

    if (!payload) {
      return;
    }

    setProxyConfig(payload);
    setProxyDraftInput(payload.draftBackendBaseUrl || "");
  };

  const rollbackProxyConfig = async () => {
    if (!isSuperAdmin || proxyRollbackAsync.isActing) return;
    clearProxyErrors();
    const payload = await runProxyRollbackAction(
      () =>
        rollbackAdminProxyBackend<ProxyBackendConfigPayload>({
          token,
        }),
      {
        fallbackMessage: "Failed to rollback backend URL.",
      },
    );

    if (!payload) {
      return;
    }

    setProxyConfig(payload);
    setProxyDraftInput(payload.draftBackendBaseUrl || "");
  };

  const updateAdminDraft = (id: string, patch: Partial<AdminRecord>) => {
    setAdminDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? {}),
        ...patch,
      },
    }));
  };

  const getMergedAdmin = (item: AdminRecord): AdminRecord => ({
    ...item,
    ...(adminDrafts[item.id] ?? {}),
  });

  const saveAdmin = async (item: AdminRecord) => {
    if (!isSuperAdmin || isSavingAdminId) return;
    const draft = adminDrafts[item.id];
    if (!draft) return;

    setIsSavingAdminId(item.id);
    clearAdminErrors();
    const saved = await adminSaveAsync.runAction(
      () =>
        updateAdminRole<AdminRecord>({
          token,
          adminId: item.id,
          payload: JSON.stringify({
            name: draft.name,
            role: draft.role,
            customRoleName: draft.customRoleName,
            isActive: draft.isActive,
          }),
        }),
      {
        fallbackMessage: "Failed to update admin role.",
      },
    );

    if (saved) {
      await loadAdmins();
    }
    setIsSavingAdminId(null);
  };

  const deleteAdmin = async (item: AdminRecord) => {
    if (!isSuperAdmin || isDeletingAdminId) return;
    setIsDeletingAdminId(item.id);
    clearAdminErrors();
    const deleted = await adminDeleteAsync.runAction(
      () =>
        deleteAdminRole<DeleteAdminResponse>({
          token,
          adminId: item.id,
        }),
      {
        fallbackMessage: "Failed to delete admin.",
      },
    );

    if (deleted) {
      setConfirmDeleteAdminId(null);
      await loadAdmins();
    }
    setIsDeletingAdminId(null);
  };

  const createAdmin = async () => {
    if (!isSuperAdmin || adminCreateAsync.isActing) return;
    clearAdminErrors();
    const created = await adminCreateAsync.runAction(
      () =>
        createAdminRole<AdminRecord>({
          token,
          payload: JSON.stringify({
            walletAddress: createForm.walletAddress.trim(),
            name: createForm.name.trim() || undefined,
            role: createForm.role,
            customRoleName:
              createForm.role === "CUSTOM" ? createForm.customRoleName.trim() : undefined,
            isActive: createForm.isActive,
          }),
        }),
      {
        fallbackMessage: "Failed to create admin.",
      },
    );

    if (!created) {
      return;
    }

      setCreateForm({
        walletAddress: "",
        name: "",
        role: "VIEWER",
        customRoleName: "",
        isActive: true,
      });
      await loadAdmins();
  };

  const deleteCustomRole = async (customRoleName: string) => {
    if (!isSuperAdmin || isDeletingCustomRoleName) return;
    setIsDeletingCustomRoleName(customRoleName);
    clearAdminErrors();
    const deleted = await customRoleDeleteAsync.runAction(
      () =>
        deleteCustomAdminRole<DeleteCustomAdminRoleResponse>({
          token,
          roleName: customRoleName,
        }),
      {
        fallbackMessage: "Failed to delete custom role.",
      },
    );

    if (deleted) {
      setConfirmDeleteCustomRoleName(null);
      await loadAdmins();
    }
    setIsDeletingCustomRoleName(null);
  };

  const adminRoleSummary = useMemo(() => {
    const summary = {
      superAdmins: 0,
      editors: 0,
      viewers: 0,
      custom: 0,
    };

    for (const item of admins) {
      if (item.role === "SUPER_ADMIN") summary.superAdmins += 1;
      if (item.role === "EDITOR") summary.editors += 1;
      if (item.role === "VIEWER") summary.viewers += 1;
      if (item.role === "CUSTOM") summary.custom += 1;
    }
    return summary;
  }, [admins]);

  const customRoles = useMemo(() => {
    const summary = new Map<string, { totalAdmins: number; activeAdmins: number }>();

    for (const item of admins) {
      if (item.role !== "CUSTOM") continue;
      const roleName = item.customRoleName?.trim();
      if (!roleName) continue;

      const existing = summary.get(roleName) ?? { totalAdmins: 0, activeAdmins: 0 };
      existing.totalAdmins += 1;
      if (item.isActive) existing.activeAdmins += 1;
      summary.set(roleName, existing);
    }

    return Array.from(summary.entries())
      .map(([customRoleName, counts]) => ({
        customRoleName,
        ...counts,
      }))
      .sort((a, b) => a.customRoleName.localeCompare(b.customRoleName));
  }, [admins]);

  return (
    <AdminControlView
      proxyConfig={proxyConfig}
      proxyDraftInput={proxyDraftInput}
      setProxyDraftInput={setProxyDraftInput}
      isLoadingProxy={proxyLoadAsync.isLoading}
      isSavingDraft={proxyDraftAsync.isActing}
      isPublishing={proxyPublishAsync.isActing}
      isRollingBack={proxyRollbackAsync.isActing}
      proxyError={proxyError}
      admins={admins}
      createForm={createForm}
      setCreateForm={setCreateForm}
      isLoadingAdmins={adminListAsync.isLoading}
      isSavingAdminId={isSavingAdminId}
      isDeletingAdminId={isDeletingAdminId}
      confirmDeleteAdminId={confirmDeleteAdminId}
      setConfirmDeleteAdminId={setConfirmDeleteAdminId}
      adminError={adminError}
      isCreatingAdmin={adminCreateAsync.isActing}
      isDeletingCustomRoleName={isDeletingCustomRoleName}
      confirmDeleteCustomRoleName={confirmDeleteCustomRoleName}
      setConfirmDeleteCustomRoleName={setConfirmDeleteCustomRoleName}
      isSuperAdmin={isSuperAdmin}
      currentAdminId={admin?.id ?? null}
      loadProxyConfig={loadProxyConfig}
      saveProxyDraft={saveProxyDraft}
      publishProxyDraft={publishProxyDraft}
      rollbackProxyConfig={rollbackProxyConfig}
      updateAdminDraft={updateAdminDraft}
      getMergedAdmin={getMergedAdmin}
      saveAdmin={saveAdmin}
      deleteAdmin={deleteAdmin}
      createAdmin={createAdmin}
      deleteCustomRole={deleteCustomRole}
      adminRoleSummary={adminRoleSummary}
      customRoles={customRoles}
      formatDateTime={formatDateTime}
      adminRoleOptions={ADMIN_ROLE_OPTIONS}
    />
  );
}

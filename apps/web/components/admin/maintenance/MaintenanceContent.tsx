"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAdminAuth } from "@/store/admin/use-admin-auth";
import {
  fetchAdminMaintenanceSettings,
  saveAdminMaintenanceSettings,
} from "@/lib/admin/maintenance-admin";
import { useAdminAsyncController } from "@/hooks/admin/use-admin-async-controller";
import { useFeedbackToast } from "@/hooks/use-feedback-toast";
import { MaintenanceFeedback } from "@/components/admin/maintenance/MaintenanceFeedback";
import { MaintenanceFormSection } from "@/components/admin/maintenance/MaintenanceFormSection";
import { MaintenanceHeaderSection } from "@/components/admin/maintenance/MaintenanceHeaderSection";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  RefreshCcw,
  Save,
  Undo2,
  Wrench,
} from "lucide-react";

const MAINTENANCE_TEXT = {
  title: "Maintenance Mode",
  subtitle: "Control public access during maintenance windows.",
  enableLabel: "Enable Maintenance",
  startsAtLabel: "Start Time (optional)",
  messageLabel: "Public Message",
  saveBtn: "Save Changes",
  savingBtn: "Saving...",
  refreshBtn: "Refresh",
  discardBtn: "Discard",
  activateNow: "Activate Now",
  deactivate: "Deactivate",
  preview: "Open Public Preview",
} as const;

interface MaintenanceStatusResponse {
  maintenanceEnabled: boolean;
  maintenanceStartsAt: string | null;
  maintenanceMessage: string | null;
  isActive: boolean;
  serverTime: string;
}

interface MaintenanceFormState {
  maintenanceEnabled: boolean;
  maintenanceStartsAt: string;
  maintenanceMessage: string;
}

const toLocalDatetimeInput = (isoValue: string | null) => {
  if (!isoValue) return "";
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
};

const isSameForm = (a: MaintenanceFormState, b: MaintenanceFormState) =>
  a.maintenanceEnabled === b.maintenanceEnabled &&
  a.maintenanceStartsAt === b.maintenanceStartsAt &&
  a.maintenanceMessage === b.maintenanceMessage;

const getSuccessMessage = (
  data: MaintenanceStatusResponse,
  action: "save" | "activate" | "deactivate",
) => {
  if (action === "deactivate" || !data.maintenanceEnabled) {
    return "Maintenance deactivated. Frontend is now live.";
  }

  if (action === "activate" && data.isActive) {
    return "Maintenance activated successfully. Public routes now show maintenance.";
  }

  if (data.maintenanceEnabled && !data.isActive && data.maintenanceStartsAt) {
    return `Maintenance scheduled for ${new Date(data.maintenanceStartsAt).toLocaleString("en-US")}.`;
  }

  return "Maintenance settings updated successfully.";
};

export function MaintenanceContent() {
  const { token } = useAdminAuth();
  const asyncState = useAdminAsyncController(true);
  const {
    runLoad: runMaintenanceLoad,
    runAction: runMaintenanceAction,
    clearError: clearMaintenanceError,
    isActing: isMaintenanceActing,
  } = asyncState;

  const [form, setForm] = useState<MaintenanceFormState>({
    maintenanceEnabled: false,
    maintenanceStartsAt: "",
    maintenanceMessage: "",
  });
  const [syncedForm, setSyncedForm] = useState<MaintenanceFormState>({
    maintenanceEnabled: false,
    maintenanceStartsAt: "",
    maintenanceMessage: "",
  });
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [maintenanceServerTime, setMaintenanceServerTime] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useFeedbackToast({
    scope: "admin-maintenance",
    error: asyncState.error,
    success,
    errorTitle: "Maintenance Error",
    successTitle: "Maintenance",
  });

  const hasUnsavedChanges = useMemo(() => !isSameForm(form, syncedForm), [form, syncedForm]);
  const scheduledAt = useMemo(() => {
    if (!syncedForm.maintenanceEnabled || !syncedForm.maintenanceStartsAt || maintenanceActive) {
      return null;
    }
    const date = new Date(syncedForm.maintenanceStartsAt);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString("en-US");
  }, [maintenanceActive, syncedForm.maintenanceEnabled, syncedForm.maintenanceStartsAt]);

  const applyServerState = useCallback((data: MaintenanceStatusResponse) => {
    const normalized: MaintenanceFormState = {
      maintenanceEnabled: data.maintenanceEnabled,
      maintenanceStartsAt: toLocalDatetimeInput(data.maintenanceStartsAt),
      maintenanceMessage: data.maintenanceMessage ?? "",
    };

    setForm(normalized);
    setSyncedForm(normalized);
    setMaintenanceActive(data.isActive);
    setMaintenanceServerTime(data.serverTime ?? null);
  }, []);

  const fetchMaintenanceSettings = useCallback(async () => {
    await runMaintenanceLoad(
      () =>
        fetchAdminMaintenanceSettings<MaintenanceStatusResponse>({
          token,
        }),
      {
        fallbackMessage: "Failed to load maintenance settings",
        onSuccess: (data) => {
          applyServerState(data);
        },
      },
    );
  }, [applyServerState, runMaintenanceLoad, token]);

  useEffect(() => {
    void fetchMaintenanceSettings();
  }, [fetchMaintenanceSettings]);

  const persistMaintenanceSettings = async (
    nextForm: MaintenanceFormState,
    action: "save" | "activate" | "deactivate",
  ) => {
    if (isMaintenanceActing) return;

    setSuccess(null);
    setForm(nextForm);

    const payload = {
      maintenanceEnabled: nextForm.maintenanceEnabled,
      maintenanceStartsAt: nextForm.maintenanceStartsAt
        ? new Date(nextForm.maintenanceStartsAt).toISOString()
        : null,
      maintenanceMessage: nextForm.maintenanceMessage.trim() || null,
    };

    await runMaintenanceAction(
      () =>
        saveAdminMaintenanceSettings<MaintenanceStatusResponse>({
          token,
          payload: JSON.stringify(payload),
        }),
      {
        fallbackMessage: "Failed to save maintenance settings",
        onSuccess: (data) => {
          applyServerState(data);
          setSuccess(getSuccessMessage(data, action));
        },
      },
    );
  };

  const activateNow = () => {
    const nextForm: MaintenanceFormState = {
      ...form,
      maintenanceEnabled: true,
      maintenanceStartsAt: toLocalDatetimeInput(new Date().toISOString()),
    };
    void persistMaintenanceSettings(nextForm, "activate");
  };

  const deactivateNow = () => {
    const nextForm: MaintenanceFormState = {
      ...form,
      maintenanceEnabled: false,
      maintenanceStartsAt: "",
    };
    void persistMaintenanceSettings(nextForm, "deactivate");
  };

  const discardLocalChanges = () => {
    setForm(syncedForm);
    setSuccess(null);
    clearMaintenanceError();
  };

  return (
    <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 sm:p-5 shrink-0">
      <MaintenanceHeaderSection
        title={MAINTENANCE_TEXT.title}
        subtitle={MAINTENANCE_TEXT.subtitle}
        previewLabel={MAINTENANCE_TEXT.preview}
        maintenanceActive={maintenanceActive}
      />

      {asyncState.isLoading ? (
        <div className="rounded-xl border border-neutral-800 bg-[#0a0a0a] p-4">
          <p className="text-xs text-neutral-500">Loading maintenance settings...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <MaintenanceFormSection
            form={form}
            isSaving={asyncState.isActing}
            isLoading={asyncState.isLoading}
            hasUnsavedChanges={hasUnsavedChanges}
            maintenanceServerTime={maintenanceServerTime}
            scheduledAt={scheduledAt}
            startsAtLabel={MAINTENANCE_TEXT.startsAtLabel}
            messageLabel={MAINTENANCE_TEXT.messageLabel}
            refreshLabel={MAINTENANCE_TEXT.refreshBtn}
            discardLabel={MAINTENANCE_TEXT.discardBtn}
            saveLabel={MAINTENANCE_TEXT.saveBtn}
            savingLabel={MAINTENANCE_TEXT.savingBtn}
            activateNowLabel={MAINTENANCE_TEXT.activateNow}
            deactivateLabel={MAINTENANCE_TEXT.deactivate}
            onChange={setForm}
            onSave={() => void persistMaintenanceSettings(form, "save")}
            onRefresh={() => void fetchMaintenanceSettings()}
            onDiscard={discardLocalChanges}
            onActivateNow={activateNow}
            onDeactivateNow={deactivateNow}
          />
          <MaintenanceFeedback error={asyncState.error} success={success} />
        </div>
      )}
    </div>
  );
}

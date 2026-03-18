"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchAdminHeaderSettings,
  resetAdminHeaderSettings,
  saveAdminHeaderSettings,
} from "@/lib/admin/header-admin";
import { useAdminAsyncController } from "@/hooks/admin/use-admin-async-controller";
import { useAdminAuth } from "@/store/admin/use-admin-auth";
import {
  DEFAULT_HEADER_BRANDING,
  DEFAULT_HEADER_NAV_LINKS,
  normalizeHeaderBranding,
  type HeaderBranding,
  type HeaderNavLink,
} from "@/lib/header/header-branding";
import { broadcastRuntimeNetworkChange } from "@/lib/solana/solana-network";
import { useFeedbackToast } from "@/hooks/use-feedback-toast";
import AdminHeaderView from "@/components/admin/header/AdminHeaderView";

interface HeaderSettingsResponse {
  logoUrl: string;
  projectName: string;
  description: string;
  network: "devnet" | "mainnet";
  connectEnabled: boolean;
  navLinks: HeaderNavLink[];
  updatedAt: string;
}

interface HeaderNavLinkForm extends HeaderNavLink {
  id: string;
}

export interface HeaderFormState {
  logoUrl: string;
  projectName: string;
  description: string;
  network: "devnet" | "mainnet";
  connectEnabled: boolean;
  navLinks: HeaderNavLinkForm[];
}

const DEFAULT_FORM: HeaderFormState = {
  logoUrl: DEFAULT_HEADER_BRANDING.logoUrl,
  projectName: DEFAULT_HEADER_BRANDING.projectName,
  description: DEFAULT_HEADER_BRANDING.description,
  network: DEFAULT_HEADER_BRANDING.network,
  connectEnabled: DEFAULT_HEADER_BRANDING.connectEnabled,
  navLinks: DEFAULT_HEADER_NAV_LINKS.map((link, index) => ({
    id: `default-link-${index}`,
    ...link,
  })),
};

const createLinkId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const serializeNavLinks = (links: HeaderNavLinkForm[]): HeaderNavLink[] =>
  links.map((link) => ({
    name: link.name.trim(),
    href: link.href.trim(),
  }));

const isSameForm = (a: HeaderFormState, b: HeaderFormState) => {
  if (
    a.logoUrl !== b.logoUrl ||
    a.projectName !== b.projectName ||
    a.description !== b.description ||
    a.network !== b.network ||
    a.connectEnabled !== b.connectEnabled
  ) {
    return false;
  }

  const linksA = serializeNavLinks(a.navLinks);
  const linksB = serializeNavLinks(b.navLinks);
  if (linksA.length !== linksB.length) return false;

  for (let i = 0; i < linksA.length; i += 1) {
    if (linksA[i].name !== linksB[i].name || linksA[i].href !== linksB[i].href) {
      return false;
    }
  }

  return true;
};

export default function AdminHeaderPage() {
  const { token } = useAdminAuth();
  const asyncState = useAdminAsyncController(true);
  const {
    runLoad: runHeaderLoad,
    runAction: runHeaderAction,
    isActing: isHeaderActing,
  } = asyncState;
  const [form, setForm] = useState<HeaderFormState>(DEFAULT_FORM);
  const [syncedForm, setSyncedForm] = useState<HeaderFormState>(DEFAULT_FORM);
  const [manualError, setManualError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewLogoErrored, setPreviewLogoErrored] = useState(false);
  const error = manualError ?? asyncState.error;

  useFeedbackToast({
    scope: "admin-header",
    error,
    success,
    errorTitle: "Header Settings Error",
    successTitle: "Header Settings",
  });

  const hasChanges = useMemo(() => !isSameForm(form, syncedForm), [form, syncedForm]);

  const applyServerState = useCallback((data: HeaderSettingsResponse) => {
    const normalizedBranding: HeaderBranding = normalizeHeaderBranding(data);
    const normalized: HeaderFormState = {
      logoUrl: normalizedBranding.logoUrl,
      projectName: normalizedBranding.projectName,
      description: normalizedBranding.description,
      network: normalizedBranding.network,
      connectEnabled: normalizedBranding.connectEnabled,
      navLinks: normalizedBranding.navLinks.map((link) => ({
        id: createLinkId(),
        ...link,
      })),
    };
    setForm(normalized);
    setSyncedForm(normalized);
    setPreviewLogoErrored(false);
  }, []);

  const loadHeaderSettings = useCallback(async () => {
    setManualError(null);
    await runHeaderLoad(
      () =>
        fetchAdminHeaderSettings<HeaderSettingsResponse>({
          token,
        }),
      {
        fallbackMessage: "Failed to load header settings",
        onSuccess: (data) => {
          applyServerState(data);
        },
      },
    );
  }, [applyServerState, runHeaderLoad, token]);

  useEffect(() => {
    const runInitialLoad = async () => {
      await loadHeaderSettings();
    };

    void runInitialLoad();
  }, [loadHeaderSettings]);

  const validateForm = (): string | null => {
    if (form.navLinks.length > 10) {
      return "Maximum 10 navigation links are allowed.";
    }

    for (const link of form.navLinks) {
      const name = link.name.trim();
      const href = link.href.trim();

      if (!name) {
        return "Navigation link name cannot be empty.";
      }
      if (!href) {
        return "Navigation link href cannot be empty.";
      }
      if (!href.startsWith("/") || href.startsWith("//")) {
        return "Navigation link href must be an internal path starting with '/'.";
      }
    }

    if (form.logoUrl.trim() && !form.logoUrl.trim().startsWith("/")) {
      return "Logo path must start with '/'.";
    }

    return null;
  };

  const saveHeaderSettings = async () => {
    if (isHeaderActing) return;

    const validationError = validateForm();
    if (validationError) {
      setManualError(validationError);
      return;
    }

    setManualError(null);
    setSuccess(null);

    await runHeaderAction(
      () =>
        saveAdminHeaderSettings<HeaderSettingsResponse>({
          token,
          payload: JSON.stringify({
            logoUrl: form.logoUrl.trim(),
            projectName: form.projectName.trim(),
            description: form.description.trim(),
            network: form.network,
            connectEnabled: form.connectEnabled,
            navLinks: serializeNavLinks(form.navLinks),
          }),
        }),
      {
        fallbackMessage: "Failed to save header settings",
        onSuccess: (data) => {
          applyServerState(data);
          broadcastRuntimeNetworkChange(
            data.network === "mainnet" ? "mainnet" : "devnet",
          );
          setSuccess("Header settings updated successfully.");
        },
      },
    );
  };

  const resetHeaderSettings = async () => {
    if (isHeaderActing) return;

    setManualError(null);
    setSuccess(null);

    await runHeaderAction(
      () =>
        resetAdminHeaderSettings<HeaderSettingsResponse>({
          token,
        }),
      {
        fallbackMessage: "Failed to reset header settings",
        onSuccess: (data) => {
          applyServerState(data);
          broadcastRuntimeNetworkChange(
            data.network === "mainnet" ? "mainnet" : "devnet",
          );
          setSuccess("Header settings reset to defaults.");
        },
      },
    );
  };

  const addNavLink = () => {
    setForm((prev) => {
      if (prev.navLinks.length >= 10) return prev;
      return {
        ...prev,
        navLinks: [...prev.navLinks, { id: createLinkId(), name: "New Link", href: "/" }],
      };
    });
  };

  const updateNavLink = (id: string, key: "name" | "href", value: string) => {
    setForm((prev) => ({
      ...prev,
      navLinks: prev.navLinks.map((link) => (link.id === id ? { ...link, [key]: value } : link)),
    }));
  };

  const removeNavLink = (id: string) => {
    setForm((prev) => ({
      ...prev,
      navLinks: prev.navLinks.filter((link) => link.id !== id),
    }));
  };

  const previewLogoSrc =
    !previewLogoErrored && form.logoUrl.trim().startsWith("/")
      ? form.logoUrl.trim()
      : DEFAULT_FORM.logoUrl;

  const networkTextTone =
    form.network === "mainnet" ? "text-emerald-400" : "text-sky-400";

  return (
    <AdminHeaderView
      error={error}
      success={success}
      isLoading={asyncState.isLoading}
      isSaving={asyncState.isActing}
      form={form}
      hasChanges={hasChanges}
      previewLogoSrc={previewLogoSrc}
      networkTextTone={networkTextTone}
      defaultProjectName={DEFAULT_FORM.projectName}
      defaultDescription={DEFAULT_FORM.description}
      loadHeaderSettings={loadHeaderSettings}
      setPreviewLogoErrored={setPreviewLogoErrored}
      setForm={setForm}
      addNavLink={addNavLink}
      updateNavLink={updateNavLink}
      removeNavLink={removeNavLink}
      resetHeaderSettings={resetHeaderSettings}
      saveHeaderSettings={saveHeaderSettings}
    />
  );
}

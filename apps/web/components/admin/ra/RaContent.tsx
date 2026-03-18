"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchAdminRaHeaderNetwork,
  fetchAdminRaSettings,
  migrateAdminRaRuntime,
  updateAdminRaSettings,
  uploadAdminRaLogo,
} from "@/lib/admin/ra-admin";
import { useAdminAuth } from "@/store/admin/use-admin-auth";
import { useFeedbackToast } from "@/hooks/use-feedback-toast";
import { useAdminAsyncController } from "@/hooks/admin/use-admin-async-controller";
import { Loader2 } from "lucide-react";
import { RaConvertSection } from "@/components/admin/ra/RaConvertSection";
import { RaNetworkSection } from "@/components/admin/ra/RaNetworkSection";
import { RaOverviewSection } from "@/components/admin/ra/RaOverviewSection";
import { RaPolicySection } from "@/components/admin/ra/RaPolicySection";
import { broadcastRaRuntimeSettingsChange } from "@/lib/ra/ra-runtime";

type OracleProvider = "DEXSCREENER" | "RAYDIUM";
type HeaderNetwork = "devnet" | "mainnet";
type ConvertProvider = "RAYDIUM" | "JUPITER";
type ConvertExecutionMode = "AUTO" | "SINGLE_TX_ONLY" | "ALLOW_MULTI_TX";
type ConvertRoutePolicy = "TOKEN_TO_SOL_TO_RA";

interface RaSettingsResponse {
  logoUrl: string;
  tokenSymbol: string;
  tokenName: string;
  mintDevnet: string;
  mintMainnet: string;
  treasuryDevnet: string;
  treasuryMainnet: string;
  oraclePrimary: OracleProvider;
  oracleSecondary: OracleProvider | null;
  stakeFeeBps: number;
  claimFeeBps: number;
  stakeMinUsd: number;
  stakeMaxUsd: number;
  convertMinUsd: number;
  convertMaxUsd: number;
  convertEnabled: boolean;
  convertProvider: ConvertProvider;
  convertExecutionMode: ConvertExecutionMode;
  convertRoutePolicy: ConvertRoutePolicy;
  convertSlippageBps: number;
  convertMaxTokensPerSession: number;
  convertPoolIdDevnet: string;
  convertPoolIdMainnet: string;
  convertQuoteMintDevnet: string;
  convertQuoteMintMainnet: string;
  updatedAt: string;
}

type RaSettingsForm = Omit<RaSettingsResponse, "updatedAt">;

interface HeaderSettingsResponse {
  network: HeaderNetwork;
}

interface RaMigrationResponse {
  updatedStakeRows: number;
  updatedActivityRows: number;
  modelVersion: number;
  migratedAt: string;
}

interface UploadImageResponse {
  url: string;
}

const BASE58_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const ORACLE_OPTIONS: OracleProvider[] = ["DEXSCREENER", "RAYDIUM"];
const CONVERT_PROVIDER_OPTIONS: ConvertProvider[] = ["RAYDIUM", "JUPITER"];
const CONVERT_EXECUTION_OPTIONS: ConvertExecutionMode[] = [
  "AUTO",
  "SINGLE_TX_ONLY",
  "ALLOW_MULTI_TX",
];

const toRaSettingsForm = ({
  updatedAt: _updatedAt,
  ...form
}: RaSettingsResponse): RaSettingsForm => form;

const isRaSame = (a: RaSettingsForm, b: RaSettingsForm) =>
  a.tokenSymbol === b.tokenSymbol &&
  a.tokenName === b.tokenName &&
  a.mintDevnet === b.mintDevnet &&
  a.mintMainnet === b.mintMainnet &&
  a.treasuryDevnet === b.treasuryDevnet &&
  a.treasuryMainnet === b.treasuryMainnet &&
  a.oraclePrimary === b.oraclePrimary &&
  a.oracleSecondary === b.oracleSecondary &&
  a.stakeFeeBps === b.stakeFeeBps &&
  a.claimFeeBps === b.claimFeeBps &&
  a.stakeMinUsd === b.stakeMinUsd &&
  a.stakeMaxUsd === b.stakeMaxUsd &&
  a.convertMinUsd === b.convertMinUsd &&
  a.convertMaxUsd === b.convertMaxUsd &&
  a.convertEnabled === b.convertEnabled &&
  a.convertProvider === b.convertProvider &&
  a.convertExecutionMode === b.convertExecutionMode &&
  a.convertRoutePolicy === b.convertRoutePolicy &&
  a.convertSlippageBps === b.convertSlippageBps &&
  a.convertMaxTokensPerSession === b.convertMaxTokensPerSession &&
  a.convertPoolIdDevnet === b.convertPoolIdDevnet &&
  a.convertPoolIdMainnet === b.convertPoolIdMainnet &&
  a.convertQuoteMintDevnet === b.convertQuoteMintDevnet &&
  a.convertQuoteMintMainnet === b.convertQuoteMintMainnet &&
  a.logoUrl === b.logoUrl;

export function RaContent() {
  const { token } = useAdminAuth();
  const loadAsync = useAdminAsyncController(true);
  const saveAsync = useAdminAsyncController(false);
  const uploadAsync = useAdminAsyncController(false);
  const migrateAsync = useAdminAsyncController(false);
  const { runLoad: runRaLoad } = loadAsync;

  const [form, setForm] = useState<RaSettingsForm | null>(null);
  const [synced, setSynced] = useState<RaSettingsForm | null>(null);
  const [headerNetwork, setHeaderNetwork] = useState<HeaderNetwork>("devnet");
  const [success, setSuccess] = useState<string | null>(null);
  const error =
    loadAsync.error ??
    saveAsync.error ??
    uploadAsync.error ??
    migrateAsync.error;

  useFeedbackToast({
    scope: "admin-ra",
    error,
    success,
    errorTitle: "RA Runtime Error",
    successTitle: "RA Runtime",
    errorDedupeMs: 10_000,
  });

  const hasChanges = useMemo(() => {
    if (!form || !synced) return false;
    return !isRaSame(form, synced);
  }, [form, synced]);

  const activeMint = useMemo(() => {
    if (!form) return "-";
    return headerNetwork === "mainnet" ? form.mintMainnet : form.mintDevnet;
  }, [form, headerNetwork]);

  const activeTreasury = useMemo(() => {
    if (!form) return "-";
    return headerNetwork === "mainnet"
      ? form.treasuryMainnet
      : form.treasuryDevnet;
  }, [form, headerNetwork]);

  const validateForm = (current: RaSettingsForm): string | null => {
    if (!current.logoUrl.trim().startsWith("/")) {
      return "RA logo must be a local uploaded asset path.";
    }
    if (!/^[A-Z0-9]{1,12}$/.test(current.tokenSymbol.trim().toUpperCase())) {
      return "RA token symbol must be 1-12 uppercase letters or numbers.";
    }
    if (current.tokenName.trim().length < 2 || current.tokenName.trim().length > 40) {
      return "RA token name must be between 2 and 40 characters.";
    }
    if (!BASE58_PATTERN.test(current.mintDevnet.trim())) {
      return "Devnet RA mint is invalid.";
    }
    if (!BASE58_PATTERN.test(current.mintMainnet.trim())) {
      return "Mainnet RA mint is invalid.";
    }
    if (!BASE58_PATTERN.test(current.treasuryDevnet.trim())) {
      return "Devnet treasury address is invalid.";
    }
    if (!BASE58_PATTERN.test(current.treasuryMainnet.trim())) {
      return "Mainnet treasury address is invalid.";
    }

    const bpsFields = [current.stakeFeeBps, current.claimFeeBps];
    if (bpsFields.some((value) => !Number.isFinite(value) || value < 0 || value > 10_000)) {
      return "Fee bps values must be between 0 and 10000.";
    }

    if (current.stakeMinUsd < 0 || current.stakeMaxUsd < current.stakeMinUsd) {
      return "Stake USD rules are invalid.";
    }
    if (
      current.convertMinUsd < 0 ||
      current.convertMaxUsd < current.convertMinUsd
    ) {
      return "Convert USD rules are invalid.";
    }

    if (!BASE58_PATTERN.test(current.convertPoolIdDevnet.trim())) {
      return "Devnet convert pool id is invalid.";
    }
    if (!BASE58_PATTERN.test(current.convertPoolIdMainnet.trim())) {
      return "Mainnet convert pool id is invalid.";
    }
    if (!BASE58_PATTERN.test(current.convertQuoteMintDevnet.trim())) {
      return "Devnet convert quote mint is invalid.";
    }
    if (!BASE58_PATTERN.test(current.convertQuoteMintMainnet.trim())) {
      return "Mainnet convert quote mint is invalid.";
    }
    if (
      !Number.isFinite(current.convertSlippageBps) ||
      current.convertSlippageBps < 0 ||
      current.convertSlippageBps > 10_000
    ) {
      return "Convert slippage bps must be between 0 and 10000.";
    }
    if (
      !Number.isFinite(current.convertMaxTokensPerSession) ||
      current.convertMaxTokensPerSession < 1 ||
      current.convertMaxTokensPerSession > 5
    ) {
      return "Convert max tokens per session must be between 1 and 5.";
    }

    return null;
  };

  const loadSettings = useCallback(async () => {
    await runRaLoad(
      async () =>
        Promise.all([
          fetchAdminRaSettings<RaSettingsResponse>({ token }),
          fetchAdminRaHeaderNetwork<HeaderSettingsResponse>({ token }),
        ]),
      {
        fallbackMessage: "Failed to load RA runtime settings.",
        onSuccess: ([raData, headerData]) => {
          const nextForm = toRaSettingsForm(raData);
          setForm(nextForm);
          setSynced(nextForm);
          setHeaderNetwork(
            headerData.network === "mainnet" ? "mainnet" : "devnet",
          );
        },
      },
    );
  }, [runRaLoad, token]);

  useEffect(() => {
    void (async () => {
      await loadSettings();
    })();
  }, [loadSettings]);

  const patchForm = <K extends keyof RaSettingsForm>(
    key: K,
    value: RaSettingsForm[K],
  ) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const saveSettings = async () => {
    if (!form || saveAsync.isActing) return;
    const validationError = validateForm(form);
    if (validationError) {
      saveAsync.setError(validationError);
      return;
    }

    setSuccess(null);
    await saveAsync.runAction(
      async () =>
        updateAdminRaSettings<RaSettingsResponse, RaSettingsForm>({
          token,
          payload: form,
        }),
      {
        fallbackMessage: "Failed to save RA settings.",
        onSuccess: (saved) => {
          const nextForm = toRaSettingsForm(saved);
          setForm(nextForm);
          setSynced(nextForm);
          broadcastRaRuntimeSettingsChange(saved);
          setSuccess("RA runtime settings updated.");
        },
      },
    );
  };

  const uploadLogo = async (file: File) => {
    if (uploadAsync.isActing) return;
    setSuccess(null);

    await uploadAsync.runAction(
      async () =>
        uploadAdminRaLogo<UploadImageResponse>({
          token,
          file,
        }),
      {
        fallbackMessage: "Failed to upload RA logo.",
        onSuccess: (response) => {
          setForm((prev) => (prev ? { ...prev, logoUrl: response.url } : prev));
          setSuccess("RA logo uploaded. Save to publish it platform-wide.");
        },
      },
    );
  };

  const migrateModel = async () => {
    if (migrateAsync.isActing) return;
    setSuccess(null);

    await migrateAsync.runAction(
      async () =>
        migrateAdminRaRuntime<RaMigrationResponse>({
          token,
        }),
      {
        fallbackMessage: "RA migration failed.",
        onSuccess: (result) => {
          setSuccess(
            `Migration completed. Stakes updated: ${result.updatedStakeRows}, activities updated: ${result.updatedActivityRows}.`,
          );
        },
      },
    );
  };

  if (loadAsync.isLoading || !form) {
    return (
      <div className="bg-[#111111] border border-neutral-800 rounded-xl p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 sm:p-5 space-y-4">
      <RaOverviewSection
        headerNetwork={headerNetwork}
        tokenSymbol={form.tokenSymbol}
        tokenName={form.tokenName}
        activeMint={activeMint}
        activeTreasury={activeTreasury}
        isLoading={loadAsync.isLoading}
        isSaving={saveAsync.isActing}
        isMigrating={migrateAsync.isActing}
        hasChanges={hasChanges}
        onRefresh={() => void loadSettings()}
        onSave={saveSettings}
        onMigrate={() => void migrateModel()}
      />

      {(error || success) && (
        <div className="rounded-xl border border-neutral-800 bg-[#0a0a0a] p-3">
          {error ? (
            <p className="text-xs text-red-300">{error}</p>
          ) : (
            <p className="text-xs text-emerald-300">{success}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
        <RaNetworkSection
          logoUrl={form.logoUrl}
          tokenSymbol={form.tokenSymbol}
          tokenName={form.tokenName}
          mintDevnet={form.mintDevnet}
          mintMainnet={form.mintMainnet}
          treasuryDevnet={form.treasuryDevnet}
          treasuryMainnet={form.treasuryMainnet}
          isUploadingLogo={uploadAsync.isActing}
          onLogoUpload={(file) => void uploadLogo(file)}
          onTokenSymbolChange={(value) => patchForm("tokenSymbol", value.toUpperCase())}
          onTokenNameChange={(value) => patchForm("tokenName", value)}
          onMintDevnetChange={(value) => patchForm("mintDevnet", value)}
          onMintMainnetChange={(value) => patchForm("mintMainnet", value)}
          onTreasuryDevnetChange={(value) => patchForm("treasuryDevnet", value)}
          onTreasuryMainnetChange={(value) => patchForm("treasuryMainnet", value)}
        />

        <RaPolicySection
          oraclePrimary={form.oraclePrimary}
          oracleSecondary={form.oracleSecondary}
          stakeFeeBps={form.stakeFeeBps}
          claimFeeBps={form.claimFeeBps}
          stakeMinUsd={form.stakeMinUsd}
          stakeMaxUsd={form.stakeMaxUsd}
          convertMinUsd={form.convertMinUsd}
          convertMaxUsd={form.convertMaxUsd}
          oracleOptions={ORACLE_OPTIONS}
          onOraclePrimaryChange={(value) => patchForm("oraclePrimary", value)}
          onOracleSecondaryChange={(value) => patchForm("oracleSecondary", value)}
          onStakeFeeBpsChange={(value) => patchForm("stakeFeeBps", value)}
          onClaimFeeBpsChange={(value) => patchForm("claimFeeBps", value)}
          onStakeMinUsdChange={(value) => patchForm("stakeMinUsd", value)}
          onStakeMaxUsdChange={(value) => patchForm("stakeMaxUsd", value)}
          onConvertMinUsdChange={(value) => patchForm("convertMinUsd", value)}
          onConvertMaxUsdChange={(value) => patchForm("convertMaxUsd", value)}
        />
      </div>

      <RaConvertSection
        convertEnabled={form.convertEnabled}
        convertProvider={form.convertProvider}
        convertExecutionMode={form.convertExecutionMode}
        convertRoutePolicy={form.convertRoutePolicy}
        convertSlippageBps={form.convertSlippageBps}
        convertMaxTokensPerSession={form.convertMaxTokensPerSession}
        convertPoolIdDevnet={form.convertPoolIdDevnet}
        convertPoolIdMainnet={form.convertPoolIdMainnet}
        convertQuoteMintDevnet={form.convertQuoteMintDevnet}
        convertQuoteMintMainnet={form.convertQuoteMintMainnet}
        providerOptions={CONVERT_PROVIDER_OPTIONS}
        executionOptions={CONVERT_EXECUTION_OPTIONS}
        onConvertEnabledChange={(value) => patchForm("convertEnabled", value)}
        onConvertProviderChange={(value) => patchForm("convertProvider", value)}
        onConvertExecutionModeChange={(value) => patchForm("convertExecutionMode", value)}
        onConvertRoutePolicyChange={(value) => patchForm("convertRoutePolicy", value)}
        onConvertSlippageBpsChange={(value) => patchForm("convertSlippageBps", value)}
        onConvertMaxTokensPerSessionChange={(value) => patchForm("convertMaxTokensPerSession", value)}
        onConvertPoolIdDevnetChange={(value) => patchForm("convertPoolIdDevnet", value)}
        onConvertPoolIdMainnetChange={(value) => patchForm("convertPoolIdMainnet", value)}
        onConvertQuoteMintDevnetChange={(value) => patchForm("convertQuoteMintDevnet", value)}
        onConvertQuoteMintMainnetChange={(value) => patchForm("convertQuoteMintMainnet", value)}
      />
    </div>
  );
}

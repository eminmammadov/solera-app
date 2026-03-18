"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminAsyncController } from "@/hooks/admin/use-admin-async-controller";
import { fetchAdminStakingTokenConfigs } from "@/lib/admin/staking-admin";
import {
  createAdminMarketToken,
  deleteAdminMarketToken,
  fetchAdminMarketLivePricingRuntime,
  fetchAdminMarketTokens,
  syncAdminMarketLivePrices,
  updateAdminMarketLivePricingRuntime,
  updateAdminMarketToken,
} from "@/lib/admin/market-admin";
import { fetchAdminPortfolioEligibility } from "@/lib/admin/users-admin";
import { useAdminAuth } from "@/store/admin/use-admin-auth";
import { notifyError, notifySuccess, notifyWarning } from "@/lib/ui/ui-feedback";
import { TokensPortfolioDebugSection } from "@/components/admin/tokens/TokensPortfolioDebugSection";
import { TokensRuntimeSection } from "@/components/admin/tokens/TokensRuntimeSection";
import { TokensTable } from "@/components/admin/tokens/TokensTable";
import { TokensToolbar } from "@/components/admin/tokens/TokensToolbar";
import type { TokenStakeConfigProjection } from "@/components/admin/staking/types";
import {
  DEFAULT_LIVE_RUNTIME,
  NATIVE_SOL_TICKER,
  type AdminPortfolioEligibilityResponse,
  type MarketLivePricingRuntime,
  type MarketToken,
  type TokenFormProps,
} from "@/components/admin/tokens/types";

export function TokensContent() {
  const { token, admin } = useAdminAuth();
  const tokensLoadAsync = useAdminAsyncController(true);
  const runtimeLoadAsync = useAdminAsyncController(true);
  const runtimeSaveAsync = useAdminAsyncController(false);
  const priceSyncAsync = useAdminAsyncController(false);
  const stakingLoadAsync = useAdminAsyncController(true);
  const portfolioAsync = useAdminAsyncController(false);
  const { runLoad: runTokensLoad } = tokensLoadAsync;
  const { runLoad: runRuntimeLoad } = runtimeLoadAsync;
  const { runLoad: runStakingLoad } = stakingLoadAsync;
  const [tokens, setTokens] = useState<MarketToken[]>([]);
  const [search, setSearch] = useState("");
  const [runtime, setRuntime] = useState<MarketLivePricingRuntime>(DEFAULT_LIVE_RUNTIME);
  const [runtimeDraft, setRuntimeDraft] = useState({
    livePriceEnabled: DEFAULT_LIVE_RUNTIME.livePriceEnabled,
    cacheTtlMs: DEFAULT_LIVE_RUNTIME.cacheTtlMs,
    requestTimeoutMs: DEFAULT_LIVE_RUNTIME.requestTimeoutMs,
    maxParallelRequests: DEFAULT_LIVE_RUNTIME.maxParallelRequests,
  });
  const [stakingProjectionByTokenId, setStakingProjectionByTokenId] = useState<Record<string, TokenStakeConfigProjection>>({});
  const [portfolioDebugWallet, setPortfolioDebugWallet] = useState("");
  const [portfolioDebugError, setPortfolioDebugError] = useState<string | null>(null);
  const [portfolioDebug, setPortfolioDebug] = useState<AdminPortfolioEligibilityResponse | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [formTicker, setFormTicker] = useState("");
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Meme tokens");
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formChg24h, setFormChg24h] = useState<number>(0);
  const [formStake7d, setFormStake7d] = useState<number>(0);
  const [formStake1m, setFormStake1m] = useState<number>(0);
  const [formStake3m, setFormStake3m] = useState<number>(0);
  const [formStake6m, setFormStake6m] = useState<number>(0);
  const [formStake12m, setFormStake12m] = useState<number>(0);
  const [formIcon, setFormIcon] = useState("");
  const [formIsImage, setFormIsImage] = useState(false);
  const [formMintAddress, setFormMintAddress] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formStakeEnabled, setFormStakeEnabled] = useState(true);
  const [formConvertEnabled, setFormConvertEnabled] = useState(true);
  const [formPortfolioVisible, setFormPortfolioVisible] = useState(true);

  const fetchTokens = useCallback(async () => {
    await runTokensLoad(
      async () =>
        fetchAdminMarketTokens<MarketToken[]>({
          token,
        }),
      {
        fallbackMessage: "Failed to load market tokens",
        onSuccess: setTokens,
        onError: (message) => {
          notifyError({
            title: "Load Error",
            description: message,
            dedupeKey: "admin:tokens:load-failed",
          });
        },
        captureError: false,
      },
    );
  }, [runTokensLoad, token]);

  const applyRuntime = useCallback((payload: MarketLivePricingRuntime) => {
    setRuntime(payload);
    setRuntimeDraft({
      livePriceEnabled: payload.livePriceEnabled,
      cacheTtlMs: payload.cacheTtlMs,
      requestTimeoutMs: payload.requestTimeoutMs,
      maxParallelRequests: payload.maxParallelRequests,
    });
  }, []);

  const fetchRuntime = useCallback(async () => {
    await runRuntimeLoad(
      async () =>
        fetchAdminMarketLivePricingRuntime<MarketLivePricingRuntime>({
          token,
        }),
      {
        fallbackMessage: "Failed to load live pricing settings",
        onSuccess: applyRuntime,
        onError: (message) => {
          notifyWarning({
            title: "Live Pricing Settings",
            description: message,
            dedupeKey: "admin:tokens:runtime-load-warning",
          });
        },
        captureError: false,
      },
    );
  }, [applyRuntime, runRuntimeLoad, token]);

  const fetchStakingProjection = useCallback(async () => {
    await runStakingLoad(
      async () =>
        fetchAdminStakingTokenConfigs({
          token,
        }),
      {
        fallbackMessage: "Failed to load staking projections",
        onSuccess: (configPayload) => {
          setStakingProjectionByTokenId(
            Object.fromEntries(configPayload.map((item) => [item.tokenId, item])),
          );
        },
        onError: (message) => {
          notifyWarning({
            title: "Staking Projection",
            description: message,
            dedupeKey: "admin:tokens:staking-projection-warning",
          });
        },
        captureError: false,
      },
    );
  }, [runStakingLoad, token]);

  useEffect(() => {
    void (async () => {
      await Promise.all([fetchTokens(), fetchRuntime(), fetchStakingProjection()]);
    })();
  }, [fetchRuntime, fetchStakingProjection, fetchTokens]);

  const runtimeDirty = useMemo(
    () =>
      runtimeDraft.livePriceEnabled !== runtime.livePriceEnabled ||
      runtimeDraft.cacheTtlMs !== runtime.cacheTtlMs ||
      runtimeDraft.requestTimeoutMs !== runtime.requestTimeoutMs ||
      runtimeDraft.maxParallelRequests !== runtime.maxParallelRequests,
    [runtime, runtimeDraft],
  );

  const saveLivePricingRuntime = async () => {
    if (runtimeSaveAsync.isActing) return;

    await runtimeSaveAsync.runAction(
      async () =>
        updateAdminMarketLivePricingRuntime<
          MarketLivePricingRuntime,
          {
            livePriceEnabled: boolean;
            cacheTtlMs: number;
            requestTimeoutMs: number;
            maxParallelRequests: number;
          }
        >({
          token,
          payload: {
            livePriceEnabled: runtimeDraft.livePriceEnabled,
            cacheTtlMs: Math.max(5000, Math.min(300000, Number(runtimeDraft.cacheTtlMs) || 60000)),
            requestTimeoutMs: Math.max(1000, Math.min(15000, Number(runtimeDraft.requestTimeoutMs) || 4500)),
            maxParallelRequests: Math.max(1, Math.min(10, Number(runtimeDraft.maxParallelRequests) || 4)),
          },
        }),
      {
        fallbackMessage: "Failed to save live pricing settings",
        onSuccess: async (payload) => {
          applyRuntime(payload);
          notifySuccess({
            title: "Saved",
            description: "Live pricing runtime updated",
            dedupeKey: "admin:tokens:runtime-saved",
            dedupeMs: 2_500,
          });
          await fetchTokens();
        },
        onError: (message) => {
          notifyError({
            title: "Save Error",
            description: message,
            dedupeKey: "admin:tokens:runtime-save-failed",
          });
        },
        captureError: false,
      },
    );
  };

  const syncLivePricesNow = async () => {
    if (priceSyncAsync.isActing) return;

    await priceSyncAsync.runAction(
      async () =>
        syncAdminMarketLivePrices<MarketLivePricingRuntime>({
          token,
        }),
      {
        fallbackMessage: "Failed to sync prices",
        onSuccess: async (payload) => {
          applyRuntime(payload);
          await fetchTokens();
          notifySuccess({
            title: "Synced",
            description: "Live market prices refreshed",
            dedupeKey: "admin:tokens:sync-success",
            dedupeMs: 2_500,
          });
        },
        onError: (message) => {
          notifyError({
            title: "Sync Error",
            description: message,
            dedupeKey: "admin:tokens:sync-failed",
          });
        },
        captureError: false,
      },
    );
  };

  const runPortfolioEligibilityCheck = async () => {
    const walletAddress = (portfolioDebugWallet || admin?.walletAddress || "").trim();
    if (!walletAddress) {
      setPortfolioDebugError("Wallet address is required for eligibility check.");
      setPortfolioDebug(null);
      return;
    }

    setPortfolioDebugError(null);
    await portfolioAsync.runAction(
      async () =>
        fetchAdminPortfolioEligibility<AdminPortfolioEligibilityResponse>({
          token,
          walletAddress,
        }),
      {
        fallbackMessage: "Failed to load portfolio eligibility diagnostics",
        onSuccess: (payload) => {
          setPortfolioDebug(payload);
        },
        onError: (message) => {
          setPortfolioDebugError(message);
          setPortfolioDebug(null);
          notifyError({
            title: "Portfolio Diagnostics",
            description: message,
            dedupeKey: "admin:tokens:portfolio-diagnostics-failed",
          });
        },
        captureError: false,
      },
    );
  };

  const handleEdit = (currentToken: MarketToken) => {
    setEditingId(currentToken.id);
    setIsNew(false);
    setFormTicker(currentToken.ticker);
    setFormName(currentToken.name);
    setFormCategory(currentToken.category);
    setFormPrice(currentToken.price);
    setFormChg24h(currentToken.chg24h);
    setFormStake7d(currentToken.stake7d);
    setFormStake1m(currentToken.stake1m);
    setFormStake3m(currentToken.stake3m);
    setFormStake6m(currentToken.stake6m);
    setFormStake12m(currentToken.stake12m);
    setFormIcon(currentToken.icon);
    setFormIsImage(currentToken.isImage);
    setFormMintAddress(currentToken.ticker.trim().toUpperCase() === NATIVE_SOL_TICKER ? "" : (currentToken.mintAddress || ""));
    setFormIsActive(currentToken.isActive);
    setFormStakeEnabled(currentToken.stakeEnabled);
    setFormConvertEnabled(currentToken.convertEnabled);
    setFormPortfolioVisible(currentToken.portfolioVisible);
  };

  const handleAddNew = () => {
    setEditingId("new");
    setIsNew(true);
    setFormTicker("");
    setFormName("");
    setFormCategory("Meme tokens");
    setFormPrice(0);
    setFormChg24h(0);
    setFormStake7d(0);
    setFormStake1m(0);
    setFormStake3m(0);
    setFormStake6m(0);
    setFormStake12m(0);
    setFormIcon("");
    setFormIsImage(true);
    setFormMintAddress("");
    setFormIsActive(true);
    setFormStakeEnabled(true);
    setFormConvertEnabled(true);
    setFormPortfolioVisible(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsNew(false);
  };

  const handleSave = async () => {
    const isNativeSol = formTicker.trim().toUpperCase() === NATIVE_SOL_TICKER;
    const payload = {
      ticker: formTicker,
      name: formName,
      category: formCategory,
      price: Number(formPrice),
      chg24h: Number(formChg24h),
      stake7d: Number(formStake7d),
      stake1m: Number(formStake1m),
      stake3m: Number(formStake3m),
      stake6m: Number(formStake6m),
      stake12m: Number(formStake12m),
      icon: formIcon,
      isImage: formIsImage,
      mintAddress: isNativeSol || formMintAddress.trim() === "" ? null : formMintAddress.trim(),
      isActive: formIsActive,
      stakeEnabled: formStakeEnabled,
      convertEnabled: formConvertEnabled,
      portfolioVisible: formPortfolioVisible,
    };

    try {
      if (isNew) {
        await createAdminMarketToken<MarketToken, typeof payload>({
          token,
          payload,
        });
      } else {
        await updateAdminMarketToken<MarketToken, typeof payload>({
          token,
          id: editingId ?? "",
          payload,
        });
      }

      notifySuccess({
        title: "Saved",
        description: "Successfully saved market token",
        dedupeKey: "admin:tokens:token-saved",
        dedupeMs: 2_500,
      });
      handleCancel();
      await Promise.all([fetchTokens(), fetchStakingProjection()]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save token";
      notifyError({
        title: "Save Error",
        description: message,
        dedupeKey: "admin:tokens:token-save-failed",
      });
    }
  };

  const handleDelete = async (id: string, ticker: string) => {
    if (!confirm(`Are you sure you want to delete ${ticker}?`)) return;

    try {
      await deleteAdminMarketToken<MarketToken>({
        token,
        id,
      });

      notifySuccess({
        title: "Deleted",
        description: `Deleted ${ticker}`,
        dedupeKey: `admin:tokens:token-deleted:${id}`,
        dedupeMs: 2_000,
      });
      await Promise.all([fetchTokens(), fetchStakingProjection()]);
    } catch (error) {
      notifyError({
        title: "Error",
        error,
        fallbackMessage: "Could not delete token",
        dedupeKey: `admin:tokens:token-delete-failed:${id}`,
      });
    }
  };

  const filtered = tokens.filter((currentToken) =>
    currentToken.ticker.toLowerCase().includes(search.toLowerCase()) ||
    currentToken.name.toLowerCase().includes(search.toLowerCase()),
  );

  const tokenFormProps: TokenFormProps = {
    formTicker,
    setFormTicker,
    formName,
    setFormName,
    formCategory,
    setFormCategory,
    formPrice,
    setFormPrice,
    formChg24h,
    setFormChg24h,
    formStake7d,
    setFormStake7d,
    formStake1m,
    setFormStake1m,
    formStake3m,
    setFormStake3m,
    formStake6m,
    setFormStake6m,
    formStake12m,
    setFormStake12m,
    formIcon,
    setFormIcon,
    formIsImage,
    setFormIsImage,
    formMintAddress,
    setFormMintAddress,
    formIsActive,
    setFormIsActive,
    formStakeEnabled,
    setFormStakeEnabled,
    formConvertEnabled,
    setFormConvertEnabled,
    formPortfolioVisible,
    setFormPortfolioVisible,
    isLivePricingEnabled: runtime.livePriceEnabled,
    onSave: handleSave,
    onCancel: handleCancel,
  };

  return (
    <div className="flex flex-col gap-4 flex-1">
      <TokensToolbar
        search={search}
        isSyncingPrices={priceSyncAsync.isActing}
        isRuntimeLoading={runtimeLoadAsync.isLoading}
        isEditing={editingId !== null}
        onSearchChange={setSearch}
        onSyncPrices={() => void syncLivePricesNow()}
        onAddNew={handleAddNew}
      />

      <TokensRuntimeSection
        runtime={runtime}
        runtimeDraft={runtimeDraft}
        runtimeDirty={runtimeDirty}
        isRuntimeLoading={runtimeLoadAsync.isLoading}
        isSavingRuntime={runtimeSaveAsync.isActing}
        onRuntimeDraftChange={setRuntimeDraft}
        onSaveRuntime={() => void saveLivePricingRuntime()}
      />

      <TokensPortfolioDebugSection
        portfolioDebugWallet={portfolioDebugWallet || admin?.walletAddress || ""}
        portfolioDebugLoading={portfolioAsync.isActing}
        portfolioDebugError={portfolioDebugError}
        portfolioDebug={portfolioDebug}
        onWalletChange={setPortfolioDebugWallet}
        onRunCheck={() => void runPortfolioEligibilityCheck()}
      />

      <TokensTable
        filtered={filtered}
        loading={tokensLoadAsync.isLoading}
        editingId={editingId}
        tokenFormProps={tokenFormProps}
        stakingProjectionByTokenId={stakingProjectionByTokenId}
        onEdit={handleEdit}
        onDelete={(id, ticker) => void handleDelete(id, ticker)}
      />
    </div>
  );
}

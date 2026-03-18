"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { VersionedTransaction } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAdminAsyncController } from "@/hooks/admin/use-admin-async-controller";
import {
  executeAdminPreparedStaking,
  exportAdminStakingMigrationSnapshot,
  fetchAdminStakingRuntimeBundle,
  prepareAdminFundingCoverageBatch,
  prepareAdminGlobalStakingConfig,
  prepareAdminStakingTokenSync,
  prepareAdminSwapNodeInitialization,
  syncAdminStakingMirror,
} from "@/lib/admin/staking-admin";
import { useAdminAuth } from "@/store/admin/use-admin-auth";
import { notifyError, notifySuccess } from "@/lib/ui/ui-feedback";
import { StakingRuntimeSection } from "@/components/admin/staking/StakingRuntimeSection";
import { StakingTokenConfigsSection } from "@/components/admin/staking/StakingTokenConfigsSection";
import type {
  AdminStakingExecutionPayload,
  AdminStakingRuntimeSnapshot,
  FundingBatchProjection,
  PreparedAdminStakingExecution,
  StakingMirrorSyncResult,
  TokenStakeConfigProjection,
  TokenStakeSyncPreparation,
} from "@/components/admin/staking/types";

const isPreparedAdminExecution = (
  payload: TokenStakeSyncPreparation | PreparedAdminStakingExecution,
): payload is PreparedAdminStakingExecution =>
  "instructionPayload" in payload && "sessionId" in payload;

export function StakingAdminContent() {
  const { token } = useAdminAuth();
  const { publicKey, signTransaction, connected } = useWallet();
  const searchParams = useSearchParams();
  const stakingLoadAsync = useAdminAsyncController(true);
  const mirrorSyncAsync = useAdminAsyncController(false);
  const tokenPrepareAsync = useAdminAsyncController(false);
  const globalConfigAsync = useAdminAsyncController(false);
  const swapNodeAsync = useAdminAsyncController(false);
  const fundingCoverageAsync = useAdminAsyncController(false);
  const preparedExecutionAsync = useAdminAsyncController(false);
  const exportAsync = useAdminAsyncController(false);
  const { runLoad: runStakingLoad } = stakingLoadAsync;

  const [stakingRuntime, setStakingRuntime] = useState<AdminStakingRuntimeSnapshot | null>(null);
  const [tokenConfigs, setTokenConfigs] = useState<TokenStakeConfigProjection[]>([]);
  const [lastMirrorSync, setLastMirrorSync] = useState<StakingMirrorSyncResult | null>(null);
  const [preparedSync, setPreparedSync] = useState<TokenStakeSyncPreparation | null>(null);
  const [preparedExecution, setPreparedExecution] = useState<PreparedAdminStakingExecution | null>(null);
  const [exportFormatInFlight, setExportFormatInFlight] = useState<"json" | "csv" | null>(null);
  const [lastExecution, setLastExecution] = useState<AdminStakingExecutionPayload | null>(null);
  const [fundingBatches, setFundingBatches] = useState<FundingBatchProjection[]>([]);
  const [preparingTokenId, setPreparingTokenId] = useState<string | null>(null);
  const focusTokenId = useMemo(() => searchParams.get("tokenId"), [searchParams]);

  const fetchStakingRuntime = useCallback(async () => {
    await runStakingLoad(
      async () =>
        fetchAdminStakingRuntimeBundle({
          token,
        }),
      {
        fallbackMessage: "Failed to load staking runtime",
        onSuccess: ({
          runtime: runtimePayload,
          tokenConfigs: configPayload,
          fundingBatches: fundingPayload,
        }) => {
          setStakingRuntime(runtimePayload);
          setTokenConfigs(configPayload);
          setFundingBatches(fundingPayload);
        },
        onError: (message) => {
          notifyError({
            title: "Staking Runtime",
            description: message,
            dedupeKey: "admin:staking:runtime-load-failed",
          });
        },
        captureError: false,
      },
    );
  }, [runStakingLoad, token]);

  const decodeBase64 = (value: string) => {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  };

  const encodeBase64 = (value: Uint8Array) => {
    const chunkSize = 0x8000;
    let binary = "";
    for (let index = 0; index < value.length; index += chunkSize) {
      binary += String.fromCharCode(...value.subarray(index, index + chunkSize));
    }
    return btoa(binary);
  };

  useEffect(() => {
    void fetchStakingRuntime();
  }, [fetchStakingRuntime]);

  const syncStakingMirror = async () => {
    if (mirrorSyncAsync.isActing) return;

    await mirrorSyncAsync.runAction(
      async () =>
        syncAdminStakingMirror({
          token,
          network: stakingRuntime?.activeNetwork,
        }),
      {
        fallbackMessage: "Failed to sync staking mirror",
        onSuccess: async (payload) => {
          setLastMirrorSync(payload);
          await fetchStakingRuntime();
          notifySuccess({
            title: "Staking Mirror",
            description: payload.message,
            dedupeKey: "admin:staking:mirror-sync-success",
            dedupeMs: 2_500,
          });
        },
        onError: (message) => {
          notifyError({
            title: "Mirror Sync Error",
            description: message,
            dedupeKey: "admin:staking:mirror-sync-failed",
          });
        },
        captureError: false,
      },
    );
  };

  const prepareTokenSync = async (tokenId: string) => {
    if (tokenPrepareAsync.isActing) return;

    setPreparingTokenId(tokenId);
    try {
      await tokenPrepareAsync.runAction(
        async () =>
          prepareAdminStakingTokenSync<
            TokenStakeSyncPreparation | PreparedAdminStakingExecution
          >({
            token,
            tokenId,
            network: stakingRuntime?.activeNetwork,
            walletAddress: publicKey?.toBase58(),
          }),
        {
          fallbackMessage: "Failed to prepare staking token sync",
          onSuccess: (payload) => {
            if (isPreparedAdminExecution(payload)) {
              setPreparedExecution(payload);
              setPreparedSync(null);
            } else {
              setPreparedSync(payload);
              setPreparedExecution(null);
            }
            notifySuccess({
              title: "Prepared",
              description: `Staking config prepared for ${payload.network}.`,
              dedupeKey: `admin:staking:prepare:${tokenId}`,
              dedupeMs: 2_000,
            });
          },
          onError: (message) => {
            notifyError({
              title: "Prepare Error",
              description: message,
              dedupeKey: `admin:staking:prepare-failed:${tokenId}`,
            });
          },
          captureError: false,
        },
      );
    } finally {
      setPreparingTokenId(null);
    }
  };

  const prepareGlobalConfig = async () => {
    if (!publicKey || globalConfigAsync.isActing) return;

    await globalConfigAsync.runAction(
      async () =>
        prepareAdminGlobalStakingConfig<PreparedAdminStakingExecution>({
          token,
          network: stakingRuntime?.activeNetwork,
          walletAddress: publicKey.toBase58(),
        }),
      {
        fallbackMessage: "Failed to prepare global staking config initialization",
        onSuccess: (payload) => {
          setPreparedExecution(payload);
          notifySuccess({
            title: "Prepared",
            description: "Global staking config initialization is ready for signature.",
            dedupeKey: "admin:staking:global-config-prepared",
            dedupeMs: 2_000,
          });
        },
        onError: (message) => {
          notifyError({
            title: "Prepare Error",
            description: message,
            dedupeKey: "admin:staking:global-config-prepare-failed",
          });
        },
        captureError: false,
      },
    );
  };

  const prepareSwapNode = async () => {
    if (!publicKey || swapNodeAsync.isActing) return;

    await swapNodeAsync.runAction(
      async () =>
        prepareAdminSwapNodeInitialization<PreparedAdminStakingExecution>({
          token,
          network: stakingRuntime?.activeNetwork,
          walletAddress: publicKey.toBase58(),
        }),
      {
        fallbackMessage: "Failed to prepare swap-node initialization",
        onSuccess: (payload) => {
          setPreparedExecution(payload);
          notifySuccess({
            title: "Prepared",
            description: "Swap-node initialization is ready for signature.",
            dedupeKey: "admin:staking:swap-node-prepared",
            dedupeMs: 2_000,
          });
        },
        onError: (message) => {
          notifyError({
            title: "Prepare Error",
            description: message,
            dedupeKey: "admin:staking:swap-node-prepare-failed",
          });
        },
        captureError: false,
      },
    );
  };

  const prepareFundingCoverage = async () => {
    if (!publicKey || fundingCoverageAsync.isActing) return;

    await fundingCoverageAsync.runAction(
      async () =>
        prepareAdminFundingCoverageBatch<PreparedAdminStakingExecution>({
          token,
          network: stakingRuntime?.activeNetwork,
          walletAddress: publicKey.toBase58(),
        }),
      {
        fallbackMessage: "Failed to prepare reward coverage batch",
        onSuccess: async (payload) => {
          setPreparedExecution(payload);
          await fetchStakingRuntime();
          notifySuccess({
            title: "Prepared",
            description: "Reward coverage batch is ready for signature.",
            dedupeKey: "admin:staking:funding-batch-prepared",
            dedupeMs: 2_000,
          });
        },
        onError: (message) => {
          notifyError({
            title: "Prepare Error",
            description: message,
            dedupeKey: "admin:staking:funding-batch-prepare-failed",
          });
        },
        captureError: false,
      },
    );
  };

  const executePreparedInstruction = async () => {
    if (
      !preparedExecution ||
      !publicKey ||
      !connected ||
      !signTransaction ||
      preparedExecutionAsync.isActing
    ) {
      return;
    }

    await preparedExecutionAsync.runAction(
      async () => {
        const transaction = VersionedTransaction.deserialize(
          decodeBase64(preparedExecution.transactionBase64),
        );
        const signedTransaction = await signTransaction(transaction);
        return executeAdminPreparedStaking<AdminStakingExecutionPayload>({
          token,
          walletAddress: publicKey.toBase58(),
          sessionId: preparedExecution.sessionId,
          signedTransactionBase64: encodeBase64(signedTransaction.serialize()),
        });
      },
      {
        fallbackMessage: "Failed to execute prepared staking instruction",
        onSuccess: async (payload) => {
          setLastExecution(payload);
          setPreparedExecution(null);
          await fetchStakingRuntime();
          notifySuccess({
            title: "Executed",
            description: `${payload.action} confirmed on ${payload.network}.`,
            dedupeKey: "admin:staking:execute-success",
            dedupeMs: 2_500,
          });
        },
        onError: (message) => {
          notifyError({
            title: "Execute Error",
            description: message,
            dedupeKey: "admin:staking:execute-failed",
          });
        },
        captureError: false,
      },
    );
  };

  const exportMigrationSnapshot = async (format: "json" | "csv") => {
    if (exportFormatInFlight || exportAsync.isActing) return;

    setExportFormatInFlight(format);
    try {
      const network = stakingRuntime?.activeNetwork;
      await exportAsync.runAction(
        async () =>
          exportAdminStakingMigrationSnapshot({
            token,
            format,
            network,
          }),
        {
          fallbackMessage: "Failed to export staking migration snapshot",
          onSuccess: (blob) => {
            const downloadUrl = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = downloadUrl;
            anchor.download = `staking-migration-${network ?? "active"}.${format}`;
            document.body.append(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(downloadUrl);
            notifySuccess({
              title: "Export Ready",
              description: `Downloaded staking migration ${format.toUpperCase()} export.`,
              dedupeKey: `admin:staking:export-${format}`,
              dedupeMs: 2_500,
            });
          },
          onError: (message) => {
            notifyError({
              title: "Export Error",
              description: message,
              dedupeKey: `admin:staking:export-${format}-failed`,
            });
          },
          captureError: false,
        },
      );
    } finally {
      setExportFormatInFlight(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 flex-1">
      <StakingRuntimeSection
        runtime={stakingRuntime}
        isLoading={stakingLoadAsync.isLoading}
        isSyncingMirror={mirrorSyncAsync.isActing}
        lastMirrorSync={lastMirrorSync}
        preparedSync={preparedSync}
        preparedExecution={preparedExecution}
        isPreparingGlobalConfig={globalConfigAsync.isActing}
        isPreparingSwapNode={swapNodeAsync.isActing}
        isPreparingFundingCoverage={fundingCoverageAsync.isActing}
        isExecutingPreparedInstruction={preparedExecutionAsync.isActing}
        exportFormatInFlight={exportFormatInFlight}
        lastExecution={lastExecution}
        fundingBatches={fundingBatches}
        onSyncMirror={() => void syncStakingMirror()}
        onPrepareGlobalConfig={() => void prepareGlobalConfig()}
        onPrepareSwapNode={() => void prepareSwapNode()}
        onPrepareFundingCoverage={() => void prepareFundingCoverage()}
        onExecutePreparedInstruction={() => void executePreparedInstruction()}
        onExportMigrationSnapshot={(format) => void exportMigrationSnapshot(format)}
      />

      <StakingTokenConfigsSection
        tokenConfigs={tokenConfigs}
        isLoading={stakingLoadAsync.isLoading}
        preparingTokenId={preparingTokenId}
        focusTokenId={focusTokenId}
        onPrepareSync={(tokenId) => void prepareTokenSync(tokenId)}
      />
    </div>
  );
}

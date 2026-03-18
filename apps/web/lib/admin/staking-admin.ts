import { adminRequestBlob, adminRequestJson } from "@/lib/api/admin-api";
import { backendRoutes } from "@/lib/api/backend-routes";
import type {
  AdminStakingRuntimeSnapshot,
  AdminStakingExecutionPayload,
  FundingBatchProjection,
  PreparedAdminStakingExecution,
  StakingCutoverPolicySnapshot,
  StakingMirrorSyncResult,
  TokenStakeConfigProjection,
  TokenStakeSyncPreparation,
} from "@/components/admin/staking/types";

export interface AdminStakingRuntimeBundle {
  runtime: AdminStakingRuntimeSnapshot;
  tokenConfigs: TokenStakeConfigProjection[];
  fundingBatches: FundingBatchProjection[];
}

interface AdminStakingRequestInput {
  token: string | null;
  network?: "devnet" | "mainnet";
}

export const fetchAdminStakingRuntime = async ({
  token,
}: AdminStakingRequestInput): Promise<AdminStakingRuntimeSnapshot> =>
  adminRequestJson<AdminStakingRuntimeSnapshot>({
    token,
    path: backendRoutes.staking.adminRuntime,
    fallbackMessage: "Failed to load staking runtime",
    cacheTtlMs: 5_000,
    minIntervalMs: 350,
  });

export const fetchAdminStakingCutoverPolicy = async ({
  token,
}: AdminStakingRequestInput): Promise<StakingCutoverPolicySnapshot> => {
  const runtime = await fetchAdminStakingRuntime({ token });
  return runtime.cutoverPolicy;
};

export const fetchAdminStakingRuntimeBundle = async ({
  token,
  network,
}: AdminStakingRequestInput): Promise<AdminStakingRuntimeBundle> => {
  const [runtime, tokenConfigs, fundingBatches] = await Promise.all([
    fetchAdminStakingRuntime({ token }),
    adminRequestJson<TokenStakeConfigProjection[]>({
      token,
      path: backendRoutes.staking.adminTokens(network),
      fallbackMessage: "Failed to load staking token projections",
      cacheTtlMs: 5_000,
      minIntervalMs: 350,
    }),
    adminRequestJson<FundingBatchProjection[]>({
      token,
      path: backendRoutes.staking.adminFundingBatches(network),
      fallbackMessage: "Failed to load funding batches",
      cacheTtlMs: 5_000,
      minIntervalMs: 350,
    }),
  ]);

  return {
    runtime,
    tokenConfigs,
    fundingBatches,
  };
};

export const fetchAdminStakingTokenConfigs = async ({
  token,
  network,
}: AdminStakingRequestInput): Promise<TokenStakeConfigProjection[]> =>
  adminRequestJson<TokenStakeConfigProjection[]>({
    token,
    path: backendRoutes.staking.adminTokens(network),
    fallbackMessage: "Failed to load staking token projections",
    cacheTtlMs: 5_000,
    minIntervalMs: 350,
  });

export const syncAdminStakingMirror = async ({
  token,
  network,
}: AdminStakingRequestInput): Promise<StakingMirrorSyncResult> =>
  adminRequestJson<StakingMirrorSyncResult>({
    token,
    path: backendRoutes.staking.adminMirrorSync(network),
    fallbackMessage: "Failed to sync staking mirror",
    method: "POST",
  });

export const prepareAdminStakingTokenSync = async <
  TResponse extends TokenStakeSyncPreparation | PreparedAdminStakingExecution,
>({
  token,
  tokenId,
  network,
  walletAddress,
}: AdminStakingRequestInput & {
  tokenId: string;
  walletAddress?: string;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.staking.adminPrepareSync(tokenId, network),
    fallbackMessage: "Failed to prepare token staking sync",
    method: "POST",
    headers: walletAddress ? { "Content-Type": "application/json" } : undefined,
    body: walletAddress ? JSON.stringify({ walletAddress }) : undefined,
  });

export const prepareAdminGlobalStakingConfig = async <TResponse>({
  token,
  network,
  walletAddress,
}: AdminStakingRequestInput & {
  walletAddress: string;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.staking.adminPrepareGlobalConfig(network),
    fallbackMessage: "Failed to prepare global staking config initialization",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress }),
  });

export const prepareAdminSwapNodeInitialization = async <TResponse>({
  token,
  network,
  walletAddress,
}: AdminStakingRequestInput & {
  walletAddress: string;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.staking.adminPrepareSwapNode(network),
    fallbackMessage: "Failed to prepare swap-node initialization",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress }),
  });

export const prepareAdminFundingCoverageBatch = async <TResponse>({
  token,
  network,
  walletAddress,
}: AdminStakingRequestInput & {
  walletAddress: string;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.staking.adminPrepareFundingCoverage(network),
    fallbackMessage: "Failed to prepare reward coverage batch",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress }),
  });

export const executeAdminPreparedStaking = async <TResponse extends AdminStakingExecutionPayload>({
  token,
  walletAddress,
  sessionId,
  signedTransactionBase64,
}: AdminStakingRequestInput & {
  walletAddress: string;
  sessionId: string;
  signedTransactionBase64: string;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.staking.adminExecute,
    fallbackMessage: "Failed to execute prepared staking instruction",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      walletAddress,
      sessionId,
      signedTransactionBase64,
    }),
  });

export const exportAdminStakingMigrationSnapshot = async ({
  token,
  format,
  network,
}: AdminStakingRequestInput & {
  format: "json" | "csv";
}): Promise<Blob> =>
  adminRequestBlob({
    token,
    path: backendRoutes.staking.adminMigrationExport(format, network),
    fallbackMessage: "Failed to export staking migration snapshot",
  });

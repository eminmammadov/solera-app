import { backendRoutes } from "@/lib/api/backend-routes";
import { publicRequestJson } from "@/lib/api/public-api";
import { postJson } from "@/lib/user/user-request";
import type {
  TrackStakePositionInput,
  TrackStakePositionResult,
  WalletClaimExecutionResponse,
  WalletClaimPreparationResponse,
  WalletStakeExecutionResponse,
  WalletStakePreparationResponse,
  WalletStakeQuoteResponse,
} from "@/lib/user/user-types";

export const trackUserStakePosition = async (
  payload: TrackStakePositionInput,
): Promise<TrackStakePositionResult | null> =>
  postJson<TrackStakePositionResult, TrackStakePositionInput>(
    backendRoutes.users.stakes,
    payload,
  );

export const previewWalletStake = async (payload: {
  walletAddress: string;
  tokenTicker: string;
  amount: number;
  periodLabel: string;
}): Promise<WalletStakeQuoteResponse> =>
  publicRequestJson<WalletStakeQuoteResponse>({
    path: backendRoutes.users.stakePreview,
    fallbackMessage: "Failed to preview stake route.",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
    credentials: "include",
  });

export const prepareWalletStake = async (payload: {
  walletAddress: string;
  tokenTicker: string;
  amount: number;
  periodLabel: string;
}): Promise<WalletStakePreparationResponse> =>
  publicRequestJson<WalletStakePreparationResponse>({
    path: backendRoutes.users.stakePrepare,
    fallbackMessage: "Failed to prepare stake route.",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
    credentials: "include",
  });

export const executeWalletStake = async (payload: {
  walletAddress: string;
  sessionId: string;
  signedTransactionBase64: string;
}): Promise<WalletStakeExecutionResponse> =>
  publicRequestJson<WalletStakeExecutionResponse>({
    path: backendRoutes.users.stakeExecute,
    fallbackMessage: "Failed to broadcast prepared stake transaction.",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
    credentials: "include",
  });

export const prepareWalletClaim = async (
  walletAddress: string,
  stakePositionId: string,
): Promise<WalletClaimPreparationResponse> =>
  publicRequestJson<WalletClaimPreparationResponse>({
    path: backendRoutes.users.stakeClaimPrepare(stakePositionId),
    fallbackMessage: "Failed to prepare claim route.",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress }),
    cache: "no-store",
    credentials: "include",
  });

export const executeWalletClaim = async (
  walletAddress: string,
  stakePositionId: string,
  sessionId: string,
  signedTransactionBase64: string,
): Promise<WalletClaimExecutionResponse> =>
  publicRequestJson<WalletClaimExecutionResponse>({
    path: backendRoutes.users.stakeClaimExecute(stakePositionId),
    fallbackMessage: "Failed to execute claim transaction.",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress, sessionId, signedTransactionBase64 }),
    cache: "no-store",
    credentials: "include",
  });

export const claimUserStakePosition = async (
  walletAddress: string,
  stakePositionId: string,
  execution?: { signature?: string; explorerUrl?: string },
): Promise<void> => {
  await postJson(backendRoutes.users.stakeClaim(stakePositionId), {
    walletAddress,
    executionSignature: execution?.signature,
    executionExplorerUrl: execution?.explorerUrl,
  });
};

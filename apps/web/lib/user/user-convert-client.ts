import { backendRoutes } from "@/lib/api/backend-routes";
import { publicRequestJson } from "@/lib/api/public-api";
import type {
  WalletConvertExecutionResponse,
  WalletConvertPreparationResponse,
  WalletConvertPreviewResponse,
} from "@/lib/user/user-types";

export const prepareWalletConvert = async (
  walletAddress: string,
  tokens: Array<{ ticker: string }>,
): Promise<WalletConvertPreparationResponse> =>
  publicRequestJson<WalletConvertPreparationResponse>({
    path: backendRoutes.users.convertPrepare,
    fallbackMessage: "Failed to prepare conversion route.",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress, tokens }),
    cache: "no-store",
    credentials: "include",
  });

export const previewWalletConvert = async (
  walletAddress: string,
): Promise<WalletConvertPreviewResponse> =>
  publicRequestJson<WalletConvertPreviewResponse>({
    path: backendRoutes.users.convertPreview,
    fallbackMessage: "Failed to load convertable balances.",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress }),
    cache: "no-store",
    credentials: "include",
  });

export const executeWalletConvert = async (
  walletAddress: string,
  sessionId: string,
  legs: Array<{ legId: string; signedTransactions: string[] }>,
): Promise<WalletConvertExecutionResponse> =>
  publicRequestJson<WalletConvertExecutionResponse>({
    path: backendRoutes.users.convertExecute,
    fallbackMessage: "Failed to execute conversion.",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress, sessionId, legs }),
    cache: "no-store",
    credentials: "include",
  });

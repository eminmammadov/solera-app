import { backendRoutes } from "@/lib/api/backend-routes";
import { publicRequestJson } from "@/lib/api/public-api";
import type {
  WalletAccessStatus,
  WalletUserMetrics,
  WalletUserProfileResponse,
} from "@/lib/user/user-types";

const WALLET_METRICS_CACHE_TTL_MS = 5_000;
let walletMetricsCache: { value: WalletUserMetrics; expiresAt: number } | null =
  null;
let walletMetricsInFlight: Promise<WalletUserMetrics> | null = null;

export const fetchWalletUserMetrics = async (
  force = false,
): Promise<WalletUserMetrics> => {
  const now = Date.now();

  if (force) {
    walletMetricsCache = null;
  }

  if (!force && walletMetricsCache && walletMetricsCache.expiresAt > now) {
    return walletMetricsCache.value;
  }

  if (!force && walletMetricsInFlight) {
    return walletMetricsInFlight;
  }

  const runRequest = async () => {
    try {
      const metrics = await publicRequestJson<WalletUserMetrics>({
        path: backendRoutes.users.metrics,
        fallbackMessage: "Failed to load user metrics.",
        cache: "no-store",
        timeoutMs: 10_000,
        cacheTtlMs: force ? 0 : WALLET_METRICS_CACHE_TTL_MS,
        minIntervalMs: force ? 0 : 250,
        dedupe: !force,
      });

      walletMetricsCache = {
        value: metrics,
        expiresAt: Date.now() + WALLET_METRICS_CACHE_TTL_MS,
      };
      return metrics;
    } finally {
      walletMetricsInFlight = null;
    }
  };

  if (force) {
    return runRequest();
  }

  walletMetricsInFlight = runRequest();

  return walletMetricsInFlight;
};

export const fetchWalletUserProfile = async (
  walletAddress: string,
): Promise<WalletUserProfileResponse | null> => {
  try {
    return await publicRequestJson<WalletUserProfileResponse>({
      path: backendRoutes.users.profile(walletAddress),
      fallbackMessage: "Failed to load profile data.",
      cache: "no-store",
      credentials: "include",
      cacheTtlMs: 2_000,
      minIntervalMs: 250,
    });
  } catch {
    return null;
  }
};

export const checkWalletAccess = async (
  walletAddress: string,
): Promise<WalletAccessStatus | null> => {
  try {
    return await publicRequestJson<WalletAccessStatus>({
      path: backendRoutes.users.access(walletAddress),
      fallbackMessage: "Failed to verify wallet access.",
      cache: "no-store",
      cacheTtlMs: 1_500,
      minIntervalMs: 250,
    });
  } catch {
    return null;
  }
};

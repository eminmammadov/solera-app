import { adminRequestJson } from "@/lib/api/admin-api";
import { backendRoutes } from "@/lib/api/backend-routes";

interface AdminOhlcRequestInput {
  token: string | null;
}

export const fetchAdminOhlcConfig = async <TResponse>({
  token,
}: AdminOhlcRequestInput): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.ohlc.adminConfig,
    fallbackMessage: "Failed to load OHLC config",
    cacheTtlMs: 3_000,
    minIntervalMs: 350,
  });

export const fetchAdminOhlcPairs = async <TResponse>({
  token,
}: AdminOhlcRequestInput): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.ohlc.adminPairs,
    fallbackMessage: "Failed to load OHLC pairs",
    cacheTtlMs: 3_000,
    minIntervalMs: 350,
  });

export const updateAdminOhlcRuntime = async <TResponse, TBody>({
  token,
  payload,
}: AdminOhlcRequestInput & {
  payload: TBody;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.ohlc.adminConfig,
    fallbackMessage: "Failed to update runtime",
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

export const syncAdminOhlcNow = async <TResponse>({
  token,
}: AdminOhlcRequestInput): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.ohlc.adminSync,
    fallbackMessage: "Failed to sync",
    method: "POST",
    cacheTtlMs: 0,
  });

export const updateAdminOhlcPair = async <TResponse, TBody>({
  token,
  pairId,
  payload,
}: AdminOhlcRequestInput & {
  pairId: number | string;
  payload: TBody;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.ohlc.adminPairById(pairId),
    fallbackMessage: "Failed to update pair",
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

export const setAdminOhlcFeaturedPair = async <TResponse>({
  token,
  pairId,
}: AdminOhlcRequestInput & {
  pairId: number | string;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.ohlc.adminFeaturedById(pairId),
    fallbackMessage: "Failed to set featured pair",
    method: "PATCH",
    cacheTtlMs: 0,
  });

export const deleteAdminOhlcPair = async <TResponse>({
  token,
  pairId,
}: AdminOhlcRequestInput & {
  pairId: number | string;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.ohlc.adminPairById(pairId),
    fallbackMessage: "Failed to delete pair",
    method: "DELETE",
    cacheTtlMs: 0,
  });

export const createAdminOhlcPair = async <TResponse, TBody>({
  token,
  payload,
}: AdminOhlcRequestInput & {
  payload: TBody;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.ohlc.adminPairs,
    fallbackMessage: "Failed to create pair",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

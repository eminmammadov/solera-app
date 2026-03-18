import { adminRequestJson } from "@/lib/api/admin-api";
import { backendRoutes } from "@/lib/api/backend-routes";

interface AdminMarketRequestInput {
  token: string | null;
}

export const fetchAdminMarketTokens = async <TResponse>({
  token,
}: AdminMarketRequestInput): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.market.adminTokens,
    fallbackMessage: "Failed to load market tokens",
    cacheTtlMs: 3_000,
    minIntervalMs: 350,
  });

export const fetchAdminMarketLivePricingRuntime = async <TResponse>({
  token,
}: AdminMarketRequestInput): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.market.adminLivePricing,
    fallbackMessage: "Failed to load live pricing settings",
    cacheTtlMs: 5_000,
    minIntervalMs: 350,
  });

export const updateAdminMarketLivePricingRuntime = async <TResponse, TBody>({
  token,
  payload,
}: AdminMarketRequestInput & {
  payload: TBody;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.market.adminLivePricing,
    fallbackMessage: "Failed to save live pricing settings",
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

export const syncAdminMarketLivePrices = async <TResponse>({
  token,
}: AdminMarketRequestInput): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.market.adminLivePricingSync,
    fallbackMessage: "Failed to sync live prices",
    method: "POST",
  });

export const uploadAdminMarketTokenImage = async <TResponse>({
  token,
  file,
}: AdminMarketRequestInput & {
  file: File;
}): Promise<TResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  return adminRequestJson<TResponse>({
    token,
    path: backendRoutes.market.adminTokenUpload,
    fallbackMessage: "Failed to upload image",
    method: "POST",
    body: formData,
  });
};

export const createAdminMarketToken = async <TResponse, TBody>({
  token,
  payload,
}: AdminMarketRequestInput & {
  payload: TBody;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.market.adminTokens,
    fallbackMessage: "Failed to save token",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

export const updateAdminMarketToken = async <TResponse, TBody>({
  token,
  id,
  payload,
}: AdminMarketRequestInput & {
  id: string;
  payload: TBody;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.market.adminTokenById(id),
    fallbackMessage: "Failed to save token",
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

export const deleteAdminMarketToken = async <TResponse>({
  token,
  id,
}: AdminMarketRequestInput & {
  id: string;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.market.adminTokenById(id),
    fallbackMessage: "Failed to delete token",
    method: "DELETE",
    cacheTtlMs: 0,
  });

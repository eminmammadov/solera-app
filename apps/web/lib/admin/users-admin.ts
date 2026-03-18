import { adminRequestJson } from "@/lib/api/admin-api";
import { backendRoutes } from "@/lib/api/backend-routes";

interface AdminUsersRequestInput {
  token: string | null;
}

interface AdminUsersListParams {
  search?: string;
  country?: string;
  onlineOnly?: boolean;
  limit?: number;
  offset?: number;
}

export const fetchAdminUsersMetrics = async <TResponse>({
  token,
}: AdminUsersRequestInput): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.system.adminMetrics,
    fallbackMessage: "Failed to load metrics",
    cacheTtlMs: 8_000,
    minIntervalMs: 400,
  });

export const fetchAdminUsersList = async <TResponse>({
  token,
  params,
  withLoader = true,
}: AdminUsersRequestInput & {
  params?: AdminUsersListParams;
  withLoader?: boolean;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.users.adminList(params),
    fallbackMessage: "Failed to load users",
    cacheTtlMs: withLoader ? 0 : 5_000,
    minIntervalMs: 300,
  });

export const fetchAdminUserDetail = async <TResponse>({
  token,
  walletAddress,
}: AdminUsersRequestInput & {
  walletAddress: string;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.users.adminByWallet(walletAddress),
    fallbackMessage: "Failed to load user detail",
    cacheTtlMs: 5_000,
    minIntervalMs: 300,
  });

export const deleteAdminUser = async <TResponse>({
  token,
  walletAddress,
}: AdminUsersRequestInput & {
  walletAddress: string;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.users.adminByWallet(walletAddress),
    fallbackMessage: "Failed to delete wallet user",
    method: "DELETE",
  });

export const updateAdminUserBlockStatus = async <TResponse>({
  token,
  walletAddress,
  isBlocked,
  blockMessage,
}: AdminUsersRequestInput & {
  walletAddress: string;
  isBlocked: boolean;
  blockMessage?: string;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.users.adminBlockByWallet(walletAddress),
    fallbackMessage: "Failed to update block status",
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      isBlocked,
      blockMessage: isBlocked ? blockMessage : undefined,
    }),
  });

export const fetchAdminPortfolioEligibility = async <TResponse>({
  token,
  walletAddress,
}: AdminUsersRequestInput & {
  walletAddress: string;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.users.adminPortfolioEligibility(walletAddress),
    fallbackMessage: "Failed to load portfolio eligibility diagnostics",
    cacheTtlMs: 0,
    minIntervalMs: 0,
  });

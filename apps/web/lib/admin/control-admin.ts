import { adminRequestJson } from "@/lib/api/admin-api";
import { backendRoutes } from "@/lib/api/backend-routes";

interface AdminControlRequestInput {
  token: string | null;
}

export const fetchAdminProxyBackendConfig = async <TResponse>({
  token,
}: AdminControlRequestInput): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.system.proxyBackend,
    fallbackMessage: "Failed to load backend runtime config.",
    cacheTtlMs: 5_000,
    minIntervalMs: 400,
  });

export const saveAdminProxyBackendDraft = async <TResponse>({
  token,
  backendBaseUrl,
}: AdminControlRequestInput & {
  backendBaseUrl: string | null;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.system.proxyBackendDraft,
    fallbackMessage: "Failed to save draft backend URL.",
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ backendBaseUrl }),
  });

export const publishAdminProxyBackendDraft = async <TResponse>({
  token,
}: AdminControlRequestInput): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.system.proxyBackendPublish,
    fallbackMessage: "Failed to publish backend URL.",
    method: "POST",
  });

export const rollbackAdminProxyBackend = async <TResponse>({
  token,
}: AdminControlRequestInput): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.system.proxyBackendRollback,
    fallbackMessage: "Failed to rollback backend URL.",
    method: "POST",
  });

export const fetchAdminRoles = async <TResponse>({
  token,
}: AdminControlRequestInput): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.auth.admins,
    fallbackMessage: "Failed to load admin roles.",
    cacheTtlMs: 5_000,
    minIntervalMs: 400,
  });

export const updateAdminRole = async <TResponse>({
  token,
  adminId,
  payload,
}: AdminControlRequestInput & {
  adminId: string;
  payload: string;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.auth.adminById(adminId),
    fallbackMessage: "Failed to update admin role.",
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
  });

export const deleteAdminRole = async <TResponse>({
  token,
  adminId,
}: AdminControlRequestInput & {
  adminId: string;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.auth.adminById(adminId),
    fallbackMessage: "Failed to delete admin.",
    method: "DELETE",
  });

export const createAdminRole = async <TResponse>({
  token,
  payload,
}: AdminControlRequestInput & {
  payload: string;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.auth.admins,
    fallbackMessage: "Failed to create admin.",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
  });

export const deleteCustomAdminRole = async <TResponse>({
  token,
  roleName,
}: AdminControlRequestInput & {
  roleName: string;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.auth.customAdminRoleByName(roleName),
    fallbackMessage: "Failed to delete custom role.",
    method: "DELETE",
  });

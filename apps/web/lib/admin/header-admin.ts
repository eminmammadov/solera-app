import { adminRequestJson } from "@/lib/api/admin-api";
import { backendRoutes } from "@/lib/api/backend-routes";

interface AdminHeaderRequestInput {
  token: string | null;
}

export const fetchAdminHeaderSettings = async <TResponse>({
  token,
}: AdminHeaderRequestInput): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.system.header,
    fallbackMessage: "Failed to load header settings",
    cacheTtlMs: 5_000,
    minIntervalMs: 350,
  });

export const saveAdminHeaderSettings = async <TResponse>({
  token,
  payload,
}: AdminHeaderRequestInput & {
  payload: string;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.system.header,
    fallbackMessage: "Failed to save header settings",
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
  });

export const resetAdminHeaderSettings = async <TResponse>({
  token,
}: AdminHeaderRequestInput): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.system.header,
    fallbackMessage: "Failed to reset header settings",
    method: "DELETE",
    cacheTtlMs: 0,
  });

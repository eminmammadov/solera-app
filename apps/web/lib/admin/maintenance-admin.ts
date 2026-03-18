import { adminRequestJson } from "@/lib/api/admin-api";
import { backendRoutes } from "@/lib/api/backend-routes";

interface AdminMaintenanceRequestInput {
  token: string | null;
}

export const fetchAdminMaintenanceSettings = async <TResponse>({
  token,
}: AdminMaintenanceRequestInput): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.system.maintenance,
    fallbackMessage: "Failed to load maintenance settings",
    cacheTtlMs: 8_000,
    minIntervalMs: 350,
  });

export const saveAdminMaintenanceSettings = async <TResponse>({
  token,
  payload,
}: AdminMaintenanceRequestInput & {
  payload: string;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.system.maintenance,
    fallbackMessage: "Failed to save maintenance settings",
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
  });

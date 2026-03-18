import { adminRequestJson } from "@/lib/api/admin-api";
import { backendRoutes } from "@/lib/api/backend-routes";

interface AdminSystemRequestInput {
  token: string | null;
}

export const fetchAdminInfraStatus = async <TResponse>({
  token,
}: AdminSystemRequestInput): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.system.infraStatus,
    fallbackMessage: "Failed to load infra status.",
  });

export const fetchAdminSystemMetrics = async <TResponse>({
  token,
}: AdminSystemRequestInput): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.system.adminMetrics,
    fallbackMessage: "Failed to load dashboard metrics.",
  });

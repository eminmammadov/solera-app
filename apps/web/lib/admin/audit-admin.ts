import { adminRequestJson } from "@/lib/api/admin-api";
import { backendRoutes } from "@/lib/api/backend-routes";

interface AdminAuditRequestInput {
  token: string | null;
}

interface AdminAuditLogsParams {
  limit: number;
  offset: number;
  action?: string;
  resourceType?: string;
  actorWallet?: string;
  status?: "success" | "failure";
  from?: string;
  to?: string;
}

export const fetchAdminAuditStatus = async <TResponse>({
  token,
}: AdminAuditRequestInput): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.audit.status,
    fallbackMessage: "Failed to load audit status.",
    cacheTtlMs: 10_000,
    minIntervalMs: 400,
  });

export const fetchAdminAuditLogs = async <TResponse>({
  token,
  params,
  withLoader = true,
}: AdminAuditRequestInput & {
  params: AdminAuditLogsParams;
  withLoader?: boolean;
}): Promise<TResponse> => {
  const query = new URLSearchParams();
  query.set("limit", String(params.limit));
  query.set("offset", String(params.offset));

  if (params.action?.trim()) query.set("action", params.action.trim());
  if (params.resourceType?.trim()) {
    query.set("resourceType", params.resourceType.trim());
  }
  if (params.actorWallet?.trim()) {
    query.set("actorWallet", params.actorWallet.trim());
  }
  if (params.status) query.set("status", params.status);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);

  return adminRequestJson<TResponse>({
    token,
    path: `${backendRoutes.audit.logs}?${query.toString()}`,
    fallbackMessage: "Failed to load audit logs.",
    cacheTtlMs: withLoader ? 0 : 5_000,
    minIntervalMs: 350,
  });
};

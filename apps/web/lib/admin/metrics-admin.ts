import { fetchAdminAuditStatus } from "@/lib/admin/audit-admin";
import { fetchAdminSystemMetrics } from "@/lib/admin/system-admin";
import { adminRequestJson } from "@/lib/api/admin-api";
import { backendRoutes } from "@/lib/api/backend-routes";

interface AdminMetricsRequestInput {
  token: string | null;
}

export const fetchAdminOhlcStatus = async <TResponse>({
  token,
  withLoader = true,
}: AdminMetricsRequestInput & {
  withLoader?: boolean;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.ohlc.adminConfig,
    fallbackMessage: "Failed to load OHLC status.",
    cacheTtlMs: withLoader ? 0 : 5_000,
    minIntervalMs: 400,
  });

export const fetchAdminMetricsBundle = async <
  TMetrics,
  TAudit,
  TOhlc,
>({
  token,
  withLoader = true,
}: AdminMetricsRequestInput & {
  withLoader?: boolean;
}): Promise<{
  metrics: TMetrics;
  audit: TAudit;
  ohlc: TOhlc;
}> => {
  const [metrics, audit, ohlc] = await Promise.all([
    fetchAdminSystemMetrics<TMetrics>({ token }),
    fetchAdminAuditStatus<TAudit>({ token }),
    fetchAdminOhlcStatus<TOhlc>({ token, withLoader }),
  ]);

  return { metrics, audit, ohlc };
};

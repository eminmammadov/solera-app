import { backendRoutes } from "@/lib/api/backend-routes";
import { publicRequestJson } from "@/lib/api/public-api";
import {
  DEFAULT_HEADER_BRANDING,
  normalizeHeaderBranding,
  type HeaderBranding,
} from "@/lib/header/header-branding";

export interface PublicMaintenanceStatusResponse {
  maintenanceEnabled: boolean;
  maintenanceStartsAt: string | null;
  maintenanceMessage: string | null;
  isActive: boolean;
}

const HEADER_BRANDING_CACHE_TTL_MS = 60_000;

let headerBrandingCache: { value: HeaderBranding; expiresAt: number } | null =
  null;

export const getCachedPublicHeaderBranding = (): HeaderBranding | null =>
  headerBrandingCache && headerBrandingCache.expiresAt > Date.now()
    ? headerBrandingCache.value
    : null;

export const clearPublicHeaderBrandingCache = () => {
  headerBrandingCache = null;
};

export const fetchPublicHeaderBranding = async (
  force = false,
): Promise<HeaderBranding> => {
  if (!force) {
    const cached = getCachedPublicHeaderBranding();
    if (cached) {
      return cached;
    }
  }

  const branding = normalizeHeaderBranding(
    await publicRequestJson<unknown>({
      path: backendRoutes.system.header,
      fallbackMessage: "Failed to load header settings.",
      cache: "no-store",
      cacheTtlMs: 5_000,
      minIntervalMs: 250,
    }),
  );

  headerBrandingCache = {
    value: branding,
    expiresAt: Date.now() + HEADER_BRANDING_CACHE_TTL_MS,
  };

  return branding;
};

export const fetchPublicConnectEnabled = async (force = false) => {
  try {
    const branding = await fetchPublicHeaderBranding(force);
    return branding.connectEnabled;
  } catch {
    return (
      getCachedPublicHeaderBranding()?.connectEnabled ??
      DEFAULT_HEADER_BRANDING.connectEnabled
    );
  }
};

export const fetchPublicMaintenanceStatus =
  async (): Promise<PublicMaintenanceStatusResponse> =>
    publicRequestJson<PublicMaintenanceStatusResponse>({
      path: backendRoutes.system.maintenanceStatus,
      fallbackMessage: "Failed to load maintenance status.",
      cache: "no-store",
      cacheTtlMs: 2_000,
      minIntervalMs: 250,
    });

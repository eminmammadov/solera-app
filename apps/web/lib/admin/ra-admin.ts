import { adminRequestJson } from "@/lib/api/admin-api";
import { backendRoutes } from "@/lib/api/backend-routes";

interface AdminRaRequestInput {
  token: string | null;
}

export const fetchAdminRaSettings = async <TResponse>({
  token,
}: AdminRaRequestInput): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.system.ra,
    fallbackMessage: "Failed to load RA runtime settings.",
    cacheTtlMs: 4_000,
    minIntervalMs: 300,
  });

export const fetchAdminRaHeaderNetwork = async <TResponse>({
  token,
}: AdminRaRequestInput): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.system.header,
    fallbackMessage: "Failed to load header network.",
    cacheTtlMs: 4_000,
    minIntervalMs: 300,
  });

export const updateAdminRaSettings = async <TResponse, TBody>({
  token,
  payload,
}: AdminRaRequestInput & {
  payload: TBody;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.system.ra,
    fallbackMessage: "Failed to save RA settings.",
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

export const uploadAdminRaLogo = async <TResponse>({
  token,
  file,
}: AdminRaRequestInput & {
  file: File;
}): Promise<TResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  return adminRequestJson<TResponse>({
    token,
    path: backendRoutes.system.raUploadLogo,
    fallbackMessage: "Failed to upload RA logo.",
    method: "POST",
    body: formData,
  });
};

export const migrateAdminRaRuntime = async <TResponse>({
  token,
}: AdminRaRequestInput): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.system.raMigrate,
    fallbackMessage: "RA migration failed.",
    method: "POST",
    cacheTtlMs: 0,
  });

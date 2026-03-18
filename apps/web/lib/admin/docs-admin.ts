import { adminRequestJson } from "@/lib/api/admin-api";
import { backendRoutes } from "@/lib/api/backend-routes";

interface AdminDocsRequestInput {
  token: string | null;
}

export const fetchAdminDocsBundle = async <TDocs, TSettings>({
  token,
}: AdminDocsRequestInput): Promise<{
  docs: TDocs;
  settings: TSettings;
}> => {
  const [docs, settings] = await Promise.all([
    adminRequestJson<TDocs>({
      token,
      path: backendRoutes.docs.admin,
      fallbackMessage: "Failed to load documentation content",
      cacheTtlMs: 0,
      minIntervalMs: 350,
    }),
    adminRequestJson<TSettings>({
      token,
      path: backendRoutes.docs.settings,
      fallbackMessage: "Failed to load docs settings",
      cacheTtlMs: 8_000,
      minIntervalMs: 350,
    }),
  ]);

  return { docs, settings };
};

export const saveAdminDocsSettings = async <TResponse>({
  token,
  payload,
}: AdminDocsRequestInput & {
  payload: string;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.docs.settings,
    fallbackMessage: "Failed to save docs settings",
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
  });

export const saveAdminDocsCategory = async <TResponse>({
  token,
  categoryId,
  payload,
}: AdminDocsRequestInput & {
  categoryId?: string;
  payload: string;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: categoryId
      ? backendRoutes.docs.categoryById(categoryId)
      : backendRoutes.docs.categories,
    fallbackMessage: "Failed to save category",
    method: categoryId ? "PATCH" : "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
  });

export const saveAdminDocsPage = async <TResponse>({
  token,
  pageId,
  payload,
}: AdminDocsRequestInput & {
  pageId?: string;
  payload: string;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: pageId ? backendRoutes.docs.pageById(pageId) : backendRoutes.docs.pages,
    fallbackMessage: "Failed to save page",
    method: pageId ? "PATCH" : "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
  });

export const deleteAdminDocsEntity = async <TResponse>({
  token,
  type,
  id,
}: AdminDocsRequestInput & {
  type: "category" | "page";
  id: string;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path:
      type === "category"
        ? backendRoutes.docs.categoryById(id)
        : backendRoutes.docs.pageById(id),
    fallbackMessage: "Failed to delete item",
    method: "DELETE",
    cacheTtlMs: 0,
  });

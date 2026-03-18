import { adminRequestJson } from "@/lib/api/admin-api";
import { backendRoutes } from "@/lib/api/backend-routes";

interface AdminNewsRequestInput {
  token: string | null;
}

export const fetchAllAdminNews = async <TItem>({
  token,
  pageSize = 100,
  maxPages = 20,
}: AdminNewsRequestInput & {
  pageSize?: number;
  maxPages?: number;
}): Promise<TItem[]> => {
  let offset = 0;
  const aggregated: TItem[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    const batch = await adminRequestJson<TItem[]>({
      token,
      path: backendRoutes.news.listAdmin({ limit: pageSize, offset }),
      fallbackMessage: "Failed to load news items",
      cacheTtlMs: page === 0 ? 0 : 4_000,
      minIntervalMs: 350,
    });

    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    aggregated.push(...batch);
    if (batch.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return aggregated;
};

export const saveAdminNewsItem = async <TResponse>({
  token,
  newsId,
  payload,
}: AdminNewsRequestInput & {
  newsId?: string;
  payload: string;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: newsId ? backendRoutes.news.byId(newsId) : backendRoutes.news.root,
    fallbackMessage: "Failed to save news item",
    method: newsId ? "PATCH" : "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
  });

export const updateAdminNewsStatus = async <TResponse>({
  token,
  newsId,
  isActive,
}: AdminNewsRequestInput & {
  newsId: string;
  isActive: boolean;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.news.byId(newsId),
    fallbackMessage: "Failed to update news status",
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ isActive }),
  });

export const deleteAdminNewsItem = async <TResponse>({
  token,
  newsId,
}: AdminNewsRequestInput & {
  newsId: string;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.news.byId(newsId),
    fallbackMessage: "Failed to delete news item",
    method: "DELETE",
    cacheTtlMs: 0,
  });

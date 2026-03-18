import { backendRoutes } from "@/lib/api/backend-routes";
import { publicRequestJson } from "@/lib/api/public-api";

interface FetchPublicNewsItemsOptions {
  active?: boolean;
  limit?: number;
}

export const fetchPublicNewsItems = async <TItem = unknown>({
  active = true,
  limit,
}: FetchPublicNewsItemsOptions = {}): Promise<TItem[]> =>
  publicRequestJson<TItem[]>({
    path: backendRoutes.news.list({ active, limit }),
    fallbackMessage: "Unable to fetch news feed.",
    cache: "no-store",
    cacheTtlMs: 3_000,
    minIntervalMs: 300,
  });

export const voteOnPublicNewsItem = async <TItem = unknown>(
  newsId: string,
  voteType: "up" | "down" | null,
): Promise<TItem> =>
  publicRequestJson<TItem>({
    path: backendRoutes.news.vote(newsId),
    fallbackMessage: "Vote request failed",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(voteType ? { voteType } : {}),
  });

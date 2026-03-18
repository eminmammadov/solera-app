import { backendRoutes } from "@/lib/api/backend-routes";
import { publicRequestJson } from "@/lib/api/public-api";

interface FetchPublicBlogPostsOptions {
  limit?: number;
  page?: number;
}

export const fetchPublicBlogPosts = async <TPost = unknown>({
  limit,
  page,
}: FetchPublicBlogPostsOptions = {}): Promise<TPost[]> =>
  publicRequestJson<TPost[]>({
    path: backendRoutes.blog.listPublic({ limit, page }),
    fallbackMessage: "Failed to load blog posts.",
    cacheTtlMs: 10_000,
    minIntervalMs: 500,
  });

import { adminRequestJson } from "@/lib/api/admin-api";
import { backendRoutes } from "@/lib/api/backend-routes";

interface AdminBlogRequestInput {
  token: string | null;
}

interface AdminBlogListParams {
  limit?: number;
  page?: number;
}

export interface BlogCoverUploadResponse {
  url: string;
}

export const fetchAdminBlogPosts = async <TResponse>({
  token,
  params,
}: AdminBlogRequestInput & {
  params?: AdminBlogListParams;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.blog.listAdmin(params),
    fallbackMessage: "Failed to fetch blog posts.",
    cacheTtlMs: 5_000,
    minIntervalMs: 350,
  });

export const fetchAdminBlogPostById = async <TResponse>({
  token,
  id,
}: AdminBlogRequestInput & {
  id: string;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.blog.byId(id),
    fallbackMessage: "Failed to load this post.",
    cacheTtlMs: 0,
    minIntervalMs: 250,
  });

export const createAdminBlogPost = async <TResponse, TBody>({
  token,
  payload,
}: AdminBlogRequestInput & {
  payload: TBody;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.blog.root,
    fallbackMessage: "Failed to create post.",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

export const updateAdminBlogPost = async <TResponse, TBody>({
  token,
  id,
  payload,
}: AdminBlogRequestInput & {
  id: string;
  payload: TBody;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.blog.byId(id),
    fallbackMessage: "Failed to update post.",
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

export const deleteAdminBlogPost = async <TResponse>({
  token,
  id,
}: AdminBlogRequestInput & {
  id: string;
}): Promise<TResponse> =>
  adminRequestJson<TResponse>({
    token,
    path: backendRoutes.blog.byId(id),
    fallbackMessage: "Failed to delete post.",
    method: "DELETE",
    cacheTtlMs: 0,
  });

export const uploadAdminBlogCoverImage = async ({
  token,
  file,
}: AdminBlogRequestInput & {
  file: File;
}): Promise<BlogCoverUploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  return adminRequestJson<BlogCoverUploadResponse>({
    token,
    path: backendRoutes.blog.uploadCover,
    fallbackMessage: "Failed to upload blog cover image.",
    method: "POST",
    body: formData,
  });
};

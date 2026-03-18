export const blogRoutes = {
  root: "/blog",
  uploadCover: "/blog/admin/upload-cover",
  listPublic: (params?: { limit?: number; page?: number }) => {
    const searchParams = new URLSearchParams()
    if (typeof params?.limit === "number") {
      searchParams.set("limit", String(params.limit))
    }
    if (typeof params?.page === "number") {
      searchParams.set("page", String(params.page))
    }
    const query = searchParams.toString()
    return query ? `/blog?${query}` : "/blog"
  },
  listAdmin: (params?: { limit?: number; page?: number }) => {
    const searchParams = new URLSearchParams()
    if (typeof params?.limit === "number") {
      searchParams.set("limit", String(params.limit))
    }
    if (typeof params?.page === "number") {
      searchParams.set("page", String(params.page))
    }
    const query = searchParams.toString()
    return query ? `/blog/admin?${query}` : "/blog/admin"
  },
  bySlug: (slug: string) => `/blog/slug/${encodeURIComponent(slug)}`,
  byId: (id: string) => `/blog/${encodeURIComponent(id)}`,
} as const

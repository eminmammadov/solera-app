export const newsRoutes = {
  root: "/news",
  list: (params?: { active?: boolean; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (typeof params?.active === "boolean") {
      searchParams.set("active", String(params.active))
    }
    if (typeof params?.limit === "number") {
      searchParams.set("limit", String(params.limit))
    }
    const query = searchParams.toString()
    return query ? `/news?${query}` : "/news"
  },
  listAdmin: (params?: { limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams()
    if (typeof params?.limit === "number") {
      searchParams.set("limit", String(params.limit))
    }
    if (typeof params?.offset === "number") {
      searchParams.set("offset", String(params.offset))
    }
    const query = searchParams.toString()
    return query ? `/news?${query}` : "/news"
  },
  byId: (newsId: string) => `/news/${encodeURIComponent(newsId)}`,
  vote: (newsId: string) => `/news/${encodeURIComponent(newsId)}/vote`,
} as const

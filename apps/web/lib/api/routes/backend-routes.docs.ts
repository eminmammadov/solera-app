export const docsRoutes = {
  root: "/docs",
  admin: "/docs/admin",
  settings: "/docs/settings",
  categories: "/docs/categories",
  categoryById: (id: string) => `/docs/categories/${encodeURIComponent(id)}`,
  pages: "/docs/pages",
  pageById: (id: string) => `/docs/pages/${encodeURIComponent(id)}`,
} as const

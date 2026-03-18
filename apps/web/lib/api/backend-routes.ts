import { auditRoutes } from "./routes/backend-routes.audit"
import { authRoutes } from "./routes/backend-routes.auth"
import { blogRoutes } from "./routes/backend-routes.blog"
import { docsRoutes } from "./routes/backend-routes.docs"
import { marketRoutes } from "./routes/backend-routes.market"
import { newsRoutes } from "./routes/backend-routes.news"
import { ohlcRoutes } from "./routes/backend-routes.ohlc"
import { stakingRoutes } from "./routes/backend-routes.staking"
import { systemRoutes } from "./routes/backend-routes.system"
import { usersRoutes } from "./routes/backend-routes.users"

export const backendRoutes = {
  auth: authRoutes,
  system: systemRoutes,
  audit: auditRoutes,
  users: usersRoutes,
  market: marketRoutes,
  staking: stakingRoutes,
  news: newsRoutes,
  docs: docsRoutes,
  ohlc: ohlcRoutes,
  blog: blogRoutes,
} as const

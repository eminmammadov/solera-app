export const usersRoutes = {
  metrics: "/users/metrics",
  profile: (walletAddress: string) =>
    `/users/profile?walletAddress=${encodeURIComponent(walletAddress)}`,
  access: (walletAddress: string) =>
    `/users/access?walletAddress=${encodeURIComponent(walletAddress)}`,
  authNonce: (walletAddress: string) =>
    `/users/auth/nonce?walletAddress=${encodeURIComponent(walletAddress)}`,
  authVerify: "/users/auth/verify",
  authLogout: "/users/auth/logout",
  sessionStart: "/users/session/start",
  sessionHeartbeat: "/users/session/heartbeat",
  sessionEnd: "/users/session/end",
  convertPreview: "/users/convert/preview",
  convertPrepare: "/users/convert/prepare",
  convertExecute: "/users/convert/execute",
  stakePreview: "/users/stakes/preview",
  stakePrepare: "/users/stakes/prepare",
  stakeExecute: "/users/stakes/execute",
  stakes: "/users/stakes",
  stakeClaimPrepare: (stakePositionId: string) =>
    `/users/stakes/${encodeURIComponent(stakePositionId)}/claim/prepare`,
  stakeClaimExecute: (stakePositionId: string) =>
    `/users/stakes/${encodeURIComponent(stakePositionId)}/claim/execute`,
  stakeClaim: (stakePositionId: string) =>
    `/users/stakes/${encodeURIComponent(stakePositionId)}/claim`,
  activity: "/users/activity",
  explorerFeed: "/users/explorer/feed",
  adminList: (params?: {
    search?: string
    country?: string
    onlineOnly?: boolean
    limit?: number
    offset?: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.search) {
      searchParams.set("search", params.search)
    }
    if (params?.country) {
      searchParams.set("country", params.country)
    }
    if (typeof params?.onlineOnly === "boolean") {
      searchParams.set("onlineOnly", String(params.onlineOnly))
    }
    if (typeof params?.limit === "number") {
      searchParams.set("limit", String(params.limit))
    }
    if (typeof params?.offset === "number") {
      searchParams.set("offset", String(params.offset))
    }
    const query = searchParams.toString()
    return query ? `/users/admin?${query}` : "/users/admin"
  },
  adminByWallet: (walletAddress: string) =>
    `/users/admin/${encodeURIComponent(walletAddress)}`,
  adminPortfolioEligibility: (walletAddress: string) =>
    `/users/admin/portfolio-eligibility?walletAddress=${encodeURIComponent(walletAddress)}`,
  adminBlockByWallet: (walletAddress: string) =>
    `/users/admin/${encodeURIComponent(walletAddress)}/block`,
} as const

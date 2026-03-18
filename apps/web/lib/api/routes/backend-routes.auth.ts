export const authRoutes = {
  nonce: (walletAddress: string) =>
    `/auth/nonce?walletAddress=${encodeURIComponent(walletAddress)}`,
  verify: "/auth/verify",
  me: "/auth/me",
  logout: "/auth/logout",
  admins: "/auth/admins",
  adminById: (adminId: string) => `/auth/admins/${encodeURIComponent(adminId)}`,
  customAdminRoleByName: (roleName: string) =>
    `/auth/admin-roles/custom/${encodeURIComponent(roleName)}`,
} as const

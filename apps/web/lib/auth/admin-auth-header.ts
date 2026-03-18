import { COOKIE_AUTH_TOKEN_MARKER } from "@/lib/auth/admin-auth-client";

export const buildAdminAuthHeader = (token: string | null): Record<string, string> => {
  if (!token || token === COOKIE_AUTH_TOKEN_MARKER) {
    return {};
  }

  return { Authorization: `Bearer ${token}` };
};

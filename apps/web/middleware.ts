import { NextRequest, NextResponse } from "next/server";
import {
  BLOCKED_ACCESS_NOTICE_COOKIE_MAX_AGE_SECONDS,
  BLOCKED_ACCESS_NOTICE_COOKIE_NAME,
  sanitizeBlockedAccessMessage,
} from "@/lib/access/blocked-access-notice-shared";
import { backendRoutes } from "@/lib/api/backend-routes";
import { isProductionRuntime } from "@/lib/config/env";
import { fetchMiddlewareBackendJson } from "@/lib/server/middleware-backend-json";

const HEADER_SETTINGS_PATH = `/api/backend${backendRoutes.system.header}`;
const USER_ACCESS_PATH = "/api/backend/users/access";
const PROFILE_PATH_PREFIX = "/profile";
const USER_AUTH_COOKIE_NAME = "solera_user_token";
const USER_AUTH_TOKEN_TYPE = "wallet_user";
const COOKIE_SECURE = isProductionRuntime();
const BLOCKED_ACCESS_CHECK_TIMEOUT_MS = 1_200;
const CONNECT_ENABLED_CHECK_TIMEOUT_MS = 1_200;
const CONNECT_ENABLED_CACHE_TTL_MS = 15_000;

interface WalletAccessResponse {
  walletAddress: string;
  allowed: boolean;
  isBlocked: boolean;
  message: string | null;
}

interface WalletAuthTokenPayload {
  walletAddress?: unknown;
  tokenType?: unknown;
  exp?: unknown;
}

interface HeaderSettingsResponse {
  connectEnabled?: boolean;
}

let connectEnabledCache: { value: boolean; expiresAt: number } | null = null;

const decodeBase64Url = (value: string): string | null => {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
    return atob(`${normalized}${padding}`);
  } catch {
    return null;
  }
};

const readWalletAddressFromUserToken = (token: string): string | null => {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const decodedPayload = decodeBase64Url(parts[1] ?? "");
  if (!decodedPayload) return null;

  try {
    const payload = JSON.parse(decodedPayload) as WalletAuthTokenPayload;
    if (payload.tokenType !== USER_AUTH_TOKEN_TYPE) return null;

    const nowEpoch = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === "number" && payload.exp <= nowEpoch) {
      return null;
    }

    const walletAddress =
      typeof payload.walletAddress === "string" ? payload.walletAddress.trim() : "";

    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)
      ? walletAddress
      : null;
  } catch {
    return null;
  }
};

const clearUserAuthCookie = (response: NextResponse) => {
  response.cookies.set({
    name: USER_AUTH_COOKIE_NAME,
    value: "",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    path: "/",
  });
};

const setBlockedNoticeCookie = (response: NextResponse, message?: string | null) => {
  response.cookies.set({
    name: BLOCKED_ACCESS_NOTICE_COOKIE_NAME,
    value: encodeURIComponent(sanitizeBlockedAccessMessage(message)),
    maxAge: BLOCKED_ACCESS_NOTICE_COOKIE_MAX_AGE_SECONDS,
    httpOnly: false,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    path: "/",
  });
};

const buildUserAccessDeniedResponse = (
  request: NextRequest,
  message?: string | null,
) => {
  const isHome = request.nextUrl.pathname === "/";
  const response = isHome
    ? NextResponse.next()
    : NextResponse.redirect(new URL("/", request.url));

  clearUserAuthCookie(response);
  setBlockedNoticeCookie(response, message);
  return response;
};

const buildClearUserCookieResponse = (request: NextRequest) => {
  const isProfileRoute =
    request.nextUrl.pathname === PROFILE_PATH_PREFIX ||
    request.nextUrl.pathname.startsWith(`${PROFILE_PATH_PREFIX}/`);
  const response = isProfileRoute
    ? NextResponse.redirect(new URL("/", request.url))
    : NextResponse.next();

  clearUserAuthCookie(response);
  return response;
};

async function fetchWalletAccessStatus(
  request: NextRequest,
  walletAddress: string,
): Promise<WalletAccessResponse | null> {
  return fetchMiddlewareBackendJson(request, {
    path: `${USER_ACCESS_PATH}?walletAddress=${encodeURIComponent(walletAddress)}`,
    timeoutMs: BLOCKED_ACCESS_CHECK_TIMEOUT_MS,
    fallbackValue: null,
    validate: (payload): payload is WalletAccessResponse =>
      typeof payload === "object" &&
      payload !== null &&
      typeof (payload as WalletAccessResponse).walletAddress === "string",
  });
}

async function isConnectEnabled(request: NextRequest): Promise<boolean> {
  const now = Date.now();
  if (connectEnabledCache && connectEnabledCache.expiresAt > now) {
    return connectEnabledCache.value;
  }

  const payload = await fetchMiddlewareBackendJson(request, {
    path: HEADER_SETTINGS_PATH,
    timeoutMs: CONNECT_ENABLED_CHECK_TIMEOUT_MS,
    fallbackValue: { connectEnabled: connectEnabledCache?.value ?? false },
    validate: (data): data is HeaderSettingsResponse =>
      typeof data === "object" && data !== null,
  });
  const enabled = payload.connectEnabled !== false;

  connectEnabledCache = {
    value: enabled,
    expiresAt: now + CONNECT_ENABLED_CACHE_TTL_MS,
  };

  return enabled;
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const isProfileRoute =
    pathname === PROFILE_PATH_PREFIX ||
    pathname.startsWith(`${PROFILE_PATH_PREFIX}/`);
  const userAuthCookie = request.cookies.get(USER_AUTH_COOKIE_NAME)?.value;

  if (isProfileRoute) {
    if (!userAuthCookie) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (isProfileRoute || Boolean(userAuthCookie)) {
    const connectEnabled = await isConnectEnabled(request);
    if (!connectEnabled) {
      if (userAuthCookie) {
        return buildClearUserCookieResponse(request);
      }
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (userAuthCookie) {
    const walletAddress = readWalletAddressFromUserToken(userAuthCookie);
    if (!walletAddress) {
      return buildClearUserCookieResponse(request);
    }

    const accessStatus = await fetchWalletAccessStatus(request, walletAddress);
    if (accessStatus && (!accessStatus.allowed || accessStatus.isBlocked)) {
      return buildUserAccessDeniedResponse(request, accessStatus.message);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};

import { NextRequest, NextResponse } from "next/server";
import {
} from "./proxy/auth-cookies";
import { resolveBackendBaseUrl } from "./proxy/backend-target";
import { applyProxyAuthorization } from "./proxy/authorization";
import { SOLERA_PROXY_SHARED_KEY, USER_AUTH_COOKIE_NAME, ADMIN_AUTH_COOKIE_NAME } from "./proxy/constants";
import { buildForwardedHeaders } from "./proxy/forwarded-headers";
import {
  buildBackendBaseResolutionErrorResponse,
  buildProxyUnavailableResponse,
} from "./proxy/error-response";
import { buildProxyLogoutResponse } from "./proxy/logout-response";
import { getOrIssueNewsClientId } from "./proxy/news-client";
import { buildProxyRoutePolicy } from "./proxy/route-policy";
import type { CookieInstruction, ProxyContext } from "./proxy/types";
import {
  buildAuthVerifyProxyResponse,
  buildUpstreamProxyResponse,
} from "./proxy/upstream-response";

async function proxyRequest(req: NextRequest, context: ProxyContext) {
  const { path } = await context.params;
  const policy = buildProxyRoutePolicy(req, path);

  const logoutResponse = buildProxyLogoutResponse(policy);
  if (logoutResponse) {
    return logoutResponse;
  }

  let backendBaseUrl = "";
  try {
    backendBaseUrl = await resolveBackendBaseUrl();
  } catch (resolveError) {
    return buildBackendBaseResolutionErrorResponse(resolveError);
  }

  const targetUrl = new URL(`${backendBaseUrl}/${policy.targetPath}`);
  targetUrl.search = req.nextUrl.search;

  const forwardedHeaders = buildForwardedHeaders(req);

  const cookiesToSet: CookieInstruction[] = [];
  if (policy.isNewsRoute) {
    try {
      const { clientId, cookieInstruction } = getOrIssueNewsClientId(req);
      forwardedHeaders.set("x-news-client-id", clientId);
      if (cookieInstruction) {
        cookiesToSet.push(cookieInstruction);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "News client tracking secret is not configured.";
      return NextResponse.json({ message }, { status: 500 });
    }
  }

  applyProxyAuthorization(req, forwardedHeaders, policy);

  forwardedHeaders.set("x-solera-proxy-key", SOLERA_PROXY_SHARED_KEY);

  const init: RequestInit = {
    method: req.method,
    headers: forwardedHeaders,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  try {
    const upstream = await fetch(targetUrl.toString(), init);

    if (policy.isAuthVerify || policy.isUserAuthVerify) {
      return buildAuthVerifyProxyResponse(upstream, policy, cookiesToSet);
    }

    return buildUpstreamProxyResponse(upstream, policy, cookiesToSet);
  } catch (proxyError) {
    return buildProxyUnavailableResponse(proxyError);
  }
}

export async function GET(req: NextRequest, context: ProxyContext) {
  return proxyRequest(req, context);
}

export async function POST(req: NextRequest, context: ProxyContext) {
  return proxyRequest(req, context);
}

export async function PATCH(req: NextRequest, context: ProxyContext) {
  return proxyRequest(req, context);
}

export async function DELETE(req: NextRequest, context: ProxyContext) {
  return proxyRequest(req, context);
}

export async function PUT(req: NextRequest, context: ProxyContext) {
  return proxyRequest(req, context);
}

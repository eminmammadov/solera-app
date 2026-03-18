import { NextRequest, NextResponse } from "next/server";
import { readOptionalEnv, validateHttpUrl } from "@/lib/config/env";
import { consumeRedisRateLimit } from "@/lib/server/redis-rate-limit";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ network: string }>;
}

type SupportedNetwork = "mainnet" | "devnet";

const SUPPORTED_NETWORKS = new Set<SupportedNetwork>(["mainnet", "devnet"]);
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RPC_BODY_BYTES = 128 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 420;
const RESPONSE_HEADERS = {
  "cache-control": "no-store",
};

const getClientIp = (request: NextRequest): string => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
};

const isRpcRequestItem = (value: unknown): value is { method: string } => {
  if (!value || typeof value !== "object") return false;
  const method = (value as { method?: unknown }).method;
  return typeof method === "string" && method.trim().length > 0;
};

const isValidRpcPayload = (payload: unknown) => {
  if (Array.isArray(payload)) {
    if (payload.length === 0) return false;
    return payload.every((item) => isRpcRequestItem(item));
  }
  return isRpcRequestItem(payload);
};

const getRpcUpstreamUrl = (network: SupportedNetwork): string => {
  const envName =
    network === "mainnet" ? "SOLANA_MAINNET_RPC_URL" : "SOLANA_DEVNET_RPC_URL";
  const raw = readOptionalEnv(envName);

  if (!raw) {
    throw new Error(`Missing ${envName}. Define it in root environment.`);
  }

  return validateHttpUrl(raw, envName);
};

const methodNotAllowed = () =>
  NextResponse.json(
    { message: "Method not allowed." },
    {
      status: 405,
      headers: {
        ...RESPONSE_HEADERS,
        allow: "POST, OPTIONS",
      },
    },
  );

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...RESPONSE_HEADERS,
      allow: "POST, OPTIONS",
    },
  });
}

export async function GET() {
  return methodNotAllowed();
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { network } = await context.params;

  if (!SUPPORTED_NETWORKS.has(network as SupportedNetwork)) {
    return NextResponse.json(
      { message: "Unsupported network." },
      { status: 404, headers: RESPONSE_HEADERS },
    );
  }

  const rateKey = `${network}:${getClientIp(request)}`;
  let rateLimited = false;
  try {
    const rateLimitResult = await consumeRedisRateLimit({
      key: `rpc:${rateKey}`,
      max: RATE_LIMIT_MAX_REQUESTS,
      windowMs: RATE_LIMIT_WINDOW_MS,
      keyPrefix: "solera:ratelimit:rpc",
    });
    rateLimited = !rateLimitResult.allowed;
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "RPC rate-limit backend unavailable.",
      },
      { status: 503, headers: RESPONSE_HEADERS },
    );
  }

  if (rateLimited) {
    return NextResponse.json(
      { message: "Too many RPC requests. Please retry shortly." },
      { status: 429, headers: RESPONSE_HEADERS },
    );
  }

  let rawBody = "";
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  if (!rawBody || rawBody.length > MAX_RPC_BODY_BYTES) {
    return NextResponse.json(
      { message: "RPC payload is invalid or too large." },
      { status: 413, headers: RESPONSE_HEADERS },
    );
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { message: "RPC payload must be valid JSON." },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  if (!isValidRpcPayload(parsedBody)) {
    return NextResponse.json(
      { message: "RPC payload format is invalid." },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  let upstreamUrl: string;
  try {
    upstreamUrl = getRpcUpstreamUrl(network as SupportedNetwork);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "RPC upstream is misconfigured.",
      },
      { status: 500, headers: RESPONSE_HEADERS },
    );
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: rawBody,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const responseText = await upstreamResponse.text();
    const contentType =
      upstreamResponse.headers.get("content-type") ?? "application/json";

    return new NextResponse(responseText, {
      status: upstreamResponse.status,
      headers: {
        ...RESPONSE_HEADERS,
        "content-type": contentType,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "RPC upstream is unreachable." },
      { status: 502, headers: RESPONSE_HEADERS },
    );
  }
}

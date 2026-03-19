import { NextRequest } from "next/server";
import { readValidatedHttpEnv } from "@/lib/config/env";
import { SOLERA_PROXY_SHARED_KEY } from "@/app/api/_shared/proxy/constants";

interface FetchMiddlewareBackendJsonOptions<TResponse> {
  path: string;
  timeoutMs: number;
  fallbackValue: TResponse;
  validate?: (payload: unknown) => payload is TResponse;
}

export const fetchMiddlewareBackendJson = async <TResponse>(
  request: NextRequest,
  {
    path,
    timeoutMs,
    fallbackValue,
    validate,
  }: FetchMiddlewareBackendJsonOptions<TResponse>,
): Promise<TResponse> => {
  const internalApiBaseUrl = readValidatedHttpEnv("SOLERA_API_INTERNAL_URL");
  const internalApiPath =
    path.startsWith("/api/backend") ? path.replace("/api/backend", "") : path;
  const targetUrl =
    internalApiBaseUrl && path.startsWith("/api/backend")
      ? new URL(
          internalApiPath.replace(/^\/+/, ""),
          `${internalApiBaseUrl.replace(/\/+$/, "")}/`,
        )
      : new URL(path, request.url);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(targetUrl.toString(), {
      cache: "no-store",
      headers: {
        accept: "application/json",
        ...(SOLERA_PROXY_SHARED_KEY
          ? { "x-solera-proxy-key": SOLERA_PROXY_SHARED_KEY }
          : {}),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return fallbackValue;
    }

    const payload: unknown = await response.json();
    if (validate && !validate(payload)) {
      return fallbackValue;
    }

    return (payload as TResponse) ?? fallbackValue;
  } catch {
    return fallbackValue;
  } finally {
    clearTimeout(timeoutId);
  }
};

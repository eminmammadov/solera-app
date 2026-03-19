import { NextRequest } from "next/server";
import { readValidatedHttpEnv } from "@/lib/config/env";
import { SOLERA_PROXY_SHARED_KEY } from "@/app/api/_shared/proxy/constants";

interface FetchMiddlewareBackendJsonOptions<TResponse> {
  path: string;
  timeoutMs: number;
  fallbackValue: TResponse;
  validate?: (payload: unknown) => payload is TResponse;
}

const normalizeUrl = (value: string) => value.replace(/\/+$/, "");

const buildCandidateUrls = (request: NextRequest, path: string): string[] => {
  const candidates = new Set<string>();
  const internalApiBaseUrl = readValidatedHttpEnv("SOLERA_API_INTERNAL_URL");
  const publicAppOrigin =
    readValidatedHttpEnv("APP_ORIGIN") ??
    readValidatedHttpEnv("NEXT_PUBLIC_APP_ORIGIN");
  const internalApiPath =
    path.startsWith("/api/backend") ? path.replace("/api/backend", "") : path;

  if (internalApiBaseUrl && path.startsWith("/api/backend")) {
    candidates.add(
      new URL(
        internalApiPath.replace(/^\/+/, ""),
        `${normalizeUrl(internalApiBaseUrl)}/`,
      ).toString(),
    );
  }

  if (publicAppOrigin) {
    candidates.add(new URL(path, `${normalizeUrl(publicAppOrigin)}/`).toString());
  }

  candidates.add(new URL(path, request.url).toString());

  return [...candidates];
};

export const fetchMiddlewareBackendJson = async <TResponse>(
  request: NextRequest,
  {
    path,
    timeoutMs,
    fallbackValue,
    validate,
  }: FetchMiddlewareBackendJsonOptions<TResponse>,
): Promise<TResponse> => {
  const targetUrls = buildCandidateUrls(request, path);

  for (const targetUrl of targetUrls) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(targetUrl, {
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
        continue;
      }

      const payload: unknown = await response.json();
      if (validate && !validate(payload)) {
        continue;
      }

      return (payload as TResponse) ?? fallbackValue;
    } catch {
      continue;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return fallbackValue;
};

import { NextRequest } from "next/server";

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
  const targetUrl = new URL(path, request.url);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(targetUrl.toString(), {
      cache: "no-store",
      headers: { accept: "application/json" },
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

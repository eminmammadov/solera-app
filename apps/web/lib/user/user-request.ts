import { readHttpErrorMessage } from "@/lib/api/http-error";
import { publicRequest } from "@/lib/api/public-api";
import type { SessionApiResult, SessionErrorType } from "@/lib/user/user-types";

export async function postJson<TResponse, TPayload extends object>(
  path: string,
  payload: TPayload,
  keepalive = false,
): Promise<TResponse | null> {
  try {
    const res = await publicRequest(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      keepalive,
      credentials: "include",
      networkMessage: "Network request failed.",
    });

    if (!res.ok) return null;
    return (await res.json()) as TResponse;
  } catch {
    return null;
  }
}

const toSessionErrorType = (status: number | null): SessionErrorType => {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  return "network";
};

const parseResponseErrorMessage = async (res: Response): Promise<string | null> =>
  readHttpErrorMessage(res, "Request failed.");

export const postSessionJson = async <TResponse, TPayload extends object>(
  path: string,
  payload: TPayload,
  keepalive = false,
): Promise<SessionApiResult<TResponse>> => {
  try {
    const res = await publicRequest(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      keepalive,
      credentials: "include",
      networkMessage: "Network request failed.",
    });

    if (!res.ok) {
      return {
        success: false,
        data: null,
        error: {
          type: toSessionErrorType(res.status),
          status: res.status,
          message: (await parseResponseErrorMessage(res)) || "Request failed.",
        },
      };
    }

    return {
      success: true,
      data: (await res.json()) as TResponse,
      error: null,
    };
  } catch {
    return {
      success: false,
      data: null,
      error: {
        type: "network",
        status: null,
        message: "Network request failed.",
      },
    };
  }
};

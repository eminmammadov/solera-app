import { backendRoutes } from "@/lib/api/backend-routes";
import { publicRequestJson } from "@/lib/api/public-api";
import { postJson } from "@/lib/user/user-request";
import type {
  TrackWalletActivityInput,
  WalletActivityType,
  WalletExplorerActivity,
  WalletExplorerFeedResponse,
} from "@/lib/user/user-types";

export const trackWalletActivity = async (
  payload: TrackWalletActivityInput,
): Promise<WalletExplorerActivity | null> =>
  postJson<WalletExplorerActivity, TrackWalletActivityInput>(
    backendRoutes.users.activity,
    payload,
  );

export const fetchExplorerFeed = async (params?: {
  search?: string;
  type?: WalletActivityType | "ALL";
  limit?: number;
  cursor?: string | null;
}): Promise<WalletExplorerFeedResponse | null> => {
  try {
    const query = new URLSearchParams();

    const normalizedSearch = params?.search?.trim();
    if (normalizedSearch) query.set("search", normalizedSearch);

    const normalizedType = params?.type?.trim().toUpperCase();
    if (normalizedType && normalizedType !== "ALL") {
      query.set("type", normalizedType);
    }

    if (typeof params?.limit === "number" && Number.isFinite(params.limit)) {
      query.set("limit", Math.trunc(params.limit).toString());
    }

    if (params?.cursor) {
      query.set("cursor", params.cursor);
    }

    const queryString = query.toString();
    return await publicRequestJson<WalletExplorerFeedResponse>({
      path: `${backendRoutes.users.explorerFeed}${queryString ? `?${queryString}` : ""}`,
      fallbackMessage: "Failed to load explorer feed.",
      cache: "no-store",
      cacheTtlMs: 1_500,
      minIntervalMs: 250,
    });
  } catch {
    return null;
  }
};

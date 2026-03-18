import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { backendRoutes } from "@/lib/api/backend-routes";
import { readValidatedHttpEnv } from "@/lib/config/env";
import { publicRequestJson } from "@/lib/api/public-api";
import {
  normalizeHeaderBranding,
  type HeaderNetwork,
} from "@/lib/header/header-branding";

const NETWORK_CACHE_TTL_MS = 60_000;
export const SOLANA_RUNTIME_NETWORK_CHANGED_EVENT =
  "solera:runtime-network-changed";
const RUNTIME_NETWORK_STORAGE_KEY = "solera_runtime_network";
const RUNTIME_NETWORK_BROADCAST_CHANNEL = "solera-runtime-network";

let cachedNetwork: HeaderNetwork | null = null;
let cachedAt = 0;
let inflightRequest: Promise<HeaderNetwork> | null = null;
let broadcastChannelInstance: BroadcastChannel | null = null;

const readServerAppOrigin = () => {
  const appOrigin =
    readValidatedHttpEnv("APP_ORIGIN") ??
    readValidatedHttpEnv("NEXT_PUBLIC_APP_ORIGIN");

  if (!appOrigin) {
    throw new Error(
      "Missing APP_ORIGIN (or NEXT_PUBLIC_APP_ORIGIN) for server RPC proxy endpoint resolution.",
    );
  }

  return appOrigin;
};

export const toWalletAdapterNetwork = (
  network: HeaderNetwork,
): WalletAdapterNetwork =>
  network === "mainnet"
    ? WalletAdapterNetwork.Mainnet
    : WalletAdapterNetwork.Devnet;

export const resolveSolanaRpcEndpoint = (network: HeaderNetwork): string => {
  // Keep paid RPC credentials server-side by proxying all browser RPC traffic
  // through Next.js API routes.
  const proxyPath = `/api/solana-rpc/${network}`;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${proxyPath}`;
  }

  return `${readServerAppOrigin()}${proxyPath}`;
};

export const getCachedRuntimeNetwork = (): HeaderNetwork | null => {
  if (
    cachedNetwork &&
    Date.now() - cachedAt <= NETWORK_CACHE_TTL_MS
  ) {
    return cachedNetwork;
  }
  return null;
};

export const primeRuntimeNetworkCache = (network: HeaderNetwork) => {
  cachedNetwork = network;
  cachedAt = Date.now();
};

const isHeaderNetwork = (value: unknown): value is HeaderNetwork =>
  value === "devnet" || value === "mainnet";

const emitRuntimeNetworkChangedEvent = (network: HeaderNetwork) => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<HeaderNetwork>(SOLANA_RUNTIME_NETWORK_CHANGED_EVENT, {
      detail: network,
    }),
  );
};

const getRuntimeNetworkBroadcastChannel = () => {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }

  if (!broadcastChannelInstance) {
    broadcastChannelInstance = new BroadcastChannel(
      RUNTIME_NETWORK_BROADCAST_CHANNEL,
    );
  }

  return broadcastChannelInstance;
};

export const readBroadcastRuntimeNetwork = (
  payload: unknown,
): HeaderNetwork | null => {
  if (!payload || typeof payload !== "object") return null;
  const network = (payload as { network?: unknown }).network;
  return isHeaderNetwork(network) ? network : null;
};

export const broadcastRuntimeNetworkChange = (network: HeaderNetwork) => {
  primeRuntimeNetworkCache(network);

  if (typeof window === "undefined") return;

  emitRuntimeNetworkChangedEvent(network);

  try {
    window.localStorage.setItem(
      RUNTIME_NETWORK_STORAGE_KEY,
      JSON.stringify({
        network,
        ts: Date.now(),
      }),
    );
  } catch {
    // Ignore storage quota/privacy failures.
  }

  try {
    getRuntimeNetworkBroadcastChannel()?.postMessage({ network });
  } catch {
    // Ignore BroadcastChannel availability/runtime failures.
  }
};

export const subscribeToRuntimeNetworkChanges = (
  onChange: (network: HeaderNetwork) => void,
) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== RUNTIME_NETWORK_STORAGE_KEY || !event.newValue) return;

    try {
      const parsed = JSON.parse(event.newValue) as { network?: unknown };
      const nextNetwork = readBroadcastRuntimeNetwork(parsed);
      if (!nextNetwork) return;
      primeRuntimeNetworkCache(nextNetwork);
      onChange(nextNetwork);
    } catch {
      // Ignore malformed storage payloads.
    }
  };

  const channel = getRuntimeNetworkBroadcastChannel();
  const handleChannelMessage = (event: MessageEvent<unknown>) => {
    const nextNetwork = readBroadcastRuntimeNetwork(event.data);
    if (!nextNetwork) return;
    primeRuntimeNetworkCache(nextNetwork);
    onChange(nextNetwork);
  };

  window.addEventListener("storage", handleStorage);
  channel?.addEventListener("message", handleChannelMessage);

  return () => {
    window.removeEventListener("storage", handleStorage);
    channel?.removeEventListener("message", handleChannelMessage);
  };
};

export const fetchRuntimeHeaderNetwork = async (
  force = false,
): Promise<HeaderNetwork> => {
  if (!force) {
    const cached = getCachedRuntimeNetwork();
    if (cached) return cached;
  }

  if (inflightRequest) {
    return inflightRequest;
  }

  inflightRequest = publicRequestJson<unknown>({
      path: backendRoutes.system.header,
      fallbackMessage: "Failed to load header network settings.",
      cache: "no-store",
      cacheTtlMs: 5_000,
      minIntervalMs: 250,
    })
    .then((payload) => normalizeHeaderBranding(payload).network)
    .catch(() => cachedNetwork ?? "devnet")
    .finally(() => {
      inflightRequest = null;
    });

  const network = await inflightRequest;
  primeRuntimeNetworkCache(network);
  return network;
};

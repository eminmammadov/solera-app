"use client";

import { useEffect, useMemo, useState } from "react";
import type { HeaderNetwork } from "@/lib/header/header-branding";
import {
  SOLANA_RUNTIME_NETWORK_CHANGED_EVENT,
  fetchRuntimeHeaderNetwork,
  getCachedRuntimeNetwork,
  primeRuntimeNetworkCache,
  resolveSolanaRpcEndpoint,
  subscribeToRuntimeNetworkChanges,
  toWalletAdapterNetwork,
} from "@/lib/solana/solana-network";

const NETWORK_REFRESH_INTERVAL_MS = 60_000;

export function useRuntimeSolanaNetwork() {
  const [runtimeNetwork, setRuntimeNetwork] = useState<HeaderNetwork>(
    () => getCachedRuntimeNetwork() ?? "devnet",
  );

  useEffect(() => {
    let mounted = true;

    const syncNetwork = async (force = false) => {
      const network = await fetchRuntimeHeaderNetwork(force);
      if (!mounted) return;
      setRuntimeNetwork((prev) => (prev === network ? prev : network));
    };

    void syncNetwork(false);

    const intervalId = window.setInterval(() => {
      void syncNetwork(false);
    }, NETWORK_REFRESH_INTERVAL_MS);

    const handleWindowFocus = () => {
      void syncNetwork(true);
    };
    window.addEventListener("focus", handleWindowFocus);

    const handleRuntimeNetworkChanged = (event: Event) => {
      const customEvent = event as CustomEvent<HeaderNetwork>;
      const nextNetwork = customEvent.detail;
      if (nextNetwork !== "devnet" && nextNetwork !== "mainnet") return;
      primeRuntimeNetworkCache(nextNetwork);
      setRuntimeNetwork((prev) =>
        prev === nextNetwork ? prev : nextNetwork,
      );
    };
    window.addEventListener(
      SOLANA_RUNTIME_NETWORK_CHANGED_EVENT,
      handleRuntimeNetworkChanged,
    );

    const unsubscribeCrossTab = subscribeToRuntimeNetworkChanges(
      (nextNetwork) => {
        setRuntimeNetwork((prev) =>
          prev === nextNetwork ? prev : nextNetwork,
        );
      },
    );

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener(
        SOLANA_RUNTIME_NETWORK_CHANGED_EVENT,
        handleRuntimeNetworkChanged,
      );
      unsubscribeCrossTab();
    };
  }, []);

  const walletNetwork = useMemo(
    () => toWalletAdapterNetwork(runtimeNetwork),
    [runtimeNetwork],
  );
  const endpoint = useMemo(
    () => resolveSolanaRpcEndpoint(runtimeNetwork),
    [runtimeNetwork],
  );

  return { runtimeNetwork, walletNetwork, endpoint };
}

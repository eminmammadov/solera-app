"use client";

import { BlockedAccessModal } from "@/components/modals/BlockedAccessModal";
import { MarketDataSync } from "@/components/providers/MarketDataSync";
import { UserDataSync } from "@/components/providers/UserDataSync";
import { UserSessionTracker } from "@/components/providers/UserSessionTracker";
import { WalletStoreSync } from "@/components/providers/WalletStoreSync";

export function PublicRuntimeSync() {
  return (
    <>
      <WalletStoreSync />
      <UserSessionTracker />
      <UserDataSync />
      <MarketDataSync />
      <BlockedAccessModal />
    </>
  );
}

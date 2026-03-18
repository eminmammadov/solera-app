export const marketRoutes = {
  tokens: "/market/tokens",
  priceByMints: (mints: string[]) =>
    `/market/prices/by-mints?mints=${encodeURIComponent(mints.join(","))}`,
  adminTokens: "/market/admin/tokens",
  adminTokenById: (id: string) => `/market/admin/tokens/${encodeURIComponent(id)}`,
  adminLivePricing: "/market/admin/live-pricing",
  adminLivePricingSync: "/market/admin/live-pricing/sync",
  adminTokenUpload: "/market/admin/tokens/upload",
  adminStakingRuntime: "/market/admin/staking/runtime",
  adminStakingCutoverPolicy: "/market/admin/staking/cutover/policy",
  adminStakingMigrationSnapshot: (network?: "devnet" | "mainnet") =>
    network
      ? `/market/admin/staking/migration/snapshot?network=${encodeURIComponent(network)}`
      : "/market/admin/staking/migration/snapshot",
  adminStakingMigrationExport: (
    format: "json" | "csv",
    network?: "devnet" | "mainnet",
  ) =>
    network
      ? `/market/admin/staking/migration/export?format=${encodeURIComponent(format)}&network=${encodeURIComponent(network)}`
      : `/market/admin/staking/migration/export?format=${encodeURIComponent(format)}`,
  adminStakingTokens: (network?: "devnet" | "mainnet") =>
    network ? `/market/admin/staking/tokens?network=${encodeURIComponent(network)}` : "/market/admin/staking/tokens",
  adminStakingTokenById: (id: string, network?: "devnet" | "mainnet") =>
    network
      ? `/market/admin/staking/tokens/${encodeURIComponent(id)}?network=${encodeURIComponent(network)}`
      : `/market/admin/staking/tokens/${encodeURIComponent(id)}`,
  adminStakingPrepareSync: (id: string, network?: "devnet" | "mainnet") =>
    network
      ? `/market/admin/staking/tokens/${encodeURIComponent(id)}/prepare-sync?network=${encodeURIComponent(network)}`
      : `/market/admin/staking/tokens/${encodeURIComponent(id)}/prepare-sync`,
  adminStakingPrepareGlobalConfig: (network?: "devnet" | "mainnet") =>
    network
      ? `/market/admin/staking/global-config/prepare?network=${encodeURIComponent(network)}`
      : "/market/admin/staking/global-config/prepare",
  adminStakingPrepareSwapNode: (network?: "devnet" | "mainnet") =>
    network
      ? `/market/admin/staking/swap-node/prepare?network=${encodeURIComponent(network)}`
      : "/market/admin/staking/swap-node/prepare",
  adminStakingPrepareFundingCoverage: (network?: "devnet" | "mainnet") =>
    network
      ? `/market/admin/staking/funding/prepare-coverage?network=${encodeURIComponent(network)}`
      : "/market/admin/staking/funding/prepare-coverage",
  adminStakingFundingBatches: (network?: "devnet" | "mainnet") =>
    network
      ? `/market/admin/staking/funding/batches?network=${encodeURIComponent(network)}`
      : "/market/admin/staking/funding/batches",
  adminStakingExecute: "/market/admin/staking/execute",
  adminStakingMirrorSync: (network?: "devnet" | "mainnet") =>
    network
      ? `/market/admin/staking/mirror/sync?network=${encodeURIComponent(network)}`
      : "/market/admin/staking/mirror/sync",
  adminStakingDevnetSync: (network?: "devnet" | "mainnet") =>
    network
      ? `/market/admin/staking/mirror/sync?network=${encodeURIComponent(network)}`
      : "/market/admin/staking/mirror/sync",
} as const

export const stakingRoutes = {
  adminRuntime: "/staking/admin/runtime",
  adminCutoverPolicy: "/staking/admin/cutover/policy",
  adminMigrationSnapshot: (network?: "devnet" | "mainnet") =>
    network
      ? `/staking/admin/migration/snapshot?network=${encodeURIComponent(network)}`
      : "/staking/admin/migration/snapshot",
  adminMigrationExport: (
    format: "json" | "csv",
    network?: "devnet" | "mainnet",
  ) =>
    network
      ? `/staking/admin/migration/export?format=${encodeURIComponent(format)}&network=${encodeURIComponent(network)}`
      : `/staking/admin/migration/export?format=${encodeURIComponent(format)}`,
  adminTokens: (network?: "devnet" | "mainnet") =>
    network ? `/staking/admin/tokens?network=${encodeURIComponent(network)}` : "/staking/admin/tokens",
  adminTokenById: (id: string, network?: "devnet" | "mainnet") =>
    network
      ? `/staking/admin/tokens/${encodeURIComponent(id)}?network=${encodeURIComponent(network)}`
      : `/staking/admin/tokens/${encodeURIComponent(id)}`,
  adminPrepareSync: (id: string, network?: "devnet" | "mainnet") =>
    network
      ? `/staking/admin/tokens/${encodeURIComponent(id)}/prepare-sync?network=${encodeURIComponent(network)}`
      : `/staking/admin/tokens/${encodeURIComponent(id)}/prepare-sync`,
  adminPrepareGlobalConfig: (network?: "devnet" | "mainnet") =>
    network
      ? `/staking/admin/global-config/prepare?network=${encodeURIComponent(network)}`
      : "/staking/admin/global-config/prepare",
  adminPrepareSwapNode: (network?: "devnet" | "mainnet") =>
    network
      ? `/staking/admin/swap-node/prepare?network=${encodeURIComponent(network)}`
      : "/staking/admin/swap-node/prepare",
  adminPrepareFundingCoverage: (network?: "devnet" | "mainnet") =>
    network
      ? `/staking/admin/funding/prepare-coverage?network=${encodeURIComponent(network)}`
      : "/staking/admin/funding/prepare-coverage",
  adminFundingBatches: (network?: "devnet" | "mainnet") =>
    network
      ? `/staking/admin/funding/batches?network=${encodeURIComponent(network)}`
      : "/staking/admin/funding/batches",
  adminExecute: "/staking/admin/execute",
  adminMirrorSync: (network?: "devnet" | "mainnet") =>
    network
      ? `/staking/admin/mirror/sync?network=${encodeURIComponent(network)}`
      : "/staking/admin/mirror/sync",
} as const

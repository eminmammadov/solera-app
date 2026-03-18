"use client";

import { Database, Loader2, Radar, SendHorizonal } from "lucide-react";
import type {
  AdminStakingExecutionPayload,
  AdminStakingRuntimeSnapshot,
  FundingBatchProjection,
  PreparedAdminStakingExecution,
  StakingMirrorSyncResult,
  TokenStakeSyncPreparation,
} from "@/components/admin/staking/types";

interface StakingRuntimeSectionProps {
  runtime: AdminStakingRuntimeSnapshot | null;
  isLoading: boolean;
  isSyncingMirror: boolean;
  lastMirrorSync: StakingMirrorSyncResult | null;
  preparedSync: TokenStakeSyncPreparation | null;
  preparedExecution: PreparedAdminStakingExecution | null;
  isPreparingGlobalConfig: boolean;
  isPreparingSwapNode: boolean;
  isPreparingFundingCoverage: boolean;
  isExecutingPreparedInstruction: boolean;
  exportFormatInFlight: "json" | "csv" | null;
  lastExecution: AdminStakingExecutionPayload | null;
  fundingBatches: FundingBatchProjection[];
  onSyncMirror: () => void;
  onPrepareGlobalConfig: () => void;
  onPrepareSwapNode: () => void;
  onPrepareFundingCoverage: () => void;
  onExecutePreparedInstruction: () => void;
  onExportMigrationSnapshot: (format: "json" | "csv") => void;
}

export function StakingRuntimeSection({
  runtime,
  isLoading,
  isSyncingMirror,
  lastMirrorSync,
  preparedSync,
  preparedExecution,
  isPreparingGlobalConfig,
  isPreparingSwapNode,
  isPreparingFundingCoverage,
  isExecutingPreparedInstruction,
  exportFormatInFlight,
  lastExecution,
  fundingBatches,
  onSyncMirror,
  onPrepareGlobalConfig,
  onPrepareSwapNode,
  onPrepareFundingCoverage,
  onExecutePreparedInstruction,
  onExportMigrationSnapshot,
}: StakingRuntimeSectionProps) {
  const network = runtime?.activeNetwork ?? "devnet";
  const programsReady = runtime?.programs.isReady ?? false;
  const mirrorAvailable = runtime?.mirror.available ?? false;
  const fundingOverview = runtime?.fundingOverview ?? null;
  const cutoverPolicy = runtime?.cutoverPolicy ?? null;
  const migrationSnapshot = runtime?.migrationSnapshot ?? null;
  const mainnetHardening = runtime?.mainnetHardening ?? null;
  const coverageRatio = fundingOverview?.coverageRatio ?? null;
  const instructionPayload = preparedSync?.instructionPayload ?? null;
  const previewAccounts = instructionPayload?.accounts ?? [];
  const cutoverActive =
    (cutoverPolicy?.migrationWindowActive ?? false) ||
    (cutoverPolicy?.freezeLegacyStakeWrites ?? false) ||
    (cutoverPolicy?.freezeLegacyClaimWrites ?? false);

  return (
    <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radar className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-white">Staking On-Chain Runtime</h3>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Devnet-first staking registry, PDA preparation and mirror health for the admin token workflow.
          </p>
        </div>
        <button
          onClick={onSyncMirror}
          disabled={isLoading || isSyncingMirror || network !== "devnet"}
          className="px-3 py-2 bg-sky-500/10 text-sky-300 border border-sky-500/20 rounded-lg text-xs font-medium hover:bg-sky-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
        >
          {isSyncingMirror ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
          Sync Staking Mirror
        </button>
      </div>

      {cutoverActive ? (
        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-amber-300" />
            <div>
              <div className="text-sm font-semibold text-amber-200">Staking Cutover Window Is Active</div>
              <div className="mt-1 text-[12px] leading-5 text-amber-100/80">
                {cutoverPolicy?.reason ??
                  "Legacy stake or claim writes are currently frozen. Keep migration execution and operator actions coordinated from this panel."}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={onPrepareGlobalConfig}
          disabled={isLoading || isPreparingGlobalConfig || runtime?.globalConfigInitialized === true}
          className="px-3 py-2 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
        >
          {isPreparingGlobalConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SendHorizonal className="w-3.5 h-3.5" />}
          {runtime?.globalConfigInitialized ? "Global Config Ready" : "Prepare Global Config Init"}
        </button>
        <button
          onClick={onPrepareSwapNode}
          disabled={isLoading || isPreparingSwapNode || runtime?.swapNodeInitialized === true}
          className="px-3 py-2 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-lg text-xs font-medium hover:bg-cyan-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
        >
          {isPreparingSwapNode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SendHorizonal className="w-3.5 h-3.5" />}
          {runtime?.swapNodeInitialized ? "Swap Node Ready" : "Prepare Swap Node Init"}
        </button>
        <button
          onClick={onPrepareFundingCoverage}
          disabled={
            isLoading ||
            isPreparingFundingCoverage ||
            !runtime?.swapNodeInitialized ||
            (fundingOverview?.pendingFundingDeficitRa ?? 0) <= 0
          }
          className="px-3 py-2 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-lg text-xs font-medium hover:bg-amber-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
        >
          {isPreparingFundingCoverage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SendHorizonal className="w-3.5 h-3.5" />}
          Prepare Reward Coverage Batch
        </button>
        <button
          onClick={onExecutePreparedInstruction}
          disabled={!preparedExecution || isExecutingPreparedInstruction}
          className="px-3 py-2 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-lg text-xs font-medium hover:bg-purple-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
        >
          {isExecutingPreparedInstruction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SendHorizonal className="w-3.5 h-3.5" />}
          Execute Prepared Instruction
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 text-sm">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-3">
          <div className="text-[11px] uppercase tracking-wider text-neutral-500">Active Network</div>
          <div className={`mt-1 font-semibold uppercase ${network === "mainnet" ? "text-emerald-400" : "text-sky-400"}`}>{network}</div>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-3">
          <div className="text-[11px] uppercase tracking-wider text-neutral-500">Program Registry</div>
          <div className={`mt-1 font-semibold ${programsReady ? "text-emerald-300" : "text-amber-300"}`}>
            {programsReady ? "Configured" : "Waiting for env"}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 truncate">
            {runtime?.programs.stakePoolProgramId ?? "Missing devnet program IDs"}
          </div>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-3">
          <div className="text-[11px] uppercase tracking-wider text-neutral-500">Staking Mirror</div>
          <div className={`mt-1 font-semibold ${mirrorAvailable ? "text-emerald-300" : "text-neutral-300"}`}>
            {runtime?.mirror.configured ? (mirrorAvailable ? "Healthy" : "Unavailable") : "Not configured"}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            {runtime?.mirror.message ?? "Mirror status unavailable"}
          </div>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-3">
          <div className="text-[11px] uppercase tracking-wider text-neutral-500">Config Candidates</div>
          <div className="mt-1 font-semibold text-white">{runtime?.availableTokenConfigs ?? 0}</div>
          <div className="mt-1 text-[11px] text-neutral-500">
            Tokens mapped into on-chain config projections
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-sm">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-3">
          <div className="text-[11px] uppercase tracking-wider text-neutral-500">Global Config PDA</div>
          <div className="mt-1 font-semibold text-white break-all">
            {runtime?.globalConfigPda ?? "Program ID unavailable"}
          </div>
          <div className={`mt-1 text-[11px] ${runtime?.globalConfigInitialized ? "text-emerald-300" : "text-amber-300"}`}>
            {runtime?.globalConfigInitialized ? "Initialized on-chain" : "Not initialized yet"}
          </div>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-3">
          <div className="text-[11px] uppercase tracking-wider text-neutral-500">Swap Node Config PDA</div>
          <div className="mt-1 font-semibold text-white break-all">
            {runtime?.swapNodeConfigPda ?? "Program ID unavailable"}
          </div>
          <div className={`mt-1 text-[11px] ${runtime?.swapNodeInitialized ? "text-emerald-300" : "text-amber-300"}`}>
            {runtime?.swapNodeInitialized ? "Initialized on-chain" : "Not initialized yet"}
          </div>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-3">
          <div className="text-[11px] uppercase tracking-wider text-neutral-500">Last On-Chain Execution</div>
          <div className="mt-1 font-semibold text-white">
            {lastExecution?.action ?? "No execution yet"}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 break-all">
            {lastExecution?.signature ?? "Prepared instructions will surface their transaction signature here."}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3 text-sm">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-3">
          <div className="text-[11px] uppercase tracking-wider text-neutral-500">Reward Vault Balance</div>
            <div className="mt-1 font-semibold text-white">
            {(fundingOverview?.rewardVaultBalanceRa ?? 0).toFixed(4)} RA
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">Current on-chain reward liquidity</div>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-3">
          <div className="text-[11px] uppercase tracking-wider text-neutral-500">Open Liability</div>
            <div className="mt-1 font-semibold text-white">
            {(fundingOverview?.totalOpenLiabilityRa ?? 0).toFixed(4)} RA
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            Claimable: {(fundingOverview?.claimableLiabilityRa ?? 0).toFixed(4)} RA
          </div>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-3">
          <div className="text-[11px] uppercase tracking-wider text-neutral-500">Funding Deficit</div>
          <div className={`mt-1 font-semibold ${(fundingOverview?.pendingFundingDeficitRa ?? 0) > 0 ? "text-amber-300" : "text-emerald-300"}`}>
            {(fundingOverview?.pendingFundingDeficitRa ?? 0).toFixed(4)} RA
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            Coverage: {coverageRatio !== null
              ? `${(coverageRatio * 100).toFixed(1)}%`
              : "N/A"}
          </div>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-3">
          <div className="text-[11px] uppercase tracking-wider text-neutral-500">Mirror Batch Ledger</div>
          <div className="mt-1 font-semibold text-white">
            {fundingOverview?.pendingBatches ?? 0} pending / {fundingOverview?.executedBatches ?? 0} executed
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            Active positions: {fundingOverview?.activePositions ?? 0} • Claimable: {fundingOverview?.claimablePositions ?? 0}
          </div>
        </div>
      </div>

      {lastMirrorSync ? (
        <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-[11px] text-neutral-400">
          Last mirror sync: <span className="text-neutral-200">{lastMirrorSync.writtenConfigs}</span> token configs written to <span className="uppercase text-sky-300">{lastMirrorSync.network}</span>.
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-sm">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-white">Mainnet Hardening</h4>
              <p className="text-[11px] text-neutral-500 mt-1">
                Code-level safety switches that must be open before critical mainnet staking actions can be prepared.
              </p>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
              mainnetHardening?.registryReady &&
              mainnetHardening.readyForConfigUpdates
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                : "border-amber-500/20 bg-amber-500/10 text-amber-300"
            }`}>
              {mainnetHardening?.registryReady ? "Guarded" : "Blocked"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-[12px]">
            <div className="rounded-lg border border-neutral-800 bg-[#111111] px-3 py-3">
              <div className="text-neutral-500 uppercase tracking-wider">Registry</div>
              <div className={`mt-1 font-semibold ${mainnetHardening?.registryReady ? "text-emerald-300" : "text-amber-300"}`}>
                {mainnetHardening?.registryReady ? "Ready" : "Incomplete"}
              </div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-[#111111] px-3 py-3">
              <div className="text-neutral-500 uppercase tracking-wider">Multisig</div>
              <div className="mt-1 font-semibold text-neutral-200">
                {mainnetHardening?.requireMultisigAuthority ? "Required" : "Optional"}
              </div>
              <div className="mt-1 break-all text-[11px] text-neutral-500">
                {mainnetHardening?.configuredMultisigAuthority ?? "Not configured"}
              </div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-[#111111] px-3 py-3">
              <div className="text-neutral-500 uppercase tracking-wider">Bootstrap</div>
              <div className={`mt-1 font-semibold ${mainnetHardening?.allowBootstrapActions ? "text-emerald-300" : "text-neutral-200"}`}>
                {mainnetHardening?.allowBootstrapActions ? "Enabled" : "Closed"}
              </div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-[#111111] px-3 py-3">
              <div className="text-neutral-500 uppercase tracking-wider">Config Updates</div>
              <div className={`mt-1 font-semibold ${mainnetHardening?.allowConfigUpdates ? "text-emerald-300" : "text-neutral-200"}`}>
                {mainnetHardening?.allowConfigUpdates ? "Enabled" : "Closed"}
              </div>
            </div>
          </div>
          <div className="mt-2 rounded-lg border border-neutral-800 bg-[#111111] px-3 py-3 text-[12px]">
            <div className="text-neutral-500 uppercase tracking-wider">Funding Batches</div>
            <div className={`mt-1 font-semibold ${mainnetHardening?.allowFundingBatch ? "text-emerald-300" : "text-neutral-200"}`}>
              {mainnetHardening?.allowFundingBatch ? "Enabled" : "Closed"}
            </div>
          </div>
          {mainnetHardening?.warnings.length ? (
            <div className="mt-3 space-y-2">
              {mainnetHardening.warnings.map((warning) => (
                <div
                  key={warning}
                  className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100/80"
                >
                  {warning}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-white">Cutover Policy</h4>
              <p className="text-[11px] text-neutral-500 mt-1">
                Central migration freeze switches for legacy stake and claim writes.
              </p>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
              cutoverActive
                ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
            }`}>
              {cutoverActive ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-[12px]">
            <div className="rounded-lg border border-neutral-800 bg-[#111111] px-3 py-3">
              <div className="text-neutral-500 uppercase tracking-wider">Migration Window</div>
              <div className={`mt-1 font-semibold ${cutoverPolicy?.migrationWindowActive ? "text-amber-300" : "text-neutral-200"}`}>
                {cutoverPolicy?.migrationWindowActive ? "Enabled" : "Off"}
              </div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-[#111111] px-3 py-3">
              <div className="text-neutral-500 uppercase tracking-wider">Stake Freeze</div>
              <div className={`mt-1 font-semibold ${cutoverPolicy?.freezeLegacyStakeWrites ? "text-amber-300" : "text-neutral-200"}`}>
                {cutoverPolicy?.freezeLegacyStakeWrites ? "Frozen" : "Writable"}
              </div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-[#111111] px-3 py-3">
              <div className="text-neutral-500 uppercase tracking-wider">Claim Freeze</div>
              <div className={`mt-1 font-semibold ${cutoverPolicy?.freezeLegacyClaimWrites ? "text-amber-300" : "text-neutral-200"}`}>
                {cutoverPolicy?.freezeLegacyClaimWrites ? "Frozen" : "Writable"}
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-neutral-800 bg-[#111111] px-3 py-3 text-[12px] text-neutral-400">
            {cutoverPolicy?.reason ?? "No active cutover notice. Legacy compatibility remains available."}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-white">Legacy Snapshot Manifest</h4>
              <p className="text-[11px] text-neutral-500 mt-1">
                Read-only export summary used for controlled staking cutover.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onExportMigrationSnapshot("json")}
                disabled={exportFormatInFlight !== null}
                className="px-3 py-2 bg-sky-500/10 text-sky-300 border border-sky-500/20 rounded-lg text-xs font-medium hover:bg-sky-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                {exportFormatInFlight === "json" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Export JSON
              </button>
              <button
                onClick={() => onExportMigrationSnapshot("csv")}
                disabled={exportFormatInFlight !== null}
                className="px-3 py-2 bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-lg text-xs font-medium hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                {exportFormatInFlight === "csv" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Export CSV
              </button>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                migrationSnapshot?.hasLegacyPositions
                  ? "border-sky-500/20 bg-sky-500/10 text-sky-300"
                  : "border-neutral-700 bg-neutral-800 text-neutral-300"
              }`}>
                {migrationSnapshot?.hasLegacyPositions ? "Positions Detected" : "No Legacy Positions"}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-[12px]">
            <div className="rounded-lg border border-neutral-800 bg-[#111111] px-3 py-3">
              <div className="text-neutral-500 uppercase tracking-wider">Total</div>
              <div className="mt-1 font-semibold text-white">{migrationSnapshot?.manifest.positionCount ?? 0}</div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-[#111111] px-3 py-3">
              <div className="text-neutral-500 uppercase tracking-wider">Matured</div>
              <div className="mt-1 font-semibold text-white">{migrationSnapshot?.manifest.maturedClaimableCount ?? 0}</div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-[#111111] px-3 py-3">
              <div className="text-neutral-500 uppercase tracking-wider">Active</div>
              <div className="mt-1 font-semibold text-white">{migrationSnapshot?.manifest.activeCount ?? 0}</div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-[#111111] px-3 py-3">
              <div className="text-neutral-500 uppercase tracking-wider">Generated</div>
              <div className="mt-1 font-semibold text-white text-[11px]">
                {migrationSnapshot?.manifest.generatedAt
                  ? new Date(migrationSnapshot.manifest.generatedAt).toLocaleString()
                  : "Unavailable"}
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-neutral-800 bg-[#111111] px-3 py-3 text-[12px] text-neutral-400">
            <div className="text-neutral-500 uppercase tracking-wider">Checksum</div>
            <div className="mt-1 break-all font-mono text-[11px] leading-5 text-neutral-200">
              {migrationSnapshot?.manifest.checksumSha256 ?? "No snapshot checksum available"}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-neutral-800 bg-neutral-900/80 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-white">Legacy Position Preview</h4>
            <p className="text-[11px] text-neutral-500 mt-1">
              First snapshot rows for operator sanity checks before migration execution.
            </p>
          </div>
          {migrationSnapshot?.omittedPositions ? (
            <div className="text-[11px] text-neutral-500">
              +{migrationSnapshot.omittedPositions} more not shown
            </div>
          ) : null}
        </div>
        <div className="mt-3 space-y-2">
          {!migrationSnapshot?.previewPositions.length ? (
            <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/60 px-3 py-4 text-[12px] text-neutral-500">
              No legacy stake positions are waiting in the current snapshot.
            </div>
          ) : (
            migrationSnapshot.previewPositions.map((position) => (
              <div
                key={position.legacyStakeId}
                className="rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-3 text-[12px]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-white">
                    {position.tokenTicker} · {position.amount.toFixed(4)}
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    position.maturedAtExport
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                      : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                  }`}>
                    {position.maturedAtExport ? "Claimable" : "Active"}
                  </span>
                </div>
                <div className="mt-1 text-neutral-400 break-all">
                  Wallet: <span className="text-neutral-200">{position.walletAddress}</span>
                </div>
                <div className="mt-1 text-neutral-400 break-all">
                  Legacy Stake ID: <span className="text-neutral-200">{position.legacyStakeId}</span>
                </div>
                <div className="mt-1 text-neutral-400">
                  Reward est.: <span className="text-neutral-200">{position.rewardEstimate.toFixed(4)} RA</span>
                  {" • "}
                  Unlock: <span className="text-neutral-200">{new Date(position.unlockAt).toLocaleString()}</span>
                </div>
                <div className="mt-1 text-neutral-500">
                  Source: {position.sourceMode ?? "unknown"}
                  {position.executionSignature ? ` • Sig: ${position.executionSignature}` : ""}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-neutral-800 bg-neutral-900/80 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-white">Funding Batches</h4>
            <p className="text-[11px] text-neutral-500 mt-1">
              Devnet reward coverage batches mirrored for operator visibility.
            </p>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {fundingBatches.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/60 px-3 py-4 text-[12px] text-neutral-500">
              No funding batches recorded yet.
            </div>
          ) : (
            fundingBatches.map((batch) => (
              <div key={batch.batchId} className="rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-3 text-[12px]">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-white">{batch.inputTicker ?? "Unknown"} coverage batch</div>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    batch.status === "EXECUTED"
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                      : batch.status === "APPROVED"
                        ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                        : "border-neutral-600 bg-neutral-800 text-neutral-300"
                  }`}>
                    {batch.status}
                  </span>
                </div>
                <div className="mt-2 text-neutral-400 break-all">
                  Batch ID: <span className="text-neutral-200">{batch.batchId}</span>
                </div>
                <div className="mt-1 text-neutral-400">
                  Planned: <span className="text-neutral-200">{batch.plannedRewardRa.toFixed(4)} RA</span>
                  {" • "}
                  Funded: <span className="text-neutral-200">{batch.fundedRewardRa.toFixed(4)} RA</span>
                </div>
                <div className="mt-1 text-neutral-500">
                  {batch.executedAt ?? batch.createdAt}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {preparedSync ? (
        <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900/80 p-4">
          <div className="flex items-center gap-2">
            <SendHorizonal className="w-4 h-4 text-purple-300" />
            <h4 className="text-sm font-semibold text-white">Prepared Token Sync</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-xs">
            <div className="rounded-lg border border-neutral-800 bg-[#111111] px-3 py-3">
              <div className="text-neutral-500 uppercase tracking-wider">Token</div>
              <div className="mt-1 text-neutral-100 font-medium">
                {preparedSync.token.ticker} · {preparedSync.token.tokenName}
              </div>
              <div className="mt-1 text-neutral-500">
                Mint: {preparedSync.token.mintAddress ?? "Missing mint address"}
              </div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-[#111111] px-3 py-3">
              <div className="text-neutral-500 uppercase tracking-wider">Derived PDA</div>
              <div className="mt-1 text-neutral-100 break-all">
                {preparedSync.derivedAddresses?.tokenConfigPda ?? "Program ID or mint not ready"}
              </div>
              <div className="mt-1 text-neutral-500 break-all">
                Global: {preparedSync.derivedAddresses?.globalConfigPda ?? "-"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-xs">
            <div className="rounded-lg border border-neutral-800 bg-[#111111] px-3 py-3">
              <div className="text-neutral-500 uppercase tracking-wider">Instruction</div>
              <div className="mt-1 text-neutral-100 font-medium">
                {instructionPayload?.instructionName ?? "Not available"}
              </div>
              <div className="mt-1 text-neutral-500 break-all">
                Program: {instructionPayload?.programId ?? preparedSync.programs.stakePoolProgramId ?? "-"}
              </div>
              <div className="mt-1 text-neutral-500 break-all">
                Discriminator: {instructionPayload?.discriminatorHex ?? "-"}
              </div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-[#111111] px-3 py-3">
              <div className="text-neutral-500 uppercase tracking-wider">Encoded Payload</div>
              <div className="mt-1 text-neutral-100 break-all font-mono text-[11px] leading-5">
                {instructionPayload?.dataBase64 ?? "No instruction data prepared"}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-neutral-800 bg-[#111111] overflow-hidden">
            <div className="px-3 py-2 border-b border-neutral-800 text-[11px] uppercase tracking-wider text-neutral-500">
              Prepared Accounts Preview
            </div>
            {previewAccounts.length > 0 ? (
              <div className="divide-y divide-neutral-800">
                {previewAccounts.map((account) => (
                  <div
                    key={`${account.name}-${account.address ?? "pending"}`}
                    className="px-3 py-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-neutral-100">{account.name}</div>
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
                        <span
                          className={`rounded-full px-2 py-0.5 ${
                            account.isSigner
                              ? "bg-sky-500/10 text-sky-300 border border-sky-500/20"
                              : "bg-neutral-800 text-neutral-400 border border-neutral-700"
                          }`}
                        >
                          {account.isSigner ? "Signer" : "Readonly"}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 ${
                            account.isWritable
                              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                              : "bg-neutral-800 text-neutral-400 border border-neutral-700"
                          }`}
                        >
                          {account.isWritable ? "Writable" : "Static"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 break-all text-neutral-500 font-mono text-[11px] leading-5">
                      {account.address ?? "Resolved at signing time"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-3 py-3 text-xs text-neutral-500">
                Prepare a token sync to inspect the exact account layout.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {preparedExecution ? (
        <div className="mt-4 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
          <div className="text-xs uppercase tracking-wider text-purple-300">Prepared Admin Execution</div>
          <div className="mt-2 text-sm font-semibold text-white">{preparedExecution.action}</div>
          <div className="mt-1 text-[11px] text-neutral-400 break-all">
            Session: {preparedExecution.sessionId}
          </div>
          <div className="mt-1 text-[11px] text-neutral-400 break-all">
            Wallet: {preparedExecution.walletAddress}
          </div>
          <div className="mt-2 text-[11px] text-neutral-500 break-all">
            Instruction: {preparedExecution.instructionPayload.instructionName} · {preparedExecution.instructionPayload.programId}
          </div>
        </div>
      ) : null}
    </div>
  );
}


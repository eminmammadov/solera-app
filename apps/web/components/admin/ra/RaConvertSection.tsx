"use client";

type ConvertProvider = "RAYDIUM" | "JUPITER";
type ConvertExecutionMode = "AUTO" | "SINGLE_TX_ONLY" | "ALLOW_MULTI_TX";
type ConvertRoutePolicy = "TOKEN_TO_SOL_TO_RA";

interface RaConvertSectionProps {
  convertEnabled: boolean;
  convertProvider: ConvertProvider;
  convertExecutionMode: ConvertExecutionMode;
  convertRoutePolicy: ConvertRoutePolicy;
  convertSlippageBps: number;
  convertMaxTokensPerSession: number;
  convertPoolIdDevnet: string;
  convertPoolIdMainnet: string;
  convertQuoteMintDevnet: string;
  convertQuoteMintMainnet: string;
  providerOptions: ConvertProvider[];
  executionOptions: ConvertExecutionMode[];
  onConvertEnabledChange: (value: boolean) => void;
  onConvertProviderChange: (value: ConvertProvider) => void;
  onConvertExecutionModeChange: (value: ConvertExecutionMode) => void;
  onConvertRoutePolicyChange: (value: ConvertRoutePolicy) => void;
  onConvertSlippageBpsChange: (value: number) => void;
  onConvertMaxTokensPerSessionChange: (value: number) => void;
  onConvertPoolIdDevnetChange: (value: string) => void;
  onConvertPoolIdMainnetChange: (value: string) => void;
  onConvertQuoteMintDevnetChange: (value: string) => void;
  onConvertQuoteMintMainnetChange: (value: string) => void;
}

export function RaConvertSection({
  convertEnabled,
  convertProvider,
  convertExecutionMode,
  convertRoutePolicy,
  convertSlippageBps,
  convertMaxTokensPerSession,
  convertPoolIdDevnet,
  convertPoolIdMainnet,
  convertQuoteMintDevnet,
  convertQuoteMintMainnet,
  providerOptions,
  executionOptions,
  onConvertEnabledChange,
  onConvertProviderChange,
  onConvertExecutionModeChange,
  onConvertRoutePolicyChange,
  onConvertSlippageBpsChange,
  onConvertMaxTokensPerSessionChange,
  onConvertPoolIdDevnetChange,
  onConvertPoolIdMainnetChange,
  onConvertQuoteMintDevnetChange,
  onConvertQuoteMintMainnetChange,
}: RaConvertSectionProps) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-[#0a0a0a] p-4 space-y-3">
      <h4 className="text-sm font-semibold text-white">Convert Liquidity</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
        <label className="flex items-center justify-between bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 cursor-pointer">
          <span className="text-sm text-neutral-300">Convert enabled</span>
          <input type="checkbox" checked={convertEnabled} onChange={(e) => onConvertEnabledChange(e.target.checked)} className="accent-emerald-500" />
        </label>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Provider</label>
          <select value={convertProvider} onChange={(e) => onConvertProviderChange(e.target.value as ConvertProvider)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50">
            {providerOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Execution Mode</label>
          <select value={convertExecutionMode} onChange={(e) => onConvertExecutionModeChange(e.target.value as ConvertExecutionMode)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50">
            {executionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Route Policy</label>
          <input value={convertRoutePolicy} onChange={(e) => onConvertRoutePolicyChange(e.target.value as ConvertRoutePolicy)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Convert Slippage (bps)</label>
          <input type="number" min={0} max={10000} value={convertSlippageBps} onChange={(e) => onConvertSlippageBpsChange(Number(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50" />
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Max Tokens / Session</label>
          <input type="number" min={1} max={5} value={convertMaxTokensPerSession} onChange={(e) => onConvertMaxTokensPerSessionChange(Math.max(1, Math.min(5, Number(e.target.value) || 1)))} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50" />
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Pool ID (Devnet)</label>
          <input value={convertPoolIdDevnet} onChange={(e) => onConvertPoolIdDevnetChange(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50" />
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Pool ID (Mainnet)</label>
          <input value={convertPoolIdMainnet} onChange={(e) => onConvertPoolIdMainnetChange(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50" />
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Quote Mint (Devnet)</label>
          <input value={convertQuoteMintDevnet} onChange={(e) => onConvertQuoteMintDevnetChange(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50" />
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Quote Mint (Mainnet)</label>
          <input value={convertQuoteMintMainnet} onChange={(e) => onConvertQuoteMintMainnetChange(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50" />
        </div>
      </div>
    </div>
  );
}

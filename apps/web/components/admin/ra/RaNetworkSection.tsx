"use client";

import Image from "next/image";
import { ImageUp, Network } from "lucide-react";

interface RaNetworkSectionProps {
  logoUrl: string;
  tokenSymbol: string;
  tokenName: string;
  mintDevnet: string;
  mintMainnet: string;
  treasuryDevnet: string;
  treasuryMainnet: string;
  isUploadingLogo: boolean;
  onLogoUpload: (file: File) => void;
  onTokenSymbolChange: (value: string) => void;
  onTokenNameChange: (value: string) => void;
  onMintDevnetChange: (value: string) => void;
  onMintMainnetChange: (value: string) => void;
  onTreasuryDevnetChange: (value: string) => void;
  onTreasuryMainnetChange: (value: string) => void;
}

export function RaNetworkSection({
  logoUrl,
  tokenSymbol,
  tokenName,
  mintDevnet,
  mintMainnet,
  treasuryDevnet,
  treasuryMainnet,
  isUploadingLogo,
  onLogoUpload,
  onTokenSymbolChange,
  onTokenNameChange,
  onMintDevnetChange,
  onMintMainnetChange,
  onTreasuryDevnetChange,
  onTreasuryMainnetChange,
}: RaNetworkSectionProps) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-[#0a0a0a] p-4 space-y-3">
      <div className="flex items-center gap-2 text-neutral-200">
        <Network className="w-4 h-4 text-emerald-400" />
        <h4 className="text-sm font-semibold text-white">Network Addresses</h4>
      </div>
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
        <label className="block text-xs text-neutral-400 mb-2">RA Logo</label>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full overflow-hidden bg-black border border-neutral-800 shrink-0">
            <Image
              src={logoUrl}
              alt="RA Logo"
              width={48}
              height={48}
              className="object-cover h-full w-full"
              referrerPolicy="no-referrer"
            />
          </div>
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-neutral-200 border border-neutral-700 hover:bg-neutral-800 transition-colors cursor-pointer">
            <ImageUp className="w-4 h-4 text-emerald-400" />
            {isUploadingLogo ? "Uploading..." : "Upload Logo"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  onLogoUpload(file)
                }
                event.currentTarget.value = ""
              }}
            />
          </label>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Token Symbol</label>
          <input
            value={tokenSymbol}
            maxLength={12}
            onChange={(e) => onTokenSymbolChange(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Token Name</label>
          <input
            value={tokenName}
            maxLength={40}
            onChange={(e) => onTokenNameChange(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-neutral-400 mb-1">RA Mint (Devnet)</label>
        <input value={mintDevnet} onChange={(e) => onMintDevnetChange(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50" />
      </div>
      <div>
        <label className="block text-xs text-neutral-400 mb-1">RA Mint (Mainnet)</label>
        <input value={mintMainnet} onChange={(e) => onMintMainnetChange(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50" />
      </div>
      <div>
        <label className="block text-xs text-neutral-400 mb-1">Treasury (Devnet)</label>
        <input value={treasuryDevnet} onChange={(e) => onTreasuryDevnetChange(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50" />
      </div>
      <div>
        <label className="block text-xs text-neutral-400 mb-1">Treasury (Mainnet)</label>
        <input value={treasuryMainnet} onChange={(e) => onTreasuryMainnetChange(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50" />
      </div>
    </div>
  );
}

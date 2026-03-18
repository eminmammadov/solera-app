"use client";

import Link from "next/link";
import Image from "next/image";
import { Edit2, Trash2 } from "lucide-react";
import { TokenForm } from "@/components/admin/tokens/TokenForm";
import type { TokenStakeConfigProjection } from "@/components/admin/staking/types";
import {
  passthroughImageLoader,
  type MarketToken,
  type TokenFormProps,
} from "@/components/admin/tokens/types";

interface TokensTableProps {
  filtered: MarketToken[];
  loading: boolean;
  editingId: string | null;
  tokenFormProps: TokenFormProps;
  stakingProjectionByTokenId: Record<string, TokenStakeConfigProjection | undefined>;
  onEdit: (token: MarketToken) => void;
  onDelete: (id: string, ticker: string) => void;
}

export function TokensTable({
  filtered,
  loading,
  editingId,
  tokenFormProps,
  stakingProjectionByTokenId,
  onEdit,
  onDelete,
}: TokensTableProps) {
  return (
    <div className="bg-[#111111] border border-neutral-800 rounded-xl overflow-hidden flex flex-col flex-1 min-h-0">
      <div className="overflow-x-auto min-h-0 basis-full">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#1a1a1a] text-xs font-semibold text-neutral-400 uppercase tracking-wider sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-5 py-3 border-b border-neutral-800 font-medium">Asset</th>
              <th className="px-5 py-3 border-b border-neutral-800 font-medium">Price</th>
              <th className="px-5 py-3 border-b border-neutral-800 font-medium">Yields (1m/3m/12m)</th>
              <th className="px-5 py-3 border-b border-neutral-800 font-medium">On-chain</th>
              <th className="px-5 py-3 border-b border-neutral-800 font-medium text-center">Status</th>
              <th className="px-5 py-3 border-b border-neutral-800 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800 text-sm">
            {editingId === "new" && (
              <tr className="bg-purple-500/5 transition-colors">
                <td colSpan={6} className="p-4">
                  <TokenForm {...tokenFormProps} />
                </td>
              </tr>
            )}

            {loading && editingId !== "new" && (
              <tr><td colSpan={6} className="text-center py-6 text-neutral-500">Loading tokens...</td></tr>
            )}

            {!loading && filtered.length === 0 && editingId !== "new" && (
              <tr><td colSpan={6} className="text-center py-6 text-neutral-500">No tokens found.</td></tr>
            )}

            {filtered.map((token) =>
              editingId === token.id ? (
                <tr key={token.id} className="bg-purple-500/5 transition-colors">
                  <td colSpan={6} className="p-4">
                    <TokenForm {...tokenFormProps} />
                  </td>
                </tr>
              ) : (
                <tr key={token.id} className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700 overflow-hidden shrink-0">
                        {token.isImage && token.icon ? (
                          <Image src={token.icon} alt={token.ticker} width={32} height={32} unoptimized loader={passthroughImageLoader} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-white">{token.icon || token.ticker.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{token.ticker}</div>
                        <div className="text-xs text-neutral-500">{token.name} • {token.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-neutral-200">${token.price.toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
                    <div className={`text-xs ${token.chg24h >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {token.chg24h >= 0 ? "+" : ""}{token.chg24h}%
                    </div>
                  </td>
                  <td className="px-5 py-4 pointer-events-none">
                    <div className="flex gap-2 text-xs">
                      <span className="bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded">{token.stake1m.toFixed(1)}%</span>
                      <span className="bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded">{token.stake3m.toFixed(1)}%</span>
                      <span className="bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded">{token.stake12m.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {(() => {
                      const projection = stakingProjectionByTokenId[token.id];
                      if (!projection) {
                        return <span className="text-xs text-neutral-500">Not loaded</span>;
                      }

                      const tone =
                        projection.syncStatus === "ready"
                          ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20"
                          : projection.syncStatus === "missing_mint"
                            ? "text-amber-300 bg-amber-500/10 border-amber-500/20"
                            : "text-neutral-300 bg-neutral-500/10 border-neutral-500/20";

                      const label =
                        projection.syncStatus === "ready"
                          ? "Ready"
                          : projection.syncStatus === "missing_mint"
                            ? "Missing Mint"
                            : "Env Pending";

                      return (
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center w-fit gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-full border ${tone}`}>
                            {label}
                          </span>
                          <span className="text-[11px] text-neutral-500 uppercase">
                            {projection.network}
                          </span>
                          <Link
                            href={`/admin/staking?tokenId=${encodeURIComponent(token.id)}`}
                            className="text-[11px] font-medium text-sky-300 hover:text-sky-200 transition-colors"
                          >
                            Open in Staking
                          </Link>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {token.isActive ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full uppercase">Active</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-neutral-400 bg-neutral-500/10 border border-neutral-500/20 px-2 py-1 rounded-full uppercase">Inactive</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => onEdit(token)} disabled={editingId !== null} className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDelete(token.id, token.ticker)} disabled={editingId !== null} className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import { Edit2, Save } from "lucide-react";
import { uploadAdminMarketTokenImage } from "@/lib/admin/market-admin";
import { useAdminAuth } from "@/store/admin/use-admin-auth";
import { notifyError, notifySuccess } from "@/lib/ui/ui-feedback";
import {
  NATIVE_SOL_TICKER,
  passthroughImageLoader,
  type TokenFormProps,
  type TokenUploadChangeEvent,
} from "@/components/admin/tokens/types";

export function TokenForm(props: TokenFormProps) {
  const parseNumberInput = (value: string): number => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const { token } = useAdminAuth();
  const [uploading, setUploading] = useState(false);
  const isNativeSolDraft = props.formTicker.trim().toUpperCase() === NATIVE_SOL_TICKER;
  const isLivePriceManaged =
    props.isLivePricingEnabled &&
    (isNativeSolDraft || props.formMintAddress.trim().length > 0);

  const handleUpload = async (e: TokenUploadChangeEvent) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const data = await uploadAdminMarketTokenImage<{ url: string }>({
        token,
        file,
      });

      props.setFormIcon(data.url);
      props.setFormIsImage(true);
      notifySuccess({
        title: "Uploaded",
        description: "Icon updated successfully",
        dedupeKey: "admin:tokens:icon-uploaded",
        dedupeMs: 2_000,
      });
    } catch (error) {
      notifyError({
        title: "Error",
        error,
        fallbackMessage: "Failed to upload image",
        dedupeKey: "admin:tokens:icon-upload-failed",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2 pb-2 text-purple-400 border-b border-purple-500/20">
        <Edit2 className="w-4 h-4" />
        <span className="font-semibold text-sm">Token Definition</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="text-xs text-neutral-400 mb-1 block">Ticker</label>
          <input type="text" value={props.formTicker} onChange={e => props.setFormTicker(e.target.value)} className="w-full bg-[#111111] border border-neutral-800 rounded-lg px-3 py-1.5 text-sm text-neutral-200 outline-none" />
        </div>
        <div>
          <label className="text-xs text-neutral-400 mb-1 block">Name</label>
          <input type="text" value={props.formName} onChange={e => props.setFormName(e.target.value)} className="w-full bg-[#111111] border border-neutral-800 rounded-lg px-3 py-1.5 text-sm text-neutral-200 outline-none" />
        </div>
        <div>
          <label className="text-xs text-neutral-400 mb-1 block">Category</label>
          <select value={props.formCategory} onChange={e => props.setFormCategory(e.target.value)} className="w-full bg-[#111111] border border-neutral-800 rounded-lg px-3 py-1.5 text-sm text-neutral-200 outline-none">
            <option value="Meme tokens">Meme tokens</option>
            <option value="Asset tokens">Asset tokens</option>
            <option value="Partner tokens">Partner tokens</option>
          </select>
        </div>
        <div className="flex items-center gap-3 pt-1 md:pt-5">
          <label className="flex items-center gap-2 text-sm text-neutral-200 cursor-pointer select-none">
            <input type="checkbox" checked={props.formIsActive} onChange={e => props.setFormIsActive(e.target.checked)} className="accent-purple-500 w-4 h-4" />
            Active (Visible)
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-[#111111] px-3 py-2 text-sm text-neutral-200 cursor-pointer select-none">
          <input type="checkbox" checked={props.formStakeEnabled} onChange={e => props.setFormStakeEnabled(e.target.checked)} className="accent-purple-500 w-4 h-4" />
          Stake enabled
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-[#111111] px-3 py-2 text-sm text-neutral-200 cursor-pointer select-none">
          <input type="checkbox" checked={props.formConvertEnabled} onChange={e => props.setFormConvertEnabled(e.target.checked)} className="accent-purple-500 w-4 h-4" />
          Convert enabled
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-[#111111] px-3 py-2 text-sm text-neutral-200 cursor-pointer select-none">
          <input type="checkbox" checked={props.formPortfolioVisible} onChange={e => props.setFormPortfolioVisible(e.target.checked)} className="accent-purple-500 w-4 h-4" />
          Portfolio visible
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="text-xs text-neutral-400 mb-1 block">
            {isNativeSolDraft ? "Native SOL Asset" : "Mint Address (Portfolio + Live Price)"}
          </label>
          <input
            type="text"
            value={props.formMintAddress}
            onChange={e => props.setFormMintAddress(e.target.value)}
            placeholder={isNativeSolDraft ? "Leave empty for native SOL" : "Paste SPL token mint address"}
            className="w-full bg-[#111111] border border-neutral-800 rounded-lg px-3 py-1.5 text-sm text-neutral-200 outline-none placeholder:text-neutral-700"
          />
          <p className="mt-1 text-[10px] text-neutral-500">
            {isNativeSolDraft
              ? "SOL is tracked as the native Solana coin. Do not enter a custom mint."
              : "Portfolio sync and live pricing use the SPL mint address."}
          </p>
        </div>
        <div>
          <label className="text-xs text-neutral-400 mb-1 block">
            Price USD {isLivePriceManaged ? "(Auto updated)" : ""}
          </label>
          <input type="number" step="any" value={props.formPrice} onChange={e => props.setFormPrice(parseNumberInput(e.target.value))} disabled={isLivePriceManaged} className="w-full bg-[#111111] border border-neutral-800 rounded-lg px-3 py-1.5 text-sm text-neutral-200 outline-none disabled:opacity-50" />
        </div>
        <div>
          <label className="text-xs text-neutral-400 mb-1 block">
            24h Change % {isLivePriceManaged ? "(Auto updated)" : ""}
          </label>
          <input type="number" step="any" value={props.formChg24h} onChange={e => props.setFormChg24h(parseNumberInput(e.target.value))} disabled={isLivePriceManaged} className="w-full bg-[#111111] border border-neutral-800 rounded-lg px-3 py-1.5 text-sm text-neutral-200 outline-none disabled:opacity-50" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-400 block">Logo Upload</label>
          <div className="flex items-center gap-2">
            <label className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs text-white rounded-lg cursor-pointer transition-colors border border-neutral-700 whitespace-nowrap">
              {uploading ? "Uploading..." : "Choose Image"}
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
            {props.formIcon && props.formIsImage && (
              <Image src={props.formIcon} alt="Preview" width={24} height={24} unoptimized loader={passthroughImageLoader} className="w-6 h-6 rounded-full object-cover border border-neutral-700 shrink-0" />
            )}
            {!props.formIsImage && props.formIcon && (
              <span className="text-xs font-bold text-neutral-300 ml-2">{props.formIcon.charAt(0)}</span>
            )}
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs text-neutral-500 mb-2 block uppercase font-bold tracking-widest">Staking Annual APR %</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">7 Days</label>
            <input type="number" step="any" value={props.formStake7d} onChange={e => props.setFormStake7d(parseNumberInput(e.target.value))} className="w-full bg-[#111111] border border-neutral-800 rounded-lg px-3 py-1.5 text-sm text-neutral-200 outline-none" />
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">1 Month</label>
            <input type="number" step="any" value={props.formStake1m} onChange={e => props.setFormStake1m(parseNumberInput(e.target.value))} className="w-full bg-[#111111] border border-neutral-800 rounded-lg px-3 py-1.5 text-sm text-neutral-200 outline-none" />
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">3 Months</label>
            <input type="number" step="any" value={props.formStake3m} onChange={e => props.setFormStake3m(parseNumberInput(e.target.value))} className="w-full bg-[#111111] border border-neutral-800 rounded-lg px-3 py-1.5 text-sm text-neutral-200 outline-none" />
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">6 Months</label>
            <input type="number" step="any" value={props.formStake6m} onChange={e => props.setFormStake6m(parseNumberInput(e.target.value))} className="w-full bg-[#111111] border border-neutral-800 rounded-lg px-3 py-1.5 text-sm text-neutral-200 outline-none" />
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">1 Year</label>
            <input type="number" step="any" value={props.formStake12m} onChange={e => props.setFormStake12m(parseNumberInput(e.target.value))} className="w-full bg-[#111111] border border-neutral-800 rounded-lg px-3 py-1.5 text-sm text-neutral-200 outline-none" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-neutral-800/50 justify-end">
        <button onClick={props.onCancel} className="px-4 py-2 border border-neutral-700 hover:bg-neutral-800 text-neutral-300 rounded-lg text-sm transition-colors cursor-pointer">
          Cancel
        </button>
        <button onClick={props.onSave} className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_20px_rgba(168,85,247,0.5)] cursor-pointer">
          <Save className="w-4 h-4" /> Save Token
        </button>
      </div>
    </div>
  );
}

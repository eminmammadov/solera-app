"use client";

import type { ChangeEvent, Dispatch, SetStateAction } from "react";

export interface MarketToken {
  id: string;
  ticker: string;
  name: string;
  network?: string;
  price: number;
  chg24h: number;
  stake7d: number;
  stake1m: number;
  stake3m: number;
  stake6m: number;
  stake12m: number;
  category: string;
  icon: string;
  isImage: boolean;
  colorBg: string | null;
  priceColor: string | null;
  priceDecimalColor: string | null;
  mintAddress: string | null;
  isActive: boolean;
  stakeEnabled: boolean;
  convertEnabled: boolean;
  portfolioVisible: boolean;
}

export interface TokenFormProps {
  formTicker: string;
  setFormTicker: Dispatch<SetStateAction<string>>;
  formName: string;
  setFormName: Dispatch<SetStateAction<string>>;
  formCategory: string;
  setFormCategory: Dispatch<SetStateAction<string>>;
  formPrice: number;
  setFormPrice: Dispatch<SetStateAction<number>>;
  formChg24h: number;
  setFormChg24h: Dispatch<SetStateAction<number>>;
  formStake7d: number;
  setFormStake7d: Dispatch<SetStateAction<number>>;
  formStake1m: number;
  setFormStake1m: Dispatch<SetStateAction<number>>;
  formStake3m: number;
  setFormStake3m: Dispatch<SetStateAction<number>>;
  formStake6m: number;
  setFormStake6m: Dispatch<SetStateAction<number>>;
  formStake12m: number;
  setFormStake12m: Dispatch<SetStateAction<number>>;
  formIcon: string;
  setFormIcon: Dispatch<SetStateAction<string>>;
  formIsImage: boolean;
  setFormIsImage: Dispatch<SetStateAction<boolean>>;
  formMintAddress: string;
  setFormMintAddress: Dispatch<SetStateAction<string>>;
  formIsActive: boolean;
  setFormIsActive: Dispatch<SetStateAction<boolean>>;
  formStakeEnabled: boolean;
  setFormStakeEnabled: Dispatch<SetStateAction<boolean>>;
  formConvertEnabled: boolean;
  setFormConvertEnabled: Dispatch<SetStateAction<boolean>>;
  formPortfolioVisible: boolean;
  setFormPortfolioVisible: Dispatch<SetStateAction<boolean>>;
  isLivePricingEnabled: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export interface MarketLivePricingRuntime {
  livePriceEnabled: boolean;
  cacheTtlMs: number;
  requestTimeoutMs: number;
  maxParallelRequests: number;
  cacheEntries: number;
  inFlightRequests: number;
  lastSyncAt: string | null;
  trackedMints?: number;
}

export interface AdminPortfolioEligibilityToken {
  ticker: string;
  name: string;
  isActive: boolean;
  mint: string | null;
  hasMint: boolean;
  isRaMint: boolean;
  walletAmount: number;
  visibleInPortfolio: boolean;
  reasons: string[];
}

export interface AdminPortfolioEligibilityResponse {
  walletAddress: string;
  network: "devnet" | "mainnet";
  ra: {
    mint: string;
    walletAmount: number;
    visibleInPortfolio: true;
  };
  summary: {
    activeTokens: number;
    configuredMints: number;
    eligibleVisibleTokens: number;
    configuredTokensWithBalance: number;
  };
  tokens: AdminPortfolioEligibilityToken[];
  unknownWalletMints: Array<{
    mint: string;
    walletAmount: number;
  }>;
}

export const DEFAULT_LIVE_RUNTIME: MarketLivePricingRuntime = {
  livePriceEnabled: true,
  cacheTtlMs: 60000,
  requestTimeoutMs: 4500,
  maxParallelRequests: 4,
  cacheEntries: 0,
  inFlightRequests: 0,
  lastSyncAt: null,
  trackedMints: 0,
};

export const passthroughImageLoader = ({ src }: { src: string }) => src;
export const NATIVE_SOL_TICKER = "SOL";

export type TokenUploadChangeEvent = ChangeEvent<HTMLInputElement>;

import { create } from "zustand"
import {
  fetchWalletUserProfile,
} from "@/lib/user/user-analytics"
import { useWallet } from "@/store/wallet/use-wallet"

export interface Stake {
  id: number | string
  remoteId?: string | null
  name: string
  logo: string
  stakedAmount: string
  apr: string
  earned: string
  status: string
  startedAt: number
  endTime: number
}

export interface Transaction {
  id: string
  type: string
  amount: string
  date: string
  status: string
}

export interface TokenBalance {
  id: string
  ticker: string
  name: string
  amount: number
  priceUsd: number
  logoUrl: string
  change24h: number
}

interface AddStakeParams {
  remoteId?: string | null
  ticker: string
  name: string
  amount: number
  period: string
  apy: number
}

interface UserDataState {
  walletAddress: string | null
  isProfileLoading: boolean
  isProfileRefreshing: boolean
  isProfileLoaded: boolean
  profileUpdatedAt: number
  profileError: string | null
  availableBalance: number
  stakedBalance: number
  totalEarned: number
  totalEarnedUsd: number
  portfolioValue: number
  portfolioChange: number
  activeStakings: Stake[]
  transactions: Transaction[]
  portfolio: TokenBalance[]
  loadProfile: (walletAddress: string) => Promise<void>
  refreshProfile: () => Promise<void>
  clearProfile: () => void
  addStake: (params: AddStakeParams) => void
  getTokenBalance: (ticker: string) => number
}

const INITIAL_PROFILE_STATE = {
  walletAddress: null as string | null,
  isProfileLoading: false,
  isProfileRefreshing: false,
  isProfileLoaded: false,
  profileUpdatedAt: 0,
  profileError: null as string | null,
  availableBalance: 0,
  stakedBalance: 0,
  totalEarned: 0,
  totalEarnedUsd: 0,
  portfolioValue: 0,
  portfolioChange: 0,
  activeStakings: [] as Stake[],
  transactions: [] as Transaction[],
  portfolio: [] as TokenBalance[],
}

const toSafeNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0

export const useUserData = create<UserDataState>((set, get) => ({
  ...INITIAL_PROFILE_STATE,

  loadProfile: async (walletAddress) => {
    const normalizedAddress = walletAddress?.trim()
    if (!normalizedAddress) {
      set({ ...INITIAL_PROFILE_STATE })
      return
    }

    const currentState = get()
    const walletChanged = currentState.walletAddress !== normalizedAddress

    set({
      walletAddress: normalizedAddress,
      isProfileLoading: walletChanged || !currentState.isProfileLoaded,
      isProfileRefreshing: !walletChanged && currentState.isProfileLoaded,
      profileError: null,
      ...(walletChanged
        ? {
            availableBalance: 0,
            stakedBalance: 0,
            totalEarned: 0,
            totalEarnedUsd: 0,
            portfolioValue: 0,
            portfolioChange: 0,
            activeStakings: [],
            transactions: [],
            portfolio: [],
          }
        : {}),
    })

    const profile = await fetchWalletUserProfile(normalizedAddress)
    if (!profile) {
      set((state) => ({
        ...(state.walletAddress === normalizedAddress
          ? {
              isProfileLoading: false,
              isProfileRefreshing: false,
              isProfileLoaded: state.isProfileLoaded,
            profileError: "Failed to load profile data.",
          }
        : {}),
      }))
      return
    }

    set((state) => {
      if (state.walletAddress !== normalizedAddress) return state

      return {
        walletAddress: normalizedAddress,
        isProfileLoading: false,
        isProfileRefreshing: false,
        isProfileLoaded: true,
        profileUpdatedAt: Date.now(),
        profileError: null,
        availableBalance: toSafeNumber(profile.availableBalance),
        stakedBalance: toSafeNumber(profile.stakedBalance),
        totalEarned: toSafeNumber(profile.totalEarned),
        totalEarnedUsd: toSafeNumber(profile.totalEarnedUsd),
        portfolioValue: toSafeNumber(profile.portfolioValue),
        portfolioChange: toSafeNumber(profile.portfolioChange),
        activeStakings: Array.isArray(profile.activeStakings)
          ? profile.activeStakings.map((item) => ({
              id: item.id,
              remoteId: item.remoteId ?? item.id,
              name: item.name,
              logo: item.logo,
              stakedAmount: item.stakedAmount,
              apr: item.apr,
              earned: item.earned,
              status: item.status,
              startedAt: toSafeNumber(item.startedAt),
              endTime: toSafeNumber(item.endTime),
            }))
          : [],
        transactions: Array.isArray(profile.transactions)
          ? profile.transactions.map((item) => ({
              id: item.id,
              type: item.type,
              amount: item.amount,
              date: item.date,
              status: item.status,
            }))
          : [],
        portfolio: Array.isArray(profile.portfolio)
          ? profile.portfolio.map((item) => ({
              id: item.id,
              ticker: item.ticker,
              name: item.name,
              amount: toSafeNumber(item.amount),
              priceUsd: toSafeNumber(item.priceUsd),
              logoUrl: item.logoUrl,
              change24h: toSafeNumber(item.change24h),
            }))
          : [],
      }
    })
  },

  refreshProfile: async () => {
    const connectedWallet = useWallet.getState().walletAddress
    if (!connectedWallet) {
      set({ ...INITIAL_PROFILE_STATE })
      return
    }
    await get().loadProfile(connectedWallet)
  },

  clearProfile: () => {
    set({ ...INITIAL_PROFILE_STATE })
  },

  addStake: (params) => {
    if (!params.remoteId) return
    void get().refreshProfile()
  },

  getTokenBalance: (ticker: string) => {
    const token = get().portfolio.find(
      (item) => item.ticker.toLowerCase() === ticker.toLowerCase(),
    )
    return token?.amount ?? 0
  },
}))

import { create } from 'zustand'

interface WalletState {
  isConnected: boolean
  walletAddress: string | null
  connect: (address: string) => void
  disconnect: () => void
}

export const useWallet = create<WalletState>((set) => ({
  isConnected: false,
  walletAddress: null,
  connect: (address) => set({ isConnected: true, walletAddress: address }),
  disconnect: () => set({ isConnected: false, walletAddress: null }),
}))

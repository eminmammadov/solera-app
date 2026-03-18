import { create } from 'zustand'

interface WalletState {
  isConnected: boolean
  walletAddress: string | null
  setConnection: (isConnected: boolean, walletAddress: string | null) => void
  connect: (address: string) => void
  disconnect: () => void
}

export const useWallet = create<WalletState>((set) => ({
  isConnected: false,
  walletAddress: null,
  setConnection: (isConnected, walletAddress) => set({ isConnected, walletAddress }),
  connect: (address) => set({ isConnected: true, walletAddress: address }),
  disconnect: () => set({ isConnected: false, walletAddress: null }),
}))

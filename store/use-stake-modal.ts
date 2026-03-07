import { create } from 'zustand'

export interface Token {
  ticker: string
  name: string
  price: number
}

interface StakeModalState {
  isOpen: boolean
  token: Token | null
  openModal: (token: Token) => void
  closeModal: () => void
}

export const useStakeModal = create<StakeModalState>((set) => ({
  isOpen: false,
  token: null,
  openModal: (token) => set({ isOpen: true, token }),
  closeModal: () => set({ isOpen: false, token: null }),
}))

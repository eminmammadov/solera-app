"use client"

import { create } from "zustand"

export type ToastVariant = "success" | "error" | "info" | "warning"

export interface ToastPayload {
  title: string
  description?: string
  durationMs?: number
  variant?: ToastVariant
}

export interface ToastItem {
  id: string
  title: string
  description?: string
  durationMs: number
  variant: ToastVariant
}

interface ToastState {
  toasts: ToastItem[]
  showToast: (payload: ToastPayload) => string
  dismissToast: (id: string) => void
  clearToasts: () => void
}

const DEFAULT_DURATION_MS = 4500
const MAX_TOASTS = 4

const generateToastId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  showToast: ({ title, description, durationMs = DEFAULT_DURATION_MS, variant = "info" }) => {
    const id = generateToastId()
    const nextToast: ToastItem = {
      id,
      title,
      description,
      durationMs,
      variant,
    }

    set((state) => ({
      toasts: [nextToast, ...state.toasts].slice(0, MAX_TOASTS),
    }))

    return id
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}))

export const notify = (payload: ToastPayload) =>
  useToastStore.getState().showToast(payload)

"use client"

import { useCallback, useEffect, useState } from "react"
import {
  DEFAULT_PUBLIC_RA_RUNTIME_SETTINGS,
  fetchRaRuntimeSettings,
  getCachedRaRuntimeSettings,
  subscribeToRaRuntimeSettingsChanges,
  type RaRuntimeSettings,
} from "@/lib/ra/ra-runtime"

export function useRaRuntimeSettings() {
  const [settings, setSettings] = useState<RaRuntimeSettings>(
    () => getCachedRaRuntimeSettings() ?? DEFAULT_PUBLIC_RA_RUNTIME_SETTINGS,
  )
  const [isLoading, setIsLoading] = useState(
    () => getCachedRaRuntimeSettings() === null,
  )
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (force = false) => {
    setIsLoading(true)
    setError(null)

    try {
      const nextSettings = await fetchRaRuntimeSettings(force)
      setSettings(nextSettings)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load RA runtime settings.",
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh(false)
  }, [refresh])

  useEffect(() => {
    return subscribeToRaRuntimeSettingsChanges((nextSettings) => {
      setSettings(nextSettings)
      setError(null)
      setIsLoading(false)
    })
  }, [])

  return {
    settings,
    isLoading,
    error,
    refresh,
  }
}

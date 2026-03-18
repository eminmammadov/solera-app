"use client"

import { useEffect } from "react"
import { useMarketData } from "@/store/market/use-market-data"

const MARKET_DATA_REFRESH_MS = 60_000

export function MarketDataSync() {
  const fetchTokens = useMarketData((state) => state.fetchTokens)

  useEffect(() => {
    const runFetch = () => {
      if (document.visibilityState !== "visible") return
      void fetchTokens()
    }

    // Initial fetch
    runFetch()

    // Refresh loop
    const timer = setInterval(() => {
      runFetch()
    }, MARKET_DATA_REFRESH_MS)

    const handleFocusOrVisibility = () => {
      runFetch()
    }
    document.addEventListener("visibilitychange", handleFocusOrVisibility)
    window.addEventListener("focus", handleFocusOrVisibility)

    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", handleFocusOrVisibility)
      window.removeEventListener("focus", handleFocusOrVisibility)
    }
  }, [fetchTokens])

  return null
}

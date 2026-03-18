"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CandlestickChart, LineChart } from "lucide-react"
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  AreaSeries,
  HistogramSeries,
  IChartApi,
  IPriceLine,
  ISeriesApi,
  UTCTimestamp,
} from "lightweight-charts"
import {
  fetchOhlcBars,
  fetchOhlcTicker,
  type OhlcBar,
  type OhlcInterval,
  type OhlcTickerResponse,
} from "@/lib/market/ohlc-client"
import { notifyWarning } from "@/lib/ui/ui-feedback"
import { useMarketData } from "@/store/market/use-market-data"

/**
 * Centralized static text content for MainChart component.
 */
const MAIN_CHART_TEXT = {
  currentPriceLine: "Current",
  tooltips: {
    candleChart: "Candlestick Chart",
    areaChart: "Area Chart"
  },
  liveIndicator: "Live"
} as const

const TIMEFRAME_CONFIG: Record<
  string,
  { interval: OhlcInterval; limit: number; visiblePoints: number }
> = {
  "15m": { interval: "1m", limit: 180, visiblePoints: 15 },
  "1h": { interval: "1m", limit: 240, visiblePoints: 60 },
  "4h": { interval: "5m", limit: 192, visiblePoints: 48 },
  "1D": { interval: "5m", limit: 576, visiblePoints: 288 },
  "1W": { interval: "15m", limit: 960, visiblePoints: 672 },
  "1M": { interval: "1h", limit: 960, visiblePoints: 720 },
  "3M": { interval: "4h", limit: 720, visiblePoints: 540 },
  "6M": { interval: "4h", limit: 1320, visiblePoints: 1080 },
  "ALL": { interval: "4h", limit: 2000, visiblePoints: 2000 },
}

const toChartTime = (unixSeconds: number) => unixSeconds as UTCTimestamp
const CHART_BARS_POLL_MS = 15_000
const CHART_TICKER_POLL_MS = 5_000
const CHART_MIN_MOVE = 0.00000001
const CHART_PRECISION = 8

const formatChartPrice = (value: number) => {
  if (!Number.isFinite(value)) return "0.00000000"
  const abs = Math.abs(value)
  const fractionDigits =
    abs >= 100 ? 2 : abs >= 1 ? 4 : abs >= 0.01 ? 6 : CHART_PRECISION

  return value.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

export function MainChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const mainSeriesRef = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Area"> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null)
  const priceLineRef = useRef<IPriceLine | null>(null)
  const barsPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickerPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const barsRef = useRef<OhlcBar[]>([])
  const [chartType, setChartType] = useState<"candle" | "line">("candle")
  const [timeframe, setTimeframe] = useState("1M")
  const [bars, setBars] = useState<OhlcBar[]>([])
  const [hasFetchAttempted, setHasFetchAttempted] = useState(false)
  const { setLiveRaTicker } = useMarketData()

  const syncLiveTicker = useCallback(
    (sourceBars: OhlcBar[], tickerResponse: OhlcTickerResponse | null) => {
      const latestBar = sourceBars[sourceBars.length - 1]
      const previousBar =
        sourceBars.length > 1 ? sourceBars[sourceBars.length - 2] : null
    const intrabarChange =
      latestBar && previousBar && previousBar.close > 0
        ? ((latestBar.close - previousBar.close) / previousBar.close) * 100
        : null

    const hasTickerPrice =
      tickerResponse?.success &&
      Number.isFinite(tickerResponse.priceUsd) &&
      tickerResponse.priceUsd > 0
    const hasTickerChange =
      tickerResponse?.success && Number.isFinite(tickerResponse.change24h)

    const effectivePrice = hasTickerPrice ? tickerResponse.priceUsd : latestBar?.close
    const tickerChange = hasTickerChange ? tickerResponse.change24h : null
    const hasMeaningfulTickerChange =
      tickerChange !== null && Math.abs(tickerChange) > 0.00000001
    const effectiveChange = hasMeaningfulTickerChange
      ? tickerChange
      : (intrabarChange ?? tickerChange ?? 0)

    if (Number.isFinite(effectivePrice) && effectivePrice > 0) {
      setLiveRaTicker(
        effectivePrice,
        effectiveChange,
        tickerResponse?.updatedAt ?? new Date().toISOString(),
      )
    }
    },
    [setLiveRaTicker],
  )

  const loadChartData = useCallback(async () => {
    try {
      const config = TIMEFRAME_CONFIG[timeframe] ?? TIMEFRAME_CONFIG["1M"]

      const [barsResponse, tickerResponse] = await Promise.all([
        fetchOhlcBars(config.interval, config.limit),
        fetchOhlcTicker(),
      ])

      let nextBars = barsRef.current
      if (barsResponse?.success && Array.isArray(barsResponse.bars)) {
        nextBars = barsResponse.bars.filter(
          (bar) =>
            Number.isFinite(bar.time) &&
            Number.isFinite(bar.open) &&
            Number.isFinite(bar.high) &&
            Number.isFinite(bar.low) &&
            Number.isFinite(bar.close),
        )
        if (nextBars.length > 0) {
          barsRef.current = nextBars
          setBars(nextBars)
        }
      }

      syncLiveTicker(nextBars, tickerResponse)
    } finally {
      setHasFetchAttempted(true)
    }
  }, [syncLiveTicker, timeframe])

  const loadTickerOnly = useCallback(async () => {
    try {
      const tickerResponse = await fetchOhlcTicker()
      syncLiveTicker(barsRef.current, tickerResponse)
    } catch {
      notifyWarning({
        title: "Chart Ticker Delay",
        description: "Live ticker refresh is delayed. Retrying in background.",
        dedupeKey: "main-chart-ticker-delay",
        dedupeMs: 180_000,
      })
    }
  }, [syncLiveTicker])

  useEffect(() => {
    const runBarsPoll = () => {
      if (document.visibilityState !== "visible") return
      void loadChartData()
    }
    const runTickerPoll = () => {
      if (document.visibilityState !== "visible") return
      void loadTickerOnly()
    }

    runBarsPoll()
    runTickerPoll()

    if (barsPollRef.current) {
      clearInterval(barsPollRef.current)
      barsPollRef.current = null
    }
    if (tickerPollRef.current) {
      clearInterval(tickerPollRef.current)
      tickerPollRef.current = null
    }

    barsPollRef.current = setInterval(runBarsPoll, CHART_BARS_POLL_MS)
    tickerPollRef.current = setInterval(runTickerPoll, CHART_TICKER_POLL_MS)

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState !== "visible") return
      runBarsPoll()
      runTickerPoll()
    }
    document.addEventListener("visibilitychange", handleVisibilityOrFocus)
    window.addEventListener("focus", handleVisibilityOrFocus)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus)
      window.removeEventListener("focus", handleVisibilityOrFocus)
      if (barsPollRef.current) {
        clearInterval(barsPollRef.current)
        barsPollRef.current = null
      }
      if (tickerPollRef.current) {
        clearInterval(tickerPollRef.current)
        tickerPollRef.current = null
      }
    }
  }, [loadChartData, loadTickerOnly])

  const isLoading = !hasFetchAttempted && bars.length === 0

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#525252",
      },
      localization: {
        priceFormatter: formatChartPrice,
      },
      grid: {
        vertLines: { color: "#262626", style: 1 },
        horzLines: { color: "#262626", style: 1 },
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
    })

    if (chartType === "candle") {
      mainSeriesRef.current = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderVisible: false,
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
        priceFormat: {
          type: "price",
          precision: CHART_PRECISION,
          minMove: CHART_MIN_MOVE,
        },
      })
    } else {
      mainSeriesRef.current = chart.addSeries(AreaSeries, {
        lineColor: "#22c55e",
        topColor: "rgba(34, 197, 94, 0.4)",
        bottomColor: "rgba(34, 197, 94, 0.0)",
        lineWidth: 2,
        priceFormat: {
          type: "price",
          precision: CHART_PRECISION,
          minMove: CHART_MIN_MOVE,
        },
      })
    }

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#26a69a",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "",
    })
    chart.priceScale("").applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    })

    volumeSeriesRef.current = volumeSeries
    chartRef.current = chart

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || entries[0].target !== chartContainerRef.current) {
        return
      }
      const rect = entries[0].contentRect
      chart.applyOptions({ width: rect.width, height: rect.height })
    })

    resizeObserver.observe(chartContainerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      priceLineRef.current = null
      chartRef.current = null
      mainSeriesRef.current = null
      volumeSeriesRef.current = null
    }
  }, [chartType])

  useEffect(() => {
    if (!mainSeriesRef.current || !volumeSeriesRef.current || bars.length === 0) {
      return
    }

    const mainSeries = mainSeriesRef.current
    const volumeSeries = volumeSeriesRef.current

    if (chartType === "candle") {
      ;(mainSeries as ISeriesApi<"Candlestick">).setData(
        bars.map((bar) => ({
          time: toChartTime(bar.time),
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
        })),
      )
    } else {
      ;(mainSeries as ISeriesApi<"Area">).setData(
        bars.map((bar) => ({
          time: toChartTime(bar.time),
          value: bar.close,
        })),
      )
    }

    volumeSeries.setData(
      bars.map((bar) => ({
        time: toChartTime(bar.time),
        value: bar.volume,
        color:
          bar.close >= bar.open
            ? "rgba(34, 197, 94, 0.25)"
            : "rgba(239, 68, 68, 0.25)",
      })),
    )

    if (priceLineRef.current) {
      mainSeries.removePriceLine(priceLineRef.current)
      priceLineRef.current = null
    }

    const latest = bars[bars.length - 1]
    priceLineRef.current = mainSeries.createPriceLine({
      price: latest.close,
      color: "#ef4444",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: MAIN_CHART_TEXT.currentPriceLine,
    })
  }, [bars, chartType])

  useEffect(() => {
    if (!chartRef.current || bars.length === 0) return
    const config = TIMEFRAME_CONFIG[timeframe] ?? TIMEFRAME_CONFIG["1M"]
    const visiblePoints = Math.min(config.visiblePoints, bars.length)
    chartRef.current.timeScale().setVisibleLogicalRange({
      from: Math.max(0, bars.length - visiblePoints),
      to: bars.length - 1,
    })
  }, [bars, timeframe])

  return (
    <div className="flex flex-1 flex-col relative h-full min-h-[300px] sm:min-h-[400px] lg:min-h-[340px] xl:min-h-0 bg-[#0a0a0a] rounded-xl border border-neutral-800 overflow-hidden">
      {/* Left Toolbar */}
      <div className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 rounded-full bg-[#111111] border border-neutral-800 p-1 z-10">
        <button 
          onClick={() => setChartType("candle")}
          className={`p-1.5 rounded-full transition-colors cursor-pointer ${chartType === "candle" ? "bg-[#262626] text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-800"}`}
          title={MAIN_CHART_TEXT.tooltips.candleChart}
        >
          <CandlestickChart className="h-3.5 w-3.5" />
        </button>
        <button 
          onClick={() => setChartType("line")}
          className={`p-1.5 rounded-full transition-colors cursor-pointer ${chartType === "line" ? "bg-[#262626] text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-800"}`}
          title={MAIN_CHART_TEXT.tooltips.areaChart}
        >
          <LineChart className="h-3.5 w-3.5" />
        </button>
      </div>
      
      {/* Live indicator */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-[#111111]/80 backdrop-blur-sm border border-neutral-800 rounded-full px-2.5 py-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        <span className="text-[10px] font-medium text-green-500 uppercase tracking-wider">{MAIN_CHART_TEXT.liveIndicator}</span>
      </div>

      {/* Chart Area */}
      <div className="flex-1 min-h-[180px] w-full pt-4 pl-12 sm:pl-16 pr-2 relative">
        <div ref={chartContainerRef} className="w-full h-full" />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]/60 backdrop-blur-[1px]">
            <span className="h-5 w-24 rounded bg-neutral-800 animate-pulse" />
          </div>
        )}
      </div>

      {/* Bottom Timeframes */}
      <div className="relative z-10 px-3 pb-3 pt-2 flex items-center justify-center">
        <div className="flex items-center gap-1 text-[10px] font-medium text-neutral-500 bg-[#0a0a0a] rounded-full px-1.5 py-1 border border-neutral-800 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-full sm:w-auto justify-start sm:justify-center">
          {["15m", "1h", "4h", "1D", "1W", "1M", "3M", "6M", "ALL"].map((tf) => (
            <button 
              key={tf} 
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-0.5 rounded-full transition-colors whitespace-nowrap cursor-pointer ${timeframe === tf ? "bg-[#262626] text-white" : "hover:text-white hover:bg-neutral-800/50"}`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

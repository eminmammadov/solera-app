"use client"

import { useEffect, useRef, useState } from "react"
import { CandlestickChart, LineChart } from "lucide-react"
import { createChart, ColorType, CrosshairMode, CandlestickSeries, AreaSeries, HistogramSeries, IChartApi } from "lightweight-charts"
import { candleData, lineData, volumeData } from "@/lib/chart-data"

export function MainChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [chartType, setChartType] = useState<'candle' | 'line'>('candle');
  const [timeframe, setTimeframe] = useState('1M');

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#525252',
      },
      grid: {
        vertLines: { color: '#262626', style: 1 },
        horzLines: { color: '#262626', style: 1 },
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
    });

    let mainSeries;

    if (chartType === 'candle') {
      mainSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });
      mainSeries.setData(candleData);
    } else {
      mainSeries = chart.addSeries(AreaSeries, {
        lineColor: '#22c55e',
        topColor: 'rgba(34, 197, 94, 0.4)',
        bottomColor: 'rgba(34, 197, 94, 0.0)',
        lineWidth: 2,
      });
      mainSeries.setData(lineData);
    }
    
    // Add a price line for the current price
    mainSeries.createPriceLine({
      price: candleData[candleData.length - 1].close,
      color: '#ef4444',
      lineWidth: 1,
      lineStyle: 2, // Dashed
      axisLabelVisible: true,
      title: 'Current',
    });

    // Add Volume Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // set as an overlay by setting a blank priceScaleId
    });
    
    chart.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.8, // highest point of the series will be at 80% of the chart height
        bottom: 0,
      },
    });

    volumeSeries.setData(volumeData);
    chartRef.current = chart;

    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || entries[0].target !== chartContainerRef.current) { return; }
      const newRect = entries[0].contentRect;
      chart.applyOptions({ height: newRect.height, width: newRect.width });
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [chartType]);

  // Handle timeframe changes
  useEffect(() => {
    if (!chartRef.current) return;

    const totalPoints = candleData.length;
    let visiblePoints = totalPoints;

    switch (timeframe) {
      case '1D': visiblePoints = 2; break; // Show last 2 candles for 1D on a daily chart
      case '1W': visiblePoints = 7; break;
      case '1M': visiblePoints = 30; break;
      case '3M': visiblePoints = 90; break;
      case '6M': visiblePoints = 180; break;
      case 'YTD':
        const lastDate = new Date(candleData[totalPoints - 1].time as string);
        const startOfYear = new Date(lastDate.getFullYear(), 0, 1);
        const daysYTD = Math.floor((lastDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
        visiblePoints = Math.max(2, daysYTD);
        break;
      case '1Y': visiblePoints = 365; break;
      case 'ALL': visiblePoints = totalPoints; break;
    }

    chartRef.current.timeScale().setVisibleLogicalRange({
      from: totalPoints - visiblePoints,
      to: totalPoints - 1,
    });
  }, [timeframe, chartType]);

  return (
    <div className="flex flex-1 flex-col relative h-full min-h-[300px] sm:min-h-[400px] lg:min-h-0 bg-[#0a0a0a] rounded-xl border border-neutral-800 overflow-hidden">
      {/* Left Toolbar */}
      <div className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 rounded-full bg-[#111111] border border-neutral-800 p-1 z-10">
        <button 
          onClick={() => setChartType('candle')}
          className={`p-1.5 rounded-full transition-colors cursor-pointer ${chartType === 'candle' ? 'bg-[#262626] text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
          title="Candlestick Chart"
        >
          <CandlestickChart className="h-3.5 w-3.5" />
        </button>
        <button 
          onClick={() => setChartType('line')}
          className={`p-1.5 rounded-full transition-colors cursor-pointer ${chartType === 'line' ? 'bg-[#262626] text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
          title="Area Chart"
        >
          <LineChart className="h-3.5 w-3.5" />
        </button>
      </div>
      
      {/* Chart Area */}
      <div className="flex-1 w-full h-full pt-4 pb-16 pl-12 sm:pl-16">
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>

      {/* Bottom Timeframes */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center w-full max-w-[95vw] sm:max-w-none px-4 sm:px-0 z-10">
        <div className="flex items-center gap-1 text-[10px] font-medium text-neutral-500 bg-[#0a0a0a] rounded-full px-1.5 py-1 border border-neutral-800 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-full sm:w-auto justify-start sm:justify-center">
          {['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', 'ALL'].map((tf) => (
            <button 
              key={tf} 
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-0.5 rounded-full transition-colors whitespace-nowrap cursor-pointer ${timeframe === tf ? 'bg-[#262626] text-white' : 'hover:text-white hover:bg-neutral-800/50'}`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useRef } from "react"
import { Crosshair, Pencil, Type, AlignJustify } from "lucide-react"
import { createChart, ColorType, CrosshairMode, CandlestickSeries } from "lightweight-charts"

// Simple deterministic pseudo-random number generator
const seededRandom = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

// Generate mock candlestick data
const generateCandleData = () => {
  let basePrice = 3;
  const data = [];
  let currentDate = new Date('2025-01-01');
  let seed = 42;

  for (let i = 0; i < 200; i++) {
    const open = basePrice + (seededRandom(seed++) * 40 - 20);
    const close = open + (seededRandom(seed++) * 60 - 30);
    const high = Math.max(open, close) + seededRandom(seed++) * 20;
    const low = Math.min(open, close) - seededRandom(seed++) * 20;

    data.push({
      time: currentDate.toISOString().split('T')[0],
      open,
      high,
      low,
      close,
    });

    basePrice = close;
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return data;
}

const data = generateCandleData();

export function MainChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);

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
      }
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    candlestickSeries.setData(data);
    
    // Add a price line for the current price
    candlestickSeries.createPriceLine({
      price: data[data.length - 1].close,
      color: '#ef4444',
      lineWidth: 1,
      lineStyle: 2, // Dashed
      axisLabelVisible: true,
      title: 'Current',
    });

    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || entries[0].target !== chartContainerRef.current) { return; }
      const newRect = entries[0].contentRect;
      chart.applyOptions({ height: newRect.height, width: newRect.width });
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  return (
    <div className="flex flex-1 flex-col relative h-full min-h-[300px] sm:min-h-[400px] lg:min-h-0 bg-[#0a0a0a] rounded-xl border border-neutral-800 overflow-hidden">
      {/* Left Toolbar */}
      <div className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 rounded-full bg-[#111111] border border-neutral-800 p-1 z-10">
        <button className="p-1.5 text-white rounded-full bg-[#262626] transition-colors cursor-pointer"><Crosshair className="h-3.5 w-3.5" /></button>
        <button className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
        <button className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors cursor-pointer"><Type className="h-3.5 w-3.5" /></button>
        <button className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors cursor-pointer"><AlignJustify className="h-3.5 w-3.5" /></button>
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
              className={`px-2.5 py-0.5 rounded-full transition-colors whitespace-nowrap cursor-pointer ${tf === '1D' ? 'bg-[#262626] text-white' : 'hover:text-white hover:bg-neutral-800/50'}`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

"use client";

import { OhlcContent } from "@/components/admin/ohlc/OhlcContent";

export default function AdminOhlcView() {
  return (
    <div className="admin-page flex flex-col gap-2 w-full">
      <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 sm:p-5 shrink-0">
        <h1 className="text-2xl font-bold text-white">AAA OHLC Control</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Control Raydium ingestion interval, stream lifecycle and manual sync for chart data.
        </p>
      </div>

      <OhlcContent />
    </div>
  );
}

"use client";

import { RaContent } from "@/components/admin/ra/RaContent";

export default function AdminRaView() {
  return (
    <div className="admin-page flex flex-col gap-2 w-full">
      <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 sm:p-5 shrink-0">
        <h1 className="text-2xl font-bold text-white">RA Runtime</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Manage RA mints, treasury, oracle provider, fee policy and stake/convert limits.
        </p>
      </div>

      <RaContent />
    </div>
  );
}

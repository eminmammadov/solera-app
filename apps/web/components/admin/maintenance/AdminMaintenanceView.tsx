"use client";

import { MaintenanceContent } from "@/components/admin/maintenance/MaintenanceContent";

export default function AdminMaintenanceView() {
  return (
    <div className="admin-page flex flex-col gap-2 w-full">
      <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 sm:p-5 shrink-0">
        <h1 className="text-2xl font-bold text-white">Maintenance Control</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Schedule, activate, and monitor maintenance mode for public pages.
        </p>
      </div>

      <MaintenanceContent />
    </div>
  );
}

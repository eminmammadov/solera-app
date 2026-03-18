"use client";

import Link from "next/link";
import { Clock3, ExternalLink, Wrench } from "lucide-react";

interface MaintenanceHeaderSectionProps {
  title: string;
  subtitle: string;
  previewLabel: string;
  maintenanceActive: boolean;
}

export function MaintenanceHeaderSection({
  title,
  subtitle,
  previewLabel,
  maintenanceActive,
}: MaintenanceHeaderSectionProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
      <div>
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
        <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
            maintenanceActive
              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          }`}
        >
          <Clock3 className="w-3.5 h-3.5" />
          {maintenanceActive ? "Maintenance Active" : "Operational"}
        </span>
        <Link
          href="/maintenance?preview=1"
          target="_blank"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-neutral-300 border border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {previewLabel}
        </Link>
      </div>
    </div>
  );
}

"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface MaintenanceFeedbackProps {
  error: string | null;
  success: string | null;
}

export function MaintenanceFeedback({ error, success }: MaintenanceFeedbackProps) {
  if (!error && !success) return null;

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        <p className="text-xs text-emerald-300">{success}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 flex items-center gap-2">
      <AlertTriangle className="w-4 h-4 text-red-400" />
      <p className="text-xs text-red-300">{error}</p>
    </div>
  );
}

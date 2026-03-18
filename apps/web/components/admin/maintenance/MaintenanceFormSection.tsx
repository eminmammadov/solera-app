"use client";

import { RefreshCcw, Save, Undo2 } from "lucide-react";

interface MaintenanceFormState {
  maintenanceEnabled: boolean;
  maintenanceStartsAt: string;
  maintenanceMessage: string;
}

interface MaintenanceFormSectionProps {
  form: MaintenanceFormState;
  isSaving: boolean;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  maintenanceServerTime: string | null;
  scheduledAt: string | null;
  startsAtLabel: string;
  messageLabel: string;
  refreshLabel: string;
  discardLabel: string;
  saveLabel: string;
  savingLabel: string;
  activateNowLabel: string;
  deactivateLabel: string;
  onChange: (nextForm: MaintenanceFormState) => void;
  onSave: () => void;
  onRefresh: () => void;
  onDiscard: () => void;
  onActivateNow: () => void;
  onDeactivateNow: () => void;
}

export function MaintenanceFormSection({
  form,
  isSaving,
  isLoading,
  hasUnsavedChanges,
  maintenanceServerTime,
  scheduledAt,
  startsAtLabel,
  messageLabel,
  refreshLabel,
  discardLabel,
  saveLabel,
  savingLabel,
  activateNowLabel,
  deactivateLabel,
  onChange,
  onSave,
  onRefresh,
  onDiscard,
  onActivateNow,
  onDeactivateNow,
}: MaintenanceFormSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-neutral-800 bg-[#0a0a0a] p-4">
        <div>
          <p className="text-sm text-neutral-200">Enable Maintenance</p>
          <p className="text-xs text-neutral-500 mt-1">
            When active, public pages are redirected to the maintenance screen.
          </p>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={form.maintenanceEnabled}
            onChange={(e) => onChange({ ...form, maintenanceEnabled: e.target.checked })}
          />
          <div className="h-6 w-11 rounded-full bg-neutral-700 transition-colors peer-checked:bg-amber-500/60 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full" />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="rounded-xl border border-neutral-800 bg-[#0a0a0a] p-4">
          <label className="block text-xs font-medium text-neutral-400 mb-1.5">
            {startsAtLabel}
          </label>
          <input
            type="datetime-local"
            value={form.maintenanceStartsAt}
            onChange={(e) => onChange({ ...form, maintenanceStartsAt: e.target.value })}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
          />
          <p className="text-[11px] text-neutral-500 mt-1.5">
            Leave empty to activate immediately when enabled.
          </p>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-[#0a0a0a] p-4">
          <label className="block text-xs font-medium text-neutral-400 mb-1.5">
            {messageLabel}
          </label>
          <textarea
            rows={3}
            value={form.maintenanceMessage}
            onChange={(e) => onChange({ ...form, maintenanceMessage: e.target.value })}
            maxLength={240}
            className="w-full resize-none bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
            placeholder="We are deploying infrastructure improvements. Service will resume shortly."
          />
          <p className="text-[11px] text-neutral-500 mt-1.5">
            {form.maintenanceMessage.length}/240
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onSave}
          disabled={isSaving || !hasUnsavedChanges}
          className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/15 px-4 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/25 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {isSaving ? savingLabel : saveLabel}
        </button>

        <button
          onClick={onRefresh}
          disabled={isLoading || isSaving}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          <RefreshCcw className="w-4 h-4" />
          {refreshLabel}
        </button>

        <button
          onClick={onDiscard}
          disabled={!hasUnsavedChanges || isSaving}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          <Undo2 className="w-4 h-4" />
          {discardLabel}
        </button>

        <button
          onClick={onActivateNow}
          disabled={isSaving}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {activateNowLabel}
        </button>

        <button
          onClick={onDeactivateNow}
          disabled={isSaving}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {deactivateLabel}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-neutral-500">
          {maintenanceServerTime
            ? `Last server sync: ${new Date(maintenanceServerTime).toLocaleString("en-US")}`
            : "Last server sync: unavailable"}
        </p>
        {scheduledAt && (
          <span className="text-[11px] text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-lg">
            Scheduled: {scheduledAt}
          </span>
        )}
        {hasUnsavedChanges && (
          <span className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
            Unsaved changes
          </span>
        )}
      </div>
    </div>
  );
}

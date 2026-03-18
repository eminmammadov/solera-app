"use client";

import Image from "next/image";
import {
  Link as LinkIcon,
  Loader2,
  MonitorSmartphone,
  Plus,
  RefreshCcw,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import type { HeaderFormState } from "@/components/admin/header/AdminHeaderPage";

interface AdminHeaderViewProps {
  error: string | null;
  success: string | null;
  isLoading: boolean;
  isSaving: boolean;
  form: HeaderFormState;
  hasChanges: boolean;
  previewLogoSrc: string;
  networkTextTone: string;
  defaultProjectName: string;
  defaultDescription: string;
  loadHeaderSettings: () => Promise<void>;
  setPreviewLogoErrored: (value: boolean) => void;
  setForm: React.Dispatch<React.SetStateAction<HeaderFormState>>;
  addNavLink: () => void;
  updateNavLink: (id: string, key: "name" | "href", value: string) => void;
  removeNavLink: (id: string) => void;
  resetHeaderSettings: () => void;
  saveHeaderSettings: () => void;
}

export default function AdminHeaderView({
  error,
  success,
  isLoading,
  isSaving,
  form,
  hasChanges,
  previewLogoSrc,
  networkTextTone,
  defaultProjectName,
  defaultDescription,
  loadHeaderSettings,
  setPreviewLogoErrored,
  setForm,
  addNavLink,
  updateNavLink,
  removeNavLink,
  resetHeaderSettings,
  saveHeaderSettings,
}: AdminHeaderViewProps) {
  return (
    <div className="admin-page flex flex-col gap-2 w-full h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#111111] border border-neutral-800 rounded-xl p-4 sm:p-5 shrink-0 gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Header Settings</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Manage logo, name, description, network, connect control and menu links.
          </p>
        </div>
        <button
          onClick={() => void loadHeaderSettings()}
          disabled={isLoading || isSaving}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-300 border border-neutral-700 hover:bg-neutral-800 hover:border-neutral-600 transition-colors disabled:opacity-60 cursor-pointer"
        >
          <RefreshCcw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {(error || success) && (
        <div className="rounded-xl border border-neutral-800 bg-[#111111] p-3">
          {error && <p className="text-xs text-red-300">{error}</p>}
          {!error && success && <p className="text-xs text-emerald-300">{success}</p>}
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 bg-[#111111] border border-neutral-800 rounded-xl p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 flex-1 min-h-0">
          <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 sm:p-5 flex flex-col gap-4 min-h-0">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Logo Path</label>
              <input
                value={form.logoUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, logoUrl: e.target.value }))}
                placeholder="/logos/ra-white-logo.png"
                maxLength={180}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
              <p className="text-[11px] text-neutral-500 mt-1.5">
                Local static path only. {form.logoUrl.length}/180
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Project Name</label>
              <input
                value={form.projectName}
                onChange={(e) => setForm((prev) => ({ ...prev, projectName: e.target.value }))}
                maxLength={64}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                maxLength={140}
                className="w-full resize-none bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Network</label>
                <select
                  value={form.network}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      network: e.target.value === "mainnet" ? "mainnet" : "devnet",
                    }))
                  }
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                >
                  <option value="devnet">devnet</option>
                  <option value="mainnet">mainnet</option>
                </select>
              </div>

              <label className="flex items-center justify-between bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 cursor-pointer">
                <span className="text-sm text-neutral-300">Connect Enabled</span>
                <input
                  type="checkbox"
                  checked={form.connectEnabled}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, connectEnabled: e.target.checked }))
                  }
                  className="accent-emerald-500"
                />
              </label>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-neutral-400">
                  Navigation Links ({form.navLinks.length}/10)
                </label>
                <button
                  type="button"
                  onClick={addNavLink}
                  disabled={form.navLinks.length >= 10}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-neutral-700 text-[11px] text-neutral-300 hover:text-white hover:border-neutral-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Link
                </button>
              </div>
              <div className="space-y-2 overflow-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {form.navLinks.map((link) => (
                  <div
                    key={link.id}
                    className="grid grid-cols-12 gap-2 items-center bg-neutral-900 border border-neutral-800 rounded-lg p-2"
                  >
                    <div className="col-span-4">
                      <input
                        value={link.name}
                        onChange={(e) => updateNavLink(link.id, "name", e.target.value)}
                        maxLength={24}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                        placeholder="Name"
                      />
                    </div>
                    <div className="col-span-7">
                      <div className="relative">
                        <LinkIcon className="w-3.5 h-3.5 text-neutral-500 absolute left-2 top-1/2 -translate-y-1/2" />
                        <input
                          value={link.href}
                          onChange={(e) => updateNavLink(link.id, "href", e.target.value)}
                          maxLength={120}
                          className="w-full pl-7 bg-neutral-950 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                          placeholder="/route"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeNavLink(link.id)}
                      className="col-span-1 inline-flex justify-center p-1.5 rounded text-neutral-400 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer"
                      title="Delete link"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={resetHeaderSettings}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-neutral-300 border border-neutral-700 hover:bg-neutral-800 hover:border-neutral-600 transition-colors disabled:opacity-60 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Defaults
              </button>
              <button
                onClick={saveHeaderSettings}
                disabled={isSaving || !hasChanges}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>

          <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 sm:p-5 flex flex-col gap-4 min-h-0">
            <div className="flex items-center gap-2 text-neutral-300">
              <MonitorSmartphone className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Live Preview</h3>
            </div>

            <div className="rounded-xl border border-neutral-800 overflow-hidden bg-[#0a0a0a]">
              <div className="flex h-16 items-center justify-between px-3 sm:px-4 border-b border-neutral-800/50 bg-[#0a0a0a]">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden bg-black shrink-0">
                    <Image
                      src={previewLogoSrc}
                      alt="Header logo preview"
                      width={32}
                      height={32}
                      className="object-cover"
                      onError={() => setPreviewLogoErrored(true)}
                    />
                  </div>
                  <div className="hidden sm:flex flex-col">
                    <span className="text-sm font-semibold leading-none text-white line-clamp-1">
                      {form.projectName.trim() || defaultProjectName}
                    </span>
                    <span className="text-[10px] text-neutral-500 line-clamp-1">
                      {form.description.trim() || defaultDescription}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium ${networkTextTone}`}>
                    {form.network}
                  </span>
                  <button
                    disabled={!form.connectEnabled}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      form.connectEnabled
                        ? "bg-white text-black"
                        : "bg-neutral-800 border border-neutral-700 text-neutral-500"
                    }`}
                  >
                    {form.connectEnabled ? "Connect" : "Connect Disabled"}
                  </button>
                </div>
              </div>
              <div className="px-4 py-2">
                <div className="flex flex-wrap items-center gap-3">
                  {form.navLinks.map((link) => (
                    <span key={link.id} className="text-xs text-neutral-400">
                      {link.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-500">
              Preview simulates network badge, menu links and connect button behavior.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

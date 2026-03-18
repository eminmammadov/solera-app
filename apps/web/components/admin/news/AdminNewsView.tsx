"use client";

import type { Dispatch, SetStateAction } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import {
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type {
  AdminNewsItem,
  NewsFormState,
} from "@/components/admin/news/AdminNewsPage";

interface AdminNewsViewProps {
  error: string | null;
  success: string | null;
  isLoading: boolean;
  isSaving: boolean;
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  metrics: {
    totalLikes: number;
    totalDislikes: number;
    activeItems: number;
  };
  filteredNews: AdminNewsItem[];
  isModalOpen: boolean;
  editingItem: AdminNewsItem | null;
  deleteCandidate: AdminNewsItem | null;
  form: NewsFormState;
  setForm: Dispatch<SetStateAction<NewsFormState>>;
  modalBodyMarkdownPlaceholder: string;
  openCreateModal: () => void;
  openEditModal: (item: AdminNewsItem) => void;
  openDeleteModal: (item: AdminNewsItem) => void;
  closeModal: () => void;
  closeDeleteModal: () => void;
  saveItem: () => Promise<void>;
  toggleActive: (item: AdminNewsItem) => Promise<void>;
  removeItem: () => Promise<void>;
}

export default function AdminNewsView({
  error,
  success,
  isLoading,
  isSaving,
  search,
  setSearch,
  metrics,
  filteredNews,
  isModalOpen,
  editingItem,
  deleteCandidate,
  form,
  setForm,
  modalBodyMarkdownPlaceholder,
  openCreateModal,
  openEditModal,
  openDeleteModal,
  closeModal,
  closeDeleteModal,
  saveItem,
  toggleActive,
  removeItem,
}: AdminNewsViewProps) {
  return (
    <div className="admin-page flex flex-col gap-2 w-full h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#111111] border border-neutral-800 rounded-xl p-4 sm:p-5 shrink-0 gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">News Management</h1>
          <p className="text-sm text-neutral-400 mt-1">Manage news feed content without changing frontend design.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search news..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
          <button
            onClick={openCreateModal}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Item
          </button>
        </div>
      </div>

      {(error || success) && (
        <div className="rounded-xl border border-neutral-800 bg-[#111111] p-3">
          {error && <p className="text-xs text-red-300">{error}</p>}
          {!error && success && <p className="text-xs text-emerald-300">{success}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0">
        <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
          <p className="text-[11px] text-neutral-500 uppercase tracking-wider">Total Likes</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{metrics.totalLikes}</p>
        </div>
        <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
          <p className="text-[11px] text-neutral-500 uppercase tracking-wider">Total Dislikes</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{metrics.totalDislikes}</p>
        </div>
        <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
          <p className="text-[11px] text-neutral-500 uppercase tracking-wider">Active News Items</p>
          <p className="text-2xl font-bold text-white mt-1">{metrics.activeItems}</p>
        </div>
      </div>

      <div className="flex-1 bg-[#111111] border border-neutral-800 rounded-xl overflow-hidden flex flex-col min-h-0">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          </div>
        ) : (
          <div className="flex-1 overflow-auto w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full min-w-[780px] text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-neutral-900/50 border-b border-neutral-800">
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Source</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Tags</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Likes</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Dislikes</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Created</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {filteredNews.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-sm text-neutral-500">
                      No news items found.
                    </td>
                  </tr>
                ) : (
                  filteredNews.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-900/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <p className="text-sm text-white line-clamp-1">{item.title}</p>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-neutral-300">{item.source}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {item.tags.length === 0 ? (
                            <span className="text-[11px] text-neutral-500">—</span>
                          ) : (
                            item.tags.map((tag) => (
                              <span
                                key={`${item.id}-${tag}`}
                                className="inline-flex items-center px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[11px] font-medium"
                              >
                                ${tag}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-emerald-400 font-medium">{item.upvotes}</td>
                      <td className="px-4 py-2.5 text-xs text-red-400 font-medium">{item.downvotes}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                            item.isActive
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {item.isActive ? "Active" : "Hidden"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-neutral-400">
                        {new Date(item.createdAt).toLocaleDateString("en-US")}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => toggleActive(item)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                            title={item.isActive ? "Hide" : "Activate"}
                          >
                            {item.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-blue-400 hover:bg-blue-400/10 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(item)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-4xl bg-[#111111] border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-neutral-800">
              <h3 className="text-lg font-semibold text-white">
                {editingItem ? "Edit News Item" : "Create News Item"}
              </h3>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  maxLength={220}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="News headline"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Source</label>
                <input
                  value={form.source}
                  onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}
                  maxLength={80}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="CoinDesk, Decrypt, ..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Tags</label>
                <input
                  value={form.tags}
                  onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="BTC, ETH, SOL"
                />
                <p className="text-[11px] text-neutral-500 mt-1.5">Comma-separated, max 6 tags.</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5 gap-3">
                  <label className="block text-xs font-medium text-neutral-400">Modal Body (Markdown)</label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        body: prev.body.trim().length > 0 ? prev.body : modalBodyMarkdownPlaceholder,
                      }))
                    }
                    className="text-[11px] px-2 py-1 rounded border border-neutral-700 text-neutral-300 hover:text-white hover:border-neutral-600 transition-colors cursor-pointer"
                  >
                    Use template
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <textarea
                      rows={10}
                      maxLength={2000}
                      value={form.body}
                      onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                      className="w-full resize-none bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2.5 text-[13px] leading-6 font-mono text-neutral-100 focus:outline-none focus:border-emerald-500/50 transition-colors min-h-[220px]"
                      placeholder="Write markdown content shown in the news modal."
                    />
                    <p className="text-[11px] text-neutral-500">
                      Supports headings, bold text, bullet lists, links. {form.body.length}/2000
                    </p>
                  </div>
                  <div className="min-h-[220px] rounded-lg border border-neutral-800 bg-neutral-900/40 p-3 overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {form.body.trim() ? (
                      <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-headings:my-2 prose-a:text-emerald-300 hover:prose-a:text-emerald-200">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                          {form.body}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-500">
                        Live preview appears here.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Source URL</label>
                <input
                  type="url"
                  value={form.articleUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, articleUrl: e.target.value }))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="https://..."
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="accent-emerald-500"
                />
                Show in public News feed
              </label>
            </div>

            <div className="p-5 border-t border-neutral-800 flex items-center justify-end gap-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={saveItem}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingItem ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteCandidate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeDeleteModal} />
          <div className="relative w-full max-w-md bg-[#111111] border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-neutral-800">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Delete News Item?</h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    This action is permanent and cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 py-4">
              <p className="text-sm text-neutral-300">
                <span className="text-neutral-500 mr-1">Title:</span>
                <span className="text-white">{deleteCandidate.title}</span>
              </p>
            </div>

            <div className="p-5 border-t border-neutral-800 flex items-center justify-end gap-2">
              <button
                onClick={closeDeleteModal}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800 transition-colors disabled:opacity-60 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={removeItem}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

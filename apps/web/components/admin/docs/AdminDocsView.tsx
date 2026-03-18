"use client";

import type { Dispatch, SetStateAction } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import {
  BookOpen,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type {
  AdminDocsCategory,
  AdminDocsPage,
  CategoryFormState,
  DeleteTarget,
  DocsIcon,
  PageFormState,
  SocialLinkFormState,
  SectionFormState,
} from "@/components/admin/docs/AdminDocsPage";

interface AdminDocsViewProps {
  categories: AdminDocsCategory[];
  isLoading: boolean;
  isSaving: boolean;
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  error: string | null;
  success: string | null;
  isCategoryModalOpen: boolean;
  editingCategory: AdminDocsCategory | null;
  categoryForm: CategoryFormState;
  setCategoryForm: Dispatch<SetStateAction<CategoryFormState>>;
  isPageModalOpen: boolean;
  editingPage: AdminDocsPage | null;
  pageForm: PageFormState;
  setPageForm: Dispatch<SetStateAction<PageFormState>>;
  docsVersion: string;
  setDocsVersion: Dispatch<SetStateAction<string>>;
  socialLinksForm: SocialLinkFormState[];
  deleteTarget: DeleteTarget | null;
  metrics: { totalCategories: number; totalPages: number; totalSections: number };
  filteredPages: Array<AdminDocsPage & { categoryTitle: string; categoryIcon: DocsIcon }>; 
  markdownPreview: string;
  openCreateCategoryModal: () => void;
  openCreatePageModal: () => void;
  saveDocsSettings: () => Promise<void>;
  addSocialLink: () => void;
  updateSocialLink: (id: string, key: "label" | "href", value: string) => void;
  removeSocialLink: (id: string) => void;
  openEditCategoryModal: (category: AdminDocsCategory) => void;
  openDeleteCategory: (category: AdminDocsCategory) => void;
  openEditPageModal: (page: AdminDocsPage) => void;
  openDeletePage: (page: AdminDocsPage & { categoryTitle: string; categoryIcon: DocsIcon }) => void;
  closeCategoryModal: () => void;
  saveCategory: () => Promise<void>;
  closePageModal: () => void;
  slugify: (value: string) => string;
  addSection: () => void;
  removeSection: (sectionId: string) => void;
  updateSection: (sectionId: string, key: keyof SectionFormState, value: string | number) => void;
  savePage: () => Promise<void>;
  closeDeleteModal: () => void;
  confirmDelete: () => Promise<void>;
  iconOptions: DocsIcon[];
  iconBadgeTone: (icon: DocsIcon) => string;
}

export default function AdminDocsView({
  categories,
  isLoading,
  isSaving,
  search,
  setSearch,
  error,
  success,
  isCategoryModalOpen,
  editingCategory,
  categoryForm,
  setCategoryForm,
  isPageModalOpen,
  editingPage,
  pageForm,
  setPageForm,
  docsVersion,
  setDocsVersion,
  socialLinksForm,
  deleteTarget,
  metrics,
  filteredPages,
  markdownPreview,
  openCreateCategoryModal,
  openCreatePageModal,
  saveDocsSettings,
  addSocialLink,
  updateSocialLink,
  removeSocialLink,
  openEditCategoryModal,
  openDeleteCategory,
  openEditPageModal,
  openDeletePage,
  closeCategoryModal,
  saveCategory,
  closePageModal,
  slugify,
  addSection,
  removeSection,
  updateSection,
  savePage,
  closeDeleteModal,
  confirmDelete,
  iconOptions,
  iconBadgeTone,
}: AdminDocsViewProps) {
  return (
    <div className="admin-page flex flex-col gap-2 w-full h-full">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-[#111111] border border-neutral-800 rounded-xl p-4 sm:p-5 shrink-0 gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Documentation Management</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Manage docs categories, pages and sections without changing frontend layout.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search pages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
          <button
            onClick={openCreateCategoryModal}
            className="px-4 py-2.5 rounded-lg text-sm font-medium border border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-neutral-600 hover:text-white transition-colors cursor-pointer"
          >
            New Category
          </button>
          <button
            onClick={openCreatePageModal}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Page
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
          <p className="text-[11px] text-neutral-500 uppercase tracking-wider">Categories</p>
          <p className="text-2xl font-bold text-white mt-1">{metrics.totalCategories}</p>
        </div>
        <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
          <p className="text-[11px] text-neutral-500 uppercase tracking-wider">Docs Pages</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{metrics.totalPages}</p>
        </div>
        <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
          <p className="text-[11px] text-neutral-500 uppercase tracking-wider">Sections</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{metrics.totalSections}</p>
        </div>
      </div>

      <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 lg:p-5 shrink-0">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Docs UI Settings</h2>
            <p className="text-xs text-neutral-500 mt-1">
              Manage social media links and docs version shown on the public documentation page.
            </p>
          </div>
          <button
            onClick={saveDocsSettings}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save UI Settings
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-1">
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Version</label>
            <input
              value={docsVersion}
              onChange={(e) => setDocsVersion(e.target.value)}
              maxLength={24}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
              placeholder="1.0.0"
            />
          </div>

          <div className="xl:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-400">
                Social Media Links ({socialLinksForm.length}/8)
              </label>
              <button
                type="button"
                onClick={addSocialLink}
                disabled={socialLinksForm.length >= 8}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border border-neutral-700 text-neutral-300 hover:text-white hover:border-neutral-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Link
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {socialLinksForm.map((link, index) => (
                <div
                  key={link.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2 rounded-lg border border-neutral-800 bg-neutral-900/40 p-2.5"
                >
                  <input
                    value={link.label}
                    onChange={(e) => updateSocialLink(link.id, "label", e.target.value)}
                    maxLength={32}
                    placeholder={`Label ${index + 1}`}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                  <input
                    value={link.href}
                    onChange={(e) => updateSocialLink(link.id, "href", e.target.value)}
                    maxLength={300}
                    placeholder="https://..."
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => removeSocialLink(link.id)}
                    className="px-2.5 py-2 rounded-md text-neutral-400 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer"
                    title="Remove link"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-2 flex-1 min-h-0">
        <div className="bg-[#111111] border border-neutral-800 rounded-xl overflow-hidden flex flex-col min-h-[300px]">
          <div className="px-4 py-3 border-b border-neutral-800">
            <h2 className="text-sm font-semibold text-white">Categories</h2>
          </div>
          <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
              </div>
            ) : categories.length === 0 ? (
              <div className="px-4 py-8 text-sm text-neutral-500">No categories yet.</div>
            ) : (
              <div className="divide-y divide-neutral-800">
                {categories.map((category) => (
                  <div key={category.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${iconBadgeTone(category.icon)}`}
                        >
                          {category.icon}
                        </div>
                        <p className="text-sm text-white font-medium mt-2">{category.title}</p>
                        <p className="text-[11px] text-neutral-500 mt-1">
                          {category.items.length} pages • order {category.order}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditCategoryModal(category)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-blue-400 hover:bg-blue-400/10 transition-colors cursor-pointer"
                          title="Edit category"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteCategory(category)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer"
                          title="Delete category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-2 bg-[#111111] border border-neutral-800 rounded-xl overflow-hidden flex flex-col min-h-[300px]">
          <div className="px-4 py-3 border-b border-neutral-800">
            <h2 className="text-sm font-semibold text-white">Pages</h2>
          </div>
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
            </div>
          ) : (
            <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <table className="w-full min-w-[760px] text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-neutral-900/50 border-b border-neutral-800">
                    <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Page</th>
                    <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Slug</th>
                    <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Sections</th>
                    <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Order</th>
                    <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {filteredPages.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-sm text-neutral-500">
                        No pages found.
                      </td>
                    </tr>
                  ) : (
                    filteredPages.map((page) => (
                      <tr key={page.id} className="hover:bg-neutral-900/30 transition-colors">
                        <td className="px-4 py-2.5">
                          <p className="text-sm text-white line-clamp-1">{page.title}</p>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-neutral-300">{page.slug}</td>
                        <td className="px-4 py-2.5 text-xs text-neutral-300">{page.categoryTitle}</td>
                        <td className="px-4 py-2.5 text-xs text-neutral-300">{page.sections.length}</td>
                        <td className="px-4 py-2.5 text-xs text-neutral-300">{page.order}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditPageModal(page)}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-blue-400 hover:bg-blue-400/10 transition-colors cursor-pointer"
                              title="Edit page"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openDeletePage(page)}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer"
                              title="Delete page"
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
      </div>

      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeCategoryModal} />
          <div className="relative w-full max-w-md bg-[#111111] border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-neutral-800">
              <h3 className="text-base font-semibold text-white">
                {editingCategory ? "Edit Category" : "Create Category"}
              </h3>
              <button
                onClick={closeCategoryModal}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Title</label>
                <input
                  value={categoryForm.title}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, title: e.target.value }))}
                  maxLength={80}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="Getting Started"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Icon</label>
                <select
                  value={categoryForm.icon}
                  onChange={(e) =>
                    setCategoryForm((prev) => ({
                      ...prev,
                      icon: (e.target.value as DocsIcon) || "Rocket",
                    }))
                  }
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                >
                  {iconOptions.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Order</label>
                <input
                  type="number"
                  min={0}
                  value={categoryForm.order}
                  onChange={(e) =>
                    setCategoryForm((prev) => ({
                      ...prev,
                      order: Number.parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
            </div>
            <div className="p-5 border-t border-neutral-800 flex items-center justify-end gap-2">
              <button
                onClick={closeCategoryModal}
                className="px-4 py-2 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={saveCategory}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingCategory ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isPageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closePageModal} />
          <div className="relative w-full max-w-6xl max-h-[92vh] bg-[#111111] border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-neutral-800 shrink-0">
              <h3 className="text-base font-semibold text-white">
                {editingPage ? "Edit Documentation Page" : "Create Documentation Page"}
              </h3>
              <button
                onClick={closePageModal}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-5 grid grid-cols-1 xl:grid-cols-2 gap-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Page Title</label>
                  <input
                    value={pageForm.title}
                    onChange={(e) => setPageForm((prev) => ({ ...prev, title: e.target.value }))}
                    maxLength={120}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    placeholder="Platform Overview"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Slug</label>
                    <div className="flex gap-2">
                      <input
                        value={pageForm.slug}
                        onChange={(e) => setPageForm((prev) => ({ ...prev, slug: e.target.value }))}
                        maxLength={120}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                        placeholder="platform-overview"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setPageForm((prev) => ({
                            ...prev,
                            slug: slugify(prev.title),
                          }))
                        }
                        className="px-3 py-2 rounded-lg text-xs border border-neutral-700 text-neutral-300 hover:text-white hover:border-neutral-600 transition-colors cursor-pointer"
                      >
                        Auto
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Order</label>
                    <input
                      type="number"
                      min={0}
                      value={pageForm.order}
                      onChange={(e) =>
                        setPageForm((prev) => ({
                          ...prev,
                          order: Number.parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Category</label>
                  <select
                    value={pageForm.categoryId}
                    onChange={(e) =>
                      setPageForm((prev) => ({
                        ...prev,
                        categoryId: e.target.value,
                      }))
                    }
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.title} ({category.icon})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-neutral-400">
                      Sections ({pageForm.sections.length})
                    </label>
                    <button
                      type="button"
                      onClick={addSection}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border border-neutral-700 text-neutral-300 hover:text-white hover:border-neutral-600 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add section
                    </button>
                  </div>

                  <div className="space-y-3">
                    {pageForm.sections.map((section, index) => (
                      <div key={section.id} className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-neutral-300">
                            Section {index + 1}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeSection(section.id)}
                            className="p-1 rounded text-neutral-500 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input
                            value={section.title}
                            onChange={(e) => updateSection(section.id, "title", e.target.value)}
                            maxLength={160}
                            placeholder="Section title"
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                          />
                          <input
                            value={section.anchor}
                            onChange={(e) => updateSection(section.id, "anchor", e.target.value)}
                            maxLength={120}
                            placeholder="anchor-id (optional)"
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                          />
                        </div>

                        <input
                          type="number"
                          min={0}
                          value={section.order}
                          onChange={(e) =>
                            updateSection(
                              section.id,
                              "order",
                              Number.parseInt(e.target.value, 10) || 0,
                            )
                          }
                          className="w-24 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                        />

                        <textarea
                          value={section.content}
                          onChange={(e) => updateSection(section.id, "content", e.target.value)}
                          rows={6}
                          className="w-full resize-y bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs leading-5 text-neutral-100 focus:outline-none focus:border-emerald-500/50 transition-colors"
                          placeholder="Use blank lines to split paragraphs."
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="min-h-[300px] rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <p className="text-xs font-medium text-neutral-300 uppercase tracking-wider">
                    Live Preview
                  </p>
                </div>
                <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-h2:my-3 prose-a:text-emerald-300 hover:prose-a:text-emerald-200">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                    {markdownPreview}
                  </ReactMarkdown>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-neutral-800 flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={closePageModal}
                className="px-4 py-2 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={savePage}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingPage ? "Update Page" : "Create Page"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeDeleteModal} />
          <div className="relative w-full max-w-md bg-[#111111] border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-neutral-800">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {deleteTarget.type === "category" ? "Delete Category?" : "Delete Page?"}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    {deleteTarget.type === "category"
                      ? "This action removes the category and all pages inside it."
                      : "This action permanently removes this documentation page."}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 py-4">
              <p className="text-sm text-neutral-300">
                <span className="text-neutral-500 mr-1">Target:</span>
                <span className="text-white">{deleteTarget.title}</span>
              </p>
              {deleteTarget.type === "category" && (
                <p className="text-xs text-neutral-500 mt-2">
                  {deleteTarget.pagesCount} pages will be deleted with this category.
                </p>
              )}
              {deleteTarget.type === "page" && (
                <p className="text-xs text-neutral-500 mt-2">
                  Category: {deleteTarget.categoryTitle}
                </p>
              )}
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
                onClick={confirmDelete}
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

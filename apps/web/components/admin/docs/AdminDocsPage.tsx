"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteAdminDocsEntity,
  fetchAdminDocsBundle,
  saveAdminDocsCategory,
  saveAdminDocsPage,
  saveAdminDocsSettings,
} from "@/lib/admin/docs-admin";
import { useAdminAsyncController } from "@/hooks/admin/use-admin-async-controller";
import { useAdminAuth } from "@/store/admin/use-admin-auth";
import {
  DEFAULT_DOCS_UI_SETTINGS,
  normalizeDocsUiSettings,
  type DocsSocialLink,
} from "@/lib/docs/docs-settings";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { useFeedbackToast } from "@/hooks/use-feedback-toast";
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
import AdminDocsView from "@/components/admin/docs/AdminDocsView";

export type DocsIcon = "Rocket" | "Cpu" | "Shield" | "Code";

export interface AdminDocsSection {
  id: string;
  title: string;
  anchor: string;
  content: string[];
  order: number;
}

export interface AdminDocsPage {
  id: string;
  title: string;
  slug: string;
  order: number;
  categoryId: string;
  sections: AdminDocsSection[];
}

export interface AdminDocsCategory {
  id: string;
  title: string;
  icon: DocsIcon;
  order: number;
  items: AdminDocsPage[];
}

export interface AdminDocsSettingsResponse {
  version: string;
  socialLinks: DocsSocialLink[];
  updatedAt: string;
}

export interface SectionFormState {
  id: string;
  title: string;
  anchor: string;
  content: string;
  order: number;
}

export interface PageFormState {
  title: string;
  slug: string;
  categoryId: string;
  order: number;
  sections: SectionFormState[];
}

export interface CategoryFormState {
  title: string;
  icon: DocsIcon;
  order: number;
}

export interface SocialLinkFormState {
  id: string;
  label: string;
  href: string;
}

export type DeleteTarget =
  | {
      type: "category";
      id: string;
      title: string;
      pagesCount: number;
    }
  | {
      type: "page";
      id: string;
      title: string;
      categoryTitle: string;
    };

const ICON_OPTIONS: DocsIcon[] = ["Rocket", "Cpu", "Shield", "Code"];

const createSectionId = () =>
  `section-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const createSocialLinkId = () =>
  `social-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const createEmptySection = (order = 0): SectionFormState => ({
  id: createSectionId(),
  title: "",
  anchor: "",
  content: "",
  order,
});

const EMPTY_CATEGORY_FORM: CategoryFormState = {
  title: "",
  icon: "Rocket",
  order: 0,
};

const EMPTY_PAGE_FORM: PageFormState = {
  title: "",
  slug: "",
  categoryId: "",
  order: 0,
  sections: [createEmptySection(0)],
};

const EMPTY_SOCIAL_LINK: SocialLinkFormState = {
  id: createSocialLinkId(),
  label: "",
  href: "",
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const parseSectionParagraphs = (value: string): string[] =>
  value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .slice(0, 40);

const iconBadgeTone = (icon: DocsIcon): string => {
  switch (icon) {
    case "Cpu":
      return "bg-blue-500/10 border-blue-500/20 text-blue-400";
    case "Shield":
      return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
    case "Code":
      return "bg-amber-500/10 border-amber-500/20 text-amber-400";
    default:
      return "bg-purple-500/10 border-purple-500/20 text-purple-400";
  }
};

export default function AdminDocsPage() {
  const { token } = useAdminAuth();
  const asyncState = useAdminAsyncController(true);
  const { runLoad: runDocsLoad } = asyncState;
  const [categories, setCategories] = useState<AdminDocsCategory[]>([]);
  const [search, setSearch] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  useFeedbackToast({
    scope: "admin-docs",
    error: asyncState.error,
    success,
    errorTitle: "Documentation Error",
    successTitle: "Documentation",
  });

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminDocsCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(EMPTY_CATEGORY_FORM);

  const [isPageModalOpen, setIsPageModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<AdminDocsPage | null>(null);
  const [pageForm, setPageForm] = useState<PageFormState>(EMPTY_PAGE_FORM);
  const [docsVersion, setDocsVersion] = useState(DEFAULT_DOCS_UI_SETTINGS.version);
  const [socialLinksForm, setSocialLinksForm] = useState<SocialLinkFormState[]>(
    DEFAULT_DOCS_UI_SETTINGS.socialLinks.map((link) => ({
      id: createSocialLinkId(),
      label: link.label,
      href: link.href,
    })),
  );

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const loadDocs = useCallback(async () => {
    const payload = await runDocsLoad(
      () =>
        fetchAdminDocsBundle<
          AdminDocsCategory[],
          AdminDocsSettingsResponse
        >({
          token,
        }),
      {
        fallbackMessage: "Failed to load documentation content",
      },
    );

    if (!payload) {
      return;
    }

    const { docs: docsData, settings: settingsPayload } = payload;
      setCategories(Array.isArray(docsData) ? docsData : []);

      const settingsData = normalizeDocsUiSettings(settingsPayload);
      setDocsVersion(settingsData.version);
      setSocialLinksForm(
        settingsData.socialLinks.map((link) => ({
          id: createSocialLinkId(),
          label: link.label,
          href: link.href,
        })),
      );
  }, [runDocsLoad, token]);

  useEffect(() => {
    const runInitialLoad = async () => {
      await loadDocs();
    };

    void runInitialLoad();
  }, [loadDocs]);

  const pages = useMemo(() => {
    return categories.flatMap((category) =>
      category.items.map((page) => ({
        ...page,
        categoryTitle: category.title,
        categoryIcon: category.icon,
      })),
    );
  }, [categories]);

  const filteredPages = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return pages;

    return pages.filter((page) => {
      return (
        page.title.toLowerCase().includes(query) ||
        page.slug.toLowerCase().includes(query) ||
        page.categoryTitle.toLowerCase().includes(query)
      );
    });
  }, [pages, search]);

  const metrics = useMemo(
    () => ({
      totalCategories: categories.length,
      totalPages: pages.length,
      totalSections: pages.reduce((sum, page) => sum + page.sections.length, 0),
    }),
    [categories, pages],
  );

  const markdownPreview = useMemo(() => {
    const chunks = pageForm.sections
      .map((section) => {
        const title = section.title.trim() || "Untitled Section";
        const content = section.content.trim() || "_No content yet._";
        return `## ${title}\n\n${content}`;
      })
      .join("\n\n");

    if (!chunks.trim()) {
      return "_Live preview appears here._";
    }
    return chunks;
  }, [pageForm.sections]);

  const addSocialLink = () => {
    if (socialLinksForm.length >= 8) return;
    setSocialLinksForm((prev) => [...prev, { ...EMPTY_SOCIAL_LINK, id: createSocialLinkId() }]);
  };

  const updateSocialLink = (
    id: string,
    key: "label" | "href",
    value: string,
  ) => {
    setSocialLinksForm((prev) =>
      prev.map((link) => (link.id === id ? { ...link, [key]: value } : link)),
    );
  };

  const removeSocialLink = (id: string) => {
    setSocialLinksForm((prev) => prev.filter((link) => link.id !== id));
  };

  const saveDocsSettings = async () => {
    if (asyncState.isActing) return;

    const normalizedVersion = docsVersion.trim();
    if (!normalizedVersion) {
      asyncState.setError("Version is required.");
      return;
    }

    const normalizedLinks = socialLinksForm
      .map((link) => ({
        label: link.label.trim(),
        href: link.href.trim(),
      }))
      .filter((link) => link.label.length > 0 || link.href.length > 0);

    if (normalizedLinks.length === 0) {
      asyncState.setError("Add at least one social media link.");
      return;
    }

    for (const [index, link] of normalizedLinks.entries()) {
      if (!link.label || !link.href) {
        asyncState.setError(`Social link ${index + 1}: label and URL are required.`);
        return;
      }

      try {
        const parsed = new URL(link.href);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          asyncState.setError(`Social link ${index + 1}: URL must start with http or https.`);
          return;
        }
      } catch {
        asyncState.setError(`Social link ${index + 1}: invalid URL.`);
        return;
      }
    }

    setSuccess(null);

    const payload = await asyncState.runAction(
      async () =>
        normalizeDocsUiSettings(
          await saveAdminDocsSettings<AdminDocsSettingsResponse>({
            token,
            payload: JSON.stringify({
              version: normalizedVersion,
              socialLinks: normalizedLinks,
            }),
          }),
        ),
      {
        fallbackMessage: "Failed to save docs settings",
      },
    );

    if (!payload) {
      return;
    }

    setDocsVersion(payload.version);
    setSocialLinksForm(
      payload.socialLinks.map((link) => ({
        id: createSocialLinkId(),
        label: link.label,
        href: link.href,
      })),
    );
    setSuccess("Documentation UI settings updated.");
  };

  const openCreateCategoryModal = () => {
    setEditingCategory(null);
    setCategoryForm(EMPTY_CATEGORY_FORM);
    setIsCategoryModalOpen(true);
    asyncState.clearError();
    setSuccess(null);
  };

  const openEditCategoryModal = (category: AdminDocsCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      title: category.title,
      icon: category.icon,
      order: category.order,
    });
    setIsCategoryModalOpen(true);
    asyncState.clearError();
    setSuccess(null);
  };

  const closeCategoryModal = () => {
    if (asyncState.isActing) return;
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    setCategoryForm(EMPTY_CATEGORY_FORM);
  };

  const saveCategory = async () => {
    if (asyncState.isActing) return;
    if (!categoryForm.title.trim()) {
      asyncState.setError("Category title is required.");
      return;
    }

    setSuccess(null);

    const isEdit = Boolean(editingCategory);
    const saved = await asyncState.runAction(
      () =>
        saveAdminDocsCategory<AdminDocsCategory>({
          token,
          categoryId: editingCategory?.id,
          payload: JSON.stringify({
            title: categoryForm.title.trim(),
            icon: categoryForm.icon,
            order: Number.isFinite(categoryForm.order)
              ? Math.max(0, Math.trunc(categoryForm.order))
              : 0,
          }),
        }),
      {
        fallbackMessage: "Failed to save category",
      },
    );

    if (!saved) {
      return;
    }

    await loadDocs();
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    setCategoryForm(EMPTY_CATEGORY_FORM);
    setSuccess(isEdit ? "Category updated." : "Category created.");
  };

  const openCreatePageModal = () => {
    if (categories.length === 0) {
      asyncState.setError("Create at least one category before adding a documentation page.");
      return;
    }

    setEditingPage(null);
    setPageForm({
      ...EMPTY_PAGE_FORM,
      categoryId: categories[0].id,
      sections: [createEmptySection(0)],
    });
    setIsPageModalOpen(true);
    asyncState.clearError();
    setSuccess(null);
  };

  const openEditPageModal = (page: AdminDocsPage) => {
    setEditingPage(page);
    setPageForm({
      title: page.title,
      slug: page.slug,
      categoryId: page.categoryId,
      order: page.order,
      sections:
        page.sections.length > 0
          ? page.sections.map((section) => ({
              id: section.id,
              title: section.title,
              anchor: section.anchor,
              content: section.content.join("\n\n"),
              order: section.order,
            }))
          : [createEmptySection(0)],
    });
    setIsPageModalOpen(true);
    asyncState.clearError();
    setSuccess(null);
  };

  const closePageModal = () => {
    if (asyncState.isActing) return;
    setIsPageModalOpen(false);
    setEditingPage(null);
    setPageForm(EMPTY_PAGE_FORM);
  };

  const updateSection = (
    sectionId: string,
    key: keyof SectionFormState,
    value: string | number,
  ) => {
    setPageForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId ? { ...section, [key]: value } : section,
      ),
    }));
  };

  const addSection = () => {
    setPageForm((prev) => ({
      ...prev,
      sections: [...prev.sections, createEmptySection(prev.sections.length)],
    }));
  };

  const removeSection = (sectionId: string) => {
    setPageForm((prev) => {
      const nextSections = prev.sections.filter((section) => section.id !== sectionId);
      return {
        ...prev,
        sections: nextSections.length > 0 ? nextSections : [createEmptySection(0)],
      };
    });
  };

  const savePage = async () => {
    if (asyncState.isActing) return;

    const pageTitle = pageForm.title.trim();
    if (!pageTitle) {
      asyncState.setError("Page title is required.");
      return;
    }

    const normalizedSlug = slugify(pageForm.slug.trim() || pageTitle);
    if (!normalizedSlug) {
      asyncState.setError("Page slug is invalid.");
      return;
    }

    if (!pageForm.categoryId) {
      asyncState.setError("Please select a category.");
      return;
    }

    let sectionsPayload: Array<{
      title: string;
      anchor?: string;
      content: string[];
      order: number;
    }> = [];

    try {
      const normalizedSections: typeof sectionsPayload = [];

      pageForm.sections.forEach((section, index) => {
        const rawTitle = section.title.trim();
        const rawAnchor = section.anchor.trim();
        const paragraphs = parseSectionParagraphs(section.content);
        const hasData =
          rawTitle.length > 0 || rawAnchor.length > 0 || section.content.trim().length > 0;

        if (!hasData) {
          return;
        }

        if (!rawTitle) {
          throw new Error(`Section ${index + 1}: title is required.`);
        }
        if (paragraphs.length === 0) {
          throw new Error(`Section ${index + 1}: content is required.`);
        }

        const order = Number.isFinite(section.order)
          ? Math.max(0, Math.trunc(section.order))
          : index;

        normalizedSections.push({
          title: rawTitle,
          anchor: rawAnchor ? slugify(rawAnchor) : undefined,
          content: paragraphs,
          order,
        });
      });

      sectionsPayload = normalizedSections;
    } catch (sectionError) {
      const message =
        sectionError instanceof Error ? sectionError.message : "Invalid section data.";
      asyncState.setError(message);
      return;
    }

    if (sectionsPayload.length === 0) {
      asyncState.setError("Add at least one section with content.");
      return;
    }

    setSuccess(null);

    const isEdit = Boolean(editingPage);
    const saved = await asyncState.runAction(
      () =>
        saveAdminDocsPage<AdminDocsPage>({
          token,
          pageId: editingPage?.id,
          payload: JSON.stringify({
            title: pageTitle,
            slug: normalizedSlug,
            categoryId: pageForm.categoryId,
            order: Number.isFinite(pageForm.order)
              ? Math.max(0, Math.trunc(pageForm.order))
              : 0,
            sections: sectionsPayload,
          }),
        }),
      {
        fallbackMessage: "Failed to save page",
      },
    );

    if (!saved) {
      return;
    }

    await loadDocs();
    setIsPageModalOpen(false);
    setEditingPage(null);
    setPageForm(EMPTY_PAGE_FORM);
    setSuccess(isEdit ? "Documentation page updated." : "Documentation page created.");
  };

  const openDeleteCategory = (category: AdminDocsCategory) => {
    if (asyncState.isActing) return;
    setDeleteTarget({
      type: "category",
      id: category.id,
      title: category.title,
      pagesCount: category.items.length,
    });
    asyncState.clearError();
    setSuccess(null);
  };

  const openDeletePage = (page: (typeof pages)[number]) => {
    if (asyncState.isActing) return;
    setDeleteTarget({
      type: "page",
      id: page.id,
      title: page.title,
      categoryTitle: page.categoryTitle,
    });
    asyncState.clearError();
    setSuccess(null);
  };

  const closeDeleteModal = () => {
    if (asyncState.isActing) return;
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (asyncState.isActing || !deleteTarget) return;

    setSuccess(null);

    const deleted = await asyncState.runAction(
      () =>
        deleteAdminDocsEntity<{ success: boolean }>({
          token,
          type: deleteTarget.type,
          id: deleteTarget.id,
        }),
      {
        fallbackMessage: "Failed to delete item",
      },
    );

    if (!deleted) {
      return;
    }

    await loadDocs();
    setDeleteTarget(null);
    setSuccess(
      deleteTarget.type === "category"
        ? "Category deleted."
        : "Documentation page deleted.",
    );
  };

  return (
    <AdminDocsView
      categories={categories}
      isLoading={asyncState.isLoading}
      isSaving={asyncState.isActing}
      search={search}
      setSearch={setSearch}
      error={asyncState.error}
      success={success}
      isCategoryModalOpen={isCategoryModalOpen}
      editingCategory={editingCategory}
      categoryForm={categoryForm}
      setCategoryForm={setCategoryForm}
      isPageModalOpen={isPageModalOpen}
      editingPage={editingPage}
      pageForm={pageForm}
      setPageForm={setPageForm}
      docsVersion={docsVersion}
      setDocsVersion={setDocsVersion}
      socialLinksForm={socialLinksForm}
      deleteTarget={deleteTarget}
      metrics={metrics}
      filteredPages={filteredPages}
      markdownPreview={markdownPreview}
      openCreateCategoryModal={openCreateCategoryModal}
      openCreatePageModal={openCreatePageModal}
      saveDocsSettings={saveDocsSettings}
      addSocialLink={addSocialLink}
      updateSocialLink={updateSocialLink}
      removeSocialLink={removeSocialLink}
      openEditCategoryModal={openEditCategoryModal}
      openDeleteCategory={openDeleteCategory}
      openEditPageModal={openEditPageModal}
      openDeletePage={openDeletePage}
      closeCategoryModal={closeCategoryModal}
      saveCategory={saveCategory}
      closePageModal={closePageModal}
      slugify={slugify}
      addSection={addSection}
      removeSection={removeSection}
      updateSection={updateSection}
      savePage={savePage}
      closeDeleteModal={closeDeleteModal}
      confirmDelete={confirmDelete}
      iconOptions={ICON_OPTIONS}
      iconBadgeTone={iconBadgeTone}
    />
  );
}

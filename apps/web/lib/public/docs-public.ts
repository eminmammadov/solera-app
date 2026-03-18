import { backendRoutes } from "@/lib/api/backend-routes";
import { publicRequestJson } from "@/lib/api/public-api";
import type { DocCategory } from "@/lib/docs/docs-types";
import {
  DEFAULT_DOCS_UI_SETTINGS,
  normalizeDocsUiSettings,
  type DocsUiSettings,
} from "@/lib/docs/docs-settings";

const DOCS_ICONS = new Set(["Rocket", "Cpu", "Shield", "Code"]);
const DOCS_CACHE_TTL_MS = 5 * 60 * 1000;
const DOCS_SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000;

let docsCache: { value: DocCategory[]; expiresAt: number } | null = null;
let docsSettingsCache: { value: DocsUiSettings; expiresAt: number } | null =
  null;

const sanitizeSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeDocsData = (raw: unknown): DocCategory[] => {
  if (!Array.isArray(raw)) return [];

  const categories: DocCategory[] = [];
  for (const categoryItem of raw) {
    if (!categoryItem || typeof categoryItem !== "object") continue;

    const category = categoryItem as {
      title?: unknown;
      icon?: unknown;
      items?: unknown;
    };

    if (typeof category.title !== "string" || !category.title.trim()) continue;
    if (!Array.isArray(category.items)) continue;

    const items = category.items
      .map((pageItem) => {
        if (!pageItem || typeof pageItem !== "object") return null;

        const page = pageItem as {
          slug?: unknown;
          title?: unknown;
          sections?: unknown;
        };

        if (typeof page.title !== "string" || !page.title.trim()) return null;
        const slug = typeof page.slug === "string" ? sanitizeSlug(page.slug) : "";
        if (!slug) return null;

        const sectionsRaw = Array.isArray(page.sections) ? page.sections : [];
        const sections = sectionsRaw
          .map((sectionItem, sectionIndex) => {
            if (!sectionItem || typeof sectionItem !== "object") return null;

            const section = sectionItem as {
              id?: unknown;
              title?: unknown;
              content?: unknown;
            };

            if (typeof section.title !== "string" || !section.title.trim()) {
              return null;
            }
            if (!Array.isArray(section.content)) return null;

            const content = section.content
              .filter((paragraph): paragraph is string => typeof paragraph === "string")
              .map((paragraph) => paragraph.trim())
              .filter((paragraph) => paragraph.length > 0);

            if (content.length === 0) return null;

            const sectionId =
              typeof section.id === "string" && section.id.trim().length > 0
                ? section.id.trim()
                : `${slug}-section-${sectionIndex + 1}`;

            return {
              id: sectionId,
              title: section.title.trim(),
              content,
            };
          })
          .filter(
            (
              section,
            ): section is { id: string; title: string; content: string[] } =>
              Boolean(section),
          );

        return {
          slug,
          title: page.title.trim(),
          sections,
        };
      })
      .filter(
        (
          item,
        ): item is {
          slug: string;
          title: string;
          sections: { id: string; title: string; content: string[] }[];
        } => Boolean(item),
      );

    if (items.length === 0) continue;

    categories.push({
      title: category.title.trim(),
      icon:
        typeof category.icon === "string" && DOCS_ICONS.has(category.icon)
          ? (category.icon as DocCategory["icon"])
          : "Rocket",
      items,
    });
  }

  return categories;
};

export const getCachedPublicDocsCategories = (): DocCategory[] | null =>
  docsCache && docsCache.expiresAt > Date.now() ? docsCache.value : null;

export const getCachedPublicDocsUiSettings = (): DocsUiSettings | null =>
  docsSettingsCache && docsSettingsCache.expiresAt > Date.now()
    ? docsSettingsCache.value
    : null;

export const fetchPublicDocsCategories = async (
  force = false,
): Promise<DocCategory[]> => {
  if (!force) {
    const cached = getCachedPublicDocsCategories();
    if (cached) {
      return cached;
    }
  }

  const categories = normalizeDocsData(
    await publicRequestJson<unknown>({
      path: backendRoutes.docs.root,
      fallbackMessage: "Failed to load docs.",
      cache: "no-store",
      cacheTtlMs: 10_000,
      minIntervalMs: 400,
    }),
  );

  docsCache = {
    value: categories,
    expiresAt: Date.now() + DOCS_CACHE_TTL_MS,
  };

  return categories;
};

export const fetchPublicDocsUiSettings = async (
  force = false,
): Promise<DocsUiSettings> => {
  if (!force) {
    const cached = getCachedPublicDocsUiSettings();
    if (cached) {
      return cached;
    }
  }

  const settings = normalizeDocsUiSettings(
    await publicRequestJson<unknown>({
      path: backendRoutes.docs.settings,
      fallbackMessage: "Failed to load docs settings.",
      cache: "no-store",
      cacheTtlMs: 10_000,
      minIntervalMs: 400,
    }),
  );

  docsSettingsCache = {
    value: settings,
    expiresAt: Date.now() + DOCS_SETTINGS_CACHE_TTL_MS,
  };

  return settings;
};

export const getDefaultPublicDocsUiSettings = () => DEFAULT_DOCS_UI_SETTINGS;

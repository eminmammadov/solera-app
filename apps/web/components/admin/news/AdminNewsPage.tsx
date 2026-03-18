"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteAdminNewsItem,
  fetchAllAdminNews,
  saveAdminNewsItem,
  updateAdminNewsStatus,
} from "@/lib/admin/news-admin";
import { useAdminAsyncController } from "@/hooks/admin/use-admin-async-controller";
import { useAdminAuth } from "@/store/admin/use-admin-auth";
import { useFeedbackToast } from "@/hooks/use-feedback-toast";
import AdminNewsView from "@/components/admin/news/AdminNewsView";

export interface AdminNewsItem {
  id: string;
  title: string;
  source: string;
  tags: string[];
  body: string | null;
  articleUrl: string | null;
  isActive: boolean;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  updatedAt: string;
}

export interface NewsFormState {
  title: string;
  source: string;
  tags: string;
  body: string;
  articleUrl: string;
  isActive: boolean;
}

const EMPTY_FORM: NewsFormState = {
  title: "",
  source: "",
  tags: "",
  body: "",
  articleUrl: "",
  isActive: true,
};

const MODAL_BODY_MARKDOWN_PLACEHOLDER = `## Summary
Write the key update in 1-2 lines.

### Why it matters
- Point one
- Point two

[Read full article](https://example.com)`;

const normalizeTags = (value: string): string[] =>
  value
    .split(",")
    .map((tag) => tag.trim().replace(/^\$+/, "").toUpperCase())
    .filter((tag) => tag.length > 0)
    .slice(0, 6);

export default function AdminNewsPage() {
  const { token } = useAdminAuth();
  const asyncState = useAdminAsyncController(true);
  const {
    runLoad: runNewsLoad,
    runAction: runNewsAction,
    clearError: clearNewsError,
    isActing: isNewsActing,
    setError: setNewsError,
  } = asyncState;
  const [newsItems, setNewsItems] = useState<AdminNewsItem[]>([]);
  const [search, setSearch] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  useFeedbackToast({
    scope: "admin-news",
    error: asyncState.error,
    success,
    errorTitle: "News Management Error",
    successTitle: "News Management",
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminNewsItem | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<AdminNewsItem | null>(null);
  const [form, setForm] = useState<NewsFormState>(EMPTY_FORM);

  const loadNews = useCallback(async () => {
    const aggregated = await runNewsLoad(
      () => fetchAllAdminNews<AdminNewsItem>({ token }),
      {
        fallbackMessage: "Failed to load news items",
      },
    );

    if (aggregated) {
      setNewsItems(aggregated);
    }
  }, [runNewsLoad, token]);

  useEffect(() => {
    const runInitialLoad = async () => {
      await loadNews();
    };

    void runInitialLoad();
  }, [loadNews]);

  const filteredNews = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return newsItems;

    return newsItems.filter((item) => {
      const tags = item.tags.join(" ").toLowerCase();
      return (
        item.title.toLowerCase().includes(normalized) ||
        item.source.toLowerCase().includes(normalized) ||
        tags.includes(normalized)
      );
    });
  }, [newsItems, search]);

  const metrics = useMemo(() => {
    return newsItems.reduce(
      (acc, item) => {
        acc.totalLikes += item.upvotes;
        acc.totalDislikes += item.downvotes;
        if (item.isActive) acc.activeItems += 1;
        return acc;
      },
      { totalLikes: 0, totalDislikes: 0, activeItems: 0 },
    );
  }, [newsItems]);

  const openCreateModal = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
    clearNewsError();
    setSuccess(null);
  };

  const openEditModal = (item: AdminNewsItem) => {
    setEditingItem(item);
    setForm({
      title: item.title,
      source: item.source,
      tags: item.tags.join(", "),
      body: item.body ?? "",
      articleUrl: item.articleUrl ?? "",
      isActive: item.isActive,
    });
    setIsModalOpen(true);
    clearNewsError();
    setSuccess(null);
  };

  const closeModal = () => {
    if (asyncState.isActing) return;
    setIsModalOpen(false);
    setEditingItem(null);
    setForm(EMPTY_FORM);
  };

  const saveItem = async () => {
    if (isNewsActing) return;

    if (!form.title.trim() || !form.source.trim()) {
      setNewsError("Title and source are required.");
      return;
    }

    setSuccess(null);

    const payload = {
      title: form.title.trim(),
      source: form.source.trim(),
      tags: normalizeTags(form.tags),
      body: form.body.trim() || null,
      articleUrl: form.articleUrl.trim() || null,
      isActive: form.isActive,
    };

    const isEdit = Boolean(editingItem);
    const saved = await runNewsAction(
      () =>
        saveAdminNewsItem<AdminNewsItem>({
          token,
          newsId: editingItem?.id,
          payload: JSON.stringify(payload),
        }),
      {
        fallbackMessage: "Failed to save news item",
      },
    );

    if (!saved) {
      return;
    }

    if (isEdit) {
      setNewsItems((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
      setSuccess("News item updated.");
    } else {
      setNewsItems((prev) => [saved, ...prev]);
      setSuccess("News item created.");
    }

    setIsModalOpen(false);
    setEditingItem(null);
    setForm(EMPTY_FORM);
  };

  const toggleActive = async (item: AdminNewsItem) => {
    if (isNewsActing) return;

    setSuccess(null);

    const updated = await runNewsAction(
      () =>
        updateAdminNewsStatus<AdminNewsItem>({
          token,
          newsId: item.id,
          isActive: !item.isActive,
        }),
      {
        fallbackMessage: "Failed to update news status",
      },
    );

    if (!updated) {
      return;
    }

    setNewsItems((prev) => prev.map((news) => (news.id === updated.id ? updated : news)));
    setSuccess(updated.isActive ? "News item activated." : "News item hidden from feed.");
  };

  const openDeleteModal = (item: AdminNewsItem) => {
    if (asyncState.isActing) return;
    setDeleteCandidate(item);
    asyncState.clearError();
    setSuccess(null);
  };

  const closeDeleteModal = () => {
    if (asyncState.isActing) return;
    setDeleteCandidate(null);
  };

  const removeItem = async () => {
    if (asyncState.isActing || !deleteCandidate) return;

    setSuccess(null);

    const deleted = await asyncState.runAction(
      () =>
        deleteAdminNewsItem<AdminNewsItem>({
          token,
          newsId: deleteCandidate.id,
        }),
      {
        fallbackMessage: "Failed to delete news item",
      },
    );

    if (!deleted) {
      return;
    }

    setNewsItems((prev) => prev.filter((news) => news.id !== deleteCandidate.id));
    setSuccess("News item deleted.");
    setDeleteCandidate(null);
  };

  return (
    <AdminNewsView
      error={asyncState.error}
      success={success}
      isLoading={asyncState.isLoading}
      isSaving={asyncState.isActing}
      search={search}
      setSearch={setSearch}
      metrics={metrics}
      filteredNews={filteredNews}
      isModalOpen={isModalOpen}
      editingItem={editingItem}
      deleteCandidate={deleteCandidate}
      form={form}
      setForm={setForm}
      modalBodyMarkdownPlaceholder={MODAL_BODY_MARKDOWN_PLACEHOLDER}
      openCreateModal={openCreateModal}
      openEditModal={openEditModal}
      openDeleteModal={openDeleteModal}
      closeModal={closeModal}
      closeDeleteModal={closeDeleteModal}
      saveItem={saveItem}
      toggleActive={toggleActive}
      removeItem={removeItem}
    />
  );
}

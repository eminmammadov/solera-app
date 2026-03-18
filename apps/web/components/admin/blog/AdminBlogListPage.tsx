"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminAuth } from "@/store/admin/use-admin-auth";
import Link from "next/link";
import { Plus, Edit2, Trash2, Eye, EyeOff, Loader2, AlertTriangle, X, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { deleteAdminBlogPost, fetchAdminBlogPosts } from "@/lib/admin/blog-admin";
import { useAdminAsyncController } from "@/hooks/admin/use-admin-async-controller";
import { notifyError } from "@/lib/ui/ui-feedback";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  author: string;
  isPublished: boolean;
  publishedAt: string | null;
}

export default function AdminBlogList() {
  const { token } = useAdminAuth();
  const loadAsync = useAdminAsyncController(true);
  const deleteAsync = useAdminAsyncController(false);
  const { runLoad: runBlogListLoad } = loadAsync;
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(15);

  useEffect(() => {
    setVisibleCount(15);
  }, [searchQuery]);

  const fetchPosts = useCallback(async () => {
    await runBlogListLoad(
      async () =>
        fetchAdminBlogPosts<BlogPost[]>({
          token,
          params: { limit: 200, page: 1 },
        }),
      {
        fallbackMessage: "Unable to fetch blog posts.",
        onSuccess: setPosts,
        onError: (message) => {
          notifyError({
            title: "Network Error",
            description: message,
            dedupeKey: "admin:blog:list-load-failed",
          });
        },
        captureError: false,
      },
    );
  }, [runBlogListLoad, token]);

  useEffect(() => {
    void (async () => {
      await fetchPosts();
    })();
  }, [fetchPosts]);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

  const confirmDelete = (id: string) => {
    setPostToDelete(id);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    // We don't reset postToDelete yet if it's currently deleting, 
    // to avoid layout shifts, but for simplicity we can clear it:
    if (!deleteAsync.isActing) {
      setPostToDelete(null);
    }
  };

  const handleDelete = async () => {
    if (!postToDelete) return;

    setDeletingPostId(postToDelete);
    try {
      const deleted = await deleteAsync.runAction(
        async () =>
          deleteAdminBlogPost<{ success: boolean }>({
            token,
            id: postToDelete,
          }),
        {
          fallbackMessage: "Could not delete the post right now.",
          onError: (message) => {
            notifyError({
              title: "Delete Failed",
              description: message,
              dedupeKey: "admin:blog:delete-failed",
            });
          },
          captureError: false,
        },
      );
      if (!deleted) return;

      setPosts((prev) => prev.filter((p) => p.id !== postToDelete));
      setDeleteModalOpen(false);
      setPostToDelete(null);
    } finally {
      setDeletingPostId(null);
    }
  };

  const filteredPosts = posts.filter((post) => 
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    post.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loadAsync.isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="admin-page flex flex-col gap-2 w-full h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#111111] border border-neutral-800 rounded-xl p-4 sm:p-5 shrink-0 gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Blog Posts</h1>
          <p className="text-sm text-neutral-400 mt-1">Manage all blog content on your platform</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input 
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
          <Link 
            href="/admin/blog/new" 
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Post
          </Link>
        </div>
      </div>

      <div className="flex-1 bg-[#111111] border border-neutral-800 rounded-xl overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-auto w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full min-w-[700px] text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-neutral-900/50 border-b border-neutral-800">
              <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Post</th>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Category</th>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {filteredPosts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-neutral-500">
                  No blog posts found.
                </td>
              </tr>
            ) : (
              filteredPosts.slice(0, visibleCount).map((post) => (
                <tr key={post.id} className="hover:bg-neutral-900/30 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white line-clamp-1">{post.title}</span>
                      <span className="text-[11px] text-neutral-500 line-clamp-1">{post.slug}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[11px] font-medium uppercase tracking-wider">
                      {post.category}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {post.isPublished ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[11px] font-medium border border-emerald-500/20 uppercase tracking-wider">
                        <Eye className="w-3 h-3" /> Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[11px] font-medium border border-amber-500/20 uppercase tracking-wider">
                        <EyeOff className="w-3 h-3" /> Draft
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                      {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : "—"}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/admin/blog/${post.id}`}
                        className="p-1.5 text-neutral-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>
                        <button
                        onClick={() => confirmDelete(post.id)}
                        disabled={deletingPostId === post.id}
                        className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        title="Delete"
                      >
                        {deletingPostId === post.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {filteredPosts.length > visibleCount && (
          <div className="flex justify-center p-4 border-t border-neutral-800 shrink-0">
            <button
              onClick={() => setVisibleCount((prev) => prev + 15)}
              className="px-6 py-2.5 rounded-lg bg-[#1a1a1a] hover:bg-[#222222] border border-neutral-800 hover:border-neutral-700 text-white text-[11px] font-bold uppercase tracking-wider transition-all duration-300 active:scale-95 cursor-pointer shadow-lg"
            >
              Load More Posts
            </button>
          </div>
        )}
        </div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeDeleteModal}
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-[#111111] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-neutral-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-red-500/10 border border-red-500/20">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Delete Blog Post</h3>
                </div>
                <button
                  onClick={closeDeleteModal}
                  disabled={deleteAsync.isActing}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5">
                <p className="text-neutral-400 text-sm leading-relaxed mb-4">
                  Are you sure you want to delete this blog post? This action cannot be undone and will permanently remove the content from the database.
                </p>
                
                {/* Visual feedback of the specific post being deleted */}
                {postToDelete && (
                  <div className="bg-neutral-900/50 border border-neutral-800 outline outline-1 outline-neutral-800/50 p-3 rounded-lg flex flex-col gap-1">
                    <span className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Target Post</span>
                    <span className="text-sm font-medium text-white line-clamp-1">
                      {posts.find(p => p.id === postToDelete)?.title || "Unknown Post"}
                    </span>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-5 border-t border-neutral-800 bg-neutral-900/20 shrink-0">
                <button
                  onClick={closeDeleteModal}
                  disabled={deleteAsync.isActing}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteAsync.isActing}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.2)] disabled:opacity-50 cursor-pointer"
                >
                  {deleteAsync.isActing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Post
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

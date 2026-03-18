"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/store/admin/use-admin-auth";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import {
  fetchAdminBlogPostById,
  updateAdminBlogPost,
  uploadAdminBlogCoverImage,
} from "@/lib/admin/blog-admin";
import { useAdminAsyncController } from "@/hooks/admin/use-admin-async-controller";
import { notifyError, notifySuccess } from "@/lib/ui/ui-feedback";
import { BlogPostFormFields, type BlogPostFormData } from "@/components/admin/blog/BlogPostFormFields";

interface AdminBlogPostPayload extends Omit<BlogPostFormData, "publishedAt" | "imageUrl"> {
  publishedAt: string | null;
  imageUrl: string | null;
}

export default function AdminBlogEdit({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { token } = useAdminAuth();
  const loadAsync = useAdminAsyncController(true);
  const saveAsync = useAdminAsyncController(false);
  const uploadAsync = useAdminAsyncController(false);
  const { runLoad: runBlogEditLoad } = loadAsync;
  
  const [formData, setFormData] = useState<BlogPostFormData>({
    title: "",
    slug: "",
    summary: "",
    content: [""],
    category: "",
    author: "",
    readTime: "",
    imageUrl: "",
    isPublished: false,
    publishedAt: ""
  });

  // Fetch the existing post
  useEffect(() => {
    const fetchPost = async () => {
      const payload = await runBlogEditLoad(
        async () =>
          fetchAdminBlogPostById<AdminBlogPostPayload>({
            token,
            id,
          }),
        {
          fallbackMessage: "Could not load this post.",
          onError: (message) => {
            notifyError({
              title: "Load Failed",
              description: message,
              dedupeKey: `admin:blog:load-failed:${id}`,
            });
            router.push("/admin/blog");
          },
          captureError: false,
        },
      );
      if (!payload) return;

      const formattedDate = payload.publishedAt
        ? new Date(payload.publishedAt).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16);
      setFormData({
        title: payload.title,
        slug: payload.slug,
        summary: payload.summary,
        content: Array.isArray(payload.content) ? payload.content : [""],
        category: payload.category,
        author: payload.author,
        readTime: payload.readTime,
        imageUrl: payload.imageUrl || "",
        isPublished: Boolean(payload.isPublished),
        publishedAt: formattedDate
      });
    };
    
    if (id) {
      void fetchPost();
    }
  }, [id, router, runBlogEditLoad, token]);

  // Auto-generate slug from title (only if slug matches title structure, else leave manual edits alone)
  const generateSlug = () => {
    if (formData.title) {
      const generated = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setFormData(prev => ({ ...prev, slug: generated }));
    }
  };

  const updateContent = (value: string) => {
    setFormData(prev => ({ ...prev, content: [value] }));
  };

  const handleCoverUpload = async (file: File) => {
    await uploadAsync.runAction(
      async () => uploadAdminBlogCoverImage({ token, file }),
      {
        fallbackMessage: "Failed to upload cover image.",
        onSuccess: (data) => {
          setFormData((prev) => ({ ...prev, imageUrl: data.url }));
          notifySuccess({
            title: "Cover Uploaded",
            description: "Blog cover image uploaded successfully.",
            dedupeKey: `admin:blog:cover-uploaded:${id}`,
            dedupeMs: 2_000,
          });
        },
        onError: (message) => {
          notifyError({
            title: "Upload Failed",
            description: message,
            dedupeKey: `admin:blog:cover-upload-failed:${id}`,
          });
        },
        captureError: false,
      },
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveAsync.runAction(
      async () => {
        const cleanedData = {
          title: formData.title,
          slug: formData.slug,
          summary: formData.summary,
          content: formData.content.filter(p => p.trim() !== ""),
          category: formData.category,
          author: formData.author,
          readTime: formData.readTime,
          imageUrl: formData.imageUrl.trim() || null,
          isPublished: formData.isPublished,
          publishedAt: new Date(formData.publishedAt).toISOString(),
        };

        return updateAdminBlogPost<{ id: string }, typeof cleanedData>({
          token,
          id,
          payload: cleanedData,
        });
      },
      {
        fallbackMessage: "Could not update the post.",
        onSuccess: () => {
          router.push("/admin/blog");
        },
        onError: (message) => {
          notifyError({
            title: "Update Failed",
            description: message,
            dedupeKey: `admin:blog:update-failed:${id}`,
          });
        },
        captureError: false,
      },
    );
  };

  if (loadAsync.isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="admin-page flex flex-col gap-2 w-full h-full">
      <div className="flex justify-between items-center bg-[#111111] border border-neutral-800 rounded-xl p-4 sm:p-5 shrink-0">
        <div className="flex items-center gap-4">
          <Link 
            href="/admin/blog"
            className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Edit Post</h1>
            <p className="text-sm text-neutral-400 mt-1">Update existing blog article</p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saveAsync.isActing || uploadAsync.isActing}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saveAsync.isActing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Update Post
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <BlogPostFormFields
          formData={formData}
          onChange={(partial) => setFormData((prev) => ({ ...prev, ...partial }))}
          onContentChange={updateContent}
          onGenerateSlug={generateSlug}
          isUploadingImage={uploadAsync.isActing}
          onUploadImage={handleCoverUpload}
          onClearImage={() => setFormData((prev) => ({ ...prev, imageUrl: "" }))}
        />
      </form>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/store/admin/use-admin-auth";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import {
  createAdminBlogPost,
  uploadAdminBlogCoverImage,
} from "@/lib/admin/blog-admin";
import { useAdminAsyncController } from "@/hooks/admin/use-admin-async-controller";
import { notifyError, notifySuccess } from "@/lib/ui/ui-feedback";
import { BlogPostFormFields, type BlogPostFormData } from "@/components/admin/blog/BlogPostFormFields";

export default function AdminBlogNew() {
  const router = useRouter();
  const { token } = useAdminAuth();
  const saveAsync = useAdminAsyncController(false);
  const uploadAsync = useAdminAsyncController(false);
  
  const [formData, setFormData] = useState<BlogPostFormData>({
    title: "",
    slug: "",
    summary: "",
    content: [""],
    category: "",
    author: "Solera Team",
    readTime: "5 min read",
    imageUrl: "",
    isPublished: false,
    publishedAt: new Date().toISOString().slice(0, 16)
  });

  // Auto-generate slug from title
  useEffect(() => {
    if (formData.title && !formData.slug) {
      const generated = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      const timer = window.setTimeout(() => {
        setFormData(prev => ({ ...prev, slug: generated }));
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [formData.title, formData.slug]);

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
            dedupeKey: "admin:blog:cover-uploaded",
            dedupeMs: 2_000,
          });
        },
        onError: (message) => {
          notifyError({
            title: "Upload Failed",
            description: message,
            dedupeKey: "admin:blog:cover-upload-failed",
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
          ...formData,
          content: formData.content.filter(p => p.trim() !== ""),
          imageUrl: formData.imageUrl.trim() || null,
          publishedAt: new Date(formData.publishedAt).toISOString()
        };

        return createAdminBlogPost<{ id: string }, typeof cleanedData>({
          token,
          payload: cleanedData,
        });
      },
      {
        fallbackMessage: "Could not create the post.",
        onSuccess: () => {
          router.push("/admin/blog");
        },
        onError: (message) => {
          notifyError({
            title: "Create Failed",
            description: message,
            dedupeKey: "admin:blog:create-failed",
          });
        },
        captureError: false,
      },
    );
  };

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
            <h1 className="text-xl font-bold text-white">Create New Post</h1>
            <p className="text-sm text-neutral-400 mt-1">Write a new blog article</p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saveAsync.isActing || uploadAsync.isActing}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saveAsync.isActing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Publish
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <BlogPostFormFields
          formData={formData}
          onChange={(partial) => setFormData((prev) => ({ ...prev, ...partial }))}
          onContentChange={updateContent}
          isUploadingImage={uploadAsync.isActing}
          onUploadImage={handleCoverUpload}
          onClearImage={() => setFormData((prev) => ({ ...prev, imageUrl: "" }))}
        />
      </form>
    </div>
  );
}

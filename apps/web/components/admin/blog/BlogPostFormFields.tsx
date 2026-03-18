"use client";

import Image from "next/image";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { normalizeImageSrc } from "@/lib/ui/image-src";

export interface BlogPostFormData {
  title: string;
  slug: string;
  summary: string;
  content: string[];
  category: string;
  author: string;
  readTime: string;
  imageUrl: string;
  isPublished: boolean;
  publishedAt: string;
}

interface BlogPostFormFieldsProps {
  formData: BlogPostFormData;
  onChange: (partial: Partial<BlogPostFormData>) => void;
  onContentChange: (value: string) => void;
  onGenerateSlug?: () => void;
  isUploadingImage?: boolean;
  onUploadImage?: (file: File) => void;
  onClearImage?: () => void;
}

export function BlogPostFormFields({
  formData,
  onChange,
  onContentChange,
  onGenerateSlug,
  isUploadingImage = false,
  onUploadImage,
  onClearImage,
}: BlogPostFormFieldsProps) {
  const normalizedImageSrc = normalizeImageSrc(formData.imageUrl);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      <div className="md:col-span-2 flex flex-col gap-2">
        <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Title</label>
            {onGenerateSlug ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => onChange({ title: e.target.value })}
                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={onGenerateSlug}
                  className="px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:border-neutral-700 transition cursor-pointer"
                  title="Generate slug from title"
                >
                  Auto Slug
                </button>
              </div>
            ) : (
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => onChange({ title: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-medium"
                placeholder="Post title..."
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Summary</label>
            <textarea
              required
              rows={3}
              value={formData.summary}
              onChange={(e) => onChange({ summary: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm resize-none"
              placeholder="Brief summary of the post..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Content (Markdown Supported)</label>
            <div className="space-y-3">
              <textarea
                required
                rows={15}
                value={formData.content.join('\n\n')}
                onChange={(e) => onContentChange(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm resize-y"
                placeholder="Write your article here using Markdown...&#10;&#10;# Heading 1&#10;## Heading 2&#10;**Bold text**&#10;*Italic text*&#10;- List item 1&#10;&#10;[Link to website](https://...)"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
          <h3 className="text-sm font-medium text-white border-b border-neutral-800 pb-2 mb-3">Settings</h3>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Status</label>
            <select
              value={formData.isPublished ? "published" : "draft"}
              onChange={(e) => onChange({ isPublished: e.target.value === "published" })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-all"
            >
              <option value="draft">Draft (Hidden)</option>
              <option value="published">Published (Visible)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Publish Date</label>
            <input
              type="datetime-local"
              required
              value={formData.publishedAt}
              onChange={(e) => onChange({ publishedAt: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-all"
            />
          </div>

          <div className="pt-2 border-t border-neutral-800"></div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">URL Slug</label>
            <input
              type="text"
              required
              value={formData.slug}
              onChange={(e) => onChange({ slug: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-300 text-sm focus:outline-none focus:border-purple-500 transition-all font-mono"
              placeholder="post-url-slug"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Category</label>
            <input
              type="text"
              required
              value={formData.category}
              onChange={(e) => onChange({ category: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-all"
              placeholder="e.g. Announcement"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Author</label>
            <input
              type="text"
              required
              value={formData.author}
              onChange={(e) => onChange({ author: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Cover Image</label>
            <div className="space-y-3">
              <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-700 bg-neutral-900 px-3 py-3 text-sm text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white cursor-pointer">
                {isUploadingImage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading cover...
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-4 w-4" />
                    {normalizedImageSrc ? "Replace cover image" : "Upload cover image"}
                  </>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  disabled={isUploadingImage}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file || !onUploadImage) return;
                    onUploadImage(file);
                    e.currentTarget.value = "";
                  }}
                />
              </label>

              <p className="text-[11px] text-neutral-500">
                PNG, JPG, WEBP or GIF. Max 5MB. The uploaded file will be stored as a root-relative cover path.
              </p>

              {normalizedImageSrc ? (
                <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/60">
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/30">
                    <Image
                      src={normalizedImageSrc}
                      alt={formData.title || "Blog cover preview"}
                      fill
                      sizes="(max-width: 768px) 100vw, 320px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-neutral-800 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-neutral-300 truncate">
                        {formData.imageUrl}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onClearImage}
                      disabled={isUploadingImage}
                      className="inline-flex items-center gap-1 rounded-lg border border-neutral-700 px-2 py-1 text-[11px] font-medium text-neutral-300 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-[11px] text-neutral-500">
                  No cover uploaded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

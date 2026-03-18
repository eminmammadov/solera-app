"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { fetchPublicBlogPosts } from "@/lib/public/blog-public"
import { normalizeImageSrc } from "@/lib/ui/image-src"
import { notifyWarning } from "@/lib/ui/ui-feedback"

interface BlogPost {
  id?: string;
  title: string;
  slug: string;
  category: string;
  publishedAt: string;
  imageUrl?: string;
}

/**
 * Centralized static text content for TopNews component.
 */
const TOP_NEWS_TEXT = {
  title: "Latest blog"
} as const

export function TopNews() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchLatestPosts = async () => {
      try {
        const data = await fetchPublicBlogPosts<BlogPost>({ limit: 5, page: 1 })
        if (Array.isArray(data) && data.length > 0) {
          setPosts(data.slice(0, 5)) // Take top 5 latest posts safely
        } else {
          setPosts([])
        }
      } catch {
        setPosts([])
        notifyWarning({
          title: "Latest Blog Unavailable",
          description: "Latest blog items could not be loaded.",
          dedupeKey: "latest-blog-fetch",
          dedupeMs: 120_000,
        })
      }
      setIsLoading(false)
    }
    fetchLatestPosts()
  }, [])

  useEffect(() => {
    if (isHovered || posts.length === 0) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % posts.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [isHovered, posts.length])

  if (!isLoading && posts.length === 0) return null;

  const nextSlide = () => {
    if (posts.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % posts.length)
    }
  }

  const prevSlide = () => {
    if (posts.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + posts.length) % posts.length)
    }
  }

  const currentNews = posts.length > 0 ? posts[currentIndex] || posts[0] : null
  const nextNews = posts.length > 0 ? posts[(currentIndex + 1) % posts.length] || posts[0] : null
  const currentImageSrc = normalizeImageSrc(currentNews?.imageUrl)
  const nextImageSrc = normalizeImageSrc(nextNews?.imageUrl)

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
    return new Date(dateString).toLocaleDateString('en-US', options)
  }

  return (
    <div 
      className="flex flex-col p-4 bg-[#111111] rounded-xl border border-neutral-800 shrink-0 relative overflow-hidden group h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="text-[17px] font-medium text-white">{TOP_NEWS_TEXT.title}</h3>
        <div className="flex items-center gap-1">
          <button 
            onClick={prevSlide}
            disabled={isLoading || posts.length <= 1}
            className="flex items-center justify-center p-1 cursor-pointer rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-neutral-700 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button 
            onClick={nextSlide}
            disabled={isLoading || posts.length <= 1}
            className="flex items-center justify-center p-1 cursor-pointer rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-neutral-700 disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 w-full min-h-[52px]">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col gap-2">
            <div className="flex items-center gap-3 p-1.5 -mx-1.5 rounded-lg">
              <div className="relative w-10 h-10 rounded-md shrink-0 bg-neutral-800 animate-pulse"></div>
              <div className="flex flex-col flex-1 min-w-0 space-y-2 py-1">
                <div className="h-3.5 bg-neutral-800 rounded w-full animate-pulse"></div>
                <div className="h-3.5 bg-neutral-800 rounded w-2/3 animate-pulse"></div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-2 bg-neutral-800 rounded w-16 animate-pulse"></div>
                  <div className="h-2 bg-neutral-800 rounded w-12 animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Second Skeleton item, visible only on tablet */}
            <div className="hidden sm:flex lg:hidden items-center gap-3 p-1.5 -mx-1.5 rounded-lg">
              <div className="relative w-10 h-10 rounded-md shrink-0 bg-neutral-800 animate-pulse"></div>
              <div className="flex flex-col flex-1 min-w-0 space-y-2 py-1">
                <div className="h-3.5 bg-neutral-800 rounded w-full animate-pulse"></div>
                <div className="h-3.5 bg-neutral-800 rounded w-2/3 animate-pulse"></div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-2 bg-neutral-800 rounded w-16 animate-pulse"></div>
                  <div className="h-2 bg-neutral-800 rounded w-12 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        ) : currentNews && nextNews ? (
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="absolute inset-0 flex flex-col gap-2"
            >
              <Link
              href={`/blog/${currentNews.slug}`}
              className="flex items-center gap-3 hover:bg-neutral-800/50 p-1.5 -mx-1.5 rounded-lg transition-colors cursor-pointer"
            >
                <div className="relative w-10 h-10 rounded-md overflow-hidden shrink-0 bg-neutral-800">
                  {currentImageSrc ? (
                    <Image
                      src={currentImageSrc}
                      alt={currentNews.title}
                      fill
                      sizes="40px"
                      className="object-cover relative z-10"
                    />
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-neutral-900 z-10"></div>
                    <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-40 mix-blend-overlay z-20"></div>
                  </>
                )}
              </div>
              
              <div className="flex flex-col flex-1 min-w-0">
                <h4 className="text-[13px] font-medium text-white leading-tight line-clamp-2 mb-1">
                  {currentNews.title}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                  <span className="font-medium text-emerald-500">{currentNews.category}</span>
                  <span>•</span>
                  <span>{formatDate(currentNews.publishedAt)}</span>
                </div>
              </div>
              
              <ExternalLink className="h-3.5 w-3.5 text-neutral-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>

            {/* Second item, visible only on tablet */}
            {posts.length > 1 && (
              <Link
                href={`/blog/${nextNews.slug}`}
                className="hidden sm:flex lg:hidden items-center gap-3 hover:bg-neutral-800/50 p-1.5 -mx-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <div className="relative w-10 h-10 rounded-md overflow-hidden shrink-0 bg-neutral-800">
                  {nextImageSrc ? (
                    <Image
                      src={nextImageSrc}
                      alt={nextNews.title}
                      fill
                      sizes="40px"
                      className="object-cover relative z-10"
                    />
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-neutral-900 z-10"></div>
                      <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-40 mix-blend-overlay z-20"></div>
                    </>
                  )}
                </div>
                
                <div className="flex flex-col flex-1 min-w-0">
                  <h4 className="text-[13px] font-medium text-white leading-tight line-clamp-2 mb-1">
                    {nextNews.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                    <span className="font-medium text-emerald-500">{nextNews.category}</span>
                    <span>•</span>
                    <span>{formatDate(nextNews.publishedAt)}</span>
                  </div>
                </div>
                
                <ExternalLink className="h-3.5 w-3.5 text-neutral-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            )}
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>

      {/* Progress Indicators */}
      <div className="flex items-center gap-1 mt-auto pt-4 justify-center shrink-0 min-h-[21px]">
        {isLoading ? (
          <div className="h-1 w-8 bg-neutral-800 rounded-full animate-pulse"></div>
        ) : (
          posts.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-1 rounded-full transition-all duration-300 ${
                idx === currentIndex ? 'w-3 bg-white' : 'w-1 bg-neutral-700'
              }`}
            />
          ))
        )}
      </div>
    </div>
  )
}

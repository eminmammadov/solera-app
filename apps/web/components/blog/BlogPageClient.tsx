"use client"

import { useState, useEffect } from "react"

import Link from "next/link"
import Image from "next/image"
import { Search, Calendar, X } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { fetchPublicBlogPosts } from "@/lib/public/blog-public"
import { notifyError } from "@/lib/ui/ui-feedback"

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  summary: string;
  category: string;
  author: string;
  readTime: string;
  publishedAt: string;
  imageUrl?: string;
}

export default function BlogPageClient() {
  const [activeCategory, setActiveCategory] = useState("All Posts")
  const [searchQuery, setSearchQuery] = useState("")
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [mobileSliderIndex, setMobileSliderIndex] = useState(0)
  const [visibleCount, setVisibleCount] = useState(6)

  // Reset load limit when category or search changes
  useEffect(() => {
    setVisibleCount(6)
  }, [activeCategory, searchQuery])

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await fetchPublicBlogPosts<BlogPost>({ limit: 120, page: 1 })
        setPosts(data)
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to fetch blog posts right now."
        notifyError({
          title: "Blog Unavailable",
          description: message,
          dedupeKey: "blog:load-unavailable",
          dedupeMs: 12_000,
        })
      } finally {
        setIsLoading(false)
      }
    }
    fetchPosts()
  }, [])

  const filteredPosts = posts.filter(post => {
    const matchesCategory = activeCategory === "All Posts" || post.category === activeCategory
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || post.summary.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Dynamically generate categories based on available posts
  const dynamicCategories = ["All Posts", ...Array.from(new Set(posts.map(p => p.category)))]

  const isDefaultView = activeCategory === "All Posts" && searchQuery === ""
  // Sol taraftaki 3 featured post (Desktop'ta alt alta, mobile'de yatay kaydırmalı slider)
  const featuredPosts = isDefaultView ? posts.slice(0, 4) : []
  const activeFeaturedPost = featuredPosts[mobileSliderIndex] ?? null
  // Geri kalan postlar (Grid yapısında listelenecek)
  const gridPosts = isDefaultView ? filteredPosts.slice(4) : filteredPosts

  useEffect(() => {
    if (featuredPosts.length === 0) return
    const timer = setInterval(() => {
      setMobileSliderIndex((prev) => (prev + 1) % featuredPosts.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [featuredPosts.length])

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
    return new Date(dateString).toLocaleDateString('en-US', options)
  }
  return (
        <div className="flex flex-1 flex-col gap-2 min-w-0 lg:overflow-hidden">
          {/* Header & Search Bar (Matches Explorer style) */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 bg-[#111111] border border-neutral-800 rounded-xl p-4 shrink-0">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                </div>
                <h1 className="text-2xl font-bold text-white">Solera Blog</h1>
              </div>
              <p className="text-sm text-neutral-400">
                Latest news, protocol updates, technical deep-dives, and announcements.
              </p>
            </div>

            <div className="w-full lg:w-72 shrink-0">
              <div className="flex items-center gap-2 bg-neutral-800/50 rounded-full px-2 py-1.5 w-full border border-neutral-700/30 focus-within:border-neutral-500 transition-colors">
                <Search className="h-3 w-3 text-neutral-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-[11px] text-white outline-none w-full placeholder:text-neutral-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-neutral-500 hover:text-white transition-colors cursor-pointer shrink-0"
                    aria-label="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {isLoading ? (
            <>
              {/* Featured Posts Skeleton Desktop */}
              <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-full shrink-0 relative bg-[#111111] border border-neutral-800 rounded-xl overflow-hidden flex flex-col justify-center min-h-[88px]">
                    
                    {/* Angled Background Grid */}
                    <div
                      className="absolute inset-[-50%] z-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"
                      style={{ transform: "rotate(-12deg)" }}
                    ></div>
                    <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-[#111111]/80 to-[#111111] pointer-events-none"></div>

                    <div className="relative overflow-hidden flex items-center p-4 gap-3 z-10 w-full">
                      <div className="w-10 h-10 rounded bg-neutral-800 shrink-0 animate-pulse"></div>
                      <div className="flex flex-col flex-1 min-w-0 gap-2">
                        <div className="w-full h-3.5 bg-neutral-800 rounded animate-pulse"></div>
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-2.5 bg-neutral-800 rounded animate-pulse"></div>
                          <div className="w-16 h-2.5 bg-neutral-800 rounded animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Featured Posts Skeleton Mobile Slider */}
              <div className="flex sm:hidden flex-col gap-2 shrink-0">
                <div className="w-full shrink-0 relative bg-[#111111] border border-neutral-800 rounded-xl overflow-hidden flex flex-col justify-center min-h-[88px]">
                  {/* Angled Background Grid */}
                  <div
                    className="absolute inset-[-50%] z-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"
                    style={{ transform: "rotate(-12deg)" }}
                  ></div>
                  <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-[#111111]/80 to-[#111111] pointer-events-none"></div>

                  <div className="relative overflow-hidden flex items-center p-4 gap-3 z-10 w-full">
                    <div className="w-10 h-10 rounded bg-neutral-800 shrink-0 animate-pulse"></div>
                    <div className="flex flex-col flex-1 min-w-0 gap-2">
                      <div className="w-full h-3.5 bg-neutral-800 rounded animate-pulse"></div>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-2.5 bg-neutral-800 rounded animate-pulse"></div>
                        <div className="w-16 h-2.5 bg-neutral-800 rounded animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Indicators Skeleton (Inside Container) */}
                  <div className="w-full flex justify-center py-2 pb-3 relative z-10 border-t border-neutral-800/50">
                    <div className="flex items-center justify-center gap-1 h-[4px]">
                      <div className="h-1 w-8 bg-neutral-800 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter Bar Skeleton */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 bg-[#111111] border border-neutral-800 rounded-lg p-1 overflow-hidden">
                  {[1, 2, 3, 4, 5].map((_, i) => (
                    <div key={i} className={`h-7 w-20 bg-neutral-800 rounded-md animate-pulse ${i > 2 ? 'hidden sm:block' : ''}`}></div>
                  ))}
                </div>
              </div>

              {/* Posts Grid Skeleton Placeholder */}
              <div className="flex-1 bg-[#111111] border border-neutral-800 rounded-xl overflow-hidden flex flex-col min-h-0">
                <div className="w-full flex-1 flex flex-col p-2 sm:p-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((_, i) => (
                      <div key={i} className="flex flex-col h-full bg-[#0a0a0a] rounded-lg border border-neutral-800 overflow-hidden">
                        <div className="h-32 bg-neutral-900/50 p-4">
                          <div className="w-16 h-4 bg-neutral-800 rounded animate-pulse"></div>
                        </div>
                        <div className="p-4 flex flex-col flex-1">
                          <div className="w-3/4 h-4 bg-neutral-800 rounded mb-2 animate-pulse"></div>
                          <div className="w-full h-3 bg-neutral-800 rounded mb-2 animate-pulse"></div>
                          <div className="w-5/6 h-3 bg-neutral-800 rounded mb-4 animate-pulse"></div>
                          
                          <div className="mt-auto pt-3 border-t border-neutral-800/50">
                            <div className="w-24 h-3 bg-neutral-800 rounded animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Featured Posts Desktop View */}
              {featuredPosts.length > 0 && isDefaultView && (
                <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
                  {featuredPosts.map((post) => (
                    <Link href={`/blog/${post.slug}`} key={post.id} className="w-full shrink-0 group relative bg-[#111111] border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-600 transition-all duration-300 flex flex-col justify-center min-h-[88px]">
                      
                      {/* Angled Background Grid */}
                      <div
                        className="absolute inset-[-50%] z-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                        style={{ transform: "rotate(-12deg)" }}
                      ></div>
                      <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-[#111111]/80 to-[#111111] pointer-events-none"></div>

                      <div className="relative overflow-hidden flex items-center p-4 gap-3 z-10 w-full">
                        <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>
                        {post.imageUrl ? (
                          <div className="w-10 h-10 rounded border border-neutral-800 overflow-hidden shrink-0 relative z-10 bg-neutral-900">
                            <Image
                              src={post.imageUrl}
                              alt={post.title}
                              fill
                              sizes="40px"
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded border border-neutral-800 overflow-hidden shrink-0 relative z-10 bg-neutral-900/50"></div>
                        )}
                        <div className="flex flex-col flex-1 min-w-0 z-10">
                          <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors leading-tight line-clamp-2 mb-1">{post.title}</h3>
                          <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                            <span className="font-medium text-emerald-500 uppercase tracking-wider">{post.category}</span>
                            <span>•</span>
                            <span className="uppercase tracking-wider">{formatDate(post.publishedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Featured Posts Mobile Slider View */}
              {featuredPosts.length > 0 && isDefaultView && (
                <div className="flex sm:hidden flex-col shrink-0 relative w-full overflow-hidden">
                  <AnimatePresence mode="wait">
                    {activeFeaturedPost && (
                      <motion.div
                        key={mobileSliderIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="w-full"
                      >
                        <Link href={`/blog/${activeFeaturedPost.slug}`} className="w-full shrink-0 relative bg-[#111111] border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-600 transition-all duration-300 flex flex-col justify-center group block min-h-[88px]">
                          {/* Angled Background Grid */}
                          <div
                            className="absolute inset-[-50%] z-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                            style={{ transform: "rotate(-12deg)" }}
                          ></div>
                          <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-[#111111]/80 to-[#111111] pointer-events-none"></div>

                          <div className="relative overflow-hidden flex items-center p-4 gap-3 z-10 w-full">
                            <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>
                            {activeFeaturedPost.imageUrl ? (
                              <div className="w-10 h-10 rounded border border-neutral-800 overflow-hidden shrink-0 relative z-10 bg-neutral-900">
                                <Image
                                  src={activeFeaturedPost.imageUrl}
                                  alt={activeFeaturedPost.title}
                                  fill
                                  sizes="40px"
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded border border-neutral-800 overflow-hidden shrink-0 relative z-10 bg-neutral-900/50"></div>
                            )}
                            <div className="flex flex-col flex-1 min-w-0 z-10">
                              <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors leading-tight line-clamp-2 mb-1">{activeFeaturedPost.title}</h3>
                              <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                                <span className="font-medium text-emerald-500 uppercase tracking-wider">{activeFeaturedPost.category}</span>
                                <span>•</span>
                                <span className="uppercase tracking-wider">{formatDate(activeFeaturedPost.publishedAt)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Progress Indicators (Inside Container) */}
                          <div className="w-full flex justify-center py-2 pb-3 relative z-10 border-t border-neutral-800/50" onClick={(e) => e.preventDefault()}>
                            <div className="flex items-center justify-center gap-1.5 h-[4px]">
                              {featuredPosts.map((_, idx) => (
                                <div 
                                  key={idx} 
                                  className={`h-1 cursor-pointer transition-all duration-300 rounded-full ${
                                    idx === mobileSliderIndex ? 'w-4 bg-emerald-500' : 'w-1.5 bg-neutral-700 hover:bg-neutral-500'
                                  }`}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    setMobileSliderIndex(idx)
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Filter Bar (Dynamic, only show if posts exist) */}
              {posts.length > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 bg-[#111111] border border-neutral-800 rounded-lg p-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {dynamicCategories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`px-3 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                          activeCategory === category ? "bg-neutral-700 text-white" : "text-neutral-500 hover:text-white hover:bg-neutral-800"
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Posts Grid - Internal Scrollable Area */}
              <div className="flex-1 bg-[#111111] border border-neutral-800 rounded-xl overflow-hidden flex flex-col min-h-0">
                <div className="w-full flex-1 flex flex-col overflow-y-auto p-2 sm:p-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {gridPosts.length > 0 ? (
                    <div className="flex flex-col pb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                        <AnimatePresence>
                          {gridPosts.slice(0, visibleCount).map((post) => (
                          <motion.div
                            key={post.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Link href={`/blog/${post.slug}`} className="flex flex-col h-full bg-[#0a0a0a] rounded-lg border border-neutral-800 overflow-hidden group hover:border-neutral-600 transition-all duration-300">
                              <div className="h-32 bg-gradient-to-br from-neutral-900 to-[#161616] relative overflow-hidden border-b border-neutral-800 flex items-center justify-center">
                                {post.imageUrl ? (
                                  <Image
                                    src={post.imageUrl}
                                    alt={post.title}
                                    fill
                                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-40 mix-blend-overlay z-10 pointer-events-none"></div>
                                )}
                                <span className="px-2 py-0.5 rounded bg-neutral-900/90 text-neutral-300 text-[9px] font-bold uppercase tracking-wider absolute top-3 left-3 border border-neutral-700 z-20 backdrop-blur-sm shadow-md">
                                  {post.category}
                                </span>
                              </div>
                              
                              <div className="p-4 flex flex-col flex-1">
                                <h4 className="text-sm font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors line-clamp-2">{post.title}</h4>
                                <p className="text-neutral-500 text-xs leading-relaxed mb-4 line-clamp-3">{post.summary}</p>
                                
                                <div className="mt-auto flex items-center justify-start text-[10px] font-medium text-neutral-600 uppercase tracking-wider pt-3 border-t border-neutral-800/50">
                                  <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {formatDate(post.publishedAt)}</div>
                                </div>
                              </div>
                            </Link>
                          </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>

                      {gridPosts.length > visibleCount && (
                        <div className="flex justify-center mt-6 shrink-0">
                          <button
                            onClick={() => setVisibleCount((prev) => prev + 6)}
                            className="px-6 py-2.5 rounded-lg bg-[#1a1a1a] hover:bg-[#222222] border border-neutral-800 hover:border-neutral-700 text-white text-[11px] font-bold uppercase tracking-wider transition-all duration-300 active:scale-95 cursor-pointer shadow-lg"
                          >
                            Load More Articles
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full text-center flex-1 flex flex-col items-center justify-center min-h-[300px] py-20">
                      <p className="text-neutral-500 text-sm mb-4">No blogs found matching your criteria.</p>
                      <button 
                        onClick={() => { setSearchQuery(""); setActiveCategory("All Posts"); }}
                        className="px-4 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs transition-colors cursor-pointer"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

        </div>
  )
}



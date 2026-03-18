"use client"

import { useNewsStore } from "@/store/news/use-news-store"
import { motion, AnimatePresence } from "motion/react"
import { X, ExternalLink, Newspaper, ArrowUp, ArrowDown } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"

const NEWS_READ_OVERLAY_TEXT = {
  subtitle: "Live feed item",
  body:
    "This feed item does not have a detailed body yet. Update it from Admin > News.",
  openSource: "Open Source",
} as const

export function NewsReadOverlay({ isMobile = false }: { isMobile?: boolean }) {
  const { selectedNews, setSelectedNews } = useNewsStore()

  return (
    <AnimatePresence>
      {selectedNews && (
        <motion.div
          initial={{ opacity: 0, x: isMobile ? "-100%" : -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isMobile ? "-100%" : -20 }}
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
          className={`absolute top-0 h-full bg-[#111111] shadow-2xl z-20 flex flex-col overflow-hidden ${
            isMobile
              ? "left-0 w-full lg:hidden"
              : "left-full ml-2 hidden lg:flex w-[450px] border border-neutral-800 rounded-xl"
          }`}
        >
          <div className="flex items-center justify-between p-3 border-b border-neutral-800 shrink-0">
            <div className="flex items-center gap-3 px-1">
              <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center shrink-0">
                <Newspaper className="w-4 h-4 text-neutral-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-medium text-white">{selectedNews.source}</span>
                <span className="text-[11px] text-neutral-500">{selectedNews.date} • {selectedNews.time}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {selectedNews.articleUrl ? (
                <a
                  href={selectedNews.articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 cursor-pointer rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors inline-flex items-center gap-1.5 text-[11px] border border-neutral-800 hover:border-neutral-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {NEWS_READ_OVERLAY_TEXT.openSource}
                </a>
              ) : null}
              <button
                onClick={() => setSelectedNews(null)}
                className="p-2 cursor-pointer rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="px-4 pt-4 pb-2 shrink-0">
            <h2 className="text-xl font-medium text-white leading-snug px-1">
              {selectedNews.title}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="text-[14px] text-neutral-300 leading-relaxed space-y-3 px-1">
              <p className="text-neutral-500 text-xs uppercase tracking-wider">{NEWS_READ_OVERLAY_TEXT.subtitle}</p>
              <div className="prose prose-invert prose-sm max-w-none leading-relaxed prose-p:text-neutral-300 prose-headings:text-white prose-strong:text-white prose-a:text-emerald-300 hover:prose-a:text-emerald-200">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                  {selectedNews.body?.trim() || NEWS_READ_OVERLAY_TEXT.body}
                </ReactMarkdown>
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-neutral-800 shrink-0 flex items-center justify-between bg-[#111111]">
            <div className="flex items-center gap-2 px-1">
              {selectedNews.tags.map((tag) => (
                <div key={tag} className="flex items-center gap-1 bg-neutral-800/50 px-2 py-1 rounded-md">
                  <span className="text-yellow-500/80 text-[11px]">$</span>
                  <span className="text-[11px] text-neutral-300 font-medium">{tag}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-neutral-800/50 px-1.5 py-1 rounded-lg">
              <div className="p-1 text-green-500">
                <ArrowUp className="h-3.5 w-3.5" />
              </div>
              <span className="font-medium px-1.5 text-[12px] text-green-500">
                {selectedNews.upvotes}
              </span>
              <div className="p-1 text-red-500">
                <ArrowDown className="h-3.5 w-3.5" />
              </div>
              <span className="font-medium px-1.5 text-[12px] text-red-500">
                {selectedNews.downvotes}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

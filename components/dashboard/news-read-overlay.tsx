"use client"

import { useNewsStore } from "@/store/news-store"
import { motion, AnimatePresence } from "motion/react"
import { X, ExternalLink, Newspaper, ArrowUp, ArrowDown } from "lucide-react"

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
          className={`absolute top-0 left-0 h-full bg-[#111111] shadow-2xl z-20 flex flex-col overflow-hidden ${
            isMobile 
              ? "w-full lg:hidden" 
              : "hidden lg:flex w-1/2 border border-neutral-800 rounded-xl"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center shrink-0">
                <Newspaper className="w-4 h-4 text-neutral-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-medium text-white">{selectedNews.source}</span>
                <span className="text-[11px] text-neutral-500">{selectedNews.date} • {selectedNews.time}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <a 
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 cursor-pointer rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <button 
                onClick={() => setSelectedNews(null)}
                className="p-2 cursor-pointer rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Title (Fixed) */}
          <div className="px-5 pt-5 pb-3 shrink-0">
            <h2 className="text-xl font-medium text-white leading-snug">
              {selectedNews.title}
            </h2>
          </div>

          {/* Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto px-5 pb-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="text-[14px] text-neutral-300 leading-relaxed space-y-4">
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
              <p>
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>
              <p>
                Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
              </p>
              <p>
                Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.
              </p>
            </div>
          </div>

          {/* Footer (Fixed) */}
          <div className="p-4 border-t border-neutral-800 shrink-0 flex items-center justify-between bg-[#111111]">
            <div className="flex items-center gap-2">
              {selectedNews.tags.map(tag => (
                <div key={tag} className="flex items-center gap-1 bg-neutral-800/50 px-2 py-1 rounded-md">
                  <span className="text-yellow-500/80 text-[11px]">$</span>
                  <span className="text-[11px] text-neutral-300 font-medium">{tag}</span>
                </div>
              ))}
            </div>
            
            <div className="flex items-center gap-1 bg-neutral-800/50 px-1.5 py-1 rounded-lg">
              <button className="p-1 cursor-pointer rounded hover:bg-neutral-700 transition-colors text-neutral-400 hover:text-white">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <span className="font-medium px-1.5 text-[12px] text-neutral-300">
                {selectedNews.initialUpvotes}
              </span>
              <button className="p-1 cursor-pointer rounded hover:bg-neutral-700 transition-colors text-neutral-400 hover:text-white">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <span className="font-medium px-1.5 text-[12px] text-neutral-300">
                {selectedNews.initialDownvotes}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"

const newsData = [
  {
    id: 1,
    title: "Solana Network Upgrades Boost Staking Yields Across Ecosystem",
    source: "CryptoNews",
    time: "2h ago",
    image: "https://picsum.photos/seed/solana/100/100",
    url: "https://solana.com/news"
  },
  {
    id: 2,
    title: "Meme Coin Season Returns: SPX and NDQ Lead the Rally",
    source: "DeFi Times",
    time: "5h ago",
    image: "https://picsum.photos/seed/meme/100/100",
    url: "https://coinmarketcap.com/headlines/news/"
  },
  {
    id: 3,
    title: "Traditional Assets like Gold and Silver See Increased Tokenization",
    source: "BlockWorks",
    time: "12h ago",
    image: "https://picsum.photos/seed/gold/100/100",
    url: "https://blockworks.co/news"
  }
]

export function TopNews() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (isHovered) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % newsData.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [isHovered])

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % newsData.length)
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + newsData.length) % newsData.length)
  }

  const currentNews = newsData[currentIndex]
  const nextNews = newsData[(currentIndex + 1) % newsData.length]

  return (
    <div 
      className="flex flex-col p-4 bg-[#111111] rounded-xl border border-neutral-800 shrink-0 relative overflow-hidden group h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="text-[17px] font-medium text-white">Top news</h3>
        <div className="flex items-center gap-1">
          <button 
            onClick={prevSlide}
            className="flex items-center justify-center p-1 cursor-pointer rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-neutral-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button 
            onClick={nextSlide}
            className="flex items-center justify-center p-1 cursor-pointer rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-neutral-700"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 w-full min-h-[52px]">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="absolute inset-0 flex flex-col gap-2"
          >
            <a
              href={currentNews.url}
              className="flex items-center gap-3 hover:bg-neutral-800/50 p-1.5 -mx-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <div className="relative w-10 h-10 rounded-md overflow-hidden shrink-0 bg-neutral-800">
                <Image 
                  src={currentNews.image} 
                  alt={currentNews.source}
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <div className="flex flex-col flex-1 min-w-0">
                <h4 className="text-[13px] font-medium text-white leading-tight line-clamp-2 mb-1">
                  {currentNews.title}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                  <span className="font-medium text-neutral-400">{currentNews.source}</span>
                  <span>•</span>
                  <span>{currentNews.time}</span>
                </div>
              </div>
              
              <ExternalLink className="h-3.5 w-3.5 text-neutral-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>

            {/* Second item, visible only on tablet */}
            <a
              href={nextNews.url}
              className="hidden sm:flex lg:hidden items-center gap-3 hover:bg-neutral-800/50 p-1.5 -mx-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <div className="relative w-10 h-10 rounded-md overflow-hidden shrink-0 bg-neutral-800">
                <Image 
                  src={nextNews.image} 
                  alt={nextNews.source}
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <div className="flex flex-col flex-1 min-w-0">
                <h4 className="text-[13px] font-medium text-white leading-tight line-clamp-2 mb-1">
                  {nextNews.title}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                  <span className="font-medium text-neutral-400">{nextNews.source}</span>
                  <span>•</span>
                  <span>{nextNews.time}</span>
                </div>
              </div>
              
              <ExternalLink className="h-3.5 w-3.5 text-neutral-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress Indicators */}
      <div className="flex items-center gap-1 mt-auto pt-4 justify-center shrink-0">
        {newsData.map((_, idx) => (
          <div 
            key={idx} 
            className={`h-1 rounded-full transition-all duration-300 ${
              idx === currentIndex ? 'w-3 bg-white' : 'w-1 bg-neutral-700'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

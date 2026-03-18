"use client"

import { useState, Suspense, useEffect, useMemo, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { PublicAppShell } from "@/app/_shared/PublicAppShell"
import { DocsSidebar } from "@/components/docs/DocsSidebar"
import { DocsContent } from "@/components/docs/DocsContent"
import { DocsNavigation } from "@/components/docs/DocsNavigation"
import type { DocCategory } from "@/lib/docs/docs-types"
import {
  DEFAULT_DOCS_UI_SETTINGS,
  type DocsUiSettings,
} from "@/lib/docs/docs-settings"
import {
  fetchPublicDocsCategories,
  fetchPublicDocsUiSettings,
  getCachedPublicDocsCategories,
  getCachedPublicDocsUiSettings,
} from "@/lib/public/docs-public"
import { Menu, X } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { notifyWarning } from "@/lib/ui/ui-feedback"

function DocsLayout() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [docsData, setDocsData] = useState<DocCategory[]>(
    getCachedPublicDocsCategories() ?? [],
  )
  const [docsUiSettings, setDocsUiSettings] = useState<DocsUiSettings>(
    getCachedPublicDocsUiSettings() ?? DEFAULT_DOCS_UI_SETTINGS,
  )
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const hasShownDocsLoadErrorNoticeRef = useRef(false)
  const hasShownDocsSettingsFallbackNoticeRef = useRef(false)
  const allPages = useMemo(() => docsData.flatMap((category) => category.items), [docsData])
  const currentSlug = searchParams.get("page") || allPages[0]?.slug || "platform-overview"

  const handleNavigate = (slug: string) => {
    router.push(`/docs?page=${slug}`)
    setIsMobileMenuOpen(false)
  }

  useEffect(() => {
    let cancelled = false

    const loadDocs = async () => {
      try {
        const normalized = await fetchPublicDocsCategories()

        if (!cancelled) {
          setDocsData(normalized)
        }
      } catch {
        if (!cancelled && !hasShownDocsLoadErrorNoticeRef.current) {
          notifyWarning({
            title: "Documentation unavailable",
            description: "Live documentation could not be loaded.",
            dedupeKey: "docs:load-unavailable",
            dedupeMs: 30_000,
          })
          hasShownDocsLoadErrorNoticeRef.current = true
        }
      }
    }

    void loadDocs()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadDocsSettings = async () => {
      try {
        const normalized = await fetchPublicDocsUiSettings()

        if (!cancelled) {
          setDocsUiSettings(normalized)
        }
      } catch {
        if (!cancelled && !hasShownDocsSettingsFallbackNoticeRef.current) {
          notifyWarning({
            title: "Docs UI settings unavailable",
            description: "Cached/default docs UI settings are being used temporarily.",
            dedupeKey: "docs:settings-unavailable",
            dedupeMs: 30_000,
          })
          hasShownDocsSettingsFallbackNoticeRef.current = true
        }
      }
    }

    void loadDocsSettings()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (allPages.length === 0) return
    const exists = allPages.some((page) => page.slug === currentSlug)
    if (!exists) {
      router.replace(`/docs?page=${allPages[0].slug}`)
    }
  }, [allPages, currentSlug, router])

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [currentSlug])

  return (
    <PublicAppShell>
      
      {/* Mobile Menu Trigger */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden absolute left-0 top-1/2 -translate-y-1/2 z-40 bg-neutral-800 text-white p-2.5 rounded-r-xl border border-l-0 border-neutral-700 shadow-xl cursor-pointer hover:bg-neutral-700 transition"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed inset-y-0 left-0 w-[280px] bg-[#111111] border-r border-neutral-800 z-50 shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                <span className="font-bold text-white">Documentation</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="h-[calc(100vh-65px)] overflow-y-auto overflow-x-hidden w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <DocsSidebar
                  docsData={docsData}
                  socialLinks={docsUiSettings.socialLinks}
                  activeSlug={currentSlug}
                  onNavigate={handleNavigate}
                  isMobile={true}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex flex-1 overflow-hidden p-2 gap-2 w-full max-w-none">
        {/* Left Sidebar Menu (Desktop) */}
        <div className="hidden lg:block shrink-0">
          <DocsSidebar
            docsData={docsData}
            socialLinks={docsUiSettings.socialLinks}
            activeSlug={currentSlug}
            onNavigate={handleNavigate}
            isMobile={false}
          />
        </div>

        {/* Center Content Document */}
        <DocsContent docsData={docsData} activeSlug={currentSlug} />

        {/* Right Table of Contents */}
        <DocsNavigation
          docsData={docsData}
          activeSlug={currentSlug}
          version={docsUiSettings.version}
        />
      </main>
    </PublicAppShell>
  )
}

export default function DocsPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-[#0a0a0a]"></div>}>
      <DocsLayout />
    </Suspense>
  )
}

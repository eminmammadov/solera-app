"use client"

import type { DocCategory } from "@/lib/docs/docs-types"
import { useState } from "react"

interface DocsNavigationProps {
  docsData: DocCategory[]
  activeSlug: string
  version: string
}

export function DocsNavigation({ docsData, activeSlug, version }: DocsNavigationProps) {
  const allPages = docsData.flatMap((category) => category.items)
  const page = allPages.find((item) => item.slug === activeSlug) ?? allPages[0]
  const [manualActiveId, setManualActiveId] = useState('')
  const sectionIds = page?.sections.map((section) => section.id) ?? []
  const activeId =
    sectionIds.includes(manualActiveId) ? manualActiveId : (page?.sections[0]?.id ?? '')

  const scrollToId = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      // Offset by 20px so the heading isn't squashed directly against the top
      // We must scroll the closest overflow-y-auto container, which is the DocsContent div
      // Alternatively, we can use scrollIntoView
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setManualActiveId(id)
    }
  }

  if (!page) {
    return null
  }

  return (
    <aside className="hidden xl:block w-56 shrink-0 pt-16 h-full px-2 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex flex-col gap-4">
        <h3 className="text-[14px] font-medium text-white mb-2 tracking-wide uppercase opacity-70">On this page</h3>
        
        <nav className="flex flex-col">
          <ul className="border-l border-neutral-800">
            {page.sections.map((sec) => {
              const isActive = activeId === sec.id
              return (
                <li key={sec.id} className="relative">
                  {isActive && (
                    <span className="absolute -left-[1px] top-0 h-full w-[2px] bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  )}
                  <button
                    onClick={() => scrollToId(sec.id)}
                    className={`cursor-pointer text-[13px] font-medium text-left w-full py-2 pl-4 transition-colors ${
                      isActive ? "text-white bg-neutral-800/30" : "text-neutral-500 hover:text-white"
                    }`}
                  >
                    {sec.title}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-neutral-800/50 flex items-center justify-start gap-4 mt-8">
          <span className="text-neutral-500 text-[12px] font-medium tracking-wide">Version {version}</span>
        </div>
      </div>
    </aside>
  )
}

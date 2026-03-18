import type { DocCategory } from "@/lib/docs/docs-types"
import type { DocsSocialLink } from "@/lib/docs/docs-settings"
import { Rocket, Shield, Cpu, Code } from "lucide-react"
import Link from "next/link"

const ICONS = {
  Rocket,
  Shield,
  Cpu,
  Code
}

interface DocsSidebarProps {
  docsData: DocCategory[]
  socialLinks: DocsSocialLink[]
  activeSlug: string
  onNavigate: (slug: string) => void
  isMobile: boolean
}

export function DocsSidebar({ docsData, socialLinks, activeSlug, onNavigate, isMobile }: DocsSidebarProps) {
  return (
    <aside className={`flex flex-col w-[280px] lg:w-64 h-full bg-[#111111] border-neutral-800 shrink-0 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isMobile ? 'border-none' : 'border rounded-xl'}`}>
      <div className="p-5 flex flex-col gap-8">
        {docsData.map((category) => {
          const IconComponent = ICONS[category.icon] ?? Rocket
          
          return (
            <div key={category.title}>
              <div className="flex items-center gap-2 mb-3 text-neutral-400">
                <IconComponent className="w-4 h-4" />
                <span className="text-[11px] font-bold tracking-wider uppercase">{category.title}</span>
              </div>
              <ul className="flex flex-col gap-1.5 border-l border-neutral-800 ml-2 pl-3">
                {category.items.map((item) => {
                  const isActive = item.slug === activeSlug
                  
                  return (
                    <li key={item.slug} className="relative">
                      {isActive && (
                        <span className="absolute -left-[17px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      )}
                      <button 
                        onClick={() => onNavigate(item.slug)}
                        className={`text-[13px] hover:text-white transition-colors cursor-pointer text-left w-full py-1 ${isActive ? 'font-medium text-white' : 'font-medium text-neutral-500'}`}
                      >
                        {item.title}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}

        <div className="pt-6 mt-4 border-t border-neutral-800/50 flex items-center justify-start gap-2.5 flex-wrap">
          {socialLinks.map((link) => (
            <Link
              key={`${link.label}-${link.href}`}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-neutral-500 hover:text-emerald-500 transition-colors cursor-pointer px-2 py-1 rounded border border-neutral-800 hover:border-emerald-500/30"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  )
}

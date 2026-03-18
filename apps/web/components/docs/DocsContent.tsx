import type { DocCategory } from "@/lib/docs/docs-types"

interface DocsContentProps {
  docsData: DocCategory[]
  activeSlug: string
}

export function DocsContent({ docsData, activeSlug }: DocsContentProps) {
  const allPages = docsData.flatMap((category) => category.items)
  const page = allPages.find((item) => item.slug === activeSlug) ?? allPages[0]

  if (!page) {
    return (
      <div className="flex-1 overflow-y-auto bg-[#111111] border border-neutral-800 rounded-xl px-6 lg:px-12 py-10 lg:py-16 text-neutral-400">
        No documentation pages available.
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#111111] border border-neutral-800 rounded-xl px-6 lg:px-12 py-10 lg:py-16 text-neutral-300 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="w-full max-w-none lg:max-w-4xl xl:max-w-8xl mx-auto space-y-16">
        
        {/* Header Section */}
        <div className="space-y-6">
          <h1 className="text-4xl font-semibold text-white tracking-tight">{page.title}</h1>
        </div>

        {/* Dynamic Sections */}
        {page.sections.map((section, idx) => (
          <div key={section.id} id={section.id} className="space-y-6 relative group pt-8 border-t border-neutral-800/50 first:border-0 first:pt-0">
            <div className="absolute -left-6 lg:-left-12 top-8 h-[calc(100%-32px)] w-1 bg-neutral-800 hidden lg:block rounded-full group-hover:bg-emerald-500/20 transition-colors" />
            <h2 className="text-2xl font-semibold text-white tracking-tight">{section.title}</h2>
            
            {section.content.map((paragraph, pIdx) => (
              <p key={pIdx} className="text-[15px] leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        ))}

      </div>
    </div>
  )
}

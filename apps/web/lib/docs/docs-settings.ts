export interface DocsSocialLink {
  label: string
  href: string
}

export interface DocsUiSettings {
  version: string
  socialLinks: DocsSocialLink[]
}

export const DEFAULT_DOCS_UI_SETTINGS: DocsUiSettings = {
  version: "1.0.0",
  socialLinks: [
    { label: "X", href: "https://x.com/SOLERAwork" },
    { label: "Telegram", href: "https://t.me/SOLERAwork" },
  ],
}

const sanitizeSocialLinks = (raw: unknown): DocsSocialLink[] => {
  if (!Array.isArray(raw)) {
    return DEFAULT_DOCS_UI_SETTINGS.socialLinks
  }

  const links: DocsSocialLink[] = []
  const dedupe = new Set<string>()
  for (const item of raw.slice(0, 8)) {
    if (!item || typeof item !== "object") continue
    const candidate = item as { label?: unknown; href?: unknown }
    if (typeof candidate.label !== "string" || typeof candidate.href !== "string") continue

    const label = candidate.label.trim()
    const href = candidate.href.trim()
    if (!label || !href) continue

    try {
      const parsed = new URL(href)
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue
    } catch {
      continue
    }

    const key = `${label.toLowerCase()}|${href.toLowerCase()}`
    if (dedupe.has(key)) continue
    dedupe.add(key)
    links.push({ label, href })
  }

  return links.length > 0 ? links : DEFAULT_DOCS_UI_SETTINGS.socialLinks
}

export const normalizeDocsUiSettings = (raw: unknown): DocsUiSettings => {
  const source = (raw && typeof raw === "object" ? raw : {}) as Partial<DocsUiSettings>
  const version =
    typeof source.version === "string" && source.version.trim().length > 0
      ? source.version.trim().slice(0, 24)
      : DEFAULT_DOCS_UI_SETTINGS.version

  return {
    version,
    socialLinks: sanitizeSocialLinks(source.socialLinks),
  }
}


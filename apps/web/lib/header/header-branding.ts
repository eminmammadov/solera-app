export type HeaderNetwork = "devnet" | "mainnet";

export interface HeaderNavLink {
  name: string;
  href: string;
}

export interface HeaderBranding {
  logoUrl: string;
  projectName: string;
  description: string;
  network: HeaderNetwork;
  connectEnabled: boolean;
  navLinks: HeaderNavLink[];
}

export const DEFAULT_HEADER_NAV_LINKS: HeaderNavLink[] = [
  { name: "Home", href: "/" },
  { name: "Staking", href: "/staking" },
  { name: "Explorer", href: "/explorer" },
  { name: "Blog", href: "/blog" },
  { name: "Docs", href: "/docs" },
];

export const DEFAULT_HEADER_BRANDING: HeaderBranding = {
  logoUrl: "/logos/ra-white-logo.png",
  projectName: "Solera Work",
  description: "MEME coin staking platform",
  network: "devnet",
  connectEnabled: true,
  navLinks: DEFAULT_HEADER_NAV_LINKS.map((link) => ({ ...link })),
};

const cloneNavLinks = (links: HeaderNavLink[]) =>
  links.map((link) => ({ ...link }));

export const sanitizeHeaderNavLinks = (raw: unknown): HeaderNavLink[] => {
  if (!Array.isArray(raw)) {
    return cloneNavLinks(DEFAULT_HEADER_NAV_LINKS);
  }

  const links: HeaderNavLink[] = [];
  for (const item of raw.slice(0, 10)) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as { name?: unknown; href?: unknown };
    if (typeof candidate.name !== "string" || typeof candidate.href !== "string")
      continue;

    const name = candidate.name.trim();
    const href = candidate.href.trim();
    if (!name || !href.startsWith("/") || href.startsWith("//")) continue;

    links.push({ name, href });
  }

  return links.length > 0 ? links : cloneNavLinks(DEFAULT_HEADER_NAV_LINKS);
};

export const normalizeHeaderBranding = (raw: unknown): HeaderBranding => {
  const source = (raw && typeof raw === "object"
    ? raw
    : {}) as Partial<HeaderBranding>;

  const navLinks = sanitizeHeaderNavLinks(source.navLinks);

  return {
    logoUrl:
      typeof source.logoUrl === "string" && source.logoUrl.trim().startsWith("/")
        ? source.logoUrl.trim()
        : DEFAULT_HEADER_BRANDING.logoUrl,
    projectName:
      typeof source.projectName === "string" && source.projectName.trim().length > 0
        ? source.projectName.trim()
        : DEFAULT_HEADER_BRANDING.projectName,
    description:
      typeof source.description === "string" && source.description.trim().length > 0
        ? source.description.trim()
        : DEFAULT_HEADER_BRANDING.description,
    network: source.network === "mainnet" ? "mainnet" : "devnet",
    connectEnabled:
      typeof source.connectEnabled === "boolean"
        ? source.connectEnabled
        : DEFAULT_HEADER_BRANDING.connectEnabled,
    navLinks,
  };
};

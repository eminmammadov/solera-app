import {
  BadgeDollarSign,
  BarChart3,
  BookOpen,
  CandlestickChart,
  ClipboardList,
  Coins,
  FileText,
  LayoutDashboard,
  Newspaper,
  PanelsTopLeft,
  Radar,
  SlidersHorizontal,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react"

export interface AdminNavItem {
  href: string
  icon: LucideIcon
  label: string
}

export interface AdminQuickAction extends AdminNavItem {
  desc: string
}

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/blog", icon: FileText, label: "Blog Posts" },
  { href: "/admin/maintenance", icon: Wrench, label: "Maintenance" },
  { href: "/admin/header", icon: PanelsTopLeft, label: "Header" },
  { href: "/admin/ra", icon: BadgeDollarSign, label: "RA" },
  { href: "/admin/ohlc", icon: CandlestickChart, label: "OHLC" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/control", icon: SlidersHorizontal, label: "Control" },
  { href: "/admin/audit", icon: ClipboardList, label: "Audit Logs" },
  { href: "/admin/tokens", icon: Coins, label: "Tokens" },
  { href: "/admin/staking", icon: Radar, label: "Staking" },
  { href: "/admin/news", icon: Newspaper, label: "News" },
  { href: "/admin/docs", icon: BookOpen, label: "Docs" },
  { href: "/admin/metrics", icon: BarChart3, label: "Metrics" },
] as const

export const ADMIN_QUICK_ACTIONS: readonly AdminQuickAction[] = [
  {
    href: "/admin/blog",
    icon: FileText,
    label: "Manage Blog Posts",
    desc: "Create, edit, and delete blog posts",
  },
  {
    href: "/admin/maintenance",
    icon: Wrench,
    label: "Maintenance Control",
    desc: "Enable or schedule maintenance mode",
  },
  {
    href: "/admin/news",
    icon: Newspaper,
    label: "Manage News Feed",
    desc: "Create, edit, and moderate news feed items",
  },
  {
    href: "/admin/ra",
    icon: BadgeDollarSign,
    label: "RA Runtime",
    desc: "Configure RA mints, treasury, fees and convert/stake policy",
  },
  {
    href: "/admin/ohlc",
    icon: CandlestickChart,
    label: "OHLC Control",
    desc: "Manage Raydium polling interval and sync controls",
  },
  {
    href: "/admin/users",
    icon: Users,
    label: "Wallet Users",
    desc: "Inspect connected wallets, sessions and staking activity",
  },
  {
    href: "/admin/control",
    icon: SlidersHorizontal,
    label: "Control Center",
    desc: "Manage runtime API config and admin access roles",
  },
  {
    href: "/admin/audit",
    icon: ClipboardList,
    label: "Audit Logs",
    desc: "Track all admin changes across system modules",
  },
  {
    href: "/admin/metrics",
    icon: BarChart3,
    label: "Metrics",
    desc: "Live operational KPIs and platform health signals",
  },
  {
    href: "/admin/tokens",
    icon: Coins,
    label: "Token Management",
    desc: "Manage market tokens and pricing settings",
  },
  {
    href: "/admin/staking",
    icon: Radar,
    label: "Staking Operations",
    desc: "Prepare on-chain config, funding batches and migration flows",
  },
  {
    href: "/admin/docs",
    icon: BookOpen,
    label: "Documentation",
    desc: "Manage docs categories, pages, and sections",
  },
] as const

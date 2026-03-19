import { ReactNode } from "react"
import { redirect } from "next/navigation"
import { Header } from "@/components/layout/Header"
import { NewsFeed } from "@/components/panels/NewsFeed"
import { fetchPublicMaintenanceStatus } from "@/lib/public/system-public"
import { API_BASE_URL } from "@/lib/config/api"

interface PublicAppShellProps {
  children: ReactNode
}

interface FeedPageShellProps {
  children: ReactNode
  contentClassName?: string
  innerClassName?: string
}

export async function PublicAppShell({ children }: PublicAppShellProps) {
  try {
    const maintenance = await fetchPublicMaintenanceStatus()
    if (maintenance.isActive) {
      const debugParams = new URLSearchParams({
        source: "public-shell",
        active: String(maintenance.isActive),
        enabled: String(maintenance.maintenanceEnabled),
        startsAt: maintenance.maintenanceStartsAt ?? "",
        apiBase: API_BASE_URL,
      })
      redirect(`/maintenance?${debugParams.toString()}`)
    }
  } catch {
    // Keep public pages reachable when maintenance status cannot be resolved.
  }

  return (
    <div className="flex h-screen w-full flex-col bg-[#0a0a0a] text-neutral-100 overflow-hidden font-sans">
      <Header />
      {children}
    </div>
  )
}

export async function FeedPageShell({
  children,
  contentClassName = "flex flex-1 flex-col gap-2 min-w-0 lg:overflow-hidden",
  innerClassName = "flex flex-col gap-2 pb-4 lg:pb-0 lg:flex-1 lg:overflow-hidden",
}: FeedPageShellProps) {
  return (
    <PublicAppShell>
      <main className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden p-2 sm:p-2 gap-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <NewsFeed />
        <div className={contentClassName}>
          <div className={innerClassName}>{children}</div>
        </div>
      </main>
    </PublicAppShell>
  )
}

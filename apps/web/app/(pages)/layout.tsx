import type { ReactNode } from "react"
import { PublicAppProviders } from "@/components/providers/PublicAppProviders"

export default function PublicPagesLayout({
  children,
}: {
  children: ReactNode
}) {
  return <PublicAppProviders>{children}</PublicAppProviders>
}

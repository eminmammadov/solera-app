import { FeedPageShell } from "@/app/_shared/PublicAppShell"
import BlogPageClient from "@/components/blog/BlogPageClient"

export default function BlogPage() {
  return (
    <FeedPageShell>
      <BlogPageClient />
    </FeedPageShell>
  )
}

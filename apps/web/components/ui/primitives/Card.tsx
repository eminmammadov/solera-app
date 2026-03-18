import * as React from "react"
import { cn } from "@/lib/ui/utils"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-xl border border-neutral-800 bg-[#111111] text-neutral-100", className)} {...props} />
))
Card.displayName = "Card"

export { Card }

import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "ev" | "accessible" | "reserved"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]",
        {
          "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/80": variant === "default",
          "bg-[var(--color-border)] text-[var(--color-primary)] hover:bg-[var(--color-border)]/80": variant === "secondary",
          "bg-[var(--color-slot-occupied)] text-white hover:bg-[var(--color-slot-occupied)]/80": variant === "destructive",
          "text-[var(--color-primary)] border border-[var(--color-border)]": variant === "outline",
          "bg-[var(--color-slot-available)] text-white": variant === "success",
          "bg-[var(--color-slot-maintenance)] text-white": variant === "warning",
          "bg-[var(--color-slot-ev)] text-white": variant === "ev",
          "bg-[var(--color-slot-accessible)] text-white": variant === "accessible",
          "bg-[var(--color-slot-reserved)] text-white": variant === "reserved",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }

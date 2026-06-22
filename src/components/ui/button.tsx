import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90": variant === "default",
            "bg-[var(--color-slot-occupied)] text-white hover:bg-[var(--color-slot-occupied)]/90": variant === "destructive",
            "border border-[var(--color-border)] bg-transparent hover:bg-[var(--color-border)] text-[var(--color-primary)]": variant === "outline",
            "bg-[var(--color-card)] text-[var(--color-primary)] hover:bg-[var(--color-border)]": variant === "secondary",
            "hover:bg-[var(--color-border)] text-[var(--color-primary)]": variant === "ghost",
            "text-[var(--color-accent)] underline-offset-4 hover:underline": variant === "link",
            "h-9 px-4 py-2": size === "default",
            "h-8 rounded-md px-3 text-xs": size === "sm",
            "h-10 rounded-md px-8": size === "lg",
            "h-9 w-9": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }

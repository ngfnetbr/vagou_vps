import { ReactNode } from "react"
import { cn } from "@sam/lib/utils"

type EmptyStateProps = {
  icon?: ReactNode
  title: string
  description?: string
  className?: string
  children?: ReactNode
}

export function EmptyState({ icon, title, description, className, children }: EmptyStateProps) {
  return (
    <div className={cn("rounded-2xl border border-border bg-muted/20 px-6 py-10 text-center", className)}>
      {icon ? <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-background text-muted-foreground shadow-sm ring-1 ring-border">{icon}</div> : null}
      <div className="text-sm font-medium text-foreground">{title}</div>
      {description ? <div className="mt-1 text-xs text-muted-foreground">{description}</div> : null}
      {children ? <div className="mt-4 flex justify-center gap-2">{children}</div> : null}
    </div>
  )
}


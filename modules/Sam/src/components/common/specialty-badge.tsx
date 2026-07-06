// @ts-nocheck
import { Badge } from "@ui/badge"
import { cn } from "@sam/lib/utils"
import { getSpecialtyVariant } from "./specialty-utils"

type SpecialtyBadgeProps = {
  specialty?: string | null
  className?: string
}

export function SpecialtyBadge({ specialty, className }: SpecialtyBadgeProps) {
  return (
    <Badge variant={getSpecialtyVariant(specialty)} className={cn(className)}>
      {specialty || "Geral"}
    </Badge>
  )
}

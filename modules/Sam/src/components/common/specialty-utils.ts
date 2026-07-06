// @ts-nocheck
import type { BadgeProps } from "@ui/badge"

export function getSpecialtyVariant(specialty?: string | null): BadgeProps["variant"] {
  if (!specialty) return "muted"
  switch (specialty) {
    case "Fonoaudiologia":
      return "info"
    case "Psicologia":
      return "success"
    case "Terapia Ocupacional":
      return "success"
    case "Psicopedagogia":
      return "warning"
    default:
      return "muted"
  }
}

export function getSpecialtyBorderClass(specialty?: string | null): string {
  if (!specialty) return "border-l-muted"
  switch (specialty) {
    case "Fonoaudiologia":
      return "border-l-info"
    case "Psicologia":
      return "border-l-success"
    case "Terapia Ocupacional":
      return "border-l-success"
    case "Psicopedagogia":
      return "border-l-warning"
    default:
      return "border-l-muted"
  }
}

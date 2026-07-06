"use client"

import { Button } from "@ui/button"
import { Printer } from "lucide-react"

interface PrintButtonProps {
  label?: string
}

export function PrintButton({ label = "Imprimir ficha" }: PrintButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className="border-slate-300 text-slate-700 hover:bg-slate-50"
      onClick={() => window.print()}
    >
      <Printer className="h-4 w-4 mr-2" />
      {label}
    </Button>
  )
}



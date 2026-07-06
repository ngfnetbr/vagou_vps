// @ts-nocheck
"use client"

import { Button } from "@ui/button"
import { Printer } from "lucide-react"

export function PrintButton() {
  return (
    <Button 
      onClick={() => window.print()} 
      className="bg-blue-700 hover:bg-blue-800 print:hidden"
    >
      <Printer className="mr-2 h-4 w-4" />
      Imprimir / Salvar PDF
    </Button>
  )
}


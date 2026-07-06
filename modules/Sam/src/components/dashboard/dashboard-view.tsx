// @ts-nocheck
import { useState } from "react"
import { Button } from "@ui/button"
import { LayoutGrid, BarChart3 } from "lucide-react"
import { cn } from "@sam/lib/utils"

interface DashboardViewProps {
  overview: React.ReactNode
  charts: React.ReactNode
}

export function DashboardView({ overview, charts }: DashboardViewProps) {
  const [view, setView] = useState<"overview" | "charts">("overview")

  return (
    <div className="space-y-8 pb-8">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground text-xs mt-1">Visão geral do sistema de gestão.</p>
        </div>
        <div className="bg-muted p-1 rounded-lg inline-flex border border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("overview")}
            className={cn(
              "px-4 transition-all",
              view === "overview"
                ? "bg-card shadow-sm text-foreground hover:bg-card/90"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="mr-2 h-4 w-4" />Geral
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("charts")}
            className={cn(
              "px-4 transition-all",
              view === "charts"
                ? "bg-card shadow-sm text-foreground hover:bg-card/90"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BarChart3 className="mr-2 h-4 w-4" />Gráficos
          </Button>
        </div>
      </div>
      <div className={view === "overview" ? "block animate-in fade-in-50 duration-500" : "hidden"}>{overview}</div>
      <div className={view === "charts" ? "block animate-in fade-in-50 duration-500" : "hidden"}>{charts}</div>
    </div>
  )
}



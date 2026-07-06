// @ts-nocheck
import { Outlet, Link, useLocation } from "react-router-dom"
import { useAuth } from "@root/contexts/AuthContext"
import { School, AlertTriangle, LogOut, FileText, LayoutDashboard, ArrowLeft, GraduationCap } from "lucide-react"
import { Button } from "@ui/button"
import { cn } from "@root/lib/utils"

const SAM_SCHOOL_BASE = "/modulo/sam/escola"

export default function SchoolLayout() {
  const { profile, signOut } = useAuth()
  const location = useLocation()

  const navItems = [
    { title: "Painel", url: `${SAM_SCHOOL_BASE}/dashboard`, icon: LayoutDashboard },
    { title: "Alunos", url: `${SAM_SCHOOL_BASE}/alunos`, icon: GraduationCap },
    { title: "Queixas", url: `${SAM_SCHOOL_BASE}/queixas`, icon: AlertTriangle },
    { title: "Nova Queixa", url: `${SAM_SCHOOL_BASE}/queixas/nova`, icon: FileText },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <School className="h-4 w-4 text-emerald-700" />
            </div>
            <div className="leading-tight">
              <p className="font-bold text-sm text-foreground">Portal da Escola</p>
              <p className="text-xs text-muted-foreground">SAM</p>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.url} to={item.url}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "gap-1.5 text-sm",
                    location.pathname === item.url && "bg-accent text-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.title}</span>
                </Button>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild className="hidden md:inline-flex">
              <Link to="/modulo/vagou/admin">
                <ArrowLeft className="h-4 w-4" />
                Sistema Principal
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground hidden md:inline">
              {profile?.full_name || "Coordenador(a)"}
            </span>
            <Button variant="ghost" size="sm" onClick={() => signOut()} className="gap-1.5">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container py-6 px-4">
        <Outlet />
      </main>
    </div>
  )
}


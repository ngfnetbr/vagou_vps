// @ts-nocheck
import { Link, useLocation } from "react-router-dom"
import { cn } from "@root/lib/utils"
import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardList,
  FileText,
  Settings,
  LogOut,
  GraduationCap,
} from "lucide-react"
import { useAuth } from "@root/contexts/AuthContext"

export const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/modulo/sam/dashboard" },
  { icon: Users, label: "Alunos", href: "/modulo/sam/alunos" },
  { icon: Calendar, label: "Agenda", href: "/modulo/sam/agenda" },
  { icon: ClipboardList, label: "Atendimentos", href: "/modulo/sam/atendimentos" },
  { icon: FileText, label: "Relatórios", href: "/modulo/sam/relatorios" },
  { icon: Settings, label: "Configurações", href: "/modulo/sam/configuracoes" },
]

export function Sidebar() {
  const location = useLocation()
  const { signOut } = useAuth()

  return (
    <aside className="hidden min-h-screen w-64 flex-col border-r bg-primary text-primary-foreground md:flex shadow-xl print:hidden">
      <div className="flex h-20 items-center gap-3 border-b border-primary-foreground/20 px-6 sticky top-0 bg-primary z-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary shrink-0">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div className="leading-tight">
          <h1 className="font-bold">SAM</h1>
          <span className="text-xs opacity-80">Educacional</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {sidebarItems.map((item) => {
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-white text-primary shadow-sm"
                  : "text-primary-foreground/80 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-primary-foreground/20 p-4">
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-primary-foreground/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sair do Sistema
        </button>
      </div>
    </aside>
  )
}


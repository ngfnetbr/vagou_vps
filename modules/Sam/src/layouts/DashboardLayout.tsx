import { Outlet, useLocation } from "react-router-dom"
import { AppSidebar } from "@sam/components/layout/app-sidebar"
import { Header } from "@sam/components/layout/header"
import { SidebarProvider } from "@ui/sidebar"
import { ModuleMain } from "@root/components/common/ModuleMain"
import type { Crumb } from "@root/components/common/Breadcrumbs"

const SAM_BASE = "/modulo/sam"

const samTitles: Record<string, string> = {
  [SAM_BASE]: "Início",
  [`${SAM_BASE}/dashboard`]: "Dashboard",
  [`${SAM_BASE}/alunos`]: "Alunos",
  [`${SAM_BASE}/escolas`]: "Escolas",
  [`${SAM_BASE}/atendimentos`]: "Atendimentos",
  [`${SAM_BASE}/agenda`]: "Agenda",
  [`${SAM_BASE}/queixas`]: "Queixas Escolares",
  [`${SAM_BASE}/especialidades`]: "Especialidades",
  [`${SAM_BASE}/cadastros`]: "Cadastros",
  [`${SAM_BASE}/relatorios`]: "Relatórios",
  [`${SAM_BASE}/usuarios`]: "Usuários",
  [`${SAM_BASE}/configuracoes`]: "Configurações",
}

const isDynamic = (s: string) => /^[0-9a-f-]{8,}$/i.test(s) || /^\d+$/.test(s)
const prettify = (s: string) =>
  s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

function resolveCrumbs(pathname: string): Crumb[] {
  const base: Crumb = { label: "SAM", to: SAM_BASE }
  if (pathname === SAM_BASE) return [base]

  const rest = pathname.replace(`${SAM_BASE}/`, "").split("/").filter(Boolean)
  const crumbs: Crumb[] = [base]

  rest.forEach((seg, i) => {
    const full = `${SAM_BASE}/${rest.slice(0, i + 1).join("/")}`
    const isLast = i === rest.length - 1
    const label = samTitles[full] || (isDynamic(seg) ? "Detalhes" : prettify(seg))
    const linkable = !isLast && !!samTitles[full] && !isDynamic(seg)
    crumbs.push({ label, to: linkable ? full : undefined })
  })

  return crumbs
}

export default function DashboardLayout() {
  const location = useLocation()
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <Header />
          <ModuleMain routeKey={location.pathname} breadcrumbs={resolveCrumbs(location.pathname)}>
            <Outlet />
          </ModuleMain>
        </div>
      </div>
    </SidebarProvider>
  )
}

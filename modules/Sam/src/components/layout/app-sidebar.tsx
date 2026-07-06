import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  FolderOpen,
  Building2,
  Calendar,
  Bell,
  Stethoscope,
  
  AlertTriangle,
  BookOpen,
  LayoutList,
  User,
  GraduationCap,
} from "lucide-react"
import { NavLink } from "@sam/components/NavLink"
import { useLocation } from "react-router-dom"
import { BrandLogo } from "@root/components/common/BrandLogo"
import { useAuth } from "@root/contexts/AuthContext"
import { Button } from "@ui/button"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@ui/sidebar"

const SAM_BASE = "/modulo/sam"

const mainItems = [
  { title: "Dashboard", url: `${SAM_BASE}/dashboard`, icon: LayoutDashboard, roles: ["admin", "professional"] },
  { title: "Agenda", url: `${SAM_BASE}/agenda`, icon: Calendar, roles: ["admin", "professional"] },
  { title: "Alunos do SAM", url: `${SAM_BASE}/alunos/selecionados`, icon: GraduationCap, roles: ["admin", "professional"] },
  { title: "Atendimentos", url: `${SAM_BASE}/atendimentos`, icon: ClipboardList, roles: ["admin", "professional"] },
  { title: "Queixas Escolares", url: `${SAM_BASE}/queixas`, icon: AlertTriangle, roles: ["admin", "professional", "school_coord"] },
  { title: "Relatórios", url: `${SAM_BASE}/relatorios`, icon: BarChart3, roles: ["admin", "professional"] },
]

const cadastroItems = [
  { title: "Alunos", url: `${SAM_BASE}/cadastros/alunos`, icon: User },
  { title: "Instituições", url: `${SAM_BASE}/cadastros/cmeis`, icon: Building2 },
  { title: "Turmas", url: `${SAM_BASE}/cadastros/turmas`, icon: LayoutList },
  { title: "Especialidades", url: `${SAM_BASE}/especialidades`, icon: Stethoscope },
]

const bottomItems = [
  { title: "Configurações", url: `${SAM_BASE}/configuracoes`, icon: Settings },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const collapsed = state === "collapsed"
  const location = useLocation()
  const { signOut, profile } = useAuth()
  
  const currentPath = location.pathname
  const userRole = profile?.role || "professional"



  const isActive = (path: string) =>
    currentPath === path || currentPath.startsWith(path + "/")

  const visibleMainItems = mainItems.filter((i) => i.roles.includes(userRole))
  const overviewItems = visibleMainItems.filter((i) =>
    ["Dashboard"].includes(i.title)
  )
  const operationItems = visibleMainItems.filter((i) =>
    ["Agenda", "Atendimentos", "Queixas Escolares"].includes(i.title)
  )
  const reportItems = visibleMainItems.filter((i) => i.title === "Relatórios")

  const showCadastros = userRole === "admin" || userRole === "professional"



  return (
    <Sidebar collapsible="icon">
      {!collapsed ? (
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-3">
            <BrandLogo name="sam" className="h-8 text-sidebar-foreground" title="SAM" />
            <div className="flex flex-1 items-center justify-end">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </SidebarHeader>
      ) : null}

      <SidebarContent className="scrollbar-hide">


        {overviewItems.length > 0 ? (
          <SidebarGroup className="px-2 py-0.5">
            {!collapsed && (
              <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-wider font-semibold mb-0.5 px-2">
                <span className="flex-1 text-left">Visão Geral</span>
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {overviewItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                        <item.icon className="h-3.5 w-3.5" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {operationItems.length > 0 ? (
          <SidebarGroup className="px-2 py-0.5">
            {!collapsed && (
              <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-wider font-semibold mb-0.5 px-2">
                <span className="flex-1 text-left">Operações</span>
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {operationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                        <item.icon className="h-3.5 w-3.5" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {reportItems.length > 0 ? (
          <SidebarGroup className="px-2 py-0.5">
            {!collapsed && (
              <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-wider font-semibold mb-0.5 px-2">
                <span className="flex-1 text-left">Relatórios</span>
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {reportItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                        <item.icon className="h-3.5 w-3.5" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {showCadastros ? (
          <SidebarGroup className="px-2 py-0.5">
            {!collapsed && (
              <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-wider font-semibold mb-0.5 px-2">
                <span className="flex-1 text-left">Cadastros</span>
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {cadastroItems
                  .filter((item: any) => !item.roles || item.roles.includes(userRole))
                  .map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                        <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                          <item.icon className="h-3.5 w-3.5" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        <SidebarGroup className="mt-auto px-2 py-0.5">
          {!collapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-wider font-semibold mb-0.5 px-2">
              <span className="flex-1 text-left">Administração</span>
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                      <item.icon className="h-3.5 w-3.5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

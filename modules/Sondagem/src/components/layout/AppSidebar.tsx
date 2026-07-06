import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Calendar,
  FileEdit,
  Target,
  Building2,
  FolderOpen,
  User,
  Users,
} from "lucide-react";
import { NavLink } from "@sondagem/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@root/contexts/AuthContext";
import { NotificacoesBell } from "@sondagem/components/NotificacoesBell";
import { BrandLogo } from "@root/components/common/BrandLogo";
import { useCanAccess } from "@root/components/admin/PermissionGate";
import {
  SONDAGEM_BASE,
  getVisibleMainMenuItems,
} from "@sondagem/lib/sidebarAccess";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@ui/sidebar";

const cadastroItems = [
  { title: "Alunos", url: `${SONDAGEM_BASE}/cadastros/alunos`, icon: User },
  { title: "Turmas", url: `${SONDAGEM_BASE}/cadastros/turmas`, icon: FolderOpen },
  { title: "Instituições", url: `${SONDAGEM_BASE}/cadastros/cmeis`, icon: Building2 },
  { title: "Coordenadores", url: `${SONDAGEM_BASE}/cadastros/coordenadores`, icon: User },
  { title: "Períodos", url: `${SONDAGEM_BASE}/cadastros/periodos`, icon: Calendar },
  { title: "Metas", url: `${SONDAGEM_BASE}/metas`, icon: Target },
];

const cadastroRoles = ["admin", "equipe_pedagogica"];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { role } = useAuth();
  const canViewAplicar = useCanAccess(["modulos.sondagem.acessar", "sondagem.aplicar.visualizar"]);
  const canViewSolicitar = useCanAccess(["modulos.sondagem.acessar", "sondagem.solicitacoes.visualizar"]);

  const menuDefinitions = getVisibleMainMenuItems({
    role,
    canViewAplicar,
    canViewSolicitar,
  });
  const iconByTitle = {
    Dashboard: LayoutDashboard,
    Alunos: Users,
    "Solicitar Sondagem": FileEdit,
    Lançamento: ClipboardList,
    Relatórios: BarChart3,
  } as const;
  const menuItems = menuDefinitions.map((item) => ({
    ...item,
    icon: iconByTitle[item.title],
  }));

  const showCadastros = !role || cadastroRoles.includes(role);

  const isActive = (path: string) =>
    path === SONDAGEM_BASE ? location.pathname === SONDAGEM_BASE : location.pathname.startsWith(path);

  const overviewItems = menuItems.filter((i) => i.title === "Dashboard");
  const operationItems = menuItems.filter((i) =>
    ["Alunos", "Solicitar Sondagem", "Lançamento", "Relatórios"].includes(i.title)
  );
  const adminItems = menuItems.filter((i) => i.title === "Configurações");

  return (
    <Sidebar collapsible="icon">
      {!collapsed ? (
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-3">
            <BrandLogo name="sondar" className="h-8 text-sidebar-foreground" title="SONDAR" />
            <div className="flex flex-1 items-center justify-end">
              <NotificacoesBell />
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
                      <NavLink
                        to={item.url}
                        end
                        className="hover:bg-sidebar-accent/50"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
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
                      <NavLink
                        to={item.url}
                        className="hover:bg-sidebar-accent/50"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
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
                {cadastroItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        className="hover:bg-sidebar-accent/50"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
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

        {adminItems.length > 0 ? (
          <SidebarGroup className="px-2 py-0.5">
            {!collapsed && (
              <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-wider font-semibold mb-0.5 px-2">
                <span className="flex-1 text-left">Administração</span>
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        className="hover:bg-sidebar-accent/50"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
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
      </SidebarContent>
    </Sidebar>
  );
}

import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/common/NavLink";
import { useIsMobile } from "@/hooks/use-mobile";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { MobileBottomNav } from "./MobileBottomNav";
import { useChatNaoLidas } from "@/hooks/api/chat-hooks";
import { useCriancasNovasFilaCount, initializeBadgeTimestamps } from "@/hooks/use-menu-badges";
import { useDocumentosPendentesCount } from "@/hooks/api/documentos-hooks";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import { useUserPermissions } from "@/hooks/api/permissoes-hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SistemaConfigDialog } from "./SistemaConfigDialog";
import { getUnidadeLabels } from "@/utils/unidade-utils";

import { AccessibilityButton } from "@/components/common/AccessibilityButton";
import { ModuleSwitcher } from "@/components/common/ModuleSwitcher";
import { AdminBreadcrumbs } from "./AdminBreadcrumbs";
import { BrandLogo } from "@/components/common/BrandLogo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  School,
  ListOrdered,
  Settings,
  LogOut,
  GraduationCap,
  FileText,
  FileCheck,
  BarChart3,
  RefreshCw,
  Activity,
  Bell,
  User,
  Shield,
  ArrowRightLeft,
  HelpCircle,
  UserCog,
  MessageSquare,
  Building2,
  HeartPulse,
  ClipboardCheck,
  BookOpen,
  RectangleList,
} from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
}

// Menu organizado por grupos de trabalho
interface MenuGroup {
  label: string;
  items: {
    title: string;
    url: string;
    icon: React.ComponentType<{ className?: string }>;
    roleRequired?: string;
    permissionRequired?: string | string[];
    tourId?: string;
  }[];
  superadminOnly?: boolean;
  diretorOnly?: boolean;
}

const buildMenuGroups = (unidadeSingular: string, unidadePlural: string): MenuGroup[] => [
  {
    label: "Visão Geral",
    items: [
      { title: "Dashboard", url: "/modulo/vagou/admin", icon: LayoutDashboard, tourId: "dashboard-link" },
      { title: `Minha ${unidadeSingular}`, url: "/modulo/vagou/admin/diretor", icon: Building2, roleRequired: "diretor_cmei" },
      { title: "Portal da Escola", url: "/modulo/sam/escola/dashboard", icon: HeartPulse, roleRequired: "school_coord", permissionRequired: "modulos.sam.acessar" },
    ],
  },
  {
    label: "Operações",
    items: [
      { title: "Fila de Espera", url: "/modulo/vagou/admin/fila", icon: ListOrdered, tourId: "fila-link" },
      { title: "Matrículas", url: "/modulo/vagou/admin/matriculas", icon: GraduationCap, tourId: "matriculas-link" },
      { title: "Documentos", url: "/modulo/vagou/admin/documentos", icon: FileCheck },
      { title: "Mensagens", url: "/modulo/vagou/admin/mensagens", icon: MessageSquare },
      { title: "Relatórios", url: "/modulo/vagou/admin/relatorios", icon: BarChart3 },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { title: "Crianças", url: "/modulo/vagou/admin/criancas", icon: User },
      { title: unidadePlural, url: "/modulo/vagou/admin/cmeis", icon: Building2 },
      { title: "Turmas", url: "/modulo/vagou/admin/turmas", icon: RectangleList },
    ],
  },
  {
    label: "Administração",
    items: [
      { title: "Usuários", url: "/modulo/vagou/admin/usuarios", icon: UserCog },
      { title: "Logs do Sistema", url: "/modulo/vagou/admin/logs", icon: Activity },
      { title: "Configurações", url: "/modulo/vagou/admin/configuracoes", icon: Settings },
    ],
  },
  {
    label: "Ajuda",
    items: [
      { title: "Central de Ajuda", url: "/modulo/vagou/admin/tutorial", icon: HelpCircle },
    ],
  },
];

function AdminSidebar() {
  const { state } = useSidebar();
  const { hasRole, user } = useAuth();
  const { data: userPermissions = [] } = useUserPermissions();
  const isCollapsed = state === "collapsed";
  const { data: config } = useConfiguracoesSistema();
  const { singular: unidadeSingular, plural: unidadePlural } = getUnidadeLabels(config as any);
  const menuGroups = buildMenuGroups(unidadeSingular, unidadePlural);
  const mensagensHabilitadas = config?.habilitar_mensagens ?? true;
  const samHabilitado = config?.habilitar_sam ?? true;
  const sondagemHabilitada = config?.habilitar_sondagem ?? true;
  const { data: mensagensNaoLidas = 0 } = useChatNaoLidas(mensagensHabilitadas);
  const { data: criancasNovasFila = 0 } = useCriancasNovasFilaCount();
  const { data: documentosPendentes = 0 } = useDocumentosPendentesCount();
  const isSuperAdmin = hasRole("superadmin");
  const isDiretorOnly =
    hasRole("diretor_cmei") &&
    !hasRole("admin") &&
    !hasRole("superadmin") &&
    !hasRole("gestor");

  const hasMenuAccess = (permissionRequired?: string | string[]) => {
    if (!permissionRequired) return true;
    if (isSuperAdmin) return true;

    const permissions = Array.isArray(permissionRequired) ? permissionRequired : [permissionRequired];
    return permissions.some((permission) => userPermissions.includes(permission));
  };

  const isModuleEnabledForMenu = (url: string) => {
    if (url.startsWith("/modulo/sam")) return samHabilitado;
    if (url.startsWith("/modulo/sondar")) return sondagemHabilitada;
    return true;
  };
  
  // Inicializar timestamps dos badges na primeira vez
  initializeBadgeTimestamps();
  
  // Hook para som de notificação para mensagens - desabilitado quando na página de mensagens
  // pois a própria página já toca o som para evitar duplicação
  const isOnMensagensPage = location.pathname === "/modulo/vagou/admin/mensagens";
  useNotificationSound(mensagensNaoLidas, !isOnMensagensPage);




  const isMobile = useIsMobile();

  // Hide sidebar on mobile - we use bottom nav instead
  if (isMobile) {
    return null;
  }

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r-0 transition-all duration-300 ease-in-out fixed left-0 top-0 h-screen z-40"
      data-tour="sidebar"
    >
      <SidebarContent className="text-sidebar-foreground">
        {/* Logo */}
        <div className="p-4 flex items-center gap-2 border-b border-sidebar-border transition-all duration-300">
          {!isCollapsed ? (
            <div className="flex items-center gap-2 w-full">
              <BrandLogo name="vagou" className="h-8 text-sidebar-foreground" title="VAGOU" />
              {isSuperAdmin && <span className="ml-auto"><SistemaConfigDialog /></span>}
            </div>
          ) : (
            <School className="h-8 w-8 mx-auto transition-transform duration-300" />
          )}
        </div>

        {/* Menu Groups */}
        <div className="flex-1 overflow-y-auto py-2 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
          {menuGroups
            .filter((group) => !group.superadminOnly || isSuperAdmin)
            .filter(
              (group) => !isDiretorOnly || group.label === "Visão Geral" || group.label === "Operações" || group.label === "Módulos"
            )
            .map((group) => {
              const visibleItems = group.items
                .filter((item) => item.title !== "Mensagens" || mensagensHabilitadas)
                .filter((item) => isModuleEnabledForMenu(item.url))
                .filter((item) => !item.roleRequired || hasRole(item.roleRequired))
                .filter((item) => hasMenuAccess(item.permissionRequired))
                .filter(
                  (item) =>
                    !isDiretorOnly || item.url === "/modulo/vagou/admin/diretor" || item.url === "/modulo/vagou/admin/documentos" || item.url === "/modulo/sam/escola/dashboard"
                );
              return visibleItems.length > 0 ? { ...group, visibleItems } : null;
            })
            .filter((group): group is MenuGroup & { visibleItems: MenuGroup["items"] } => Boolean(group))
            .map((group, groupIndex, filteredGroups) => {
              return (
                <SidebarGroup key={group.label} className="px-2 py-0.5">
                  {!isCollapsed && (
                    <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-wider font-semibold mb-0.5 px-2">
                      <span className="flex-1 text-left">{group.label}</span>
                    </SidebarGroupLabel>
                  )}
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.visibleItems.map((item) => {
                        const hasMsgBadge = item.title === "Mensagens" && mensagensNaoLidas > 0;
                        const hasFilaBadge = item.title === "Fila de Espera" && criancasNovasFila > 0;
                        const hasDocsBadge = item.url === "/modulo/vagou/admin/documentos" && documentosPendentes > 0;
                        const hasDiretorDocsBadge = isDiretorOnly && item.url === "/modulo/vagou/admin/diretor" && documentosPendentes > 0;
                        const hasBadge = hasMsgBadge || hasFilaBadge || hasDocsBadge || hasDiretorDocsBadge;
                        const badgeCount = hasMsgBadge
                          ? mensagensNaoLidas
                          : hasFilaBadge
                            ? criancasNovasFila
                            : hasDocsBadge || hasDiretorDocsBadge
                              ? documentosPendentes
                              : 0;
                        const badgeVariant = hasMsgBadge ? "destructive" : "secondary";

                        return (
                          <SidebarMenuItem key={item.title}>
                            {isCollapsed ? (
                              <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                  <SidebarMenuButton asChild>
                                    <NavLink
                                      to={item.url}
                                      end
                                      className="hover:bg-sidebar-accent text-sidebar-foreground/90 hover:text-sidebar-foreground transition-all duration-200 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground relative"
                                      activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
                                      data-tour={item.tourId}
                                    >
                                          <item.icon className="h-3.5 w-3.5" />
                                      {hasBadge && (
                                        <span
                                          className={`absolute -top-1 -right-1 h-4 w-4 ${hasMsgBadge ? "bg-destructive" : "bg-primary"} rounded-md text-[10px] flex items-center justify-center font-bold text-primary-foreground ${hasMsgBadge ? "animate-pulse" : ""}`}
                                        >
                                          {badgeCount > 9 ? "9+" : badgeCount}
                                        </span>
                                      )}
                                    </NavLink>
                                  </SidebarMenuButton>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-popover text-popover-foreground border">
                                  {item.title} {hasBadge && `(${badgeCount})`}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <SidebarMenuButton asChild>
                                <NavLink
                                  to={item.url}
                                  end
                                  className="hover:bg-sidebar-accent text-sidebar-foreground/90 hover:text-sidebar-foreground transition-all duration-200 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground"
                                  activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
                                  data-tour={item.tourId}
                                >
                                      <item.icon className="h-3.5 w-3.5 transition-transform duration-200" />
                                  <span className="transition-opacity duration-200">{item.title}</span>
                                  {hasBadge && (
                                    <Badge
                                      variant={badgeVariant}
                                      className={`ml-auto h-5 min-w-5 px-1.5 text-[10px] ${hasMsgBadge ? "animate-pulse" : ""}`}
                                    >
                                      {badgeCount > 99 ? "99+" : badgeCount}
                                    </Badge>
                                  )}
                                </NavLink>
                              </SidebarMenuButton>
                            )}
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                  {groupIndex < filteredGroups.length - 1 && <SidebarSeparator className="my-1 bg-sidebar-border" />}
                </SidebarGroup>
              );
            })}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

function AdminHeader() {
  const { user, signOut, userProfile, getPrimaryRole, hasRole, userRoles } = useAuth();
  const { data: config } = useConfiguracoesSistema();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [brasaoError, setBrasaoError] = useState(false);
  
  // Verifica se tem ambas as roles para mostrar botão de troca
  const ADMIN_ROLES = ["admin", "superadmin", "gestor", "diretor_cmei"];
  const hasAdminRole = userRoles.some((r) => ADMIN_ROLES.includes(r));
  const hasResponsavelRole = hasRole("responsavel");
  const canSwitchArea = hasAdminRole && hasResponsavelRole;

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0]?.substring(0, 2).toUpperCase() || "U";
  };

  return (
    <header className="border-b bg-card sticky top-0 z-30 shadow-sm">
      <div className="flex items-center justify-between px-3 py-3 md:px-6 md:py-4">
        <div className="flex items-center gap-2 md:gap-4">
          <SidebarTrigger className="-ml-1 md:-ml-2 hidden md:flex" />
          <div className={`flex items-center gap-2 md:gap-3 transition-all duration-300 ${isCollapsed ? 'opacity-100' : 'opacity-100'}`}>
            {config?.brasao_url && !brasaoError ? (
              <div style={{ backgroundColor: "#ffffff" }} className={`rounded-lg overflow-hidden border flex items-center justify-center transition-all duration-300 h-8 w-8 md:h-10 md:w-10 ${!isCollapsed && 'md:h-12 md:w-12'}`}>
                <img 
                  src={config.brasao_url} 
                  alt="Brasão" 
                  className="h-full w-full object-contain p-1"
                  onError={() => setBrasaoError(true)}
                />
              </div>
            ) : (
              <div style={{ backgroundColor: "#ffffff" }} className={`rounded-lg border flex items-center justify-center transition-all duration-300 h-8 w-8 md:h-10 md:w-10 ${!isCollapsed && 'md:h-12 md:w-12'}`}>
                <School className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
            )}
            <div className="transition-all duration-300 hidden sm:block">
              <h1 className={`font-semibold text-foreground transition-all duration-300 text-sm md:text-base ${!isCollapsed && 'md:text-lg'}`}>
                {config?.nome_secretaria || "Secretaria de Educação"}
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                {config?.nome_municipio || "Município"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {canSwitchArea && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">Área Administrativa</span>
            </div>
          )}
          <ModuleSwitcher />
          <AccessibilityButton />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 md:gap-3 h-auto py-1.5 px-2 md:py-2 md:px-3" data-tour="user-menu">
                <div className="text-right hidden sm:block">
                  <p className="text-xs md:text-sm font-medium text-foreground">
                    {userProfile?.nome_completo || user?.email?.split('@')[0] || "Usuário"}
                  </p>
                  <p className="text-[10px] md:text-xs text-muted-foreground">{getPrimaryRole()}</p>
                </div>
                <Avatar className="h-8 w-8 md:h-9 md:w-9">
                  <AvatarImage src={userProfile?.avatar_url || undefined} alt={userProfile?.nome_completo || "Avatar"} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs md:text-sm">
                    {getInitials(userProfile?.nome_completo)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{userProfile?.nome_completo || "Usuário"}</p>
                  <p className="text-xs text-muted-foreground font-normal">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/modulo/vagou/admin/perfil" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Meu Perfil
                </Link>
              </DropdownMenuItem>
              {canSwitchArea && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/modulo/vagou/responsavel" className="cursor-pointer">
                      <User className="mr-2 h-3.5 w-3.5" />
                      Área do Responsável
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const isMobile = useIsMobile();
  const location = useLocation();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background overflow-x-hidden">
        <AdminSidebar />
        
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <AdminHeader />
          <AdminBreadcrumbs />

          {/* Main Content */}
          <main className="flex-1 p-3 md:p-6 pb-20 md:pb-6 overflow-x-hidden" data-tour="main-content">
            <div key={location.pathname} className="animate-fade-in">
              {children}
            </div>
          </main>
        </div>
        
        {/* Mobile Bottom Navigation */}
        {isMobile && <MobileBottomNav />}
      </div>
    </SidebarProvider>
  );
}

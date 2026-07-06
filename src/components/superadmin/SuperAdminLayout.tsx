import { ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { NavLink } from "@/components/common/NavLink";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { ModuleSwitcher } from "@/components/common/ModuleSwitcher";
import { AccessibilityButton } from "@/components/common/AccessibilityButton";
import { BrandLogo } from "@/components/common/BrandLogo";
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  KeyRound,
  Layers,
  Building2,
  School,
  LogOut,
  User,
  FileSearch,
} from "lucide-react";

interface SuperAdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { title: "Visão Geral", url: "/superadmin", icon: LayoutDashboard, end: true },
  { title: "Usuários & Atividade", url: "/superadmin/usuarios", icon: Users },
  { title: "Permissões", url: "/superadmin/permissoes", icon: KeyRound },
  { title: "Acesso aos Módulos", url: "/superadmin/modulos", icon: Layers },
  { title: "Município", url: "/superadmin/municipio", icon: Building2 },
  { title: "Auditoria VAGOU", url: "/modulo/vagou/admin/auditoria", icon: FileSearch },
];

function getInitials(name: string | null | undefined) {
  if (!name) return "SA";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0]?.substring(0, 2).toUpperCase() || "SA";
}

function SuperAdminSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex h-12 items-center gap-2 px-2">
          {isCollapsed ? (
            <ShieldCheck className="mx-auto h-6 w-6 text-sidebar-foreground" />
          ) : (
            <BrandLogo name="same" className="h-8 text-sidebar-foreground" title="e-SAM" />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="stagger-in">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.end}
                      className="group text-sidebar-foreground/80 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-foreground"
                      activeClassName="bg-sidebar-accent font-medium text-sidebar-foreground"
                    >
                      <item.icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}


export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const { user, userProfile, signOut } = useAuth();
  const { data: config } = useConfiguracoesSistema();
  const navigate = useNavigate();
  const location = useLocation();
  const [brasaoError, setBrasaoError] = useState(false);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <SuperAdminSidebar />

        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-30 border-b bg-card shadow-sm">
            <div className="flex items-center justify-between gap-2 px-3 py-3 md:px-6 md:py-4">
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <SidebarTrigger className="-ml-1 shrink-0" />
                {/* Identidade do município (igual aos módulos) */}
                {config?.brasao_url && !brasaoError ? (
                  <div style={{ backgroundColor: "#ffffff" }} className="rounded-lg overflow-hidden border flex items-center justify-center h-8 w-8 md:h-12 md:w-12 shrink-0">
                    <img
                      src={config.brasao_url}
                      alt="Brasão"
                      className="h-full w-full object-contain p-1"
                      onError={() => setBrasaoError(true)}
                    />
                  </div>
                ) : (
                  <div style={{ backgroundColor: "#ffffff" }} className="rounded-lg border flex items-center justify-center h-8 w-8 md:h-12 md:w-12 shrink-0">
                    <School className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                )}
                <div className="hidden sm:block min-w-0">
                  <h1 className="font-semibold text-foreground text-sm md:text-lg truncate">
                    {config?.nome_secretaria || "Secretaria de Educação"}
                  </h1>
                  <p className="text-xs md:text-sm text-muted-foreground truncate">
                    {config?.nome_municipio || "Município"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-primary">Painel Super Admin</span>
                </div>
                <ModuleSwitcher />
                <AccessibilityButton />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 md:gap-3 h-auto py-1.5 px-2 md:py-2 md:px-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs md:text-sm font-medium text-foreground">
                          {userProfile?.nome_completo || user?.email?.split("@")[0] || "Usuário"}
                        </p>
                        <p className="text-[10px] md:text-xs text-muted-foreground">Super Admin</p>
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
                    <DropdownMenuItem onClick={() => navigate("/superadmin/perfil")} className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" /> Meu perfil
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut()} className="text-destructive cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" /> Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main key={location.pathname} className="animate-fade-in p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

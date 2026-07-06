import { ReactNode, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { ResponsavelMobileBottomNav } from "./MobileBottomNav";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { AccessibilityButton } from "@/components/common/AccessibilityButton";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import {
  LayoutDashboard,
  UserCircle,
  LogOut,
  Menu,
  ListOrdered,
  Building2,
  UserPlus,
  FileText,
  
  Shield,
  MessageSquare,
  Home,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/utils";
import { useMinhasNaoLidas } from "@/hooks/api/chat-hooks";
import { useState } from "react";
import { getUnidadeLabels } from "@/utils/unidade-utils";

interface ResponsavelLayoutProps {
  children: ReactNode;
}

// Menu items do portal do responsável
const menuItems = [
  { title: "Minhas Inscrições", url: "/modulo/vagou/responsavel", icon: LayoutDashboard, exact: true },
  { title: "Nova Inscrição", url: "/modulo/vagou/responsavel/inscricao", icon: UserPlus },
  { title: "Documentos", url: "/modulo/vagou/responsavel/documentos", icon: FileText },
  { title: "Mensagens", url: "/modulo/vagou/responsavel/mensagens", icon: MessageSquare, badge: true },
  { title: "Fila de Espera", url: "/modulo/vagou/responsavel/fila", icon: ListOrdered },
  { title: "Ocupação", url: "/modulo/vagou/responsavel/ocupacao", icon: Building2 },
  { title: "Meu Perfil", url: "/modulo/vagou/responsavel/perfil", icon: UserCircle },
];

export default function ResponsavelLayout({ children }: ResponsavelLayoutProps) {
  const { user, signOut, userProfile, userRoles, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { data: config } = useConfiguracoesPublicas();
  const { plural } = getUnidadeLabels(config as any);
  const mensagensHabilitadas = config?.habilitar_mensagens ?? true;
  const { data: naoLidas = 0 } = useMinhasNaoLidas(mensagensHabilitadas);
  const [menuOpen, setMenuOpen] = useState(false);

  const filteredMenuItems = (mensagensHabilitadas ? menuItems : menuItems.filter((item) => item.title !== "Mensagens"))
    .map((item) => (item.url === "/modulo/vagou/responsavel/ocupacao" ? { ...item, title: `Ocupação ${plural}` } : item));

  const menuGroups = [
    {
      label: "Inscrições",
      items: filteredMenuItems.filter((i) =>
        ["Minhas Inscrições", "Nova Inscrição", "Fila de Espera"].includes(i.title) || i.title.startsWith("Ocupação "),
      ),
    },
    {
      label: "Documentos",
      items: filteredMenuItems.filter((i) => i.title === "Documentos"),
    },
    {
      label: "Comunicação",
      items: filteredMenuItems.filter((i) => i.title === "Mensagens"),
    },
    {
      label: "Conta",
      items: filteredMenuItems.filter((i) => i.title === "Meu Perfil"),
    },
  ].filter((g) => g.items.length > 0);

  const sistemaNome = config?.sistema_nome || "VAGOU";
  const brasaoUrl = config?.brasao_url;
  const sistemaIconeUrl = config?.sistema_icone_url;
  const permitirTrocaTema = config?.permitir_troca_tema !== false;

  // Verifica se tem role admin para mostrar botão de troca
  const ADMIN_ROLES = ["admin", "superadmin", "gestor", "diretor_cmei"];
  const hasAdminRole = userRoles.some((r) => ADMIN_ROLES.includes(r));
  const canSwitchArea = hasAdminRole && hasRole("responsavel");

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth/login");
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0]?.substring(0, 2).toUpperCase() || "U";
  };

  const isActive = (url: string, exact?: boolean) => {
    if (exact) return location.pathname === url;
    return location.pathname.startsWith(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-primary via-primary/95 to-primary/90 text-primary-foreground shadow-sm"
        role="banner"
      >
        <div className="govbr-container">
          <div className="flex items-center justify-between py-2.5">
            {/* Logo/Home */}
            <Link to="/modulo/vagou/responsavel" className="flex items-center gap-2 text-primary-foreground hover:opacity-90 transition-opacity">
              {(brasaoUrl || sistemaIconeUrl) ? (
                <div style={{ backgroundColor: "#ffffff" }} className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                  <img 
                    src={brasaoUrl || sistemaIconeUrl} 
                    alt="Logo" 
                    className="w-6 h-6 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <Home className="w-5 h-5" />
              )}
              <div className="flex flex-col">
                <span className="font-semibold text-sm leading-tight">Portal do Responsável</span>
                {!isMobile && (
                  <span className="text-[10px] opacity-70 leading-tight">{sistemaNome}</span>
                )}
              </div>
            </Link>

            {/* Right side actions */}
            <div className="flex items-center gap-1">
              <AccessibilityButton variant="header" />
              
              {/* Desktop: User dropdown */}
              {!isMobile && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 h-auto py-1.5 px-2 text-primary-foreground hover:bg-primary-foreground/10">
                      <span className="text-sm truncate max-w-[150px]">
                        {userProfile?.nome_completo || user?.email}
                      </span>
                      <Avatar className="h-7 w-7 border border-primary-foreground/20">
                        <AvatarImage src={userProfile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-xs">
                          {getInitials(userProfile?.nome_completo)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div>
                        <p className="font-medium truncate">{userProfile?.nome_completo || "Usuário"}</p>
                        <p className="text-xs text-muted-foreground font-normal truncate">{user?.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/modulo/vagou/responsavel/perfil" className="cursor-pointer">
                        <UserCircle className="mr-2 h-4 w-4" />
                        Meu Perfil
                      </Link>
                    </DropdownMenuItem>
                    {canSwitchArea && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/modulo/vagou/admin" className="cursor-pointer">
                            <Shield className="mr-2 h-4 w-4" />
                            Área Administrativa
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Desktop: Hamburger Menu for navigation */}
              {!isMobile && (
                <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                      <Menu className="w-5 h-5" />
                      <span className="sr-only">Abrir menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-72 bg-sidebar text-sidebar-foreground border-l-sidebar-border p-0">
                    <div className="p-4 border-b border-sidebar-border">
                      <span className="font-semibold">Menu</span>
                    </div>
                    <nav className="flex flex-col p-2">
                      {menuGroups.map((group) => (
                        <div key={group.label} className="flex flex-col">
                          <div className="px-2 py-2 rounded-md text-xs uppercase tracking-wider font-semibold text-sidebar-foreground/60">
                            {group.label}
                          </div>
                          <div className="flex flex-col">
                            {group.items.map((item) => (
                              <Button
                                key={item.url}
                                variant="ghost"
                                asChild
                                className={cn(
                                  "justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground relative",
                                  isActive(item.url, item.exact) && "bg-sidebar-accent",
                                )}
                                onClick={() => setMenuOpen(false)}
                              >
                                <Link to={item.url}>
                                  <item.icon className="w-4 h-4 mr-3" />
                                  {item.title}
                                  {item.badge && naoLidas > 0 && (
                                    <Badge variant="destructive" className="ml-auto h-5 min-w-[20px] px-1 text-xs">
                                      {naoLidas > 99 ? "99+" : naoLidas}
                                    </Badge>
                                  )}
                                </Link>
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                      {canSwitchArea && (
                        <div className="border-t border-sidebar-border mt-2 pt-2">
                          <Button
                            variant="ghost"
                            asChild
                            className="justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full"
                            onClick={() => setMenuOpen(false)}
                          >
                            <Link to="/modulo/vagou/admin">
                              <Shield className="w-4 h-4 mr-3" />
                              Área Administrativa
                            </Link>
                          </Button>
                        </div>
                      )}
                      <div className="border-t border-sidebar-border mt-2 pt-2">
                        <Button
                          variant="ghost"
                          className="justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full"
                          onClick={() => {
                            setMenuOpen(false);
                            signOut();
                            navigate("/");
                          }}
                        >
                          <LogOut className="w-4 h-4 mr-3" />
                          Sair
                        </Button>
                      </div>
                    </nav>
                  </SheetContent>
                </Sheet>
              )}

              {/* Mobile: Avatar only (nav is in bottom) */}
              {isMobile && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                      <Avatar className="h-7 w-7 border border-primary-foreground/20">
                        <AvatarImage src={userProfile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-xs">
                          {getInitials(userProfile?.nome_completo)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div>
                        <p className="font-medium truncate">{userProfile?.nome_completo || "Usuário"}</p>
                        <p className="text-xs text-muted-foreground font-normal truncate">{user?.email}</p>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0">
        <div className="govbr-container py-4 md:py-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && <ResponsavelMobileBottomNav />}
    </div>
  );
}

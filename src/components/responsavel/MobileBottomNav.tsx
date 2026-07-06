import { Link, useLocation } from "react-router-dom";
import { cn } from "@/utils/utils";
import { useMinhasNaoLidas } from "@/hooks/api/chat-hooks";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import {
  LayoutDashboard,
  UserPlus,
  FileText,
  MessageSquare,
  MoreHorizontal,
  
  ListOrdered,
  Building2,
  UserCircle,
  LogOut,
  Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getUnidadeLabels } from "@/utils/unidade-utils";

const primaryItems = [
  { to: "/modulo/vagou/responsavel", icon: LayoutDashboard, label: "Início" },
  { to: "/modulo/vagou/responsavel/inscricao", icon: UserPlus, label: "Inscrição" },
  { to: "/modulo/vagou/responsavel/mensagens", icon: MessageSquare, label: "Mensagens", badge: true },
  { to: "/modulo/vagou/responsavel/documentos", icon: FileText, label: "Documentos" },
];

export function ResponsavelMobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: config } = useConfiguracoesPublicas();
  const { plural } = getUnidadeLabels(config as any);
  const mensagensHabilitadas = config?.habilitar_mensagens ?? true;
  const { data: naoLidas = 0 } = useMinhasNaoLidas(mensagensHabilitadas);
  const { signOut, userRoles, hasRole } = useAuth();
  const moreItems = [
    { to: "/modulo/vagou/responsavel/fila", icon: ListOrdered, label: "Fila de Espera" },
    { to: "/modulo/vagou/responsavel/ocupacao", icon: Building2, label: `Ocupação ${plural}` },
    { to: "/modulo/vagou/responsavel/perfil", icon: UserCircle, label: "Meu Perfil" },
  ];

  const filteredPrimaryItems = mensagensHabilitadas
    ? primaryItems
    : primaryItems.filter((item) => item.to !== "/modulo/vagou/responsavel/mensagens");

  const isActive = (url: string) => {
    if (url === "/modulo/vagou/responsavel") {
      return location.pathname === "/modulo/vagou/responsavel";
    }
    return location.pathname.startsWith(url);
  };

  const isMoreActive = moreItems.some((item) => isActive(item.to));

  // Verifica se tem role admin para mostrar botão de troca
  const ADMIN_ROLES = ["admin", "superadmin", "gestor", "diretor_cmei"];
  const hasAdminRole = userRoles.some((r) => ADMIN_ROLES.includes(r));
  const canSwitchArea = hasAdminRole && hasRole("responsavel");

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth/login");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-safe md:hidden shadow-lg">
      <div className="flex items-center justify-around h-16">
        {filteredPrimaryItems.map((item) => {
          const active = isActive(item.to);
          const hasBadge = item.badge && naoLidas > 0;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-2 px-1 transition-all min-w-0 relative",
                active
                  ? "text-primary"
                  : "text-muted-foreground active:scale-95"
              )}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-b-full" />
              )}
              <div className="relative">
                <item.icon className={cn(
                  "h-5 w-5 mb-1 transition-transform",
                  active && "scale-110"
                )} />
                {hasBadge && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2.5 h-4 min-w-4 px-1 text-[10px]"
                  >
                    {naoLidas > 9 ? "9+" : naoLidas}
                  </Badge>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium truncate max-w-full",
                active && "font-semibold"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* More Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-2 px-1 transition-all min-w-0 relative",
                isMoreActive
                  ? "text-primary"
                  : "text-muted-foreground active:scale-95"
              )}
            >
              {isMoreActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-b-full" />
              )}
              <MoreHorizontal className={cn(
                "h-5 w-5 mb-1 transition-transform",
                isMoreActive && "scale-110"
              )} />
              <span className={cn(
                "text-[10px] font-medium",
                isMoreActive && "font-semibold"
              )}>
                Mais
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 mb-2" sideOffset={8}>
            {moreItems.map((item) => {
              const active = isActive(item.to);
              return (
                <DropdownMenuItem key={item.to} asChild>
                  <Link 
                    to={item.to} 
                    className={cn(
                      "flex items-center gap-3 cursor-pointer",
                      active && "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                </DropdownMenuItem>
              );
            })}
            {canSwitchArea && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/modulo/vagou/admin" className="flex items-center gap-3 cursor-pointer">
                    <Shield className="h-4 w-4" />
                    <span>Área Admin</span>
                  </Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleSignOut}
              className="flex items-center gap-3 cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}



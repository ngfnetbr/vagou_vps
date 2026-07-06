import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, FileText, Users, BarChart3, MoreHorizontal, Search, MessageCircle, Download, LogIn } from "lucide-react";
import { cn } from "@/utils/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import { InscricaoChoiceDialog } from "@/components/public/InscricaoChoiceDialog";
import { useState } from "react";

const primaryItems = [
  { to: "/modulo/vagou/publico", icon: Home, label: "Início" },
  { to: "/modulo/vagou/publico/inscricao", icon: FileText, label: "Inscrição" },
  { to: "/modulo/vagou/publico/fila", icon: Users, label: "Fila" },
  { to: "/modulo/vagou/publico/ocupacao", icon: BarChart3, label: "Ocupação" },
];

const moreItems = [
  { to: "/modulo/vagou/publico/consulta", icon: Search, label: "Consultar CPF" },
  { to: "/modulo/vagou/publico/contato", icon: MessageCircle, label: "Contato" },
  { to: "/modulo/vagou/publico/download", icon: Download, label: "Baixar App" },
  { to: "/auth/login", icon: LogIn, label: "Área Restrita" },
];

export const PublicMobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { data: config } = useConfiguracoesPublicas();
  const [showChoiceDialog, setShowChoiceDialog] = useState(false);
  
  const autenticacaoPublica = config?.autenticacao_publica;

  const isActive = (path: string) => {
    if (path === "/modulo/vagou/publico") {
      return currentPath === "/modulo/vagou/publico" || currentPath === "/modulo/vagou/publico/";
    }
    return currentPath.startsWith(path);
  };

  const isMoreActive = moreItems.some(item => isActive(item.to));

  const handleInscricaoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (autenticacaoPublica) {
      navigate("/auth/login", {
        state: {
          redirectTo: "/modulo/vagou/responsavel/inscricao"
        }
      });
    } else {
      setShowChoiceDialog(true);
    }
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-safe md:hidden shadow-lg">
        <div className="flex items-center justify-around h-16">
          {primaryItems.map((item) => {
            const active = isActive(item.to);
            
            if (item.label === "Inscrição") {
              return (
                <button
                  key={item.to}
                  onClick={handleInscricaoClick}
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
                  <item.icon className={cn(
                    "h-5 w-5 mb-1 transition-transform",
                    active && "scale-110"
                  )} />
                  <span className={cn(
                    "text-[10px] font-medium truncate max-w-full",
                    active && "font-semibold"
                  )}>
                    {item.label}
                  </span>
                </button>
              );
            }

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
                <item.icon className={cn(
                  "h-5 w-5 mb-1 transition-transform",
                  active && "scale-110"
                )} />
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
                        "w-full cursor-pointer",
                        active && "bg-accent text-accent-foreground"
                      )}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      <InscricaoChoiceDialog 
        open={showChoiceDialog} 
        onOpenChange={setShowChoiceDialog} 
      />
    </>
  );
};



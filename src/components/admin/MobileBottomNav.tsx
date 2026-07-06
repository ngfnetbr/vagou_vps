import { NavLink } from "@/components/common/NavLink";
import {
  LayoutDashboard,
  ListOrdered,
  GraduationCap,
  Users,
  MoreHorizontal,
  Building2,
  MessageSquare,
  School,
  BookOpen,
  BarChart3,
  HeartPulse,
  ClipboardCheck,
  UserCog,
  Shield,
  Activity,
  Settings,
  HelpCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions } from "@/hooks/api/permissoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";

const mainItems = [
  { title: "Início", url: "/modulo/vagou/admin", icon: LayoutDashboard },
  { title: "Fila", url: "/modulo/vagou/admin/fila", icon: ListOrdered },
  { title: "Matrículas", url: "/modulo/vagou/admin/matriculas", icon: GraduationCap },
  { title: "Crianças", url: "/modulo/vagou/admin/criancas", icon: Users },
];

export function MobileBottomNav() {
  const location = useLocation();
  const { data: config } = useConfiguracoesSistema();
  const { singular, plural } = getUnidadeLabels(config as any);
  const { hasRole } = useAuth();
  const { data: userPermissions = [] } = useUserPermissions();
  const isDiretorOnly =
    hasRole("diretor_cmei") &&
    !hasRole("admin") &&
    !hasRole("superadmin") &&
    !hasRole("gestor");
  const mensagensHabilitadas = config?.habilitar_mensagens ?? true;
  const samHabilitado = config?.habilitar_sam ?? true;
  const sondagemHabilitada = config?.habilitar_sondagem ?? true;
  const canAccessSam = samHabilitado && (hasRole("superadmin") || userPermissions.includes("modulos.sam.acessar"));
  const canAccessSondagem =
    sondagemHabilitada && (hasRole("superadmin") || userPermissions.includes("modulos.sondagem.acessar"));
  const moreItems = [
    { title: "Mensagens", url: "/modulo/vagou/admin/mensagens", icon: MessageSquare },
    { title: plural, url: "/modulo/vagou/admin/cmeis", icon: School },
    { title: "Turmas", url: "/modulo/vagou/admin/turmas", icon: BookOpen },
    { title: "Relatórios", url: "/modulo/vagou/admin/relatorios", icon: BarChart3 },
    { title: "SAM", url: "/modulo/sam", icon: HeartPulse },
    { title: "SONDAR", url: "/modulo/sondar", icon: ClipboardCheck },
    { title: "Usuários", url: "/modulo/vagou/admin/usuarios", icon: UserCog },
    { title: "Auditoria", url: "/modulo/vagou/admin/auditoria", icon: Shield },
    { title: "Logs", url: "/modulo/vagou/admin/logs", icon: Activity },
    { title: "Configurações", url: "/modulo/vagou/admin/configuracoes", icon: Settings },
    { title: "Central de Ajuda", url: "/modulo/vagou/admin/tutorial", icon: HelpCircle },
  ];
  const filteredMoreItems = isDiretorOnly
    ? []
    : mensagensHabilitadas
      ? moreItems
      : moreItems.filter((item) => item.title !== "Mensagens");
  const visibleMoreItems = filteredMoreItems
    .filter((item) => item.title !== "SAM" || canAccessSam)
    .filter((item) => item.title !== "SONDAR" || canAccessSondagem);
  
  const isMoreActive = visibleMoreItems.some(item => location.pathname === item.url || location.pathname.startsWith(item.url + "/"));
  const mainItemsToRender = isDiretorOnly
    ? [
        { title: `Minha ${singular}`, url: "/modulo/vagou/admin/diretor", icon: Building2 },
      ]
    : mainItems;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border shadow-lg safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {mainItemsToRender.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            end={item.url === "/modulo/vagou/admin"}
            className="flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-2 rounded-xl text-muted-foreground transition-all duration-200 active:scale-95"
            activeClassName="text-primary bg-primary/10"
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium truncate max-w-full px-1">{item.title}</span>
          </NavLink>
        ))}
        
        {!isDiretorOnly && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className={`flex flex-col items-center justify-center gap-0.5 h-auto min-w-0 flex-1 py-2 rounded-xl transition-all duration-200 active:scale-95 ${
                  isMoreActive ? 'text-primary bg-primary/10' : 'text-muted-foreground'
                }`}
              >
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-[10px] font-medium">Mais</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-64 mb-2 max-h-[70vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-2 duration-200"
              side="top"
              sideOffset={8}
            >
              <div className="grid grid-cols-2 gap-1 p-1">
                {visibleMoreItems.map((item) => (
                  <DropdownMenuItem key={item.title} asChild className="p-0">
                    <Link 
                      to={item.url} 
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                        location.pathname === item.url || location.pathname.startsWith(item.url + "/")
                          ? 'bg-primary/10 text-primary font-medium' 
                          : 'hover:bg-muted'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="text-sm">{item.title}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </nav>
  );
}

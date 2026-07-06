import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ListOrdered,
  GraduationCap,
  FileCheck,
  MessageSquare,
  BarChart3,
  User,
  Building2,
  RectangleList,
  UserCog,
  Activity,
  Settings,
  HelpCircle,
  Shield,
  LayoutGrid,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions } from "@/hooks/api/permissoes-hooks";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import { getAccessibleModules } from "@/config/ecosystem-modules";

type Screen = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  superadminOnly?: boolean;
};

// Telas do VAGOU (Admin) navegáveis rapidamente pela paleta.
const ADMIN_SCREENS: Screen[] = [
  { label: "Dashboard", to: "/modulo/vagou/admin", icon: LayoutDashboard },
  { label: "Fila de Espera", to: "/modulo/vagou/admin/fila", icon: ListOrdered },
  { label: "Matrículas", to: "/modulo/vagou/admin/matriculas", icon: GraduationCap },
  { label: "Documentos", to: "/modulo/vagou/admin/documentos", icon: FileCheck },
  { label: "Mensagens", to: "/modulo/vagou/admin/mensagens", icon: MessageSquare },
  { label: "Relatórios", to: "/modulo/vagou/admin/relatorios", icon: BarChart3 },
  { label: "Crianças", to: "/modulo/vagou/admin/criancas", icon: User },
  { label: "Unidades", to: "/modulo/vagou/admin/cmeis", icon: Building2 },
  { label: "Turmas", to: "/modulo/vagou/admin/turmas", icon: RectangleList },
  { label: "Usuários", to: "/modulo/vagou/admin/usuarios", icon: UserCog },
  { label: "Logs do Sistema", to: "/modulo/vagou/admin/logs", icon: Activity },
  { label: "Configurações", to: "/modulo/vagou/admin/configuracoes", icon: Settings },
  { label: "Central de Ajuda", to: "/modulo/vagou/admin/tutorial", icon: HelpCircle },
  { label: "Console Super Admin", to: "/superadmin", icon: Shield, superadminOnly: true },
  { label: "Auditoria", to: "/modulo/vagou/admin/auditoria", icon: Shield, superadminOnly: true },
];

/**
 * Paleta de comandos global (Ctrl/Cmd + K) para saltar rapidamente entre
 * módulos do ecossistema e telas do VAGOU.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, userRoles, hasRole } = useAuth();
  const { data: userPermissions } = useUserPermissions();
  const { data: publicConfig } = useConfiguracoesPublicas();

  const modules = useMemo(
    () =>
      getAccessibleModules({
        roles: userRoles,
        permissions: userPermissions || [],
        samEnabled: publicConfig?.habilitar_sam ?? true,
        sondagemEnabled: publicConfig?.habilitar_sondagem ?? true,
        vagouEnabled: publicConfig?.habilitar_vagou ?? true,
      }),
    [userRoles, userPermissions, publicConfig],
  );

  const isSuperAdmin = hasRole("superadmin");
  const isAdminLike =
    isSuperAdmin || hasRole("admin") || hasRole("gestor") || hasRole("diretor_cmei");

  const screens = useMemo(
    () => ADMIN_SCREENS.filter((s) => (s.superadminOnly ? isSuperAdmin : true)),
    [isSuperAdmin],
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  // Sem usuário autenticado não há para onde navegar.
  if (!user) return null;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar módulos e telas…" />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        {modules.length > 0 && (
          <CommandGroup heading="Módulos">
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <CommandItem
                  key={mod.id}
                  value={`modulo ${mod.name} ${mod.shortName}`}
                  onSelect={() => go(mod.homePath)}
                >
                  <Icon className="mr-2 h-4 w-4 text-primary" />
                  <span>{mod.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{mod.description}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {isAdminLike && screens.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Telas do VAGOU">
              {screens.map((screen) => {
                const Icon = screen.icon;
                return (
                  <CommandItem
                    key={screen.to}
                    value={`tela ${screen.label}`}
                    onSelect={() => go(screen.to)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{screen.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Atalhos">
          <CommandItem value="ver todos os modulos" onSelect={() => go("/modulos")}>
            <LayoutGrid className="mr-2 h-4 w-4" />
            <span>Ver todos os módulos</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export default CommandPalette;

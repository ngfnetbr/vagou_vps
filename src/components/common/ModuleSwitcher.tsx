import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutGrid, Check, ChevronDown, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions } from "@/hooks/api/permissoes-hooks";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import { getAccessibleModules, type EcosystemModuleId } from "@/config/ecosystem-modules";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/common/BrandLogo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Identifica o módulo atual a partir da rota. */
function getCurrentModuleId(pathname: string): EcosystemModuleId | null {
  if (pathname.startsWith("/modulo/sam")) return "sam";
  if (pathname.startsWith("/modulo/sondar")) return "sondar";
  if (pathname.startsWith("/modulo/vagou/admin") || pathname.startsWith("/modulo/vagou/responsavel")) return "vagou";
  return null;
}

/**
 * Seletor de módulos do ecossistema, exibido no shell de cada módulo.
 * Permite alternar entre VAGOU, SONDAR e SAM sem deslogar.
 */
export function ModuleSwitcher() {
  const { userRoles } = useAuth();
  const { data: userPermissions } = useUserPermissions();
  const { data: publicConfig } = useConfiguracoesPublicas();
  const navigate = useNavigate();
  const location = useLocation();

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

  const currentModuleId = getCurrentModuleId(location.pathname);
  const current = modules.find((m) => m.id === currentModuleId);
  const isSuperAdmin = userRoles.includes("superadmin");

  // Com 1 módulo ou menos não há o que alternar (a não ser o painel do superadmin)
  if (modules.length <= 1 && !isSuperAdmin) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <LayoutGrid className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">{current?.shortName ?? "Módulos"}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2">
        <DropdownMenuLabel>Trocar de módulo</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {modules.map((mod) => {
          const isActive = mod.id === currentModuleId;
          return (
            <DropdownMenuItem
              key={mod.id}
              className="cursor-pointer gap-2 my-1 py-3 transition-all duration-200 hover:scale-[1.02] hover:bg-accent focus:scale-[1.02]"
              onClick={() => {
                if (!isActive) navigate(mod.homePath);
              }}
            >
              <BrandLogo name={mod.logo} className="h-7 text-foreground transition-transform duration-200" title={mod.name} />
              <div className="flex-1" />
              {isActive && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
        {isSuperAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => navigate("/superadmin")}
            >
              <ShieldCheck className="h-4 w-4 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight">Painel Superadmin</p>
                <p className="truncate text-xs text-muted-foreground">Administração global</p>
              </div>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/modulos")}>
          <LayoutGrid className="mr-2 h-4 w-4" />
          Ver todos os módulos
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ModuleSwitcher;

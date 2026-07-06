import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions } from "@/hooks/api/permissoes-hooks";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import { getAccessibleModules, type EcosystemModuleId } from "@/config/ecosystem-modules";

interface ModuleAccessGuardProps {
  module: EcosystemModuleId;
  children: ReactNode;
}

function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div
        role="status"
        aria-label="Carregando"
        className="h-9 w-9 rounded-full border-b-2 border-primary animate-spin"
      />
    </div>
  );
}

/**
 * Guarda de acesso a nível de ecossistema: garante que o usuário só abra um
 * módulo ao qual tem acesso (role + permissão + flag do município).
 * Caso contrário, redireciona ao seletor de módulos (/modulos).
 */
export function ModuleAccessGuard({ module, children }: ModuleAccessGuardProps) {
  const { user, isLoading } = useAuth();
  const { data: userPermissions, isLoading: isLoadingPermissions } = useUserPermissions();
  const { data: publicConfig, isLoading: isLoadingPublicConfig } = useConfiguracoesPublicas();
  const { userRoles } = useAuth();

  if (isLoading || isLoadingPermissions || isLoadingPublicConfig) {
    return <PageSpinner />;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  const modules = getAccessibleModules({
    roles: userRoles,
    permissions: userPermissions || [],
    samEnabled: publicConfig?.habilitar_sam ?? true,
    sondagemEnabled: publicConfig?.habilitar_sondagem ?? true,
    vagouEnabled: publicConfig?.habilitar_vagou ?? true,
  });

  const hasAccess = modules.some((m) => m.id === module);
  if (!hasAccess) {
    return <Navigate to="/modulos" replace />;
  }

  return <>{children}</>;
}

export default ModuleAccessGuard;

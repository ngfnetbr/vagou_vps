// @ts-nocheck
import { useAuth } from "@root/contexts/AuthContext";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useUserPermissions } from "@root/hooks/api/permissoes-hooks";
import { useConfiguracoesPublicas } from "@root/hooks/api/configuracoes-hooks";
import { ModuleAuthLoading } from "@root/components/common/ModuleAuthLoading";

export function ProtectedRoute() {
  const { user, loading, hasRole } = useAuth();
  const { data: userPermissions, isLoading: loadingPermissions } = useUserPermissions();
  const { data: publicConfig, isLoading: loadingConfig } = useConfiguracoesPublicas();
  const location = useLocation();

  if (loading || loadingPermissions || loadingConfig) {
    return (
      <ModuleAuthLoading
        message="Carregando módulo Sondagem..."
        hint="Verificando sua sessão e permissões"
      />
    );
  }

  if (!user) {
    const returnTo = `${location.pathname}${location.search}`;
    return (
      <>
        <ModuleAuthLoading
          message="Sessão necessária"
          hint="Redirecionando para o login..."
        />
        <Navigate to={`/modulo/sondar/login?returnTo=${encodeURIComponent(returnTo)}`} replace />
      </>
    );
  }

  const isResponsavelOnly =
    hasRole("responsavel") &&
    !hasRole("admin") &&
    !hasRole("superadmin") &&
    !hasRole("gestor") &&
    !hasRole("diretor_cmei") &&
    !hasRole("coordenador");
  if (isResponsavelOnly) {
    return <Navigate to="/auth/redirect" replace />;
  }

  const sondagemHabilitada = publicConfig?.habilitar_sondagem ?? true;
  if (!sondagemHabilitada) {
    return <Navigate to="/auth/redirect" replace />;
  }

  const canAccessModule = hasRole("superadmin") || (userPermissions || []).includes("modulos.sondagem.acessar");
  if (!canAccessModule) {
    return <Navigate to="/auth/redirect" replace />;
  }

  return <Outlet />;
}

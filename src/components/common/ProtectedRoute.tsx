import { ReactNode, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { registrarAuditoria } from "@/hooks/api/auditoria-hooks";
import { supabase } from "@/integrations/supabase/client";
import { useUserPermissions } from "@/hooks/api/permissoes-hooks";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { getAccessibleModules } from "@/config/ecosystem-modules";
import { ModuleAuthLoading } from "@/components/common/ModuleAuthLoading";


interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
  requiredRoles?: string[];
  requireAdmin?: boolean;
}


function getSmartRedirectPath(
  roles: string[],
  permissions: string[],
  samEnabled: boolean,
  sondagemEnabled: boolean,
  vagouEnabled: boolean
): string {
  const modules = getAccessibleModules({
    roles,
    permissions,
    samEnabled,
    sondagemEnabled,
    vagouEnabled,
  });

  if (modules.length === 0) return "/modulos";
  if (modules.length === 1) return modules[0].homePath;
  return "/modulos";
}

export default function ProtectedRoute({
  children,
  requiredRole,
  requiredRoles,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const { user, session, isLoading, hasRole, isAdmin, userRoles } = useAuth();
  const { data: userPermissions, isLoading: isLoadingPermissions } = useUserPermissions();
  const { data: config, isLoading: isLoadingConfig } = useConfiguracoesSistema();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isLoadingPermissions && !isLoadingConfig) {
      const path = location.pathname;
      const isAdminPath = path.startsWith("/modulo/vagou/admin");

      const shouldLogOnce = (key: string, ttlMs?: number) => {
        if (typeof window === "undefined") return false;
        const now = Date.now();
        const existing = sessionStorage.getItem(key);
        if (!existing) {
          sessionStorage.setItem(key, String(now));
          return true;
        }
        if (ttlMs) {
          const last = Number(existing);
          if (!Number.isNaN(last) && now - last >= ttlMs) {
            sessionStorage.setItem(key, String(now));
            return true;
          }
        }
        return false;
      };

      const logAttemptWithoutAuth = () => {
        if (!isAdminPath) return;
        if (!shouldLogOnce(`vagou_admin_attempt_${path}`, 5 * 60 * 1000)) return;
        void supabase.functions
          .invoke("registrar-acesso-admin", { body: { path, motivo: "sem_auth" } })
          .catch(() => {});
      };

      const logDenied = (motivo: string) => {
        if (!isAdminPath) return;
        if (!user) return;
        const tokenPrefix = session?.access_token?.slice(0, 16) || "no_token";
        if (!shouldLogOnce(`vagou_admin_denied_${user.id}_${tokenPrefix}_${motivo}`, 60 * 1000)) return;
        void registrarAuditoria({
          tabela: "painel_admin",
          operacao: "acesso_negado",
          dados_novos: {
            path,
            motivo,
            roles: userRoles,
          },
        }).catch(() => {});
      };

      const logAllowed = () => {
        if (!isAdminPath) return;
        if (!user) return;
        const tokenPrefix = session?.access_token?.slice(0, 16) || "no_token";
        if (!shouldLogOnce(`vagou_admin_access_${user.id}_${tokenPrefix}`)) return;
        void registrarAuditoria({
          tabela: "painel_admin",
          operacao: "acesso",
          dados_novos: {
            path,
            roles: userRoles,
          },
        }).catch(() => {});
      };

      if (!user) {
        logAttemptWithoutAuth();
        navigate("/auth/login", { replace: true });
        return;
      }

      const canAccessVagou = hasRole("superadmin") || (userPermissions || []).includes("modulos.vagou.acessar");
      if (!canAccessVagou) {
        logDenied("no_module_vagou");
        navigate("/auth/redirect", { replace: true });
        return;
      }

      if (requireAdmin && !isAdmin()) {
        logDenied("requireAdmin");
        navigate("/modulo/vagou/publico", { replace: true });
        return;
      }

      const fallbackPath = getSmartRedirectPath(
        userRoles,
        userPermissions || [],
        !!config?.habilitar_sam,
        !!config?.habilitar_sondagem,
        config?.habilitar_vagou ?? true
      );

      if (requiredRole && !hasRole(requiredRole)) {
        logDenied(`requiredRole:${requiredRole}`);
        navigate(fallbackPath, { replace: true });
        return;
      }

      if (requiredRoles && !requiredRoles.some((role) => hasRole(role))) {
        logDenied(`requiredRoles:${requiredRoles.join(",")}`);
        navigate(fallbackPath, { replace: true });
        return;
      }

      logAllowed();
    }
  }, [
    user,
    session,
    userRoles,
    isLoading,
    isLoadingPermissions,
    isLoadingConfig,
    userPermissions,
    config,
    requiredRole,
    requiredRoles,
    requireAdmin,
    navigate,
    location.pathname,
    hasRole,
    isAdmin,
  ]);

  if (isLoading || isLoadingPermissions || isLoadingConfig) {
    return <ModuleAuthLoading message="Carregando painel..." hint="Verificando sua sessão e permissões." />;
  }

  if (!user) {
    return (
      <ModuleAuthLoading
        message="Sessão necessária"
        hint="Redirecionando para o login..."
      />
    );
  }

  const canAccessVagou = hasRole("superadmin") || (userPermissions || []).includes("modulos.vagou.acessar");
  if (!canAccessVagou) {
    return <ModuleAuthLoading message="Acesso restrito" hint="Redirecionando para uma área disponível..." />;
  }

  if (requireAdmin && !isAdmin()) {
    return <ModuleAuthLoading message="Acesso restrito" hint="Esta área exige permissão de administrador." />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <ModuleAuthLoading message="Acesso restrito" hint="Você não tem permissão para esta área." />;
  }

  if (requiredRoles && !requiredRoles.some((role) => hasRole(role))) {
    return <ModuleAuthLoading message="Acesso restrito" hint="Você não tem permissão para esta área." />;
  }

  return <>{children}</>;
}

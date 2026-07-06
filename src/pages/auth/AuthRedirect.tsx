import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { RoleSelectionDialog } from "@/components/auth/RoleSelectionDialog";
import { registrarAuditoria } from "@/hooks/api/auditoria-hooks";
import { useUserPermissions } from "@/hooks/api/permissoes-hooks";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import { getAccessibleModules } from "@/config/ecosystem-modules";

const STAFF_ADMIN_ROLES = ["admin", "superadmin", "gestor"];
const DIRETOR_ROLE = "diretor_cmei";
const PORTAL_ESCOLA_ROLE = "school_coord";
const COORDENADOR_ROLE = "coordenador";
const RETURN_TO_STORAGE_KEY = "vagou_return_to";

function sanitizeReturnTo(value: string | null): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v.startsWith("/")) return null;
  if (v.startsWith("//")) return null;
  if (v.includes("://")) return null;
  if (!v.startsWith("/modulo/")) return null;
  if (/^\/modulo\/[^/]+\/login(\/|$)/.test(v)) return null;
  return v;
}

function PageSpinner() {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className="h-9 w-9 rounded-full border-b-2 border-primary animate-spin"
    />
  );
}

export default function AuthRedirect() {
  const { user, session, userRoles, userProfile, isLoading } = useAuth();
  const { data: userPermissions, isLoading: isLoadingPermissions } = useUserPermissions();
  const { data: publicConfig, isLoading: isLoadingPublicConfig } = useConfiguracoesPublicas();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showDialog, setShowDialog] = useState(false);
  const [hasAttemptedRedirect, setHasAttemptedRedirect] = useState(false);

  useEffect(() => {
    // Aguarda carregamento completo
    if (isLoading || isLoadingPermissions || isLoadingPublicConfig) return;

    // Se não está logado, volta para login
    if (!user) {
      navigate("/auth/login", { replace: true });
      return;
    }

    const logLoginSuccess = (destino: string) => {
      const tokenPrefix = session?.access_token?.slice(0, 16) || "no_token";
      const key = `vagou_login_success_${user.id}_${tokenPrefix}`;
      if (typeof window !== "undefined" && sessionStorage.getItem(key)) return;
      if (typeof window !== "undefined") sessionStorage.setItem(key, String(Date.now()));
      void registrarAuditoria({
        tabela: "auth",
        operacao: "login_sucesso",
        dados_novos: {
          destino,
          roles: userRoles,
        },
      }).catch(() => {});
    };

    // Aguarda até ter pelo menos userProfile carregado (com ou sem CPF)
    // para evitar redirect prematuro
    if (userProfile === null && !hasAttemptedRedirect) {
      // Espera um pouco mais para os dados carregarem
      const timeout = setTimeout(() => {
        setHasAttemptedRedirect(true);
      }, 500);
      return () => clearTimeout(timeout);
    }

    // Verifica roles - se ainda não carregou, aguarda
    if (userRoles.length === 0 && !hasAttemptedRedirect) {
      const timeout = setTimeout(() => {
        setHasAttemptedRedirect(true);
      }, 500);
      return () => clearTimeout(timeout);
    }

    const returnToFromQuery = sanitizeReturnTo(searchParams.get("returnTo"));
    const returnToStored = sanitizeReturnTo(sessionStorage.getItem(RETURN_TO_STORAGE_KEY));
    const effectiveReturnTo = returnToFromQuery || returnToStored;

    const permissions = userPermissions || [];
    const samHabilitado = publicConfig?.habilitar_sam ?? true;
    const sondagemHabilitada = publicConfig?.habilitar_sondagem ?? true;
    const hasCoordenadorRole = userRoles.includes(COORDENADOR_ROLE);
    const hasStaffAdminRole = userRoles.some((r) => STAFF_ADMIN_ROLES.includes(r));
    const hasDiretorRole = userRoles.includes(DIRETOR_ROLE);
    const hasPortalEscolaRole = userRoles.includes(PORTAL_ESCOLA_ROLE);
    const hasResponsavelRole = userRoles.includes("responsavel");
    const isResponsavelOnly =
      userRoles.includes("responsavel") &&
      !userRoles.includes("admin") &&
      !userRoles.includes("superadmin") &&
      !userRoles.includes("gestor") &&
      !userRoles.includes(DIRETOR_ROLE) &&
      !userRoles.includes(PORTAL_ESCOLA_ROLE) &&
      !hasCoordenadorRole;

    // CPF é obrigatório apenas para responsável "puro"
    if (isResponsavelOnly && !userProfile?.cpf) {
      navigate("/auth/completar-cadastro", { replace: true });
      return;
    }
    const canAccessSam =
      !isResponsavelOnly &&
      (userRoles.includes("superadmin") || (samHabilitado && permissions.includes("modulos.sam.acessar")));
    const canAccessSondagem =
      !isResponsavelOnly &&
      (userRoles.includes("superadmin") || (sondagemHabilitada && permissions.includes("modulos.sondagem.acessar")));
    const canAccessVagou = userRoles.includes("superadmin") || permissions.includes("modulos.vagou.acessar");

    if (effectiveReturnTo) {
      const isSam = effectiveReturnTo.startsWith("/modulo/sam");
      const isSondagem = effectiveReturnTo.startsWith("/modulo/sondar");
      const allowed =
        (isSam && canAccessSam) ||
        (isSondagem && canAccessSondagem);

      sessionStorage.removeItem(RETURN_TO_STORAGE_KEY);
      if (allowed) {
        logLoginSuccess(effectiveReturnTo);
        navigate(effectiveReturnTo, { replace: true });
        return;
      }
    }

    // Superadmin cai direto no console (a menos que tenha deep link válido tratado acima)
    if (userRoles.includes("superadmin")) {
      logLoginSuccess("/superadmin");
      navigate("/superadmin", { replace: true });
      return;
    }

    // Múltiplos módulos acessíveis e sem preferência salva → mostra seletor
    const accessibleModules = getAccessibleModules({
      roles: userRoles,
      permissions,
      samEnabled: samHabilitado,
      sondagemEnabled: sondagemHabilitada,
    });
    const hasSavedPreference =
      !!localStorage.getItem("vagou_preferred_area") ||
      !!localStorage.getItem("vagou_preferred_module");
    if (accessibleModules.length > 1 && !hasSavedPreference) {
      logLoginSuccess("/modulos");
      navigate("/modulos", { replace: true });
      return;
    }


    if (!canAccessVagou && (canAccessSam || canAccessSondagem)) {
      const preferredModule = localStorage.getItem("vagou_preferred_module");
      const target = hasPortalEscolaRole && canAccessSam
        ? "/modulo/sam/escola/dashboard"
        :
        preferredModule === "sondagem" && canAccessSondagem
          ? "/modulo/sondar"
          : canAccessSam
            ? "/modulo/sam"
            : "/modulo/sondar";

      logLoginSuccess(target);
      navigate(target, { replace: true });
      return;
    }

    const isSondagemCoordinator = hasCoordenadorRole;

    // Verifica preferência salva
    const preferredArea = localStorage.getItem("vagou_preferred_area");
    if (preferredArea) {
      if (preferredArea === "admin" && hasStaffAdminRole) {
        logLoginSuccess("/modulo/vagou/admin");
        navigate("/modulo/vagou/admin", { replace: true });
        return;
      }
      if (preferredArea === "responsavel" && hasResponsavelRole) {
        logLoginSuccess("/modulo/vagou/responsavel");
        navigate("/modulo/vagou/responsavel", { replace: true });
        return;
      }
      if (preferredArea === "admin" && hasDiretorRole && !hasStaffAdminRole && userRoles.length > 0) {
        localStorage.removeItem("vagou_preferred_area");
      }
      // Preferência inválida, limpa APENAS se tivermos certeza das roles (roles carregadas)
      // Evita limpar se houver delay no carregamento das roles
      if (userRoles.length > 0) {
        localStorage.removeItem("vagou_preferred_area");
      }
    }

    // Se tem ambas as roles, mostra dialog
    if (hasStaffAdminRole && hasResponsavelRole) {
      setShowDialog(true);
      return;
    }

    // Se tem role admin (staff)
    if (hasStaffAdminRole) {
      logLoginSuccess("/modulo/vagou/admin");
      navigate("/modulo/vagou/admin", { replace: true });
      return;
    }

    // Se só tem role diretor
    if (hasDiretorRole) {
      logLoginSuccess("/modulo/vagou/admin/diretor");
      navigate("/modulo/vagou/admin/diretor", { replace: true });
      return;
    }

    if (hasPortalEscolaRole) {
      const target = canAccessSam ? "/modulo/sam/escola/dashboard" : "/modulo/vagou/publico";
      logLoginSuccess(target);
      navigate(target, { replace: true });
      return;
    }

    if (isSondagemCoordinator) {
      const target = canAccessSondagem ? "/modulo/sondar" : "/modulo/vagou/publico";
      logLoginSuccess(target);
      navigate(target, { replace: true });
      return;
    }

    // Se só tem role responsável
    if (hasResponsavelRole) {
      logLoginSuccess("/modulo/vagou/responsavel");
      navigate("/modulo/vagou/responsavel", { replace: true });
      return;
    }

    // Sem role definida, vai para público
    logLoginSuccess("/modulo/vagou/publico");
    navigate("/modulo/vagou/publico", { replace: true });
  }, [
    user,
    session,
    userRoles,
    userProfile,
    userPermissions,
    isLoading,
    isLoadingPermissions,
    isLoadingPublicConfig,
    publicConfig,
    navigate,
    hasAttemptedRedirect,
    searchParams,
  ]);

  if (isLoading || isLoadingPermissions || isLoadingPublicConfig) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <PageSpinner />
        <p className="text-muted-foreground">Verificando suas permissões...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <PageSpinner />
      <p className="text-muted-foreground">Redirecionando...</p>
      
      <RoleSelectionDialog open={showDialog} onOpenChange={setShowDialog} />
    </div>
  );
}

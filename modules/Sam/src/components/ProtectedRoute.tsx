// @ts-nocheck
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "@root/contexts/AuthContext"
import { useUserPermissions } from "@root/hooks/api/permissoes-hooks"
import { useConfiguracoesPublicas } from "@root/hooks/api/configuracoes-hooks"
import { ModuleAuthLoading } from "@root/components/common/ModuleAuthLoading"

export function ProtectedRoute() {
  const { user, profile, loading, hasRole } = useAuth()
  const { data: userPermissions, isLoading: loadingPermissions } = useUserPermissions()
  const { data: publicConfig, isLoading: loadingConfig } = useConfiguracoesPublicas()
  const location = useLocation()

  if (loading || loadingPermissions || loadingConfig) {
    return (
      <ModuleAuthLoading
        message="Carregando módulo SAM..."
        hint="Verificando sua sessão e permissões"
      />
    )
  }

  if (!user) {
    const returnTo = `${location.pathname}${location.search}`
    return (
      <>
        <ModuleAuthLoading
          message="Sessão necessária"
          hint="Redirecionando para o login..."
        />
        <Navigate to={`/modulo/sam/login?returnTo=${encodeURIComponent(returnTo)}`} replace />
      </>
    )
  }

  const isResponsavelOnly =
    hasRole("responsavel") &&
    !hasRole("admin") &&
    !hasRole("superadmin") &&
    !hasRole("gestor") &&
    !hasRole("diretor_cmei")
  if (isResponsavelOnly) {
    return <Navigate to="/auth/redirect" replace />
  }

  const samHabilitado = publicConfig?.habilitar_sam ?? true
  if (!samHabilitado) {
    return <Navigate to="/auth/redirect" replace />
  }

  const canAccessModule = hasRole("superadmin") || (userPermissions || []).includes("modulos.sam.acessar")
  if (!canAccessModule) {
    return <Navigate to="/auth/redirect" replace />
  }

  // School coordinators should use school layout
  if (profile?.role === "school_coord") {
    return <Navigate to="/modulo/sam/escola/dashboard" replace />
  }

  return <Outlet />
}

export function SchoolProtectedRoute() {
  const { user, profile, loading, hasRole } = useAuth()
  const { data: userPermissions, isLoading: loadingPermissions } = useUserPermissions()
  const { data: publicConfig, isLoading: loadingConfig } = useConfiguracoesPublicas()
  const location = useLocation()

  if (loading || loadingPermissions || loadingConfig) {
    return (
      <ModuleAuthLoading
        message="Carregando painel da escola..."
        hint="Verificando sua sessão e permissões"
      />
    )
  }

  if (!user) {
    const returnTo = `${location.pathname}${location.search}`
    return (
      <>
        <ModuleAuthLoading
          message="Sessão necessária"
          hint="Redirecionando para o login..."
        />
        <Navigate to={`/modulo/sam/login/escola?returnTo=${encodeURIComponent(returnTo)}`} replace />
      </>
    )
  }

  const isResponsavelOnly =
    hasRole("responsavel") &&
    !hasRole("admin") &&
    !hasRole("superadmin") &&
    !hasRole("gestor") &&
    !hasRole("diretor_cmei")
  if (isResponsavelOnly) {
    return <Navigate to="/auth/redirect" replace />
  }

  const samHabilitado = publicConfig?.habilitar_sam ?? true
  if (!samHabilitado) {
    return <Navigate to="/auth/redirect" replace />
  }

  const canAccessModule = hasRole("superadmin") || (userPermissions || []).includes("modulos.sam.acessar")
  if (!canAccessModule) {
    return <Navigate to="/auth/redirect" replace />
  }

  if (profile?.role !== "school_coord") {
    return <Navigate to="/modulo/sam/dashboard" replace />
  }

  return <Outlet />
}

import { ReactNode } from "react";
import { useUserPermissions } from "@/hooks/api/permissoes-hooks";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldOff } from "lucide-react";

interface PermissionGateProps {
  permission: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
  showAlert?: boolean;
}

/**
 * Component that conditionally renders children based on user permissions.
 * 
 * @param permission - Single permission code or array of codes (any match grants access)
 * @param children - Content to render if user has permission
 * @param fallback - Optional content to render if user lacks permission
 * @param showAlert - Whether to show an access denied alert (default: false)
 */
export function PermissionGate({ 
  permission, 
  children, 
  fallback = null,
  showAlert = false 
}: PermissionGateProps) {
  const { hasRole } = useAuth();
  const { data: userPermissions, isLoading } = useUserPermissions();
  
  // Superadmin bypasses all permission checks
  const isSuperAdmin = hasRole("superadmin");
  
  if (isLoading) {
    return null;
  }

  const permissions = Array.isArray(permission) ? permission : [permission];
  const hasPermission = isSuperAdmin || permissions.some(p => userPermissions?.includes(p));

  if (hasPermission) {
    return <>{children}</>;
  }

  if (showAlert) {
    return (
      <Alert variant="destructive" className="max-w-md">
        <ShieldOff className="h-4 w-4" />
        <AlertTitle>Acesso Negado</AlertTitle>
        <AlertDescription>
          Você não tem permissão para realizar esta ação.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{fallback}</>;
}

/**
 * Hook to check if user has a specific permission
 */
export function useCanAccess(permission: string | string[]): boolean {
  const { hasRole } = useAuth();
  const { data: userPermissions } = useUserPermissions();
  
  const isSuperAdmin = hasRole("superadmin");
  if (isSuperAdmin) return true;
  
  const permissions = Array.isArray(permission) ? permission : [permission];
  return permissions.some(p => userPermissions?.includes(p));
}

// Permission codes exported for convenience
export const PERMISSIONS = {
  // Crianças
  CRIANCAS_VISUALIZAR: "criancas.visualizar",
  CRIANCAS_CRIAR: "criancas.criar",
  CRIANCAS_EDITAR: "criancas.editar",
  CRIANCAS_EXCLUIR: "criancas.excluir",
  
  // Fila
  FILA_VISUALIZAR: "fila.visualizar",
  FILA_GERENCIAR: "fila.gerenciar",
  FILA_CONVOCAR: "fila.convocar",
  
  // Matrículas
  MATRICULAS_VISUALIZAR: "matriculas.visualizar",
  MATRICULAS_CONFIRMAR: "matriculas.confirmar",
  MATRICULAS_CANCELAR: "matriculas.cancelar",
  MATRICULAS_REALOCAR: "matriculas.realocar",
  
  // CMEIs
  CMEIS_VISUALIZAR: "cmeis.visualizar",
  CMEIS_CRIAR: "cmeis.criar",
  CMEIS_EDITAR: "cmeis.editar",
  CMEIS_EXCLUIR: "cmeis.excluir",
  
  // Turmas
  TURMAS_VISUALIZAR: "turmas.visualizar",
  TURMAS_CRIAR: "turmas.criar",
  TURMAS_EDITAR: "turmas.editar",
  TURMAS_EXCLUIR: "turmas.excluir",
  
  // Usuários
  USUARIOS_VISUALIZAR: "usuarios.visualizar",
  USUARIOS_CRIAR: "usuarios.criar",
  USUARIOS_EDITAR: "usuarios.editar",
  USUARIOS_DESATIVAR: "usuarios.desativar",
  USUARIOS_ROLES: "usuarios.roles",
  
  // Relatórios
  RELATORIOS_VISUALIZAR: "relatorios.visualizar",
  RELATORIOS_EXPORTAR: "relatorios.exportar",
  
  // Configurações
  CONFIGURACOES_VISUALIZAR: "configuracoes.visualizar",
  CONFIGURACOES_EDITAR: "configuracoes.editar",
  
  // Documentos
  DOCUMENTOS_VISUALIZAR: "documentos.visualizar",
  DOCUMENTOS_APROVAR: "documentos.aprovar",
  
  // Auditoria
  AUDITORIA_VISUALIZAR: "auditoria.visualizar",
  
  // Remanejamentos
  REMANEJAMENTO_VISUALIZAR: "remanejamento.visualizar",
  REMANEJAMENTO_APROVAR: "remanejamento.aprovar",
  REMANEJAMENTO_RECUSAR: "remanejamento.recusar",
} as const;


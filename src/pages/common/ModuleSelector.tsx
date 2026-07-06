import { useEffect, useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions } from "@/hooks/api/permissoes-hooks";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import { getAccessibleModules } from "@/config/ecosystem-modules";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/common/BrandLogo";


function PageSpinner() {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className="h-9 w-9 rounded-full border-b-2 border-primary animate-spin"
    />
  );
}

export default function ModuleSelector() {
  const { user, userRoles, isLoading } = useAuth();
  const { data: userPermissions, isLoading: isLoadingPermissions } = useUserPermissions();
  const { data: publicConfig, isLoading: isLoadingPublicConfig } = useConfiguracoesPublicas();
  const navigate = useNavigate();

  const loading = isLoading || isLoadingPermissions || isLoadingPublicConfig;

  const modules = useMemo(() => {
    if (loading) return [];
    return getAccessibleModules({
      roles: userRoles,
      permissions: userPermissions || [],
      samEnabled: publicConfig?.habilitar_sam ?? true,
      sondagemEnabled: publicConfig?.habilitar_sondagem ?? true,
    });
  }, [loading, userRoles, userPermissions, publicConfig]);

  if (!isLoading && !user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <PageSpinner />
        <p className="text-muted-foreground">Carregando módulos...</p>
      </div>
    );
  }

  // Nenhum módulo acessível
  if (modules.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold">Nenhum módulo disponível</h1>
        <p className="text-muted-foreground max-w-md">
          Sua conta ainda não tem acesso a nenhum módulo do ecossistema. Solicite acesso ao
          administrador do município.
        </p>
      </div>
    );
  }

  // Apenas um módulo: entra direto
  if (modules.length === 1) {
    return <Navigate to={modules[0].homePath} replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8 flex flex-col items-center animate-fade-in">
          <span className="group inline-flex cursor-default rounded-xl p-1 transition-transform duration-300 hover:scale-105">
            <BrandLogo
              name="same"
              className="h-11 md:h-12 text-primary transition-all duration-300 group-hover:drop-shadow-[0_4px_16px_hsl(var(--primary)/0.45)]"
              title="e-SAM"
            />
          </span>
          <p className="mt-2 text-xs md:text-sm text-muted-foreground">
            Sistema de Apoio Multidisciplinar Educacional
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary shadow-sm">
            Escolha o módulo que deseja acessar
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod, index) => {
            return (
              <Card
                key={mod.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(mod.homePath)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(mod.homePath);
                  }
                }}
                style={{ animationDelay: `${index * 90}ms` }}
                className="group relative flex cursor-pointer flex-col items-center overflow-hidden border bg-card p-5 text-center transition-all duration-300 animate-fade-in hover:shadow-xl hover:-translate-y-1.5 hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <span className="pointer-events-none absolute inset-0 -translate-y-full bg-gradient-to-b from-primary/5 to-transparent transition-transform duration-500 group-hover:translate-y-0" />
                <div className="relative mb-2 flex h-10 w-full items-center justify-center px-4 gap-2">
                  <BrandLogo
                    name={mod.logo}
                    className="h-6 text-primary transition-transform duration-300 group-hover:scale-105"
                    title={mod.name}
                  />
                  {mod.beta && (
                    <Badge variant="info" className="text-[10px] px-1.5 py-0">
                      BETA
                    </Badge>
                  )}
                </div>
                <p className="relative text-xs text-muted-foreground">{mod.description}</p>
              </Card>
            );
          })}
        </div>


      </div>
    </div>
  );
}

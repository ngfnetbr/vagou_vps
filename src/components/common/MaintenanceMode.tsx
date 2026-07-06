import { AlertTriangle, Wrench, Phone, Mail, RotateCcw } from "lucide-react";
import { Spinner } from "@/components/common/Spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";

interface MaintenanceModeProps {
  children: React.ReactNode;
}

export const MaintenanceMode = ({ children }: MaintenanceModeProps) => {
  const { data: config, isLoading } = useConfiguracoesPublicas();

  // Show loading while checking maintenance status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // If not in maintenance mode, render children normally
  if (!config?.modo_manutencao) {
    return <>{children}</>;
  }

  // Maintenance mode screen
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background via-muted/40 to-background p-4">
      <Card className="max-w-xl w-full shadow-xl border-warning/60 rounded-2xl">
        <CardContent className="pt-10 pb-8 text-center space-y-6">
          <div className="mx-auto flex items-center justify-center w-20 h-20 rounded-2xl bg-warning/10 border border-warning/30">
            <Wrench className="h-10 w-10 text-warning" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Sistema em manutenção
            </h1>
            <div className="flex items-center justify-center gap-2 text-warning">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Indisponível temporariamente</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              {config?.mensagem_manutencao || "Estamos aplicando melhorias e ajustes de estabilidade. Volte em alguns minutos."}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </div>

          {/* Contact info if available */}
          {(config?.telefone_contato || config?.email_contato) && (
            <div className="border-t pt-4 mt-4 space-y-3 rounded-xl">
              <p className="text-sm text-muted-foreground mb-3">
                Em caso de urgência, entre em contato:
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {config?.telefone_contato && (
                  <a 
                    href={`tel:${config.telefone_contato}`}
                    className="inline-flex items-center justify-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    {config.telefone_contato}
                  </a>
                )}
                {config?.email_contato && (
                  <a 
                    href={`mailto:${config.email_contato}`}
                    className="inline-flex items-center justify-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Mail className="h-4 w-4" />
                    {config.email_contato}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Municipality branding */}
          <div className="mt-6 pt-4 border-t rounded-xl">
            <div className="flex items-center justify-center gap-3">
              {config?.brasao_url && (
                <img 
                  src={config.brasao_url} 
                  alt="Brasão" 
                  className="h-10 w-10 object-contain"
                />
              )}
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">
                  {config?.nome_municipio || "Município"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {config?.nome_secretaria || "Secretaria de Educação"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


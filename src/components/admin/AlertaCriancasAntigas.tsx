import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, differenceInMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Clock, ArrowRight, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

export function AlertaCriancasAntigas() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: criancasAntigas, isLoading } = useQuery({
    queryKey: ["criancas-antigas-6-meses"],
    queryFn: async () => {
      const seisMesesAtras = new Date();
      seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

      const { data, error } = await supabase
        .from("criancas")
        .select("id, nome, created_at, data_nascimento, programas_sociais")
        .eq("status", "Fila de Espera")
        .lte("created_at", seisMesesAtras.toISOString())
        .order("created_at", { ascending: true })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const total = criancasAntigas?.length || 0;

  if (isLoading || total === 0) return null;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base text-amber-800 dark:text-amber-200">
                  Crianças aguardando há mais de 6 meses
                </CardTitle>
                <CardDescription className="text-amber-700 dark:text-amber-300">
                  {total} criança(s) com espera prolongada na fila
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link to="/modulo/vagou/admin/fila">
                <Button variant="outline" size="sm" className="border-amber-400 text-amber-700 hover:bg-amber-100">
                  Ver Fila
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                  aria-label={isExpanded ? "Minimizar alerta" : "Expandir alerta"}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="space-y-2">
              {criancasAntigas?.slice(0, 5).map((crianca) => {
                const diasNaFila = differenceInDays(new Date(), new Date(crianca.created_at!));
                const mesesNaFila = differenceInMonths(new Date(), new Date(crianca.created_at!));

                return (
                  <div
                    key={crianca.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-background rounded-lg border border-amber-200 dark:border-amber-800"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{crianca.nome}</span>
                        {crianca.programas_sociais && (
                          <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-xs">
                            Prioridade
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Inscrito em {format(new Date(crianca.created_at!), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-red-300 text-red-600 dark:border-red-700 dark:text-red-400">
                        <Clock className="mr-1 h-3 w-3" />
                        {mesesNaFila} meses ({diasNaFila} dias)
                      </Badge>
                    </div>
                  </div>
                );
              })}
              {total > 5 && (
                <p className="text-sm text-amber-700 dark:text-amber-300 text-center pt-2">
                  E mais {total - 5} criança(s)...
                </p>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

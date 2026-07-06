import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@/components/common/Spinner";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Clock, FileCheck, XCircle, ArrowRightLeft, Bell, User, Send } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/utils/utils";
import { getAcaoLabel } from "@/utils/historico-utils";
import { fixMojibake } from "@/utils/encoding-fix";

interface StatusTimelineProps {
  criancaId: string;
  maxItems?: number;
}

interface HistoricoItem {
  id: string;
  acao: string;
  descricao: string | null;
  status_anterior: string | null;
  status_novo: string | null;
  created_at: string;
  justificativa: string | null;
}

const getAcaoConfig = (acao: string) => {
  const normalized = fixMojibake(acao) ?? acao;
  const acaoLower = normalized.toLowerCase();
  
  // Notificações
  if (acaoLower.includes("notificacao") || acaoLower.includes("notificação") || acaoLower.includes("reenvio") || acaoLower.includes("lembrete")) {
    return { icon: Send, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" };
  }
  
  const configs: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
    "Inscrição Realizada": { icon: FileCheck, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
    "Convocação": { icon: Bell, color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-900/30" },
    "Convocado": { icon: Bell, color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-900/30" },
    "Convocação para Matrícula": { icon: Bell, color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-900/30" },
    "Matrícula Confirmada": { icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
    "Matriculado": { icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
    "Solicitação de Remanejamento": { icon: ArrowRightLeft, color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
    "Remanejamento Solicitado": { icon: ArrowRightLeft, color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
    "Transferência Efetivada": { icon: ArrowRightLeft, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
    "Remanejamento Cancelado": { icon: XCircle, color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
    "Convocação Recusada": { icon: XCircle, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
    "Marcado como Desistente": { icon: XCircle, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
    "Criança Reativada": { icon: CheckCircle2, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
    "Prazo de Convocação Expirado": { icon: Clock, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
  };

  return configs[normalized] || { icon: User, color: "text-gray-600", bgColor: "bg-gray-100 dark:bg-gray-800" };
};

export function StatusTimeline({ criancaId, maxItems = 10 }: StatusTimelineProps) {
  const { data: historico, isLoading } = useQuery({
    queryKey: ["historico-timeline", criancaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico")
        .select("id, acao, descricao, status_anterior, status_novo, created_at, justificativa")
        .eq("crianca_id", criancaId)
        .order("created_at", { ascending: false })
        .limit(maxItems);

      if (error) throw error;
      return data as HistoricoItem[];
    },
    enabled: !!criancaId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!historico || historico.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Nenhum evento registrado ainda.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Linha vertical */}
      <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-border" />

      <div className="space-y-4">
        {historico.map((item, index) => {
          const config = getAcaoConfig(item.acao);
          const Icon = config.icon;
          const isFirst = index === 0;

          return (
            <div key={item.id} className="relative flex gap-4">
              {/* Ícone */}
              <div
                className={cn(
                  "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-background",
                  config.bgColor,
                  isFirst && "ring-2 ring-primary ring-offset-2"
                )}
              >
                <Icon className={cn("h-5 w-5", config.color)} />
              </div>

              {/* Conteúdo */}
              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className={cn("font-medium", isFirst && "text-primary")}>
                      {getAcaoLabel(item.acao)}
                    </p>
                    {item.descricao && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {item.descricao}
                      </p>
                    )}
                    {item.justificativa && (
                      <p className="text-sm text-muted-foreground mt-1 italic">
                        Motivo: {item.justificativa}
                      </p>
                    )}
                    {item.status_anterior && item.status_novo && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.status_anterior} → {item.status_novo}
                      </p>
                    )}
                  </div>
                  <time className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </time>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


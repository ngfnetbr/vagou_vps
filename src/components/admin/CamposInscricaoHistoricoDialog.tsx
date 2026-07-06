import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCamposInscricaoHistorico, OPERACOES_HISTORICO, CampoInscricao } from "@/hooks/api/campos-inscricao-hooks";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { History, Plus, Edit, Trash2, ArrowRight } from "lucide-react";

interface CamposInscricaoHistoricoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campo?: CampoInscricao | null;
}

export const CamposInscricaoHistoricoDialog = ({
  open,
  onOpenChange,
  campo,
}: CamposInscricaoHistoricoDialogProps) => {
  const { data: historico, isLoading } = useCamposInscricaoHistorico(campo?.id);

  const getOperacaoIcon = (operacao: string) => {
    switch (operacao) {
      case "INSERT": return <Plus className="h-4 w-4 text-green-500" />;
      case "UPDATE": return <Edit className="h-4 w-4 text-blue-500" />;
      case "DELETE": return <Trash2 className="h-4 w-4 text-destructive" />;
      default: return <History className="h-4 w-4" />;
    }
  };

  const getOperacaoColor = (operacao: string) => {
    switch (operacao) {
      case "INSERT": return "bg-green-500/10 text-green-700 border-green-500/20";
      case "UPDATE": return "bg-blue-500/10 text-blue-700 border-blue-500/20";
      case "DELETE": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "";
    }
  };

  const formatChanges = (dados_anteriores: Record<string, any> | null, dados_novos: Record<string, any> | null) => {
    if (!dados_anteriores && dados_novos) {
      return <span className="text-muted-foreground text-xs">Campo criado: {dados_novos.label}</span>;
    }
    
    if (dados_anteriores && !dados_novos) {
      return <span className="text-muted-foreground text-xs">Campo excluído: {dados_anteriores.label}</span>;
    }

    if (dados_anteriores && dados_novos) {
      const changes: string[] = [];
      const keysToCheck = ['label', 'tipo', 'obrigatorio', 'ativo', 'placeholder', 'ordem', 'visivel_responsavel', 'editavel_apos_inscricao'];
      
      for (const key of keysToCheck) {
        if (JSON.stringify(dados_anteriores[key]) !== JSON.stringify(dados_novos[key])) {
          const labelMap: Record<string, string> = {
            label: 'Rótulo',
            tipo: 'Tipo',
            obrigatorio: 'Obrigatório',
            ativo: 'Ativo',
            placeholder: 'Placeholder',
            ordem: 'Ordem',
            visivel_responsavel: 'Visível ao responsável',
            editavel_apos_inscricao: 'Editável após inscrição',
          };
          changes.push(labelMap[key] || key);
        }
      }

      if (changes.length === 0) {
        return <span className="text-muted-foreground text-xs">Alterações menores</span>;
      }

      return (
        <span className="text-muted-foreground text-xs">
          Alterado: {changes.join(", ")}
        </span>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Alterações
          </DialogTitle>
          <DialogDescription>
            {campo 
              ? `Histórico do campo "${campo.label}"`
              : "Histórico de todas as alterações nos campos de inscrição"
            }
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : historico && historico.length > 0 ? (
            <div className="space-y-3">
              {historico.map((item) => (
                <div
                  key={item.id}
                  className="p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      {getOperacaoIcon(item.operacao)}
                      <Badge variant="outline" className={getOperacaoColor(item.operacao)}>
                        {OPERACOES_HISTORICO[item.operacao as keyof typeof OPERACOES_HISTORICO] || item.operacao}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  
                  <div className="mt-2">
                    {formatChanges(item.dados_anteriores, item.dados_novos)}
                  </div>

                  {item.operacao === "UPDATE" && item.dados_anteriores && item.dados_novos && (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-destructive/5 border border-destructive/10">
                        <span className="font-medium text-destructive">Antes:</span>
                        <div className="text-muted-foreground truncate">
                          {item.dados_anteriores.label || "—"}
                        </div>
                      </div>
                      <div className="p-2 rounded bg-green-500/5 border border-green-500/10">
                        <span className="font-medium text-green-700">Depois:</span>
                        <div className="text-muted-foreground truncate">
                          {item.dados_novos.label || "—"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <History className="h-10 w-10 mb-2 opacity-50" />
              <p>Nenhum histórico encontrado</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};


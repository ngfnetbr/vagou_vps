import { useState, useEffect } from "react";
import { Spinner } from "@/components/common/Spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRightLeft, Info } from "lucide-react";
import { useCMEIs } from "@/hooks/api/supabase-hooks";
import { useSolicitarRemanejamentoResponsavel } from "@/hooks/api/responsavel-hooks";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";

interface SolicitarRemanejamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  crianca: {
    id: string;
    nome: string;
    cmei_atual?: { nome: string };
    cmei_atual_id?: string;
  } | null;
}

export function SolicitarRemanejamentoDialog({
  open,
  onOpenChange,
  crianca,
}: SolicitarRemanejamentoDialogProps) {
  const [cmeiDestinoId, setCmeiDestinoId] = useState<string>("");
  const [justificativa, setJustificativa] = useState("");

  const { data: cmeis } = useCMEIs();
  const { data: config } = useConfiguracoesPublicas();
  const { singular } = getUnidadeLabels(config as any);
  const solicitarMutation = useSolicitarRemanejamentoResponsavel();

  useEffect(() => {
    if (open) {
      setCmeiDestinoId("");
      setJustificativa("");
    }
  }, [open]);

  const handleSolicitar = () => {
    if (!crianca || !cmeiDestinoId || justificativa.trim().length < 20) return;

    solicitarMutation.mutate(
      {
        criancaId: crianca.id,
        cmeiDestinoId,
        justificativa: justificativa.trim(),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  if (!crianca) return null;

  // Filtrar unidades ativas, excluindo a atual
  const cmeisDisponiveis = cmeis?.filter(
    (cmei) => cmei.id !== crianca.cmei_atual_id && cmei.ativo
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Solicitar Remanejamento
          </DialogTitle>
          <DialogDescription>
            Solicite a transferência para outra {singular}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações da Criança */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm">
              <span className="font-medium">Criança:</span> {crianca.nome}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">{singular} Atual:</span>{" "}
              {crianca.cmei_atual?.nome || "Não informado"}
            </p>
          </div>

          <Alert className="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/20">
            <Info className="h-4 w-4 text-purple-600" />
            <AlertDescription className="text-purple-800 dark:text-purple-200">
              <strong>Como funciona:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Você <strong>continua matriculado</strong> na {singular} atual</li>
                <li>Entra na <strong>fila com prioridade máxima</strong> para a {singular} desejada</li>
                <li>Quando surgir vaga, será <strong>convocado automaticamente</strong></li>
                <li>Ao aceitar, a transferência é concluída</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Unidade de Destino */}
          <div className="space-y-2">
            <Label htmlFor="cmei-destino">
              {singular} de Destino <span className="text-destructive">*</span>
            </Label>
            <Select value={cmeiDestinoId} onValueChange={setCmeiDestinoId}>
              <SelectTrigger id="cmei-destino">
                <SelectValue placeholder={`Selecione a ${singular} desejada`} />
              </SelectTrigger>
              <SelectContent>
                {cmeisDisponiveis?.map((cmei) => (
                  <SelectItem key={cmei.id} value={cmei.id}>
                    {cmei.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Justificativa */}
          <div className="space-y-2">
            <Label htmlFor="justificativa">
              Justificativa <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="justificativa"
              placeholder="Explique o motivo da solicitação de transferência (mínimo 20 caracteres)..."
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {justificativa.length}/20 caracteres mínimos
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={solicitarMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSolicitar}
            disabled={
              !cmeiDestinoId ||
              justificativa.trim().length < 20 ||
              solicitarMutation.isPending
            }
          >
            {solicitarMutation.isPending ? (
              <>
                <Spinner className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Enviar Solicitação
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


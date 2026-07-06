import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCMEIs } from "@/hooks/api/supabase-hooks";
import { Info, ArrowRightLeft } from "lucide-react";
import { MotivoSelect } from "./MotivoSelect";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";

interface RemanejamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  crianca: {
    id: string;
    nome: string;
    cmei_atual?: { id: string; nome: string };
    turma_atual?: { id: string; nome: string };
    cmei_remanejamento_id?: string;
    justificativa_remanejamento?: string;
    status: string;
    prioridade?: string;
  } | null;
  onConfirm: (cmeiDestinoId: string, justificativa: string) => void;
  loading?: boolean;
}

export function RemanejamentoDialog({
  open,
  onOpenChange,
  crianca,
  onConfirm,
  loading = false,
}: RemanejamentoDialogProps) {
  const { data: cmeis } = useCMEIs();
  const { data: config } = useConfiguracoesSistema();
  const { singular } = getUnidadeLabels(config as any);
  const [cmeiDestino, setCmeiDestino] = useState<string>("");
  const [justificativa, setJustificativa] = useState("");

  const handleConfirm = () => {
    if (!cmeiDestino || !justificativa.trim()) return;
    onConfirm(cmeiDestino, justificativa);
  };

  const handleClose = () => {
    setCmeiDestino("");
    setJustificativa("");
    onOpenChange(false);
  };

  if (!crianca) return null;

  const cmeisDisponiveis = cmeis?.filter(
    (cmei) => cmei.id !== crianca.cmei_atual?.id && cmei.ativo
  );

  // Criança já tem remanejamento solicitado (está na fila aguardando vaga)
  const hasRemanejamentoPendente = !!crianca.cmei_remanejamento_id;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            {hasRemanejamentoPendente ? "Remanejamento em Andamento" : "Solicitar Remanejamento"}
          </DialogTitle>
          <DialogDescription>
            {hasRemanejamentoPendente
              ? "Esta criança já possui uma solicitação de remanejamento e está aguardando vaga"
              : "A criança entrará na fila de espera com prioridade máxima aguardando vaga na unidade desejada"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações da Criança */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">Criança: {crianca.nome}</p>
            <p className="text-sm text-muted-foreground">
              {singular} Atual: {crianca.cmei_atual?.nome || "Nenhum"}
            </p>
            {crianca.turma_atual?.nome && (
              <p className="text-sm text-muted-foreground">
                Turma Atual: {crianca.turma_atual.nome}
              </p>
            )}
          </div>

          {/* Alerta explicativo */}
          {!hasRemanejamentoPendente && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Como funciona o remanejamento:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>A criança <strong>continua matriculada</strong> na unidade atual</li>
                  <li>Entra na <strong>fila de espera com prioridade máxima</strong></li>
                  <li>Quando surgir vaga na unidade desejada, será <strong>convocada automaticamente</strong></li>
                  <li>Ao aceitar a convocação, a transferência é concluída</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* CMEI de Destino */}
          {!hasRemanejamentoPendente ? (
            <div className="space-y-2">
              <Label htmlFor="cmei-destino">
                {singular} de Destino <span className="text-destructive">*</span>
              </Label>
              <Select value={cmeiDestino} onValueChange={setCmeiDestino}>
                <SelectTrigger id="cmei-destino">
                  <SelectValue placeholder={`Selecione ${singular} de destino`} />
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
          ) : (
            <div className="space-y-2">
              <Label>{singular} de Destino (solicitado)</Label>
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-sm font-medium">
                  {cmeis?.find((c) => c.id === crianca.cmei_remanejamento_id)?.nome ||
                    `${singular} não encontrado`}
                </p>
              </div>
            </div>
          )}

          {/* Justificativa */}
          {!hasRemanejamentoPendente ? (
            <MotivoSelect
              tipo="remanejamento"
              value={justificativa}
              onChange={setJustificativa}
              label="Justificativa"
              placeholder="Descreva o motivo do remanejamento..."
              required
              minLength={20}
              rows={4}
            />
          ) : (
            <div className="space-y-2">
              <Label>Justificativa da Solicitação</Label>
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-sm">{crianca.justificativa_remanejamento || "Sem justificativa"}</p>
              </div>
            </div>
          )}

          {hasRemanejamentoPendente && (
            <Alert className="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/20">
              <ArrowRightLeft className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-800 dark:text-purple-200">
                <strong>Aguardando vaga</strong>
                <p className="text-sm mt-1">
                  A criança está na fila de espera com <strong>prioridade máxima</strong>. 
                  Quando surgir vaga na unidade de destino, ela poderá ser convocada pela página de Fila de Espera.
                </p>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {hasRemanejamentoPendente ? "Fechar" : "Cancelar"}
          </Button>
          {!hasRemanejamentoPendente && (
            <Button
              onClick={handleConfirm}
              disabled={!cmeiDestino || justificativa.trim().length < 20 || loading}
            >
              {loading ? "Processando..." : "Solicitar Remanejamento"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


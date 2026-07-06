import { useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { MotivoSelect } from "./MotivoSelect";

interface DesistenteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  criancaId: string;
  criancaNome: string;
  statusAtual?: string;
}

export function DesistenteDialog({ 
  open, 
  onOpenChange, 
  criancaId, 
  criancaNome,
  statusAtual 
}: DesistenteDialogProps) {
  const [justificativa, setJustificativa] = useState("");
  const queryClient = useQueryClient();

  const marcarDesistente = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("criancas")
        .update({
          status: "Desistente",
          cmei_atual_id: null,
          turma_atual_id: null,
          convocacao_deadline: null,
          data_convocacao: null,
          cmei_remanejamento_id: null,
          justificativa_remanejamento: null,
        })
        .eq("id", criancaId);

      if (error) throw error;

      // Registrar no histórico
      await supabase.from("historico").insert({
        crianca_id: criancaId,
        acao: "Marcado como Desistente",
        status_anterior: statusAtual as any,
        status_novo: "Desistente" as const,
        justificativa: justificativa || "Sem justificativa informada",
        descricao: `Criança marcada como desistente. ${justificativa ? `Motivo: ${justificativa}` : ""}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crianca"] });
      queryClient.invalidateQueries({ queryKey: ["crianca-detalhes"] });
      queryClient.invalidateQueries({ queryKey: ["crianca-matricula-detalhes"] });
      queryClient.invalidateQueries({ queryKey: ["criancas"] });
      queryClient.invalidateQueries({ queryKey: ["matriculas"] });
      toast.success("Criança marcada como desistente com sucesso.");
      setJustificativa("");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao marcar como desistente: " + error.message);
    },
  });

  const handleConfirm = () => {
    marcarDesistente.mutate();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Marcar como Desistente</AlertDialogTitle>
          <AlertDialogDescription>
            Você está prestes a marcar <strong>{criancaNome}</strong> como desistente.
            Esta ação irá remover a criança da vaga atual e liberar a posição.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <MotivoSelect
            tipo="desistencia"
            value={justificativa}
            onChange={setJustificativa}
            label="Motivo da desistência"
            placeholder="Informe o motivo da desistência..."
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={marcarDesistente.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={marcarDesistente.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {marcarDesistente.isPending && (
              <Spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            Confirmar Desistência
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

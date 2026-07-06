import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";

export interface MotivoPadrao {
  id: string;
  tipo: string;
  descricao: string;
  ativo: boolean;
  ordem: number;
  created_at: string;
}

export type TipoMotivo = "desistencia" | "recusa" | "transferencia" | "remanejamento" | "fim_fila";

// Hook para regras de workflow
export const useRegrasWorkflow = () => {
  const { data: config } = useConfiguracoesSistema();

  return {
    // Regras de convocação
    maxTentativasConvocacao: config?.max_tentativas_convocacao ?? 2,
    estrategiaPrazoVencido: config?.estrategia_prazo_vencido ?? "fim_fila",
    intervaloReenvioNotificacao: config?.intervalo_reenvio_notificacao ?? 3,
    usarDiasUteis: config?.usar_dias_uteis ?? false,
    
    // Regras de transferência
    permitirTransferencia: config?.permitir_transferencia ?? true,
    periodoCarenciaTransferencia: config?.periodo_carencia_transferencia ?? 30,
    exigirJustificativaTransferencia: config?.exigir_justificativa_transferencia ?? true,
    aprovarTransferenciaAutomatico: config?.aprovar_transferencia_automatico ?? false,
    
    // Regras de remanejamento
    permitirRemanejamento: config?.permitir_remanejamento ?? true,
    limiteRemanejamentosAno: config?.limite_remanejamentos_ano ?? 2,
    exigirJustificativaRemanejamento: config?.exigir_justificativa_remanejamento ?? true,
  };
};

// Hook para verificar se pode transferir
export const useVerificarTransferencia = (criancaId: string) => {
  const regras = useRegrasWorkflow();

  return useQuery({
    queryKey: ["verificar-transferencia", criancaId],
    queryFn: async () => {
      if (!regras.permitirTransferencia) {
        return { permitido: false, motivo: "Transferências estão desabilitadas." };
      }

      // Buscar data de matrícula
      const { data: crianca, error } = await supabase
        .from("criancas")
        .select("status, updated_at")
        .eq("id", criancaId)
        .single();

      if (error) throw error;

      if (!crianca || !["Matriculado"].includes(crianca.status || "")) {
        return { permitido: false, motivo: "Criança não está matriculada." };
      }

      // Verificar período de carência
      const dataMatricula = new Date(crianca.updated_at || "");
      const diasDesdeMatricula = Math.floor(
        (Date.now() - dataMatricula.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diasDesdeMatricula < regras.periodoCarenciaTransferencia) {
        return {
          permitido: false,
          motivo: `Período de carência: aguarde mais ${regras.periodoCarenciaTransferencia - diasDesdeMatricula} dias.`,
        };
      }

      return { permitido: true };
    },
    enabled: !!criancaId,
  });
};

// Hook para listar motivos padrão
export const useMotivosPadrao = (tipo?: TipoMotivo) => {
  return useQuery({
    queryKey: ["motivos-padrao", tipo],
    queryFn: async () => {
      let query = supabase
        .from("motivos_padrao")
        .select("*")
        .eq("ativo", true)
        .order("ordem", { ascending: true });

      if (tipo) {
        query = query.eq("tipo", tipo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MotivoPadrao[];
    },
  });
};

// Hook para criar motivo padrão
export const useCreateMotivoPadrao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (motivo: Omit<MotivoPadrao, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("motivos_padrao")
        .insert(motivo)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["motivos-padrao"] });
      toast.success("Motivo adicionado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao adicionar motivo: " + error.message);
    },
  });
};

// Hook para atualizar motivo padrão
export const useUpdateMotivoPadrao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MotivoPadrao> & { id: string }) => {
      const { data, error } = await supabase
        .from("motivos_padrao")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["motivos-padrao"] });
      toast.success("Motivo atualizado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar motivo: " + error.message);
    },
  });
};

// Hook para deletar motivo padrão
export const useDeleteMotivoPadrao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("motivos_padrao")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["motivos-padrao"] });
      toast.success("Motivo removido!");
    },
    onError: (error: any) => {
      toast.error("Erro ao remover motivo: " + error.message);
    },
  });
};

// Labels para estratégias de prazo vencido
export const ESTRATEGIAS_PRAZO_VENCIDO = {
  fim_fila: "Mover para fim da fila",
  desistente: "Marcar como desistente",
  manter: "Manter posição (ação manual)",
} as const;

// Labels para tipos de motivo
export const TIPOS_MOTIVO = {
  desistencia: "Desistência",
  recusa: "Recusa de Vaga",
  transferencia: "Transferência",
  remanejamento: "Remanejamento",
  fim_fila: "Fim da Fila",
} as const;


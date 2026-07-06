import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";

export interface Feriado {
  id: string;
  nome: string;
  data: string;
  recorrente: boolean;
  ativo: boolean;
  created_at: string;
}

// Hook para verificar modo de operação
export const useModoOperacao = () => {
  const { data: config } = useConfiguracoesSistema();

  const verificarManutencao = (): boolean => {
    return config?.modo_manutencao ?? false;
  };

  const verificarHorarioAtendimento = (): { dentroHorario: boolean; mensagem?: string } => {
    if (!config?.bloquear_fora_horario) {
      return { dentroHorario: true };
    }

    const agora = new Date();
    const horaAtual = agora.getHours() * 60 + agora.getMinutes();
    
    const [inicioH, inicioM] = (config.horario_inicio_atendimento || "08:00").split(":").map(Number);
    const [fimH, fimM] = (config.horario_fim_atendimento || "17:00").split(":").map(Number);
    
    const inicioMinutos = inicioH * 60 + inicioM;
    const fimMinutos = fimH * 60 + fimM;

    const dentroHorario = horaAtual >= inicioMinutos && horaAtual <= fimMinutos;
    
    return {
      dentroHorario,
      mensagem: dentroHorario ? undefined : config.mensagem_fora_horario || "Sistema disponível apenas em horário comercial.",
    };
  };

  const verificarBloqueioInscricoes = (): { bloqueado: boolean; motivo?: string } => {
    if (config?.bloquear_novas_inscricoes) {
      return {
        bloqueado: true,
        motivo: config.motivo_bloqueio_inscricoes || "Novas inscrições estão temporariamente suspensas.",
      };
    }
    return { bloqueado: false };
  };

  return {
    config,
    verificarManutencao,
    verificarHorarioAtendimento,
    verificarBloqueioInscricoes,
    emManutencao: config?.modo_manutencao ?? false,
    mensagemManutencao: config?.mensagem_manutencao ?? "Sistema em manutenção.",
    anoLetivoAtual: config?.ano_letivo_atual ?? new Date().getFullYear(),
    permitirEdicaoAposInscricao: config?.permitir_edicao_apos_inscricao ?? true,
  };
};

// Hook para listar feriados
export const useFeriados = () => {
  return useQuery({
    queryKey: ["feriados-municipais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feriados_municipais")
        .select("*")
        .order("data", { ascending: true });

      if (error) throw error;
      return data as Feriado[];
    },
  });
};

// Hook para criar feriado
export const useCreateFeriado = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feriado: Omit<Feriado, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("feriados_municipais")
        .insert(feriado)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feriados-municipais"] });
      toast.success("Feriado adicionado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao adicionar feriado: " + error.message);
    },
  });
};

// Hook para atualizar feriado
export const useUpdateFeriado = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Feriado> & { id: string }) => {
      const { data, error } = await supabase
        .from("feriados_municipais")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feriados-municipais"] });
      toast.success("Feriado atualizado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar feriado: " + error.message);
    },
  });
};

// Hook para deletar feriado
export const useDeleteFeriado = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("feriados_municipais")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feriados-municipais"] });
      toast.success("Feriado removido!");
    },
    onError: (error: any) => {
      toast.error("Erro ao remover feriado: " + error.message);
    },
  });
};

// Função para verificar se uma data é feriado
export const verificarFeriado = (data: Date, feriados: Feriado[]): Feriado | null => {
  const dia = data.getDate();
  const mes = data.getMonth() + 1;
  const ano = data.getFullYear();

  for (const feriado of feriados) {
    if (!feriado.ativo) continue;

    const [feriadoAno, feriadoMes, feriadoDia] = feriado.data.split("-").map(Number);

    if (feriado.recorrente) {
      if (feriadoDia === dia && feriadoMes === mes) {
        return feriado;
      }
    } else {
      if (feriadoDia === dia && feriadoMes === mes && feriadoAno === ano) {
        return feriado;
      }
    }
  }

  return null;
};

// Função para calcular prazo considerando dias úteis
export const calcularPrazoDiasUteis = (
  dataInicio: Date,
  dias: number,
  feriados: Feriado[]
): Date => {
  let diasContados = 0;
  const dataAtual = new Date(dataInicio);

  while (diasContados < dias) {
    dataAtual.setDate(dataAtual.getDate() + 1);
    
    const diaSemana = dataAtual.getDay();
    const ehFimDeSemana = diaSemana === 0 || diaSemana === 6;
    const ehFeriado = verificarFeriado(dataAtual, feriados) !== null;

    if (!ehFimDeSemana && !ehFeriado) {
      diasContados++;
    }
  }

  return dataAtual;
};


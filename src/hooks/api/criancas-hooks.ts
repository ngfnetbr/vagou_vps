import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/error-utils";
import { useAuth } from "@/contexts/AuthContext";
import { compareFilaItems } from "@/utils/fila-score";

// Get all children with filters
export const useAllCriancas = (filters?: {
  status?: string;
  cmei?: string;
  search?: string;
  tipoUnidade?: "cmei_creche" | "escola";
}) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-criancas", filters, user?.id],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from("criancas")
        .select(`
          *,
          cmei_atual:cmeis!criancas_cmei_atual_id_fkey(nome, tipo_unidade),
          turma_atual:turmas!criancas_turma_atual_id_fkey(nome, turno)
        `)
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status as any);
      }

      if (filters?.cmei) {
        query = query.eq("cmei_atual_id", filters.cmei);
      }

      if (filters?.search) {
        query = query.or(
          `nome.ilike.%${filters.search}%,responsavel_nome.ilike.%${filters.search}%,responsavel_cpf.ilike.%${filters.search}%,protocolo.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!filters?.tipoUnidade) return data;
      return (data || []).filter((c: any) => (c.cmei_atual?.tipo_unidade || "cmei_creche") === filters.tipoUnidade);
    },
    enabled: !!user,
  });
};

// Get fila de espera with filters (admin)
// A ordenação usa `posicao_fila` calculada pelo banco (recalcular_posicoes_fila):
// - Respeita configurações de prioridade (prioridade_social_habilitada, prioridade_remanejamento_habilitada)
// - Usa timestamp completo (data + hora) de created_at para desempate
// - Quando prioridades desabilitadas, ordena apenas por data/hora de cadastro
export const useFilaEspera = (filters?: {
  prioridade?: string;
  cmei?: string;
  search?: string;
  includeDesistentes?: boolean;
}) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-fila", filters, user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Status base da fila
      // "Aguardando Documentação" foi removido pois não é um valor válido no enum do banco
      const statusFila: string[] = ["Fila de Espera", "Convocado", "Aguardando Assinatura"];
      
      // Se incluir desistentes, adicionar esses status
      if (filters?.includeDesistentes) {
        statusFila.push("Desistente", "Recusada");
      }
      
      // Preparar string de status com aspas para evitar erro de sintaxe com espaços
      const statusFilaString = statusFila.map(s => `"${s}"`).join(',');

      // Query única combinando fila normal + matriculados com remanejamento
      const { data: allData, error } = await supabase
        .from("criancas")
        .select(`
          *,
          cmei1:cmeis!criancas_cmei1_preferencia_fkey(id, nome),
          cmei2:cmeis!criancas_cmei2_preferencia_fkey(id, nome),
          cmei3:cmeis!criancas_cmei3_preferencia_fkey(id, nome),
          cmei_atual:cmeis!criancas_cmei_atual_id_fkey(id, nome),
          cmei_destino:cmeis!criancas_cmei_remanejamento_id_fkey(id, nome),
          turma_atual:turmas!criancas_turma_atual_id_fkey(id, nome, turno),
          crianca_prioridades(
            status,
            prioridade:tipos_prioridade(id, nome, codigo, peso, exige_documento, documento_tipo_id, ativo)
          )
        `)
        .or(`status.in.(${statusFilaString}),and(status.in.(Matriculado,Matriculada),cmei_remanejamento_id.not.is.null)`);

      if (error) throw error;

      let filteredData = allData || [];

      // Aplicar filtros
      if (filters?.prioridade && filters.prioridade !== "all") {
        if (filters.prioridade === "Remanejamento") {
          filteredData = filteredData.filter(c => c.cmei_remanejamento_id || c.prioridade === "Remanejamento");
        } else if (filters.prioridade === "Prioridade") {
          filteredData = filteredData.filter(c => (c.pontos_prioridades || 0) > 0 && !c.cmei_remanejamento_id);
        } else if (filters.prioridade === "Geral") {
          filteredData = filteredData.filter(c => (c.pontos_prioridades || 0) === 0 && !c.cmei_remanejamento_id);
        }
      }

      if (filters?.cmei && filters.cmei.trim() !== '') {
        const cmeiId = filters.cmei;
        filteredData = filteredData.filter(c => 
          c.cmei1_preferencia === cmeiId || 
          c.cmei2_preferencia === cmeiId ||
          c.cmei3_preferencia === cmeiId ||
          c.cmei_remanejamento_id === cmeiId
        );
      }

      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter(c =>
          c.nome?.toLowerCase().includes(searchLower) ||
          c.responsavel_nome?.toLowerCase().includes(searchLower) ||
          c.responsavel_cpf?.includes(filters.search) ||
          c.protocolo?.toLowerCase().includes(searchLower)
        );
      }

      // Ordenação usando posicao_fila calculada pelo banco de dados
      // O banco já respeita as configurações de prioridade (prioridade_social_habilitada, prioridade_remanejamento_habilitada)
      const cmeiId = filters?.cmei?.trim() ? filters.cmei : undefined;
      filteredData.sort((a, b) => compareFilaItems(a as any, b as any, cmeiId));

      return filteredData;
    },
    enabled: !!user,
    staleTime: 0, // Sempre refetch quando invalidado
    refetchOnMount: true,
  });
};

// Get convocações pendentes (crianças convocadas)
export const useConvocacoesPendentes = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-convocacoes-pendentes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("criancas")
        .select(`
          *,
          cmei_atual:cmeis!criancas_cmei_atual_id_fkey(nome),
          cmei1:cmeis!criancas_cmei1_preferencia_fkey(nome),
          cmei2:cmeis!criancas_cmei2_preferencia_fkey(nome)
        `)
        .eq("status", "Convocado")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

// Get recent activities from historico
export const useAtividadesRecentes = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-atividades-recentes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("historico")
        .select(`
          *,
          crianca:crianca_id(nome)
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

// Get all logs for the logs page (more records)
export const useLogs = (limit = 100) => {
  return useQuery({
    queryKey: ["logs", limit],
    queryFn: async () => {
      // First get historico records
      const { data: historicoData, error: historicoError } = await supabase
        .from("historico")
        .select(`
          *,
          crianca:criancas(nome, responsavel_nome)
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (historicoError) throw historicoError;
      
      // Get unique user IDs and fetch profiles separately
      const userIds = [...new Set(historicoData?.map(h => h.usuario_id).filter(Boolean) || [])];
      
      let profilesMap: Record<string, { nome_completo: string | null; email: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, nome_completo, email")
          .in("id", userIds);
        
        if (profilesData) {
          profilesMap = profilesData.reduce((acc, p) => {
            acc[p.id] = { nome_completo: p.nome_completo, email: p.email };
            return acc;
          }, {} as Record<string, { nome_completo: string | null; email: string | null }>);
        }
      }
      
      // Merge user data with historico
      return historicoData?.map(h => ({
        ...h,
        usuario: h.usuario_id ? profilesMap[h.usuario_id] || null : null
      })) || [];
    },
  });
};

// Get unique users from logs for filtering
export const useLogsUsers = () => {
  return useQuery({
    queryKey: ["logs-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome_completo, email")
        .order("nome_completo");

      if (error) throw error;
      return data;
    },
  });
};

// Mutation para convocar criança
export const useConvocarCrianca = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, prazo }: { id: string; prazo: number }) => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + prazo);

      const { data, error } = await supabase
        .from("criancas")
        .update({
          status: "Convocado",
          data_convocacao: new Date().toISOString(),
          convocacao_deadline: deadline.toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Registrar no histórico
      await supabase.from("historico").insert({
        crianca_id: id,
        acao: "Convocação",
        descricao: `Criança convocada com prazo de ${prazo} dias`,
        status_anterior: "Fila de Espera",
        status_novo: "Convocado",
      });

      // Enviar notificação
      try {
        await supabase.functions.invoke('enviar-notificacao', {
          body: {
            crianca_id: id,
            tipo: 'convocacao',
            dados_adicionais: {
              prazo_dias: prazo,
              deadline: deadline.toISOString(),
            },
          },
        });
        console.log('Notificação de convocação enviada com sucesso');
      } catch (notifError) {
        console.error('Erro ao enviar notificação:', notifError);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-fila"] });
      queryClient.invalidateQueries({ queryKey: ["convocacoes-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["atividades-recentes"] });
      toast.success("Criança convocada e notificação enviada!");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao convocar criança: " + getErrorMessage(error));
    },
  });
};

// Mutation para convocação em lote
export const useConvocarLote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, prazo }: { ids: string[]; prazo: number }) => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + prazo);

      const { error } = await supabase
        .from("criancas")
        .update({
          status: "Convocado",
          data_convocacao: new Date().toISOString(),
          convocacao_deadline: deadline.toISOString(),
        })
        .in("id", ids);

      if (error) throw error;

      // Registrar no histórico para cada criança
      const historicos = ids.map((id) => ({
        crianca_id: id,
        acao: "Convocação em Lote",
        descricao: `Criança convocada em lote com prazo de ${prazo} dias`,
        status_anterior: "Fila de Espera" as const,
        status_novo: "Convocado" as const,
      }));

      await supabase.from("historico").insert(historicos);

      // Enviar notificações para todas as crianças
      for (const id of ids) {
        try {
          await supabase.functions.invoke('enviar-notificacao', {
            body: {
              crianca_id: id,
              tipo: 'convocacao',
              dados_adicionais: {
                prazo_dias: prazo,
                deadline: deadline.toISOString(),
                convocacao_lote: true,
              },
            },
          });
        } catch (notifError) {
          console.error(`Erro ao enviar notificação para criança ${id}:`, notifError);
        }
      }

      return { count: ids.length };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-fila"] });
      queryClient.invalidateQueries({ queryKey: ["convocacoes-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["atividades-recentes"] });
      toast.success(`${variables.ids.length} crianças convocadas e notificações enviadas!`);
    },
    onError: (error: unknown) => {
      toast.error("Erro ao convocar crianças: " + getErrorMessage(error));
    },
  });
};

// Mutation para excluir criança
export const useDeleteCrianca = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error, count } = await supabase
        .from("criancas")
        .delete({ count: "exact" })
        .eq("id", id);

      if (error) throw error;
      if (count === 0) {
        throw new Error("Não foi possível excluir a criança. Verifique se ela existe e se você tem permissão.");
      }
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["admin-criancas"] });
      await queryClient.cancelQueries({ queryKey: ["admin-fila"] });
      const previousCriancas = queryClient.getQueriesData<any>({ queryKey: ["admin-criancas"] });
      const previousFila = queryClient.getQueriesData<any>({ queryKey: ["admin-fila"] });
      queryClient.setQueriesData<any>({ queryKey: ["admin-criancas"] }, (old) => {
        if (!old) return old;
        if (Array.isArray(old)) return old.filter((c) => c.id !== id);
        return old;
      });
      queryClient.setQueriesData<any>({ queryKey: ["admin-fila"] }, (old) => {
        if (!old) return old;
        if (Array.isArray(old)) return old.filter((c) => c.id !== id);
        return old;
      });
      return { previousCriancas, previousFila };
    },
    onError: (error: unknown, _id, context) => {
      if (context?.previousCriancas) {
        context.previousCriancas.forEach(([key, data]: any) => {
          queryClient.setQueryData(key, data);
        });
      }
      if (context?.previousFila) {
        context.previousFila.forEach(([key, data]: any) => {
          queryClient.setQueryData(key, data);
        });
      }
      toast.error("Erro ao excluir criança: " + getErrorMessage(error));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-criancas"] });
      queryClient.invalidateQueries({ queryKey: ["criancas"] });
      queryClient.invalidateQueries({ queryKey: ["admin-fila"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["atividades-recentes"] });
      toast.success("Criança excluída com sucesso!");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-criancas"] });
      queryClient.invalidateQueries({ queryKey: ["admin-fila"] });
    },
  });
};

// Mutation para enviar lembrete de prazo
export const useEnviarLembrete = () => {
  return useMutation({
    mutationFn: async ({ id, tipo }: { id: string; tipo: 'lembrete' }) => {
      const { data, error } = await supabase.functions.invoke('enviar-notificacao', {
        body: { crianca_id: id, tipo, dados_adicionais: { reenvio: true } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Lembrete de prazo enviado com sucesso!");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao enviar lembrete: " + getErrorMessage(error));
    },
  });
};

// Hook para contar crianças novas na fila (últimas 24 horas) - para badge no menu
export const useCriancasNovasFilaCount = () => {
  return useQuery({
    queryKey: ["criancas-novas-fila-count"],
    queryFn: async () => {
      // Crianças cadastradas nas últimas 24 horas que estão na fila de espera
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);
      
      const { count, error } = await supabase
        .from("criancas")
        .select("*", { count: "exact", head: true })
        .eq("status", "Fila de Espera")
        .gte("created_at", ontem.toISOString());

      if (error) throw error;
      return count || 0;
    },
    staleTime: 30000, // Cache por 30 segundos
    retry: false,
  });
};

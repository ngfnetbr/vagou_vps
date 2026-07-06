import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CMEI, Turma } from "@/hooks/api/supabase-hooks";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/utils/error-utils";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";

// Dashboard Statistics
export const useDashboardStats = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard-stats", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const [
        totalRes,
        filaRes,
        matriculadasRes,
        cmeisAtivosRes,
        cmeisCapRes,
      ] = await Promise.all([
        supabase.from("criancas").select("*", { count: "exact", head: true }),
        supabase
          .from("criancas")
          .select("*", { count: "exact", head: true })
          .eq("status", "Fila de Espera"),
        supabase
          .from("criancas")
          .select("*", { count: "exact", head: true })
          .in("status", ["Matriculado", "Matriculada"]),
        supabase.from("cmeis").select("*", { count: "exact", head: true }).eq("ativo", true).eq("tipo_unidade", "cmei_creche"),
        supabase.from("cmeis").select("capacidade_total").eq("ativo", true).eq("tipo_unidade", "cmei_creche"),
      ]);

      if (totalRes.error) throw totalRes.error;
      if (filaRes.error) throw filaRes.error;
      if (matriculadasRes.error) throw matriculadasRes.error;
      if (cmeisAtivosRes.error) throw cmeisAtivosRes.error;
      if (cmeisCapRes.error) throw cmeisCapRes.error;

      const totalCriancas = totalRes.count || 0;
      const naFila = filaRes.count || 0;
      const matriculadas = matriculadasRes.count || 0;
      const cmeisAtivos = cmeisAtivosRes.count || 0;

      const capacidadeTotal =
        cmeisCapRes.data?.reduce((acc, c) => acc + (c.capacidade_total || 0), 0) || 0;
      const taxaOcupacao =
        capacidadeTotal > 0 ? Math.round((matriculadas / capacidadeTotal) * 100) : 0;

      return {
        totalCriancas,
        naFila,
        matriculadas,
        cmeisAtivos,
        taxaOcupacao,
      };
    },
    staleTime: 30000,
    gcTime: 300000,
    retry: 2,
    enabled: !!user,
  });
};

// Todas as unidades (incluindo inativas para admin)
export const useAllCMEIs = () => {
  return useQuery({
    queryKey: ["admin-cmeis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cmeis")
        .select("*")
        .order("nome");
      
      if (error) throw error;
      return data as CMEI[];
    },
  });
};

// Criar unidade
export const useCreateCMEI = () => {
  const queryClient = useQueryClient();
  const { data: config } = useConfiguracoesSistema();
  const { singular } = getUnidadeLabels(config as any);
  
  return useMutation({
    mutationFn: async (cmei: Omit<CMEI, "id">) => {
      const { data, error } = await supabase
        .from("cmeis")
        .insert(cmei)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cmeis"] });
      queryClient.invalidateQueries({ queryKey: ["cmeis"] });
      toast.success(`Cadastro de ${singular} criado com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar cadastro de ${singular}: ${getErrorMessage(error)}`);
    },
  });
};

// Atualizar unidade
export const useUpdateCMEI = () => {
  const queryClient = useQueryClient();
  const { data: config } = useConfiguracoesSistema();
  const { singular } = getUnidadeLabels(config as any);
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CMEI> & { id: string }) => {
      // Validação: nome não pode ser vazio
      if (updates.nome !== undefined && (!updates.nome || updates.nome.trim() === '')) {
        throw new Error("O nome da unidade é obrigatório");
      }
      
      const { data, error } = await supabase
        .from("cmeis")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cmeis"] });
      queryClient.invalidateQueries({ queryKey: ["cmeis"] });
      toast.success(`Cadastro de ${singular} atualizado com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar cadastro de ${singular}: ${getErrorMessage(error)}`);
    },
  });
};

// Excluir unidade (exclusão permanente)
export const useDeleteCMEI = () => {
  const queryClient = useQueryClient();
  const { data: config } = useConfiguracoesSistema();
  const { singular } = getUnidadeLabels(config as any);
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Verificar se há crianças vinculadas à unidade (atual, preferências ou remanejamento)
      const { count: criancasAtuais, error: countError } = await supabase
        .from("criancas")
        .select("*", { count: "exact", head: true })
        .eq("cmei_atual_id", id);
      
      if (countError) throw countError;
      
      if (criancasAtuais && criancasAtuais > 0) {
        throw new Error(`Não é possível excluir este cadastro de ${singular} porque existem ${criancasAtuais} criança(s) matriculada(s). Transfira as crianças antes de excluir.`);
      }

      // Verificar turmas vinculadas
      const { count: turmasVinculadas, error: turmasError } = await supabase
        .from("turmas")
        .select("*", { count: "exact", head: true })
        .eq("cmei_id", id);

      if (turmasError) throw turmasError;

      if (turmasVinculadas && turmasVinculadas > 0) {
        throw new Error(`Não é possível excluir este cadastro de ${singular} porque existem ${turmasVinculadas} turma(s) vinculada(s). Exclua as turmas antes.`);
      }

      // Excluir permanentemente
      const { error } = await supabase
        .from("cmeis")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cmeis"] });
      queryClient.invalidateQueries({ queryKey: ["cmeis"] });
      toast.success(`Cadastro de ${singular} excluído permanentemente!`);
    },
    onError: (error: any) => {
      toast.error(error.message || `Erro ao excluir cadastro de ${singular}`);
    },
  });
};

// Reativar unidade
export const useReactivateCMEI = () => {
  const queryClient = useQueryClient();
  const { data: config } = useConfiguracoesSistema();
  const { singular } = getUnidadeLabels(config as any);
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cmeis")
        .update({ ativo: true })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cmeis"] });
      queryClient.invalidateQueries({ queryKey: ["cmeis"] });
      toast.success(`Cadastro de ${singular} reativado com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(`Erro ao reativar cadastro de ${singular}: ${getErrorMessage(error)}`);
    },
  });
};

// All Turmas (including inactive for admin)
export const useAllTurmas = (cmeiId?: string) => {
  return useQuery({
    queryKey: ["admin-turmas", cmeiId],
    queryFn: async () => {
      let query = supabase
        .from("turmas")
        .select("*, cmeis(nome, tipo_unidade)");
      
      if (cmeiId) {
        query = query.eq("cmei_id", cmeiId);
      }
      
      const { data, error } = await query.order("nome");
      
      if (error) throw error;
      return data;
    },
  });
};

// Create Turma
export const useCreateTurma = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (turma: Omit<Turma, "id">) => {
      const { data, error } = await supabase
        .from("turmas")
        .insert(turma)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-turmas"] });
      queryClient.invalidateQueries({ queryKey: ["turmas"] });
      toast.success("Turma criada com sucesso!");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao criar turma: " + getErrorMessage(error));
    },
  });
};

// Update Turma
export const useUpdateTurma = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Turma> & { id: string }) => {
      // Se está tentando inativar a turma, verificar se há crianças ativas vinculadas
      if (updates.ativo === false) {
        const { count: criancasAtivas, error: countError } = await supabase
          .from("criancas")
          .select("*", { count: "exact", head: true })
          .eq("turma_atual_id", id)
          .in("status", ["Matriculado", "Matriculada", "Convocado", "Aguardando Documentação"]);
        
        if (countError) throw countError;
        
        if (criancasAtivas && criancasAtivas > 0) {
          throw new Error(`Não é possível inativar esta turma porque existem ${criancasAtivas} criança(s) convocada(s) ou matriculada(s). Transfira as crianças antes de inativar.`);
        }
      }

      const { data, error } = await supabase
        .from("turmas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-turmas"] });
      queryClient.invalidateQueries({ queryKey: ["turmas"] });
      toast.success("Turma atualizada com sucesso!");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : getErrorMessage(error);
      toast.error(message || "Erro ao atualizar turma");
    },
  });
};

// Delete Turma (exclusão permanente)
export const useDeleteTurma = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Verificar se há crianças vinculadas à turma
      const { count: criancasVinculadas, error: countError } = await supabase
        .from("criancas")
        .select("*", { count: "exact", head: true })
        .eq("turma_atual_id", id);
      
      if (countError) throw countError;
      
      if (criancasVinculadas && criancasVinculadas > 0) {
        throw new Error(`Não é possível excluir esta turma porque existem ${criancasVinculadas} criança(s) vinculada(s). Remova ou transfira as crianças antes de excluir.`);
      }

      // Exclusão permanente
      const { error } = await supabase
        .from("turmas")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-turmas"] });
      queryClient.invalidateQueries({ queryKey: ["turmas"] });
      toast.success("Turma excluída com sucesso!");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : getErrorMessage(error);
      toast.error(message || "Erro ao excluir turma");
    },
  });
};

// Reactivate Turma
export const useReactivateTurma = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("turmas")
        .update({ ativo: true })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-turmas"] });
      queryClient.invalidateQueries({ queryKey: ["turmas"] });
      toast.success("Turma reativada com sucesso!");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao reativar turma: " + getErrorMessage(error));
    },
  });
};

// Solicitar Remanejamento
// A criança CONTINUA MATRICULADA mas entra na fila com prioridade MÁXIMA
export const useSolicitarRemanejamento = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: config } = useConfiguracoesSistema();
  const { singular } = getUnidadeLabels(config as any);
  
  return useMutation({
    mutationFn: async ({ 
      criancaId, 
      cmeiDestinoId, 
      justificativa 
    }: { 
      criancaId: string; 
      cmeiDestinoId: string; 
      justificativa: string;
    }) => {
      // Buscar dados atuais da criança
      const { data: criancaAtual, error: fetchError } = await supabase
        .from("criancas")
        .select("*, cmei_atual:cmeis!criancas_cmei_atual_id_fkey(nome)")
        .eq("id", criancaId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Atualizar criança com solicitação de remanejamento
      // IMPORTANTE: Status CONTINUA como está, apenas define prioridade e unidade de destino
      const { data: crianca, error: updateError } = await supabase
        .from("criancas")
        .update({
          cmei_remanejamento_id: cmeiDestinoId,
          justificativa_remanejamento: justificativa,
          prioridade: "Remanejamento",
          updated_by: user?.id,
          // NÃO MUDA O STATUS - continua Matriculado
        })
        .eq("id", criancaId)
        .select("*, cmei_atual:cmeis!criancas_cmei_atual_id_fkey(nome)")
        .single();
      
      if (updateError) throw updateError;

      // Registrar no histórico
      const { error: histError } = await supabase
        .from("historico")
        .insert({
          crianca_id: criancaId,
          acao: "Remanejamento Solicitado",
          status_anterior: criancaAtual.status,
          status_novo: criancaAtual.status, // Mantém o mesmo status
          cmei_anterior: criancaAtual.cmei_atual_id,
          cmei_novo: cmeiDestinoId,
          justificativa: justificativa,
          descricao: `Solicitado remanejamento de ${(criancaAtual as any).cmei_atual?.nome || `${singular} atual`} para ${singular} de destino. Criança continua matriculada e aguarda vaga na fila com prioridade máxima.`,
          usuario_id: user?.id,
        });
      
      if (histError) throw histError;
      
      // Recalcular posições da fila para incluir a criança com prioridade máxima
      await supabase.rpc("recalcular_posicoes_fila");
      
      // Enviar notificação de remanejamento solicitado
      try {
        await supabase.functions.invoke('enviar-notificacao', {
          body: {
            crianca_id: criancaId,
            tipo: 'remanejamento_solicitado',
            dados_adicionais: {
              cmei_destino_id: cmeiDestinoId,
              justificativa: justificativa,
              solicitado_por: 'admin',
            },
          },
        });
        console.log('Notificação de remanejamento solicitado enviada');
      } catch (notifError) {
        console.error('Erro ao enviar notificação de remanejamento:', notifError);
      }
      
      return crianca;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matriculas"] });
      queryClient.invalidateQueries({ queryKey: ["criancas-detalhes"] });
      queryClient.invalidateQueries({ queryKey: ["historico"] });
      queryClient.invalidateQueries({ queryKey: ["admin-fila"] });
      queryClient.invalidateQueries({ queryKey: ["remanejamentos-aguardando"] });
      toast.success("Remanejamento solicitado! Criança continua matriculada e aguarda vaga na fila.");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao solicitar remanejamento: " + getErrorMessage(error));
    },
  });
};

// Efetivar Transferência
export const useEfetivarTransferencia = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: config } = useConfiguracoesSistema();
  const { singular } = getUnidadeLabels(config as any);
  
  return useMutation({
    mutationFn: async (criancaId: string) => {
      // Buscar dados atuais da criança
      const { data: crianca, error: fetchError } = await supabase
        .from("criancas")
        .select("*, cmei_atual:cmeis!criancas_cmei_atual_id_fkey(nome), cmei_destino:cmeis!criancas_cmei_remanejamento_id_fkey(nome)")
        .eq("id", criancaId)
        .single();
      
      if (fetchError) throw fetchError;
      if (!crianca.cmei_remanejamento_id) throw new Error("Nenhum remanejamento solicitado");

      // Efetivar a transferência
      const { data: updated, error: updateError } = await supabase
        .from("criancas")
        .update({
          cmei_atual_id: crianca.cmei_remanejamento_id,
          turma_atual_id: null, // Resetar turma - será alocado posteriormente
          status: "Matriculado",
          cmei_remanejamento_id: null,
          justificativa_remanejamento: null,
          updated_by: user?.id,
        })
        .eq("id", criancaId)
        .select()
        .single();
      
      if (updateError) throw updateError;

      // Registrar no histórico
      const { error: histError } = await supabase
        .from("historico")
        .insert({
          crianca_id: criancaId,
          acao: "Transferência Efetivada",
          status_anterior: "Remanejamento Solicitado",
          status_novo: "Matriculado",
          cmei_anterior: crianca.cmei_atual_id,
          cmei_novo: crianca.cmei_remanejamento_id,
          turma_anterior: crianca.turma_atual_id,
          turma_novo: null,
          justificativa: crianca.justificativa_remanejamento,
          descricao: `Transferência efetivada de ${(crianca as any).cmei_atual?.nome || `${singular} não identificado`} para ${(crianca as any).cmei_destino?.nome || `${singular} não identificado`}`,
          usuario_id: user?.id,
        });
      
      if (histError) throw histError;
      
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matriculas"] });
      queryClient.invalidateQueries({ queryKey: ["criancas-detalhes"] });
      queryClient.invalidateQueries({ queryKey: ["historico"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Transferência efetivada com sucesso! Criança matriculada na nova unidade.");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao efetivar transferência: " + getErrorMessage(error));
    },
  });
};

// Cancelar Remanejamento
export const useCancelarRemanejamento = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (criancaId: string) => {
      // Buscar dados atuais
      const { data: crianca, error: fetchError } = await supabase
        .from("criancas")
        .select("*")
        .eq("id", criancaId)
        .single();
      
      if (fetchError) throw fetchError;

      // Cancelar remanejamento - volta prioridade para Social ou Geral
      const novaPrioridade = crianca.programas_sociais ? "Social" : "Geral";
      
      const { data: updated, error: updateError } = await supabase
        .from("criancas")
        .update({
          cmei_remanejamento_id: null,
          justificativa_remanejamento: null,
          prioridade: novaPrioridade,
          updated_by: user?.id,
          // NÃO MUDA O STATUS - mantém como estava
        })
        .eq("id", criancaId)
        .select()
        .single();
      
      if (updateError) throw updateError;

      // Registrar no histórico
      const { error: histError } = await supabase
        .from("historico")
        .insert({
          crianca_id: criancaId,
          acao: "Remanejamento Cancelado",
          status_anterior: crianca.status,
          status_novo: crianca.status, // Mantém o mesmo status
          justificativa: "Solicitação de remanejamento cancelada pelo administrador",
          descricao: "Remanejamento cancelado. Criança permanece na unidade atual.",
          usuario_id: user?.id,
        });
      
      if (histError) throw histError;
      
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matriculas"] });
      queryClient.invalidateQueries({ queryKey: ["criancas-detalhes"] });
      queryClient.invalidateQueries({ queryKey: ["historico"] });
      queryClient.invalidateQueries({ queryKey: ["admin-fila"] });
      queryClient.invalidateQueries({ queryKey: ["remanejamentos-aguardando"] });
      toast.success("Remanejamento cancelado com sucesso!");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao cancelar remanejamento: " + getErrorMessage(error));
    },
  });
};

// Realocar Turma (mudança de turma na mesma unidade)
export const useRealocarTurma = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: config } = useConfiguracoesSistema();
  const { singular } = getUnidadeLabels(config as any);
  
  return useMutation({
    mutationFn: async ({ 
      criancaId, 
      turmaNova, 
      motivo 
    }: { 
      criancaId: string; 
      turmaNova: string; 
      motivo: string;
    }) => {
      // Buscar dados atuais da criança
      const { data: crianca, error: fetchError } = await supabase
        .from("criancas")
        .select(`
          *,
          turma_anterior:turmas!criancas_turma_atual_id_fkey(id, nome, turno),
          cmei:cmeis!criancas_cmei_atual_id_fkey(nome)
        `)
        .eq("id", criancaId)
        .single();
      
      if (fetchError) throw fetchError;

      // Buscar informações da turma nova
      const { data: turmaNovaDados, error: turmaError } = await supabase
        .from("turmas")
        .select("id, nome, turno, cmei_id")
        .eq("id", turmaNova)
        .single();
      
      if (turmaError) throw turmaError;

      // Verificar se a turma nova pertence à mesma unidade
      if (turmaNovaDados.cmei_id !== crianca.cmei_atual_id) {
        throw new Error("A turma selecionada não pertence à mesma unidade");
      }

      // Atualizar criança com nova turma
      const { data: updated, error: updateError } = await supabase
        .from("criancas")
        .update({
          turma_atual_id: turmaNova,
          updated_by: user?.id,
        })
        .eq("id", criancaId)
        .select()
        .single();
      
      if (updateError) throw updateError;

      // Registrar no histórico
      const { error: histError } = await supabase
        .from("historico")
        .insert({
          crianca_id: criancaId,
          acao: "Realocação de Turma",
          turma_anterior: crianca.turma_atual_id,
          turma_novo: turmaNova,
          cmei_anterior: crianca.cmei_atual_id,
          cmei_novo: crianca.cmei_atual_id,
          justificativa: motivo,
          descricao: `Realocação de turma dentro de ${(crianca as any).cmei?.nome || singular}: ${(crianca as any).turma_anterior?.nome || 'sem turma'} → ${turmaNovaDados.nome}${turmaNovaDados.turno ? ` (${turmaNovaDados.turno})` : ''}`,
          usuario_id: user?.id,
        });
      
      if (histError) throw histError;
      
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matriculas"] });
      queryClient.invalidateQueries({ queryKey: ["criancas-detalhes"] });
      queryClient.invalidateQueries({ queryKey: ["historico"] });
      queryClient.invalidateQueries({ queryKey: ["turmas"] });
      toast.success("Criança realocada com sucesso para nova turma!");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao realocar criança: " + getErrorMessage(error));
    },
  });
};

// Transferir para outro município (mudança de cidade)
export const useTransferirMunicipio = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: config } = useConfiguracoesSistema();
  const { singular } = getUnidadeLabels(config as any);
  
  return useMutation({
    mutationFn: async ({ 
      criancaId, 
      justificativa 
    }: { 
      criancaId: string; 
      justificativa: string;
    }) => {
      // Buscar dados atuais da criança
      const { data: crianca, error: fetchError } = await supabase
        .from("criancas")
        .select(`
          *,
          cmei:cmeis!criancas_cmei_atual_id_fkey(nome),
          turma:turmas!criancas_turma_atual_id_fkey(nome)
        `)
        .eq("id", criancaId)
        .single();
      
      if (fetchError) throw fetchError;

      // Atualizar criança - marcar como Transferido
      const { data: updated, error: updateError } = await supabase
        .from("criancas")
        .update({
          status: "Transferido" as any,
          cmei_atual_id: null,
          turma_atual_id: null,
          convocacao_deadline: null,
          data_convocacao: null,
          posicao_fila: null,
          updated_by: user?.id,
        })
        .eq("id", criancaId)
        .select()
        .single();
      
      if (updateError) throw updateError;

      // Registrar no histórico
      const { error: histError } = await supabase
        .from("historico")
        .insert({
          crianca_id: criancaId,
          acao: "Transferência para Outro Município",
          status_anterior: crianca.status,
          status_novo: "Transferido" as any,
          cmei_anterior: crianca.cmei_atual_id,
          turma_anterior: crianca.turma_atual_id,
          justificativa,
          descricao: `Criança transferida para outro município. ${singular} anterior: ${(crianca as any).cmei?.nome || 'N/A'}`,
          usuario_id: user?.id,
        });
      
      if (histError) throw histError;
      
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matriculas"] });
      queryClient.invalidateQueries({ queryKey: ["admin-fila"] });
      queryClient.invalidateQueries({ queryKey: ["criancas-detalhes"] });
      queryClient.invalidateQueries({ queryKey: ["historico"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["turmas"] });
      toast.success("Criança transferida para outro município com sucesso!");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao transferir criança: " + getErrorMessage(error));
    },
  });
};

// Trancar matrícula
export const useTrancarMatricula = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      criancaId, 
      justificativa 
    }: { 
      criancaId: string; 
      justificativa: string;
    }) => {
      // Buscar dados atuais da criança
      const { data: crianca, error: fetchError } = await supabase
        .from("criancas")
        .select(`
          *,
          cmei:cmeis!criancas_cmei_atual_id_fkey(nome),
          turma:turmas!criancas_turma_atual_id_fkey(nome)
        `)
        .eq("id", criancaId)
        .single();
      
      if (fetchError) throw fetchError;

      // Atualizar criança - trancar matrícula mas manter unidade/turma para eventual retorno
      const { data: updated, error: updateError } = await supabase
        .from("criancas")
        .update({
          status: "Matrícula Trancada" as any,
          updated_by: user?.id,
        })
        .eq("id", criancaId)
        .select()
        .single();
      
      if (updateError) throw updateError;

      // Registrar no histórico
      const { error: histError } = await supabase
        .from("historico")
        .insert({
          crianca_id: criancaId,
          acao: "Matrícula Trancada",
          status_anterior: crianca.status,
          status_novo: "Matrícula Trancada" as any,
          cmei_anterior: crianca.cmei_atual_id,
          cmei_novo: crianca.cmei_atual_id,
          turma_anterior: crianca.turma_atual_id,
          turma_novo: crianca.turma_atual_id,
          justificativa,
          descricao: `Matrícula trancada em ${(crianca as any).cmei?.nome || 'N/A'} - ${(crianca as any).turma?.nome || 'N/A'}`,
          usuario_id: user?.id,
        });
      
      if (histError) throw histError;
      
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matriculas"] });
      queryClient.invalidateQueries({ queryKey: ["criancas-detalhes"] });
      queryClient.invalidateQueries({ queryKey: ["historico"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["turmas"] });
      toast.success("Matrícula trancada com sucesso!");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao trancar matrícula: " + getErrorMessage(error));
    },
  });
};

// Destrancar matrícula
export const useDestrancarMatricula = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      criancaId, 
      justificativa 
    }: { 
      criancaId: string; 
      justificativa: string;
    }) => {
      // Buscar dados atuais da criança
      const { data: crianca, error: fetchError } = await supabase
        .from("criancas")
        .select(`
          *,
          cmei:cmeis!criancas_cmei_atual_id_fkey(nome),
          turma:turmas!criancas_turma_atual_id_fkey(nome)
        `)
        .eq("id", criancaId)
        .single();
      
      if (fetchError) throw fetchError;

      // Atualizar criança - destrancar matrícula
      const { data: updated, error: updateError } = await supabase
        .from("criancas")
        .update({
          status: "Matriculado" as any,
          updated_by: user?.id,
        })
        .eq("id", criancaId)
        .select()
        .single();
      
      if (updateError) throw updateError;

      // Registrar no histórico
      const { error: histError } = await supabase
        .from("historico")
        .insert({
          crianca_id: criancaId,
          acao: "Matrícula Destrancada",
          status_anterior: "Matrícula Trancada" as any,
          status_novo: "Matriculado" as any,
          cmei_anterior: crianca.cmei_atual_id,
          cmei_novo: crianca.cmei_atual_id,
          turma_anterior: crianca.turma_atual_id,
          turma_novo: crianca.turma_atual_id,
          justificativa,
          descricao: `Matrícula reativada em ${(crianca as any).cmei?.nome || 'N/A'} - ${(crianca as any).turma?.nome || 'N/A'}`,
          usuario_id: user?.id,
        });
      
      if (histError) throw histError;
      
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matriculas"] });
      queryClient.invalidateQueries({ queryKey: ["criancas-detalhes"] });
      queryClient.invalidateQueries({ queryKey: ["historico"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["turmas"] });
      toast.success("Matrícula destrancada com sucesso!");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao destrancar matrícula: " + getErrorMessage(error));
    },
  });
};

// Marcar como desistente (a partir de matrícula)
export const useMarcarDesistenteMatricula = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      criancaId, 
      justificativa 
    }: { 
      criancaId: string; 
      justificativa: string;
    }) => {
      // Buscar dados atuais da criança
      const { data: crianca, error: fetchError } = await supabase
        .from("criancas")
        .select(`
          *,
          cmei:cmeis!criancas_cmei_atual_id_fkey(nome),
          turma:turmas!criancas_turma_atual_id_fkey(nome)
        `)
        .eq("id", criancaId)
        .single();
      
      if (fetchError) throw fetchError;

      // Atualizar criança - marcar como desistente
      const { data: updated, error: updateError } = await supabase
        .from("criancas")
        .update({
          status: "Desistente" as any,
          cmei_atual_id: null,
          turma_atual_id: null,
          posicao_fila: null,
          updated_by: user?.id,
        })
        .eq("id", criancaId)
        .select()
        .single();
      
      if (updateError) throw updateError;

      // Registrar no histórico
      const { error: histError } = await supabase
        .from("historico")
        .insert({
          crianca_id: criancaId,
          acao: "Desistência de Matrícula",
          status_anterior: crianca.status,
          status_novo: "Desistente" as any,
          cmei_anterior: crianca.cmei_atual_id,
          turma_anterior: crianca.turma_atual_id,
          justificativa,
          descricao: `Desistência de matrícula em ${(crianca as any).cmei?.nome || 'N/A'}`,
          usuario_id: user?.id,
        });
      
      if (histError) throw histError;
      
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matriculas"] });
      queryClient.invalidateQueries({ queryKey: ["admin-fila"] });
      queryClient.invalidateQueries({ queryKey: ["criancas-detalhes"] });
      queryClient.invalidateQueries({ queryKey: ["historico"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["turmas"] });
      toast.success("Criança marcada como desistente!");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao marcar desistência: " + getErrorMessage(error));
    },
  });
};


import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { exigirDocumentacaoObrigatoriaCompleta } from "@/utils/documentos-obrigatorios";
import { toast } from "sonner";

// Hook para calcular posição na fila dinamicamente
export const usePosicaoNaFila = (criancaId: string | undefined) => {
  return useQuery({
    queryKey: ["posicao-fila", criancaId],
    queryFn: async () => {
      if (!criancaId) return null;

      // Buscar dados da criança
      const { data: crianca, error: criancaError } = await supabase
        .from("criancas")
        .select("id, prioridade, created_at, status")
        .eq("id", criancaId)
        .single();

      if (criancaError || !crianca) return null;
      
      // Só calcular se está na fila
      if (crianca.status !== "Fila de Espera" && crianca.status !== "Convocado") {
        return null;
      }

      // Contar quantos estão à frente baseado em prioridade e data de cadastro
      // Ordem de prioridade: Remanejamento (1) > Social (2) > Geral (3)
      const prioridadeOrdem = {
        'Remanejamento': 1,
        'Social': 2,
        'Geral': 3
      };
      
      const minhaPrioridade = prioridadeOrdem[crianca.prioridade as keyof typeof prioridadeOrdem] || 3;

      // Buscar todos na fila com prioridade maior OU mesma prioridade e data anterior
      const { count: aFrente, error: countError } = await supabase
        .from("criancas")
        .select("id", { count: "exact", head: true })
        .in("status", ["Fila de Espera", "Convocado"])
        .or(
          `prioridade.eq.Remanejamento${minhaPrioridade > 1 ? '' : `.and.created_at.lt.${crianca.created_at}`},` +
          `prioridade.eq.Social${minhaPrioridade > 2 ? '' : minhaPrioridade === 2 ? `.and.created_at.lt.${crianca.created_at}` : ''},` +
          `prioridade.eq.Geral${minhaPrioridade === 3 ? `.and.created_at.lt.${crianca.created_at}` : ''}`
        );

      if (countError) {
        console.error("Erro ao contar posição:", countError);
        return null;
      }

      return (aFrente || 0) + 1;
    },
    enabled: !!criancaId,
    staleTime: 30000, // Cache por 30 segundos
  });
};

// Hook para calcular posições de múltiplas crianças
export const usePosicoesNaFila = (criancaIds: string[]) => {
  return useQuery({
    queryKey: ["posicoes-fila", criancaIds],
    queryFn: async () => {
      if (!criancaIds.length) return {};

      // Buscar todas as crianças na fila ordenadas
      const { data: todasNaFila, error } = await supabase
        .from("criancas")
        .select("id, prioridade, created_at")
        .in("status", ["Fila de Espera", "Convocado"])
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Ordenar por prioridade e data
      const prioridadeOrdem = { 'Remanejamento': 1, 'Social': 2, 'Geral': 3 };
      
      const ordenada = (todasNaFila || []).sort((a, b) => {
        const prioA = prioridadeOrdem[a.prioridade as keyof typeof prioridadeOrdem] || 3;
        const prioB = prioridadeOrdem[b.prioridade as keyof typeof prioridadeOrdem] || 3;
        
        if (prioA !== prioB) return prioA - prioB;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      // Criar mapa de posições
      const posicoes: Record<string, number> = {};
      ordenada.forEach((c, index) => {
        if (criancaIds.includes(c.id)) {
          posicoes[c.id] = index + 1;
        }
      });

      return posicoes;
    },
    enabled: criancaIds.length > 0,
    staleTime: 30000,
  });
};

// Get children for the logged-in responsavel
export const useMinhasCriancas = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["minhas-criancas", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("criancas")
        .select(`
          *,
          cmei_atual:cmeis!criancas_cmei_atual_id_fkey(nome, endereco, telefone),
          turma_atual:turmas!criancas_turma_atual_id_fkey(nome, turno),
          cmei1:cmeis!criancas_cmei1_preferencia_fkey(nome),
          cmei2:cmeis!criancas_cmei2_preferencia_fkey(nome),
          cmei3:cmeis!criancas_cmei3_preferencia_fkey(nome),
          cmei_remanejamento:cmeis!criancas_cmei_remanejamento_id_fkey(nome)
        `)
        .eq("responsavel_user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

// Get historico for a specific child
export const useHistoricoCrianca = (criancaId: string | undefined) => {
  return useQuery({
    queryKey: ["historico-crianca", criancaId],
    queryFn: async () => {
      if (!criancaId) return [];

      const { data, error } = await supabase
        .from("historico")
        .select(`
          *,
          cmei_anterior_nome:cmeis!historico_cmei_anterior_fkey(nome),
          cmei_novo_nome:cmeis!historico_cmei_novo_fkey(nome),
          turma_anterior_nome:turmas!historico_turma_anterior_fkey(nome),
          turma_novo_nome:turmas!historico_turma_novo_fkey(nome)
        `)
        .eq("crianca_id", criancaId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!criancaId,
  });
};

// Get statistics for responsavel dashboard
export const useResponsavelStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["responsavel-stats", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get all children
      const { data: criancas, error } = await supabase
        .from("criancas")
        .select("status")
        .eq("responsavel_user_id", user.id);

      if (error) throw error;

      const totalInscricoes = criancas?.length || 0;
      const matriculadas = criancas?.filter(
        (c) => c.status === "Matriculado" || c.status === "Matriculada"
      ).length || 0;
      const filaEspera = criancas?.filter(
        (c) => c.status === "Fila de Espera"
      ).length || 0;
      const convocadas = criancas?.filter(
        (c) => c.status === "Convocado"
      ).length || 0;

      return {
        totalInscricoes,
        matriculadas,
        filaEspera,
        convocadas,
      };
    },
    enabled: !!user,
  });
};

// Get turmas disponíveis para matrícula
export const useTurmasDisponiveis = (cmeiId: string | undefined, idadeMeses: number) => {
  return useQuery({
    queryKey: ["turmas-disponiveis", cmeiId, idadeMeses],
    queryFn: async () => {
      if (!cmeiId) return [];

      // Calcular idade em anos para filtrar turmas apropriadas
      const idadeAnos = Math.floor(idadeMeses / 12);

      const { data: turmas, error } = await supabase
        .from("turmas")
        .select(`
          *,
          criancas:criancas!criancas_turma_atual_id_fkey(id)
        `)
        .eq("cmei_id", cmeiId)
        .eq("ativo", true)
        .lte("idade_minima", idadeAnos)
        .gte("idade_maxima", idadeAnos);

      if (error) throw error;

      // Calcular vagas disponíveis
      return turmas.map((turma) => {
        const ocupadas = turma.criancas?.length || 0;
        const disponiveis = (turma.capacidade || 0) - ocupadas;
        
        return {
          ...turma,
          vagas_ocupadas: ocupadas,
          vagas_disponiveis: disponiveis,
          tem_vaga: disponiveis > 0,
        };
      }).filter((turma) => turma.tem_vaga);
    },
    enabled: !!cmeiId,
  });
};

// Aceitar convocação e matricular
export const useAceitarConvocacao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      criancaId, 
      cmeiId, 
      turmaId 
    }: { 
      criancaId: string; 
      cmeiId: string; 
      turmaId: string;
    }) => {
      await exigirDocumentacaoObrigatoriaCompleta(
        criancaId,
        "Complete a documentação antes de efetivar a matrícula.",
      );

      const { data: publicConfigData, error: publicConfigError } = await supabase.rpc("get_public_configuracoes");
      if (publicConfigError) throw publicConfigError;
      const publicConfig: any = Array.isArray(publicConfigData) ? publicConfigData[0] : publicConfigData;
      const comprovacaoNaInscricao = publicConfig?.prioridades_comprovacao_na_inscricao ?? true;

      if (!comprovacaoNaInscricao) {
        const { data: prioridades, error: prioridadesError } = await supabase
          .from("crianca_prioridades")
          .select("status,documento_comprovante_url,prioridade:tipos_prioridade(exige_documento)")
          .eq("crianca_id", criancaId);
        if (prioridadesError) throw prioridadesError;

        const pendentes = (prioridades || []).filter((p: any) => {
          const exige = !!p?.prioridade?.exige_documento;
          if (!exige) return false;
          const aprovado = p?.status === "aprovado";
          const temUrl = !!p?.documento_comprovante_url;
          return !aprovado || !temUrl;
        }).length;

        if (pendentes > 0) {
          throw new Error(
            `Existem ${pendentes} comprovação(ões) de prioridade pendente(s). Envie os comprovantes e aguarde aprovação antes de efetivar a matrícula.`,
          );
        }
      }

      // Atualizar status da criança
      const { data: crianca, error: updateError } = await supabase
        .from("criancas")
        .update({
          status: "Matriculado",
          cmei_atual_id: cmeiId,
          turma_atual_id: turmaId,
          convocacao_deadline: null,
          data_convocacao: null,
        })
        .eq("id", criancaId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Registrar no histórico
      await supabase.from("historico").insert({
        crianca_id: criancaId,
        acao: "Matrícula Efetivada",
        descricao: "Responsável aceitou a convocação e efetivou a matrícula",
        status_anterior: "Convocado",
        status_novo: "Matriculado",
        cmei_novo: cmeiId,
        turma_novo: turmaId,
      });

      // Enviar notificação
      try {
        await supabase.functions.invoke('enviar-notificacao', {
          body: {
            crianca_id: criancaId,
            tipo: 'matricula',
            dados_adicionais: {
              cmei_id: cmeiId,
              turma_id: turmaId,
              confirmada_pelo_responsavel: true,
            },
          },
        });
        console.log('Notificação de matrícula enviada com sucesso');
      } catch (notifError) {
        console.error('Erro ao enviar notificação:', notifError);
        // Não falhar a operação se a notificação falhar
      }

      return crianca;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["minhas-criancas"] });
      queryClient.invalidateQueries({ queryKey: ["responsavel-stats"] });
      toast.success("Matrícula efetivada com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao efetivar matrícula: " + error.message);
    },
  });
};

// Recusar convocação
export const useRecusarConvocacao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      criancaId, 
      motivo 
    }: { 
      criancaId: string; 
      motivo?: string;
    }) => {
      // Atualizar status da criança
      const { data: crianca, error: updateError } = await supabase
        .from("criancas")
        .update({
          status: "Fila de Espera",
          convocacao_deadline: null,
          data_convocacao: null,
        })
        .eq("id", criancaId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Registrar no histórico
      await supabase.from("historico").insert({
        crianca_id: criancaId,
        acao: "Convocação Recusada",
        descricao: "Responsável recusou a convocação",
        justificativa: motivo || null,
        status_anterior: "Convocado",
        status_novo: "Fila de Espera",
      });

      return crianca;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["minhas-criancas"] });
      queryClient.invalidateQueries({ queryKey: ["responsavel-stats"] });
      toast.success("Convocação recusada. A criança voltou para a fila de espera.");
    },
    onError: (error: any) => {
      toast.error("Erro ao recusar convocação: " + error.message);
    },
  });
};

// Solicitar remanejamento (para crianças matriculadas)
// A criança CONTINUA MATRICULADA mas entra na fila com prioridade MÁXIMA
export const useSolicitarRemanejamentoResponsavel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      criancaId,
      cmeiDestinoId,
      justificativa,
    }: { 
      criancaId: string;
      cmeiDestinoId: string;
      justificativa: string;
    }) => {
      // Buscar dados atuais da criança
      const { data: criancaAtual, error: fetchError } = await supabase
        .from("criancas")
        .select("status, cmei_atual_id, cmei_remanejamento_id, programas_sociais")
        .eq("id", criancaId)
        .single();

      if (fetchError) throw fetchError;

      if (criancaAtual.status !== "Matriculado" && criancaAtual.status !== "Matriculada") {
        throw new Error("Apenas crianças matriculadas podem solicitar remanejamento");
      }

      if (criancaAtual.cmei_remanejamento_id) {
        throw new Error("Já existe uma solicitação de remanejamento pendente");
      }

      // Atualizar criança com solicitação de remanejamento
      // IMPORTANTE: Status CONTINUA como Matriculado, apenas define o CMEI de destino
      // A criança aparecerá na fila com prioridade "Remanejamento" (máxima)
      const { data: crianca, error: updateError } = await supabase
        .from("criancas")
        .update({
          cmei_remanejamento_id: cmeiDestinoId,
          justificativa_remanejamento: justificativa,
          prioridade: "Remanejamento",
          // NÃO MUDA O STATUS - continua Matriculado
        })
        .eq("id", criancaId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Recalcular posições da fila para incluir a criança com prioridade máxima
      await supabase.rpc("recalcular_posicoes_fila");

      // Registrar no histórico
      await supabase.from("historico").insert({
        crianca_id: criancaId,
        acao: "Remanejamento Solicitado",
        descricao: "Responsável solicitou remanejamento para outra unidade. Criança continua matriculada e aguarda vaga na fila com prioridade máxima.",
        justificativa: justificativa,
        status_anterior: criancaAtual.status,
        status_novo: criancaAtual.status, // Mantém o mesmo status
        cmei_anterior: criancaAtual.cmei_atual_id,
        cmei_novo: cmeiDestinoId,
      });

      // Enviar notificação para o responsável sobre a solicitação
      try {
        await supabase.functions.invoke('enviar-notificacao', {
          body: {
            crianca_id: criancaId,
            tipo: 'remanejamento_solicitado',
            dados_adicionais: {
              cmei_destino_id: cmeiDestinoId,
              justificativa: justificativa,
              solicitado_por: 'responsavel',
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
      queryClient.invalidateQueries({ queryKey: ["minhas-criancas"] });
      queryClient.invalidateQueries({ queryKey: ["responsavel-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-fila"] });
      queryClient.invalidateQueries({ queryKey: ["remanejamentos-aguardando"] });
      toast.success("Solicitação de remanejamento enviada! Você continua matriculado e aguarda vaga na fila.");
    },
    onError: (error: any) => {
      toast.error("Erro ao solicitar remanejamento: " + error.message);
    },
  });
};

// Cancelar solicitação de remanejamento
export const useCancelarRemanejamentoResponsavel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ criancaId }: { criancaId: string }) => {
      // Buscar dados atuais
      const { data: criancaAtual, error: fetchError } = await supabase
        .from("criancas")
        .select("cmei_atual_id, cmei_remanejamento_id, status, programas_sociais")
        .eq("id", criancaId)
        .single();

      if (fetchError) throw fetchError;

      // Cancelar remanejamento - volta prioridade para Social ou Geral
      const novaPrioridade = criancaAtual.programas_sociais ? "Social" : "Geral";
      
      const { data: crianca, error: updateError } = await supabase
        .from("criancas")
        .update({
          cmei_remanejamento_id: null,
          justificativa_remanejamento: null,
          prioridade: novaPrioridade,
          // NÃO MUDA O STATUS - continua como estava
        })
        .eq("id", criancaId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Registrar no histórico
      await supabase.from("historico").insert({
        crianca_id: criancaId,
        acao: "Remanejamento Cancelado",
        descricao: "Responsável cancelou a solicitação de remanejamento",
        status_anterior: criancaAtual.status,
        status_novo: criancaAtual.status, // Mantém o mesmo status
      });

      return crianca;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["minhas-criancas"] });
      queryClient.invalidateQueries({ queryKey: ["responsavel-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-fila"] });
      queryClient.invalidateQueries({ queryKey: ["remanejamentos-aguardando"] });
      toast.success("Solicitação de remanejamento cancelada.");
    },
    onError: (error: any) => {
      toast.error("Erro ao cancelar remanejamento: " + error.message);
    },
  });
};

// Get notificações enviadas para o responsável
export const useNotificacoesResponsavel = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notificacoes-responsavel", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Primeiro buscar os IDs das crianças do responsável
      const { data: criancas, error: criancasError } = await supabase
        .from("criancas")
        .select("id")
        .eq("responsavel_user_id", user.id);

      if (criancasError) throw criancasError;
      
      if (!criancas || criancas.length === 0) return [];

      const criancaIds = criancas.map(c => c.id);

      // Buscar notificações dessas crianças
      const { data, error } = await supabase
        .from("notificacoes_log")
        .select("id, tipo, canal, status, created_at, destinatario_nome, payload")
        .in("crianca_id", criancaIds)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

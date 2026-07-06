import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { differenceInYears } from "date-fns";
import { determinarTurmaBaseTransicao } from "@/utils/turma-utils";

// Tipos
export interface CriancaTransicao {
  id: string;
  nome: string;
  data_nascimento: string;
  status: string;
  cmei_atual_id: string | null;
  turma_atual_id: string | null;
  cmei_atual?: { nome: string } | null;
  turma_atual?: { nome: string; turma_base: string } | null;
  idade_meses: number;
  idade_anos_corte: number;
  turma_sugerida?: string;
  acao_sugerida: 'promover' | 'manter' | 'concluir';
}

export interface PlanejamentoTransicao {
  crianca_id: string;
  acao: 'promover' | 'manter' | 'concluir' | 'desistente' | 'transferir' | 'remanejar';
  turma_destino_id?: string;
  cmei_destino_id?: string;
  justificativa?: string;
}

export interface PlanejamentoTransicaoDb {
  id: string;
  crianca_id: string;
  ano_referencia: number;
  acao: string;
  justificativa: string | null;
  turma_destino_id: string | null;
  cmei_destino_id: string | null;
  status: string;
  created_at: string;
}

// Calcular idade em anos completos na data de corte (31/03 do ano alvo)
const calcularIdadeAnosNaDataCorte = (dataNascimento: string, anoAlvo: number, mesCorte = 3, diaCorte = 31): number => {
  const nascimento = new Date(dataNascimento);
  const dataCorte = new Date(anoAlvo, mesCorte - 1, diaCorte); // mesCorte - 1 pq mês é 0-indexed
  
  return differenceInYears(dataCorte, nascimento);
};

// Calcular idade em meses na data de corte (para estatísticas)
const calcularIdadeMesesNaDataCorte = (dataNascimento: string, anoAlvo: number, mesCorte = 3, diaCorte = 31): number => {
  const nascimento = new Date(dataNascimento);
  const dataCorte = new Date(anoAlvo, mesCorte - 1, diaCorte);
  
  const diffMeses = (dataCorte.getFullYear() - nascimento.getFullYear()) * 12 
    + (dataCorte.getMonth() - nascimento.getMonth());
  
  return diffMeses;
};

// Hook para buscar crianças matriculadas com dados de transição
export const useCriancasParaTransicao = (anoAlvo: number) => {
  return useQuery({
    queryKey: ["criancas-transicao", anoAlvo],
    queryFn: async () => {
      // Buscar configurações do sistema para saber idade máxima e data de corte
      const { data: config } = await supabase
        .from("configuracoes_sistema")
        .select("idade_maxima_anos, data_corte_dia, data_corte_mes")
        .single();
      
      const idadeMaxima = config?.idade_maxima_anos ?? 3;
      const dataCorteDia = config?.data_corte_dia ?? 31;
      const dataCorteMes = config?.data_corte_mes ?? 3;

      const { data, error } = await supabase
        .from("criancas")
        .select(`
          id,
          nome,
          data_nascimento,
          status,
          cmei_atual_id,
          turma_atual_id,
          cmei_atual:cmeis!criancas_cmei_atual_id_fkey(nome, tipo_unidade),
          turma_atual:turmas!criancas_turma_atual_id_fkey(nome, turma_base)
        `)
        .in("status", ["Matriculado", "Matriculada"])
        .order("nome");

      if (error) throw error;

      // Processar dados
      const criancasProcessadas: CriancaTransicao[] = ((data as any[]) || [])
        .filter((crianca: any) => (crianca.cmei_atual?.tipo_unidade || "cmei_creche") === "cmei_creche")
        .map((crianca: any) => {
        const idadeAnosCorte = calcularIdadeAnosNaDataCorte(crianca.data_nascimento, anoAlvo, dataCorteMes, dataCorteDia);
        const idadeMeses = calcularIdadeMesesNaDataCorte(crianca.data_nascimento, anoAlvo, dataCorteMes, dataCorteDia);
        
        // Determinar turma sugerida para o próximo ano
        const turmaSugerida = determinarTurmaBaseTransicao(idadeAnosCorte, idadeMaxima);
        const turmaBase = (crianca.turma_atual as any)?.turma_base || '';

        // Determinar ação sugerida
        let acaoSugerida: 'promover' | 'manter' | 'concluir' = 'manter';
        
        // Usar idade máxima configurada no sistema (padrão 5 se não configurado)
        if (idadeAnosCorte > idadeMaxima) {
          // Criança excedeu idade máxima na data de corte - concluinte
          acaoSugerida = 'concluir';
        } else if (turmaSugerida !== turmaBase) {
          // Turma diferente - promover
          acaoSugerida = 'promover';
        }

        return {
          id: crianca.id,
          nome: crianca.nome,
          data_nascimento: crianca.data_nascimento,
          status: crianca.status,
          cmei_atual_id: crianca.cmei_atual_id,
          turma_atual_id: crianca.turma_atual_id,
          cmei_atual: crianca.cmei_atual,
          turma_atual: crianca.turma_atual,
          idade_meses: idadeMeses,
          idade_anos_corte: idadeAnosCorte,
          turma_sugerida: turmaSugerida,
          acao_sugerida: acaoSugerida,
        };
      });

      return criancasProcessadas;
    },
  });
};

// Hook para buscar turmas disponíveis por CMEI
export const useTurmasDisponiveisPorCMEI = () => {
  return useQuery({
    queryKey: ["turmas-disponiveis-transicao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("turmas")
        .select(`
          id,
          nome,
          turma_base,
          cmei_id,
          capacidade,
          cmei:cmeis!turmas_cmei_id_fkey(nome)
        `)
        .eq("ativo", true)
        .order("turma_base");

      if (error) throw error;
      return data;
    },
  });
};

// Hook para buscar planejamento salvo do banco
export const usePlanejamentoTransicao = (anoReferencia: number) => {
  return useQuery({
    queryKey: ["planejamento-transicao", anoReferencia],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planejamento_transicao")
        .select("*")
        .eq("ano_referencia", anoReferencia)
        .eq("status", "planejado");

      if (error) throw error;
      
      // Converter para Map
      const planejamentoMap = new Map<string, PlanejamentoTransicao>();
      (data || []).forEach((item: PlanejamentoTransicaoDb) => {
        planejamentoMap.set(item.crianca_id, {
          crianca_id: item.crianca_id,
          acao: item.acao as PlanejamentoTransicao['acao'],
          turma_destino_id: item.turma_destino_id || undefined,
          cmei_destino_id: item.cmei_destino_id || undefined,
          justificativa: item.justificativa || undefined,
        });
      });
      
      return planejamentoMap;
    },
  });
};

// Hook para salvar planejamento no banco
export const useSalvarPlanejamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planejamentos, anoReferencia }: { planejamentos: PlanejamentoTransicao[], anoReferencia: number }) => {
      // Primeiro, remove planejamentos anteriores do mesmo ano que vão ser atualizados
      const criancaIds = planejamentos.map(p => p.crianca_id);
      
      if (criancaIds.length > 0) {
        await supabase
          .from("planejamento_transicao")
          .delete()
          .eq("ano_referencia", anoReferencia)
          .eq("status", "planejado")
          .in("crianca_id", criancaIds);
      }

      // Filtra apenas planejamentos com ação diferente de 'manter'
      const planejamentosParaSalvar = planejamentos.filter(p => p.acao !== 'manter');
      
      if (planejamentosParaSalvar.length === 0) {
        return { salvos: 0 };
      }

      // Insere novos planejamentos
      const { error } = await supabase
        .from("planejamento_transicao")
        .insert(
          planejamentosParaSalvar.map(p => ({
            crianca_id: p.crianca_id,
            ano_referencia: anoReferencia,
            acao: p.acao,
            turma_destino_id: p.turma_destino_id || null,
            cmei_destino_id: p.cmei_destino_id || null,
            justificativa: p.justificativa || null,
            status: "planejado",
          }))
        );

      if (error) throw error;
      
      return { salvos: planejamentosParaSalvar.length };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["planejamento-transicao", variables.anoReferencia] });
      toast.success(`Planejamento salvo com sucesso! ${result.salvos} registros salvos.`);
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar planejamento: " + error.message);
    },
  });
};

// Hook para limpar planejamento do banco
export const useLimparPlanejamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (anoReferencia: number) => {
      const { error } = await supabase
        .from("planejamento_transicao")
        .delete()
        .eq("ano_referencia", anoReferencia)
        .eq("status", "planejado");

      if (error) throw error;
    },
    onSuccess: (_, anoReferencia) => {
      queryClient.invalidateQueries({ queryKey: ["planejamento-transicao", anoReferencia] });
      toast.success("Planejamento limpo com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao limpar planejamento: " + error.message);
    },
  });
};

// Hook para aplicar transição em massa
export const useAplicarTransicao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planejamentos, anoReferencia }: { planejamentos: PlanejamentoTransicao[], anoReferencia: number }) => {
      const getDestinoGovernanca = async (cmeiId?: string) => {
        if (!cmeiId) {
          return { modulo_gestor: "vagou", ignorar_automacoes_vagou: false };
        }

        const { data: unidade, error } = await supabase
          .from("cmeis")
          .select("tipo_unidade")
          .eq("id", cmeiId)
          .maybeSingle();

        if (error) throw error;

        const isEscola = (unidade?.tipo_unidade || "cmei_creche") === "escola";
        return {
          modulo_gestor: isEscola ? "sam_sondar" : "vagou",
          ignorar_automacoes_vagou: isEscola,
        };
      };

      const resultados = {
        promovidos: 0,
        concluintes: 0,
        mantidos: 0,
        desistentes: 0,
        remanejados: 0,
        transferidos: 0,
        erros: 0,
      };

      for (const planejamento of planejamentos) {
        try {
          if (planejamento.acao === 'concluir') {
            // Marcar como concluinte
            const { error } = await supabase
              .from("criancas")
              .update({
                status: "Concluinte",
                cmei_atual_id: null,
                turma_atual_id: null,
              })
              .eq("id", planejamento.crianca_id);

            if (error) throw error;

            // Registrar histórico
            await supabase.from("historico").insert({
              crianca_id: planejamento.crianca_id,
              acao: "Transição Anual - Conclusão",
              descricao: "Criança marcada como concluinte na transição anual",
              status_anterior: "Matriculado",
              status_novo: "Concluinte",
              justificativa: planejamento.justificativa || "Transição anual automática",
            });

            resultados.concluintes++;
          } else if (planejamento.acao === 'desistente') {
            // Marcar como desistente
            const { error } = await supabase
              .from("criancas")
              .update({
                status: "Desistente",
                cmei_atual_id: null,
                turma_atual_id: null,
              })
              .eq("id", planejamento.crianca_id);

            if (error) throw error;

            await supabase.from("historico").insert({
              crianca_id: planejamento.crianca_id,
              acao: "Transição Anual - Desistência",
              descricao: "Criança marcada como desistente na transição anual",
              status_anterior: "Matriculado",
              status_novo: "Desistente",
              justificativa: planejamento.justificativa || "Transição anual",
            });

            resultados.desistentes++;
          } else if (planejamento.acao === 'transferir') {
            // Marcar como transferido
            const { error } = await supabase
              .from("criancas")
              .update({
                status: "Transferido",
                cmei_atual_id: null,
                turma_atual_id: null,
              })
              .eq("id", planejamento.crianca_id);

            if (error) throw error;

            await supabase.from("historico").insert({
              crianca_id: planejamento.crianca_id,
              acao: "Transição Anual - Transferência",
              descricao: "Criança transferida para outra instituição na transição anual",
              status_anterior: "Matriculado",
              status_novo: "Transferido",
              justificativa: planejamento.justificativa || "Transição anual",
            });

            resultados.transferidos++;
          } else if (planejamento.acao === 'remanejar' && planejamento.turma_destino_id) {
            // Buscar turma atual para histórico
            const { data: crianca } = await supabase
              .from("criancas")
              .select("turma_atual_id, cmei_atual_id")
              .eq("id", planejamento.crianca_id)
              .single();

            const destinoGovernanca = await getDestinoGovernanca(planejamento.cmei_destino_id);

            // Remanejar para outro CMEI/turma
            const { error } = await supabase
              .from("criancas")
              .update({
                turma_atual_id: planejamento.turma_destino_id,
                cmei_atual_id: planejamento.cmei_destino_id,
                modulo_gestor: destinoGovernanca.modulo_gestor,
                ignorar_automacoes_vagou: destinoGovernanca.ignorar_automacoes_vagou,
              })
              .eq("id", planejamento.crianca_id);

            if (error) throw error;

            await supabase.from("historico").insert({
              crianca_id: planejamento.crianca_id,
              acao: "Transição Anual - Remanejamento",
              descricao: "Criança remanejada para outra unidade na transição anual",
              turma_anterior: crianca?.turma_atual_id,
              turma_novo: planejamento.turma_destino_id,
              cmei_anterior: crianca?.cmei_atual_id,
              cmei_novo: planejamento.cmei_destino_id,
              justificativa: planejamento.justificativa || "Remanejamento na transição anual",
            });

            resultados.remanejados++;
          } else if (planejamento.acao === 'promover' && planejamento.turma_destino_id) {
            // Buscar turma atual para histórico
            const { data: crianca } = await supabase
              .from("criancas")
              .select("turma_atual_id, cmei_atual_id")
              .eq("id", planejamento.crianca_id)
              .single();

            const destinoCmeiId = planejamento.cmei_destino_id || crianca?.cmei_atual_id || undefined;
            const destinoGovernanca = await getDestinoGovernanca(destinoCmeiId);

            // Promover para nova turma
            const { error } = await supabase
              .from("criancas")
              .update({
                turma_atual_id: planejamento.turma_destino_id,
                cmei_atual_id: destinoCmeiId,
                modulo_gestor: destinoGovernanca.modulo_gestor,
                ignorar_automacoes_vagou: destinoGovernanca.ignorar_automacoes_vagou,
              })
              .eq("id", planejamento.crianca_id);

            if (error) throw error;

            await supabase.from("historico").insert({
              crianca_id: planejamento.crianca_id,
              acao: "Transição Anual - Promoção",
              descricao: "Criança promovida para nova turma na transição anual",
              turma_anterior: crianca?.turma_atual_id,
              turma_novo: planejamento.turma_destino_id,
              cmei_anterior: crianca?.cmei_atual_id,
              cmei_novo: destinoCmeiId,
              justificativa: planejamento.justificativa || "Transição anual automática",
            });

            resultados.promovidos++;
          } else {
            resultados.mantidos++;
          }

          // Atualizar status do planejamento para 'aplicado'
          await supabase
            .from("planejamento_transicao")
            .update({
              status: "aplicado",
              aplicado_em: new Date().toISOString(),
            })
            .eq("crianca_id", planejamento.crianca_id)
            .eq("ano_referencia", anoReferencia);

        } catch (error) {
          console.error(`Erro ao processar criança ${planejamento.crianca_id}:`, error);
          resultados.erros++;
        }
      }

      return resultados;
    },
    onSuccess: (resultados, variables) => {
      queryClient.invalidateQueries({ queryKey: ["criancas-transicao"] });
      queryClient.invalidateQueries({ queryKey: ["admin-criancas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["planejamento-transicao", variables.anoReferencia] });
      
      toast.success(
        `Transição aplicada!\n` +
        `Promovidos: ${resultados.promovidos}\n` +
        `Remanejados: ${resultados.remanejados}\n` +
        `Concluintes: ${resultados.concluintes}\n` +
        `Transferidos: ${resultados.transferidos}\n` +
        `Desistentes: ${resultados.desistentes}\n` +
        `Mantidos: ${resultados.mantidos}\n` +
        (resultados.erros > 0 ? `Erros: ${resultados.erros}` : ''),
        { duration: 5000 }
      );
    },
    onError: (error: any) => {
      toast.error("Erro ao aplicar transição: " + error.message);
    },
  });
};

// Estatísticas de transição
export const useEstatisticasTransicao = (anoAlvo: number) => {
  return useQuery({
    queryKey: ["estatisticas-transicao", anoAlvo],
    queryFn: async () => {
      // Buscar configurações do sistema
      const { data: config } = await supabase
        .from("configuracoes_sistema")
        .select("idade_maxima_anos, data_corte_dia, data_corte_mes")
        .single();
      
      const idadeMaxima = config?.idade_maxima_anos ?? 3;
      const dataCorteDia = config?.data_corte_dia ?? 31;
      const dataCorteMes = config?.data_corte_mes ?? 3;

      const { data, error } = await supabase
        .from("criancas")
        .select("id, data_nascimento, turma_atual_id, cmei_atual:cmeis!criancas_cmei_atual_id_fkey(tipo_unidade), turmas!criancas_turma_atual_id_fkey(turma_base)")
        .in("status", ["Matriculado", "Matriculada"]);

      if (error) throw error;

      let promover = 0;
      let concluir = 0;
      let manter = 0;

      (data || []).forEach((crianca: any) => {
        if ((crianca.cmei_atual?.tipo_unidade || "cmei_creche") !== "cmei_creche") {
          return;
        }
        const idadeAnosCorte = calcularIdadeAnosNaDataCorte(crianca.data_nascimento, anoAlvo, dataCorteMes, dataCorteDia);
        const turmaBase = (crianca.turmas as any)?.turma_base || '';
        const turmaSugerida = determinarTurmaBaseTransicao(idadeAnosCorte, idadeMaxima);

        if (idadeAnosCorte > idadeMaxima) {
          concluir++;
        } else if (turmaSugerida !== turmaBase) {
          promover++;
        } else {
          manter++;
        }
      });

      return {
        total: (data || []).filter((crianca: any) => (crianca.cmei_atual?.tipo_unidade || "cmei_creche") === "cmei_creche").length,
        promover,
        concluir,
        manter,
      };
    },
  });
};

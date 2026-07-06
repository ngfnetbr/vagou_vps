import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/error-utils";
import { getCmeiCrecheIds } from "./cmei-tipo-filter";

// Types
export interface CMEI {
  id: string;
  nome: string;
  tipo_unidade?: "cmei_creche" | "escola" | null;
  tipo_gestao?: "municipal" | "privado" | null;
  capacidade_total?: number | null;
  endereco: string | null;
  bairro: string | null;
  telefone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  ativo: boolean;
}

export type TurmaResponsavel = {
  nome: string;
  turno: string;
};

export interface Turma {
  id: string;
  cmei_id: string;
  nome: string;
  turma_base: string;
  capacidade: number;
  idade_minima: number | null;
  idade_maxima: number | null;
  turno: string | null;
  ativo: boolean;
  professores?: TurmaResponsavel[];
  auxiliares?: TurmaResponsavel[];
}

export interface Crianca {
  id: string;
  nome: string;
  data_nascimento: string;
  cpf_crianca: string | null;
  sexo: "Masculino" | "Feminino";
  responsavel_nome: string;
  responsavel_cpf: string;
  responsavel_email: string | null;
  responsavel_telefone: string;
  status: string;
  posicao_fila: number | null;
  prioridade: "Social" | "Geral";
  programas_sociais: boolean;
  cmei_atual_id: string | null;
  turma_atual_id: string | null;
  convocacao_deadline: string | null;
  cmei1_preferencia: string | null;
  cmei2_preferencia: string | null;
  aceita_qualquer_cmei: boolean;
}

export interface InscricaoData {
  // Dados da criança
  nome: string;
  data_nascimento: string;
  cpf_crianca?: string;
  sexo: "Masculino" | "Feminino";
  certidao_nascimento?: string;
  cor_raca_autodeclarada: "amarela" | "branca" | "indigena" | "parda" | "preta" | "nao_declarada";
  cor_raca_certidao: "amarela" | "branca" | "indigena" | "parda" | "preta" | "nao_declarada";
  etnia_indigena?: "guarani" | "kaingang" | "xeta" | "xokleng" | "outra";
  etnia_indigena_outra?: string;
  quilombo_remanescente: boolean;
  quilombo_nome?: string;
  nacionalidade: "brasileira" | "brasileira_naturalizado" | "estrangeira";
  estrangeiro_possui_documentos?: boolean;
  nis?: string;
  
  // Dados do responsável
  responsavel_nome: string;
  responsavel_cpf: string;
  responsavel_rg?: string;
  responsavel_parentesco:
    | "pai"
    | "mae"
    | "avo"
    | "avoa"
    | "tio"
    | "tia"
    | "padrasto"
    | "madrasta"
    | "irmao"
    | "irma"
    | "tutor_legal"
    | "guardiao"
    | "outro";
  responsavel_parentesco_outro?: string;
  responsavel_email?: string;
  responsavel_telefone: string;
  responsavel_celular?: string;
  responsavel_telefone_comercial?: string;
  responsavel_user_id?: string;
  canal_notificacao_preferido?: "whatsapp" | "sms" | "email";
  filiacao1_nao_declarada: boolean;
  filiacao1_nome?: string;
  filiacao1_rg?: string;
  filiacao1_cpf?: string;
  filiacao1_email?: string;
  filiacao1_celular?: string;
  filiacao1_telefone_comercial?: string;
  filiacao2_nao_declarada: boolean;
  filiacao2_nome?: string;
  filiacao2_rg?: string;
  filiacao2_cpf?: string;
  filiacao2_email?: string;
  filiacao2_celular?: string;
  filiacao2_telefone_comercial?: string;
  
  // Endereço
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  zona_atendimento_id?: string | null;
  unidade_consumidora: string;
  forma_ocupacao_moradia:
    | "optou_nao_informar"
    | "propria"
    | "alugada"
    | "cedida"
    | "pensionato"
    | "casa_lar_abrigo"
    | "outro";
  forma_ocupacao_moradia_outro?: string;
  
  // Preferências
  cmei1_preferencia?: string;
  cmei2_preferencia?: string;
  cmei3_preferencia?: string;
  aceita_qualquer_cmei: boolean;
  programas_sociais: boolean;
  
  // Observações
  observacoes?: string;
}

// CMEIs Hooks
export const useCMEIs = (options?: { tipoUnidade?: "cmei_creche" | "escola" | "all" }) => {
  const tipoUnidade = options?.tipoUnidade || "cmei_creche";
  return useQuery({
    queryKey: ["cmeis", tipoUnidade],
    queryFn: async () => {
      let timeoutId: number | undefined;
      try {
        const result = (await Promise.race([
          (() => {
            let q: any = supabase
              .from("cmeis")
              .select("*")
              .eq("ativo", true)
              .order("nome");
            if (tipoUnidade !== "all") q = q.eq("tipo_unidade", tipoUnidade);
            return q;
          })(),
          new Promise<never>((_, reject) => {
            timeoutId = window.setTimeout(() => reject(new Error("Request timeout")), 15000);
          }),
        ])) as { data: CMEI[] | null; error: unknown | null };

        if (timeoutId) window.clearTimeout(timeoutId);
        if (result.error) throw result.error;
        return (result.data || []) as CMEI[];
      } catch (err) {
        if (timeoutId) window.clearTimeout(timeoutId);
        throw err;
      }
    },
    staleTime: 60000, // Cache por 1 minuto
    gcTime: 300000, // Manter em cache por 5 minutos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    networkMode: 'always', // Forçar fetch mesmo se parece offline (iOS bug)
  });
};

// Turmas Hooks
export const useTurmas = (cmeiId?: string) => {
  return useQuery({
    queryKey: ["turmas", cmeiId],
    queryFn: async () => {
      let query = supabase
        .from("turmas")
        .select("*")
        .eq("ativo", true);
      
      if (cmeiId) {
        query = query.eq("cmei_id", cmeiId);
      }
      
      const { data: turmas, error } = await query.order("nome");
      
      if (error) throw error;
      
      const turmaIds = (turmas || []).map((t) => t.id).filter(Boolean);
      const counts: Record<string, number> = {};

      if (turmaIds.length > 0) {
        const { data: criancas, error: criancasError } = await supabase
          .from("criancas")
          .select("turma_atual_id")
          .in("status", ["Matriculado", "Matriculada", "Convocado", "Aguardando Documentação"])
          .in("turma_atual_id", turmaIds);

        if (criancasError) throw criancasError;

        (criancas || []).forEach((c) => {
          if (c.turma_atual_id) {
            counts[c.turma_atual_id] = (counts[c.turma_atual_id] || 0) + 1;
          }
        });
      }

      return (turmas || []).map((turma) => ({
        ...turma,
        ocupados: counts[turma.id] || 0,
      })) as (Turma & { ocupados: number })[];
    },
  });
};

// Ocupação por CMEI - Usa RPC SECURITY DEFINER para funcionar sem autenticação
export const useOcupacaoCMEIs = () => {
  return useQuery({
    queryKey: ["ocupacao-cmeis"],
    queryFn: async () => {
      const [{ data, error }, crecheIds] = await Promise.all([
        supabase.rpc('get_ocupacao_cmeis'),
        getCmeiCrecheIds(),
      ]);

      if (error) throw error;

      const results = ((data || []) as Array<{
        id: string;
        nome: string;
        endereco: string | null;
        bairro: string | null;
        telefone: string | null;
        email: string | null;
        latitude: number | null;
        longitude: number | null;
        capacidade_total: number;
        ocupados: number;
        percentual: number;
      }>).filter((item) => crecheIds.has(item.id));

      return results.map((item) => ({
        id: item.id,
        nome: item.nome,
        endereco: item.endereco,
        bairro: item.bairro,
        telefone: item.telefone,
        email: item.email,
        latitude: item.latitude,
        longitude: item.longitude,
        capacidade_total: item.capacidade_total,
        ativo: true,
        ocupados: Number(item.ocupados) || 0,
        percentual: item.percentual || 0,
      }));
    },
    staleTime: 60000, // Cache por 1 minuto
    gcTime: 300000, // Manter em cache por 5 minutos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    networkMode: 'always', // Forçar fetch mesmo se parece offline (iOS bug)
  });
};

// Ocupação por Turma - Usa RPC SECURITY DEFINER para funcionar sem autenticação
export const useOcupacaoTurmas = () => {
  return useQuery({
    queryKey: ["ocupacao-turmas-public"],
    queryFn: async () => {
      const [{ data, error }, crecheIds] = await Promise.all([
        supabase.rpc('get_ocupacao_turmas'),
        getCmeiCrecheIds(),
      ]);

      if (error) throw error;

      const results = ((data || []) as Array<{
        id: string;
        nome: string;
        turma_base: string;
        turno: string;
        capacidade: number;
        ocupados: number;
        percentual: number;
        cmei_id: string;
        cmei_nome: string;
      }>).filter((item) => crecheIds.has(item.cmei_id));

      return results.map((item) => ({
        id: item.id,
        nome: item.nome,
        turma_base: item.turma_base,
        turno: item.turno,
        capacidade: item.capacidade || 0,
        ocupados: Number(item.ocupados) || 0,
        percentual: item.percentual || 0,
        cmei_id: item.cmei_id,
        cmei_nome: item.cmei_nome || "Sem unidade",
      }));
    },
    staleTime: 60000, // Cache por 1 minuto
    gcTime: 300000, // Manter em cache por 5 minutos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    networkMode: 'always', // Forçar fetch mesmo se parece offline (iOS bug)
  });
};

// Fila pública - Usa RPC get_fila_publica que é SECURITY DEFINER (funciona para usuários não autenticados)
export const useFilaPublica = (cmeiId?: string, turmaBaseNome?: string, page: number = 1, pageSize: number = 20) => {
  return useQuery({
    queryKey: ["fila-publica", cmeiId, turmaBaseNome, page, pageSize],
    queryFn: async () => {
      // Usar RPC que é SECURITY DEFINER - funciona sem autenticação
      const { data: allData, error } = await supabase.rpc('get_fila_publica');

      if (error) throw error;

      let filteredData = (allData || []) as any[];

      // Filtro por CMEI (usando os nomes retornados pelo RPC)
      if (cmeiId && cmeiId.trim() !== '') {
        filteredData = filteredData.filter((c: {
          cmei1_preferencia?: string | null;
          cmei2_preferencia?: string | null;
          cmei3_preferencia?: string | null;
          cmei_remanejamento_id?: string | null;
        }) =>
          c.cmei1_preferencia === cmeiId ||
          c.cmei2_preferencia === cmeiId ||
          c.cmei3_preferencia === cmeiId ||
          c.cmei_remanejamento_id === cmeiId
        );
      }

      // Filtro por turma base (idade)
      if (turmaBaseNome && turmaBaseNome.trim() !== '') {
        const { data: turmasBase } = await supabase
          .from("turmas_base")
          .select("*")
          .eq("ativo", true);

        if (turmasBase) {
          const turmaBase = turmasBase.find(t => t.nome === turmaBaseNome);
          if (turmaBase) {
            const hoje = new Date();
            const anoReferencia = hoje.getMonth() < 3 ? hoje.getFullYear() : hoje.getFullYear() + 1;
            const dataCorte = new Date(anoReferencia, 2, 31);
            
            const dataNascMaxima = new Date(dataCorte);
            dataNascMaxima.setMonth(dataNascMaxima.getMonth() - turmaBase.idade_minima_meses);
            
            const dataNascMinima = new Date(dataCorte);
            dataNascMinima.setMonth(dataNascMinima.getMonth() - turmaBase.idade_maxima_meses - 1);
            
            filteredData = filteredData.filter((c: { data_nascimento: string }) => {
              const dataNasc = new Date(c.data_nascimento);
              return dataNasc >= dataNascMinima && dataNasc <= dataNascMaxima;
            });
          }
        }
      }
      
      const getPosicaoParaCmei = (row: {
        cmei1_preferencia?: string | null;
        cmei2_preferencia?: string | null;
        cmei3_preferencia?: string | null;
        cmei_remanejamento_id?: string | null;
        posicao_fila?: number | null;
        posicao_fila_cmei2?: number | null;
        posicao_fila_cmei3?: number | null;
      }) => {
        if (cmeiId && row.cmei_remanejamento_id === cmeiId) return -1;
        if (cmeiId && row.cmei1_preferencia === cmeiId) return row.posicao_fila ?? null;
        if (cmeiId && row.cmei2_preferencia === cmeiId) return row.posicao_fila_cmei2 ?? null;
        if (cmeiId && row.cmei3_preferencia === cmeiId) return row.posicao_fila_cmei3 ?? null;
        return row.posicao_fila ?? row.posicao_fila_cmei2 ?? row.posicao_fila_cmei3 ?? null;
      };

      filteredData.sort((a: { status: string; created_at: string }, b: { status: string; created_at: string }) => {
        // Convocados sempre primeiro
        const aConvocado = a.status === "Convocado" ? 1 : 0;
        const bConvocado = b.status === "Convocado" ? 1 : 0;
        if (aConvocado !== bConvocado) return bConvocado - aConvocado;

        const aRemanejamento = (a as any).cmei_remanejamento_id ? 1 : 0;
        const bRemanejamento = (b as any).cmei_remanejamento_id ? 1 : 0;
        if (aRemanejamento !== bRemanejamento) return bRemanejamento - aRemanejamento;

        const posA = getPosicaoParaCmei(a as any) ?? 999999;
        const posB = getPosicaoParaCmei(b as any) ?? 999999;
        if (posA !== posB) return posA - posB;

        // Fallback: timestamp completo de cadastro (data + hora)
        const dataA = new Date(a.created_at || 0).getTime();
        const dataB = new Date(b.created_at || 0).getTime();
        return dataA - dataB;
      });

      // Paginação usando posições originais do banco
      const totalCount = filteredData.length;
      const from = (page - 1) * pageSize;
      const paginatedData = filteredData.slice(from, from + pageSize);

      return { 
        data: paginatedData, 
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      };
    },
    staleTime: 60000, // Cache por 1 minuto
    gcTime: 300000, // Manter em cache por 5 minutos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    networkMode: 'always', // Forçar fetch mesmo se parece offline (iOS bug)
  });
};

// Consultar por CPF (usando RPC pública que funciona sem autenticação)
export const useConsultaCPF = (cpf: string, enabled: boolean = false) => {
  return useQuery({
    queryKey: ["consulta-cpf", cpf],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("consulta_publica_por_cpf", { p_cpf: cpf });
      
      if (error) throw error;
      
      // Mapeia para manter compatibilidade com o formato anterior
      return (data as any[])?.map((item) => ({
        id: item.id,
        protocolo: item.protocolo ?? null,
        nome: item.nome,
        data_nascimento: item.data_nascimento,
        status: item.status,
        posicao_fila: item.posicao_fila,
        convocacao_deadline: item.convocacao_deadline,
        cmei_atual: item.cmei_atual_nome ? { nome: item.cmei_atual_nome } : null,
        turma_atual: item.turma_atual_nome ? { nome: item.turma_atual_nome } : null,
        cmei1: item.cmei1_nome ? { nome: item.cmei1_nome } : null,
        cmei2: item.cmei2_nome ? { nome: item.cmei2_nome } : null,
      })) || [];
    },
    enabled,
  });
};

export const useConsultaProtocolo = (protocolo: string, enabled: boolean = false) => {
  return useQuery({
    queryKey: ["consulta-protocolo", protocolo],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("consulta_publica_por_protocolo", { p_protocolo: protocolo });

      if (error) throw error;

      return (data as any[])?.map((item) => ({
        id: item.id,
        protocolo: item.protocolo ?? null,
        nome: item.nome,
        data_nascimento: item.data_nascimento,
        status: item.status,
        posicao_fila: item.posicao_fila,
        convocacao_deadline: item.convocacao_deadline,
        cmei_atual: item.cmei_atual_nome ? { nome: item.cmei_atual_nome } : null,
        turma_atual: item.turma_atual_nome ? { nome: item.turma_atual_nome } : null,
        cmei1: item.cmei1_nome ? { nome: item.cmei1_nome } : null,
        cmei2: item.cmei2_nome ? { nome: item.cmei2_nome } : null,
      })) || [];
    },
    enabled,
  });
};

// Stats da fila
export const useFilaStats = () => {
  return useQuery({
    queryKey: ["fila-stats"],
    queryFn: async () => {
      // Total na fila
      const { count: totalFila, error: filaError } = await supabase
        .from("criancas")
        .select("*", { count: "exact", head: true })
        .eq("status", "Fila de Espera");
      
      if (filaError) throw filaError;
      
      // Convocações este mês
      const primeiroDiaMes = new Date();
      primeiroDiaMes.setDate(1);
      primeiroDiaMes.setHours(0, 0, 0, 0);
      
      const { count: convocacoesMes, error: convError } = await supabase
        .from("criancas")
        .select("*", { count: "exact", head: true })
        .eq("status", "Convocado")
        .gte("data_convocacao", primeiroDiaMes.toISOString());
      
      if (convError) throw convError;
      
      return {
        totalFila: totalFila || 0,
        convocacoesMes: convocacoesMes || 0,
        tempoMedioEspera: 3.2, // Mock - calcular baseado em dados reais
      };
    },
  });
};

// Mutation para criar inscrição (usa RPC SECURITY DEFINER para funcionar sem autenticação)
export const useCreateInscricao = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: InscricaoData) => {
      // Limpar CPF antes de enviar
      const cpfLimpo = data.responsavel_cpf.replace(/\D/g, "");
      const cpfCriancaLimpo = data.cpf_crianca?.replace(/\D/g, "");
      const celularLimpo = data.responsavel_celular?.replace(/\D/g, "");
      const telefoneLimpo = data.responsavel_telefone.replace(/\D/g, "");
      const telefoneComercialLimpo = data.responsavel_telefone_comercial?.replace(/\D/g, "");
      const cepLimpo = data.cep?.replace(/\D/g, "");
      const nisLimpo = data.nis?.replace(/\D/g, "");
      const filiacao1CpfLimpo = data.filiacao1_cpf?.replace(/\D/g, "");
      const filiacao2CpfLimpo = data.filiacao2_cpf?.replace(/\D/g, "");
      const filiacao1CelularLimpo = data.filiacao1_celular?.replace(/\D/g, "");
      const filiacao2CelularLimpo = data.filiacao2_celular?.replace(/\D/g, "");
      const filiacao1TelComercialLimpo = data.filiacao1_telefone_comercial?.replace(/\D/g, "");
      const filiacao2TelComercialLimpo = data.filiacao2_telefone_comercial?.replace(/\D/g, "");
      
      // Usar RPC SECURITY DEFINER para contornar RLS em inscrições públicas
      const { data: criancaId, error } = await supabase.rpc('inserir_inscricao_publica', {
        p_nome: data.nome,
        p_data_nascimento: data.data_nascimento,
        p_sexo: data.sexo,
        p_responsavel_nome: data.responsavel_nome,
        p_responsavel_cpf: cpfLimpo,
        p_responsavel_telefone: telefoneLimpo,
        p_responsavel_email: data.responsavel_email || null,
        p_responsavel_celular: celularLimpo || null,
        p_responsavel_rg: data.responsavel_rg || null,
        p_responsavel_parentesco: data.responsavel_parentesco,
        p_responsavel_parentesco_outro: data.responsavel_parentesco_outro || null,
        p_responsavel_telefone_comercial: telefoneComercialLimpo || null,
        p_cpf_crianca: cpfCriancaLimpo || null,
        p_certidao_nascimento: data.certidao_nascimento || null,
        p_cor_raca_autodeclarada: data.cor_raca_autodeclarada,
        p_cor_raca_certidao: data.cor_raca_certidao,
        p_etnia_indigena: data.etnia_indigena || null,
        p_etnia_indigena_outra: data.etnia_indigena_outra || null,
        p_quilombo_remanescente: data.quilombo_remanescente,
        p_quilombo_nome: data.quilombo_nome || null,
        p_nacionalidade: data.nacionalidade,
        p_estrangeiro_possui_documentos:
          data.nacionalidade === "estrangeira" ? data.estrangeiro_possui_documentos ?? null : null,
        p_nis: nisLimpo || null,
        p_cep: cepLimpo || null,
        p_logradouro: data.logradouro || null,
        p_numero: data.numero || null,
        p_complemento: data.complemento || null,
        p_bairro: data.bairro || null,
        p_cidade: data.cidade || null,
        p_estado: data.estado || null,
        p_unidade_consumidora: data.unidade_consumidora || null,
        p_forma_ocupacao_moradia: data.forma_ocupacao_moradia,
        p_forma_ocupacao_moradia_outro: data.forma_ocupacao_moradia_outro || null,
        p_filiacao1_nao_declarada: data.filiacao1_nao_declarada === true,
        p_filiacao1_nome: data.filiacao1_nome || null,
        p_filiacao1_rg: data.filiacao1_rg || null,
        p_filiacao1_cpf: filiacao1CpfLimpo || null,
        p_filiacao1_email: data.filiacao1_email || null,
        p_filiacao1_celular: filiacao1CelularLimpo || null,
        p_filiacao1_telefone_comercial: filiacao1TelComercialLimpo || null,
        p_filiacao2_nao_declarada: data.filiacao2_nao_declarada === true,
        p_filiacao2_nome: data.filiacao2_nome || null,
        p_filiacao2_rg: data.filiacao2_rg || null,
        p_filiacao2_cpf: filiacao2CpfLimpo || null,
        p_filiacao2_email: data.filiacao2_email || null,
        p_filiacao2_celular: filiacao2CelularLimpo || null,
        p_filiacao2_telefone_comercial: filiacao2TelComercialLimpo || null,
        p_cmei1_preferencia: data.cmei1_preferencia || null,
        p_cmei2_preferencia: data.cmei2_preferencia || null,
        p_aceita_qualquer_cmei: data.aceita_qualquer_cmei || false,
        p_programas_sociais: data.programas_sociais || false,
        p_observacoes: data.observacoes || null,
        p_responsavel_user_id: data.responsavel_user_id || null,
        p_zona_atendimento_id: data.zona_atendimento_id || null,
        p_cmei3_preferencia: data.cmei3_preferencia || null,
        p_canal_notificacao_preferido: data.canal_notificacao_preferido || null,
      });
      
      if (error) throw error;

      let protocolo: string | null = null;
      try {
        const { data: fetchedProtocolo, error: protocoloError } = await supabase.rpc("get_protocolo_inscricao" as any, {
          p_id: criancaId,
        });
        if (!protocoloError) protocolo = (fetchedProtocolo as string) ?? null;
      } catch {
        // ignorar falha de consulta do protocolo
      }
      
      // Enviar notificação de inscrição na fila
      try {
        await supabase.functions.invoke('enviar-notificacao', {
          body: {
            crianca_id: criancaId,
            tipo: 'inscricao_realizada',
            origem: 'frontend_publico',
            dados_adicionais: {
              cmei1_preferencia: data.cmei1_preferencia,
              cmei2_preferencia: data.cmei2_preferencia,
              programas_sociais: data.programas_sociais,
            },
          },
        });
      } catch (notifError) {
        console.error('Erro ao enviar notificação de inscrição:', notifError);
        // Não falhar a operação se a notificação falhar
      }
      
      return { id: criancaId, protocolo };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fila-publica"] });
      queryClient.invalidateQueries({ queryKey: ["fila-stats"] });
      queryClient.invalidateQueries({ queryKey: ["minhas-criancas"] });
      queryClient.invalidateQueries({ queryKey: ["responsavel-stats"] });
      toast.success("Inscrição realizada com sucesso!");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao realizar inscrição: " + getErrorMessage(error));
    },
  });
};

// Hook para buscar ocupação das turmas (público)
export const useOcupacaoTurmasPublic = () => {
  return useQuery({
    queryKey: ["ocupacao-turmas-public"],
    queryFn: async () => {
      const [{ data, error }, crecheIds] = await Promise.all([
        supabase.rpc('get_ocupacao_turmas' as any),
        getCmeiCrecheIds(),
      ]);

      if (error) throw error;

      return (data || [])
        .filter((item: any) => crecheIds.has(item.cmei_id))
        .map((item: any) => ({
        id: item.id,
        nome: item.nome,
        turma_base: item.turma_base,
        turno: item.turno,
        capacidade: item.capacidade || 0,
        ocupados: Number(item.ocupados) || 0,
        percentual: item.percentual || 0,
        cmei_id: item.cmei_id,
        cmei_nome: item.cmei_nome || "Sem unidade",
        idade_minima: item.idade_minima,
        idade_maxima: item.idade_maxima,
      }));
    },
    staleTime: 60000,
    gcTime: 300000,
    retry: 3,
    networkMode: 'always',
  });
};

// Configurações do sistema (usa RPC público para compatibilidade com iOS/Safari)
export const useConfiguracoes = () => {
  return useQuery({
    queryKey: ["configuracoes"],
    queryFn: async () => {
      // Timeout para evitar travamento no iOS
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      try {
        // Usa RPC público para evitar problemas de RLS no iOS
        const { data, error } = await supabase.rpc('get_public_configuracoes');
        
        clearTimeout(timeoutId);
        if (error) throw error;
        
        // RPC retorna array, pegar primeiro elemento
        const config = Array.isArray(data) ? data[0] : data;
        return config as Record<string, any>;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    },
    staleTime: 60000, // Cache por 1 minuto
    gcTime: 300000, // Manter em cache por 5 minutos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    networkMode: 'always', // Forçar fetch mesmo se parece offline (iOS bug)
  });
};

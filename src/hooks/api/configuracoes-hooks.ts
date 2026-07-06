import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/error-utils";

export interface ConfiguracoesSistema {
  id: string;
  nome_municipio: string | null;
  nome_secretaria: string | null;
  unidade_singular: string | null;
  unidade_plural: string | null;
  email_contato: string | null;
  telefone_contato: string | null;
  data_inicio_inscricao: string | null;
  data_fim_inscricao: string | null;
  prazo_resposta_dias: number | null;
  prazo_assinatura_dias: number | null;
  dias_antecedencia_lembrete: number | null;
  mover_automatico_prazo_vencido: boolean | null;
  notificacao_email: boolean | null;
  notificacao_sms: boolean | null;
  notificacao_whatsapp: boolean | null;
  brasao_url: string | null;
  webhook_url_notificacao: string | null;
  webhook_url_notificacao_email: string | null;
  webhook_url_notificacao_sms: string | null;
  autenticacao_publica: boolean | null;
  sistema_nome: string | null;
  sistema_icone_url: string | null;
  favicon_url: string | null;
  logo_empresa_url: string | null;
  logo_empresa_link: string | null;
  tema_cor_primaria: string | null;
  tema_cor_secundaria: string | null;
  tema_fonte: string | null;
  tema_sidebar_gradiente_ativo: boolean | null;
  tema_sidebar_gradiente_inicio: string | null;
  tema_sidebar_gradiente_fim: string | null;
  // Campos de controle de acesso
  limite_inscricoes_responsavel: number | null;
  validar_cep: boolean | null;
  ceps_permitidos: string[] | null;
  // Campos de aplicativos móveis
  app_nome: string | null;
  app_id: string | null;
  app_icone_url: string | null;
  app_splash_url: string | null;
  app_android_url: string | null;
  app_ios_url: string | null;
  app_playstore_url: string | null;
  app_appstore_url: string | null;
  // Campos de endereço da secretaria
  endereco_secretaria: string | null;
  endereco_latitude: number | null;
  endereco_longitude: number | null;
  // Campos de data de corte etário
  data_corte_mes: number | null;
  data_corte_dia: number | null;
  idade_minima_meses: number | null;
  idade_maxima_anos: number | null;
  // Mensagem para crianças fora da faixa etária
  mensagem_idade_fora_faixa: string | null;
  // Configurações de prioridade da fila
  prioridade_social_habilitada: boolean | null;
  prioridade_remanejamento_habilitada: boolean | null;
  prioridades_comprovacao_na_inscricao: boolean | null;
  prioridade_zona_habilitada: boolean | null;
  prioridade_zona_bonus_dentro: number | null;
  prioridade_zona_bonus_fora: number | null;
  preferencias_cmei_qtd: number | null;
  peso_data_cadastro: number | null;
  peso_programas_sociais: number | null;
  peso_remanejamento: number | null;
  pontuacao_base_fila: number | null;
  // FASE 2: Modo de Operação e Horários
  modo_manutencao: boolean | null;
  mensagem_manutencao: string | null;
  ano_letivo_atual: number | null;
  permitir_edicao_apos_inscricao: boolean | null;
  bloquear_novas_inscricoes: boolean | null;
  motivo_bloqueio_inscricoes: string | null;
  horario_inicio_atendimento: string | null;
  horario_fim_atendimento: string | null;
  bloquear_fora_horario: boolean | null;
  mensagem_fora_horario: string | null;
  // FASE 3: Regras de Workflow
  max_tentativas_convocacao: number | null;
  estrategia_prazo_vencido: string | null;
  intervalo_reenvio_notificacao: number | null;
  usar_dias_uteis: boolean | null;
  permitir_transferencia: boolean | null;
  periodo_carencia_transferencia: number | null;
  exigir_justificativa_transferencia: boolean | null;
  aprovar_transferencia_automatico: boolean | null;
  permitir_remanejamento: boolean | null;
  limite_remanejamentos_ano: number | null;
  exigir_justificativa_remanejamento: boolean | null;
  // FASE 6: Personalização de Interface
  modo_visualizacao_fila: string | null;
  densidade_tabela: string | null;
  itens_por_pagina: number | null;
  mostrar_foto_crianca: boolean | null;
  tema_padrao: string | null;
  permitir_troca_tema: boolean | null;
  colunas_visiveis_fila: string[] | null;
  widgets_dashboard: string[] | null;
  // FASE 7: Zoneamento
  habilitar_zoneamento: boolean | null;
  priorizar_zona: boolean | null;
  mostrar_distancia: boolean | null;
  raio_proximidade_km: number | null;
  // CAPTCHA
  captcha_habilitado: boolean | null;
  captcha_site_key: string | null;
  captcha_secret_key: string | null;
  // CPFHub (consulta por CPF)
  cpfhub_habilitado: boolean | null;
  cpfhub_api_key: string | null;
  // APICPF (plano B consulta por CPF)
  apicpf_habilitado: boolean | null;
  apicpf_api_key: string | null;
  // Mensagens/Chat
  habilitar_mensagens: boolean | null;
  // Módulos (habilitação por município)
  habilitar_vagou: boolean | null;
  habilitar_sam: boolean | null;
  habilitar_sondagem: boolean | null;
  // Modo Demonstração
  modo_demonstracao: boolean | null;
  demo_mensagem: string | null;
  demo_ultima_geracao: string | null;
  demo_ultimo_reset: string | null;
  // Contatos de suporte
  suporte_email: string | null;
  suporte_telefone: string | null;
  suporte_dev_nome: string | null;
  suporte_dev_email: string | null;
  suporte_dev_telefone: string | null;
  // Configurações SMTP
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_password: string | null;
  smtp_secure: boolean | null;
  smtp_sender_name: string | null;
  smtp_sender_email: string | null;
}

export interface ConfiguracoesUpdate {
  nome_municipio?: string;
  nome_secretaria?: string;
  unidade_singular?: string;
  unidade_plural?: string;
  email_contato?: string;
  telefone_contato?: string;
  data_inicio_inscricao?: string;
  data_fim_inscricao?: string;
  prazo_resposta_dias?: number;
  prazo_assinatura_dias?: number;
  dias_antecedencia_lembrete?: number;
  mover_automatico_prazo_vencido?: boolean;
  notificacao_email?: boolean;
  notificacao_sms?: boolean;
  notificacao_whatsapp?: boolean;
  brasao_url?: string;
  webhook_url_notificacao?: string;
  webhook_url_notificacao_email?: string;
  webhook_url_notificacao_sms?: string;
  autenticacao_publica?: boolean;
  sistema_nome?: string;
  sistema_icone_url?: string;
  logo_empresa_url?: string;
  logo_empresa_link?: string;
  tema_cor_primaria?: string;
  tema_cor_secundaria?: string;
  tema_fonte?: string;
  tema_sidebar_gradiente_ativo?: boolean;
  tema_sidebar_gradiente_inicio?: string;
  tema_sidebar_gradiente_fim?: string;
  // Campos de controle de acesso
  limite_inscricoes_responsavel?: number;
  validar_cep?: boolean;
  ceps_permitidos?: string[];
  // Campos de aplicativos móveis
  app_nome?: string;
  app_id?: string;
  app_icone_url?: string;
  app_splash_url?: string;
  app_android_url?: string;
  app_ios_url?: string;
  app_playstore_url?: string;
  app_appstore_url?: string;
  // Campos de endereço da secretaria
  endereco_secretaria?: string;
  endereco_latitude?: number;
  endereco_longitude?: number;
  // Favicon personalizado
  favicon_url?: string;
  // Campos de data de corte etário
  data_corte_mes?: number;
  data_corte_dia?: number;
  idade_minima_meses?: number;
  idade_maxima_anos?: number;
  // Mensagem para crianças fora da faixa etária
  mensagem_idade_fora_faixa?: string;
  // Configurações de prioridade da fila
  prioridade_social_habilitada?: boolean;
  prioridade_remanejamento_habilitada?: boolean;
  prioridades_comprovacao_na_inscricao?: boolean;
  prioridade_zona_habilitada?: boolean;
  prioridade_zona_bonus_dentro?: number;
  prioridade_zona_bonus_fora?: number;
  preferencias_cmei_qtd?: number;
  peso_data_cadastro?: number;
  peso_programas_sociais?: number;
  peso_remanejamento?: number;
  // Contatos de suporte
  suporte_email?: string;
  suporte_telefone?: string;
  suporte_dev_nome?: string;
  suporte_dev_email?: string;
  suporte_dev_telefone?: string;
  // Configurações SMTP
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  smtp_secure?: boolean;
  smtp_sender_name?: string;
  smtp_sender_email?: string;
  // CPFHub (consulta por CPF)
  cpfhub_habilitado?: boolean;
  cpfhub_api_key?: string;
  // APICPF (plano B consulta por CPF)
  apicpf_habilitado?: boolean;
  apicpf_api_key?: string;
  // Mensagens/Chat
  habilitar_mensagens?: boolean;
  // Módulos (habilitação por município)
  habilitar_vagou?: boolean;
  habilitar_sam?: boolean;
  habilitar_sondagem?: boolean;
}

// Interface para configurações públicas (sem dados sensíveis)
export interface ConfiguracoesPublicas {
  nome_municipio: string | null;
  nome_secretaria: string | null;
  unidade_singular: string | null;
  unidade_plural: string | null;
  email_contato: string | null;
  telefone_contato: string | null;
  brasao_url: string | null;
  data_inicio_inscricao: string | null;
  data_fim_inscricao: string | null;
  prazo_resposta_dias: number | null;
  autenticacao_publica: boolean | null;
  sistema_nome: string | null;
  sistema_icone_url: string | null;
  logo_empresa_url: string | null;
  logo_empresa_link: string | null;
  tema_cor_primaria: string | null;
  tema_cor_secundaria: string | null;
  tema_fonte: string | null;
  tema_sidebar_gradiente_ativo: boolean | null;
  tema_sidebar_gradiente_inicio: string | null;
  tema_sidebar_gradiente_fim: string | null;
  tema_padrao: string | null;
  app_nome: string | null;
  app_icone_url: string | null;
  app_playstore_url: string | null;
  app_appstore_url: string | null;
  modo_manutencao: boolean | null;
  mensagem_manutencao: string | null;
  bloquear_novas_inscricoes: boolean | null;
  motivo_bloqueio_inscricoes: string | null;
  captcha_habilitado: boolean | null;
  captcha_site_key: string | null;
  favicon_url: string | null;
  permitir_troca_tema: boolean | null;
  modo_demonstracao: boolean | null;
  demo_mensagem: string | null;
  endereco_secretaria: string | null;
  endereco_latitude: number | null;
  endereco_longitude: number | null;
  habilitar_mensagens: boolean | null;
  cpfhub_habilitado: boolean | null;
  apicpf_habilitado: boolean | null;
  habilitar_vagou: boolean | null;
  habilitar_sam: boolean | null;
  habilitar_sondagem: boolean | null;
  // Campos de idade para validação pública
  idade_maxima_anos: number | null;
  idade_minima_meses: number | null;
  data_corte_mes: number | null;
  data_corte_dia: number | null;
  mensagem_idade_fora_faixa: string | null;
  prioridades_comprovacao_na_inscricao: boolean | null;
}

// Get configurações públicas (sem dados sensíveis como webhook_url, captcha_secret_key)
export const useConfiguracoesPublicas = () => {
  return useQuery({
    queryKey: ["configuracoes-publicas"],
    queryFn: async () => {
      // Timeout para evitar travamento no iOS
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      try {
        const { data, error } = await supabase.rpc('get_public_configuracoes');

        clearTimeout(timeoutId);
        if (error) throw error;
        return (data?.[0] || data) as unknown as ConfiguracoesPublicas;
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

// Get configurações completas (apenas para admins autenticados)
export const useConfiguracoesSistema = () => {
  return useQuery({
    queryKey: ["configuracoes-sistema"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_sistema")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      return data as unknown as ConfiguracoesSistema;
    },
  });
};

// Update configurações
export const useUpdateConfiguracoes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ConfiguracoesUpdate) => {
      // Get the first (and only) configuration record
      const { data: currentConfig } = await supabase
        .from("configuracoes_sistema")
        .select("id, prioridade_social_habilitada, prioridade_remanejamento_habilitada, idade_maxima_anos, idade_minima_meses, data_corte_dia, data_corte_mes")
        .maybeSingle();

      if (!currentConfig) {
        // Create new config if none exists
        console.log("Nenhuma configuração encontrada, criando nova...");
        
        const defaultConfig = {
          nome_municipio: "Diamante do Norte",
          nome_secretaria: "Secretaria de Educação",
          sistema_nome: "Vagou!",
          ano_letivo_atual: new Date().getFullYear(),
          data_inicio_inscricao: `${new Date().getFullYear()}-01-01`,
          data_fim_inscricao: `${new Date().getFullYear()}-12-31`,
          modo_manutencao: false,
          bloquear_novas_inscricoes: false,
          data_corte_dia: 31,
          data_corte_mes: 3,
          idade_minima_meses: 6,
          idade_maxima_anos: 3,
          prioridade_social_habilitada: true,
          prioridade_remanejamento_habilitada: true,
          prioridades_comprovacao_na_inscricao: true,
          prioridade_zona_habilitada: false,
          prioridade_zona_bonus_dentro: 5,
          prioridade_zona_bonus_fora: 0,
          preferencias_cmei_qtd: 2,
          peso_data_cadastro: 0,
          pontuacao_base_fila: 10,
          peso_programas_sociais: 10,
          peso_remanejamento: 10,
          prazo_resposta_dias: 3,
          limite_inscricoes_responsavel: 3,
          validar_cep: false,
          autenticacao_publica: true,
          notificacao_email: true,
          cpfhub_habilitado: false,
          cpfhub_api_key: null,
          apicpf_habilitado: false,
          apicpf_api_key: null,
          habilitar_mensagens: true,
          habilitar_sam: true,
          habilitar_sondagem: true,
          logo_empresa_url: null,
          smtp_host: null,
          smtp_port: null,
          smtp_user: null,
          smtp_password: null,
          smtp_secure: false,
          smtp_sender_name: null,
          smtp_sender_email: null
        };
        
        const configToInsert = { ...defaultConfig, ...data };
        
        const { data: inserted, error: insertError } = await supabase
            .from("configuracoes_sistema")
            .insert([configToInsert])
            .select()
            .single();
            
        if (insertError) throw insertError;

         // Trigger recalculation after initial setup
         console.log("Configuração inicial criada, recalculando fila...");
         const { error: rpcError } = await supabase.rpc('recalcular_posicoes_fila');
         if (rpcError) {
           console.error("Erro ao recalcular fila na inicialização:", rpcError);
         }

         return inserted;
       }

      // Verificar se houve mudança nas configurações de prioridade ou idade/corte
      const prioridadeChanged = 
        (data.prioridade_social_habilitada !== undefined && 
         data.prioridade_social_habilitada !== currentConfig.prioridade_social_habilitada) ||
        (data.prioridade_remanejamento_habilitada !== undefined && 
         data.prioridade_remanejamento_habilitada !== currentConfig.prioridade_remanejamento_habilitada) ||
        (data.idade_maxima_anos !== undefined && data.idade_maxima_anos !== currentConfig.idade_maxima_anos) ||
        (data.idade_minima_meses !== undefined && data.idade_minima_meses !== currentConfig.idade_minima_meses) ||
        (data.data_corte_dia !== undefined && data.data_corte_dia !== currentConfig.data_corte_dia) ||
        (data.data_corte_mes !== undefined && data.data_corte_mes !== currentConfig.data_corte_mes);

      const { data: updated, error } = await supabase
        .from("configuracoes_sistema")
        .update(data)
        .eq("id", currentConfig.id)
        .select()
        .single();

      if (error) throw error;

      // Se houve mudança nas prioridades ou regras de idade, recalcular a fila
      if (prioridadeChanged) {
        console.log("Configurações de prioridade ou idade alteradas, recalculando fila...");
        const { error: rpcError } = await supabase.rpc('recalcular_posicoes_fila');
        if (rpcError) {
          console.error("Erro ao recalcular fila:", rpcError);
        }
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configuracoes-sistema"] });
      queryClient.invalidateQueries({ queryKey: ["configuracoes-publicas"] });
      queryClient.invalidateQueries({ queryKey: ["configuracoes"] });
      queryClient.invalidateQueries({ queryKey: ["fila-publica"] });
      queryClient.invalidateQueries({ queryKey: ["criancas"] });
      toast.success("Configurações atualizadas com sucesso!");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao atualizar configurações: " + getErrorMessage(error));
    },
  });
};

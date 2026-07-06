-- =============================================================================
-- VAGOU - Setup Completo e Otimizado para Marilena
-- Gerado em: 2025-12-26 21:38:20
-- =============================================================================

-- =============================================================================
-- PARTE 1: ESTRUTURA (Tabelas, FunÃ§Ãµes, Triggers, RLS Base)
-- =============================================================================
-- =============================================================================
-- VAGOU - Script de Estrutura Completa do Banco de Dados
-- =============================================================================
-- Execute este script no SQL Editor do Supabase para criar toda a estrutura
-- Ordem: Execute PRIMEIRO este arquivo
-- =============================================================================

-- =============================================================================
-- 1. EXTENSÕES
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 2. ENUMS (Tipos Customizados)
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('responsavel', 'gestor', 'admin', 'superadmin', 'diretor_cmei');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE status_crianca AS ENUM (
    'Fila de Espera',
    'Convocado',
    'Aguardando Documentação',
    'Aguardando Assinatura',
    'Matriculado',
    'Matriculada',
    'Recusada',
    'Desistente',
    'Remanejamento Solicitado',
    'Concluinte',
    'Transferido',
    'Matrícula Trancada'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE sexo_tipo AS ENUM ('Masculino', 'Feminino');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE prioridade_tipo AS ENUM ('Social', 'Geral', 'Remanejamento');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE prioridade_tipo ADD VALUE IF NOT EXISTS 'Remanejamento';
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- =============================================================================
-- 3. TABELAS PRINCIPAIS
-- =============================================================================

-- Correção de colunas criadas incorretamente em execuções anteriores
DO $$
BEGIN
    -- 1. Tentar renomear responsavel_user_id para responsavel_id se existir
    -- Correção para chat_mensagens
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_mensagens' AND column_name = 'responsavel_user_id') THEN
        ALTER TABLE public.chat_mensagens RENAME COLUMN responsavel_user_id TO responsavel_id;
    END IF;

    -- Correção para chat_conversas_config
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_conversas_config' AND column_name = 'responsavel_user_id') THEN
        ALTER TABLE public.chat_conversas_config RENAME COLUMN responsavel_user_id TO responsavel_id;
    END IF;
    
    -- Correção para chat_conversa_marcadores
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_conversa_marcadores' AND column_name = 'responsavel_user_id') THEN
        ALTER TABLE public.chat_conversa_marcadores RENAME COLUMN responsavel_user_id TO responsavel_id;
    END IF;

    -- 2. Se responsavel_id ainda não existir (e a tabela existir), criar a coluna
    -- Isso acontece se a tabela foi criada por uma migration antiga que não tinha essa coluna
    
    -- chat_mensagens
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_mensagens') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_mensagens' AND column_name = 'responsavel_id') THEN
            ALTER TABLE public.chat_mensagens ADD COLUMN responsavel_id UUID REFERENCES public.profiles(id);
        END IF;
    END IF;

    -- chat_conversas_config
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_conversas_config') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_conversas_config' AND column_name = 'responsavel_id') THEN
            ALTER TABLE public.chat_conversas_config ADD COLUMN responsavel_id UUID REFERENCES public.profiles(id);
        END IF;
    END IF;
    
    -- chat_conversa_marcadores
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_conversa_marcadores') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_conversa_marcadores' AND column_name = 'responsavel_id') THEN
            ALTER TABLE public.chat_conversa_marcadores ADD COLUMN responsavel_id UUID REFERENCES public.profiles(id);
        END IF;
    END IF;

EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Profiles (dados adicionais do usuário)
-- NOTA: A coluna 'role' foi REMOVIDA por segurança. Papéis são gerenciados na tabela user_roles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT,
  cpf TEXT UNIQUE,
  email TEXT,
  telefone TEXT,
  avatar_url TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Roles (tabela separada para segurança)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Configurações do Sistema
CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registro_unico BOOLEAN DEFAULT true,
  nome_municipio TEXT DEFAULT 'Município',
  nome_secretaria TEXT DEFAULT 'Secretaria de Educação',
  email_contato TEXT,
  telefone_contato TEXT,
  data_inicio_inscricao DATE,
  data_fim_inscricao DATE,
  prazo_resposta_dias INTEGER DEFAULT 15,
  notificacao_email BOOLEAN DEFAULT TRUE,
  notificacao_sms BOOLEAN DEFAULT FALSE,
  notificacao_whatsapp BOOLEAN DEFAULT FALSE,
  autenticacao_publica BOOLEAN DEFAULT FALSE,
  webhook_url_notificacao TEXT,
  brasao_url TEXT,
  sistema_nome TEXT DEFAULT 'VAGOU',
  sistema_icone_url TEXT,
  tema_cor_primaria TEXT DEFAULT '#1351B4',
  tema_cor_secundaria TEXT DEFAULT '#071D41',
  tema_fonte TEXT DEFAULT 'Inter',
  tema_padrao TEXT DEFAULT 'system',
  permitir_troca_tema BOOLEAN DEFAULT true,
  limite_inscricoes_responsavel INTEGER DEFAULT 5,
  validar_cep BOOLEAN DEFAULT false,
  ceps_permitidos TEXT[] DEFAULT '{}',
  mover_automatico_prazo_vencido BOOLEAN DEFAULT false,
  dias_antecedencia_lembrete INTEGER DEFAULT 3,
  data_corte_mes INTEGER DEFAULT 3,
  data_corte_dia INTEGER DEFAULT 31,
  idade_minima_meses INTEGER DEFAULT 6,
  idade_maxima_anos INTEGER DEFAULT 3,
  prazo_assinatura_dias INTEGER DEFAULT 7,
  prioridade_social_habilitada BOOLEAN DEFAULT true,
  prioridade_remanejamento_habilitada BOOLEAN DEFAULT true,
  modo_manutencao BOOLEAN DEFAULT false,
  mensagem_manutencao TEXT DEFAULT 'Sistema em manutenção. Tente novamente mais tarde.',
  ano_letivo_atual INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  permitir_edicao_apos_inscricao BOOLEAN DEFAULT true,
  bloquear_novas_inscricoes BOOLEAN DEFAULT false,
  motivo_bloqueio_inscricoes TEXT,
  horario_inicio_atendimento TIME DEFAULT '08:00',
  horario_fim_atendimento TIME DEFAULT '17:00',
  bloquear_fora_horario BOOLEAN DEFAULT false,
  mensagem_fora_horario TEXT DEFAULT 'O sistema está disponível apenas em horário comercial.',
  max_tentativas_convocacao INTEGER DEFAULT 2,
  estrategia_prazo_vencido TEXT DEFAULT 'fim_fila',
  intervalo_reenvio_notificacao INTEGER DEFAULT 3,
  usar_dias_uteis BOOLEAN DEFAULT false,
  permitir_transferencia BOOLEAN DEFAULT true,
  periodo_carencia_transferencia INTEGER DEFAULT 30,
  exigir_justificativa_transferencia BOOLEAN DEFAULT true,
  aprovar_transferencia_automatico BOOLEAN DEFAULT false,
  permitir_remanejamento BOOLEAN DEFAULT true,
  limite_remanejamentos_ano INTEGER DEFAULT 2,
  exigir_justificativa_remanejamento BOOLEAN DEFAULT true,
  modo_visualizacao_fila TEXT DEFAULT 'tabela',
  densidade_tabela TEXT DEFAULT 'normal',
  itens_por_pagina INTEGER DEFAULT 25,
  mostrar_foto_crianca BOOLEAN DEFAULT false,
  colunas_visiveis_fila JSONB DEFAULT '["posicao", "nome", "idade", "turma", "status", "prioridade", "data_inscricao"]'::jsonb,
  widgets_dashboard JSONB DEFAULT '["estatisticas", "convocacoes_recentes", "ocupacao", "fila_evolucao"]'::jsonb,
  habilitar_zoneamento BOOLEAN DEFAULT false,
  priorizar_zona BOOLEAN DEFAULT true,
  mostrar_distancia BOOLEAN DEFAULT false,
  raio_proximidade_km NUMERIC DEFAULT 2,
  captcha_habilitado BOOLEAN DEFAULT false,
  captcha_site_key TEXT,
  captcha_secret_key TEXT,
  modo_demonstracao BOOLEAN DEFAULT false,
  demo_mensagem TEXT DEFAULT 'Sistema em modo demonstração. Dados podem ser resetados a qualquer momento.',
  demo_ultima_geracao TIMESTAMPTZ,
  demo_ultimo_reset TIMESTAMPTZ,
  mensagem_idade_fora_faixa TEXT DEFAULT 'A criança informada está fora da faixa etária permitida para inscrição. Por favor, procure a Secretaria de Educação para mais informações.',
  app_nome TEXT DEFAULT 'VAGOU',
  app_id TEXT DEFAULT 'app.lovable.vagou',
  app_icone_url TEXT,
  app_splash_url TEXT,
  app_android_url TEXT,
  app_ios_url TEXT,
  app_playstore_url TEXT,
  app_appstore_url TEXT,
  endereco_secretaria TEXT,
  endereco_latitude DOUBLE PRECISION,
  endereco_longitude DOUBLE PRECISION,
  favicon_url TEXT,
  suporte_email TEXT,
  suporte_telefone TEXT,
  suporte_dev_email TEXT,
  suporte_dev_telefone TEXT,
  suporte_dev_nome TEXT DEFAULT 'Suporte Técnico',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'configuracoes_sistema'
      AND column_name = 'registro_unico'
  ) THEN
    IF (SELECT COUNT(*) FROM public.configuracoes_sistema WHERE registro_unico = true) > 1 THEN
      DELETE FROM public.configuracoes_sistema
      WHERE ctid NOT IN (
        SELECT ctid
        FROM public.configuracoes_sistema
        WHERE registro_unico = true
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
        LIMIT 1
      )
      AND registro_unico = true;
    END IF;

    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_configuracoes_sistema_registro_unico ON public.configuracoes_sistema (registro_unico) WHERE registro_unico = true';
  END IF;
END $$;

-- Garante que TODAS as colunas existam em configuracoes_sistema
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'configuracoes_sistema') THEN
        
        -- Colunas Básicas
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'registro_unico') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN registro_unico BOOLEAN DEFAULT true;
        END IF;
        IF (SELECT COUNT(*) FROM public.configuracoes_sistema WHERE registro_unico = true) > 1 THEN
            DELETE FROM public.configuracoes_sistema
            WHERE ctid NOT IN (
                SELECT ctid
                FROM public.configuracoes_sistema
                WHERE registro_unico = true
                ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
                LIMIT 1
            )
            AND registro_unico = true;
        END IF;
        EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_configuracoes_sistema_registro_unico ON public.configuracoes_sistema (registro_unico) WHERE registro_unico = true';
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'nome_municipio') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN nome_municipio TEXT DEFAULT 'Município';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'nome_secretaria') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN nome_secretaria TEXT DEFAULT 'Secretaria de Educação';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'email_contato') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN email_contato TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'telefone_contato') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN telefone_contato TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'data_inicio_inscricao') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN data_inicio_inscricao DATE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'data_fim_inscricao') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN data_fim_inscricao DATE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'prazo_resposta_dias') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN prazo_resposta_dias INTEGER DEFAULT 15;
        END IF;

        -- Notificações
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'notificacao_email') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN notificacao_email BOOLEAN DEFAULT TRUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'notificacao_sms') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN notificacao_sms BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'notificacao_whatsapp') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN notificacao_whatsapp BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'webhook_url_notificacao') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN webhook_url_notificacao TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'intervalo_reenvio_notificacao') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN intervalo_reenvio_notificacao INTEGER DEFAULT 3;
        END IF;

        -- Sistema e Tema
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'autenticacao_publica') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN autenticacao_publica BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'brasao_url') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN brasao_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'sistema_nome') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN sistema_nome TEXT DEFAULT 'VAGOU';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'sistema_icone_url') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN sistema_icone_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'tema_cor_primaria') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN tema_cor_primaria TEXT DEFAULT '#1351B4';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'tema_cor_secundaria') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN tema_cor_secundaria TEXT DEFAULT '#071D41';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'tema_fonte') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN tema_fonte TEXT DEFAULT 'Inter';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'tema_padrao') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN tema_padrao TEXT DEFAULT 'system';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'permitir_troca_tema') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN permitir_troca_tema BOOLEAN DEFAULT true;
        END IF;

        -- Regras de Negócio
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'limite_inscricoes_responsavel') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN limite_inscricoes_responsavel INTEGER DEFAULT 5;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'validar_cep') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN validar_cep BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'ceps_permitidos') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN ceps_permitidos TEXT[] DEFAULT '{}';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'mover_automatico_prazo_vencido') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN mover_automatico_prazo_vencido BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'dias_antecedencia_lembrete') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN dias_antecedencia_lembrete INTEGER DEFAULT 3;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'data_corte_mes') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN data_corte_mes INTEGER DEFAULT 3;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'data_corte_dia') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN data_corte_dia INTEGER DEFAULT 31;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'idade_minima_meses') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN idade_minima_meses INTEGER DEFAULT 6;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'idade_maxima_anos') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN idade_maxima_anos INTEGER DEFAULT 3;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'prazo_assinatura_dias') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN prazo_assinatura_dias INTEGER DEFAULT 7;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'prioridade_social_habilitada') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN prioridade_social_habilitada BOOLEAN DEFAULT true;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'prioridade_remanejamento_habilitada') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN prioridade_remanejamento_habilitada BOOLEAN DEFAULT true;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'ano_letivo_atual') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN ano_letivo_atual INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'permitir_edicao_apos_inscricao') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN permitir_edicao_apos_inscricao BOOLEAN DEFAULT true;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'max_tentativas_convocacao') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN max_tentativas_convocacao INTEGER DEFAULT 2;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'estrategia_prazo_vencido') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN estrategia_prazo_vencido TEXT DEFAULT 'fim_fila';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'usar_dias_uteis') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN usar_dias_uteis BOOLEAN DEFAULT false;
        END IF;

        -- Manutenção e Bloqueios
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'modo_manutencao') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN modo_manutencao BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'mensagem_manutencao') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN mensagem_manutencao TEXT DEFAULT 'Sistema em manutenção. Tente novamente mais tarde.';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'bloquear_novas_inscricoes') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN bloquear_novas_inscricoes BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'motivo_bloqueio_inscricoes') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN motivo_bloqueio_inscricoes TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'horario_inicio_atendimento') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN horario_inicio_atendimento TIME DEFAULT '08:00';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'horario_fim_atendimento') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN horario_fim_atendimento TIME DEFAULT '17:00';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'bloquear_fora_horario') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN bloquear_fora_horario BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'mensagem_fora_horario') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN mensagem_fora_horario TEXT DEFAULT 'O sistema está disponível apenas em horário comercial.';
        END IF;

        -- Transferência e Remanejamento
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'permitir_transferencia') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN permitir_transferencia BOOLEAN DEFAULT true;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'periodo_carencia_transferencia') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN periodo_carencia_transferencia INTEGER DEFAULT 30;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'exigir_justificativa_transferencia') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN exigir_justificativa_transferencia BOOLEAN DEFAULT true;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'aprovar_transferencia_automatico') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN aprovar_transferencia_automatico BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'permitir_remanejamento') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN permitir_remanejamento BOOLEAN DEFAULT true;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'limite_remanejamentos_ano') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN limite_remanejamentos_ano INTEGER DEFAULT 2;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'exigir_justificativa_remanejamento') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN exigir_justificativa_remanejamento BOOLEAN DEFAULT true;
        END IF;

        -- Interface e Visualização
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'modo_visualizacao_fila') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN modo_visualizacao_fila TEXT DEFAULT 'tabela';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'densidade_tabela') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN densidade_tabela TEXT DEFAULT 'normal';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'itens_por_pagina') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN itens_por_pagina INTEGER DEFAULT 25;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'mostrar_foto_crianca') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN mostrar_foto_crianca BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'colunas_visiveis_fila') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN colunas_visiveis_fila JSONB DEFAULT '["posicao", "nome", "idade", "turma", "status", "prioridade", "data_inscricao"]'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'widgets_dashboard') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN widgets_dashboard JSONB DEFAULT '["estatisticas", "convocacoes_recentes", "ocupacao", "fila_evolucao"]'::jsonb;
        END IF;

        -- Zoneamento e Captcha
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'habilitar_zoneamento') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN habilitar_zoneamento BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'priorizar_zona') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN priorizar_zona BOOLEAN DEFAULT true;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'mostrar_distancia') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN mostrar_distancia BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'raio_proximidade_km') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN raio_proximidade_km NUMERIC DEFAULT 2;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'captcha_habilitado') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN captcha_habilitado BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'captcha_site_key') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN captcha_site_key TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'captcha_secret_key') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN captcha_secret_key TEXT;
        END IF;

        -- Demo e App (já parcialmente cobertos, mas reforçando todos)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'modo_demonstracao') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN modo_demonstracao BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'demo_mensagem') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN demo_mensagem TEXT DEFAULT 'Sistema em modo demonstração. Dados podem ser resetados a qualquer momento.';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'demo_ultima_geracao') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN demo_ultima_geracao TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'demo_ultimo_reset') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN demo_ultimo_reset TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'mensagem_idade_fora_faixa') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN mensagem_idade_fora_faixa TEXT DEFAULT 'A criança informada está fora da faixa etária permitida para inscrição. Por favor, procure a Secretaria de Educação para mais informações.';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'app_nome') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN app_nome TEXT DEFAULT 'VAGOU';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'app_id') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN app_id TEXT DEFAULT 'app.lovable.vagou';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'app_icone_url') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN app_icone_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'app_splash_url') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN app_splash_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'app_android_url') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN app_android_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'app_ios_url') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN app_ios_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'app_playstore_url') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN app_playstore_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'app_appstore_url') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN app_appstore_url TEXT;
        END IF;

        -- Endereço e Suporte
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'endereco_secretaria') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN endereco_secretaria TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'endereco_latitude') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN endereco_latitude DOUBLE PRECISION;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'endereco_longitude') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN endereco_longitude DOUBLE PRECISION;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'favicon_url') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN favicon_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'suporte_email') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN suporte_email TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'suporte_telefone') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN suporte_telefone TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'suporte_dev_email') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN suporte_dev_email TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'suporte_dev_telefone') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN suporte_dev_telefone TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'suporte_dev_nome') THEN
            ALTER TABLE public.configuracoes_sistema ADD COLUMN suporte_dev_nome TEXT DEFAULT 'Suporte Técnico';
        END IF;

    END IF;
END $$;

-- CMEIs
CREATE TABLE IF NOT EXISTS public.cmeis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  endereco TEXT,
  bairro TEXT,
  telefone TEXT,
  email TEXT,
  capacidade_total INTEGER DEFAULT 0,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT cmeis_nome_not_empty CHECK (trim(nome) <> '')
);

-- Turmas
CREATE TABLE IF NOT EXISTS public.turmas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cmei_id UUID REFERENCES public.cmeis(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  turma_base TEXT NOT NULL,
  capacidade INTEGER DEFAULT 0,
  idade_minima INTEGER,
  idade_maxima INTEGER,
  turno TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Garante que colunas existam em turmas e cmeis
DO $$
BEGIN
    -- CMEIs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cmeis') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cmeis' AND column_name = 'latitude') THEN
            ALTER TABLE public.cmeis ADD COLUMN latitude DOUBLE PRECISION;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cmeis' AND column_name = 'longitude') THEN
            ALTER TABLE public.cmeis ADD COLUMN longitude DOUBLE PRECISION;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cmeis' AND column_name = 'email') THEN
            ALTER TABLE public.cmeis ADD COLUMN email TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cmeis' AND column_name = 'capacidade_total') THEN
            ALTER TABLE public.cmeis ADD COLUMN capacidade_total INTEGER DEFAULT 0;
        END IF;
    END IF;

    -- Turmas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'turmas') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'turmas' AND column_name = 'turno') THEN
            ALTER TABLE public.turmas ADD COLUMN turno TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'turmas' AND column_name = 'turma_base') THEN
            ALTER TABLE public.turmas ADD COLUMN turma_base TEXT NOT NULL DEFAULT 'Integral';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'turmas' AND column_name = 'idade_minima') THEN
            ALTER TABLE public.turmas ADD COLUMN idade_minima INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'turmas' AND column_name = 'idade_maxima') THEN
            ALTER TABLE public.turmas ADD COLUMN idade_maxima INTEGER;
        END IF;
    END IF;
END $$;

-- Turmas Base (modelos)
CREATE TABLE IF NOT EXISTS public.turmas_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  idade_minima_meses INTEGER NOT NULL,
  idade_maxima_meses INTEGER NOT NULL,
  descricao TEXT,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT idade_valida CHECK (idade_maxima_meses >= idade_minima_meses)
);

-- Crianças (principal)
CREATE TABLE IF NOT EXISTS public.criancas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  data_nascimento DATE NOT NULL,
  cpf_crianca TEXT,
  sexo sexo_tipo NOT NULL,
  certidao_nascimento TEXT,
  responsavel_user_id UUID REFERENCES auth.users(id),
  responsavel_nome TEXT NOT NULL,
  responsavel_cpf TEXT NOT NULL,
  responsavel_email TEXT,
  responsavel_telefone TEXT NOT NULL,
  responsavel_celular TEXT,
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  cmei1_preferencia UUID REFERENCES public.cmeis(id),
  cmei2_preferencia UUID REFERENCES public.cmeis(id),
  aceita_qualquer_cmei BOOLEAN DEFAULT FALSE,
  status status_crianca DEFAULT 'Fila de Espera',
  posicao_fila INTEGER,
  prioridade prioridade_tipo DEFAULT 'Geral',
  programas_sociais BOOLEAN DEFAULT FALSE,
  cmei_atual_id UUID REFERENCES public.cmeis(id),
  turma_atual_id UUID REFERENCES public.turmas(id),
  convocacao_deadline DATE,
  data_convocacao TIMESTAMP WITH TIME ZONE,
  data_penalidade TIMESTAMP WITH TIME ZONE,
  data_retorno_fila TIMESTAMP WITH TIME ZONE,
  cmei_remanejamento_id UUID REFERENCES public.cmeis(id),
  justificativa_remanejamento TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Garante que colunas importantes existam na tabela criancas (para tabelas antigas)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'criancas') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'criancas' AND column_name = 'data_retorno_fila') THEN
            ALTER TABLE public.criancas ADD COLUMN data_retorno_fila TIMESTAMP WITH TIME ZONE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'criancas' AND column_name = 'data_penalidade') THEN
            ALTER TABLE public.criancas ADD COLUMN data_penalidade TIMESTAMP WITH TIME ZONE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'criancas' AND column_name = 'cmei_remanejamento_id') THEN
            ALTER TABLE public.criancas ADD COLUMN cmei_remanejamento_id UUID REFERENCES public.cmeis(id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'criancas' AND column_name = 'justificativa_remanejamento') THEN
            ALTER TABLE public.criancas ADD COLUMN justificativa_remanejamento TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'criancas' AND column_name = 'aceita_qualquer_cmei') THEN
            ALTER TABLE public.criancas ADD COLUMN aceita_qualquer_cmei BOOLEAN DEFAULT FALSE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'criancas' AND column_name = 'turma_atual_id') THEN
            ALTER TABLE public.criancas ADD COLUMN turma_atual_id UUID REFERENCES public.turmas(id);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'criancas' AND column_name = 'convocacao_deadline') THEN
            ALTER TABLE public.criancas ADD COLUMN convocacao_deadline DATE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'criancas' AND column_name = 'data_convocacao') THEN
            ALTER TABLE public.criancas ADD COLUMN data_convocacao TIMESTAMP WITH TIME ZONE;
        END IF;
    END IF;
END $$;

-- Histórico
CREATE TABLE IF NOT EXISTS public.historico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crianca_id UUID REFERENCES public.criancas(id) ON DELETE CASCADE,
  acao TEXT NOT NULL,
  descricao TEXT,
  status_anterior status_crianca,
  status_novo status_crianca,
  cmei_anterior UUID REFERENCES public.cmeis(id),
  cmei_novo UUID REFERENCES public.cmeis(id),
  turma_anterior UUID REFERENCES public.turmas(id),
  turma_novo UUID REFERENCES public.turmas(id),
  justificativa TEXT,
  usuario_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auditoria
CREATE TABLE IF NOT EXISTS public.auditoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tabela TEXT NOT NULL,
  operacao TEXT NOT NULL,
  registro_id UUID,
  dados_antigos JSONB,
  dados_novos JSONB,
  usuario_id UUID REFERENCES auth.users(id),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Log de Notificações
CREATE TABLE IF NOT EXISTS public.notificacoes_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crianca_id UUID REFERENCES public.criancas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  canal TEXT NOT NULL,
  status TEXT NOT NULL,
  destinatario_nome TEXT,
  destinatario_contato TEXT,
  payload JSONB,
  resposta JSONB,
  erro TEXT,
  tentativas INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Vínculo Diretor-CMEI
CREATE TABLE IF NOT EXISTS public.diretor_cmei_vinculo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cmei_id uuid NOT NULL REFERENCES cmeis(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, cmei_id)
);

-- Permissões
CREATE TABLE IF NOT EXISTS public.permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  nome text NOT NULL,
  descricao text,
  modulo text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Permissões por Papel
CREATE TABLE IF NOT EXISTS public.role_permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permissao_id uuid REFERENCES public.permissoes(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  UNIQUE(role, permissao_id)
);

-- Tipos de Documentos
CREATE TABLE IF NOT EXISTS public.documentos_tipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  obrigatorio BOOLEAN DEFAULT true,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Documentos das Crianças
CREATE TABLE IF NOT EXISTS public.documentos_crianca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crianca_id UUID NOT NULL REFERENCES public.criancas(id) ON DELETE CASCADE,
  tipo_documento_id UUID NOT NULL REFERENCES public.documentos_tipos(id) ON DELETE CASCADE,
  arquivo_url TEXT NOT NULL,
  arquivo_nome TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado')),
  motivo_recusa TEXT,
  enviado_por UUID REFERENCES auth.users(id),
  aprovado_por UUID,
  aprovado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(crianca_id, tipo_documento_id)
);

-- Tipos de Prioridade
CREATE TABLE IF NOT EXISTS public.tipos_prioridade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  codigo TEXT NOT NULL UNIQUE,
  peso INTEGER DEFAULT 1,
  cor TEXT DEFAULT '#3b82f6',
  icone TEXT DEFAULT 'star',
  exige_documento BOOLEAN DEFAULT false,
  documento_tipo_id UUID REFERENCES public.documentos_tipos(id),
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Prioridades das Crianças
CREATE TABLE IF NOT EXISTS public.crianca_prioridades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crianca_id UUID NOT NULL REFERENCES public.criancas(id) ON DELETE CASCADE,
  prioridade_id UUID NOT NULL REFERENCES public.tipos_prioridade(id) ON DELETE CASCADE,
  documento_comprovante_url TEXT,
  status TEXT DEFAULT 'pendente',
  aprovado_por UUID,
  aprovado_em TIMESTAMPTZ,
  motivo_recusa TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(crianca_id, prioridade_id)
);

-- Templates de Mensagens
CREATE TABLE IF NOT EXISTS public.templates_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  assunto_email TEXT,
  corpo_email TEXT,
  corpo_sms TEXT,
  corpo_whatsapp TEXT,
  variaveis_disponiveis JSONB DEFAULT '[]'::jsonb,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Mensagens de Status Customizadas
CREATE TABLE IF NOT EXISTS public.mensagens_status_custom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL UNIQUE,
  titulo_exibicao TEXT NOT NULL,
  mensagem_responsavel TEXT,
  cor_badge TEXT DEFAULT '#3b82f6',
  icone TEXT DEFAULT 'clock',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Feriados Municipais
CREATE TABLE IF NOT EXISTS public.feriados_municipais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  data DATE NOT NULL,
  recorrente BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Motivos Padrão
CREATE TABLE IF NOT EXISTS public.motivos_padrao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Campos de Inscrição Configuráveis
CREATE TABLE IF NOT EXISTS public.campos_inscricao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secao TEXT NOT NULL,
  nome_campo TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  tipo TEXT NOT NULL,
  placeholder TEXT,
  obrigatorio BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  opcoes JSONB,
  validacao JSONB,
  mascara TEXT,
  campo_sistema BOOLEAN DEFAULT false,
  visivel_responsavel BOOLEAN DEFAULT true,
  editavel_apos_inscricao BOOLEAN DEFAULT true,
  dica TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Histórico de Campos de Inscrição
CREATE TABLE IF NOT EXISTS public.campos_inscricao_historico (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campo_id uuid REFERENCES public.campos_inscricao(id) ON DELETE SET NULL,
  operacao text NOT NULL,
  dados_anteriores jsonb,
  dados_novos jsonb,
  usuario_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Valores de Campos Customizados por Criança
CREATE TABLE IF NOT EXISTS public.valores_campos_custom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crianca_id UUID NOT NULL REFERENCES public.criancas(id) ON DELETE CASCADE,
  campo_id UUID NOT NULL REFERENCES public.campos_inscricao(id) ON DELETE CASCADE,
  valor TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(crianca_id, campo_id)
);

-- Zonas de Atendimento
CREATE TABLE IF NOT EXISTS public.zonas_atendimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT DEFAULT '#3b82f6',
  bairros TEXT[],
  ceps TEXT[],
  poligono JSONB,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Vínculo CMEI-Zona
CREATE TABLE IF NOT EXISTS public.cmei_zonas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cmei_id UUID NOT NULL REFERENCES public.cmeis(id) ON DELETE CASCADE,
  zona_id UUID NOT NULL REFERENCES public.zonas_atendimento(id) ON DELETE CASCADE,
  prioridade INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cmei_id, zona_id)
);

-- Preferências do Usuário
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  tema TEXT DEFAULT 'system',
  densidade_tabela TEXT DEFAULT 'normal',
  itens_por_pagina INTEGER DEFAULT 25,
  colunas_personalizadas JSONB,
  sidebar_collapsed BOOLEAN DEFAULT false,
  notificacoes_som BOOLEAN DEFAULT true,
  notificacoes_toast BOOLEAN DEFAULT true,
  idioma TEXT DEFAULT 'pt-BR',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Rate Limiting
CREATE TABLE IF NOT EXISTS public.rate_limit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Planejamento de Transição Anual
CREATE TABLE IF NOT EXISTS public.planejamento_transicao (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crianca_id uuid NOT NULL REFERENCES public.criancas(id) ON DELETE CASCADE,
  ano_referencia integer NOT NULL DEFAULT (EXTRACT(year FROM now()))::integer,
  acao text NOT NULL,
  justificativa text,
  turma_destino_id uuid REFERENCES public.turmas(id),
  cmei_destino_id uuid REFERENCES public.cmeis(id),
  status text NOT NULL DEFAULT 'planejado',
  aplicado_em timestamp with time zone,
  aplicado_por uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE(crianca_id, ano_referencia)
);

-- Chat Mensagens
CREATE TABLE IF NOT EXISTS public.chat_mensagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crianca_id UUID REFERENCES public.criancas(id) ON DELETE CASCADE,
  responsavel_id UUID REFERENCES public.profiles(id),
  responsavel_telefone TEXT,
  responsavel_nome TEXT,
  direcao TEXT NOT NULL CHECK (direcao IN ('admin', 'responsavel')),
  conteudo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto', 'imagem', 'documento', 'audio')),
  arquivo_url TEXT,
  reply_to_id UUID REFERENCES public.chat_mensagens(id) ON DELETE SET NULL,
  enviado_por UUID REFERENCES auth.users(id),
  lida_em TIMESTAMP WITH TIME ZONE,
  lida_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat Configurações de Conversa
CREATE TABLE IF NOT EXISTS public.chat_conversas_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  responsavel_id UUID REFERENCES public.profiles(id),
  responsavel_telefone text,
  arquivada boolean DEFAULT false,
  fixada boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Chat Marcadores
CREATE TABLE IF NOT EXISTS public.chat_marcadores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  cor text NOT NULL DEFAULT '#3b82f6',
  descricao text,
  ativo boolean DEFAULT true,
  ordem integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Chat Conversa Marcadores
CREATE TABLE IF NOT EXISTS public.chat_conversa_marcadores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  responsavel_id UUID REFERENCES public.profiles(id),
  responsavel_telefone text,
  marcador_id uuid NOT NULL REFERENCES public.chat_marcadores(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(responsavel_telefone, marcador_id)
);

-- Chat Respostas Rápidas
CREATE TABLE IF NOT EXISTS public.chat_respostas_rapidas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  atalho text,
  categoria text,
  ativo boolean DEFAULT true,
  ordem integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Tutoriais Vídeos
CREATE TABLE IF NOT EXISTS public.tutoriais_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  youtube_id text NOT NULL,
  duracao text,
  thumbnail_url text,
  ordem integer DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid
);

-- Tutorial Seções
CREATE TABLE IF NOT EXISTS public.tutorial_secoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  icone TEXT DEFAULT 'help-circle',
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  conteudo JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tutorial FAQ
CREATE TABLE IF NOT EXISTS public.tutorial_faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT NOT NULL,
  pergunta TEXT NOT NULL,
  resposta TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tutorial Dicas
CREATE TABLE IF NOT EXISTS public.tutorial_dicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  icone TEXT DEFAULT 'info',
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- =============================================================================
-- 4. ÍNDICES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_notificacoes_log_crianca_id ON public.notificacoes_log(crianca_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_log_tipo ON public.notificacoes_log(tipo);
CREATE INDEX IF NOT EXISTS idx_notificacoes_log_canal ON public.notificacoes_log(canal);
CREATE INDEX IF NOT EXISTS idx_notificacoes_log_status ON public.notificacoes_log(status);
CREATE INDEX IF NOT EXISTS idx_notificacoes_log_created_at ON public.notificacoes_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_turmas_base_ordem ON public.turmas_base(ordem);
CREATE INDEX IF NOT EXISTS idx_turmas_base_ativo ON public.turmas_base(ativo);
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_crianca ON public.chat_mensagens(crianca_id);
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_telefone ON public.chat_mensagens(responsavel_telefone);
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_created ON public.chat_mensagens(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_direcao ON public.chat_mensagens(direcao);
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_responsavel_id ON public.chat_mensagens(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversas_config_responsavel_id ON public.chat_conversas_config(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversa_marcadores_responsavel_id ON public.chat_conversa_marcadores(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_reply_to ON public.chat_mensagens(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup ON public.rate_limit_entries(identifier, endpoint, window_start);
CREATE INDEX IF NOT EXISTS idx_planejamento_transicao_ano ON public.planejamento_transicao(ano_referencia);
CREATE INDEX IF NOT EXISTS idx_planejamento_transicao_status ON public.planejamento_transicao(status);
CREATE INDEX IF NOT EXISTS idx_planejamento_transicao_crianca ON public.planejamento_transicao(crianca_id);

-- =============================================================================
-- 5. FUNÇÕES
-- =============================================================================

-- Função de atualização de updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Função para verificar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id 
    AND role IN ('admin', 'superadmin', 'gestor', 'diretor_cmei')
  )
$$;

-- Função para verificar permissão
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissoes rp ON ur.role = rp.role
    JOIN public.permissoes p ON rp.permissao_id = p.id
    WHERE ur.user_id = _user_id AND p.codigo = _permission_code
  ) OR has_role(_user_id, 'superadmin')
$$;

-- Função para obter CMEIs do diretor
CREATE OR REPLACE FUNCTION public.get_user_cmei_ids(_user_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(cmei_id), ARRAY[]::uuid[])
  FROM public.diretor_cmei_vinculo
  WHERE user_id = _user_id
$$;

-- Função para verificar acesso do diretor ao CMEI
CREATE OR REPLACE FUNCTION public.director_has_cmei_access(_user_id uuid, _cmei_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.diretor_cmei_vinculo
    WHERE user_id = _user_id AND cmei_id = _cmei_id
  ) OR is_admin(_user_id)
$$;

-- Função para vincular crianças pelo CPF
CREATE OR REPLACE FUNCTION public.link_children_by_cpf(_user_id uuid, _cpf text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cpf_limpo text;
  rows_updated integer;
BEGIN
  cpf_limpo := regexp_replace(_cpf, '[^0-9]', '', 'g');
  UPDATE criancas
  SET responsavel_user_id = _user_id
  WHERE responsavel_cpf = cpf_limpo
    AND responsavel_user_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$$;

-- Função para handle_new_user (atualizada para incluir dados do metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome_completo, cpf, telefone)
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.raw_user_meta_data ->> 'nome_completo',
    NEW.raw_user_meta_data ->> 'cpf',
    NEW.raw_user_meta_data ->> 'telefone'
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'responsavel');
  RETURN NEW;
END;
$$;

-- Função de auditoria
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_ip text;
BEGIN
  BEGIN
    client_ip := inet_client_addr()::text;
  EXCEPTION WHEN OTHERS THEN
    client_ip := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.auditoria (tabela, operacao, registro_id, dados_novos, usuario_id, ip_address, created_at)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, to_jsonb(NEW), auth.uid(), client_ip, now());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.auditoria (tabela, operacao, registro_id, dados_antigos, dados_novos, usuario_id, ip_address, created_at)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, to_jsonb(OLD), to_jsonb(NEW), auth.uid(), client_ip, now());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.auditoria (tabela, operacao, registro_id, dados_antigos, usuario_id, ip_address, created_at)
    VALUES (TG_TABLE_NAME, TG_OP, OLD.id, to_jsonb(OLD), auth.uid(), client_ip, now());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Função para registrar auditoria via RPC
CREATE OR REPLACE FUNCTION public.registrar_auditoria(
  p_tabela text,
  p_operacao text,
  p_registro_id uuid DEFAULT NULL,
  p_dados_antigos jsonb DEFAULT NULL,
  p_dados_novos jsonb DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.auditoria (tabela, operacao, registro_id, dados_antigos, dados_novos, usuario_id, ip_address, user_agent, created_at)
  VALUES (p_tabela, p_operacao, p_registro_id, p_dados_antigos, p_dados_novos, auth.uid(), p_ip_address, p_user_agent, now())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Função para recalcular posições da fila (atualizada para incluir remanejamentos)
CREATE OR REPLACE FUNCTION public.recalcular_posicoes_fila()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prioridade_social boolean;
  v_prioridade_remanejamento boolean;
  v_priorizar_zona boolean;
BEGIN
  SELECT 
    COALESCE(prioridade_social_habilitada, true),
    COALESCE(prioridade_remanejamento_habilitada, true),
    COALESCE(priorizar_zona, false)
  INTO v_prioridade_social, v_prioridade_remanejamento, v_priorizar_zona
  FROM configuracoes_sistema
  LIMIT 1;

  WITH prioridades_soma AS (
    SELECT 
      cp.crianca_id, 
      COALESCE(SUM(tp.peso), 0) as peso_total
    FROM crianca_prioridades cp
    JOIN tipos_prioridade tp ON cp.prioridade_id = tp.id
    WHERE cp.status = 'aprovado' AND tp.ativo = true
    GROUP BY cp.crianca_id
  ),
  posicoes_novas AS (
    SELECT 
      c.id,
      ROW_NUMBER() OVER (
        ORDER BY 
          -- Primeiro critério: Remanejamento (prioridade máxima se habilitado)
          -- Crianças matriculadas COM remanejamento solicitado vêm primeiro
          CASE 
            WHEN v_prioridade_remanejamento AND c.cmei_remanejamento_id IS NOT NULL THEN 1000
            WHEN v_prioridade_social AND c.programas_sociais = true THEN 500
            ELSE 100
          END DESC,
          -- Segundo critério: Peso das prioridades customizadas
          COALESCE(ps.peso_total, 0) DESC,
          -- Terceiro critério: Data de entrada/retorno na fila
          COALESCE(c.data_retorno_fila, c.created_at) ASC
      )::int as nova_posicao
    FROM criancas c
    LEFT JOIN prioridades_soma ps ON c.id = ps.crianca_id
    WHERE c.status IN ('Fila de Espera', 'Convocado')
       -- INCLUIR também crianças matriculadas que solicitaram remanejamento
       OR (c.status IN ('Matriculado', 'Matriculada') AND c.cmei_remanejamento_id IS NOT NULL)
  )
  UPDATE criancas c
  SET posicao_fila = p.nova_posicao
  FROM posicoes_novas p
  WHERE c.id = p.id
    AND (c.posicao_fila IS DISTINCT FROM p.nova_posicao);
  
  -- Limpa posição de quem não está mais na fila (e não tem remanejamento pendente)
  UPDATE criancas
  SET posicao_fila = NULL
  WHERE status NOT IN ('Fila de Espera', 'Convocado')
    AND cmei_remanejamento_id IS NULL
    AND posicao_fila IS NOT NULL;
END;
$$;

-- Função trigger para atualizar posição da fila (atualizada para verificar remanejamento)
CREATE OR REPLACE FUNCTION public.trigger_atualizar_posicao_fila()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('Fila de Espera', 'Convocado') OR NEW.cmei_remanejamento_id IS NOT NULL THEN
      PERFORM recalcular_posicoes_fila();
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Recalcula se mudou status, prioridade OU cmei_remanejamento_id
    IF (OLD.status IS DISTINCT FROM NEW.status) OR 
       (OLD.prioridade IS DISTINCT FROM NEW.prioridade) OR
       (OLD.cmei_remanejamento_id IS DISTINCT FROM NEW.cmei_remanejamento_id) THEN
      PERFORM recalcular_posicoes_fila();
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('Fila de Espera', 'Convocado') OR OLD.cmei_remanejamento_id IS NOT NULL THEN
      PERFORM recalcular_posicoes_fila();
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Função para verificar se turma pode ser desativada
CREATE OR REPLACE FUNCTION public.check_turma_can_deactivate()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.ativo = true AND NEW.ativo = false THEN
    IF EXISTS (
      SELECT 1 FROM criancas 
      WHERE turma_atual_id = OLD.id 
      AND status IN ('Matriculado', 'Matriculada', 'Convocado', 'Aguardando Documentação')
    ) THEN
      RAISE EXCEPTION 'Não é possível inativar esta turma porque existem crianças convocadas ou matriculadas vinculadas.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Função para limpeza de rate limits
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limit_entries WHERE window_start < now() - INTERVAL '1 hour';
END;
$$;

-- =============================================================================
-- FUNÇÕES DE SEGURANÇA PARA INSCRIÇÃO PÚBLICA
-- =============================================================================

-- Função para validar CPF (com checksum)
CREATE OR REPLACE FUNCTION public.validar_cpf(cpf text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cpf_limpo text;
  soma integer;
  resto integer;
  dv1 integer;
  dv2 integer;
BEGIN
  cpf_limpo := regexp_replace(cpf, '\D', '', 'g');
  
  -- Validações básicas
  IF length(cpf_limpo) != 11 THEN
    RETURN false;
  END IF;
  
  -- CPF com todos os dígitos iguais é inválido
  IF cpf_limpo ~ '^(\d)\1{10}$' THEN
    RETURN false;
  END IF;
  
  -- Cálculo do primeiro dígito verificador
  soma := 0;
  FOR i IN 1..9 LOOP
    soma := soma + substring(cpf_limpo, i, 1)::integer * (11 - i);
  END LOOP;
  resto := soma % 11;
  dv1 := CASE WHEN resto < 2 THEN 0 ELSE 11 - resto END;
  
  IF substring(cpf_limpo, 10, 1)::integer != dv1 THEN
    RETURN false;
  END IF;
  
  -- Cálculo do segundo dígito verificador
  soma := 0;
  FOR i IN 1..10 LOOP
    soma := soma + substring(cpf_limpo, i, 1)::integer * (12 - i);
  END LOOP;
  resto := soma % 11;
  dv2 := CASE WHEN resto < 2 THEN 0 ELSE 11 - resto END;
  
  IF substring(cpf_limpo, 11, 1)::integer != dv2 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Função para consulta pública por CPF (com rate limiting e validação)
CREATE OR REPLACE FUNCTION public.consulta_publica_por_cpf(p_cpf text)
RETURNS TABLE(
  id uuid,
  nome text,
  data_nascimento date,
  status status_crianca,
  posicao_fila integer,
  convocacao_deadline date,
  cmei_atual_nome text,
  turma_atual_nome text,
  cmei1_nome text,
  cmei2_nome text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cpf_limpo text;
  v_rate_limit_count integer;
BEGIN
  -- Limpa CPF
  cpf_limpo := regexp_replace(p_cpf, '\D', '', 'g');
  
  -- Valida CPF com checksum
  IF NOT validar_cpf(cpf_limpo) THEN
    RAISE EXCEPTION 'CPF inválido';
  END IF;
  
  -- Rate limiting: max 5 consultas por CPF a cada hora
  SELECT COUNT(*) INTO v_rate_limit_count
  FROM rate_limit_entries
  WHERE identifier = cpf_limpo
    AND endpoint = 'consulta_cpf'
    AND window_start > now() - interval '1 hour';
  
  IF v_rate_limit_count >= 5 THEN
    RAISE EXCEPTION 'Limite de consultas excedido. Tente novamente em uma hora.';
  END IF;
  
  -- Registra consulta para rate limiting
  INSERT INTO rate_limit_entries (identifier, endpoint, window_start)
  VALUES (cpf_limpo, 'consulta_cpf', now());
  
  RETURN QUERY
  SELECT 
    c.id,
    -- Retorna apenas iniciais para privacidade
    (SELECT string_agg(substr(word, 1, 1) || '.', '')
     FROM unnest(string_to_array(c.nome, ' ')) AS word
     WHERE word <> '') AS nome,
    c.data_nascimento,
    c.status,
    c.posicao_fila,
    c.convocacao_deadline,
    cmei_atual.nome AS cmei_atual_nome,
    turma_atual.nome AS turma_atual_nome,
    cmei1.nome AS cmei1_nome,
    cmei2.nome AS cmei2_nome
  FROM criancas c
  LEFT JOIN cmeis cmei_atual ON c.cmei_atual_id = cmei_atual.id
  LEFT JOIN turmas turma_atual ON c.turma_atual_id = turma_atual.id
  LEFT JOIN cmeis cmei1 ON c.cmei1_preferencia = cmei1.id
  LEFT JOIN cmeis cmei2 ON c.cmei2_preferencia = cmei2.id
  WHERE c.responsavel_cpf = cpf_limpo;
END;
$$;

-- Função para verificar duplicidade de inscrição
CREATE OR REPLACE FUNCTION public.verificar_duplicidade_inscricao(
  p_nome text,
  p_data_nascimento date,
  p_responsavel_cpf text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cpf_limpo text;
  v_nome_normalizado text;
  v_crianca_duplicada record;
  v_total_por_cpf integer;
BEGIN
  v_cpf_limpo := regexp_replace(p_responsavel_cpf, '[^0-9]', '', 'g');
  v_nome_normalizado := lower(trim(p_nome));
  
  -- Verificar criança com mesmo nome e data de nascimento
  SELECT id, nome, status INTO v_crianca_duplicada
  FROM criancas
  WHERE lower(trim(nome)) = v_nome_normalizado
    AND data_nascimento = p_data_nascimento
  LIMIT 1;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'duplicada', true,
      'motivo', 'nome_data',
      'nome', v_crianca_duplicada.nome,
      'status', v_crianca_duplicada.status
    );
  END IF;
  
  -- Verificar se responsável já inscreveu criança com mesmo nome
  SELECT id, nome, status INTO v_crianca_duplicada
  FROM criancas
  WHERE responsavel_cpf = v_cpf_limpo
    AND lower(trim(nome)) = v_nome_normalizado
  LIMIT 1;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'duplicada', true,
      'motivo', 'cpf_nome',
      'nome', v_crianca_duplicada.nome,
      'status', v_crianca_duplicada.status
    );
  END IF;
  
  -- Contar total de inscrições do responsável
  SELECT COUNT(*) INTO v_total_por_cpf
  FROM criancas
  WHERE responsavel_cpf = v_cpf_limpo;
  
  RETURN jsonb_build_object(
    'duplicada', false,
    'total_inscricoes_cpf', v_total_por_cpf
  );
END;
$$;

-- Função para inserir inscrição pública (com validações de segurança)
CREATE OR REPLACE FUNCTION public.inserir_inscricao_publica(
  p_nome text,
  p_data_nascimento date,
  p_sexo text,
  p_responsavel_nome text,
  p_responsavel_cpf text,
  p_responsavel_telefone text,
  p_responsavel_email text DEFAULT NULL,
  p_responsavel_celular text DEFAULT NULL,
  p_cpf_crianca text DEFAULT NULL,
  p_certidao_nascimento text DEFAULT NULL,
  p_cep text DEFAULT NULL,
  p_logradouro text DEFAULT NULL,
  p_numero text DEFAULT NULL,
  p_complemento text DEFAULT NULL,
  p_bairro text DEFAULT NULL,
  p_cidade text DEFAULT NULL,
  p_estado text DEFAULT NULL,
  p_cmei1_preferencia uuid DEFAULT NULL,
  p_cmei2_preferencia uuid DEFAULT NULL,
  p_aceita_qualquer_cmei boolean DEFAULT false,
  p_programas_sociais boolean DEFAULT false,
  p_observacoes text DEFAULT NULL,
  p_responsavel_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_crianca_id uuid;
  v_prioridade prioridade_tipo;
  v_cpf_limpo text;
  v_cpf_crianca_limpo text;
  v_rate_limit_count integer;
  v_limite_inscricoes integer;
  v_inscricoes_existentes integer;
BEGIN
  -- Limpa CPF
  v_cpf_limpo := regexp_replace(p_responsavel_cpf, '\D', '', 'g');
  
  -- Valida CPF com checksum (validação completa)
  IF NOT validar_cpf(v_cpf_limpo) THEN
    RAISE EXCEPTION 'CPF do responsável inválido: não passou na verificação de dígitos';
  END IF;
  
  -- Valida CPF da criança se informado
  IF p_cpf_crianca IS NOT NULL AND trim(p_cpf_crianca) != '' THEN
    v_cpf_crianca_limpo := regexp_replace(p_cpf_crianca, '\D', '', 'g');
    IF length(v_cpf_crianca_limpo) > 0 AND NOT validar_cpf(v_cpf_crianca_limpo) THEN
      RAISE EXCEPTION 'CPF da criança inválido: não passou na verificação de dígitos';
    END IF;
  END IF;
  
  -- Validação de nomes
  IF length(trim(p_nome)) < 3 THEN
    RAISE EXCEPTION 'Nome da criança deve ter pelo menos 3 caracteres';
  END IF;
  
  IF length(trim(p_responsavel_nome)) < 3 THEN
    RAISE EXCEPTION 'Nome do responsável deve ter pelo menos 3 caracteres';
  END IF;
  
  -- Rate limiting: max 5 inscrições por CPF a cada hora
  SELECT COUNT(*) INTO v_rate_limit_count
  FROM rate_limit_entries
  WHERE identifier = v_cpf_limpo
    AND endpoint = 'inscricao_publica'
    AND window_start > now() - interval '1 hour';
  
  IF v_rate_limit_count >= 5 THEN
    RAISE EXCEPTION 'Limite de inscrições excedido. Aguarde antes de tentar novamente.';
  END IF;
  
  -- Registra tentativa para rate limiting
  INSERT INTO rate_limit_entries (identifier, endpoint, window_start)
  VALUES (v_cpf_limpo, 'inscricao_publica', now());
  
  -- Verifica limite de inscrições por responsável
  SELECT COALESCE(limite_inscricoes_responsavel, 5) INTO v_limite_inscricoes
  FROM configuracoes_sistema LIMIT 1;
  
  SELECT COUNT(*) INTO v_inscricoes_existentes
  FROM criancas
  WHERE responsavel_cpf = v_cpf_limpo
    AND status NOT IN ('Desistente', 'Recusada', 'Transferido');
  
  IF v_inscricoes_existentes >= v_limite_inscricoes THEN
    RAISE EXCEPTION 'Limite de inscrições ativas atingido (máximo: %)', v_limite_inscricoes;
  END IF;
  
  -- Determina prioridade
  v_prioridade := CASE WHEN p_programas_sociais THEN 'Social'::prioridade_tipo ELSE 'Geral'::prioridade_tipo END;
  
  -- Insere criança
  INSERT INTO criancas (
    nome, data_nascimento, sexo, responsavel_nome, responsavel_cpf, responsavel_telefone,
    responsavel_email, responsavel_celular, cpf_crianca, certidao_nascimento,
    cep, logradouro, numero, complemento, bairro, cidade, estado,
    cmei1_preferencia, cmei2_preferencia, aceita_qualquer_cmei, programas_sociais,
    observacoes, responsavel_user_id, status, prioridade
  ) VALUES (
    trim(p_nome), p_data_nascimento, p_sexo::sexo_tipo, trim(p_responsavel_nome), v_cpf_limpo,
    p_responsavel_telefone, lower(trim(p_responsavel_email)), p_responsavel_celular,
    CASE WHEN p_cpf_crianca IS NOT NULL AND trim(p_cpf_crianca) != '' 
         THEN regexp_replace(p_cpf_crianca, '\D', '', 'g') 
         ELSE NULL END,
    p_certidao_nascimento, p_cep, p_logradouro, p_numero, p_complemento, p_bairro, p_cidade, p_estado,
    p_cmei1_preferencia, p_cmei2_preferencia, p_aceita_qualquer_cmei, p_programas_sociais,
    p_observacoes, p_responsavel_user_id, 'Fila de Espera'::status_crianca, v_prioridade
  )
  RETURNING id INTO v_crianca_id;
  
  -- Insere histórico
  INSERT INTO historico (crianca_id, acao, descricao, status_novo)
  VALUES (v_crianca_id, 'Inscrição Realizada', 'Inscrição realizada através do formulário público', 'Fila de Espera'::status_crianca);
  
  -- Recalcula posições da fila
  PERFORM recalcular_posicoes_fila();
  
  RETURN v_crianca_id;
END;
$$;

-- Função para registrar histórico de campos de inscrição
CREATE OR REPLACE FUNCTION public.registrar_historico_campos_inscricao()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO campos_inscricao_historico (campo_id, operacao, dados_anteriores, dados_novos, usuario_id)
    VALUES (NULL, 'DELETE', row_to_json(OLD), NULL, auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO campos_inscricao_historico (campo_id, operacao, dados_anteriores, dados_novos, usuario_id)
    VALUES (NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO campos_inscricao_historico (campo_id, operacao, dados_anteriores, dados_novos, usuario_id)
    VALUES (NEW.id, 'INSERT', NULL, row_to_json(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para obter configurações públicas
CREATE OR REPLACE FUNCTION public.get_public_configuracoes()
RETURNS TABLE (
  nome_municipio text, nome_secretaria text, email_contato text, telefone_contato text, brasao_url text, 
  data_inicio_inscricao timestamp with time zone, data_fim_inscricao timestamp with time zone, 
  prazo_resposta_dias integer, autenticacao_publica boolean, sistema_nome text, sistema_icone_url text, 
  tema_cor_primaria text, tema_cor_secundaria text, tema_fonte text, tema_padrao text, 
  app_nome text, app_icone_url text, app_playstore_url text, app_appstore_url text, 
  modo_manutencao boolean, mensagem_manutencao text, bloquear_novas_inscricoes boolean, 
  motivo_bloqueio_inscricoes text, captcha_habilitado boolean, captcha_site_key text, 
  favicon_url text, permitir_troca_tema boolean, modo_demonstracao boolean, demo_mensagem text,
  endereco_secretaria text, endereco_latitude double precision, endereco_longitude double precision
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    nome_municipio, nome_secretaria, email_contato, telefone_contato, brasao_url,
    data_inicio_inscricao, data_fim_inscricao, prazo_resposta_dias, autenticacao_publica,
    sistema_nome, sistema_icone_url, tema_cor_primaria, tema_cor_secundaria, tema_fonte, tema_padrao,
    app_nome, app_icone_url, app_playstore_url, app_appstore_url,
    modo_manutencao, mensagem_manutencao, bloquear_novas_inscricoes, motivo_bloqueio_inscricoes,
    captcha_habilitado, captcha_site_key, favicon_url, permitir_troca_tema, modo_demonstracao, demo_mensagem,
    endereco_secretaria, endereco_latitude, endereco_longitude
  FROM configuracoes_sistema
  WHERE registro_unico = true
  ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
  LIMIT 1
$$;

-- Função para obter fila pública
CREATE OR REPLACE FUNCTION public.get_fila_publica()
RETURNS TABLE(
  id uuid, nome text, data_nascimento date, sexo text, status text, posicao_fila integer, 
  prioridade text, programas_sociais boolean, created_at timestamp with time zone, 
  cmei1_nome text, cmei2_nome text, responsavel_nome text, convocacao_deadline date, cmei_remanejamento_id uuid
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    c.id,
    (SELECT string_agg(substr(word, 1, 1) || '.', '')
     FROM unnest(string_to_array(c.nome, ' ')) AS word
     WHERE word <> '') as nome,
    c.data_nascimento,
    c.sexo::text,
    c.status::text,
    c.posicao_fila,
    c.prioridade::text,
    c.programas_sociais,
    c.created_at,
    cmei1.nome as cmei1_nome,
    cmei2.nome as cmei2_nome,
    (SELECT string_agg(substr(word, 1, 1) || '.', '')
     FROM unnest(string_to_array(c.responsavel_nome, ' ')) AS word
     WHERE word <> '') as responsavel_nome,
    c.convocacao_deadline,
    c.cmei_remanejamento_id
  FROM criancas c
  LEFT JOIN cmeis cmei1 ON c.cmei1_preferencia = cmei1.id
  LEFT JOIN cmeis cmei2 ON c.cmei2_preferencia = cmei2.id
  WHERE c.status IN ('Fila de Espera', 'Convocado')
  ORDER BY 
    CASE WHEN c.status = 'Convocado' THEN 0 ELSE 1 END ASC,
    c.posicao_fila ASC NULLS LAST,
    COALESCE(c.data_retorno_fila, c.created_at) ASC
$$;

-- Função para obter ocupação dos CMEIs
CREATE OR REPLACE FUNCTION public.get_ocupacao_cmeis()
RETURNS TABLE (
  id uuid, nome text, endereco text, bairro text, telefone text, email text,
  latitude double precision, longitude double precision, capacidade_total integer, ocupados bigint, percentual integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id, c.nome, c.endereco, c.bairro, c.telefone, c.email, c.latitude, c.longitude, c.capacidade_total,
    COALESCE((SELECT COUNT(*) FROM criancas cr WHERE cr.cmei_atual_id = c.id 
      AND cr.status IN ('Matriculado', 'Matriculada', 'Convocado', 'Aguardando Documentação')), 0) as ocupados,
    CASE WHEN c.capacidade_total > 0 THEN 
      ROUND((COALESCE((SELECT COUNT(*) FROM criancas cr WHERE cr.cmei_atual_id = c.id 
        AND cr.status IN ('Matriculado', 'Matriculada', 'Convocado', 'Aguardando Documentação')), 0)::numeric / c.capacidade_total::numeric) * 100)::integer
    ELSE 0 END as percentual
  FROM cmeis c WHERE c.ativo = true ORDER BY c.nome
$$;

-- Função para obter ocupação das turmas
CREATE OR REPLACE FUNCTION public.get_ocupacao_turmas()
RETURNS TABLE (
  id uuid, nome text, turma_base text, turno text, capacidade integer, ocupados bigint, percentual integer, cmei_id uuid, cmei_nome text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.id, t.nome, t.turma_base, t.turno, t.capacidade,
    COALESCE((SELECT COUNT(*) FROM criancas cr WHERE cr.turma_atual_id = t.id 
      AND cr.status IN ('Matriculado', 'Matriculada', 'Convocado', 'Aguardando Documentação')), 0) as ocupados,
    CASE WHEN t.capacidade > 0 THEN 
      ROUND((COALESCE((SELECT COUNT(*) FROM criancas cr WHERE cr.turma_atual_id = t.id 
        AND cr.status IN ('Matriculado', 'Matriculada', 'Convocado', 'Aguardando Documentação')), 0)::numeric / t.capacidade::numeric) * 100)::integer
    ELSE 0 END as percentual,
    t.cmei_id, COALESCE(c.nome, 'Sem CMEI') as cmei_nome
  FROM turmas t LEFT JOIN cmeis c ON t.cmei_id = c.id WHERE t.ativo = true ORDER BY t.turma_base, t.nome
$$;

-- Função para obter histórico público da fila
CREATE OR REPLACE FUNCTION public.get_historico_fila_publico()
RETURNS TABLE (id uuid, acao text, created_at timestamp with time zone, crianca_nome text, crianca_status text, crianca_data_nascimento date)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    h.id, h.acao, h.created_at,
    (SELECT string_agg(substr(word, 1, 1) || '.', '') FROM unnest(string_to_array(c.nome, ' ')) AS word WHERE word <> '') as crianca_nome,
    c.status::text as crianca_status, c.data_nascimento as crianca_data_nascimento
  FROM historico h
  LEFT JOIN criancas c ON h.crianca_id = c.id
  WHERE h.acao IN ('Desistência', 'Recusada', 'Fim de Fila', 'Prazo Expirado', 'Matrícula Confirmada')
    AND (h.acao = 'Matrícula Confirmada' OR c.status IS NULL OR c.status != 'Fila de Espera')
  ORDER BY h.created_at DESC LIMIT 50
$$;

-- =============================================================================
-- 6. TRIGGERS
-- =============================================================================

-- Triggers de updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_configuracoes_sistema_updated_at ON public.configuracoes_sistema;
CREATE TRIGGER update_configuracoes_sistema_updated_at BEFORE UPDATE ON public.configuracoes_sistema FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cmeis_updated_at ON public.cmeis;
CREATE TRIGGER update_cmeis_updated_at BEFORE UPDATE ON public.cmeis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_turmas_updated_at ON public.turmas;
CREATE TRIGGER update_turmas_updated_at BEFORE UPDATE ON public.turmas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_criancas_updated_at ON public.criancas;
CREATE TRIGGER update_criancas_updated_at BEFORE UPDATE ON public.criancas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_turmas_base_updated_at ON public.turmas_base;
CREATE TRIGGER update_turmas_base_updated_at BEFORE UPDATE ON public.turmas_base FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notificacoes_log_updated_at ON public.notificacoes_log;
CREATE TRIGGER update_notificacoes_log_updated_at BEFORE UPDATE ON public.notificacoes_log FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_documentos_tipos_updated_at ON public.documentos_tipos;
CREATE TRIGGER update_documentos_tipos_updated_at BEFORE UPDATE ON public.documentos_tipos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_documentos_crianca_updated_at ON public.documentos_crianca;
CREATE TRIGGER update_documentos_crianca_updated_at BEFORE UPDATE ON public.documentos_crianca FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tutoriais_videos_updated_at ON public.tutoriais_videos;
CREATE TRIGGER update_tutoriais_videos_updated_at BEFORE UPDATE ON public.tutoriais_videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_conversas_config_updated_at ON public.chat_conversas_config;
CREATE TRIGGER update_chat_conversas_config_updated_at BEFORE UPDATE ON public.chat_conversas_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_mensagens_updated_at ON public.chat_mensagens;
CREATE TRIGGER update_chat_mensagens_updated_at BEFORE UPDATE ON public.chat_mensagens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_templates_mensagens_updated_at ON public.templates_mensagens;
CREATE TRIGGER update_templates_mensagens_updated_at BEFORE UPDATE ON public.templates_mensagens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_mensagens_status_custom_updated_at ON public.mensagens_status_custom;
CREATE TRIGGER update_mensagens_status_custom_updated_at BEFORE UPDATE ON public.mensagens_status_custom FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_campos_inscricao_updated_at ON public.campos_inscricao;
CREATE TRIGGER update_campos_inscricao_updated_at BEFORE UPDATE ON public.campos_inscricao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tipos_prioridade_updated_at ON public.tipos_prioridade;
CREATE TRIGGER update_tipos_prioridade_updated_at BEFORE UPDATE ON public.tipos_prioridade FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_crianca_prioridades_updated_at ON public.crianca_prioridades;
CREATE TRIGGER update_crianca_prioridades_updated_at BEFORE UPDATE ON public.crianca_prioridades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_zonas_atendimento_updated_at ON public.zonas_atendimento;
CREATE TRIGGER update_zonas_atendimento_updated_at BEFORE UPDATE ON public.zonas_atendimento FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_planejamento_transicao_updated_at ON public.planejamento_transicao;
CREATE TRIGGER update_planejamento_transicao_updated_at BEFORE UPDATE ON public.planejamento_transicao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tutorial_secoes_updated_at ON public.tutorial_secoes;
CREATE TRIGGER update_tutorial_secoes_updated_at BEFORE UPDATE ON public.tutorial_secoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tutorial_faq_updated_at ON public.tutorial_faq;
CREATE TRIGGER update_tutorial_faq_updated_at BEFORE UPDATE ON public.tutorial_faq FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger de criação de usuário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers de auditoria
DROP TRIGGER IF EXISTS audit_criancas_trigger ON public.criancas;
CREATE TRIGGER audit_criancas_trigger AFTER INSERT OR UPDATE OR DELETE ON public.criancas FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_configuracoes_sistema_trigger ON public.configuracoes_sistema;
CREATE TRIGGER audit_configuracoes_sistema_trigger AFTER INSERT OR UPDATE OR DELETE ON public.configuracoes_sistema FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_user_roles_trigger ON public.user_roles;
CREATE TRIGGER audit_user_roles_trigger AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_cmeis_trigger ON public.cmeis;
CREATE TRIGGER audit_cmeis_trigger AFTER INSERT OR UPDATE OR DELETE ON public.cmeis FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_turmas_trigger ON public.turmas;
CREATE TRIGGER audit_turmas_trigger AFTER INSERT OR UPDATE OR DELETE ON public.turmas FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Trigger de validação de turma
DROP TRIGGER IF EXISTS trigger_check_turma_deactivate ON public.turmas;
CREATE TRIGGER trigger_check_turma_deactivate BEFORE UPDATE ON public.turmas FOR EACH ROW EXECUTE FUNCTION check_turma_can_deactivate();

-- Trigger de histórico de campos de inscrição
DROP TRIGGER IF EXISTS trigger_campos_inscricao_historico ON public.campos_inscricao;
CREATE TRIGGER trigger_campos_inscricao_historico AFTER INSERT OR UPDATE OR DELETE ON public.campos_inscricao FOR EACH ROW EXECUTE FUNCTION registrar_historico_campos_inscricao();

-- Trigger de recálculo de fila
DROP TRIGGER IF EXISTS trigger_atualizar_posicao_fila ON public.criancas;
CREATE TRIGGER trigger_atualizar_posicao_fila AFTER INSERT OR UPDATE OR DELETE ON public.criancas FOR EACH ROW EXECUTE FUNCTION trigger_atualizar_posicao_fila();

-- =============================================================================
-- 7. HABILITAR RLS (Row Level Security)
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmeis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diretor_cmei_vinculo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_tipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_crianca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_prioridade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crianca_prioridades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens_status_custom ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feriados_municipais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motivos_padrao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campos_inscricao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campos_inscricao_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valores_campos_custom ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zonas_atendimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmei_zonas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planejamento_transicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversas_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_marcadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversa_marcadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_respostas_rapidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutoriais_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutorial_secoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutorial_faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutorial_dicas ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 8. POLÍTICAS RLS
-- =============================================================================

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
CREATE POLICY "Admin can view all profiles" ON public.profiles FOR SELECT USING (is_admin(auth.uid()));

-- User Roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- Configurações do Sistema
DROP POLICY IF EXISTS "Admins can read all configurations" ON public.configuracoes_sistema;
CREATE POLICY "Admins can read all configurations" ON public.configuracoes_sistema FOR SELECT USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin can update configurations" ON public.configuracoes_sistema;
CREATE POLICY "Admin can update configurations" ON public.configuracoes_sistema FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin can insert configurations" ON public.configuracoes_sistema;
CREATE POLICY "Admin can insert configurations" ON public.configuracoes_sistema FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- CMEIs
DROP POLICY IF EXISTS "Anyone can view active CMEIs" ON public.cmeis;
CREATE POLICY "Anyone can view active CMEIs" ON public.cmeis FOR SELECT USING (ativo = true);

DROP POLICY IF EXISTS "Admin can manage CMEIs" ON public.cmeis;
CREATE POLICY "Admin can manage CMEIs" ON public.cmeis FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Turmas
DROP POLICY IF EXISTS "Anyone can view active turmas" ON public.turmas;
CREATE POLICY "Anyone can view active turmas" ON public.turmas FOR SELECT USING (ativo = true);

DROP POLICY IF EXISTS "Admin can manage turmas" ON public.turmas;
CREATE POLICY "Admin can manage turmas" ON public.turmas FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Turmas Base
DROP POLICY IF EXISTS "Anyone can view active base classes" ON public.turmas_base;
CREATE POLICY "Anyone can view active base classes" ON public.turmas_base FOR SELECT USING (ativo = true);

DROP POLICY IF EXISTS "Admin can manage base classes" ON public.turmas_base;
CREATE POLICY "Admin can manage base classes" ON public.turmas_base FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Crianças
DROP POLICY IF EXISTS "Public can insert inscriptions" ON public.criancas;
CREATE POLICY "Public can insert inscriptions" ON public.criancas FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Responsavel can view own children" ON public.criancas;
CREATE POLICY "Responsavel can view own children" ON public.criancas FOR SELECT USING (auth.uid() = responsavel_user_id OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin can manage all children" ON public.criancas;
CREATE POLICY "Admin can manage all children" ON public.criancas FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Responsavel can update own children contact info" ON public.criancas;
CREATE POLICY "Responsavel can update own children contact info" ON public.criancas FOR UPDATE USING (auth.uid() = responsavel_user_id) WITH CHECK (auth.uid() = responsavel_user_id);

-- Histórico
DROP POLICY IF EXISTS "Responsavel can view own children history" ON public.historico;
CREATE POLICY "Responsavel can view own children history" ON public.historico FOR SELECT USING (
  EXISTS (SELECT 1 FROM criancas WHERE criancas.id = historico.crianca_id AND criancas.responsavel_user_id = auth.uid()) OR is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Admin can manage history" ON public.historico;
CREATE POLICY "Admin can manage history" ON public.historico FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Auditoria
DROP POLICY IF EXISTS "Only admin can view audit logs" ON public.auditoria;
CREATE POLICY "Only admin can view audit logs" ON public.auditoria FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

DROP POLICY IF EXISTS "System can insert audit logs" ON public.auditoria;
CREATE POLICY "System can insert audit logs" ON public.auditoria FOR INSERT WITH CHECK (true);

-- Histórico - Políticas adicionais para inscrição pública
DROP POLICY IF EXISTS "Public can insert inscription history" ON public.historico;
CREATE POLICY "Public can insert inscription history" ON public.historico FOR INSERT WITH CHECK (acao = 'Inscrição Realizada');

DROP POLICY IF EXISTS "Responsavel can insert history for own children" ON public.historico;
CREATE POLICY "Responsavel can insert history for own children" ON public.historico FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM criancas WHERE criancas.id = historico.crianca_id AND criancas.responsavel_user_id = auth.uid()));

-- Notificações Log
DROP POLICY IF EXISTS "Admin can view all notification logs" ON public.notificacoes_log;
CREATE POLICY "Admin can view all notification logs" ON public.notificacoes_log FOR SELECT USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin can insert notification logs" ON public.notificacoes_log;
CREATE POLICY "Admin can insert notification logs" ON public.notificacoes_log FOR INSERT WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "System can insert notification logs" ON public.notificacoes_log;
CREATE POLICY "System can insert notification logs" ON public.notificacoes_log FOR INSERT WITH CHECK (true);

-- Diretor CMEI Vínculo
DROP POLICY IF EXISTS "Admin can manage director bindings" ON public.diretor_cmei_vinculo;
CREATE POLICY "Admin can manage director bindings" ON public.diretor_cmei_vinculo FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Directors can view own bindings" ON public.diretor_cmei_vinculo;
CREATE POLICY "Directors can view own bindings" ON public.diretor_cmei_vinculo FOR SELECT USING (auth.uid() = user_id);

-- Permissões
DROP POLICY IF EXISTS "Anyone can view permissions" ON public.permissoes;
CREATE POLICY "Anyone can view permissions" ON public.permissoes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage permissions" ON public.permissoes;
CREATE POLICY "Admin can manage permissions" ON public.permissoes FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin')) WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Role Permissões
DROP POLICY IF EXISTS "Anyone can view role permissions" ON public.role_permissoes;
CREATE POLICY "Anyone can view role permissions" ON public.role_permissoes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage role permissions" ON public.role_permissoes;
CREATE POLICY "Admin can manage role permissions" ON public.role_permissoes FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin')) WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Documentos Tipos
DROP POLICY IF EXISTS "Anyone can view active document types" ON public.documentos_tipos;
CREATE POLICY "Anyone can view active document types" ON public.documentos_tipos FOR SELECT USING (ativo = true);

DROP POLICY IF EXISTS "Admin can manage document types" ON public.documentos_tipos;
CREATE POLICY "Admin can manage document types" ON public.documentos_tipos FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Documentos Criança
DROP POLICY IF EXISTS "Admin can manage all documents" ON public.documentos_crianca;
CREATE POLICY "Admin can manage all documents" ON public.documentos_crianca FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Responsavel can view own children documents" ON public.documentos_crianca;
CREATE POLICY "Responsavel can view own children documents" ON public.documentos_crianca FOR SELECT USING (EXISTS (SELECT 1 FROM public.criancas WHERE criancas.id = documentos_crianca.crianca_id AND criancas.responsavel_user_id = auth.uid()));

DROP POLICY IF EXISTS "Responsavel can upload documents for own children" ON public.documentos_crianca;
CREATE POLICY "Responsavel can upload documents for own children" ON public.documentos_crianca FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.criancas WHERE criancas.id = crianca_id AND criancas.responsavel_user_id = auth.uid()));

DROP POLICY IF EXISTS "Responsavel can update own pending documents" ON public.documentos_crianca;
CREATE POLICY "Responsavel can update own pending documents" ON public.documentos_crianca FOR UPDATE USING (status = 'pendente' AND EXISTS (SELECT 1 FROM public.criancas WHERE criancas.id = documentos_crianca.crianca_id AND criancas.responsavel_user_id = auth.uid()));

-- Tipos Prioridade
DROP POLICY IF EXISTS "Anyone can view active priority types" ON public.tipos_prioridade;
CREATE POLICY "Anyone can view active priority types" ON public.tipos_prioridade FOR SELECT USING (ativo = true);

DROP POLICY IF EXISTS "Admin can manage priority types" ON public.tipos_prioridade;
CREATE POLICY "Admin can manage priority types" ON public.tipos_prioridade FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Criança Prioridades
DROP POLICY IF EXISTS "Admin can manage child priorities" ON public.crianca_prioridades;
CREATE POLICY "Admin can manage child priorities" ON public.crianca_prioridades FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Responsavel can view own child priorities" ON public.crianca_prioridades;
CREATE POLICY "Responsavel can view own child priorities" ON public.crianca_prioridades FOR SELECT USING (EXISTS (SELECT 1 FROM criancas WHERE criancas.id = crianca_prioridades.crianca_id AND criancas.responsavel_user_id = auth.uid()));

DROP POLICY IF EXISTS "Public can insert child priorities" ON public.crianca_prioridades;
CREATE POLICY "Public can insert child priorities" ON public.crianca_prioridades FOR INSERT WITH CHECK (true);

-- Templates Mensagens
DROP POLICY IF EXISTS "Anyone can view active templates" ON public.templates_mensagens;
CREATE POLICY "Anyone can view active templates" ON public.templates_mensagens FOR SELECT USING (ativo = true);

DROP POLICY IF EXISTS "Admin can manage templates" ON public.templates_mensagens;
CREATE POLICY "Admin can manage templates" ON public.templates_mensagens FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Mensagens Status Custom
DROP POLICY IF EXISTS "Anyone can view active status messages" ON public.mensagens_status_custom;
CREATE POLICY "Anyone can view active status messages" ON public.mensagens_status_custom FOR SELECT USING (ativo = true);

DROP POLICY IF EXISTS "Admin can manage status messages" ON public.mensagens_status_custom;
CREATE POLICY "Admin can manage status messages" ON public.mensagens_status_custom FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Feriados Municipais
DROP POLICY IF EXISTS "Anyone can view active holidays" ON public.feriados_municipais;
CREATE POLICY "Anyone can view active holidays" ON public.feriados_municipais FOR SELECT USING (ativo = true);

DROP POLICY IF EXISTS "Admin can manage holidays" ON public.feriados_municipais;
CREATE POLICY "Admin can manage holidays" ON public.feriados_municipais FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Motivos Padrão
DROP POLICY IF EXISTS "Anyone can view active reasons" ON public.motivos_padrao;
CREATE POLICY "Anyone can view active reasons" ON public.motivos_padrao FOR SELECT USING (ativo = true);

DROP POLICY IF EXISTS "Admin can manage reasons" ON public.motivos_padrao;
CREATE POLICY "Admin can manage reasons" ON public.motivos_padrao FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Campos Inscrição
DROP POLICY IF EXISTS "Anyone can view active form fields" ON public.campos_inscricao;
CREATE POLICY "Anyone can view active form fields" ON public.campos_inscricao FOR SELECT USING (ativo = true);

DROP POLICY IF EXISTS "Admin can manage form fields" ON public.campos_inscricao;
CREATE POLICY "Admin can manage form fields" ON public.campos_inscricao FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Campos Inscrição Histórico
DROP POLICY IF EXISTS "Admin can view field history" ON public.campos_inscricao_historico;
CREATE POLICY "Admin can view field history" ON public.campos_inscricao_historico FOR SELECT USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "System can insert field history" ON public.campos_inscricao_historico;
CREATE POLICY "System can insert field history" ON public.campos_inscricao_historico FOR INSERT WITH CHECK (true);

-- Valores Campos Custom
DROP POLICY IF EXISTS "Admin can manage custom field values" ON public.valores_campos_custom;
CREATE POLICY "Admin can manage custom field values" ON public.valores_campos_custom FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Responsavel can view own children custom fields" ON public.valores_campos_custom;
CREATE POLICY "Responsavel can view own children custom fields" ON public.valores_campos_custom FOR SELECT USING (EXISTS (SELECT 1 FROM criancas WHERE criancas.id = valores_campos_custom.crianca_id AND criancas.responsavel_user_id = auth.uid()));

DROP POLICY IF EXISTS "Public can insert custom field values" ON public.valores_campos_custom;
CREATE POLICY "Public can insert custom field values" ON public.valores_campos_custom FOR INSERT WITH CHECK (true);

-- Zonas Atendimento
DROP POLICY IF EXISTS "Anyone can view active zones" ON public.zonas_atendimento;
CREATE POLICY "Anyone can view active zones" ON public.zonas_atendimento FOR SELECT USING (ativo = true);

DROP POLICY IF EXISTS "Admin can manage zones" ON public.zonas_atendimento;
CREATE POLICY "Admin can manage zones" ON public.zonas_atendimento FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- CMEI Zonas
DROP POLICY IF EXISTS "Anyone can view cmei zones" ON public.cmei_zonas;
CREATE POLICY "Anyone can view cmei zones" ON public.cmei_zonas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage cmei zones" ON public.cmei_zonas;
CREATE POLICY "Admin can manage cmei zones" ON public.cmei_zonas FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- User Preferences
DROP POLICY IF EXISTS "Users can manage own preferences" ON public.user_preferences;
CREATE POLICY "Users can manage own preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Rate Limit Entries
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limit_entries;
CREATE POLICY "Service role can manage rate limits" ON public.rate_limit_entries FOR ALL USING (true) WITH CHECK (true);

-- Planejamento Transição
DROP POLICY IF EXISTS "Admin can manage transition planning" ON public.planejamento_transicao;
CREATE POLICY "Admin can manage transition planning" ON public.planejamento_transicao FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Chat Mensagens
DROP POLICY IF EXISTS "Admin can manage all chat messages" ON public.chat_mensagens;
CREATE POLICY "Admin can manage all chat messages" ON public.chat_mensagens FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Responsavel can view own messages" ON public.chat_mensagens;
CREATE POLICY "Responsavel can view own messages" ON public.chat_mensagens FOR SELECT USING (responsavel_id = auth.uid());

DROP POLICY IF EXISTS "Responsavel can insert own messages" ON public.chat_mensagens;
CREATE POLICY "Responsavel can insert own messages" ON public.chat_mensagens FOR INSERT WITH CHECK (responsavel_id = auth.uid() AND direcao = 'responsavel');

-- Chat Conversas Config
DROP POLICY IF EXISTS "Admin can manage chat config" ON public.chat_conversas_config;
CREATE POLICY "Admin can manage chat config" ON public.chat_conversas_config FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Responsavel can view own chat config" ON public.chat_conversas_config;
CREATE POLICY "Responsavel can view own chat config" ON public.chat_conversas_config FOR SELECT USING (responsavel_id = auth.uid());

DROP POLICY IF EXISTS "Responsavel can insert own chat config" ON public.chat_conversas_config;
CREATE POLICY "Responsavel can insert own chat config" ON public.chat_conversas_config FOR INSERT WITH CHECK (responsavel_id = auth.uid());

-- Chat Marcadores
DROP POLICY IF EXISTS "Anyone can view active labels" ON public.chat_marcadores;
CREATE POLICY "Anyone can view active labels" ON public.chat_marcadores FOR SELECT USING (ativo = true);

DROP POLICY IF EXISTS "Admin can manage chat labels" ON public.chat_marcadores;
CREATE POLICY "Admin can manage chat labels" ON public.chat_marcadores FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Chat Conversa Marcadores
DROP POLICY IF EXISTS "Admin can manage conversation labels" ON public.chat_conversa_marcadores;
CREATE POLICY "Admin can manage conversation labels" ON public.chat_conversa_marcadores FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Responsavel can view own conversation labels" ON public.chat_conversa_marcadores;
CREATE POLICY "Responsavel can view own conversation labels" ON public.chat_conversa_marcadores FOR SELECT USING (responsavel_id = auth.uid());

-- Chat Respostas Rápidas
DROP POLICY IF EXISTS "Anyone can view active quick replies" ON public.chat_respostas_rapidas;
CREATE POLICY "Anyone can view active quick replies" ON public.chat_respostas_rapidas FOR SELECT USING (ativo = true);

DROP POLICY IF EXISTS "Admin can manage quick replies" ON public.chat_respostas_rapidas;
CREATE POLICY "Admin can manage quick replies" ON public.chat_respostas_rapidas FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Tutoriais Vídeos
DROP POLICY IF EXISTS "Anyone can view active tutorials" ON public.tutoriais_videos;
CREATE POLICY "Anyone can view active tutorials" ON public.tutoriais_videos FOR SELECT USING (ativo = true);

DROP POLICY IF EXISTS "Superadmin can manage tutorials" ON public.tutoriais_videos;
CREATE POLICY "Superadmin can manage tutorials" ON public.tutoriais_videos FOR ALL USING (has_role(auth.uid(), 'superadmin')) WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- Tutorial Seções
DROP POLICY IF EXISTS "Anyone can view active tutorial sections" ON public.tutorial_secoes;
CREATE POLICY "Anyone can view active tutorial sections" ON public.tutorial_secoes FOR SELECT USING (ativo = true);

DROP POLICY IF EXISTS "Superadmin can manage tutorial sections" ON public.tutorial_secoes;
CREATE POLICY "Superadmin can manage tutorial sections" ON public.tutorial_secoes FOR ALL USING (has_role(auth.uid(), 'superadmin')) WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- Tutorial FAQ
DROP POLICY IF EXISTS "Anyone can view active FAQs" ON public.tutorial_faq;
CREATE POLICY "Anyone can view active FAQs" ON public.tutorial_faq FOR SELECT USING (ativo = true);

DROP POLICY IF EXISTS "Superadmin can manage FAQs" ON public.tutorial_faq;
CREATE POLICY "Superadmin can manage FAQs" ON public.tutorial_faq FOR ALL USING (has_role(auth.uid(), 'superadmin')) WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- Tutorial Dicas
DROP POLICY IF EXISTS "Anyone can view active tips" ON public.tutorial_dicas;
CREATE POLICY "Anyone can view active tips" ON public.tutorial_dicas FOR SELECT USING (ativo = true);

DROP POLICY IF EXISTS "Superadmin can manage tips" ON public.tutorial_dicas;
CREATE POLICY "Superadmin can manage tips" ON public.tutorial_dicas FOR ALL USING (has_role(auth.uid(), 'superadmin')) WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- =============================================================================
-- 9. REALTIME
-- =============================================================================
ALTER TABLE public.criancas REPLICA IDENTITY FULL;
ALTER TABLE public.historico REPLICA IDENTITY FULL;
ALTER TABLE public.notificacoes_log REPLICA IDENTITY FULL;
ALTER TABLE public.auditoria REPLICA IDENTITY FULL;
ALTER TABLE public.chat_mensagens REPLICA IDENTITY FULL;

-- Nota: As publicações do realtime precisam ser adicionadas via Dashboard do Supabase
-- ou após verificar se a publicação existe

-- =============================================================================
-- 10. GRANTS
-- =============================================================================
GRANT EXECUTE ON FUNCTION public.link_children_by_cpf(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_auditoria TO authenticated;
GRANT EXECUTE ON FUNCTION public.validar_cpf(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consulta_publica_por_cpf(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verificar_duplicidade_inscricao(text, date, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.inserir_inscricao_publica TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_configuracoes() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_fila_publica() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_historico_fila_publico() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_ocupacao_cmeis() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_ocupacao_turmas() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalcular_posicoes_fila() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_rate_limits() TO authenticated;

-- =============================================================================
-- FIM DO SCRIPT DE ESTRUTURA
-- =============================================================================


-- =============================================================================
-- PARTE 2: STORAGE (Buckets e PolÃ­ticas)
-- =============================================================================
-- =============================================================================
-- VAGOU - Setup de Storage Buckets
-- =============================================================================
-- Execute APÓS o script 01-setup-estrutura.sql
-- =============================================================================

-- Criar buckets com limites de segurança
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('brasoes', 'brasoes', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']),
  ('avatars', 'avatars', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']),
  ('assets', 'assets', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/gif']),
  ('documentos', 'documentos', false, 10485760, ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('chat-arquivos', 'chat-arquivos', false, 10485760, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf', 'audio/mpeg', 'audio/ogg', 'video/mp4'])
ON CONFLICT (id) DO UPDATE SET 
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- POLÍTICAS PARA BUCKET: brasoes (público - brasões municipais)
-- =============================================================================
DROP POLICY IF EXISTS "Brasoes are publicly accessible" ON storage.objects;
CREATE POLICY "Brasoes are publicly accessible" ON storage.objects 
  FOR SELECT USING (bucket_id = 'brasoes');

DROP POLICY IF EXISTS "Admins can upload brasoes" ON storage.objects;
CREATE POLICY "Admins can upload brasoes" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'brasoes' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update brasoes" ON storage.objects;
CREATE POLICY "Admins can update brasoes" ON storage.objects 
  FOR UPDATE USING (bucket_id = 'brasoes' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete brasoes" ON storage.objects;
CREATE POLICY "Admins can delete brasoes" ON storage.objects 
  FOR DELETE USING (bucket_id = 'brasoes' AND public.is_admin(auth.uid()));

-- =============================================================================
-- POLÍTICAS PARA BUCKET: avatars (público - fotos de perfil)
-- =============================================================================
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Avatars are publicly accessible" ON storage.objects 
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar" ON storage.objects 
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar" ON storage.objects 
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================================================
-- POLÍTICAS PARA BUCKET: assets (público - imagens gerais do sistema)
-- =============================================================================
DROP POLICY IF EXISTS "Assets are publicly accessible" ON storage.objects;
CREATE POLICY "Assets are publicly accessible" ON storage.objects 
  FOR SELECT USING (bucket_id = 'assets');

DROP POLICY IF EXISTS "Admins can upload assets" ON storage.objects;
CREATE POLICY "Admins can upload assets" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'assets' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update assets" ON storage.objects;
CREATE POLICY "Admins can update assets" ON storage.objects 
  FOR UPDATE USING (bucket_id = 'assets' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete assets" ON storage.objects;
CREATE POLICY "Admins can delete assets" ON storage.objects 
  FOR DELETE USING (bucket_id = 'assets' AND public.is_admin(auth.uid()));

-- =============================================================================
-- POLÍTICAS PARA BUCKET: documentos (privado - documentos de crianças)
-- =============================================================================
DROP POLICY IF EXISTS "Admins can view all documents" ON storage.objects;
CREATE POLICY "Admins can view all documents" ON storage.objects 
  FOR SELECT USING (bucket_id = 'documentos' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Responsaveis can view own children documents" ON storage.objects;
CREATE POLICY "Responsaveis can view own children documents" ON storage.objects 
  FOR SELECT USING (
    bucket_id = 'documentos' 
    AND EXISTS (
      SELECT 1 FROM public.criancas c 
      WHERE c.responsavel_user_id = auth.uid() 
      AND name LIKE c.id::text || '/%'
    )
  );

DROP POLICY IF EXISTS "Responsaveis can upload own children documents" ON storage.objects;
CREATE POLICY "Responsaveis can upload own children documents" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id = 'documentos' 
    AND EXISTS (
      SELECT 1 FROM public.criancas c 
      WHERE c.responsavel_user_id = auth.uid() 
      AND name LIKE c.id::text || '/%'
    )
  );

DROP POLICY IF EXISTS "Admins can upload documents" ON storage.objects;
CREATE POLICY "Admins can upload documents" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'documentos' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update documents" ON storage.objects;
CREATE POLICY "Admins can update documents" ON storage.objects 
  FOR UPDATE USING (bucket_id = 'documentos' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete documents" ON storage.objects;
CREATE POLICY "Admins can delete documents" ON storage.objects 
  FOR DELETE USING (bucket_id = 'documentos' AND public.is_admin(auth.uid()));

-- =============================================================================
-- POLÍTICAS PARA BUCKET: chat-arquivos (privado - arquivos do chat)
-- =============================================================================
DROP POLICY IF EXISTS "Admins can view all chat files" ON storage.objects;
CREATE POLICY "Admins can view all chat files" ON storage.objects 
  FOR SELECT USING (bucket_id = 'chat-arquivos' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Responsaveis can view own chat files" ON storage.objects;
CREATE POLICY "Responsaveis can view own chat files" ON storage.objects 
  FOR SELECT USING (
    bucket_id = 'chat-arquivos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Responsaveis can upload chat files" ON storage.objects;
CREATE POLICY "Responsaveis can upload chat files" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-arquivos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Admins can upload chat files" ON storage.objects;
CREATE POLICY "Admins can upload chat files" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'chat-arquivos' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete chat files" ON storage.objects;
CREATE POLICY "Admins can delete chat files" ON storage.objects 
  FOR DELETE USING (bucket_id = 'chat-arquivos' AND public.is_admin(auth.uid()));

-- =============================================================================
-- VERIFICAÇÃO FINAL
-- =============================================================================
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM storage.buckets WHERE name IN ('brasoes', 'avatars', 'assets', 'documentos', 'chat-arquivos');
  
  IF v_count = 5 THEN
    RAISE NOTICE '✅ Todos os 5 buckets de storage criados com sucesso';
  ELSE
    RAISE NOTICE '⚠️ Apenas % de 5 buckets criados', v_count;
  END IF;
  
  SELECT COUNT(*) INTO v_count FROM pg_policies WHERE schemaname = 'storage';
  RAISE NOTICE 'ℹ️ Total de políticas de storage: %', v_count;
END $$;


-- =============================================================================
-- PARTE 3: DADOS INICIAIS
-- =============================================================================
-- =============================================================================
-- VAGOU - Dados Iniciais do Sistema
-- =============================================================================
-- Execute APÓS os scripts 01 e 02
-- =============================================================================

-- Inserir configuração inicial do sistema
INSERT INTO public.configuracoes_sistema (registro_unico, nome_municipio, nome_secretaria, email_contato, telefone_contato, prazo_resposta_dias)
VALUES (true, 'Município', 'Secretaria Municipal de Educação', 'secedu@gmail.com', '44999999999', 15)
ON CONFLICT (registro_unico) WHERE registro_unico = true DO UPDATE SET
  nome_municipio = EXCLUDED.nome_municipio,
  nome_secretaria = EXCLUDED.nome_secretaria,
  email_contato = EXCLUDED.email_contato,
  telefone_contato = EXCLUDED.telefone_contato,
  prazo_resposta_dias = EXCLUDED.prazo_resposta_dias;

-- Turmas Base
INSERT INTO public.turmas_base (nome, idade_minima_meses, idade_maxima_meses, descricao, ordem) VALUES
('Infantil 0', 0, 11, '0 anos na data de corte (31/03)', 1),
('Infantil 1', 12, 23, '1 ano na data de corte (31/03)', 2),
('Infantil 2', 24, 35, '2 anos na data de corte (31/03)', 3),
('Infantil 3', 36, 47, '3 anos na data de corte (31/03)', 4)
ON CONFLICT (nome) DO NOTHING;

-- Tipos de Documentos
INSERT INTO public.documentos_tipos (nome, descricao, obrigatorio, ordem) VALUES
('Certidão de Nascimento', 'Cópia da certidão de nascimento da criança', true, 1),
('Comprovante de Residência', 'Conta de luz, água ou telefone recente', true, 2),
('CPF do Responsável', 'Cópia do CPF do responsável legal', true, 3),
('RG do Responsável', 'Cópia do RG do responsável legal', true, 4),
('Cartão de Vacina', 'Carteira de vacinação atualizada', true, 5),
('Comprovante de Programa Social', 'Para famílias cadastradas em programas sociais', false, 6)
ON CONFLICT DO NOTHING;

-- Tipos de Prioridade
INSERT INTO public.tipos_prioridade (nome, descricao, codigo, peso, cor, icone, exige_documento, ordem) VALUES
('Pessoa com Deficiência', 'Criança com deficiência comprovada', 'pcd', 20, '#dc2626', 'heart', true, 1),
('Bolsa Família', 'Família beneficiária do Bolsa Família', 'bolsa_familia', 15, '#ea580c', 'coins', true, 2),
('Remanejamento', 'Criança já matriculada solicitando troca', 'remanejamento', 10, '#8b5cf6', 'refresh-cw', false, 3),
('Irmão Matriculado', 'Possui irmão(s) no CMEI', 'irmao', 5, '#f59e0b', 'users', false, 4)
ON CONFLICT (codigo) DO NOTHING;

-- Motivos Padrão
INSERT INTO public.motivos_padrao (tipo, descricao, ordem) VALUES
('desistencia', 'Mudança de endereço', 1),
('desistencia', 'Optou por outra instituição', 2),
('desistencia', 'Motivos pessoais/familiares', 3),
('desistencia', 'Não compareceu no prazo', 4),
('recusa', 'CMEI não atende às necessidades', 1),
('recusa', 'Distância do CMEI', 2),
('recusa', 'Horário incompatível', 3),
('remanejamento', 'Proximidade da residência', 1),
('remanejamento', 'Proximidade do trabalho', 2),
('remanejamento', 'Irmão(s) no CMEI desejado', 3),
('transferencia', 'Mudança de endereço', 1),
('transferencia', 'Proximidade do trabalho', 2),
('fim_fila', 'Não compareceu à convocação', 1),
('fim_fila', 'Documentação incompleta', 2)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- TEMPLATES DE MENSAGENS (Completos)
-- =============================================================================
INSERT INTO public.templates_mensagens (tipo, titulo, descricao, assunto_email, corpo_email, corpo_sms, corpo_whatsapp, variaveis_disponiveis, ordem) VALUES
(
  'convocacao', 
  'Convocação para Matrícula', 
  'Enviado quando uma criança é convocada para matrícula',
  'Convocação para Matrícula - {{cmei_nome}}',
  '<h2>Convocação para Matrícula</h2><p>Olá, {{responsavel_nome}}!</p><p><strong>{{crianca_nome}}</strong> foi convocada para matrícula!</p><p><strong>CMEI:</strong> {{cmei_nome}}<br><strong>Turma:</strong> {{turma_nome}}<br><strong>Prazo:</strong> {{data_limite}}</p><p>Compareça à unidade com os documentos necessários.</p>',
  'CONVOCACAO! {{crianca_nome}} foi convocada para {{cmei_nome}}. Prazo: {{data_limite}}. Compareça com documentos.',
  '🎉 *CONVOCAÇÃO!*\n\nOlá, {{responsavel_nome}}!\n\n*{{crianca_nome}}* foi convocada!\n\n🏫 CMEI: {{cmei_nome}}\n📚 Turma: {{turma_nome}}\n📅 Prazo: *{{data_limite}}*\n\n⚠️ Compareça com os documentos!',
  '["crianca_nome", "responsavel_nome", "cmei_nome", "turma_nome", "data_limite"]',
  1
),
(
  'matricula_confirmada', 
  'Matrícula Confirmada', 
  'Enviado quando a matrícula é confirmada',
  'Matrícula Confirmada - {{cmei_nome}}',
  '<h2>Matrícula Confirmada</h2><p>Olá, {{responsavel_nome}}!</p><p>A matrícula de <strong>{{crianca_nome}}</strong> foi confirmada com sucesso!</p><p><strong>CMEI:</strong> {{cmei_nome}}<br><strong>Turma:</strong> {{turma_nome}}</p><p>Parabéns! Aguardamos vocês no início do período letivo.</p>',
  'Matricula de {{crianca_nome}} confirmada no {{cmei_nome}}! Turma: {{turma_nome}}.',
  '✅ *MATRÍCULA CONFIRMADA!*\n\nOlá, {{responsavel_nome}}!\n\nA matrícula de *{{crianca_nome}}* foi confirmada!\n\n🏫 CMEI: {{cmei_nome}}\n📚 Turma: {{turma_nome}}\n\n🎉 Parabéns!',
  '["crianca_nome", "responsavel_nome", "cmei_nome", "turma_nome"]',
  2
),
(
  'lembrete_prazo', 
  'Lembrete de Prazo', 
  'Enviado dias antes do prazo de convocação expirar',
  'Lembrete: Prazo de Matrícula - {{crianca_nome}}',
  '<h2>Lembrete de Prazo</h2><p>Olá, {{responsavel_nome}}!</p><p>O prazo para efetivação da matrícula de <strong>{{crianca_nome}}</strong> está acabando!</p><p><strong>Dias restantes:</strong> {{dias_restantes}}<br><strong>Data limite:</strong> {{data_limite}}</p><p>Não perca a vaga!</p>',
  'LEMBRETE: Prazo de {{crianca_nome}} expira em {{dias_restantes}} dias ({{data_limite}}). Nao perca a vaga!',
  '⏰ *LEMBRETE*\n\nOlá, {{responsavel_nome}}!\n\nO prazo para *{{crianca_nome}}* está acabando!\n\n⏳ Dias restantes: *{{dias_restantes}}*\n📅 Data limite: {{data_limite}}\n\n⚠️ Não perca a vaga!',
  '["crianca_nome", "responsavel_nome", "dias_restantes", "data_limite"]',
  3
),
(
  'inscricao_realizada', 
  'Inscrição Realizada', 
  'Enviado após a inscrição ser concluída com sucesso',
  'Inscrição Realizada com Sucesso',
  '<h2>Inscrição Realizada</h2><p>Olá, {{responsavel_nome}}!</p><p>A inscrição de <strong>{{crianca_nome}}</strong> foi realizada com sucesso!</p><p><strong>Protocolo:</strong> {{protocolo}}<br><strong>Data:</strong> {{data_inscricao}}</p><p>Acompanhe sua posição na fila pelo nosso sistema.</p>',
  'Inscricao de {{crianca_nome}} realizada! Protocolo: {{protocolo}}. Acompanhe sua posicao no sistema.',
  '📝 *INSCRIÇÃO REALIZADA!*\n\nOlá, {{responsavel_nome}}!\n\nA inscrição de *{{crianca_nome}}* foi concluída!\n\n🔢 Protocolo: {{protocolo}}\n📅 Data: {{data_inscricao}}\n\n📊 Acompanhe sua posição na fila pelo sistema.',
  '["crianca_nome", "responsavel_nome", "protocolo", "data_inscricao"]',
  4
),
(
  'desistencia', 
  'Confirmação de Desistência', 
  'Enviado quando a criança é marcada como desistente',
  'Confirmação de Desistência - {{crianca_nome}}',
  '<h2>Confirmação de Desistência</h2><p>Olá, {{responsavel_nome}}!</p><p>Confirmamos o registro de desistência de <strong>{{crianca_nome}}</strong> na fila de espera.</p><p><strong>Data:</strong> {{data}}<br><strong>Motivo:</strong> {{motivo}}</p><p>Caso deseje realizar uma nova inscrição futuramente, acesse nosso sistema.</p>',
  'Desistencia de {{crianca_nome}} registrada. Data: {{data}}.',
  '📋 *DESISTÊNCIA REGISTRADA*\n\nOlá, {{responsavel_nome}}!\n\nA desistência de *{{crianca_nome}}* foi registrada.\n\n📅 Data: {{data}}\n📝 Motivo: {{motivo}}\n\nCaso deseje, você pode fazer nova inscrição futuramente.',
  '["crianca_nome", "responsavel_nome", "data", "motivo"]',
  5
),
(
  'recusa', 
  'Vaga Recusada', 
  'Enviado quando o responsável recusa a vaga oferecida',
  'Confirmação de Recusa de Vaga - {{crianca_nome}}',
  '<h2>Vaga Recusada</h2><p>Olá, {{responsavel_nome}}!</p><p>Registramos a recusa da vaga oferecida para <strong>{{crianca_nome}}</strong>.</p><p><strong>CMEI:</strong> {{cmei_nome}}<br><strong>Data:</strong> {{data}}<br><strong>Motivo:</strong> {{motivo}}</p>',
  'Recusa de vaga de {{crianca_nome}} registrada. CMEI: {{cmei_nome}}.',
  '❌ *VAGA RECUSADA*\n\nOlá, {{responsavel_nome}}!\n\nRegistramos a recusa da vaga para *{{crianca_nome}}*.\n\n🏫 CMEI: {{cmei_nome}}\n📅 Data: {{data}}\n📝 Motivo: {{motivo}}',
  '["crianca_nome", "responsavel_nome", "cmei_nome", "data", "motivo"]',
  6
),
(
  'fim_fila', 
  'Movido para Fim da Fila', 
  'Enviado quando a criança é movida para o fim da fila por não comparecimento',
  'Aviso: Movido para Fim da Fila - {{crianca_nome}}',
  '<h2>Aviso Importante</h2><p>Olá, {{responsavel_nome}}!</p><p><strong>{{crianca_nome}}</strong> foi movida para o fim da fila de espera.</p><p><strong>Motivo:</strong> {{motivo}}<br><strong>Data:</strong> {{data}}</p><p>Você permanece na fila, porém em uma nova posição.</p>',
  'AVISO: {{crianca_nome}} foi movida para fim da fila. Motivo: {{motivo}}.',
  '⚠️ *AVISO IMPORTANTE*\n\nOlá, {{responsavel_nome}}!\n\n*{{crianca_nome}}* foi movida para o fim da fila.\n\n📝 Motivo: {{motivo}}\n📅 Data: {{data}}\n\nVocê permanece na fila, em nova posição.',
  '["crianca_nome", "responsavel_nome", "motivo", "data"]',
  7
),
(
  'remanejamento_solicitado', 
  'Remanejamento Solicitado', 
  'Enviado quando uma solicitação de remanejamento é registrada',
  'Solicitação de Remanejamento Registrada - {{crianca_nome}}',
  '<h2>Remanejamento Solicitado</h2><p>Olá, {{responsavel_nome}}!</p><p>Sua solicitação de remanejamento para <strong>{{crianca_nome}}</strong> foi registrada.</p><p><strong>CMEI Atual:</strong> {{cmei_atual}}<br><strong>CMEI Solicitado:</strong> {{cmei_solicitado}}<br><strong>Motivo:</strong> {{motivo}}</p><p>Você será notificado quando houver vaga disponível.</p>',
  'Remanejamento de {{crianca_nome}} solicitado. De {{cmei_atual}} para {{cmei_solicitado}}.',
  '🔄 *REMANEJAMENTO SOLICITADO*\n\nOlá, {{responsavel_nome}}!\n\nSua solicitação para *{{crianca_nome}}* foi registrada.\n\n🏫 CMEI Atual: {{cmei_atual}}\n🏫 CMEI Solicitado: {{cmei_solicitado}}\n📝 Motivo: {{motivo}}\n\n📬 Você será notificado quando houver vaga.',
  '["crianca_nome", "responsavel_nome", "cmei_atual", "cmei_solicitado", "motivo"]',
  8
),
(
  'remanejamento_aprovado', 
  'Remanejamento Aprovado', 
  'Enviado quando o remanejamento é aprovado e efetivado',
  'Remanejamento Aprovado - {{crianca_nome}}',
  '<h2>Remanejamento Aprovado!</h2><p>Olá, {{responsavel_nome}}!</p><p>O remanejamento de <strong>{{crianca_nome}}</strong> foi aprovado!</p><p><strong>Novo CMEI:</strong> {{cmei_novo}}<br><strong>Nova Turma:</strong> {{turma_nova}}</p><p>Entre em contato com a nova unidade para orientações.</p>',
  'Remanejamento de {{crianca_nome}} APROVADO! Novo CMEI: {{cmei_novo}}.',
  '✅ *REMANEJAMENTO APROVADO!*\n\nOlá, {{responsavel_nome}}!\n\nO remanejamento de *{{crianca_nome}}* foi aprovado!\n\n🏫 Novo CMEI: {{cmei_novo}}\n📚 Nova Turma: {{turma_nova}}\n\n📞 Entre em contato com a nova unidade.',
  '["crianca_nome", "responsavel_nome", "cmei_novo", "turma_nova"]',
  9
),
(
  'transferencia', 
  'Transferência Realizada', 
  'Enviado quando uma transferência é efetivada',
  'Transferência Realizada - {{crianca_nome}}',
  '<h2>Transferência Realizada</h2><p>Olá, {{responsavel_nome}}!</p><p>A transferência de <strong>{{crianca_nome}}</strong> foi processada.</p><p><strong>CMEI Anterior:</strong> {{cmei_anterior}}<br><strong>Data:</strong> {{data}}<br><strong>Motivo:</strong> {{motivo}}</p>',
  'Transferencia de {{crianca_nome}} realizada. CMEI anterior: {{cmei_anterior}}.',
  '📤 *TRANSFERÊNCIA REALIZADA*\n\nOlá, {{responsavel_nome}}!\n\nA transferência de *{{crianca_nome}}* foi processada.\n\n🏫 CMEI Anterior: {{cmei_anterior}}\n📅 Data: {{data}}\n📝 Motivo: {{motivo}}',
  '["crianca_nome", "responsavel_nome", "cmei_anterior", "data", "motivo"]',
  10
),
(
  'prazo_expirado', 
  'Prazo Expirado', 
  'Enviado quando o prazo de resposta à convocação expira',
  'Prazo Expirado - {{crianca_nome}}',
  '<h2>Prazo Expirado</h2><p>Olá, {{responsavel_nome}}!</p><p>Infelizmente, o prazo para efetivação da matrícula de <strong>{{crianca_nome}}</strong> expirou.</p><p><strong>CMEI:</strong> {{cmei_nome}}<br><strong>Data limite:</strong> {{data_limite}}</p><p>Por favor, entre em contato com a Secretaria de Educação para mais informações.</p>',
  'Prazo expirado para {{crianca_nome}}. Entre em contato com a Secretaria.',
  '⏰ *PRAZO EXPIRADO*\n\nOlá, {{responsavel_nome}}!\n\nO prazo para *{{crianca_nome}}* expirou.\n\n🏫 CMEI: {{cmei_nome}}\n📅 Data limite: {{data_limite}}\n\n📞 Entre em contato com a Secretaria.',
  '["crianca_nome", "responsavel_nome", "cmei_nome", "data_limite"]',
  11
),
(
  'lembrete_assinatura', 
  'Lembrete de Assinatura', 
  'Enviado para lembrar sobre assinatura de documentos pendentes',
  'Lembrete: Assinatura Pendente - {{crianca_nome}}',
  '<h2>Lembrete de Assinatura</h2><p>Olá, {{responsavel_nome}}!</p><p>Você possui documentos pendentes de assinatura para <strong>{{crianca_nome}}</strong>.</p><p><strong>Prazo:</strong> {{data_limite}}</p><p>Acesse o sistema para assinar os documentos necessários.</p>',
  'LEMBRETE: Assinatura pendente para {{crianca_nome}}. Prazo: {{data_limite}}.',
  '📝 *ASSINATURA PENDENTE*\n\nOlá, {{responsavel_nome}}!\n\nVocê tem documentos para assinar de *{{crianca_nome}}*.\n\n📅 Prazo: {{data_limite}}\n\n⚠️ Acesse o sistema para assinar.',
  '["crianca_nome", "responsavel_nome", "data_limite"]',
  12
),
(
  'documento_recusado', 
  'Documento Recusado', 
  'Enviado quando um documento é recusado na validação',
  'Documento Recusado - {{crianca_nome}}',
  '<h2>Documento Recusado</h2><p>Olá, {{responsavel_nome}}!</p><p>Um documento de <strong>{{crianca_nome}}</strong> foi recusado.</p><p><strong>Documento:</strong> {{documento_nome}}<br><strong>Motivo:</strong> {{motivo}}</p><p>Por favor, envie um novo documento corrigido.</p>',
  'Documento de {{crianca_nome}} recusado: {{documento_nome}}. Envie novo documento.',
  '❌ *DOCUMENTO RECUSADO*\n\nOlá, {{responsavel_nome}}!\n\nUm documento de *{{crianca_nome}}* foi recusado.\n\n📄 Documento: {{documento_nome}}\n📝 Motivo: {{motivo}}\n\n⚠️ Envie um novo documento.',
  '["crianca_nome", "responsavel_nome", "documento_nome", "motivo"]',
  13
),
(
  'documentos_aprovados', 
  'Documentos Aprovados', 
  'Enviado quando todos os documentos são aprovados',
  'Documentos Aprovados - {{crianca_nome}}',
  '<h2>Documentos Aprovados</h2><p>Olá, {{responsavel_nome}}!</p><p>Todos os documentos de <strong>{{crianca_nome}}</strong> foram aprovados!</p><p>A matrícula está em processamento.</p>',
  'Documentos de {{crianca_nome}} aprovados! Matricula em processamento.',
  '✅ *DOCUMENTOS APROVADOS*\n\nOlá, {{responsavel_nome}}!\n\nTodos os documentos de *{{crianca_nome}}* foram aprovados!\n\n🎉 Matrícula em processamento.',
  '["crianca_nome", "responsavel_nome"]',
  14
),
(
  'remanejamento_concluido', 
  'Remanejamento Concluído', 
  'Enviado quando o remanejamento é finalizado',
  'Remanejamento Concluído - {{crianca_nome}}',
  '<h2>Remanejamento Concluído</h2><p>Olá, {{responsavel_nome}}!</p><p>O remanejamento de <strong>{{crianca_nome}}</strong> foi concluído com sucesso!</p><p><strong>Novo CMEI:</strong> {{cmei_novo}}<br><strong>Nova Turma:</strong> {{turma_nova}}</p><p>A criança já pode frequentar a nova unidade.</p>',
  'Remanejamento de {{crianca_nome}} concluido! Novo CMEI: {{cmei_novo}}.',
  '🔄 *REMANEJAMENTO CONCLUÍDO*\n\nOlá, {{responsavel_nome}}!\n\nO remanejamento de *{{crianca_nome}}* foi concluído!\n\n🏫 Novo CMEI: {{cmei_novo}}\n📚 Nova Turma: {{turma_nova}}\n\n✅ A criança já pode frequentar a nova unidade.',
  '["crianca_nome", "responsavel_nome", "cmei_novo", "turma_nova"]',
  15
),
(
  'inscricao_fila', 
  'Inscrição na Fila', 
  'Enviado quando a inscrição é adicionada à fila de espera',
  'Inscrição Confirmada na Fila - {{crianca_nome}}',
  '<h2>Inscrição na Fila de Espera</h2><p>Olá, {{responsavel_nome}}!</p><p>A inscrição de <strong>{{crianca_nome}}</strong> foi confirmada na fila de espera.</p><p><strong>Posição:</strong> {{posicao_fila}}</p><p>Acompanhe sua posição pelo sistema.</p>',
  'Inscricao de {{crianca_nome}} confirmada na fila. Posicao: {{posicao_fila}}.',
  '📋 *INSCRIÇÃO NA FILA*\n\nOlá, {{responsavel_nome}}!\n\n*{{crianca_nome}}* está na fila de espera!\n\n📊 Posição: {{posicao_fila}}\n\n👀 Acompanhe pelo sistema.',
  '["crianca_nome", "responsavel_nome", "posicao_fila"]',
  16
),
(
  'lembrete', 
  'Lembrete Geral', 
  'Lembrete genérico para responsáveis',
  'Lembrete - {{assunto}}',
  '<h2>Lembrete</h2><p>Olá, {{responsavel_nome}}!</p><p>{{mensagem}}</p>',
  'LEMBRETE: {{mensagem}}',
  '🔔 *LEMBRETE*\n\nOlá, {{responsavel_nome}}!\n\n{{mensagem}}',
  '["responsavel_nome", "assunto", "mensagem"]',
  17
),
(
  'matricula', 
  'Matrícula em Processamento', 
  'Enviado durante o processo de matrícula',
  'Matrícula em Processamento - {{crianca_nome}}',
  '<h2>Matrícula em Processamento</h2><p>Olá, {{responsavel_nome}}!</p><p>A matrícula de <strong>{{crianca_nome}}</strong> está sendo processada.</p><p><strong>CMEI:</strong> {{cmei_nome}}<br><strong>Turma:</strong> {{turma_nome}}</p><p>Você será notificado quando for confirmada.</p>',
  'Matricula de {{crianca_nome}} em processamento no {{cmei_nome}}.',
  '⏳ *MATRÍCULA EM PROCESSAMENTO*\n\nOlá, {{responsavel_nome}}!\n\nA matrícula de *{{crianca_nome}}* está sendo processada.\n\n🏫 CMEI: {{cmei_nome}}\n📚 Turma: {{turma_nome}}\n\n📬 Aguarde confirmação.',
  '["crianca_nome", "responsavel_nome", "cmei_nome", "turma_nome"]',
  18
),
(
  'remanejamento', 
  'Remanejamento', 
  'Notificação geral sobre remanejamento',
  'Atualização de Remanejamento - {{crianca_nome}}',
  '<h2>Atualização de Remanejamento</h2><p>Olá, {{responsavel_nome}}!</p><p>Há uma atualização sobre o remanejamento de <strong>{{crianca_nome}}</strong>.</p><p>{{mensagem}}</p>',
  'Atualizacao de remanejamento de {{crianca_nome}}. Verifique o sistema.',
  '🔄 *REMANEJAMENTO*\n\nOlá, {{responsavel_nome}}!\n\nHá uma atualização sobre o remanejamento de *{{crianca_nome}}*.\n\n{{mensagem}}',
  '["crianca_nome", "responsavel_nome", "mensagem"]',
  19
)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- PERMISSÕES BASE
-- =============================================================================
INSERT INTO public.permissoes (codigo, nome, descricao, modulo) VALUES
('criancas.visualizar', 'Visualizar Crianças', 'Permite visualizar lista de crianças', 'Crianças'),
('criancas.criar', 'Criar Crianças', 'Permite cadastrar novas crianças', 'Crianças'),
('criancas.editar', 'Editar Crianças', 'Permite editar dados de crianças', 'Crianças'),
('criancas.excluir', 'Excluir Crianças', 'Permite excluir crianças', 'Crianças'),
('fila.visualizar', 'Visualizar Fila', 'Permite visualizar fila de espera', 'Fila'),
('fila.convocar', 'Convocar Crianças', 'Permite convocar crianças', 'Fila'),
('fila.gerenciar', 'Gerenciar Fila', 'Permite gerenciar a fila', 'Fila'),
('matriculas.visualizar', 'Visualizar Matrículas', 'Permite visualizar matrículas', 'Matrículas'),
('matriculas.confirmar', 'Confirmar Matrículas', 'Permite confirmar matrículas', 'Matrículas'),
('matriculas.realocar', 'Realocar Alunos', 'Permite realocar alunos', 'Matrículas'),
('matriculas.cancelar', 'Cancelar Matrículas', 'Permite cancelar matrículas', 'Matrículas'),
('cmeis.visualizar', 'Visualizar CMEIs', 'Permite visualizar CMEIs', 'CMEIs'),
('cmeis.criar', 'Criar CMEIs', 'Permite cadastrar CMEIs', 'CMEIs'),
('cmeis.editar', 'Editar CMEIs', 'Permite editar CMEIs', 'CMEIs'),
('cmeis.excluir', 'Excluir CMEIs', 'Permite excluir CMEIs', 'CMEIs'),
('turmas.visualizar', 'Visualizar Turmas', 'Permite visualizar turmas', 'Turmas'),
('turmas.criar', 'Criar Turmas', 'Permite criar turmas', 'Turmas'),
('turmas.editar', 'Editar Turmas', 'Permite editar turmas', 'Turmas'),
('turmas.excluir', 'Excluir Turmas', 'Permite excluir turmas', 'Turmas'),
('usuarios.visualizar', 'Visualizar Usuários', 'Permite visualizar usuários', 'Usuários'),
('usuarios.criar', 'Criar Usuários', 'Permite criar usuários', 'Usuários'),
('usuarios.editar', 'Editar Usuários', 'Permite editar usuários', 'Usuários'),
('usuarios.roles', 'Gerenciar Papéis', 'Permite alterar papéis', 'Usuários'),
('usuarios.desativar', 'Desativar Usuários', 'Permite desativar usuários', 'Usuários'),
('relatorios.visualizar', 'Visualizar Relatórios', 'Permite visualizar relatórios', 'Relatórios'),
('relatorios.exportar', 'Exportar Relatórios', 'Permite exportar relatórios', 'Relatórios'),
('configuracoes.visualizar', 'Visualizar Configurações', 'Permite visualizar configurações', 'Configurações'),
('configuracoes.editar', 'Editar Configurações', 'Permite editar configurações', 'Configurações'),
('auditoria.visualizar', 'Visualizar Auditoria', 'Permite visualizar auditoria', 'Auditoria'),
('documentos.visualizar', 'Visualizar Documentos', 'Permite visualizar documentos', 'Documentos'),
('documentos.aprovar', 'Aprovar Documentos', 'Permite aprovar documentos', 'Documentos'),
('remanejamento.visualizar', 'Visualizar Remanejamentos', 'Permite visualizar solicitações de remanejamento', 'Remanejamento'),
('remanejamento.aprovar', 'Aprovar Remanejamentos', 'Permite aprovar remanejamentos', 'Remanejamento'),
('remanejamento.recusar', 'Recusar Remanejamentos', 'Permite recusar remanejamentos', 'Remanejamento')
ON CONFLICT (codigo) DO NOTHING;

-- Associar permissões aos papéis
INSERT INTO public.role_permissoes (role, permissao_id)
SELECT 'admin', id FROM public.permissoes ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissoes (role, permissao_id)
SELECT 'superadmin', id FROM public.permissoes ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissoes (role, permissao_id)
SELECT 'gestor', id FROM public.permissoes 
WHERE codigo IN (
  'criancas.visualizar', 'criancas.criar', 'criancas.editar', 
  'fila.visualizar', 'fila.convocar', 'fila.gerenciar', 
  'matriculas.visualizar', 'matriculas.confirmar', 'matriculas.realocar', 'matriculas.cancelar',
  'cmeis.visualizar', 'turmas.visualizar', 
  'relatorios.visualizar', 'relatorios.exportar', 
  'documentos.visualizar', 'documentos.aprovar',
  'remanejamento.visualizar', 'remanejamento.aprovar', 'remanejamento.recusar'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissoes (role, permissao_id)
SELECT 'diretor_cmei', id FROM public.permissoes 
WHERE codigo IN (
  'criancas.visualizar', 
  'fila.visualizar', 
  'matriculas.visualizar', 
  'cmeis.visualizar', 'turmas.visualizar', 
  'relatorios.visualizar', 
  'documentos.visualizar', 'documentos.aprovar',
  'remanejamento.visualizar'
)
ON CONFLICT DO NOTHING;

-- Campos de Inscrição (sistema)
INSERT INTO public.campos_inscricao (secao, nome_campo, label, tipo, placeholder, obrigatorio, campo_sistema, ordem, mascara) VALUES
('crianca', 'nome', 'Nome completo da criança', 'text', 'Nome completo', true, true, 1, NULL),
('crianca', 'data_nascimento', 'Data de nascimento', 'date', NULL, true, true, 2, NULL),
('crianca', 'sexo', 'Sexo', 'select', NULL, true, true, 3, NULL),
('responsavel', 'responsavel_nome', 'Nome do responsável', 'text', 'Nome completo', true, true, 1, NULL),
('responsavel', 'responsavel_cpf', 'CPF do responsável', 'cpf', '000.000.000-00', true, true, 2, 'cpf'),
('responsavel', 'responsavel_telefone', 'Telefone/WhatsApp', 'phone', '(00) 00000-0000', true, true, 3, 'phone'),
('endereco', 'cep', 'CEP', 'cep', '00000-000', true, true, 1, 'cep'),
('endereco', 'logradouro', 'Logradouro', 'text', 'Rua, Avenida...', true, true, 2, NULL),
('endereco', 'numero', 'Número', 'text', 'Nº', true, true, 3, NULL),
('endereco', 'bairro', 'Bairro', 'text', 'Bairro', true, true, 5, NULL)
ON CONFLICT (nome_campo) DO NOTHING;

-- Atualizar opções do campo sexo
UPDATE public.campos_inscricao SET opcoes = '[{"value": "Masculino", "label": "Masculino"}, {"value": "Feminino", "label": "Feminino"}]'::jsonb WHERE nome_campo = 'sexo';

-- =============================================================================
-- FIM DOS DADOS INICIAIS
-- =============================================================================


-- =============================================================================
-- PARTE 4: AUTOMAÃ‡ÃƒO (Realtime, Cron)
-- =============================================================================
-- =============================================================================
-- VAGOU - Setup de Automação (pg_cron, Realtime, Scheduled Jobs)
-- =============================================================================
-- Execute APÓS o script 03-setup-dados-iniciais.sql
-- 
-- IMPORTANTE: Este script requer que as extensões pg_cron e pg_net estejam
-- habilitadas no projeto Supabase. Veja instruções abaixo.
-- =============================================================================

-- =============================================================================
-- PARTE 1: VERIFICAÇÃO DE EXTENSÕES
-- =============================================================================
-- As extensões pg_cron e pg_net devem ser habilitadas MANUALMENTE no Dashboard:
-- 1. Acesse: https://supabase.com/dashboard/project/[SEU_PROJECT_REF]/database/extensions
-- 2. Procure por "pg_cron" e clique em "Enable"
-- 3. Procure por "pg_net" e clique em "Enable"
--
-- Execute este comando para verificar se estão habilitadas:

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE '⚠️ ATENÇÃO: Extensão pg_cron NÃO está habilitada!';
    RAISE NOTICE '   Habilite em: Dashboard > Database > Extensions > pg_cron';
  ELSE
    RAISE NOTICE '✅ Extensão pg_cron está habilitada';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE '⚠️ ATENÇÃO: Extensão pg_net NÃO está habilitada!';
    RAISE NOTICE '   Habilite em: Dashboard > Database > Extensions > pg_net';
  ELSE
    RAISE NOTICE '✅ Extensão pg_net está habilitada';
  END IF;
END $$;

-- =============================================================================
-- PARTE 2: REALTIME
-- =============================================================================
-- Configura as tabelas para receberem atualizações em tempo real

-- Habilitar REPLICA IDENTITY FULL para capturar dados completos nas mudanças
ALTER TABLE public.criancas REPLICA IDENTITY FULL;
ALTER TABLE public.historico REPLICA IDENTITY FULL;
ALTER TABLE public.chat_mensagens REPLICA IDENTITY FULL;
ALTER TABLE public.notificacoes_log REPLICA IDENTITY FULL;
ALTER TABLE public.configuracoes_sistema REPLICA IDENTITY FULL;
ALTER TABLE public.auditoria REPLICA IDENTITY FULL;
ALTER TABLE public.turmas REPLICA IDENTITY FULL;
ALTER TABLE public.cmeis REPLICA IDENTITY FULL;
ALTER TABLE public.documentos_crianca REPLICA IDENTITY FULL;
ALTER TABLE public.crianca_prioridades REPLICA IDENTITY FULL;

-- Adicionar tabelas à publicação supabase_realtime
-- Nota: A publicação supabase_realtime já existe por padrão no Supabase
DO $$
DECLARE
  tables_to_add text[] := ARRAY[
    'criancas',
    'historico', 
    'chat_mensagens',
    'notificacoes_log',
    'configuracoes_sistema',
    'auditoria',
    'turmas',
    'cmeis',
    'documentos_crianca',
    'crianca_prioridades'
  ];
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY tables_to_add
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      RAISE NOTICE '✅ Tabela % adicionada ao Realtime', tbl;
    EXCEPTION 
      WHEN duplicate_object THEN
        RAISE NOTICE '⏭️ Tabela % já está no Realtime', tbl;
      WHEN undefined_object THEN
        RAISE NOTICE '⚠️ Tabela % não existe', tbl;
    END;
  END LOOP;
END $$;

-- =============================================================================
-- PARTE 3: VERIFICAÇÃO FINAL DO SCRIPT PRINCIPAL
-- =============================================================================

DO $$
DECLARE
  v_cron_enabled boolean;
  v_net_enabled boolean;
  v_realtime_count integer;
BEGIN
  SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') INTO v_cron_enabled;
  SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_net') INTO v_net_enabled;
  
  SELECT COUNT(*) INTO v_realtime_count
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime' AND schemaname = 'public';
  
  RAISE NOTICE '';
  RAISE NOTICE '========== RESUMO - SCRIPT PRINCIPAL ==========';
  RAISE NOTICE '';
  RAISE NOTICE 'EXTENSÕES:';
  RAISE NOTICE '  pg_cron: %', CASE WHEN v_cron_enabled THEN '✅ Habilitada' ELSE '❌ NÃO habilitada' END;
  RAISE NOTICE '  pg_net:  %', CASE WHEN v_net_enabled THEN '✅ Habilitada' ELSE '❌ NÃO habilitada' END;
  RAISE NOTICE '';
  RAISE NOTICE 'REALTIME:';
  RAISE NOTICE '  Tabelas configuradas: % (esperado: 10)', v_realtime_count;
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE '🔴 PRÓXIMO PASSO OBRIGATÓRIO:';
  RAISE NOTICE '   Execute a PARTE 4 abaixo para configurar os CRON JOBS';
  RAISE NOTICE '';
END $$;

-- =============================================================================
-- =============================================================================
--
--                    🔴 PARTE 4: CRON JOBS (EXECUÇÃO SEPARADA)
--
-- =============================================================================
-- =============================================================================
--
-- ⚠️  INSTRUÇÕES IMPORTANTES:
--
-- 1. COPIE todo o bloco abaixo (entre BEGIN e END do bloco SQL)
-- 2. SUBSTITUA os valores:
--    - [SEU_PROJECT_REF] = ID do seu projeto (ex: dizziofoxptanrqgxoue)
--    - [SUA_ANON_KEY] = Chave anônima do projeto
--
-- Para encontrar estes valores:
-- - Project Ref: Dashboard > Settings > General > Reference ID
-- - Anon Key: Dashboard > Settings > API > anon public
--
-- 3. COLE no SQL Editor do Supabase e EXECUTE
--
-- =============================================================================

/*
-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║                    CRON JOBS - COPIE E EXECUTE                            ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- ┌───────────────────────────────────────────────────────────────────────────┐
-- │ JOB 1: LIMPAR RATE LIMITS (OBRIGATÓRIO!)                                  │
-- │ Executa a cada hora - Limpa entradas de rate limit antigas                │
-- │ ⚠️ SEM ESTE JOB a tabela rate_limit_entries CRESCE INDEFINIDAMENTE!       │
-- └───────────────────────────────────────────────────────────────────────────┘

SELECT cron.schedule(
  'limpar-rate-limits-hora',
  '0 * * * *',
  $$SELECT cleanup_old_rate_limits();$$
);

-- ┌───────────────────────────────────────────────────────────────────────────┐
-- │ JOB 2: VERIFICAR PRAZOS VENCIDOS (RECOMENDADO)                            │
-- │ Executa diariamente às 6h UTC (3h Brasília)                               │
-- │ Verifica crianças com prazo de convocação expirado                        │
-- └───────────────────────────────────────────────────────────────────────────┘

SELECT cron.schedule(
  'verificar-prazos-diario',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://[SEU_PROJECT_REF].supabase.co/functions/v1/verificar-prazos',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer [SUA_ANON_KEY]"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  ) AS request_id;
  $$
);

-- ┌───────────────────────────────────────────────────────────────────────────┐
-- │ JOB 3: RECALCULAR FILA (OPCIONAL)                                         │
-- │ Executa diariamente às 5h UTC - Recalcula posições da fila                │
-- │ A fila já é recalculada automaticamente em cada mudança                   │
-- └───────────────────────────────────────────────────────────────────────────┘

-- Descomente se desejar:
-- SELECT cron.schedule(
--   'recalcular-fila-diario',
--   '0 5 * * *',
--   $$SELECT recalcular_posicoes_fila();$$
-- );

-- ┌───────────────────────────────────────────────────────────────────────────┐
-- │ VERIFICAÇÃO: Listar todos os jobs criados                                 │
-- └───────────────────────────────────────────────────────────────────────────┘

SELECT 
  jobid,
  jobname,
  schedule,
  active,
  CASE 
    WHEN jobname = 'limpar-rate-limits-hora' THEN '🔴 OBRIGATÓRIO'
    WHEN jobname = 'verificar-prazos-diario' THEN '🟡 RECOMENDADO'
    ELSE '🟢 OPCIONAL'
  END as importancia
FROM cron.job
ORDER BY jobname;

*/

-- =============================================================================
-- PARTE 5: SCRIPT DE VERIFICAÇÃO PÓS-CONFIGURAÇÃO
-- =============================================================================
-- Execute após configurar os cron jobs para verificar se tudo está correto

/*
DO $$
DECLARE
  v_cron_enabled boolean;
  v_net_enabled boolean;
  v_realtime_count integer;
  v_cron_jobs integer;
  v_has_rate_limit_job boolean;
  v_has_prazos_job boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') INTO v_cron_enabled;
  SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_net') INTO v_net_enabled;
  
  SELECT COUNT(*) INTO v_realtime_count
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime' AND schemaname = 'public';
  
  IF v_cron_enabled THEN
    SELECT COUNT(*) INTO v_cron_jobs FROM cron.job;
    SELECT EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'limpar-rate-limits-hora') INTO v_has_rate_limit_job;
    SELECT EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'verificar-prazos-diario') INTO v_has_prazos_job;
  ELSE
    v_cron_jobs := 0;
    v_has_rate_limit_job := false;
    v_has_prazos_job := false;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║           VERIFICAÇÃO COMPLETA DE AUTOMAÇÃO                   ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '┌─────────────────────────────────────────────────────────────┐';
  RAISE NOTICE '│ EXTENSÕES                                                   │';
  RAISE NOTICE '├─────────────────────────────────────────────────────────────┤';
  RAISE NOTICE '│ pg_cron: %', CASE WHEN v_cron_enabled THEN '✅ Habilitada                                       │' ELSE '❌ NÃO habilitada (CRÍTICO!)                        │' END;
  RAISE NOTICE '│ pg_net:  %', CASE WHEN v_net_enabled THEN '✅ Habilitada                                       │' ELSE '❌ NÃO habilitada                                   │' END;
  RAISE NOTICE '└─────────────────────────────────────────────────────────────┘';
  RAISE NOTICE '';
  RAISE NOTICE '┌─────────────────────────────────────────────────────────────┐';
  RAISE NOTICE '│ REALTIME                                                    │';
  RAISE NOTICE '├─────────────────────────────────────────────────────────────┤';
  RAISE NOTICE '│ Tabelas: % de 10 esperadas %', v_realtime_count, CASE WHEN v_realtime_count >= 10 THEN '✅                             │' ELSE '⚠️                             │' END;
  RAISE NOTICE '└─────────────────────────────────────────────────────────────┘';
  RAISE NOTICE '';
  RAISE NOTICE '┌─────────────────────────────────────────────────────────────┐';
  RAISE NOTICE '│ CRON JOBS                                                   │';
  RAISE NOTICE '├─────────────────────────────────────────────────────────────┤';
  RAISE NOTICE '│ Total de jobs: %                                            │', v_cron_jobs;
  RAISE NOTICE '│ limpar-rate-limits-hora: %', CASE WHEN v_has_rate_limit_job THEN '✅ Configurado (OBRIGATÓRIO)      │' ELSE '❌ NÃO configurado (CRÍTICO!)      │' END;
  RAISE NOTICE '│ verificar-prazos-diario: %', CASE WHEN v_has_prazos_job THEN '✅ Configurado                      │' ELSE '⚠️ NÃO configurado (recomendado)   │' END;
  RAISE NOTICE '└─────────────────────────────────────────────────────────────┘';
  
  IF NOT v_cron_enabled OR NOT v_has_rate_limit_job THEN
    RAISE NOTICE '';
    RAISE NOTICE '🔴 AÇÕES CRÍTICAS NECESSÁRIAS:';
    IF NOT v_cron_enabled THEN
      RAISE NOTICE '   - Habilite pg_cron: Dashboard > Database > Extensions';
    END IF;
    IF NOT v_has_rate_limit_job THEN
      RAISE NOTICE '   - Configure o cron job "limpar-rate-limits-hora"';
      RAISE NOTICE '     Sem ele, a tabela rate_limit_entries crescerá indefinidamente!';
    END IF;
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅ Configuração de automação COMPLETA!';
  END IF;
  
  RAISE NOTICE '';
END $$;
*/


-- =============================================================================
-- PARTE 5: OTIMIZAÃ‡Ã•ES DE PERFORMANCE
-- =============================================================================

-- 5.1: CorreÃ§Ã£o de Performance em RLS (auth.uid() otimizado)
-- =============================================================================
-- VAGOU - Correção de Performance em RLS (Supabase Linter)
-- =============================================================================
-- Substitui chamadas diretas a auth.uid() e funções de auth por subqueries (SELECT ...)
-- para evitar reavaliação a cada linha (initplan vs filter).
-- =============================================================================

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
CREATE POLICY "Admin can view all profiles" ON public.profiles FOR SELECT USING ((SELECT is_admin(auth.uid())));

-- User Roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING ((SELECT public.has_role(auth.uid(), 'admin')) OR (SELECT public.has_role(auth.uid(), 'superadmin')));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING ((SELECT public.has_role(auth.uid(), 'admin')) OR (SELECT public.has_role(auth.uid(), 'superadmin'))) WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin')) OR (SELECT public.has_role(auth.uid(), 'superadmin')));

-- Configurações do Sistema
DROP POLICY IF EXISTS "Admins can read all configurations" ON public.configuracoes_sistema;
CREATE POLICY "Admins can read all configurations" ON public.configuracoes_sistema FOR SELECT USING ((SELECT is_admin(auth.uid())));

DROP POLICY IF EXISTS "Admin can update configurations" ON public.configuracoes_sistema;
CREATE POLICY "Admin can update configurations" ON public.configuracoes_sistema FOR UPDATE USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- CMEIs
DROP POLICY IF EXISTS "Admin can manage CMEIs" ON public.cmeis;
CREATE POLICY "Admin can manage CMEIs" ON public.cmeis FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- Turmas
DROP POLICY IF EXISTS "Admin can manage turmas" ON public.turmas;
CREATE POLICY "Admin can manage turmas" ON public.turmas FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- Turmas Base
DROP POLICY IF EXISTS "Admin can manage base classes" ON public.turmas_base;
CREATE POLICY "Admin can manage base classes" ON public.turmas_base FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- Crianças
DROP POLICY IF EXISTS "Responsavel can view own children" ON public.criancas;
CREATE POLICY "Responsavel can view own children" ON public.criancas FOR SELECT USING ((SELECT auth.uid()) = responsavel_user_id OR (SELECT is_admin(auth.uid())));

DROP POLICY IF EXISTS "Admin can manage all children" ON public.criancas;
CREATE POLICY "Admin can manage all children" ON public.criancas FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

DROP POLICY IF EXISTS "Responsavel can update own children contact info" ON public.criancas;
CREATE POLICY "Responsavel can update own children contact info" ON public.criancas FOR UPDATE USING ((SELECT auth.uid()) = responsavel_user_id) WITH CHECK ((SELECT auth.uid()) = responsavel_user_id);

-- Histórico
DROP POLICY IF EXISTS "Responsavel can view own children history" ON public.historico;
CREATE POLICY "Responsavel can view own children history" ON public.historico FOR SELECT USING (
  EXISTS (SELECT 1 FROM criancas WHERE criancas.id = historico.crianca_id AND criancas.responsavel_user_id = (SELECT auth.uid())) OR (SELECT is_admin(auth.uid()))
);

DROP POLICY IF EXISTS "Admin can manage history" ON public.historico;
CREATE POLICY "Admin can manage history" ON public.historico FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

DROP POLICY IF EXISTS "Responsavel can insert history for own children" ON public.historico;
CREATE POLICY "Responsavel can insert history for own children" ON public.historico FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM criancas WHERE criancas.id = historico.crianca_id AND criancas.responsavel_user_id = (SELECT auth.uid())));

-- Auditoria
DROP POLICY IF EXISTS "Only admin can view audit logs" ON public.auditoria;
CREATE POLICY "Only admin can view audit logs" ON public.auditoria FOR SELECT USING ((SELECT has_role(auth.uid(), 'admin')) OR (SELECT has_role(auth.uid(), 'superadmin')));

-- Notificações Log
DROP POLICY IF EXISTS "Admin can view all notification logs" ON public.notificacoes_log;
CREATE POLICY "Admin can view all notification logs" ON public.notificacoes_log FOR SELECT USING ((SELECT is_admin(auth.uid())));

DROP POLICY IF EXISTS "Admin can insert notification logs" ON public.notificacoes_log;
CREATE POLICY "Admin can insert notification logs" ON public.notificacoes_log FOR INSERT WITH CHECK ((SELECT is_admin(auth.uid())));

-- Diretor CMEI Vínculo
DROP POLICY IF EXISTS "Admin can manage director bindings" ON public.diretor_cmei_vinculo;
CREATE POLICY "Admin can manage director bindings" ON public.diretor_cmei_vinculo FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

DROP POLICY IF EXISTS "Directors can view own bindings" ON public.diretor_cmei_vinculo;
CREATE POLICY "Directors can view own bindings" ON public.diretor_cmei_vinculo FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- Permissões
DROP POLICY IF EXISTS "Admin can manage permissions" ON public.permissoes;
CREATE POLICY "Admin can manage permissions" ON public.permissoes FOR ALL USING ((SELECT has_role(auth.uid(), 'admin')) OR (SELECT has_role(auth.uid(), 'superadmin'))) WITH CHECK ((SELECT has_role(auth.uid(), 'admin')) OR (SELECT has_role(auth.uid(), 'superadmin')));

-- Role Permissões
DROP POLICY IF EXISTS "Admin can manage role permissions" ON public.role_permissoes;
CREATE POLICY "Admin can manage role permissions" ON public.role_permissoes FOR ALL USING ((SELECT has_role(auth.uid(), 'admin')) OR (SELECT has_role(auth.uid(), 'superadmin'))) WITH CHECK ((SELECT has_role(auth.uid(), 'admin')) OR (SELECT has_role(auth.uid(), 'superadmin')));

-- Documentos Tipos
DROP POLICY IF EXISTS "Admin can manage document types" ON public.documentos_tipos;
CREATE POLICY "Admin can manage document types" ON public.documentos_tipos FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- Documentos Criança
DROP POLICY IF EXISTS "Admin can manage all documents" ON public.documentos_crianca;
CREATE POLICY "Admin can manage all documents" ON public.documentos_crianca FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

DROP POLICY IF EXISTS "Responsavel can view own children documents" ON public.documentos_crianca;
CREATE POLICY "Responsavel can view own children documents" ON public.documentos_crianca FOR SELECT USING (EXISTS (SELECT 1 FROM public.criancas WHERE criancas.id = documentos_crianca.crianca_id AND criancas.responsavel_user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Responsavel can upload documents for own children" ON public.documentos_crianca;
CREATE POLICY "Responsavel can upload documents for own children" ON public.documentos_crianca FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.criancas WHERE criancas.id = crianca_id AND criancas.responsavel_user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Responsavel can update own pending documents" ON public.documentos_crianca;
CREATE POLICY "Responsavel can update own pending documents" ON public.documentos_crianca FOR UPDATE USING (status = 'pendente' AND EXISTS (SELECT 1 FROM public.criancas WHERE criancas.id = documentos_crianca.crianca_id AND criancas.responsavel_user_id = (SELECT auth.uid())));

-- Tipos Prioridade
DROP POLICY IF EXISTS "Admin can manage priority types" ON public.tipos_prioridade;
CREATE POLICY "Admin can manage priority types" ON public.tipos_prioridade FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- Criança Prioridades
DROP POLICY IF EXISTS "Admin can manage child priorities" ON public.crianca_prioridades;
CREATE POLICY "Admin can manage child priorities" ON public.crianca_prioridades FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

DROP POLICY IF EXISTS "Responsavel can view own child priorities" ON public.crianca_prioridades;
CREATE POLICY "Responsavel can view own child priorities" ON public.crianca_prioridades FOR SELECT USING (EXISTS (SELECT 1 FROM criancas WHERE criancas.id = crianca_prioridades.crianca_id AND criancas.responsavel_user_id = (SELECT auth.uid())));

-- Templates Mensagens
DROP POLICY IF EXISTS "Admin can manage templates" ON public.templates_mensagens;
CREATE POLICY "Admin can manage templates" ON public.templates_mensagens FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- Mensagens Status Custom
DROP POLICY IF EXISTS "Admin can manage status messages" ON public.mensagens_status_custom;
CREATE POLICY "Admin can manage status messages" ON public.mensagens_status_custom FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- Feriados Municipais
DROP POLICY IF EXISTS "Admin can manage holidays" ON public.feriados_municipais;
CREATE POLICY "Admin can manage holidays" ON public.feriados_municipais FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- Motivos Padrão
DROP POLICY IF EXISTS "Admin can manage reasons" ON public.motivos_padrao;
CREATE POLICY "Admin can manage reasons" ON public.motivos_padrao FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- Campos Inscrição
DROP POLICY IF EXISTS "Admin can manage form fields" ON public.campos_inscricao;
CREATE POLICY "Admin can manage form fields" ON public.campos_inscricao FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- Campos Inscrição Histórico
DROP POLICY IF EXISTS "Admin can view field history" ON public.campos_inscricao_historico;
CREATE POLICY "Admin can view field history" ON public.campos_inscricao_historico FOR SELECT USING ((SELECT is_admin(auth.uid())));

-- Valores Campos Custom
DROP POLICY IF EXISTS "Admin can manage custom field values" ON public.valores_campos_custom;
CREATE POLICY "Admin can manage custom field values" ON public.valores_campos_custom FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

DROP POLICY IF EXISTS "Responsavel can view own children custom fields" ON public.valores_campos_custom;
CREATE POLICY "Responsavel can view own children custom fields" ON public.valores_campos_custom FOR SELECT USING (EXISTS (SELECT 1 FROM criancas WHERE criancas.id = valores_campos_custom.crianca_id AND criancas.responsavel_user_id = (SELECT auth.uid())));

-- Zonas Atendimento
DROP POLICY IF EXISTS "Admin can manage zones" ON public.zonas_atendimento;
CREATE POLICY "Admin can manage zones" ON public.zonas_atendimento FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- CMEI Zonas
DROP POLICY IF EXISTS "Admin can manage cmei zones" ON public.cmei_zonas;
CREATE POLICY "Admin can manage cmei zones" ON public.cmei_zonas FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- User Preferences
DROP POLICY IF EXISTS "Users can manage own preferences" ON public.user_preferences;
CREATE POLICY "Users can manage own preferences" ON public.user_preferences FOR ALL USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- Planejamento Transição
DROP POLICY IF EXISTS "Admin can manage transition planning" ON public.planejamento_transicao;
CREATE POLICY "Admin can manage transition planning" ON public.planejamento_transicao FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- Chat Mensagens
DROP POLICY IF EXISTS "Admin can manage all chat messages" ON public.chat_mensagens;
CREATE POLICY "Admin can manage all chat messages" ON public.chat_mensagens FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

DROP POLICY IF EXISTS "Responsavel can view own messages" ON public.chat_mensagens;
CREATE POLICY "Responsavel can view own messages" ON public.chat_mensagens FOR SELECT USING (responsavel_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Responsavel can insert own messages" ON public.chat_mensagens;
CREATE POLICY "Responsavel can insert own messages" ON public.chat_mensagens FOR INSERT WITH CHECK (responsavel_id = (SELECT auth.uid()) AND direcao = 'responsavel');

-- Chat Conversas Config
DROP POLICY IF EXISTS "Admin can manage chat config" ON public.chat_conversas_config;
CREATE POLICY "Admin can manage chat config" ON public.chat_conversas_config FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

DROP POLICY IF EXISTS "Responsavel can view own chat config" ON public.chat_conversas_config;
CREATE POLICY "Responsavel can view own chat config" ON public.chat_conversas_config FOR SELECT USING (responsavel_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Responsavel can insert own chat config" ON public.chat_conversas_config;
CREATE POLICY "Responsavel can insert own chat config" ON public.chat_conversas_config FOR INSERT WITH CHECK (responsavel_id = (SELECT auth.uid()));

-- Chat Marcadores
DROP POLICY IF EXISTS "Admin can manage chat labels" ON public.chat_marcadores;
CREATE POLICY "Admin can manage chat labels" ON public.chat_marcadores FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- Chat Conversa Marcadores
DROP POLICY IF EXISTS "Admin can manage conversation labels" ON public.chat_conversa_marcadores;
CREATE POLICY "Admin can manage conversation labels" ON public.chat_conversa_marcadores FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

DROP POLICY IF EXISTS "Responsavel can view own conversation labels" ON public.chat_conversa_marcadores;
CREATE POLICY "Responsavel can view own conversation labels" ON public.chat_conversa_marcadores FOR SELECT USING (responsavel_id = (SELECT auth.uid()));

-- Chat Respostas Rápidas
DROP POLICY IF EXISTS "Admin can manage quick replies" ON public.chat_respostas_rapidas;
CREATE POLICY "Admin can manage quick replies" ON public.chat_respostas_rapidas FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- Tutoriais
DROP POLICY IF EXISTS "Superadmin can manage tutorials" ON public.tutoriais_videos;
CREATE POLICY "Superadmin can manage tutorials" ON public.tutoriais_videos FOR ALL USING ((SELECT has_role(auth.uid(), 'superadmin'))) WITH CHECK ((SELECT has_role(auth.uid(), 'superadmin')));

DROP POLICY IF EXISTS "Superadmin can manage tutorial sections" ON public.tutorial_secoes;
CREATE POLICY "Superadmin can manage tutorial sections" ON public.tutorial_secoes FOR ALL USING ((SELECT has_role(auth.uid(), 'superadmin'))) WITH CHECK ((SELECT has_role(auth.uid(), 'superadmin')));

DROP POLICY IF EXISTS "Superadmin can manage FAQs" ON public.tutorial_faq;
CREATE POLICY "Superadmin can manage FAQs" ON public.tutorial_faq FOR ALL USING ((SELECT has_role(auth.uid(), 'superadmin'))) WITH CHECK ((SELECT has_role(auth.uid(), 'superadmin')));

DROP POLICY IF EXISTS "Superadmin can manage tips" ON public.tutorial_dicas;
CREATE POLICY "Superadmin can manage tips" ON public.tutorial_dicas FOR ALL USING ((SELECT has_role(auth.uid(), 'superadmin'))) WITH CHECK ((SELECT has_role(auth.uid(), 'superadmin')));


-- 5.2: CorreÃ§Ã£o de PolÃ­ticas Permissivas MÃºltiplas
-- =============================================================================
-- VAGOU - Correção de Multiple Permissive Policies (Supabase Linter)
-- =============================================================================
-- Combina políticas permissivas múltiplas para a mesma role/ação em uma única política
-- para evitar avaliações redundantes e melhorar a performance.
-- =============================================================================

-- tutorial_faq
DROP POLICY IF EXISTS "Anyone can view active FAQs" ON public.tutorial_faq;
DROP POLICY IF EXISTS "Superadmin can manage FAQs" ON public.tutorial_faq;

CREATE POLICY "View FAQs" ON public.tutorial_faq FOR SELECT USING (ativo = true OR (SELECT has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Superadmin write FAQs" ON public.tutorial_faq FOR INSERT WITH CHECK ((SELECT has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Superadmin update FAQs" ON public.tutorial_faq FOR UPDATE USING ((SELECT has_role(auth.uid(), 'superadmin'))) WITH CHECK ((SELECT has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Superadmin delete FAQs" ON public.tutorial_faq FOR DELETE USING ((SELECT has_role(auth.uid(), 'superadmin')));

-- tutorial_secoes
DROP POLICY IF EXISTS "Anyone can view active tutorial sections" ON public.tutorial_secoes;
DROP POLICY IF EXISTS "Superadmin can manage tutorial sections" ON public.tutorial_secoes;

CREATE POLICY "View tutorial sections" ON public.tutorial_secoes FOR SELECT USING (ativo = true OR (SELECT has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Superadmin write tutorial sections" ON public.tutorial_secoes FOR INSERT WITH CHECK ((SELECT has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Superadmin update tutorial sections" ON public.tutorial_secoes FOR UPDATE USING ((SELECT has_role(auth.uid(), 'superadmin'))) WITH CHECK ((SELECT has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Superadmin delete tutorial sections" ON public.tutorial_secoes FOR DELETE USING ((SELECT has_role(auth.uid(), 'superadmin')));

-- tutorial_dicas
DROP POLICY IF EXISTS "Anyone can view active tips" ON public.tutorial_dicas;
DROP POLICY IF EXISTS "Superadmin can manage tips" ON public.tutorial_dicas;

CREATE POLICY "View tips" ON public.tutorial_dicas FOR SELECT USING (ativo = true OR (SELECT has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Superadmin write tips" ON public.tutorial_dicas FOR INSERT WITH CHECK ((SELECT has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Superadmin update tips" ON public.tutorial_dicas FOR UPDATE USING ((SELECT has_role(auth.uid(), 'superadmin'))) WITH CHECK ((SELECT has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Superadmin delete tips" ON public.tutorial_dicas FOR DELETE USING ((SELECT has_role(auth.uid(), 'superadmin')));

-- permissoes
DROP POLICY IF EXISTS "Anyone can view permissions" ON public.permissoes;
DROP POLICY IF EXISTS "Admin can manage permissions" ON public.permissoes;

CREATE POLICY "View permissions" ON public.permissoes FOR SELECT USING (true);
CREATE POLICY "Admin write permissions" ON public.permissoes FOR INSERT WITH CHECK ((SELECT has_role(auth.uid(), 'admin')) OR (SELECT has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Admin update permissions" ON public.permissoes FOR UPDATE USING ((SELECT has_role(auth.uid(), 'admin')) OR (SELECT has_role(auth.uid(), 'superadmin'))) WITH CHECK ((SELECT has_role(auth.uid(), 'admin')) OR (SELECT has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Admin delete permissions" ON public.permissoes FOR DELETE USING ((SELECT has_role(auth.uid(), 'admin')) OR (SELECT has_role(auth.uid(), 'superadmin')));

-- role_permissoes
DROP POLICY IF EXISTS "Anyone can view role permissions" ON public.role_permissoes;
DROP POLICY IF EXISTS "Admin can manage role permissions" ON public.role_permissoes;

CREATE POLICY "View role permissions" ON public.role_permissoes FOR SELECT USING (true);
CREATE POLICY "Admin write role permissions" ON public.role_permissoes FOR INSERT WITH CHECK ((SELECT has_role(auth.uid(), 'admin')) OR (SELECT has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Admin update role permissions" ON public.role_permissoes FOR UPDATE USING ((SELECT has_role(auth.uid(), 'admin')) OR (SELECT has_role(auth.uid(), 'superadmin'))) WITH CHECK ((SELECT has_role(auth.uid(), 'admin')) OR (SELECT has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Admin delete role permissions" ON public.role_permissoes FOR DELETE USING ((SELECT has_role(auth.uid(), 'admin')) OR (SELECT has_role(auth.uid(), 'superadmin')));

-- valores_campos_custom
DROP POLICY IF EXISTS "Admin can manage custom field values" ON public.valores_campos_custom;
DROP POLICY IF EXISTS "Admin can manage custom values" ON public.valores_campos_custom;
DROP POLICY IF EXISTS "Public can insert custom values" ON public.valores_campos_custom;
DROP POLICY IF EXISTS "Responsavel can view own custom values" ON public.valores_campos_custom;
DROP POLICY IF EXISTS "Responsavel can view own children custom fields" ON public.valores_campos_custom;

CREATE POLICY "Public insert custom values" ON public.valores_campos_custom FOR INSERT WITH CHECK (true);
CREATE POLICY "View custom values" ON public.valores_campos_custom FOR SELECT USING ((SELECT is_admin(auth.uid())) OR EXISTS (SELECT 1 FROM criancas WHERE criancas.id = valores_campos_custom.crianca_id AND criancas.responsavel_user_id = (SELECT auth.uid())));
CREATE POLICY "Admin update custom values" ON public.valores_campos_custom FOR UPDATE USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));
CREATE POLICY "Admin delete custom values" ON public.valores_campos_custom FOR DELETE USING ((SELECT is_admin(auth.uid())));

-- zonas_atendimento
DROP POLICY IF EXISTS "Admin can manage zones" ON public.zonas_atendimento;
DROP POLICY IF EXISTS "Anyone can view active zones" ON public.zonas_atendimento;

CREATE POLICY "View zones" ON public.zonas_atendimento FOR SELECT USING (ativo = true OR (SELECT is_admin(auth.uid())));
CREATE POLICY "Admin write zones" ON public.zonas_atendimento FOR INSERT WITH CHECK ((SELECT is_admin(auth.uid())));
CREATE POLICY "Admin update zones" ON public.zonas_atendimento FOR UPDATE USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));
CREATE POLICY "Admin delete zones" ON public.zonas_atendimento FOR DELETE USING ((SELECT is_admin(auth.uid())));

-- user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "View roles" ON public.user_roles FOR SELECT USING ((SELECT auth.uid()) = user_id OR (SELECT public.has_role(auth.uid(), 'admin')) OR (SELECT public.has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Admin write roles" ON public.user_roles FOR INSERT WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin')) OR (SELECT public.has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Admin update roles" ON public.user_roles FOR UPDATE USING ((SELECT public.has_role(auth.uid(), 'admin')) OR (SELECT public.has_role(auth.uid(), 'superadmin'))) WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin')) OR (SELECT public.has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Admin delete roles" ON public.user_roles FOR DELETE USING ((SELECT public.has_role(auth.uid(), 'admin')) OR (SELECT public.has_role(auth.uid(), 'superadmin')));


-- 5.3: CorreÃ§Ãµes Estritas de Performance
-- Fixing Admin can manage chat config on chat_conversas_config
DROP POLICY IF EXISTS "Admin can manage chat config" ON public.chat_conversas_config;
CREATE POLICY "Admin can manage chat config" ON public.chat_conversas_config FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage chat labels on chat_marcadores
DROP POLICY IF EXISTS "Admin can manage chat labels" ON public.chat_marcadores;
CREATE POLICY "Admin can manage chat labels" ON public.chat_marcadores FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage form fields on campos_inscricao
DROP POLICY IF EXISTS "Admin can manage form fields" ON public.campos_inscricao;
CREATE POLICY "Admin can manage form fields" ON public.campos_inscricao FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can view field history on campos_inscricao_historico
DROP POLICY IF EXISTS "Admin can view field history" ON public.campos_inscricao_historico;
CREATE POLICY "Admin can view field history" ON public.campos_inscricao_historico FOR SELECT TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage conversation labels on chat_conversa_marcadores
DROP POLICY IF EXISTS "Admin can manage conversation labels" ON public.chat_conversa_marcadores;
CREATE POLICY "Admin can manage conversation labels" ON public.chat_conversa_marcadores FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage director bindings on diretor_cmei_vinculo
DROP POLICY IF EXISTS "Admin can manage director bindings" ON public.diretor_cmei_vinculo;
CREATE POLICY "Admin can manage director bindings" ON public.diretor_cmei_vinculo FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage CMEIs on cmeis
DROP POLICY IF EXISTS "Admin can manage CMEIs" ON public.cmeis;
CREATE POLICY "Admin can manage CMEIs" ON public.cmeis FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can update configurations on configuracoes_sistema
DROP POLICY IF EXISTS "Admin can update configurations" ON public.configuracoes_sistema;
CREATE POLICY "Admin can update configurations" ON public.configuracoes_sistema FOR UPDATE TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admins can read all configurations on configuracoes_sistema
DROP POLICY IF EXISTS "Admins can read all configurations" ON public.configuracoes_sistema;
CREATE POLICY "Admins can read all configurations" ON public.configuracoes_sistema FOR SELECT TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage child priorities on crianca_prioridades
DROP POLICY IF EXISTS "Admin can manage child priorities" ON public.crianca_prioridades;
CREATE POLICY "Admin can manage child priorities" ON public.crianca_prioridades FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage all documents on documentos_crianca
DROP POLICY IF EXISTS "Admin can manage all documents" ON public.documentos_crianca;
CREATE POLICY "Admin can manage all documents" ON public.documentos_crianca FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage holidays on feriados_municipais
DROP POLICY IF EXISTS "Admin can manage holidays" ON public.feriados_municipais;
CREATE POLICY "Admin can manage holidays" ON public.feriados_municipais FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage all children on criancas
DROP POLICY IF EXISTS "Admin can manage all children" ON public.criancas;
CREATE POLICY "Admin can manage all children" ON public.criancas FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Responsavel can view own children on criancas
DROP POLICY IF EXISTS "Responsavel can view own children" ON public.criancas;
CREATE POLICY "Responsavel can view own children" ON public.criancas FOR SELECT TO public USING (((( SELECT auth.uid() AS uid) = responsavel_user_id) OR ( SELECT ( SELECT is_admin((SELECT auth.uid())) AS is_admin) AS is_admin)));

-- Fixing Admin can manage all chat messages on chat_mensagens
DROP POLICY IF EXISTS "Admin can manage all chat messages" ON public.chat_mensagens;
CREATE POLICY "Admin can manage all chat messages" ON public.chat_mensagens FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage quick replies on chat_respostas_rapidas
DROP POLICY IF EXISTS "Admin can manage quick replies" ON public.chat_respostas_rapidas;
CREATE POLICY "Admin can manage quick replies" ON public.chat_respostas_rapidas FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage reasons on motivos_padrao
DROP POLICY IF EXISTS "Admin can manage reasons" ON public.motivos_padrao;
CREATE POLICY "Admin can manage reasons" ON public.motivos_padrao FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can insert notification logs on notificacoes_log
DROP POLICY IF EXISTS "Admin can insert notification logs" ON public.notificacoes_log;
CREATE POLICY "Admin can insert notification logs" ON public.notificacoes_log FOR INSERT TO public WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can view all notification logs on notificacoes_log
DROP POLICY IF EXISTS "Admin can view all notification logs" ON public.notificacoes_log;
CREATE POLICY "Admin can view all notification logs" ON public.notificacoes_log FOR SELECT TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage priority types on tipos_prioridade
DROP POLICY IF EXISTS "Admin can manage priority types" ON public.tipos_prioridade;
CREATE POLICY "Admin can manage priority types" ON public.tipos_prioridade FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage transition planning on planejamento_transicao
DROP POLICY IF EXISTS "Admin can manage transition planning" ON public.planejamento_transicao;
CREATE POLICY "Admin can manage transition planning" ON public.planejamento_transicao FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage templates on templates_mensagens
DROP POLICY IF EXISTS "Admin can manage templates" ON public.templates_mensagens;
CREATE POLICY "Admin can manage templates" ON public.templates_mensagens FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Superadmin can manage tutorials on tutoriais_videos
DROP POLICY IF EXISTS "Superadmin can manage tutorials" ON public.tutoriais_videos;
CREATE POLICY "Superadmin can manage tutorials" ON public.tutoriais_videos FOR ALL TO public USING (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role)) WITH CHECK (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role));

-- Fixing Admin delete zones on zonas_atendimento
DROP POLICY IF EXISTS "Admin delete zones" ON public.zonas_atendimento;
CREATE POLICY "Admin delete zones" ON public.zonas_atendimento FOR DELETE TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin update zones on zonas_atendimento
DROP POLICY IF EXISTS "Admin update zones" ON public.zonas_atendimento;
CREATE POLICY "Admin update zones" ON public.zonas_atendimento FOR UPDATE TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin write zones on zonas_atendimento
DROP POLICY IF EXISTS "Admin write zones" ON public.zonas_atendimento;
CREATE POLICY "Admin write zones" ON public.zonas_atendimento FOR INSERT TO public WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin delete custom values on valores_campos_custom
DROP POLICY IF EXISTS "Admin delete custom values" ON public.valores_campos_custom;
CREATE POLICY "Admin delete custom values" ON public.valores_campos_custom FOR DELETE TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin update custom values on valores_campos_custom
DROP POLICY IF EXISTS "Admin update custom values" ON public.valores_campos_custom;
CREATE POLICY "Admin update custom values" ON public.valores_campos_custom FOR UPDATE TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Superadmin delete tips on tutorial_dicas
DROP POLICY IF EXISTS "Superadmin delete tips" ON public.tutorial_dicas;
CREATE POLICY "Superadmin delete tips" ON public.tutorial_dicas FOR DELETE TO public USING (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role));

-- Fixing Superadmin update tips on tutorial_dicas
DROP POLICY IF EXISTS "Superadmin update tips" ON public.tutorial_dicas;
CREATE POLICY "Superadmin update tips" ON public.tutorial_dicas FOR UPDATE TO public USING (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role)) WITH CHECK (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role));

-- Fixing Superadmin write tips on tutorial_dicas
DROP POLICY IF EXISTS "Superadmin write tips" ON public.tutorial_dicas;
CREATE POLICY "Superadmin write tips" ON public.tutorial_dicas FOR INSERT TO public WITH CHECK (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role));

-- Fixing Admin can manage cmei zones on cmei_zonas
DROP POLICY IF EXISTS "Admin can manage cmei zones" ON public.cmei_zonas;
CREATE POLICY "Admin can manage cmei zones" ON public.cmei_zonas FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage document types on documentos_tipos
DROP POLICY IF EXISTS "Admin can manage document types" ON public.documentos_tipos;
CREATE POLICY "Admin can manage document types" ON public.documentos_tipos FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage status messages on mensagens_status_custom
DROP POLICY IF EXISTS "Admin can manage status messages" ON public.mensagens_status_custom;
CREATE POLICY "Admin can manage status messages" ON public.mensagens_status_custom FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage turmas on turmas
DROP POLICY IF EXISTS "Admin can manage turmas" ON public.turmas;
CREATE POLICY "Admin can manage turmas" ON public.turmas FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage base classes on turmas_base
DROP POLICY IF EXISTS "Admin can manage base classes" ON public.turmas_base;
CREATE POLICY "Admin can manage base classes" ON public.turmas_base FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Superadmin delete FAQs on tutorial_faq
DROP POLICY IF EXISTS "Superadmin delete FAQs" ON public.tutorial_faq;
CREATE POLICY "Superadmin delete FAQs" ON public.tutorial_faq FOR DELETE TO public USING (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role));

-- Fixing Superadmin update FAQs on tutorial_faq
DROP POLICY IF EXISTS "Superadmin update FAQs" ON public.tutorial_faq;
CREATE POLICY "Superadmin update FAQs" ON public.tutorial_faq FOR UPDATE TO public USING (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role)) WITH CHECK (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role));

-- Fixing Superadmin write FAQs on tutorial_faq
DROP POLICY IF EXISTS "Superadmin write FAQs" ON public.tutorial_faq;
CREATE POLICY "Superadmin write FAQs" ON public.tutorial_faq FOR INSERT TO public WITH CHECK (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role));

-- Fixing Superadmin delete tutorial sections on tutorial_secoes
DROP POLICY IF EXISTS "Superadmin delete tutorial sections" ON public.tutorial_secoes;
CREATE POLICY "Superadmin delete tutorial sections" ON public.tutorial_secoes FOR DELETE TO public USING (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role));

-- Fixing Superadmin update tutorial sections on tutorial_secoes
DROP POLICY IF EXISTS "Superadmin update tutorial sections" ON public.tutorial_secoes;
CREATE POLICY "Superadmin update tutorial sections" ON public.tutorial_secoes FOR UPDATE TO public USING (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role)) WITH CHECK (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role));

-- Fixing Superadmin write tutorial sections on tutorial_secoes
DROP POLICY IF EXISTS "Superadmin write tutorial sections" ON public.tutorial_secoes;
CREATE POLICY "Superadmin write tutorial sections" ON public.tutorial_secoes FOR INSERT TO public WITH CHECK (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role));


-- =============================================================================
-- PARTE 6: ÃNDICES DE PERFORMANCE
-- =============================================================================

-- 6.1: Ãndices BÃ¡sicos de Performance
-- =============================================================================
-- VAGOU - Índices de Performance Recomendados
-- =============================================================================
-- Baseado na análise das políticas RLS e chaves estrangeiras
-- =============================================================================

-- 1. Índices para RLS de Responsáveis (crítico para performance do dashboard dos pais)
CREATE INDEX IF NOT EXISTS idx_criancas_responsavel_user_id ON public.criancas(responsavel_user_id);

-- 2. Índices para Joins de Tabelas Relacionadas à Criança
-- Usados frequentemente em subqueries de RLS (EXISTS ...)
CREATE INDEX IF NOT EXISTS idx_historico_crianca_id ON public.historico(crianca_id);
CREATE INDEX IF NOT EXISTS idx_documentos_crianca_crianca_id ON public.documentos_crianca(crianca_id);
CREATE INDEX IF NOT EXISTS idx_crianca_prioridades_crianca_id ON public.crianca_prioridades(crianca_id);
CREATE INDEX IF NOT EXISTS idx_valores_campos_custom_crianca_id ON public.valores_campos_custom(crianca_id);

-- 3. Índices para Consultas Públicas e Listagens (filtragem por status/ativo)
CREATE INDEX IF NOT EXISTS idx_cmeis_ativo ON public.cmeis(ativo);
CREATE INDEX IF NOT EXISTS idx_turmas_ativo ON public.turmas(ativo);
CREATE INDEX IF NOT EXISTS idx_criancas_status ON public.criancas(status);

-- 4. Índices para Chaves Estrangeiras (evita table scans em deletes e joins)
CREATE INDEX IF NOT EXISTS idx_criancas_cmei_atual ON public.criancas(cmei_atual_id);
CREATE INDEX IF NOT EXISTS idx_criancas_turma_atual ON public.criancas(turma_atual_id);
CREATE INDEX IF NOT EXISTS idx_turmas_cmei_id ON public.turmas(cmei_id);


-- 6.2: Ãndices Faltantes em Foreign Keys
-- Fix 15 Unindexed Foreign Keys

CREATE INDEX IF NOT EXISTS idx_campos_inscricao_historico_campo_id ON public.campos_inscricao_historico(campo_id);

CREATE INDEX IF NOT EXISTS idx_criancas_cmei1_preferencia ON public.criancas(cmei1_preferencia);
CREATE INDEX IF NOT EXISTS idx_criancas_cmei2_preferencia ON public.criancas(cmei2_preferencia);
CREATE INDEX IF NOT EXISTS idx_criancas_cmei_atual_id ON public.criancas(cmei_atual_id);
CREATE INDEX IF NOT EXISTS idx_criancas_cmei_remanejamento_id ON public.criancas(cmei_remanejamento_id);
CREATE INDEX IF NOT EXISTS idx_criancas_turma_atual_id ON public.criancas(turma_atual_id);

CREATE INDEX IF NOT EXISTS idx_historico_cmei_anterior ON public.historico(cmei_anterior);
CREATE INDEX IF NOT EXISTS idx_historico_cmei_novo ON public.historico(cmei_novo);
CREATE INDEX IF NOT EXISTS idx_historico_crianca_id ON public.historico(crianca_id);
CREATE INDEX IF NOT EXISTS idx_historico_turma_anterior ON public.historico(turma_anterior);
CREATE INDEX IF NOT EXISTS idx_historico_turma_novo ON public.historico(turma_novo);

CREATE INDEX IF NOT EXISTS idx_planejamento_transicao_cmei_destino_id ON public.planejamento_transicao(cmei_destino_id);
CREATE INDEX IF NOT EXISTS idx_planejamento_transicao_turma_destino_id ON public.planejamento_transicao(turma_destino_id);

CREATE INDEX IF NOT EXISTS idx_tipos_prioridade_documento_tipo_id ON public.tipos_prioridade(documento_tipo_id);

CREATE INDEX IF NOT EXISTS idx_turmas_cmei_id ON public.turmas(cmei_id);


-- =============================================================================
-- PARTE 7: OTIMIZAÃ‡ÃƒO DO QUERY PLANNER
-- =============================================================================
-- Atualizar estatÃ­sticas do banco para melhor performance
ANALYZE public.criancas;
ANALYZE public.historico;
ANALYZE public.documentos_crianca;
ANALYZE public.crianca_prioridades;
ANALYZE public.cmeis;
ANALYZE public.turmas;
ANALYZE public.profiles;
ANALYZE public.user_roles;


-- =============================================================================
-- PARTE 8: VALIDAÃ‡ÃƒO FINAL
-- =============================================================================
-- =============================================================================
-- VAGOU - Validação Completa do Setup
-- =============================================================================
-- Execute este script APÓS todos os outros scripts de setup para validar
-- que tudo foi configurado corretamente.
-- =============================================================================

DO $$
DECLARE
  v_success text[] := '{}';
  v_warnings text[] := '{}';
  v_errors text[] := '{}';
  v_info text[] := '{}';
  
  -- Contadores
  v_count integer;
  v_expected integer;
  v_missing text;
  
  -- Verificações de extensões
  v_uuid_ossp boolean;
  v_pg_cron boolean;
  v_pg_net boolean;
  
  -- Tabelas esperadas
  v_expected_tables text[] := ARRAY[
    'criancas', 'cmeis', 'turmas', 'turmas_base', 'historico',
    'profiles', 'user_roles', 'configuracoes_sistema',
    'notificacoes_log', 'templates_mensagens', 'documentos_crianca',
    'documentos_tipos', 'tipos_prioridade', 'crianca_prioridades',
    'chat_mensagens', 'chat_marcadores', 'chat_conversa_marcadores',
    'chat_conversas_config', 'chat_respostas_rapidas',
    'motivos_padrao', 'permissoes', 'role_permissoes',
    'campos_inscricao', 'campos_inscricao_historico',
    'zonas_atendimento', 'cmei_zonas', 'valores_campos_custom',
    'feriados_municipais', 'planejamento_transicao',
    'auditoria', 'rate_limit_entries', 'diretor_cmei_vinculo',
    'mensagens_status_custom', 'tutoriais_videos', 'tutorial_secoes',
    'tutorial_faq', 'tutorial_dicas'
  ];
  
  -- Funções esperadas
  v_expected_functions text[] := ARRAY[
    'has_role', 'is_admin', 'has_permission', 'handle_new_user',
    'update_updated_at_column', 'recalcular_posicoes_fila',
    'trigger_atualizar_posicao_fila', 'validar_cpf',
    'inserir_inscricao_publica', 'consulta_publica_por_cpf',
    'verificar_duplicidade_inscricao', 'get_fila_publica',
    'get_historico_fila_publico', 'get_ocupacao_cmeis',
    'get_ocupacao_turmas', 'get_public_configuracoes',
    'cleanup_old_rate_limits', 'link_children_by_cpf',
    'get_user_cmei_ids', 'director_has_cmei_access',
    'registrar_auditoria', 'audit_trigger_function',
    'check_turma_can_deactivate', 'registrar_historico_campos_inscricao'
  ];
  
  -- Triggers esperados
  v_expected_triggers text[] := ARRAY[
    'on_auth_user_created',
    'trigger_recalcular_fila',
    'update_criancas_updated_at',
    'update_cmeis_updated_at',
    'update_turmas_updated_at',
    'update_profiles_updated_at',
    'update_configuracoes_sistema_updated_at',
    'check_turma_deactivate',
    'trigger_historico_campos_inscricao'
  ];
  
  -- ENUMs esperados
  v_expected_enums text[] := ARRAY[
    'app_role', 'status_crianca', 'prioridade_tipo', 'sexo_tipo'
  ];
  
  -- Tabelas para Realtime
  v_realtime_tables text[] := ARRAY[
    'criancas', 'historico', 'chat_mensagens', 'notificacoes_log',
    'configuracoes_sistema', 'auditoria', 'turmas', 'cmeis',
    'documentos_crianca', 'crianca_prioridades'
  ];
  
  tbl text;
  func text;
  trig text;
  enum_name text;
  
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║           VAGOU - VALIDAÇÃO COMPLETA DO SETUP                ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';

  -- =========================================================================
  -- 1. VERIFICAR EXTENSÕES
  -- =========================================================================
  RAISE NOTICE '📦 VERIFICANDO EXTENSÕES...';
  
  SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') INTO v_uuid_ossp;
  SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') INTO v_pg_cron;
  SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_net') INTO v_pg_net;
  
  IF v_uuid_ossp THEN
    v_success := array_append(v_success, 'Extensão uuid-ossp habilitada');
  ELSE
    v_errors := array_append(v_errors, 'Extensão uuid-ossp NÃO habilitada (CRÍTICO)');
  END IF;
  
  IF v_pg_cron THEN
    v_success := array_append(v_success, 'Extensão pg_cron habilitada');
  ELSE
    v_warnings := array_append(v_warnings, 'Extensão pg_cron NÃO habilitada (necessária para automação)');
  END IF;
  
  IF v_pg_net THEN
    v_success := array_append(v_success, 'Extensão pg_net habilitada');
  ELSE
    v_warnings := array_append(v_warnings, 'Extensão pg_net NÃO habilitada (necessária para webhooks em cron)');
  END IF;

  -- =========================================================================
  -- 2. VERIFICAR TABELAS
  -- =========================================================================
  RAISE NOTICE '📋 VERIFICANDO TABELAS...';
  
  v_missing := '';
  FOREACH tbl IN ARRAY v_expected_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      v_missing := v_missing || tbl || ', ';
    END IF;
  END LOOP;
  
  SELECT COUNT(*) INTO v_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  
  IF v_missing = '' THEN
    v_success := array_append(v_success, format('Todas as %s tabelas esperadas existem', array_length(v_expected_tables, 1)));
  ELSE
    v_errors := array_append(v_errors, 'Tabelas faltando: ' || rtrim(v_missing, ', '));
  END IF;
  
  v_info := array_append(v_info, format('Total de tabelas no schema public: %s', v_count));

  -- =========================================================================
  -- 3. VERIFICAR FUNÇÕES
  -- =========================================================================
  RAISE NOTICE '⚙️ VERIFICANDO FUNÇÕES...';
  
  v_missing := '';
  FOREACH func IN ARRAY v_expected_functions
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = func
    ) THEN
      v_missing := v_missing || func || ', ';
    END IF;
  END LOOP;
  
  SELECT COUNT(DISTINCT p.proname) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public';
  
  IF v_missing = '' THEN
    v_success := array_append(v_success, format('Todas as %s funções esperadas existem', array_length(v_expected_functions, 1)));
  ELSE
    v_errors := array_append(v_errors, 'Funções faltando: ' || rtrim(v_missing, ', '));
  END IF;
  
  v_info := array_append(v_info, format('Total de funções no schema public: %s', v_count));

  -- =========================================================================
  -- 4. VERIFICAR TRIGGERS
  -- =========================================================================
  RAISE NOTICE '🔔 VERIFICANDO TRIGGERS...';
  
  v_missing := '';
  FOREACH trig IN ARRAY v_expected_triggers
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      WHERE t.tgname = trig
    ) THEN
      v_missing := v_missing || trig || ', ';
    END IF;
  END LOOP;
  
  SELECT COUNT(*) INTO v_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND NOT t.tgisinternal;
  
  IF v_missing = '' THEN
    v_success := array_append(v_success, format('Todos os %s triggers esperados existem', array_length(v_expected_triggers, 1)));
  ELSE
    v_warnings := array_append(v_warnings, 'Triggers faltando: ' || rtrim(v_missing, ', '));
  END IF;
  
  -- Verificar trigger crítico de auth
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    v_success := array_append(v_success, 'Trigger on_auth_user_created (auth.users) configurado');
  ELSE
    v_errors := array_append(v_errors, 'Trigger on_auth_user_created NÃO existe (CRÍTICO - usuários não terão profile/role)');
  END IF;
  
  v_info := array_append(v_info, format('Total de triggers: %s', v_count));

  -- =========================================================================
  -- 5. VERIFICAR ENUMs
  -- =========================================================================
  RAISE NOTICE '🏷️ VERIFICANDO ENUMs...';
  
  v_missing := '';
  FOREACH enum_name IN ARRAY v_expected_enums
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname = 'public' AND t.typname = enum_name AND t.typtype = 'e'
    ) THEN
      v_missing := v_missing || enum_name || ', ';
    END IF;
  END LOOP;
  
  IF v_missing = '' THEN
    v_success := array_append(v_success, format('Todos os %s ENUMs esperados existem', array_length(v_expected_enums, 1)));
  ELSE
    v_errors := array_append(v_errors, 'ENUMs faltando: ' || rtrim(v_missing, ', '));
  END IF;
  
  -- Verificar valor 'Remanejamento' no ENUM prioridade_tipo
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public' AND t.typname = 'prioridade_tipo' AND e.enumlabel = 'Remanejamento'
  ) THEN
    v_success := array_append(v_success, 'ENUM prioridade_tipo contém valor Remanejamento');
  ELSE
    v_warnings := array_append(v_warnings, 'ENUM prioridade_tipo NÃO contém valor Remanejamento (pode causar erros)');
  END IF;

  -- =========================================================================
  -- 6. VERIFICAR RLS
  -- =========================================================================
  RAISE NOTICE '🔒 VERIFICANDO ROW LEVEL SECURITY...';
  
  SELECT COUNT(*) INTO v_count
  FROM pg_tables t
  WHERE t.schemaname = 'public'
    AND NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public' AND c.relname = t.tablename AND c.relrowsecurity = true
    );
  
  IF v_count = 0 THEN
    v_success := array_append(v_success, 'RLS habilitado em todas as tabelas');
  ELSE
    v_warnings := array_append(v_warnings, format('%s tabelas sem RLS habilitado', v_count));
  END IF;
  
  SELECT COUNT(*) INTO v_count FROM pg_policies WHERE schemaname = 'public';
  v_info := array_append(v_info, format('Total de políticas RLS: %s', v_count));

  -- =========================================================================
  -- 7. VERIFICAR DADOS INICIAIS
  -- =========================================================================
  RAISE NOTICE '📊 VERIFICANDO DADOS INICIAIS...';
  
  -- Configurações do sistema
  SELECT COUNT(*) INTO v_count FROM configuracoes_sistema;
  IF v_count > 0 THEN
    v_success := array_append(v_success, 'Configurações do sistema inseridas');
  ELSE
    v_errors := array_append(v_errors, 'Configurações do sistema NÃO inseridas');
  END IF;
  
  -- Turmas base
  SELECT COUNT(*) INTO v_count FROM turmas_base;
  IF v_count >= 4 THEN
    v_success := array_append(v_success, format('Turmas base inseridas (%s)', v_count));
  ELSE
    v_warnings := array_append(v_warnings, format('Apenas %s turmas base (esperado >= 4)', v_count));
  END IF;
  
  -- Tipos de documento
  SELECT COUNT(*) INTO v_count FROM documentos_tipos;
  IF v_count >= 3 THEN
    v_success := array_append(v_success, format('Tipos de documento inseridos (%s)', v_count));
  ELSE
    v_warnings := array_append(v_warnings, format('Apenas %s tipos de documento (esperado >= 3)', v_count));
  END IF;
  
  -- Tipos de prioridade
  SELECT COUNT(*) INTO v_count FROM tipos_prioridade;
  IF v_count >= 2 THEN
    v_success := array_append(v_success, format('Tipos de prioridade inseridos (%s)', v_count));
  ELSE
    v_warnings := array_append(v_warnings, format('Apenas %s tipos de prioridade (esperado >= 2)', v_count));
  END IF;
  
  -- Templates de mensagem
  SELECT COUNT(*) INTO v_count FROM templates_mensagens;
  IF v_count >= 5 THEN
    v_success := array_append(v_success, format('Templates de mensagem inseridos (%s)', v_count));
  ELSE
    v_warnings := array_append(v_warnings, format('Apenas %s templates (esperado >= 5)', v_count));
  END IF;
  
  -- Permissões
  SELECT COUNT(*) INTO v_count FROM permissoes;
  IF v_count >= 34 THEN
    v_success := array_append(v_success, format('Permissões inseridas (%s)', v_count));
  ELSIF v_count >= 10 THEN
    v_warnings := array_append(v_warnings, format('Permissões parciais (%s de 34 esperadas)', v_count));
  ELSE
    v_errors := array_append(v_errors, format('Apenas %s permissões (esperado >= 34)', v_count));
  END IF;
  
  -- Verificar permissões específicas de remanejamento
  IF EXISTS (SELECT 1 FROM permissoes WHERE codigo = 'remanejamento.aprovar') THEN
    v_success := array_append(v_success, 'Permissões de remanejamento configuradas');
  ELSE
    v_warnings := array_append(v_warnings, 'Permissões de remanejamento faltando (remanejamento.aprovar, etc)');
  END IF;
  
  -- Campos de inscrição
  SELECT COUNT(*) INTO v_count FROM campos_inscricao;
  IF v_count >= 10 THEN
    v_success := array_append(v_success, format('Campos de inscrição inseridos (%s)', v_count));
  ELSE
    v_warnings := array_append(v_warnings, format('Apenas %s campos de inscrição (esperado >= 10)', v_count));
  END IF;

  -- =========================================================================
  -- 8. VERIFICAR CRON JOBS (se pg_cron habilitado)
  -- =========================================================================
  RAISE NOTICE '⏰ VERIFICANDO CRON JOBS...';
  
  IF v_pg_cron THEN
    -- Verificar job de verificação de prazos
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'verificar-prazos-diario') THEN
      v_success := array_append(v_success, 'Cron job verificar-prazos-diario configurado');
    ELSE
      v_warnings := array_append(v_warnings, 'Cron job verificar-prazos-diario NÃO configurado');
    END IF;
    
    -- Verificar job de limpeza de rate limits (CRÍTICO!)
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'limpar-rate-limits-hora') THEN
      v_success := array_append(v_success, 'Cron job limpar-rate-limits-hora configurado');
    ELSE
      v_errors := array_append(v_errors, 'Cron job limpar-rate-limits-hora NÃO configurado (CRÍTICO - tabela rate_limit_entries crescerá indefinidamente)');
    END IF;
    
    SELECT COUNT(*) INTO v_count FROM cron.job;
    v_info := array_append(v_info, format('Total de cron jobs: %s', v_count));
  ELSE
    v_info := array_append(v_info, 'pg_cron não habilitado - verificação de cron jobs ignorada');
  END IF;

  -- =========================================================================
  -- 9. VERIFICAR REALTIME
  -- =========================================================================
  RAISE NOTICE '📡 VERIFICANDO REALTIME...';
  
  v_missing := '';
  FOREACH tbl IN ARRAY v_realtime_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
    ) THEN
      v_missing := v_missing || tbl || ', ';
    END IF;
  END LOOP;
  
  SELECT COUNT(*) INTO v_count
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime' AND schemaname = 'public';
  
  IF v_missing = '' THEN
    v_success := array_append(v_success, format('Todas as %s tabelas de Realtime configuradas', array_length(v_realtime_tables, 1)));
  ELSE
    v_warnings := array_append(v_warnings, 'Tabelas faltando no Realtime: ' || rtrim(v_missing, ', '));
  END IF;
  
  v_info := array_append(v_info, format('Total de tabelas no Realtime: %s', v_count));

  -- =========================================================================
  -- 10. VERIFICAR SUPER ADMIN
  -- =========================================================================
  RAISE NOTICE '👑 VERIFICANDO SUPER ADMIN...';
  
  IF EXISTS (SELECT 1 FROM user_roles WHERE role = 'superadmin') THEN
    v_success := array_append(v_success, 'Super admin configurado');
  ELSE
    v_warnings := array_append(v_warnings, 'Nenhum super admin configurado (execute script 05)');
  END IF;

  -- =========================================================================
  -- 11. VERIFICAR CONFIGURAÇÕES DO MUNICÍPIO
  -- =========================================================================
  RAISE NOTICE '🏛️ VERIFICANDO CONFIGURAÇÕES DO MUNICÍPIO...';
  
  IF EXISTS (
    SELECT 1 FROM configuracoes_sistema 
    WHERE nome_municipio IS NOT NULL AND nome_municipio != 'Município'
  ) THEN
    v_success := array_append(v_success, 'Nome do município configurado');
  ELSE
    v_warnings := array_append(v_warnings, 'Nome do município não personalizado');
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM configuracoes_sistema 
    WHERE brasao_url IS NOT NULL AND brasao_url != ''
  ) THEN
    v_success := array_append(v_success, 'Brasão do município configurado');
  ELSE
    v_info := array_append(v_info, 'Brasão do município não configurado (opcional)');
  END IF;

  -- =========================================================================
  -- RELATÓRIO FINAL
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════════════';
  RAISE NOTICE '                      RELATÓRIO FINAL';
  RAISE NOTICE '══════════════════════════════════════════════════════════════';
  
  -- Sucessos
  IF array_length(v_success, 1) > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SUCESSO (%s itens):', array_length(v_success, 1);
    FOR i IN 1..array_length(v_success, 1) LOOP
      RAISE NOTICE '   • %', v_success[i];
    END LOOP;
  END IF;
  
  -- Warnings
  IF array_length(v_warnings, 1) > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ AVISOS (%s itens):', array_length(v_warnings, 1);
    FOR i IN 1..array_length(v_warnings, 1) LOOP
      RAISE NOTICE '   • %', v_warnings[i];
    END LOOP;
  END IF;
  
  -- Erros
  IF array_length(v_errors, 1) > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ ERROS (%s itens):', array_length(v_errors, 1);
    FOR i IN 1..array_length(v_errors, 1) LOOP
      RAISE NOTICE '   • %', v_errors[i];
    END LOOP;
  END IF;
  
  -- Info
  IF array_length(v_info, 1) > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE 'ℹ️ INFORMAÇÕES:';
    FOR i IN 1..array_length(v_info, 1) LOOP
      RAISE NOTICE '   • %', v_info[i];
    END LOOP;
  END IF;
  
  -- Status geral
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════════════';
  
  IF array_length(v_errors, 1) > 0 THEN
    RAISE NOTICE '🔴 STATUS: FALHOU - Corrija os erros acima antes de prosseguir';
  ELSIF array_length(v_warnings, 1) > 0 THEN
    RAISE NOTICE '🟡 STATUS: PARCIAL - Sistema funcional, mas revise os avisos';
  ELSE
    RAISE NOTICE '🟢 STATUS: SUCESSO - Todas as verificações passaram!';
  END IF;
  
  RAISE NOTICE '══════════════════════════════════════════════════════════════';
  
  -- Próximos passos se houver problemas
  IF array_length(v_errors, 1) > 0 OR array_length(v_warnings, 1) > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '📋 PRÓXIMOS PASSOS:';
    
    IF NOT v_pg_cron THEN
      RAISE NOTICE '   1. Habilite pg_cron: Dashboard > Database > Extensions';
    END IF;
    
    IF NOT v_pg_net THEN
      RAISE NOTICE '   2. Habilite pg_net: Dashboard > Database > Extensions';
    END IF;
    
    IF v_pg_cron AND NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'limpar-rate-limits-hora') THEN
      RAISE NOTICE '   3. Configure cron jobs: Execute PARTE 4 do script 04-setup-automacao.sql';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM user_roles WHERE role = 'superadmin') THEN
      RAISE NOTICE '   4. Crie super admin: Execute script 05-setup-superadmin.sql';
    END IF;
  END IF;
  
  RAISE NOTICE '';
END $$;

-- =============================================================================
-- VERIFICAÇÃO ADICIONAL: STORAGE BUCKETS
-- =============================================================================

SELECT 
  '📦 STORAGE BUCKETS' as categoria,
  COUNT(*) as total,
  string_agg(name, ', ') as buckets
FROM storage.buckets;

-- Verificar buckets esperados
SELECT 
  CASE 
    WHEN COUNT(*) >= 5 THEN '✅ Buckets de storage configurados corretamente (5/5)'
    WHEN COUNT(*) >= 4 THEN '⚠️ Buckets parciais: ' || COUNT(*)::text || '/5 (falta chat-arquivos?)'
    ELSE '❌ Faltam buckets: esperado 5, encontrado ' || COUNT(*)::text
  END as status_buckets
FROM storage.buckets
WHERE name IN ('brasoes', 'avatars', 'assets', 'documentos', 'chat-arquivos');

-- Listar buckets existentes vs esperados
SELECT 
  name as bucket_existente,
  CASE WHEN name IN ('brasoes', 'avatars', 'assets', 'documentos', 'chat-arquivos') 
       THEN '✅ Esperado' ELSE '➕ Extra' END as status
FROM storage.buckets
ORDER BY name;

-- =============================================================================
-- RESUMO DE OBJETOS CRIADOS
-- =============================================================================

SELECT '📊 RESUMO FINAL' as titulo;

SELECT 
  'Tabelas' as tipo,
  COUNT(*) as quantidade
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
  'Funções' as tipo,
  COUNT(DISTINCT proname) as quantidade
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'

UNION ALL

SELECT 
  'Triggers' as tipo,
  COUNT(*) as quantidade
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname IN ('public', 'auth') AND NOT t.tgisinternal

UNION ALL

SELECT 
  'Tabelas com RLS' as tipo,
  COUNT(*) as quantidade
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = true

UNION ALL

SELECT 
  'Políticas RLS' as tipo,
  COUNT(*) as quantidade
FROM pg_policies
WHERE schemaname = 'public';




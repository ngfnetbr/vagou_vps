-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('responsavel', 'gestor', 'admin', 'superadmin', 'diretor_cmei');
  ELSE
    -- Ensure expected enum labels exist (upgrade-friendly)
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'app_role' AND e.enumlabel = 'diretor_cmei'
    ) THEN
      ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'diretor_cmei';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_crianca') THEN
    CREATE TYPE status_crianca AS ENUM (
      'Fila de Espera',
      'Convocado',
      'Matriculado',
      'Matriculada',
      'Recusada',
      'Desistente',
      'Remanejamento Solicitado',
      'Concluinte'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sexo_tipo') THEN
    CREATE TYPE sexo_tipo AS ENUM ('Masculino', 'Feminino');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prioridade_tipo') THEN
    CREATE TYPE prioridade_tipo AS ENUM ('Social', 'Geral');
  END IF;
END $$;

-- Profiles table for user roles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role DEFAULT 'responsavel',
  nome_completo TEXT,
  cpf TEXT UNIQUE,
  email TEXT,
  telefone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Upgrade path for older municipalities that already have profiles without role
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role app_role DEFAULT 'responsavel';

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
CREATE POLICY "Admin can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'gestor')
    )
  );

-- System configurations table
CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read configurations" ON public.configuracoes_sistema;
CREATE POLICY "Anyone can read configurations"
  ON public.configuracoes_sistema FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin can update configurations" ON public.configuracoes_sistema;
CREATE POLICY "Admin can update configurations"
  ON public.configuracoes_sistema FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- CMEIs table
CREATE TABLE IF NOT EXISTS public.cmeis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  endereco TEXT,
  bairro TEXT,
  telefone TEXT,
  email TEXT,
  capacidade_total INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.cmeis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active CMEIs" ON public.cmeis;
CREATE POLICY "Anyone can view active CMEIs"
  ON public.cmeis FOR SELECT
  USING (ativo = true);

DROP POLICY IF EXISTS "Admin can manage CMEIs" ON public.cmeis;
CREATE POLICY "Admin can manage CMEIs"
  ON public.cmeis FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'gestor')
    )
  );

-- Turmas table
CREATE TABLE IF NOT EXISTS public.turmas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cmei_id UUID REFERENCES public.cmeis(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  turma_base TEXT NOT NULL, -- Infantil 0, 1, 2, 3
  capacidade INTEGER DEFAULT 0,
  idade_minima INTEGER, -- em meses
  idade_maxima INTEGER, -- em meses
  turno TEXT, -- Matutino, Vespertino, Integral
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active turmas" ON public.turmas;
CREATE POLICY "Anyone can view active turmas"
  ON public.turmas FOR SELECT
  USING (ativo = true);

DROP POLICY IF EXISTS "Admin can manage turmas" ON public.turmas;
CREATE POLICY "Admin can manage turmas"
  ON public.turmas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'gestor', 'diretor_cmei')
    )
  );

-- Criancas table (main table for children/inscriptions)
CREATE TABLE IF NOT EXISTS public.criancas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Dados da criança
  nome TEXT NOT NULL,
  data_nascimento DATE NOT NULL,
  cpf_crianca TEXT,
  sexo sexo_tipo NOT NULL,
  certidao_nascimento TEXT,
  
  -- Dados do responsável
  responsavel_user_id UUID REFERENCES auth.users(id),
  responsavel_nome TEXT NOT NULL,
  responsavel_cpf TEXT NOT NULL,
  responsavel_email TEXT,
  responsavel_telefone TEXT NOT NULL,
  responsavel_celular TEXT,
  
  -- Endereço
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  
  -- Preferências
  cmei1_preferencia UUID REFERENCES public.cmeis(id),
  cmei2_preferencia UUID REFERENCES public.cmeis(id),
  aceita_qualquer_cmei BOOLEAN DEFAULT FALSE,
  
  -- Status e fila
  status status_crianca DEFAULT 'Fila de Espera',
  posicao_fila INTEGER,
  prioridade prioridade_tipo DEFAULT 'Geral',
  programas_sociais BOOLEAN DEFAULT FALSE,
  
  -- Vaga atual
  cmei_atual_id UUID REFERENCES public.cmeis(id),
  turma_atual_id UUID REFERENCES public.turmas(id),
  
  -- Convocação
  convocacao_deadline DATE,
  data_convocacao TIMESTAMP WITH TIME ZONE,
  
  -- Penalidades e remanejamento
  data_penalidade TIMESTAMP WITH TIME ZONE,
  cmei_remanejamento_id UUID REFERENCES public.cmeis(id),
  justificativa_remanejamento TEXT,
  
  -- Observações
  observacoes TEXT,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.criancas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert inscriptions" ON public.criancas;
CREATE POLICY "Public can insert inscriptions"
  ON public.criancas FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Responsavel can view own children" ON public.criancas;
CREATE POLICY "Responsavel can view own children"
  ON public.criancas FOR SELECT
  USING (
    auth.uid() = responsavel_user_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'gestor', 'diretor_cmei')
    )
  );

DROP POLICY IF EXISTS "Admin can manage all children" ON public.criancas;
CREATE POLICY "Admin can manage all children"
  ON public.criancas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'gestor', 'diretor_cmei')
    )
  );

-- Historico table
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

ALTER TABLE public.historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Responsavel can view own children history" ON public.historico;
CREATE POLICY "Responsavel can view own children history"
  ON public.historico FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.criancas
      WHERE id = crianca_id AND responsavel_user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'gestor', 'diretor_cmei')
    )
  );

DROP POLICY IF EXISTS "Admin can manage history" ON public.historico;
CREATE POLICY "Admin can manage history"
  ON public.historico FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'gestor')
    )
  );

-- Auditoria table
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

ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admin can view audit logs" ON public.auditoria;
CREATE POLICY "Only admin can view audit logs"
  ON public.auditoria FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_configuracoes_sistema_updated_at ON public.configuracoes_sistema;
CREATE TRIGGER update_configuracoes_sistema_updated_at
  BEFORE UPDATE ON public.configuracoes_sistema
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cmeis_updated_at ON public.cmeis;
CREATE TRIGGER update_cmeis_updated_at
  BEFORE UPDATE ON public.cmeis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_turmas_updated_at ON public.turmas;
CREATE TRIGGER update_turmas_updated_at
  BEFORE UPDATE ON public.turmas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_criancas_updated_at ON public.criancas;
CREATE TRIGGER update_criancas_updated_at
  BEFORE UPDATE ON public.criancas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

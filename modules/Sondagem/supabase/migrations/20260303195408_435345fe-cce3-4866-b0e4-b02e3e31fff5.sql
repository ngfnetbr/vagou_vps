
-- Enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'responsavel');

-- Tabela de roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função has_role (security definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Policy: admins podem ver todos os roles
CREATE POLICY "Admins can manage user_roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Policy: usuários podem ver seu próprio role
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Cache de crianças (dados do sistema externo)
CREATE TABLE public.cache_criancas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  data_nascimento DATE,
  cmei_id TEXT,
  cmei_nome TEXT,
  turma_id TEXT,
  turma_nome TEXT,
  ativo BOOLEAN DEFAULT true,
  dados_json JSONB,
  sincronizado_em TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.cache_criancas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cache_criancas"
  ON public.cache_criancas FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage cache_criancas"
  ON public.cache_criancas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Cache de usuários (dados do sistema externo)
CREATE TABLE public.cache_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  email TEXT,
  cargo TEXT,
  cmei_id TEXT,
  cmei_nome TEXT,
  ativo BOOLEAN DEFAULT true,
  dados_json JSONB,
  sincronizado_em TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.cache_usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cache_usuarios"
  ON public.cache_usuarios FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage cache_usuarios"
  ON public.cache_usuarios FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Níveis de aprendizagem
CREATE TABLE public.niveis_aprendizagem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL CHECK (tipo IN ('escrita', 'producao_texto')),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.niveis_aprendizagem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read niveis"
  ON public.niveis_aprendizagem FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage niveis"
  ON public.niveis_aprendizagem FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Modelos de sondagem
CREATE TABLE public.modelos_sondagem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.modelos_sondagem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read modelos"
  ON public.modelos_sondagem FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and gestores can manage modelos"
  ON public.modelos_sondagem FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

-- Relação modelo <-> níveis
CREATE TABLE public.sondagem_niveis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id UUID REFERENCES public.modelos_sondagem(id) ON DELETE CASCADE NOT NULL,
  nivel_id UUID REFERENCES public.niveis_aprendizagem(id) ON DELETE CASCADE NOT NULL,
  UNIQUE (modelo_id, nivel_id)
);
ALTER TABLE public.sondagem_niveis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sondagem_niveis"
  ON public.sondagem_niveis FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and gestores can manage sondagem_niveis"
  ON public.sondagem_niveis FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

-- Perguntas do modelo
CREATE TABLE public.perguntas_modelo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id UUID REFERENCES public.modelos_sondagem(id) ON DELETE CASCADE NOT NULL,
  texto TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.perguntas_modelo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read perguntas"
  ON public.perguntas_modelo FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and gestores can manage perguntas"
  ON public.perguntas_modelo FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

-- Sondagens (aplicações)
CREATE TABLE public.sondagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id UUID REFERENCES public.modelos_sondagem(id) NOT NULL,
  crianca_id UUID REFERENCES public.cache_criancas(id) NOT NULL,
  aplicador_id UUID REFERENCES auth.users(id) NOT NULL,
  periodo TEXT NOT NULL,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'finalizado')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sondagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sondagens"
  ON public.sondagens FOR SELECT TO authenticated
  USING (aplicador_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Users can insert own sondagens"
  ON public.sondagens FOR INSERT TO authenticated
  WITH CHECK (aplicador_id = auth.uid());

CREATE POLICY "Users can update own sondagens"
  ON public.sondagens FOR UPDATE TO authenticated
  USING (aplicador_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Respostas da sondagem
CREATE TABLE public.respostas_sondagem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sondagem_id UUID REFERENCES public.sondagens(id) ON DELETE CASCADE NOT NULL,
  nivel_id UUID REFERENCES public.niveis_aprendizagem(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.respostas_sondagem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read respostas via sondagem access"
  ON public.respostas_sondagem FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sondagens s
      WHERE s.id = sondagem_id
      AND (s.aplicador_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'))
    )
  );

CREATE POLICY "Users can insert respostas for own sondagens"
  ON public.respostas_sondagem FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sondagens s
      WHERE s.id = sondagem_id AND s.aplicador_id = auth.uid()
    )
  );

CREATE POLICY "Users can update respostas for own sondagens"
  ON public.respostas_sondagem FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sondagens s
      WHERE s.id = sondagem_id AND s.aplicador_id = auth.uid()
    )
  );

-- Logs de sincronização
CREATE TABLE public.logs_sincronizacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sucesso' CHECK (status IN ('sucesso', 'erro', 'parcial')),
  registros_processados INT DEFAULT 0,
  registros_erro INT DEFAULT 0,
  detalhes JSONB,
  executado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.logs_sincronizacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage logs"
  ON public.logs_sincronizacao FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gestores can read logs"
  ON public.logs_sincronizacao FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'gestor'));

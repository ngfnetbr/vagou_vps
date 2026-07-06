
-- Local CMEIs table
CREATE TABLE public.local_cmeis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.local_cmeis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read local_cmeis" ON public.local_cmeis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin and equipe can manage local_cmeis" ON public.local_cmeis FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'equipe_pedagogica'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'equipe_pedagogica'::app_role));

-- Local Turmas table
CREATE TABLE public.local_turmas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cmei_id text,
  cmei_nome text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.local_turmas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read local_turmas" ON public.local_turmas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin and equipe can manage local_turmas" ON public.local_turmas FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'equipe_pedagogica'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'equipe_pedagogica'::app_role));

-- Local Crianças table
CREATE TABLE public.local_criancas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  data_nascimento date,
  turma_id text,
  turma_nome text,
  cmei_id text,
  cmei_nome text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.local_criancas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read local_criancas" ON public.local_criancas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin and equipe can manage local_criancas" ON public.local_criancas FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'equipe_pedagogica'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'equipe_pedagogica'::app_role));

-- Unified View: CMEIs (dedup by nome)
CREATE OR REPLACE VIEW public.view_cmeis_unificado AS
SELECT cmei_id AS id, cmei_nome AS nome, 'cache' AS fonte
FROM public.cache_criancas
WHERE cmei_id IS NOT NULL AND cmei_nome IS NOT NULL AND ativo = true
GROUP BY cmei_id, cmei_nome
UNION ALL
SELECT id::text, nome, 'local' AS fonte
FROM public.local_cmeis
WHERE ativo = true
AND nome NOT IN (
  SELECT DISTINCT cmei_nome FROM public.cache_criancas WHERE cmei_nome IS NOT NULL AND ativo = true
);

-- Unified View: Turmas (dedup by nome+cmei)
CREATE OR REPLACE VIEW public.view_turmas_unificado AS
SELECT turma_id AS id, turma_nome AS nome, cmei_id, cmei_nome, 'cache' AS fonte
FROM public.cache_criancas
WHERE turma_id IS NOT NULL AND turma_nome IS NOT NULL AND ativo = true
GROUP BY turma_id, turma_nome, cmei_id, cmei_nome
UNION ALL
SELECT id::text, nome, cmei_id, cmei_nome, 'local' AS fonte
FROM public.local_turmas
WHERE ativo = true
AND nome NOT IN (
  SELECT DISTINCT turma_nome FROM public.cache_criancas WHERE turma_nome IS NOT NULL AND ativo = true
);

-- Unified View: Crianças (dedup by nome+data_nascimento)
CREATE OR REPLACE VIEW public.view_criancas_unificado AS
SELECT id, nome, data_nascimento, turma_id, turma_nome, cmei_id, cmei_nome, ativo, 'cache' AS fonte
FROM public.cache_criancas
WHERE ativo = true
UNION ALL
SELECT id, nome, data_nascimento, turma_id, turma_nome, cmei_id, cmei_nome, ativo, 'local' AS fonte
FROM public.local_criancas
WHERE ativo = true
AND NOT EXISTS (
  SELECT 1 FROM public.cache_criancas cc
  WHERE cc.nome = local_criancas.nome
  AND cc.ativo = true
  AND (cc.data_nascimento = local_criancas.data_nascimento OR (cc.data_nascimento IS NULL AND local_criancas.data_nascimento IS NULL))
);

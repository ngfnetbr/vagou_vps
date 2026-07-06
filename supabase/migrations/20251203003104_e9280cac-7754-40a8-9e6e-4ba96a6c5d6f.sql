-- Criar tabela de vínculo Diretor ↔ CMEI
CREATE TABLE IF NOT EXISTS public.diretor_cmei_vinculo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cmei_id uuid NOT NULL REFERENCES cmeis(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, cmei_id)
);

-- Enable RLS
ALTER TABLE public.diretor_cmei_vinculo ENABLE ROW LEVEL SECURITY;

-- Policies para diretor_cmei_vinculo
CREATE POLICY "Admin can manage director bindings"
  ON public.diretor_cmei_vinculo
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Directors can view own bindings"
  ON public.diretor_cmei_vinculo
  FOR SELECT
  USING (auth.uid() = user_id);

-- Função para obter CMEIs de um diretor
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

-- Função para verificar se um diretor tem acesso a um CMEI específico
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

-- Adicionar campo para configuração de movimentação automática
ALTER TABLE public.configuracoes_sistema 
ADD COLUMN IF NOT EXISTS mover_automatico_prazo_vencido boolean DEFAULT false;

-- Add cmei_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cmei_id text;

-- Function to get user's cmei_id from profiles
CREATE OR REPLACE FUNCTION public.get_user_cmei_id(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cmei_id FROM public.profiles WHERE id = _user_id
$$;

-- Function to set user cmei by email (admin use, accesses auth.users)
CREATE OR REPLACE FUNCTION public.set_user_cmei_by_email(_email text, _cmei_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  SELECT id INTO _user_id FROM auth.users WHERE email = _email LIMIT 1;
  IF _user_id IS NOT NULL THEN
    UPDATE public.profiles SET cmei_id = _cmei_id WHERE id = _user_id;
  END IF;
END;
$$;

-- Allow admins to update any profile
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Update cache_criancas: coordenadores only see their cmei
DROP POLICY IF EXISTS "Authenticated users can read cache_criancas" ON public.cache_criancas;
CREATE POLICY "Authenticated users can read cache_criancas"
ON public.cache_criancas FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'equipe_pedagogica'::app_role) OR
  has_role(auth.uid(), 'responsavel'::app_role) OR
  (has_role(auth.uid(), 'coordenador'::app_role) AND cmei_id = get_user_cmei_id(auth.uid()))
);

-- Update sondagens SELECT: coordenadores only see sondagens for their cmei's students
DROP POLICY IF EXISTS "Users can read own sondagens" ON public.sondagens;
CREATE POLICY "Users can read own sondagens"
ON public.sondagens FOR SELECT TO authenticated
USING (
  aplicador_id = auth.uid() OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'equipe_pedagogica'::app_role) OR
  (has_role(auth.uid(), 'coordenador'::app_role) AND EXISTS (
    SELECT 1 FROM cache_criancas c WHERE c.id = crianca_id AND c.cmei_id = get_user_cmei_id(auth.uid())
  ))
);

-- Update respostas_sondagem SELECT: add coordenador + equipe_pedagogica access
DROP POLICY IF EXISTS "Users can read respostas via sondagem access" ON public.respostas_sondagem;
CREATE POLICY "Users can read respostas via sondagem access"
ON public.respostas_sondagem FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sondagens s WHERE s.id = respostas_sondagem.sondagem_id AND (
      s.aplicador_id = auth.uid() OR
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'equipe_pedagogica'::app_role) OR
      has_role(auth.uid(), 'coordenador'::app_role)
    )
  )
);

-- Update solicitacoes_sondagem: coordenadores only see their cmei
DROP POLICY IF EXISTS "Coordenadores can read solicitacoes for their school" ON public.solicitacoes_sondagem;
CREATE POLICY "Coordenadores can read solicitacoes for their school"
ON public.solicitacoes_sondagem FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'coordenador'::app_role) AND cmei_id = get_user_cmei_id(auth.uid())
);

DROP POLICY IF EXISTS "Coordenadores can update solicitacoes status" ON public.solicitacoes_sondagem;
CREATE POLICY "Coordenadores can update solicitacoes status"
ON public.solicitacoes_sondagem FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'coordenador'::app_role) AND cmei_id = get_user_cmei_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'coordenador'::app_role) AND cmei_id = get_user_cmei_id(auth.uid())
);

-- Update notificacoes: coordenadores only see notifications for their cmei
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notificacoes;
CREATE POLICY "Users can read own notifications"
ON public.notificacoes FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR
  (cmei_id IS NOT NULL AND has_role(auth.uid(), 'coordenador'::app_role) AND cmei_id = get_user_cmei_id(auth.uid()))
);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notificacoes;
CREATE POLICY "Users can update own notifications"
ON public.notificacoes FOR UPDATE TO authenticated
USING (
  user_id = auth.uid() OR
  (cmei_id IS NOT NULL AND has_role(auth.uid(), 'coordenador'::app_role) AND cmei_id = get_user_cmei_id(auth.uid()))
);

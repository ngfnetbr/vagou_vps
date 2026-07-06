-- Ajusta políticas de RLS para configuracoes_sistema permitir UPDATE/INSERT para perfis administrativos
-- (admin, superadmin, gestor, diretor_cmei) conforme is_admin()

ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read all configurations" ON public.configuracoes_sistema;
DROP POLICY IF EXISTS "Anyone can view system config" ON public.configuracoes_sistema;
DROP POLICY IF EXISTS "Admin can update configurations" ON public.configuracoes_sistema;
DROP POLICY IF EXISTS "Admin can update system config" ON public.configuracoes_sistema;
DROP POLICY IF EXISTS "Admin can insert system config" ON public.configuracoes_sistema;
DROP POLICY IF EXISTS "Admin can insert configurations" ON public.configuracoes_sistema;

CREATE POLICY "Admins can read all configurations"
ON public.configuracoes_sistema
FOR SELECT
USING ((SELECT public.is_admin(auth.uid())));

CREATE POLICY "Admin can update configurations"
ON public.configuracoes_sistema
FOR UPDATE
USING ((SELECT public.is_admin(auth.uid())))
WITH CHECK ((SELECT public.is_admin(auth.uid())));

CREATE POLICY "Admin can insert configurations"
ON public.configuracoes_sistema
FOR INSERT
WITH CHECK ((SELECT public.is_admin(auth.uid())));

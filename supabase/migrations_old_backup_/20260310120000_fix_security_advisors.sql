ALTER VIEW public.curso_progresso_usuario SET (security_invoker = on);
ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Modulos visiveis se curso publicado" ON public.modulos;
CREATE POLICY "Modulos visiveis se curso publicado" ON public.modulos FOR SELECT USING (EXISTS (SELECT 1 FROM public.cursos c WHERE c.id = curso_id AND (c.publicado = true OR public.is_admin(auth.uid()))));
DROP POLICY IF EXISTS "Admins gerenciam modulos" ON public.modulos;
CREATE POLICY "Admins gerenciam modulos" ON public.modulos FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

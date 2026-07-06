-- =============================================================================
-- Restringe cursos/aulas a usuários admin; somente SUPERADMIN gerencia
-- e restringe bucket 'course-videos' (leitura: admin; escrita: superadmin)
-- =============================================================================

-- Cursos: visualizar apenas admins; gerenciamento apenas superadmin
DROP POLICY IF EXISTS "Cursos publicos visíveis para autenticados" ON public.cursos;
DROP POLICY IF EXISTS "Admins gerenciam cursos" ON public.cursos;

CREATE POLICY "Admins podem ver cursos"
  ON public.cursos FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Superadmin gerencia cursos"
  ON public.cursos FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- Aulas: visualizar apenas admins; gerenciamento apenas superadmin
DROP POLICY IF EXISTS "Aulas visíveis se curso publicado" ON public.aulas;
DROP POLICY IF EXISTS "Admins gerenciam aulas" ON public.aulas;

CREATE POLICY "Admins podem ver aulas"
  ON public.aulas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cursos c
      WHERE c.id = curso_id
      AND public.is_admin(auth.uid())
    )
  );

CREATE POLICY "Superadmin gerencia aulas"
  ON public.aulas FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- Progresso: o próprio usuário (admins que assistem) ou qualquer admin pode ler/atualizar
DROP POLICY IF EXISTS "Usuario gerencia seu proprio progresso" ON public.aulas_progresso;

CREATE POLICY "Usuario ou admin gerencia progresso"
  ON public.aulas_progresso FOR ALL
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Storage 'course-videos'
-- Leitura: somente admin; Escrita: apenas superadmin
DROP POLICY IF EXISTS "Autenticados podem ler videos de cursos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem inserir videos de cursos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem atualizar videos de cursos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem deletar videos de cursos" ON storage.objects;

CREATE POLICY "Admin pode ler videos de cursos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-videos' AND public.is_admin(auth.uid()));

CREATE POLICY "Superadmin insere videos de cursos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'course-videos' AND public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmin atualiza videos de cursos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'course-videos' AND public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmin deleta videos de cursos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'course-videos' AND public.has_role(auth.uid(), 'superadmin'));


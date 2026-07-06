-- Permitir que ADMINs gerenciem VagouEAD (cursos, aulas e uploads)

-- Cursos
DROP POLICY IF EXISTS "Superadmin gerencia cursos" ON public.cursos;
DROP POLICY IF EXISTS "Admins gerenciam cursos" ON public.cursos;

CREATE POLICY "Admins gerenciam cursos"
  ON public.cursos FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Aulas
DROP POLICY IF EXISTS "Superadmin gerencia aulas" ON public.aulas;
DROP POLICY IF EXISTS "Admins gerenciam aulas" ON public.aulas;

CREATE POLICY "Admins gerenciam aulas"
  ON public.aulas FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Storage: bucket course-videos (leitura já é admin). Escrita também admin.
DROP POLICY IF EXISTS "Superadmin insere videos de cursos" ON storage.objects;
DROP POLICY IF EXISTS "Superadmin atualiza videos de cursos" ON storage.objects;
DROP POLICY IF EXISTS "Superadmin deleta videos de cursos" ON storage.objects;

DROP POLICY IF EXISTS "Admins podem inserir videos de cursos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem atualizar videos de cursos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem deletar videos de cursos" ON storage.objects;

CREATE POLICY "Admin insere videos de cursos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'course-videos' AND public.is_admin(auth.uid()));

CREATE POLICY "Admin atualiza videos de cursos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'course-videos' AND public.is_admin(auth.uid()));

CREATE POLICY "Admin deleta videos de cursos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'course-videos' AND public.is_admin(auth.uid()));


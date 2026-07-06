-- =============================================================================
-- Cursos e Aulas (Área de Membros) + Bucket de Vídeos
-- =============================================================================
-- Cria as tabelas de cursos, aulas, progresso por usuário e configura o bucket
-- de storage para vídeos dos cursos, com políticas de acesso.
-- =============================================================================

-- 1) TABELAS
CREATE TABLE IF NOT EXISTS public.cursos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  capa_url text,
  publicado boolean NOT NULL DEFAULT false,
  criado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id uuid NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  -- Caminho do arquivo no bucket 'course-videos' (ex: <curso_id>/<aula_id>.mp4)
  video_path text NOT NULL,
  duracao_segundos integer,
  ordem integer NOT NULL DEFAULT 0,
  preview boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aulas_progresso (
  user_id uuid NOT NULL,
  aula_id uuid NOT NULL REFERENCES public.aulas(id) ON DELETE CASCADE,
  concluido boolean NOT NULL DEFAULT false,
  progresso_segundos integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, aula_id)
);

-- 2) ÍNDICES
CREATE INDEX IF NOT EXISTS idx_aulas_curso ON public.aulas(curso_id);
CREATE INDEX IF NOT EXISTS idx_cursos_publicado ON public.cursos(publicado);
CREATE INDEX IF NOT EXISTS idx_progresso_user ON public.aulas_progresso(user_id);

-- 3) TRIGGERS updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cursos_updated_at'
  ) THEN
    CREATE TRIGGER trg_cursos_updated_at
      BEFORE UPDATE ON public.cursos
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_aulas_updated_at'
  ) THEN
    CREATE TRIGGER trg_aulas_updated_at
      BEFORE UPDATE ON public.aulas
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_aulas_progresso_updated_at'
  ) THEN
    CREATE TRIGGER trg_aulas_progresso_updated_at
      BEFORE UPDATE ON public.aulas_progresso
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 4) RLS
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas_progresso ENABLE ROW LEVEL SECURITY;

-- Cursos
DROP POLICY IF EXISTS "Cursos publicos visíveis para autenticados" ON public.cursos;
CREATE POLICY "Cursos publicos visíveis para autenticados"
  ON public.cursos FOR SELECT
  USING (publicado = true OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins gerenciam cursos" ON public.cursos;
CREATE POLICY "Admins gerenciam cursos"
  ON public.cursos FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Aulas
DROP POLICY IF EXISTS "Aulas visíveis se curso publicado" ON public.aulas;
CREATE POLICY "Aulas visíveis se curso publicado"
  ON public.aulas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cursos c
      WHERE c.id = curso_id
        AND (c.publicado = true OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Admins gerenciam aulas" ON public.aulas;
CREATE POLICY "Admins gerenciam aulas"
  ON public.aulas FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Progresso
DROP POLICY IF EXISTS "Usuario gerencia seu proprio progresso" ON public.aulas_progresso;
CREATE POLICY "Usuario gerencia seu proprio progresso"
  ON public.aulas_progresso FOR ALL
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- 5) STORAGE: Bucket para vídeos de cursos
-- Cria bucket se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('course-videos', 'course-videos', false, 524288000, ARRAY['video/mp4', 'video/webm', 'video/ogg'])
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas de acesso:
-- Leitura: qualquer usuário autenticado pode obter leitura (para reprodução via URL assinada)
DROP POLICY IF EXISTS "Autenticados podem ler videos de cursos" ON storage.objects;
CREATE POLICY "Autenticados podem ler videos de cursos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-videos' AND (SELECT auth.uid()) IS NOT NULL);

-- Upload/Update/Delete: apenas administradores
DROP POLICY IF EXISTS "Admins podem inserir videos de cursos" ON storage.objects;
CREATE POLICY "Admins podem inserir videos de cursos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'course-videos' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins podem atualizar videos de cursos" ON storage.objects;
CREATE POLICY "Admins podem atualizar videos de cursos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'course-videos' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins podem deletar videos de cursos" ON storage.objects;
CREATE POLICY "Admins podem deletar videos de cursos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'course-videos' AND public.is_admin(auth.uid()));

-- 6) VIEW opcional para progresso por curso (percentual)
CREATE OR REPLACE VIEW public.curso_progresso_usuario AS
SELECT 
  c.id AS curso_id,
  ap.user_id,
  CASE 
    WHEN COUNT(a.id) = 0 THEN 0::numeric
    ELSE ROUND( (COUNT(*) FILTER (WHERE ap.concluido))::numeric / COUNT(a.id)::numeric * 100, 2)
  END AS percentual
FROM public.cursos c
LEFT JOIN public.aulas a ON a.curso_id = c.id
LEFT JOIN public.aulas_progresso ap ON ap.aula_id = a.id
GROUP BY c.id, ap.user_id;

-- 7) Notas
-- - O front-end deve gerar URLs assinadas para vídeos privados
-- - Uploads devem ser gravados no caminho: <curso_id>/<aula_id>.<ext>
-- - O progresso pode ser atualizado ao clicar "Concluir aula" ou por tempo assistido


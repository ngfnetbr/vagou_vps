-- =============================================================================
-- Módulo de Cursos: Tabela de Módulos
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.modulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id uuid NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Leitura de módulos" ON public.modulos;
CREATE POLICY "Leitura de módulos" ON public.modulos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins gerenciam módulos" ON public.modulos;
CREATE POLICY "Admins gerenciam módulos" ON public.modulos FOR ALL USING (public.is_admin(auth.uid()));

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trg_modulos_updated_at ON public.modulos;
CREATE TRIGGER trg_modulos_updated_at
  BEFORE UPDATE ON public.modulos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

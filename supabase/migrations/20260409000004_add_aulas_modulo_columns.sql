ALTER TABLE public.aulas
ADD COLUMN IF NOT EXISTS modulo_id uuid NULL,
ADD COLUMN IF NOT EXISTS requisito_aula_id uuid NULL,
ADD COLUMN IF NOT EXISTS percentual_minimo integer NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'aulas_modulo_id_fkey'
  ) THEN
    ALTER TABLE public.aulas
      ADD CONSTRAINT aulas_modulo_id_fkey
      FOREIGN KEY (modulo_id)
      REFERENCES public.modulos(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'aulas_requisito_aula_id_fkey'
  ) THEN
    ALTER TABLE public.aulas
      ADD CONSTRAINT aulas_requisito_aula_id_fkey
      FOREIGN KEY (requisito_aula_id)
      REFERENCES public.aulas(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_aulas_modulo_id ON public.aulas(modulo_id);
CREATE INDEX IF NOT EXISTS idx_aulas_requisito_aula_id ON public.aulas(requisito_aula_id);


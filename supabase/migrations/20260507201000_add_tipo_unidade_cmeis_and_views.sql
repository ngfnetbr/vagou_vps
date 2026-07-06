ALTER TABLE public.cmeis
  ADD COLUMN IF NOT EXISTS tipo_unidade text NOT NULL DEFAULT 'cmei_creche';

UPDATE public.cmeis
SET tipo_unidade = 'cmei_creche'
WHERE tipo_unidade IS NULL OR tipo_unidade = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cmeis_tipo_unidade_check'
  ) THEN
    ALTER TABLE public.cmeis
      ADD CONSTRAINT cmeis_tipo_unidade_check
      CHECK (tipo_unidade IN ('cmei_creche', 'escola'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'cmeis_tipo_unidade_idx'
  ) THEN
    CREATE INDEX cmeis_tipo_unidade_idx ON public.cmeis (tipo_unidade);
  END IF;
END $$;

CREATE OR REPLACE VIEW public.v_unidades_cmei_creche AS
  SELECT *
  FROM public.cmeis
  WHERE tipo_unidade = 'cmei_creche';

CREATE OR REPLACE VIEW public.v_unidades_escolas AS
  SELECT *
  FROM public.cmeis
  WHERE tipo_unidade = 'escola';

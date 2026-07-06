ALTER TABLE public.cmeis
ADD COLUMN IF NOT EXISTS tipo_gestao text NOT NULL DEFAULT 'municipal';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cmeis_tipo_gestao_check'
  ) THEN
    ALTER TABLE public.cmeis
    ADD CONSTRAINT cmeis_tipo_gestao_check
    CHECK (tipo_gestao IN ('municipal', 'privado'));
  END IF;
END $$;


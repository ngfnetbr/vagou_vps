DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tipos_prioridade_documento_tipo_id_required'
  ) THEN
    ALTER TABLE public.tipos_prioridade
      ADD CONSTRAINT tipos_prioridade_documento_tipo_id_required
      CHECK (exige_documento = false OR documento_tipo_id IS NOT NULL);
  END IF;
END $$;


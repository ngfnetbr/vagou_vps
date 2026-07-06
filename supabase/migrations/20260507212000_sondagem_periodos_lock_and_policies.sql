ALTER TABLE public.periodos
  ADD COLUMN IF NOT EXISTS inicio_em timestamptz,
  ADD COLUMN IF NOT EXISTS fim_em timestamptz,
  ADD COLUMN IF NOT EXISTS fechado_em timestamptz,
  ADD COLUMN IF NOT EXISTS fechado_por uuid REFERENCES auth.users(id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'periodos_fim_em_idx'
  ) THEN
    CREATE INDEX periodos_fim_em_idx ON public.periodos (fim_em);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_periodo_aberto(_codigo text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.periodos p
    WHERE p.codigo = _codigo
      AND p.ativo = true
      AND p.fechado_em IS NULL
      AND (p.inicio_em IS NULL OR now() >= p.inicio_em)
      AND (p.fim_em IS NULL OR now() < p.fim_em)
  );
$$;

DROP POLICY IF EXISTS "Users can insert own sondagens" ON public.sondagens;
CREATE POLICY "Users can insert own sondagens"
  ON public.sondagens FOR INSERT TO authenticated
  WITH CHECK (
    public.is_periodo_aberto(periodo)
    AND (aplicador_id = auth.uid() OR public.is_admin(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can manage own sondagens" ON public.sondagens;
CREATE POLICY "Users can manage own sondagens"
  ON public.sondagens FOR ALL TO authenticated
  USING (
    public.is_periodo_aberto(periodo)
    AND (aplicador_id = auth.uid() OR public.is_admin(auth.uid()))
  )
  WITH CHECK (
    public.is_periodo_aberto(periodo)
    AND (aplicador_id = auth.uid() OR public.is_admin(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can insert respostas for own sondagens" ON public.respostas_sondagem;
CREATE POLICY "Users can insert respostas for own sondagens"
  ON public.respostas_sondagem FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sondagens s
      WHERE s.id = respostas_sondagem.sondagem_id
        AND public.is_periodo_aberto(s.periodo)
        AND (s.aplicador_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can manage respostas for own sondagens" ON public.respostas_sondagem;
CREATE POLICY "Users can manage respostas for own sondagens"
  ON public.respostas_sondagem FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sondagens s
      WHERE s.id = respostas_sondagem.sondagem_id
        AND public.is_periodo_aberto(s.periodo)
        AND (s.aplicador_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sondagens s
      WHERE s.id = respostas_sondagem.sondagem_id
        AND public.is_periodo_aberto(s.periodo)
        AND (s.aplicador_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

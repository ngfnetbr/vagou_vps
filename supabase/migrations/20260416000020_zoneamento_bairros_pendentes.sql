CREATE OR REPLACE FUNCTION public.normalize_key(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(lower(trim(coalesce(value, ''))), '\s+', ' ', 'g')
$$;

CREATE OR REPLACE FUNCTION public.normalize_cep(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(coalesce(value, ''), '\D', '', 'g')
$$;

CREATE TABLE IF NOT EXISTS public.zoneamento_bairros_pendentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  bairro text NOT NULL,
  bairro_key text NOT NULL,
  cep text NULL,
  cep_key text NOT NULL DEFAULT '',
  cidade text NULL,
  cidade_key text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT '',
  origem text NOT NULL DEFAULT 'public',
  vezes integer NOT NULL DEFAULT 1,
  crianca_id uuid NULL REFERENCES public.criancas(id) ON DELETE SET NULL,
  resolved_at timestamptz NULL,
  resolved_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_zona_id uuid NULL REFERENCES public.zonas_atendimento(id) ON DELETE SET NULL
);

ALTER TABLE public.zoneamento_bairros_pendentes
  DROP CONSTRAINT IF EXISTS zoneamento_bairros_pendentes_unique;

ALTER TABLE public.zoneamento_bairros_pendentes
  ADD CONSTRAINT zoneamento_bairros_pendentes_unique UNIQUE (bairro_key, cidade_key, estado);

CREATE INDEX IF NOT EXISTS zoneamento_bairros_pendentes_open_idx
  ON public.zoneamento_bairros_pendentes (last_seen_at DESC)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS zoneamento_bairros_pendentes_vezes_idx
  ON public.zoneamento_bairros_pendentes (vezes DESC, last_seen_at DESC);

ALTER TABLE public.zoneamento_bairros_pendentes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view zoneamento bairros pendentes" ON public.zoneamento_bairros_pendentes;
CREATE POLICY "Admin can view zoneamento bairros pendentes"
  ON public.zoneamento_bairros_pendentes
  FOR SELECT
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin can update zoneamento bairros pendentes" ON public.zoneamento_bairros_pendentes;
CREATE POLICY "Admin can update zoneamento bairros pendentes"
  ON public.zoneamento_bairros_pendentes
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin can delete zoneamento bairros pendentes" ON public.zoneamento_bairros_pendentes;
CREATE POLICY "Admin can delete zoneamento bairros pendentes"
  ON public.zoneamento_bairros_pendentes
  FOR DELETE
  USING (is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.report_bairro_nao_mapeado(
  p_bairro text,
  p_cep text DEFAULT NULL,
  p_cidade text DEFAULT NULL,
  p_estado text DEFAULT NULL,
  p_origem text DEFAULT 'public',
  p_crianca_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_bairro text;
  v_bairro_key text;
  v_cidade text;
  v_cidade_key text;
  v_estado text;
  v_cep text;
  v_cep_key text;
BEGIN
  v_bairro := trim(coalesce(p_bairro, ''));
  IF v_bairro = '' THEN
    RETURN;
  END IF;

  v_bairro_key := public.normalize_key(v_bairro);
  v_cidade := NULLIF(trim(coalesce(p_cidade, '')), '');
  v_cidade_key := public.normalize_key(coalesce(v_cidade, ''));
  v_estado := upper(trim(coalesce(p_estado, '')));
  v_cep := NULLIF(trim(coalesce(p_cep, '')), '');
  v_cep_key := public.normalize_cep(coalesce(v_cep, ''));

  INSERT INTO public.zoneamento_bairros_pendentes (
    bairro,
    bairro_key,
    cep,
    cep_key,
    cidade,
    cidade_key,
    estado,
    origem,
    vezes,
    last_seen_at,
    crianca_id
  ) VALUES (
    v_bairro,
    v_bairro_key,
    v_cep,
    v_cep_key,
    v_cidade,
    v_cidade_key,
    v_estado,
    coalesce(NULLIF(trim(coalesce(p_origem, '')), ''), 'public'),
    1,
    now(),
    p_crianca_id
  )
  ON CONFLICT (bairro_key, cidade_key, estado) DO UPDATE
  SET
    vezes = public.zoneamento_bairros_pendentes.vezes + 1,
    last_seen_at = now(),
    cep = coalesce(excluded.cep, public.zoneamento_bairros_pendentes.cep),
    cep_key = coalesce(NULLIF(excluded.cep_key, ''), public.zoneamento_bairros_pendentes.cep_key),
    cidade = coalesce(excluded.cidade, public.zoneamento_bairros_pendentes.cidade),
    origem = excluded.origem,
    crianca_id = coalesce(excluded.crianca_id, public.zoneamento_bairros_pendentes.crianca_id),
    resolved_at = NULL,
    resolved_by = NULL,
    resolved_zona_id = NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_bairro_nao_mapeado(text, text, text, text, text, uuid) TO anon, authenticated;


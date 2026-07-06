CREATE OR REPLACE FUNCTION public.bi_normalize_text(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(regexp_replace(trim(coalesce(p_value, '')), '\s+', ' ', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.bi_clean_cep(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(coalesce(p_value, ''), '\D', '', 'g');
$$;

CREATE OR REPLACE FUNCTION public.bi_get_turno_campo_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT ci.id
  FROM public.campos_inscricao ci
  WHERE ci.ativo = true
    AND ci.nome_campo IN ('periodo', 'turno')
  ORDER BY
    CASE ci.nome_campo
      WHEN 'periodo' THEN 0
      WHEN 'turno' THEN 1
      ELSE 9
    END,
    ci.updated_at DESC NULLS LAST
  LIMIT 1;
$$;

CREATE OR REPLACE VIEW public.bi_criancas_dim
AS
SELECT
  c.id AS crianca_id,
  c.created_at,
  c.status::text AS status,
  c.bairro,
  public.bi_normalize_text(c.bairro) AS bairro_norm,
  c.cep,
  public.bi_clean_cep(c.cep) AS cep_digits,
  c.cmei1_preferencia,
  c.cmei2_preferencia,
  c.cmei3_preferencia,
  c.cmei_atual_id,
  c.zona_atendimento_id,
  t.turno_raw,
  public.bi_normalize_text(t.turno_raw) AS turno_norm
FROM public.criancas c
LEFT JOIN LATERAL (
  SELECT v.valor AS turno_raw
  FROM public.valores_campos_custom v
  WHERE v.crianca_id = c.id
    AND v.campo_id = public.bi_get_turno_campo_id()
  LIMIT 1
) t ON true;

CREATE OR REPLACE VIEW public.bi_criancas_zonas
AS
SELECT
  d.crianca_id,
  z.id AS zona_id
FROM public.bi_criancas_dim d
JOIN public.zonas_atendimento z
  ON z.ativo = true
WHERE
  (
    d.zona_atendimento_id IS NOT NULL
    AND z.id = d.zona_atendimento_id
  )
  OR
  (
    d.zona_atendimento_id IS NULL
    AND (
      (
        d.bairro_norm <> ''
        AND z.bairros IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM unnest(z.bairros) zb(bairro)
          WHERE public.bi_normalize_text(zb.bairro) = d.bairro_norm
        )
      )
      OR
      (
        d.cep_digits <> ''
        AND z.ceps IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM unnest(z.ceps) zc(cep)
          WHERE d.cep_digits LIKE public.bi_clean_cep(zc.cep) || '%'
        )
      )
    )
  );

CREATE OR REPLACE FUNCTION public.bi_filtrar_criancas(
  p_inicio timestamptz DEFAULT NULL,
  p_statuses text[] DEFAULT NULL,
  p_zona_id uuid DEFAULT NULL,
  p_apenas_sem_zona boolean DEFAULT false,
  p_bairro text DEFAULT NULL,
  p_turno text DEFAULT NULL,
  p_apenas_sem_turno boolean DEFAULT false,
  p_cmei_id uuid DEFAULT NULL
)
RETURNS TABLE (
  crianca_id uuid,
  created_at timestamptz,
  status text,
  bairro text,
  bairro_norm text,
  cep text,
  cep_digits text,
  cmei1_preferencia uuid,
  cmei2_preferencia uuid,
  cmei3_preferencia uuid,
  cmei_atual_id uuid,
  zona_atendimento_id uuid,
  turno_raw text,
  turno_norm text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT d.*
    FROM public.bi_criancas_dim d
    WHERE
      (p_inicio IS NULL OR d.created_at >= p_inicio)
      AND (p_statuses IS NULL OR d.status = ANY(p_statuses))
      AND (p_bairro IS NULL OR d.bairro_norm LIKE '%' || public.bi_normalize_text(p_bairro) || '%')
      AND (
        p_cmei_id IS NULL
        OR p_cmei_id = d.cmei_atual_id
        OR p_cmei_id = d.cmei1_preferencia
        OR p_cmei_id = d.cmei2_preferencia
        OR p_cmei_id = d.cmei3_preferencia
      )
      AND (
        NOT p_apenas_sem_turno
        OR d.turno_norm = ''
      )
      AND (
        p_turno IS NULL
        OR d.turno_norm = public.bi_normalize_text(p_turno)
      )
      AND (SELECT is_admin(auth.uid()))
  ),
  zoned AS (
    SELECT bz.crianca_id
    FROM public.bi_criancas_zonas bz
    GROUP BY bz.crianca_id
  )
  SELECT b.*
  FROM base b
  LEFT JOIN zoned z ON z.crianca_id = b.crianca_id
  WHERE
    (
      p_zona_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.bi_criancas_zonas bz
        WHERE bz.crianca_id = b.crianca_id
          AND bz.zona_id = p_zona_id
      )
    )
    AND (
      NOT p_apenas_sem_zona
      OR z.crianca_id IS NULL
    );
$$;

CREATE OR REPLACE FUNCTION public.bi_get_novas_inscricoes_mensal(
  p_inicio timestamptz DEFAULT NULL,
  p_statuses text[] DEFAULT NULL,
  p_zona_id uuid DEFAULT NULL,
  p_apenas_sem_zona boolean DEFAULT false,
  p_bairro text DEFAULT NULL,
  p_turno text DEFAULT NULL,
  p_apenas_sem_turno boolean DEFAULT false,
  p_cmei_id uuid DEFAULT NULL
)
RETURNS TABLE (
  mes timestamptz,
  quantidade integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH meses AS (
    SELECT generate_series(
      date_trunc('month', now()) - interval '11 months',
      date_trunc('month', now()),
      interval '1 month'
    ) AS mes_inicio
  ),
  f AS (
    SELECT *
    FROM public.bi_filtrar_criancas(
      p_inicio,
      p_statuses,
      p_zona_id,
      p_apenas_sem_zona,
      p_bairro,
      p_turno,
      p_apenas_sem_turno,
      p_cmei_id
    )
  )
  SELECT
    m.mes_inicio AS mes,
    COALESCE(count(f.crianca_id), 0)::int AS quantidade
  FROM meses m
  LEFT JOIN f
    ON f.created_at >= m.mes_inicio
    AND f.created_at < (m.mes_inicio + interval '1 month')
  GROUP BY m.mes_inicio
  ORDER BY m.mes_inicio ASC;
$$;

CREATE OR REPLACE FUNCTION public.bi_get_status_distribuicao(
  p_inicio timestamptz DEFAULT NULL,
  p_statuses text[] DEFAULT NULL,
  p_zona_id uuid DEFAULT NULL,
  p_apenas_sem_zona boolean DEFAULT false,
  p_bairro text DEFAULT NULL,
  p_turno text DEFAULT NULL,
  p_apenas_sem_turno boolean DEFAULT false,
  p_cmei_id uuid DEFAULT NULL
)
RETURNS TABLE (
  status text,
  quantidade integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH f AS (
    SELECT *
    FROM public.bi_filtrar_criancas(
      p_inicio,
      p_statuses,
      p_zona_id,
      p_apenas_sem_zona,
      p_bairro,
      p_turno,
      p_apenas_sem_turno,
      p_cmei_id
    )
  )
  SELECT
    COALESCE(NULLIF(trim(f.status), ''), 'Sem status') AS status,
    count(*)::int AS quantidade
  FROM f
  GROUP BY 1
  ORDER BY quantidade DESC;
$$;

CREATE OR REPLACE FUNCTION public.bi_get_demanda_por_bairro(
  p_inicio timestamptz DEFAULT NULL,
  p_statuses text[] DEFAULT NULL,
  p_zona_id uuid DEFAULT NULL,
  p_apenas_sem_zona boolean DEFAULT false,
  p_bairro text DEFAULT NULL,
  p_turno text DEFAULT NULL,
  p_apenas_sem_turno boolean DEFAULT false,
  p_cmei_id uuid DEFAULT NULL
)
RETURNS TABLE (
  bairro text,
  quantidade integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH f AS (
    SELECT *
    FROM public.bi_filtrar_criancas(
      p_inicio,
      p_statuses,
      p_zona_id,
      p_apenas_sem_zona,
      p_bairro,
      p_turno,
      p_apenas_sem_turno,
      p_cmei_id
    )
  )
  SELECT
    CASE WHEN f.bairro_norm = '' THEN '__sem_bairro__' ELSE f.bairro_norm END AS bairro,
    count(*)::int AS quantidade
  FROM f
  GROUP BY 1
  ORDER BY quantidade DESC;
$$;

CREATE OR REPLACE FUNCTION public.bi_get_demanda_por_turno(
  p_inicio timestamptz DEFAULT NULL,
  p_statuses text[] DEFAULT NULL,
  p_zona_id uuid DEFAULT NULL,
  p_apenas_sem_zona boolean DEFAULT false,
  p_bairro text DEFAULT NULL,
  p_turno text DEFAULT NULL,
  p_apenas_sem_turno boolean DEFAULT false,
  p_cmei_id uuid DEFAULT NULL
)
RETURNS TABLE (
  turno text,
  quantidade integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH f AS (
    SELECT *
    FROM public.bi_filtrar_criancas(
      p_inicio,
      p_statuses,
      p_zona_id,
      p_apenas_sem_zona,
      p_bairro,
      p_turno,
      p_apenas_sem_turno,
      p_cmei_id
    )
  )
  SELECT
    CASE WHEN f.turno_norm = '' THEN '__sem_periodo__' ELSE f.turno_norm END AS turno,
    count(*)::int AS quantidade
  FROM f
  GROUP BY 1
  ORDER BY quantidade DESC;
$$;

CREATE OR REPLACE FUNCTION public.bi_get_demanda_por_zona(
  p_inicio timestamptz DEFAULT NULL,
  p_statuses text[] DEFAULT NULL,
  p_zona_id uuid DEFAULT NULL,
  p_apenas_sem_zona boolean DEFAULT false,
  p_bairro text DEFAULT NULL,
  p_turno text DEFAULT NULL,
  p_apenas_sem_turno boolean DEFAULT false,
  p_cmei_id uuid DEFAULT NULL
)
RETURNS TABLE (
  zona_key text,
  zona_id uuid,
  nome text,
  cor text,
  quantidade integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH f AS (
    SELECT *
    FROM public.bi_filtrar_criancas(
      p_inicio,
      p_statuses,
      p_zona_id,
      p_apenas_sem_zona,
      p_bairro,
      p_turno,
      p_apenas_sem_turno,
      p_cmei_id
    )
  ),
  matches AS (
    SELECT bz.zona_id, count(*)::int AS quantidade
    FROM f
    JOIN public.bi_criancas_zonas bz
      ON bz.crianca_id = f.crianca_id
    GROUP BY bz.zona_id
  ),
  sem_zona AS (
    SELECT count(*)::int AS quantidade
    FROM f
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.bi_criancas_zonas bz
      WHERE bz.crianca_id = f.crianca_id
    )
  )
  SELECT
    m.zona_id::text AS zona_key,
    m.zona_id,
    z.nome,
    COALESCE(z.cor, '#64748b') AS cor,
    m.quantidade
  FROM matches m
  JOIN public.zonas_atendimento z ON z.id = m.zona_id
  WHERE z.ativo = true
  UNION ALL
  SELECT
    '__sem_zona__' AS zona_key,
    NULL::uuid AS zona_id,
    'Sem zona' AS nome,
    '#64748b' AS cor,
    s.quantidade
  FROM sem_zona s
  WHERE s.quantidade > 0
  ORDER BY quantidade DESC;
$$;

CREATE OR REPLACE FUNCTION public.bi_get_demanda_por_cmei(
  p_inicio timestamptz DEFAULT NULL,
  p_statuses text[] DEFAULT NULL,
  p_zona_id uuid DEFAULT NULL,
  p_apenas_sem_zona boolean DEFAULT false,
  p_bairro text DEFAULT NULL,
  p_turno text DEFAULT NULL,
  p_apenas_sem_turno boolean DEFAULT false,
  p_cmei_id uuid DEFAULT NULL
)
RETURNS TABLE (
  cmei_id uuid,
  pref1 integer,
  pref2 integer,
  pref3 integer,
  score numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH f AS (
    SELECT *
    FROM public.bi_filtrar_criancas(
      p_inicio,
      p_statuses,
      p_zona_id,
      p_apenas_sem_zona,
      p_bairro,
      p_turno,
      p_apenas_sem_turno,
      p_cmei_id
    )
  ),
  prefs AS (
    SELECT f.cmei1_preferencia AS cmei_id, 1::int AS pref1, 0::int AS pref2, 0::int AS pref3, 2::numeric AS score
    FROM f
    WHERE f.cmei1_preferencia IS NOT NULL
    UNION ALL
    SELECT f.cmei2_preferencia AS cmei_id, 0::int AS pref1, 1::int AS pref2, 0::int AS pref3, 1::numeric AS score
    FROM f
    WHERE f.cmei2_preferencia IS NOT NULL
    UNION ALL
    SELECT f.cmei3_preferencia AS cmei_id, 0::int AS pref1, 0::int AS pref2, 1::int AS pref3, 0.5::numeric AS score
    FROM f
    WHERE f.cmei3_preferencia IS NOT NULL
  )
  SELECT
    p.cmei_id,
    sum(p.pref1)::int AS pref1,
    sum(p.pref2)::int AS pref2,
    sum(p.pref3)::int AS pref3,
    sum(p.score) AS score
  FROM prefs p
  WHERE (p_cmei_id IS NULL OR p.cmei_id = p_cmei_id)
  GROUP BY p.cmei_id
  ORDER BY score DESC;
$$;

CREATE OR REPLACE FUNCTION public.bi_get_media_dias_fila_por_cmei(
  p_inicio timestamptz DEFAULT NULL,
  p_statuses text[] DEFAULT NULL,
  p_zona_id uuid DEFAULT NULL,
  p_apenas_sem_zona boolean DEFAULT false,
  p_bairro text DEFAULT NULL,
  p_turno text DEFAULT NULL,
  p_apenas_sem_turno boolean DEFAULT false,
  p_cmei_id uuid DEFAULT NULL
)
RETURNS TABLE (
  cmei_id uuid,
  quantidade integer,
  media_dias numeric,
  max_dias integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH f AS (
    SELECT *
    FROM public.bi_filtrar_criancas(
      p_inicio,
      p_statuses,
      p_zona_id,
      p_apenas_sem_zona,
      p_bairro,
      p_turno,
      p_apenas_sem_turno,
      p_cmei_id
    )
    WHERE cmei1_preferencia IS NOT NULL
  ),
  calc AS (
    SELECT
      f.cmei1_preferencia AS cmei_id,
      greatest(0, floor(extract(epoch from (now() - f.created_at)) / 86400))::int AS dias
    FROM f
  )
  SELECT
    c.cmei_id,
    count(*)::int AS quantidade,
    round(avg(c.dias::numeric) * 10) / 10 AS media_dias,
    max(c.dias)::int AS max_dias
  FROM calc c
  WHERE (p_cmei_id IS NULL OR c.cmei_id = p_cmei_id)
  GROUP BY c.cmei_id
  ORDER BY media_dias DESC;
$$;

CREATE OR REPLACE FUNCTION public.bi_get_convocados_por_cmei(
  p_inicio timestamptz DEFAULT NULL,
  p_statuses text[] DEFAULT NULL,
  p_zona_id uuid DEFAULT NULL,
  p_apenas_sem_zona boolean DEFAULT false,
  p_bairro text DEFAULT NULL,
  p_turno text DEFAULT NULL,
  p_apenas_sem_turno boolean DEFAULT false,
  p_cmei_id uuid DEFAULT NULL
)
RETURNS TABLE (
  cmei_id uuid,
  quantidade integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH f AS (
    SELECT *
    FROM public.bi_filtrar_criancas(
      p_inicio,
      p_statuses,
      p_zona_id,
      p_apenas_sem_zona,
      p_bairro,
      p_turno,
      p_apenas_sem_turno,
      p_cmei_id
    )
    WHERE cmei1_preferencia IS NOT NULL
  )
  SELECT
    f.cmei1_preferencia AS cmei_id,
    count(*)::int AS quantidade
  FROM f
  WHERE (p_cmei_id IS NULL OR f.cmei1_preferencia = p_cmei_id)
  GROUP BY f.cmei1_preferencia
  ORDER BY quantidade DESC;
$$;

CREATE INDEX IF NOT EXISTS idx_criancas_created_at ON public.criancas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_criancas_status_created_at ON public.criancas(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_criancas_cmei1_preferencia ON public.criancas(cmei1_preferencia) WHERE cmei1_preferencia IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_criancas_cmei2_preferencia ON public.criancas(cmei2_preferencia) WHERE cmei2_preferencia IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_criancas_cmei3_preferencia ON public.criancas(cmei3_preferencia) WHERE cmei3_preferencia IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_criancas_cmei_atual_id ON public.criancas(cmei_atual_id) WHERE cmei_atual_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_criancas_zona_atendimento_id ON public.criancas(zona_atendimento_id) WHERE zona_atendimento_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_criancas_bairro_norm ON public.criancas(public.bi_normalize_text(bairro)) WHERE bairro IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_ocupacao_cmeis()
RETURNS TABLE (
  id uuid,
  nome text,
  endereco text,
  bairro text,
  telefone text,
  email text,
  latitude double precision,
  longitude double precision,
  capacidade_total integer,
  ocupados bigint,
  percentual integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.nome,
    c.endereco,
    c.bairro,
    c.telefone,
    c.email,
    c.latitude,
    c.longitude,
    c.capacidade_total,
    COALESCE(count(cr.id), 0) AS ocupados,
    CASE
      WHEN c.capacidade_total > 0 THEN round((COALESCE(count(cr.id), 0)::numeric / c.capacidade_total::numeric) * 100)::int
      ELSE 0
    END AS percentual
  FROM public.cmeis c
  LEFT JOIN public.criancas cr
    ON cr.cmei_atual_id = c.id
    AND cr.status IN ('Matriculado', 'Matriculada', 'Convocado', 'Aguardando Documentação')
  WHERE c.ativo = true
  GROUP BY c.id
  ORDER BY c.nome;
$$;

CREATE OR REPLACE FUNCTION public.get_ocupacao_turmas()
RETURNS TABLE (
  id uuid,
  nome text,
  turma_base text,
  turno text,
  capacidade integer,
  ocupados bigint,
  percentual integer,
  cmei_id uuid,
  cmei_nome text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.nome,
    t.turma_base,
    t.turno,
    t.capacidade,
    COALESCE(count(cr.id), 0) AS ocupados,
    CASE
      WHEN t.capacidade > 0 THEN round((COALESCE(count(cr.id), 0)::numeric / t.capacidade::numeric) * 100)::int
      ELSE 0
    END AS percentual,
    t.cmei_id,
    COALESCE(c.nome, 'Sem CMEI') AS cmei_nome
  FROM public.turmas t
  LEFT JOIN public.cmeis c ON c.id = t.cmei_id
  LEFT JOIN public.criancas cr
    ON cr.turma_atual_id = t.id
    AND cr.status IN ('Matriculado', 'Matriculada', 'Convocado', 'Aguardando Documentação')
  WHERE t.ativo = true
  GROUP BY t.id, c.nome
  ORDER BY t.turma_base, t.nome;
$$;

GRANT EXECUTE ON FUNCTION public.bi_filtrar_criancas(timestamptz, text[], uuid, boolean, text, text, boolean, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bi_get_novas_inscricoes_mensal(timestamptz, text[], uuid, boolean, text, text, boolean, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bi_get_status_distribuicao(timestamptz, text[], uuid, boolean, text, text, boolean, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bi_get_demanda_por_bairro(timestamptz, text[], uuid, boolean, text, text, boolean, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bi_get_demanda_por_turno(timestamptz, text[], uuid, boolean, text, text, boolean, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bi_get_demanda_por_zona(timestamptz, text[], uuid, boolean, text, text, boolean, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bi_get_demanda_por_cmei(timestamptz, text[], uuid, boolean, text, text, boolean, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bi_get_media_dias_fila_por_cmei(timestamptz, text[], uuid, boolean, text, text, boolean, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bi_get_convocados_por_cmei(timestamptz, text[], uuid, boolean, text, text, boolean, uuid) TO authenticated;

COMMENT ON VIEW public.bi_criancas_dim IS 'Camada analítica (BI): dimensões derivadas para inscrições/crianças com normalizações e turno de interesse.';
COMMENT ON VIEW public.bi_criancas_zonas IS 'Camada analítica (BI): zonas associadas a cada inscrição, usando zona_atendimento_id quando disponível e fallback por bairro/CEP.';
COMMENT ON FUNCTION public.bi_filtrar_criancas IS 'Camada analítica (BI): aplica filtros comuns (período, status, zona, bairro, turno e CMEI) e retorna conjunto base para agregações.';

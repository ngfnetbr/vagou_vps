-- Escopo de acesso do diretor ao próprio CMEI

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'superadmin', 'gestor')
  )
$$;

CREATE OR REPLACE FUNCTION public.director_has_cmei_access(_user_id uuid, _cmei_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.diretor_cmei_vinculo
    WHERE user_id = _user_id AND cmei_id = _cmei_id
  ) OR is_admin(_user_id)
$$;

ALTER TABLE public.diretor_cmei_vinculo
  DROP CONSTRAINT IF EXISTS diretor_cmei_vinculo_user_id_cmei_id_key;

ALTER TABLE public.diretor_cmei_vinculo
  ADD CONSTRAINT diretor_cmei_vinculo_user_id_key UNIQUE (user_id);

DROP POLICY IF EXISTS "View active CMEIs" ON public.cmeis;
CREATE POLICY "View active CMEIs"
  ON public.cmeis
  FOR SELECT
  USING (
    is_admin(auth.uid())
    OR (ativo = true AND NOT has_role(auth.uid(), 'diretor_cmei'))
  );

DROP POLICY IF EXISTS "Director can view own CMEI" ON public.cmeis;
CREATE POLICY "Director can view own CMEI"
  ON public.cmeis
  FOR SELECT
  USING (has_role(auth.uid(), 'diretor_cmei') AND director_has_cmei_access(auth.uid(), id));

DROP POLICY IF EXISTS "View active turmas" ON public.turmas;
CREATE POLICY "View active turmas"
  ON public.turmas
  FOR SELECT
  USING (
    is_admin(auth.uid())
    OR (ativo = true AND NOT has_role(auth.uid(), 'diretor_cmei'))
  );

DROP POLICY IF EXISTS "Director can view turmas of own CMEI" ON public.turmas;
CREATE POLICY "Director can view turmas of own CMEI"
  ON public.turmas
  FOR SELECT
  USING (has_role(auth.uid(), 'diretor_cmei') AND director_has_cmei_access(auth.uid(), cmei_id));

DROP POLICY IF EXISTS "Director can view children of own CMEI" ON public.criancas;
CREATE POLICY "Director can view children of own CMEI"
  ON public.criancas
  FOR SELECT
  USING (
    has_role(auth.uid(), 'diretor_cmei')
    AND (
      director_has_cmei_access(auth.uid(), cmei_atual_id)
      OR director_has_cmei_access(auth.uid(), cmei1_preferencia)
      OR director_has_cmei_access(auth.uid(), cmei2_preferencia)
      OR director_has_cmei_access(auth.uid(), cmei3_preferencia)
      OR director_has_cmei_access(auth.uid(), cmei_remanejamento_id)
    )
  );

DROP POLICY IF EXISTS "Director can view documents of own CMEI" ON public.documentos_crianca;
CREATE POLICY "Director can view documents of own CMEI"
  ON public.documentos_crianca
  FOR SELECT
  USING (
    has_role(auth.uid(), 'diretor_cmei')
    AND EXISTS (
      SELECT 1
      FROM public.criancas cr
      WHERE cr.id = documentos_crianca.crianca_id
        AND (
          director_has_cmei_access(auth.uid(), cr.cmei_atual_id)
          OR director_has_cmei_access(auth.uid(), cr.cmei1_preferencia)
          OR director_has_cmei_access(auth.uid(), cr.cmei2_preferencia)
          OR director_has_cmei_access(auth.uid(), cr.cmei3_preferencia)
          OR director_has_cmei_access(auth.uid(), cr.cmei_remanejamento_id)
        )
    )
  );

DROP POLICY IF EXISTS "Director can update documents of own CMEI" ON public.documentos_crianca;
CREATE POLICY "Director can update documents of own CMEI"
  ON public.documentos_crianca
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'diretor_cmei')
    AND EXISTS (
      SELECT 1
      FROM public.criancas cr
      WHERE cr.id = documentos_crianca.crianca_id
        AND (
          director_has_cmei_access(auth.uid(), cr.cmei_atual_id)
          OR director_has_cmei_access(auth.uid(), cr.cmei1_preferencia)
          OR director_has_cmei_access(auth.uid(), cr.cmei2_preferencia)
          OR director_has_cmei_access(auth.uid(), cr.cmei3_preferencia)
          OR director_has_cmei_access(auth.uid(), cr.cmei_remanejamento_id)
        )
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'diretor_cmei')
    AND EXISTS (
      SELECT 1
      FROM public.criancas cr
      WHERE cr.id = documentos_crianca.crianca_id
        AND (
          director_has_cmei_access(auth.uid(), cr.cmei_atual_id)
          OR director_has_cmei_access(auth.uid(), cr.cmei1_preferencia)
          OR director_has_cmei_access(auth.uid(), cr.cmei2_preferencia)
          OR director_has_cmei_access(auth.uid(), cr.cmei3_preferencia)
          OR director_has_cmei_access(auth.uid(), cr.cmei_remanejamento_id)
        )
    )
  );

DROP POLICY IF EXISTS "Director can view history of own CMEI" ON public.historico;
CREATE POLICY "Director can view history of own CMEI"
  ON public.historico
  FOR SELECT
  USING (
    has_role(auth.uid(), 'diretor_cmei')
    AND (
      director_has_cmei_access(auth.uid(), cmei_anterior)
      OR director_has_cmei_access(auth.uid(), cmei_novo)
      OR EXISTS (
        SELECT 1
        FROM public.criancas cr
        WHERE cr.id = historico.crianca_id
          AND (
            director_has_cmei_access(auth.uid(), cr.cmei_atual_id)
            OR director_has_cmei_access(auth.uid(), cr.cmei1_preferencia)
            OR director_has_cmei_access(auth.uid(), cr.cmei2_preferencia)
            OR director_has_cmei_access(auth.uid(), cr.cmei3_preferencia)
            OR director_has_cmei_access(auth.uid(), cr.cmei_remanejamento_id)
          )
      )
    )
  );

DROP POLICY IF EXISTS "View cmei zones" ON public.cmei_zonas;
CREATE POLICY "View cmei zones"
  ON public.cmei_zonas
  FOR SELECT
  USING (
    is_admin(auth.uid())
    OR (NOT has_role(auth.uid(), 'diretor_cmei'))
    OR (has_role(auth.uid(), 'diretor_cmei') AND director_has_cmei_access(auth.uid(), cmei_id))
  );

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
    COALESCE(
      (SELECT COUNT(*) 
       FROM criancas cr 
       WHERE cr.cmei_atual_id = c.id 
       AND cr.status IN ('Matriculado', 'Matriculada', 'Convocado', 'Aguardando Documentação')
      ), 0
    ) as ocupados,
    CASE 
      WHEN c.capacidade_total > 0 THEN 
        ROUND(
          (COALESCE(
            (SELECT COUNT(*) 
             FROM criancas cr 
             WHERE cr.cmei_atual_id = c.id 
             AND cr.status IN ('Matriculado', 'Matriculada', 'Convocado', 'Aguardando Documentação')
            ), 0
          )::numeric / c.capacidade_total::numeric) * 100
        )::integer
      ELSE 0
    END as percentual
  FROM cmeis c
  WHERE c.ativo = true
    AND (
      auth.uid() IS NULL
      OR NOT has_role(auth.uid(), 'diretor_cmei')
      OR director_has_cmei_access(auth.uid(), c.id)
    )
  ORDER BY c.nome
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
  cmei_nome text,
  idade_minima integer,
  idade_maxima integer
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
    COALESCE(
      (SELECT COUNT(*) 
       FROM criancas cr 
       WHERE cr.turma_atual_id = t.id 
       AND cr.status IN ('Matriculado', 'Matriculada', 'Convocado', 'Aguardando Documentação')
      ), 0
    ) as ocupados,
    CASE 
      WHEN t.capacidade > 0 THEN 
        ROUND(
          (COALESCE(
            (SELECT COUNT(*) 
             FROM criancas cr 
             WHERE cr.turma_atual_id = t.id 
             AND cr.status IN ('Matriculado', 'Matriculada', 'Convocado', 'Aguardando Documentação')
            ), 0
          )::numeric / t.capacidade::numeric) * 100
        )::integer
      ELSE 0
    END as percentual,
    t.cmei_id,
    COALESCE(c.nome, 'Sem CMEI') as cmei_nome,
    t.idade_minima,
    t.idade_maxima
  FROM turmas t
  LEFT JOIN cmeis c ON t.cmei_id = c.id
  WHERE t.ativo = true
    AND (
      auth.uid() IS NULL
      OR NOT has_role(auth.uid(), 'diretor_cmei')
      OR director_has_cmei_access(auth.uid(), t.cmei_id)
    )
  ORDER BY t.turma_base, t.nome
$$;

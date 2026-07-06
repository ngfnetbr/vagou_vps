ALTER TABLE public.criancas
  ADD COLUMN IF NOT EXISTS origem_cadastro text NOT NULL DEFAULT 'vagou',
  ADD COLUMN IF NOT EXISTS modulo_gestor text NOT NULL DEFAULT 'vagou',
  ADD COLUMN IF NOT EXISTS ignorar_automacoes_vagou boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.resolve_linked_school_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT CASE
        WHEN p.cmei_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN p.cmei_id::uuid
        ELSE NULL
      END
      FROM public.profiles p
      WHERE p.id = _user_id
    ),
    (
      SELECT dcv.cmei_id
      FROM public.diretor_cmei_vinculo dcv
      WHERE dcv.user_id = _user_id
      LIMIT 1
    )
  );
$$;

DROP POLICY IF EXISTS "Sondagem coordinators can view own school children" ON public.criancas;
CREATE POLICY "Sondagem coordinators can view own school children"
ON public.criancas
FOR SELECT
TO authenticated
USING (
  has_permission(auth.uid(), 'modulos.sondagem.acessar'::text)
  AND (
    public.has_role(auth.uid(), 'coordenador'::text)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  )
  AND EXISTS (
    SELECT 1
    FROM public.cmeis c
    WHERE c.id = criancas.cmei_atual_id
      AND c.tipo_unidade = 'escola'
  )
  AND (
    public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    OR criancas.cmei_atual_id = public.resolve_linked_school_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "School modules can update school students" ON public.criancas;
CREATE POLICY "School modules can update school students"
ON public.criancas
FOR UPDATE
TO authenticated
USING (
  (
    (
      has_permission(auth.uid(), 'modulos.sam.acessar'::text)
      AND public.has_role(auth.uid(), 'school_coord'::text)
    )
    OR (
      has_permission(auth.uid(), 'modulos.sondagem.acessar'::text)
      AND (
        public.has_role(auth.uid(), 'coordenador'::text)
        OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
      )
    )
  )
  AND EXISTS (
    SELECT 1
    FROM public.cmeis c
    WHERE c.id = criancas.cmei_atual_id
      AND c.tipo_unidade = 'escola'
  )
  AND (
    public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    OR criancas.cmei_atual_id = public.resolve_linked_school_id(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.cmeis c
    WHERE c.id = criancas.cmei_atual_id
      AND c.tipo_unidade = 'escola'
  )
  AND (
    public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    OR criancas.cmei_atual_id = public.resolve_linked_school_id(auth.uid())
  )
  AND coalesce(criancas.ignorar_automacoes_vagou, false) = true
  AND coalesce(criancas.modulo_gestor, 'vagou') <> 'vagou'
);

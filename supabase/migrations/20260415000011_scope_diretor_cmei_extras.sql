-- Pente fino: fechar vazamentos e completar escopo do diretor por CMEI

DROP POLICY IF EXISTS "Public can read profiles" ON public.profiles;

DROP POLICY IF EXISTS "Director can view child priorities of own CMEI" ON public.crianca_prioridades;
CREATE POLICY "Director can view child priorities of own CMEI"
  ON public.crianca_prioridades
  FOR SELECT
  USING (
    has_role(auth.uid(), 'diretor_cmei')
    AND EXISTS (
      SELECT 1
      FROM public.criancas cr
      WHERE cr.id = crianca_prioridades.crianca_id
        AND (
          director_has_cmei_access(auth.uid(), cr.cmei_atual_id)
          OR director_has_cmei_access(auth.uid(), cr.cmei1_preferencia)
          OR director_has_cmei_access(auth.uid(), cr.cmei2_preferencia)
          OR director_has_cmei_access(auth.uid(), cr.cmei3_preferencia)
          OR director_has_cmei_access(auth.uid(), cr.cmei_remanejamento_id)
        )
    )
  );

DROP POLICY IF EXISTS "Director can view custom values of own CMEI" ON public.valores_campos_custom;
CREATE POLICY "Director can view custom values of own CMEI"
  ON public.valores_campos_custom
  FOR SELECT
  USING (
    has_role(auth.uid(), 'diretor_cmei')
    AND EXISTS (
      SELECT 1
      FROM public.criancas cr
      WHERE cr.id = valores_campos_custom.crianca_id
        AND (
          director_has_cmei_access(auth.uid(), cr.cmei_atual_id)
          OR director_has_cmei_access(auth.uid(), cr.cmei1_preferencia)
          OR director_has_cmei_access(auth.uid(), cr.cmei2_preferencia)
          OR director_has_cmei_access(auth.uid(), cr.cmei3_preferencia)
          OR director_has_cmei_access(auth.uid(), cr.cmei_remanejamento_id)
        )
    )
  );

-- Permite diretor aprovar/recusar documentos (apenas do seu CMEI)

DROP POLICY IF EXISTS "Director update documents of own CMEI" ON public.documentos_crianca;
CREATE POLICY "Director update documents of own CMEI"
  ON public.documentos_crianca
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'diretor_cmei')
    AND status IN ('pendente', 'recusado')
    AND EXISTS (
      SELECT 1
      FROM public.criancas cr
      WHERE cr.id = documentos_crianca.crianca_id
        AND cr.status IN ('Convocado', 'Aguardando Documentação')
        AND director_has_cmei_access(auth.uid(), cr.cmei_atual_id)
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'diretor_cmei')
    AND (
      (
        status = 'pendente'
        AND motivo_recusa IS NULL
        AND aprovado_por IS NULL
        AND aprovado_em IS NULL
        AND enviado_por = auth.uid()
      )
      OR (
        status = 'aprovado'
        AND motivo_recusa IS NULL
        AND aprovado_por = auth.uid()
        AND aprovado_em IS NOT NULL
      )
      OR (
        status = 'recusado'
        AND motivo_recusa IS NOT NULL
        AND aprovado_por IS NULL
        AND aprovado_em IS NULL
      )
    )
    AND EXISTS (
      SELECT 1
      FROM public.criancas cr
      WHERE cr.id = documentos_crianca.crianca_id
        AND cr.status IN ('Convocado', 'Aguardando Documentação')
        AND director_has_cmei_access(auth.uid(), cr.cmei_atual_id)
    )
  );

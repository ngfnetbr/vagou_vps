-- Permitir upload de documentos no ato da inscrição pública (usuário anon)
-- Restrição: somente para inscrições recém-criadas (janela curta), sempre como pendente e sem enviado_por.

DROP POLICY IF EXISTS "Public can upload documents for fresh inscription" ON public.documentos_crianca;
CREATE POLICY "Public can upload documents for fresh inscription"
ON public.documentos_crianca
FOR INSERT
TO anon
WITH CHECK (
  status = 'pendente'
  AND enviado_por IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.criancas c
    WHERE c.id = documentos_crianca.crianca_id
      AND c.created_at > now() - interval '1 hour'
  )
);

DROP POLICY IF EXISTS "Public can upload documents for fresh inscription" ON storage.objects;
CREATE POLICY "Public can upload documents for fresh inscription"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'documentos'
  AND name ~ '^[0-9a-fA-F-]{36}/'
  AND EXISTS (
    SELECT 1
    FROM public.criancas c
    WHERE c.id = (substring(name from '^([0-9a-fA-F-]{36})'))::uuid
      AND c.created_at > now() - interval '1 hour'
  )
);

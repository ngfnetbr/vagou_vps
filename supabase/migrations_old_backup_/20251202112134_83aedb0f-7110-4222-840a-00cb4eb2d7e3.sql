-- Criar bucket para brasões
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brasoes',
  'brasoes',
  true,
  524288,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao bucket de brasões
CREATE POLICY "Brasões são públicos para leitura"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'brasoes');

CREATE POLICY "Admins podem fazer upload de brasões"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brasoes' 
  AND (is_admin(auth.uid()))
);

CREATE POLICY "Admins podem deletar brasões"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'brasoes' 
  AND (is_admin(auth.uid()))
);
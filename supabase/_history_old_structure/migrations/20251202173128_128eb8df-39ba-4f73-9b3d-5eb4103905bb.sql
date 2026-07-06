-- Cria bucket 'assets' para ícones e splash screens
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- Política para leitura pública
CREATE POLICY "Public can read assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'assets');

-- Política para admin fazer upload
CREATE POLICY "Admin can upload assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'assets' 
  AND is_admin(auth.uid())
);

-- Política para admin deletar
CREATE POLICY "Admin can delete assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'assets' 
  AND is_admin(auth.uid())
);

-- Política para admin atualizar
CREATE POLICY "Admin can update assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'assets' 
  AND is_admin(auth.uid())
);
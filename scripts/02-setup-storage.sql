-- =============================================================================
-- VAGOU - Setup de Storage Buckets
-- =============================================================================
-- Execute APÓS o script 01-setup-estrutura.sql
-- =============================================================================

-- Criar buckets com limites de segurança
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('brasoes', 'brasoes', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']),
  ('avatars', 'avatars', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']),
  ('assets', 'assets', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/gif']),
  ('documentos', 'documentos', false, 10485760, ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('chat-arquivos', 'chat-arquivos', false, 10485760, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf', 'audio/mpeg', 'audio/ogg', 'video/mp4'])
ON CONFLICT (id) DO UPDATE SET 
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- POLÍTICAS PARA BUCKET: brasoes (público - brasões municipais)
-- =============================================================================
DROP POLICY IF EXISTS "Brasoes are publicly accessible" ON storage.objects;
CREATE POLICY "Brasoes are publicly accessible" ON storage.objects 
  FOR SELECT USING (bucket_id = 'brasoes');

DROP POLICY IF EXISTS "Admins can upload brasoes" ON storage.objects;
CREATE POLICY "Admins can upload brasoes" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'brasoes' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update brasoes" ON storage.objects;
CREATE POLICY "Admins can update brasoes" ON storage.objects 
  FOR UPDATE USING (bucket_id = 'brasoes' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete brasoes" ON storage.objects;
CREATE POLICY "Admins can delete brasoes" ON storage.objects 
  FOR DELETE USING (bucket_id = 'brasoes' AND public.is_admin(auth.uid()));

-- =============================================================================
-- POLÍTICAS PARA BUCKET: avatars (público - fotos de perfil)
-- =============================================================================
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Avatars are publicly accessible" ON storage.objects 
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar" ON storage.objects 
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar" ON storage.objects 
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================================================
-- POLÍTICAS PARA BUCKET: assets (público - imagens gerais do sistema)
-- =============================================================================
DROP POLICY IF EXISTS "Assets are publicly accessible" ON storage.objects;
CREATE POLICY "Assets are publicly accessible" ON storage.objects 
  FOR SELECT USING (bucket_id = 'assets');

DROP POLICY IF EXISTS "Admins can upload assets" ON storage.objects;
CREATE POLICY "Admins can upload assets" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'assets' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update assets" ON storage.objects;
CREATE POLICY "Admins can update assets" ON storage.objects 
  FOR UPDATE USING (bucket_id = 'assets' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete assets" ON storage.objects;
CREATE POLICY "Admins can delete assets" ON storage.objects 
  FOR DELETE USING (bucket_id = 'assets' AND public.is_admin(auth.uid()));

-- =============================================================================
-- POLÍTICAS PARA BUCKET: documentos (privado - documentos de crianças)
-- =============================================================================
DROP POLICY IF EXISTS "Admins can view all documents" ON storage.objects;
CREATE POLICY "Admins can view all documents" ON storage.objects 
  FOR SELECT USING (bucket_id = 'documentos' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Responsaveis can view own children documents" ON storage.objects;
CREATE POLICY "Responsaveis can view own children documents" ON storage.objects 
  FOR SELECT USING (
    bucket_id = 'documentos' 
    AND EXISTS (
      SELECT 1 FROM public.criancas c 
      WHERE c.responsavel_user_id = auth.uid() 
      AND name LIKE c.id::text || '/%'
    )
  );

DROP POLICY IF EXISTS "Responsaveis can upload own children documents" ON storage.objects;
CREATE POLICY "Responsaveis can upload own children documents" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id = 'documentos' 
    AND EXISTS (
      SELECT 1 FROM public.criancas c 
      WHERE c.responsavel_user_id = auth.uid() 
      AND name LIKE c.id::text || '/%'
    )
  );

DROP POLICY IF EXISTS "Admins can upload documents" ON storage.objects;
CREATE POLICY "Admins can upload documents" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'documentos' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update documents" ON storage.objects;
CREATE POLICY "Admins can update documents" ON storage.objects 
  FOR UPDATE USING (bucket_id = 'documentos' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete documents" ON storage.objects;
CREATE POLICY "Admins can delete documents" ON storage.objects 
  FOR DELETE USING (bucket_id = 'documentos' AND public.is_admin(auth.uid()));

-- =============================================================================
-- POLÍTICAS PARA BUCKET: chat-arquivos (privado - arquivos do chat)
-- =============================================================================
DROP POLICY IF EXISTS "Admins can view all chat files" ON storage.objects;
CREATE POLICY "Admins can view all chat files" ON storage.objects 
  FOR SELECT USING (bucket_id = 'chat-arquivos' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Responsaveis can view own chat files" ON storage.objects;
CREATE POLICY "Responsaveis can view own chat files" ON storage.objects 
  FOR SELECT USING (
    bucket_id = 'chat-arquivos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Responsaveis can upload chat files" ON storage.objects;
CREATE POLICY "Responsaveis can upload chat files" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-arquivos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Admins can upload chat files" ON storage.objects;
CREATE POLICY "Admins can upload chat files" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'chat-arquivos' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete chat files" ON storage.objects;
CREATE POLICY "Admins can delete chat files" ON storage.objects 
  FOR DELETE USING (bucket_id = 'chat-arquivos' AND public.is_admin(auth.uid()));

-- =============================================================================
-- VERIFICAÇÃO FINAL
-- =============================================================================
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM storage.buckets WHERE name IN ('brasoes', 'avatars', 'assets', 'documentos', 'chat-arquivos');
  
  IF v_count = 5 THEN
    RAISE NOTICE '✅ Todos os 5 buckets de storage criados com sucesso';
  ELSE
    RAISE NOTICE '⚠️ Apenas % de 5 buckets criados', v_count;
  END IF;
  
  SELECT COUNT(*) INTO v_count FROM pg_policies WHERE schemaname = 'storage';
  RAISE NOTICE 'ℹ️ Total de políticas de storage: %', v_count;
END $$;

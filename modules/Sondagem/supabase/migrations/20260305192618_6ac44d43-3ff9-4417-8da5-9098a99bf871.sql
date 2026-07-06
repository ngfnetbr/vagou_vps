
-- Add arquivo_url column to solicitacoes_sondagem
ALTER TABLE public.solicitacoes_sondagem ADD COLUMN arquivo_url text DEFAULT NULL;

-- Create storage bucket for solicitacao files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'solicitacoes-arquivos',
  'solicitacoes-arquivos',
  false,
  10485760,
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- RLS policies for storage bucket
CREATE POLICY "Authenticated users can upload solicitacao files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'solicitacoes-arquivos');

CREATE POLICY "Authenticated users can read solicitacao files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'solicitacoes-arquivos');

CREATE POLICY "Admins and owners can delete solicitacao files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'solicitacoes-arquivos');

-- 1. Adicionar novo status ao enum status_crianca
ALTER TYPE status_crianca ADD VALUE IF NOT EXISTS 'Aguardando Documentação' AFTER 'Convocado';

-- 2. Criar tabela de tipos de documentos
CREATE TABLE public.documentos_tipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  obrigatorio BOOLEAN DEFAULT true,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documentos_tipos ENABLE ROW LEVEL SECURITY;

-- Policies for documentos_tipos
CREATE POLICY "Anyone can view active document types"
  ON public.documentos_tipos FOR SELECT
  USING (ativo = true);

CREATE POLICY "Admin can manage document types"
  ON public.documentos_tipos FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 3. Criar tabela de documentos das crianças
CREATE TABLE public.documentos_crianca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crianca_id UUID NOT NULL REFERENCES public.criancas(id) ON DELETE CASCADE,
  tipo_documento_id UUID NOT NULL REFERENCES public.documentos_tipos(id) ON DELETE CASCADE,
  arquivo_url TEXT NOT NULL,
  arquivo_nome TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado')),
  motivo_recusa TEXT,
  enviado_por UUID REFERENCES auth.users(id),
  aprovado_por UUID,
  aprovado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(crianca_id, tipo_documento_id)
);

-- Enable RLS
ALTER TABLE public.documentos_crianca ENABLE ROW LEVEL SECURITY;

-- Policies for documentos_crianca
CREATE POLICY "Admin can manage all documents"
  ON public.documentos_crianca FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Responsavel can view own children documents"
  ON public.documentos_crianca FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.criancas
      WHERE criancas.id = documentos_crianca.crianca_id
      AND criancas.responsavel_user_id = auth.uid()
    )
  );

CREATE POLICY "Responsavel can upload documents for own children"
  ON public.documentos_crianca FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.criancas
      WHERE criancas.id = crianca_id
      AND criancas.responsavel_user_id = auth.uid()
    )
  );

CREATE POLICY "Responsavel can update own pending documents"
  ON public.documentos_crianca FOR UPDATE
  USING (
    status = 'pendente' AND
    EXISTS (
      SELECT 1 FROM public.criancas
      WHERE criancas.id = documentos_crianca.crianca_id
      AND criancas.responsavel_user_id = auth.uid()
    )
  );

-- 4. Criar bucket de documentos (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for documentos bucket
CREATE POLICY "Admin can access all documents"
  ON storage.objects FOR ALL
  USING (bucket_id = 'documentos' AND is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'documentos' AND is_admin(auth.uid()));

CREATE POLICY "Responsavel can upload own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documentos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Responsavel can view own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documentos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 5. Trigger para updated_at
CREATE TRIGGER update_documentos_tipos_updated_at
  BEFORE UPDATE ON public.documentos_tipos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documentos_crianca_updated_at
  BEFORE UPDATE ON public.documentos_crianca
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Inserir alguns tipos de documentos padrão
INSERT INTO public.documentos_tipos (nome, descricao, obrigatorio, ordem) VALUES
  ('Certidão de Nascimento', 'Cópia da certidão de nascimento da criança', true, 1),
  ('Comprovante de Residência', 'Conta de luz, água ou telefone recente', true, 2),
  ('CPF do Responsável', 'Cópia do CPF do responsável legal', true, 3),
  ('RG do Responsável', 'Cópia do RG do responsável legal', true, 4),
  ('Cartão de Vacina', 'Carteira de vacinação atualizada', true, 5),
  ('Comprovante de Programa Social', 'Para famílias cadastradas em programas sociais', false, 6);
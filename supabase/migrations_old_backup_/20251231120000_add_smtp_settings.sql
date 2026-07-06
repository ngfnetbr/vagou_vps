-- Adiciona colunas de SMTP na tabela configuracoes_sistema se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'smtp_host') THEN
        ALTER TABLE public.configuracoes_sistema ADD COLUMN smtp_host text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'smtp_port') THEN
        ALTER TABLE public.configuracoes_sistema ADD COLUMN smtp_port integer DEFAULT 587;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'smtp_user') THEN
        ALTER TABLE public.configuracoes_sistema ADD COLUMN smtp_user text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'smtp_password') THEN
        ALTER TABLE public.configuracoes_sistema ADD COLUMN smtp_password text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'smtp_secure') THEN
        ALTER TABLE public.configuracoes_sistema ADD COLUMN smtp_secure boolean DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'smtp_sender_name') THEN
        ALTER TABLE public.configuracoes_sistema ADD COLUMN smtp_sender_name text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'smtp_sender_email') THEN
        ALTER TABLE public.configuracoes_sistema ADD COLUMN smtp_sender_email text;
    END IF;
END $$;

-- Atualiza políticas RLS para configuracoes_sistema
ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view system config" ON public.configuracoes_sistema;
DROP POLICY IF EXISTS "Admin can update system config" ON public.configuracoes_sistema;
DROP POLICY IF EXISTS "Admin can insert system config" ON public.configuracoes_sistema;

CREATE POLICY "Anyone can view system config" ON public.configuracoes_sistema
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can update system config" ON public.configuracoes_sistema
  FOR UPDATE USING (
    (SELECT is_admin(auth.uid()))
  )
  WITH CHECK (
    (SELECT is_admin(auth.uid()))
  );

CREATE POLICY "Admin can insert system config" ON public.configuracoes_sistema
  FOR INSERT WITH CHECK (
    (SELECT is_admin(auth.uid()))
  );

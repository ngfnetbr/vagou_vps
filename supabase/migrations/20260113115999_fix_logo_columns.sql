-- Adiciona colunas de logo na tabela configuracoes_sistema se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'logo_empresa_url') THEN
        ALTER TABLE public.configuracoes_sistema ADD COLUMN logo_empresa_url text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'logo_empresa_link') THEN
        ALTER TABLE public.configuracoes_sistema ADD COLUMN logo_empresa_link text;
    END IF;
END $$;

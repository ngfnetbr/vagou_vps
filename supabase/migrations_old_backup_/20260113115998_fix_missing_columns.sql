-- Fix missing columns in configuracoes_sistema
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'modo_bloqueio_pagamento') THEN
        ALTER TABLE public.configuracoes_sistema ADD COLUMN modo_bloqueio_pagamento boolean DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'mensagem_bloqueio_pagamento') THEN
        ALTER TABLE public.configuracoes_sistema ADD COLUMN mensagem_bloqueio_pagamento text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'demo_ultima_geracao') THEN
        ALTER TABLE public.configuracoes_sistema ADD COLUMN demo_ultima_geracao timestamp with time zone;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracoes_sistema' AND column_name = 'demo_ultimo_reset') THEN
        ALTER TABLE public.configuracoes_sistema ADD COLUMN demo_ultimo_reset timestamp with time zone;
    END IF;
END $$;

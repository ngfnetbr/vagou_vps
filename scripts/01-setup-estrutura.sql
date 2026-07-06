
-- Templates de E-mail
CREATE TABLE IF NOT EXISTS public.templates_email (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  assunto_email TEXT,
  corpo_email TEXT,
  variaveis_disponiveis JSONB DEFAULT '[]'::jsonb,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

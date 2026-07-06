-- Adicionar campos de CAPTCHA nas configurações
ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS captcha_habilitado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS captcha_site_key TEXT,
ADD COLUMN IF NOT EXISTS captcha_secret_key TEXT;

-- Adicionar campos de modo demonstração
ALTER TABLE configuracoes_sistema
ADD COLUMN IF NOT EXISTS modo_demonstracao BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS demo_mensagem TEXT DEFAULT 'Sistema em modo demonstração. Dados podem ser resetados a qualquer momento.',
ADD COLUMN IF NOT EXISTS demo_ultima_geracao TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS demo_ultimo_reset TIMESTAMPTZ;

-- Criar tabela de rate limiting
CREATE TABLE IF NOT EXISTS rate_limit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup ON rate_limit_entries(identifier, endpoint, window_start);

-- Habilitar RLS
ALTER TABLE rate_limit_entries ENABLE ROW LEVEL SECURITY;

-- Permitir que service role gerencie rate limits
CREATE POLICY "Service role can manage rate limits" ON rate_limit_entries
FOR ALL USING (true) WITH CHECK (true);

-- Criar função para limpeza de entradas antigas
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limit_entries WHERE window_start < now() - INTERVAL '1 hour';
END;
$$;
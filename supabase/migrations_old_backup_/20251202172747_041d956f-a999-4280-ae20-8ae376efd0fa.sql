-- Adiciona campos de configuração de aplicativos móveis
ALTER TABLE public.configuracoes_sistema
ADD COLUMN IF NOT EXISTS app_nome TEXT DEFAULT 'VAGOU',
ADD COLUMN IF NOT EXISTS app_id TEXT DEFAULT 'app.lovable.vagou',
ADD COLUMN IF NOT EXISTS app_icone_url TEXT,
ADD COLUMN IF NOT EXISTS app_splash_url TEXT,
ADD COLUMN IF NOT EXISTS app_android_url TEXT,
ADD COLUMN IF NOT EXISTS app_ios_url TEXT,
ADD COLUMN IF NOT EXISTS app_playstore_url TEXT,
ADD COLUMN IF NOT EXISTS app_appstore_url TEXT;
-- Adicionar coluna 'ativo' na tabela profiles para controle de bloqueio
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;

-- Comentário explicativo
COMMENT ON COLUMN public.profiles.ativo IS 'Indica se o usuário está ativo no sistema. Usuários inativos não podem fazer login.';
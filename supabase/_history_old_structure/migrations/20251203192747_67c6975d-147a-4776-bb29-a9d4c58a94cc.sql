-- Adicionar campo para mensagem de idade fora da faixa etária
ALTER TABLE public.configuracoes_sistema 
ADD COLUMN IF NOT EXISTS mensagem_idade_fora_faixa TEXT DEFAULT 'A criança informada está fora da faixa etária permitida para inscrição. Por favor, procure a Secretaria de Educação para mais informações.';
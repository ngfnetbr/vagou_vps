UPDATE cache_criancas 
SET 
  responsavel = dados_json->>'responsavel_nome', 
  telefone = dados_json->>'responsavel_telefone' 
WHERE dados_json IS NOT NULL 
  AND (responsavel IS NULL OR telefone IS NULL);
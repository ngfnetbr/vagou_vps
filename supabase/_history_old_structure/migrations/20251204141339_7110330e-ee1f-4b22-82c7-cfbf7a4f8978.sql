-- 1. Adicionar configurações de prioridade
ALTER TABLE public.configuracoes_sistema
ADD COLUMN IF NOT EXISTS prioridade_social_habilitada boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS prioridade_remanejamento_habilitada boolean DEFAULT true;

-- 2. Adicionar campo de data de retorno à fila
ALTER TABLE public.criancas
ADD COLUMN IF NOT EXISTS data_retorno_fila timestamp with time zone;

-- 3. Atualizar função de recálculo de posições com nova lógica
CREATE OR REPLACE FUNCTION public.recalcular_posicoes_fila()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  v_prioridade_social boolean;
  v_prioridade_remanejamento boolean;
BEGIN
  -- Buscar configurações
  SELECT 
    COALESCE(prioridade_social_habilitada, true),
    COALESCE(prioridade_remanejamento_habilitada, true)
  INTO v_prioridade_social, v_prioridade_remanejamento
  FROM configuracoes_sistema
  LIMIT 1;

  -- Criar tabela temporária com posições antigas
  CREATE TEMP TABLE IF NOT EXISTS posicoes_antigas AS
  SELECT id, posicao_fila, responsavel_nome, responsavel_telefone, nome
  FROM criancas
  WHERE status IN ('Fila de Espera', 'Convocado')
    AND posicao_fila IS NOT NULL;

  -- Calcular novas posições com lógica corrigida
  WITH posicoes_novas AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        ORDER BY 
          -- 1. Quem tem penalidade (fim de fila) vai SEMPRE pro fim, independente de prioridade
          CASE WHEN data_penalidade IS NOT NULL THEN 1 ELSE 0 END,
          
          -- 2. Dentro de quem não tem penalidade, aplicar prioridades (se configuradas)
          CASE 
            WHEN v_prioridade_remanejamento AND cmei_remanejamento_id IS NOT NULL THEN 1
            WHEN v_prioridade_social AND programas_sociais = true THEN 2
            ELSE 3 
          END,
          
          -- 3. Ordenar por data (usa data_retorno_fila se existir, senão created_at)
          COALESCE(data_retorno_fila, created_at) ASC
      )::int as nova_posicao
    FROM criancas
    WHERE status IN ('Fila de Espera', 'Convocado')
  )
  -- Atualizar posições
  UPDATE criancas c
  SET posicao_fila = p.nova_posicao
  FROM posicoes_novas p
  WHERE c.id = p.id
    AND (c.posicao_fila IS DISTINCT FROM p.nova_posicao);

  -- Detectar mudanças significativas e criar notificações
  FOR rec IN
    SELECT 
      c.id as crianca_id,
      c.nome,
      c.responsavel_nome,
      c.responsavel_telefone,
      pa.posicao_fila as posicao_antiga,
      c.posicao_fila as posicao_nova
    FROM criancas c
    LEFT JOIN posicoes_antigas pa ON c.id = pa.id
    WHERE c.status IN ('Fila de Espera', 'Convocado')
      AND c.posicao_fila IS NOT NULL
      AND (
        (c.posicao_fila <= 10 AND (pa.posicao_fila IS NULL OR pa.posicao_fila > 10))
        OR (pa.posicao_fila IS NOT NULL AND (pa.posicao_fila - c.posicao_fila) >= 5)
        OR (pa.posicao_fila IS NULL AND c.posicao_fila <= 20)
      )
  LOOP
    INSERT INTO notificacoes_log (
      tipo,
      canal,
      status,
      crianca_id,
      destinatario_nome,
      destinatario_contato,
      payload
    ) VALUES (
      'posicao_fila',
      'sistema',
      'pendente',
      rec.crianca_id,
      rec.responsavel_nome,
      rec.responsavel_telefone,
      jsonb_build_object(
        'posicao_antiga', rec.posicao_antiga,
        'posicao_nova', rec.posicao_nova,
        'mensagem', 
        CASE 
          WHEN rec.posicao_nova <= 10 AND (rec.posicao_antiga IS NULL OR rec.posicao_antiga > 10) THEN
            format('%s entrou no TOP 10! Posição atual: %s', rec.nome, rec.posicao_nova)
          WHEN rec.posicao_antiga IS NULL THEN
            format('%s foi inscrita na fila. Posição atual: %s', rec.nome, rec.posicao_nova)
          ELSE
            format('%s subiu na fila! De %s para %s', rec.nome, rec.posicao_antiga, rec.posicao_nova)
        END
      )
    );
  END LOOP;

  -- Limpar tabela temporária
  DROP TABLE IF EXISTS posicoes_antigas;
  
  -- Limpa posição de quem não está mais na fila
  UPDATE criancas
  SET posicao_fila = NULL
  WHERE status NOT IN ('Fila de Espera', 'Convocado')
    AND posicao_fila IS NOT NULL;
END;
$function$;
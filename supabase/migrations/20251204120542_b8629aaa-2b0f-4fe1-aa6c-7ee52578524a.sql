-- Função atualizada para recalcular posições E notificar mudanças significativas
CREATE OR REPLACE FUNCTION public.recalcular_posicoes_fila()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rec RECORD;
BEGIN
  -- Criar tabela temporária com posições antigas
  CREATE TEMP TABLE IF NOT EXISTS posicoes_antigas AS
  SELECT id, posicao_fila, responsavel_nome, responsavel_telefone, nome
  FROM criancas
  WHERE status IN ('Fila de Espera', 'Convocado')
    AND posicao_fila IS NOT NULL;

  -- Calcular novas posições
  WITH posicoes_novas AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        ORDER BY 
          CASE prioridade 
            WHEN 'Remanejamento' THEN 1 
            WHEN 'Social' THEN 2 
            ELSE 3 
          END,
          created_at ASC
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
        -- Entrou no top 10
        (c.posicao_fila <= 10 AND (pa.posicao_fila IS NULL OR pa.posicao_fila > 10))
        -- Ou subiu 5+ posições
        OR (pa.posicao_fila IS NOT NULL AND (pa.posicao_fila - c.posicao_fila) >= 5)
        -- Ou é a primeira posição calculada (inscrição nova com posição boa)
        OR (pa.posicao_fila IS NULL AND c.posicao_fila <= 20)
      )
  LOOP
    -- Inserir notificação no log
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
$$;
-- Atualizar função recalcular_posicoes_fila para considerar pesos de prioridades
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
  v_priorizar_zona boolean;
BEGIN
  -- Buscar configurações
  SELECT 
    COALESCE(prioridade_social_habilitada, true),
    COALESCE(prioridade_remanejamento_habilitada, true),
    COALESCE(priorizar_zona, false)
  INTO v_prioridade_social, v_prioridade_remanejamento, v_priorizar_zona
  FROM configuracoes_sistema
  LIMIT 1;

  -- Criar tabela temporária com posições antigas
  CREATE TEMP TABLE IF NOT EXISTS posicoes_antigas AS
  SELECT id, posicao_fila, responsavel_nome, responsavel_telefone, nome
  FROM criancas
  WHERE status IN ('Fila de Espera', 'Convocado')
    AND posicao_fila IS NOT NULL;

  -- Nova lógica de ordenação com pesos de prioridades:
  -- 1. Quem tem penalidade PERDE a prioridade (vai pro grupo "Geral")
  -- 2. Calcula peso total das prioridades aprovadas (tabela crianca_prioridades)
  -- 3. Ordena por peso DESC, depois por data ASC
  WITH prioridades_soma AS (
    SELECT 
      cp.crianca_id, 
      COALESCE(SUM(tp.peso), 0) as peso_total
    FROM crianca_prioridades cp
    JOIN tipos_prioridade tp ON cp.prioridade_id = tp.id
    WHERE cp.status = 'aprovado' AND tp.ativo = true
    GROUP BY cp.crianca_id
  ),
  posicoes_novas AS (
    SELECT 
      c.id,
      ROW_NUMBER() OVER (
        ORDER BY 
          -- Grupo de prioridade (penalizados perdem prioridade e vão pro grupo baixo)
          CASE 
            WHEN c.data_penalidade IS NOT NULL THEN 0
            WHEN v_prioridade_remanejamento AND c.cmei_remanejamento_id IS NOT NULL THEN 1000
            WHEN v_prioridade_social AND c.programas_sociais = true THEN 500
            ELSE 0 
          END DESC,
          -- Peso das prioridades customizadas (maior peso = maior prioridade)
          COALESCE(ps.peso_total, 0) DESC,
          -- Dentro de cada grupo, ordena por data
          -- Penalizados: usa data_penalidade
          -- Outros: usa data_retorno_fila ou created_at
          CASE 
            WHEN c.data_penalidade IS NOT NULL THEN c.data_penalidade
            ELSE COALESCE(c.data_retorno_fila, c.created_at)
          END ASC
      )::int as nova_posicao
    FROM criancas c
    LEFT JOIN prioridades_soma ps ON c.id = ps.crianca_id
    WHERE c.status IN ('Fila de Espera', 'Convocado')
  )
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
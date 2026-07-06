-- Atualiza a função para não usar tabelas temporárias (compatível com read-only)
CREATE OR REPLACE FUNCTION public.recalcular_posicoes_fila()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
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

  -- Nova lógica de ordenação:
  -- Se prioridades estão DESABILITADAS, todos têm o mesmo peso base (100)
  -- Se prioridades estão HABILITADAS, aplica os pesos diferenciados
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
          -- Primeiro critério: tipo de prioridade (só se habilitado)
          CASE 
            WHEN v_prioridade_remanejamento AND c.cmei_remanejamento_id IS NOT NULL THEN 1000
            WHEN v_prioridade_social AND c.programas_sociais = true THEN 500
            ELSE 100  -- Fila geral ou prioridades desabilitadas
          END DESC,
          -- Segundo critério: Peso das prioridades customizadas
          COALESCE(ps.peso_total, 0) DESC,
          -- Terceiro critério: Data de entrada/retorno na fila
          COALESCE(c.data_retorno_fila, c.created_at) ASC
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
  
  -- Limpa posição de quem não está mais na fila
  UPDATE criancas
  SET posicao_fila = NULL
  WHERE status NOT IN ('Fila de Espera', 'Convocado')
    AND posicao_fila IS NOT NULL;
END;
$function$;
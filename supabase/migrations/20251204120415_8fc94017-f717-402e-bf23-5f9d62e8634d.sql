-- Função para recalcular posições na fila de espera
CREATE OR REPLACE FUNCTION public.recalcular_posicoes_fila()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Atualiza posição de todas as crianças na fila
  -- Ordenação: Prioridade (Remanejamento=1, Social=2, Geral=3) e data de cadastro
  WITH posicoes AS (
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
      ) as nova_posicao
    FROM criancas
    WHERE status IN ('Fila de Espera', 'Convocado')
  )
  UPDATE criancas c
  SET posicao_fila = p.nova_posicao
  FROM posicoes p
  WHERE c.id = p.id
    AND (c.posicao_fila IS DISTINCT FROM p.nova_posicao);
  
  -- Limpa posição de quem não está mais na fila
  UPDATE criancas
  SET posicao_fila = NULL
  WHERE status NOT IN ('Fila de Espera', 'Convocado')
    AND posicao_fila IS NOT NULL;
END;
$$;

-- Função trigger que chama o recálculo quando necessário
CREATE OR REPLACE FUNCTION public.trigger_atualizar_posicao_fila()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Só recalcula se houve mudança relevante
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('Fila de Espera', 'Convocado') THEN
      PERFORM recalcular_posicoes_fila();
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Recalcula se mudou status, prioridade ou foi criado agora
    IF (OLD.status IS DISTINCT FROM NEW.status) OR 
       (OLD.prioridade IS DISTINCT FROM NEW.prioridade) THEN
      PERFORM recalcular_posicoes_fila();
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('Fila de Espera', 'Convocado') THEN
      PERFORM recalcular_posicoes_fila();
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Criar trigger na tabela criancas
DROP TRIGGER IF EXISTS tr_atualizar_posicao_fila ON criancas;

CREATE TRIGGER tr_atualizar_posicao_fila
AFTER INSERT OR UPDATE OF status, prioridade OR DELETE
ON criancas
FOR EACH ROW
EXECUTE FUNCTION trigger_atualizar_posicao_fila();

-- Executar recálculo inicial para atualizar todas as posições existentes
SELECT recalcular_posicoes_fila();
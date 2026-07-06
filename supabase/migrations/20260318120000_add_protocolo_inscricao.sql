-- Protocolo único de inscrição (usado em comprovante, consulta pública e notificações)

CREATE OR REPLACE FUNCTION public.gerar_protocolo_inscricao()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data text;
  v_token text;
BEGIN
  v_data := to_char(now(), 'YYYYMMDD');
  v_token := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  RETURN format('VAG-%s-%s', v_data, v_token);
END;
$$;

ALTER TABLE public.criancas
  ADD COLUMN IF NOT EXISTS protocolo text;

ALTER TABLE public.criancas
  ALTER COLUMN protocolo SET DEFAULT public.gerar_protocolo_inscricao();

UPDATE public.criancas
SET protocolo = public.gerar_protocolo_inscricao()
WHERE protocolo IS NULL;

ALTER TABLE public.criancas
  ALTER COLUMN protocolo SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_criancas_protocolo_unique
  ON public.criancas (protocolo);

DROP FUNCTION IF EXISTS public.consulta_publica_por_cpf(text);

CREATE OR REPLACE FUNCTION public.consulta_publica_por_cpf(p_cpf text)
RETURNS TABLE (
  id uuid,
  protocolo text,
  nome text,
  data_nascimento date,
  status status_crianca,
  posicao_fila integer,
  convocacao_deadline date,
  cmei_atual_nome text,
  turma_atual_nome text,
  cmei1_nome text,
  cmei2_nome text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cpf_limpo text;
BEGIN
  cpf_limpo := regexp_replace(p_cpf, '\D', '', 'g');

  IF length(cpf_limpo) != 11 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.protocolo,
    c.nome,
    c.data_nascimento,
    c.status,
    c.posicao_fila,
    c.convocacao_deadline,
    cmei_atual.nome AS cmei_atual_nome,
    turma_atual.nome AS turma_atual_nome,
    cmei1.nome AS cmei1_nome,
    cmei2.nome AS cmei2_nome
  FROM criancas c
  LEFT JOIN cmeis cmei_atual ON c.cmei_atual_id = cmei_atual.id
  LEFT JOIN turmas turma_atual ON c.turma_atual_id = turma_atual.id
  LEFT JOIN cmeis cmei1 ON c.cmei1_preferencia = cmei1.id
  LEFT JOIN cmeis cmei2 ON c.cmei2_preferencia = cmei2.id
  WHERE c.responsavel_cpf = cpf_limpo;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consulta_publica_por_cpf(text) TO anon;
GRANT EXECUTE ON FUNCTION public.consulta_publica_por_cpf(text) TO authenticated;

DROP FUNCTION IF EXISTS public.consulta_publica_por_protocolo(text);

CREATE OR REPLACE FUNCTION public.consulta_publica_por_protocolo(p_protocolo text)
RETURNS TABLE (
  id uuid,
  protocolo text,
  nome text,
  data_nascimento date,
  status status_crianca,
  posicao_fila integer,
  convocacao_deadline date,
  cmei_atual_nome text,
  turma_atual_nome text,
  cmei1_nome text,
  cmei2_nome text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  protocolo_limpo text;
BEGIN
  protocolo_limpo := upper(trim(p_protocolo));

  IF protocolo_limpo IS NULL OR protocolo_limpo = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.protocolo,
    c.nome,
    c.data_nascimento,
    c.status,
    c.posicao_fila,
    c.convocacao_deadline,
    cmei_atual.nome AS cmei_atual_nome,
    turma_atual.nome AS turma_atual_nome,
    cmei1.nome AS cmei1_nome,
    cmei2.nome AS cmei2_nome
  FROM criancas c
  LEFT JOIN cmeis cmei_atual ON c.cmei_atual_id = cmei_atual.id
  LEFT JOIN turmas turma_atual ON c.turma_atual_id = turma_atual.id
  LEFT JOIN cmeis cmei1 ON c.cmei1_preferencia = cmei1.id
  LEFT JOIN cmeis cmei2 ON c.cmei2_preferencia = cmei2.id
  WHERE upper(c.protocolo) = protocolo_limpo;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consulta_publica_por_protocolo(text) TO anon;
GRANT EXECUTE ON FUNCTION public.consulta_publica_por_protocolo(text) TO authenticated;

-- Template padrão: incluir protocolo na confirmação de inscrição
UPDATE public.templates_mensagens
SET
  corpo_whatsapp = (
    CASE
      WHEN corpo_whatsapp ILIKE '%{{protocolo}}%' THEN corpo_whatsapp
      WHEN corpo_whatsapp IS NULL OR corpo_whatsapp = '' THEN '✅ *Inscrição realizada!*\n\nOlá, {{responsavel_nome}}!\n\nA inscrição de *{{crianca_nome}}* foi confirmada.\n\n🧾 Protocolo: *{{protocolo}}*\n📍 Posição na fila: *{{posicao_fila}}*\n📚 Turma: {{turma_nome}}\n\nAcompanhe pelo sistema.'
      ELSE corpo_whatsapp || '\n\n🧾 Protocolo: *{{protocolo}}*'
    END
  ),
  variaveis_disponiveis = (
    CASE
      WHEN variaveis_disponiveis IS NULL THEN '["protocolo"]'::jsonb
      WHEN jsonb_typeof(variaveis_disponiveis) = 'array' AND NOT (variaveis_disponiveis ? 'protocolo') THEN variaveis_disponiveis || '["protocolo"]'::jsonb
      ELSE variaveis_disponiveis
    END
  )
WHERE tipo = 'inscricao_realizada';

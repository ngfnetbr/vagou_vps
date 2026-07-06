-- Criar função RPC para registrar auditoria com IP e User Agent
CREATE OR REPLACE FUNCTION public.registrar_auditoria(
  p_tabela text,
  p_operacao text,
  p_registro_id uuid DEFAULT NULL,
  p_dados_antigos jsonb DEFAULT NULL,
  p_dados_novos jsonb DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.auditoria (
    tabela,
    operacao,
    registro_id,
    dados_antigos,
    dados_novos,
    usuario_id,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    p_tabela,
    p_operacao,
    p_registro_id,
    p_dados_antigos,
    p_dados_novos,
    auth.uid(),
    p_ip_address,
    p_user_agent,
    now()
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Conceder permissão para usuários autenticados chamarem a função
GRANT EXECUTE ON FUNCTION public.registrar_auditoria TO authenticated;
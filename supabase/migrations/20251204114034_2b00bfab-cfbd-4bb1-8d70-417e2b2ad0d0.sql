-- Política para permitir que o responsável atualize dados de contato de suas crianças
CREATE POLICY "Responsavel can update own children contact info"
ON public.criancas
FOR UPDATE
USING (auth.uid() = responsavel_user_id)
WITH CHECK (auth.uid() = responsavel_user_id);
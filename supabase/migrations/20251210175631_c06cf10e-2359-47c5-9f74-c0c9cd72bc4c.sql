-- Adicionar política de INSERT público para inscrições no histórico
CREATE POLICY "Public can insert inscription history"
ON public.historico
FOR INSERT
WITH CHECK (acao = 'Inscrição Realizada');

-- Também adicionar política para responsáveis inserirem histórico de suas crianças
CREATE POLICY "Responsavel can insert history for own children"
ON public.historico
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM criancas 
    WHERE criancas.id = historico.crianca_id 
    AND criancas.responsavel_user_id = auth.uid()
  )
);
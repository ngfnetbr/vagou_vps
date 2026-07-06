-- Política para permitir leitura pública da fila de espera
-- Expõe apenas crianças com status 'Fila de Espera' ou 'Convocado'
CREATE POLICY "Public can view fila de espera"
ON public.criancas
FOR SELECT
TO public
USING (status IN ('Fila de Espera', 'Convocado'));
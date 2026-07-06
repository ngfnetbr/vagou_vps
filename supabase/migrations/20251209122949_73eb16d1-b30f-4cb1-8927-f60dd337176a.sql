-- Remove a foreign key atual
ALTER TABLE public.campos_inscricao_historico
DROP CONSTRAINT IF EXISTS campos_inscricao_historico_campo_id_fkey;

-- Recria com ON DELETE SET NULL para permitir deleção do campo
ALTER TABLE public.campos_inscricao_historico
ADD CONSTRAINT campos_inscricao_historico_campo_id_fkey
FOREIGN KEY (campo_id) REFERENCES public.campos_inscricao(id)
ON DELETE SET NULL;
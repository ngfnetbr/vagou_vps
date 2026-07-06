-- Marcar campo observacoes como não-sistema para que apareça dinamicamente
UPDATE campos_inscricao 
SET campo_sistema = false 
WHERE nome_campo = 'observacoes' AND secao = 'observacoes';
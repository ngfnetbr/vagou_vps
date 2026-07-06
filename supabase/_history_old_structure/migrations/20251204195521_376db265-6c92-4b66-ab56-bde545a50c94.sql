-- Primeiro deletar histórico relacionado
DELETE FROM campos_inscricao_historico WHERE campo_id IN (
  SELECT id FROM campos_inscricao WHERE nome_campo = 'tipo_sanguineo'
);

-- Desabilitar trigger temporariamente
ALTER TABLE campos_inscricao DISABLE TRIGGER campos_inscricao_audit_trigger;

-- Deletar o campo
DELETE FROM campos_inscricao WHERE nome_campo = 'tipo_sanguineo';

-- Reabilitar trigger
ALTER TABLE campos_inscricao ENABLE TRIGGER campos_inscricao_audit_trigger;
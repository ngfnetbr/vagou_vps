-- Inserir permissões de Remanejamento
INSERT INTO permissoes (codigo, nome, descricao, modulo) VALUES
('remanejamento.visualizar', 'Visualizar Remanejamentos', 'Permite visualizar solicitações de remanejamento', 'Remanejamentos'),
('remanejamento.aprovar', 'Aprovar Remanejamento', 'Permite aprovar solicitações de remanejamento', 'Remanejamentos'),
('remanejamento.recusar', 'Recusar Remanejamento', 'Permite recusar solicitações de remanejamento', 'Remanejamentos')
ON CONFLICT (codigo) DO NOTHING;

-- Conceder permissões de remanejamento para roles admin, superadmin e gestor
INSERT INTO role_permissoes (role, permissao_id)
SELECT 'superadmin', id FROM permissoes WHERE codigo IN ('remanejamento.visualizar', 'remanejamento.aprovar', 'remanejamento.recusar')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissoes (role, permissao_id)
SELECT 'admin', id FROM permissoes WHERE codigo IN ('remanejamento.visualizar', 'remanejamento.aprovar', 'remanejamento.recusar')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissoes (role, permissao_id)
SELECT 'gestor', id FROM permissoes WHERE codigo IN ('remanejamento.visualizar', 'remanejamento.aprovar', 'remanejamento.recusar')
ON CONFLICT DO NOTHING;
-- Trata o VAGOU como módulo do ecossistema: cria a permissão de acesso e
-- concede aos papéis que já utilizavam o VAGOU para não perder acesso.
-- Execute este script no banco de deploy (mesmo fluxo das demais migrations).
INSERT INTO public.permissoes (codigo, nome, descricao, modulo) VALUES
('modulos.vagou.acessar', 'Acessar modulo VAGOU', 'Permite abrir o modulo VAGOU no sistema principal.', 'Modulos')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.role_permissoes (role, permissao_id)
SELECT r.role::public.app_role, p.id
FROM (VALUES ('superadmin'), ('admin'), ('gestor'), ('diretor_cmei'), ('responsavel')) AS r(role)
CROSS JOIN public.permissoes p
WHERE p.codigo = 'modulos.vagou.acessar'
ON CONFLICT DO NOTHING;

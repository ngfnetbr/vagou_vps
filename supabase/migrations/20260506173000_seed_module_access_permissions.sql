INSERT INTO public.permissoes (codigo, nome, descricao, modulo) VALUES
('modulos.sam.acessar', 'Acessar modulo SAM', 'Permite abrir o modulo SAM no sistema principal.', 'Modulos'),
('modulos.sondagem.acessar', 'Acessar modulo Sondagem', 'Permite abrir o modulo Sondagem no sistema principal.', 'Modulos')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.role_permissoes (role, permissao_id)
SELECT 'superadmin', id
FROM public.permissoes
WHERE codigo IN ('modulos.sam.acessar', 'modulos.sondagem.acessar')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissoes (role, permissao_id)
SELECT 'admin', id
FROM public.permissoes
WHERE codigo IN ('modulos.sam.acessar', 'modulos.sondagem.acessar')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissoes (role, permissao_id)
SELECT 'gestor', id
FROM public.permissoes
WHERE codigo IN ('modulos.sam.acessar', 'modulos.sondagem.acessar')
ON CONFLICT DO NOTHING;

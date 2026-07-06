INSERT INTO public.permissoes (codigo, nome, descricao, modulo)
VALUES ('modulos.vagou.acessar', 'Acessar VAGOU', 'Permite acessar o módulo VAGOU', 'Módulos')
ON CONFLICT (codigo) DO NOTHING;

WITH perm AS (
  SELECT id FROM public.permissoes WHERE codigo = 'modulos.vagou.acessar'
)
INSERT INTO public.role_permissoes (role, permissao_id)
SELECT r.role, perm.id
FROM (VALUES
  ('responsavel'::public.app_role),
  ('gestor'::public.app_role),
  ('admin'::public.app_role),
  ('superadmin'::public.app_role),
  ('diretor_cmei'::public.app_role),
  ('professional'::public.app_role),
  ('school_coord'::public.app_role),
  ('equipe_pedagogica'::public.app_role),
  ('coordenador'::public.app_role)
) AS r(role)
CROSS JOIN perm
ON CONFLICT (role, permissao_id) DO NOTHING;

-- Criar tabela de permissões do sistema
CREATE TABLE public.permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  nome text NOT NULL,
  descricao text,
  modulo text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Criar tabela de permissões por papel
CREATE TABLE public.role_permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permissao_id uuid REFERENCES public.permissoes(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  UNIQUE(role, permissao_id)
);

-- Habilitar RLS
ALTER TABLE public.permissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissoes ENABLE ROW LEVEL SECURITY;

-- Políticas para permissoes
CREATE POLICY "Anyone can view permissions" ON public.permissoes
  FOR SELECT USING (true);

CREATE POLICY "Admin can manage permissions" ON public.permissoes
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Políticas para role_permissoes
CREATE POLICY "Anyone can view role permissions" ON public.role_permissoes
  FOR SELECT USING (true);

CREATE POLICY "Admin can manage role permissions" ON public.role_permissoes
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Função para verificar permissão
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissoes rp ON ur.role = rp.role
    JOIN public.permissoes p ON rp.permissao_id = p.id
    WHERE ur.user_id = _user_id AND p.codigo = _permission_code
  ) OR has_role(_user_id, 'superadmin')
$$;

-- Inserir permissões padrão do sistema
INSERT INTO public.permissoes (codigo, nome, descricao, modulo) VALUES
-- Módulo Crianças
('criancas.visualizar', 'Visualizar Crianças', 'Permite visualizar lista de crianças', 'Crianças'),
('criancas.criar', 'Criar Crianças', 'Permite cadastrar novas crianças', 'Crianças'),
('criancas.editar', 'Editar Crianças', 'Permite editar dados de crianças', 'Crianças'),
('criancas.excluir', 'Excluir Crianças', 'Permite excluir crianças do sistema', 'Crianças'),
-- Módulo Fila
('fila.visualizar', 'Visualizar Fila', 'Permite visualizar fila de espera', 'Fila'),
('fila.convocar', 'Convocar Crianças', 'Permite convocar crianças da fila', 'Fila'),
('fila.gerenciar', 'Gerenciar Fila', 'Permite alterar posições e status na fila', 'Fila'),
-- Módulo Matrículas
('matriculas.visualizar', 'Visualizar Matrículas', 'Permite visualizar matrículas', 'Matrículas'),
('matriculas.confirmar', 'Confirmar Matrículas', 'Permite confirmar matrículas', 'Matrículas'),
('matriculas.cancelar', 'Cancelar Matrículas', 'Permite cancelar matrículas', 'Matrículas'),
('matriculas.realocar', 'Realocar Alunos', 'Permite realocar alunos entre turmas/CMEIs', 'Matrículas'),
-- Módulo CMEIs
('cmeis.visualizar', 'Visualizar CMEIs', 'Permite visualizar lista de CMEIs', 'CMEIs'),
('cmeis.criar', 'Criar CMEIs', 'Permite cadastrar novos CMEIs', 'CMEIs'),
('cmeis.editar', 'Editar CMEIs', 'Permite editar dados de CMEIs', 'CMEIs'),
('cmeis.excluir', 'Excluir CMEIs', 'Permite excluir CMEIs', 'CMEIs'),
-- Módulo Turmas
('turmas.visualizar', 'Visualizar Turmas', 'Permite visualizar turmas', 'Turmas'),
('turmas.criar', 'Criar Turmas', 'Permite criar novas turmas', 'Turmas'),
('turmas.editar', 'Editar Turmas', 'Permite editar turmas', 'Turmas'),
('turmas.excluir', 'Excluir Turmas', 'Permite excluir turmas', 'Turmas'),
-- Módulo Usuários
('usuarios.visualizar', 'Visualizar Usuários', 'Permite visualizar lista de usuários', 'Usuários'),
('usuarios.criar', 'Criar Usuários', 'Permite criar novos usuários', 'Usuários'),
('usuarios.editar', 'Editar Usuários', 'Permite editar dados de usuários', 'Usuários'),
('usuarios.desativar', 'Desativar Usuários', 'Permite desativar/ativar usuários', 'Usuários'),
('usuarios.roles', 'Gerenciar Papéis', 'Permite alterar papéis de usuários', 'Usuários'),
-- Módulo Relatórios
('relatorios.visualizar', 'Visualizar Relatórios', 'Permite visualizar relatórios', 'Relatórios'),
('relatorios.exportar', 'Exportar Relatórios', 'Permite exportar relatórios', 'Relatórios'),
-- Módulo Configurações
('configuracoes.visualizar', 'Visualizar Configurações', 'Permite visualizar configurações', 'Configurações'),
('configuracoes.editar', 'Editar Configurações', 'Permite editar configurações do sistema', 'Configurações'),
-- Módulo Auditoria
('auditoria.visualizar', 'Visualizar Auditoria', 'Permite visualizar logs de auditoria', 'Auditoria'),
-- Módulo Documentos
('documentos.visualizar', 'Visualizar Documentos', 'Permite visualizar documentos', 'Documentos'),
('documentos.aprovar', 'Aprovar Documentos', 'Permite aprovar/recusar documentos', 'Documentos');

-- Associar todas as permissões ao admin e superadmin por padrão
INSERT INTO public.role_permissoes (role, permissao_id)
SELECT 'admin', id FROM public.permissoes;

INSERT INTO public.role_permissoes (role, permissao_id)
SELECT 'superadmin', id FROM public.permissoes;

-- Permissões básicas para gestor
INSERT INTO public.role_permissoes (role, permissao_id)
SELECT 'gestor', id FROM public.permissoes 
WHERE codigo IN (
  'criancas.visualizar', 'criancas.criar', 'criancas.editar',
  'fila.visualizar', 'fila.convocar', 'fila.gerenciar',
  'matriculas.visualizar', 'matriculas.confirmar', 'matriculas.cancelar', 'matriculas.realocar',
  'cmeis.visualizar', 'turmas.visualizar',
  'relatorios.visualizar', 'relatorios.exportar',
  'documentos.visualizar', 'documentos.aprovar'
);

-- Permissões para diretor_cmei
INSERT INTO public.role_permissoes (role, permissao_id)
SELECT 'diretor_cmei', id FROM public.permissoes 
WHERE codigo IN (
  'criancas.visualizar',
  'fila.visualizar',
  'matriculas.visualizar',
  'cmeis.visualizar', 'turmas.visualizar',
  'relatorios.visualizar',
  'documentos.visualizar', 'documentos.aprovar'
);
-- Criar enum para roles (já existe, mas garantindo)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('responsavel', 'gestor', 'admin', 'superadmin', 'diretor_cmei');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Criar tabela user_roles separada (mais seguro que ter role na profiles)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Criar função segura para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função auxiliar para verificar se usuário tem qualquer role administrativa
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id 
    AND role IN ('admin', 'superadmin', 'gestor', 'diretor_cmei')
  )
$$;

-- Políticas RLS para user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- Atualizar políticas RLS existentes para usar has_role
-- Profiles
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
CREATE POLICY "Admin can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- CMEIs
DROP POLICY IF EXISTS "Admin can manage CMEIs" ON public.cmeis;
CREATE POLICY "Admin can manage CMEIs"
  ON public.cmeis
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Turmas
DROP POLICY IF EXISTS "Admin can manage turmas" ON public.turmas;
CREATE POLICY "Admin can manage turmas"
  ON public.turmas
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Crianças
DROP POLICY IF EXISTS "Admin can manage all children" ON public.criancas;
CREATE POLICY "Admin can manage all children"
  ON public.criancas
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Responsavel can view own children" ON public.criancas;
CREATE POLICY "Responsavel can view own children"
  ON public.criancas
  FOR SELECT
  TO authenticated
  USING (auth.uid() = responsavel_user_id OR public.is_admin(auth.uid()));

-- Histórico
DROP POLICY IF EXISTS "Admin can manage history" ON public.historico;
CREATE POLICY "Admin can manage history"
  ON public.historico
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Responsavel can view own children history" ON public.historico;
CREATE POLICY "Responsavel can view own children history"
  ON public.historico
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM criancas 
      WHERE criancas.id = historico.crianca_id 
      AND criancas.responsavel_user_id = auth.uid()
    ) 
    OR public.is_admin(auth.uid())
  );

-- Auditoria
DROP POLICY IF EXISTS "Only admin can view audit logs" ON public.auditoria;
CREATE POLICY "Only admin can view audit logs"
  ON public.auditoria
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- Configurações
DROP POLICY IF EXISTS "Admin can update configurations" ON public.configuracoes_sistema;
CREATE POLICY "Admin can update configurations"
  ON public.configuracoes_sistema
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));
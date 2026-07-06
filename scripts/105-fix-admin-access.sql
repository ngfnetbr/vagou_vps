-- Fix Admin Permissions and Ensure Access
-- APPLIED AUTOMATICALLY VIA MCP
-- 1. Update is_admin function (Removing reference to non-existent profiles.role)
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

-- 2. Update has_role function
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

-- 3. Re-apply the critical RLS policies for the 'criancas' table
DROP POLICY IF EXISTS "Admin can manage all children" ON public.criancas;
CREATE POLICY "Admin can manage all children" ON public.criancas FOR ALL 
  USING ((SELECT is_admin(auth.uid()))) 
  WITH CHECK ((SELECT is_admin(auth.uid())));

-- Ensure 'Responsavel' policies are also correct
DROP POLICY IF EXISTS "Responsavel can view own children" ON public.criancas;
CREATE POLICY "Responsavel can view own children" ON public.criancas FOR SELECT 
  USING ((SELECT auth.uid()) = responsavel_user_id OR (SELECT is_admin(auth.uid())));

DROP POLICY IF EXISTS "Responsavel can update own children contact info" ON public.criancas;
CREATE POLICY "Responsavel can update own children contact info" ON public.criancas FOR UPDATE 
  USING ((SELECT auth.uid()) = responsavel_user_id) 
  WITH CHECK ((SELECT auth.uid()) = responsavel_user_id);

-- 4. Ensure admins can see user_roles (critical for frontend admin checks)
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT 
  USING ((SELECT public.has_role(auth.uid(), 'admin')) OR (SELECT public.has_role(auth.uid(), 'superadmin')));

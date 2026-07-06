-- =============================================================================
-- VAGOU - Correção de Multiple Permissive Policies (Supabase Linter)
-- =============================================================================
-- Combina políticas permissivas múltiplas para a mesma role/ação em uma única política
-- para evitar avaliações redundantes e melhorar a performance.
-- =============================================================================

-- tutorial_faq
DROP POLICY IF EXISTS "Anyone can view active FAQs" ON public.tutorial_faq;
DROP POLICY IF EXISTS "Superadmin can manage FAQs" ON public.tutorial_faq;

CREATE POLICY "View FAQs" ON public.tutorial_faq FOR SELECT USING (ativo = true OR (SELECT has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Superadmin write FAQs" ON public.tutorial_faq FOR INSERT WITH CHECK ((SELECT has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Superadmin update FAQs" ON public.tutorial_faq FOR UPDATE USING ((SELECT has_role(auth.uid(), 'superadmin'))) WITH CHECK ((SELECT has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Superadmin delete FAQs" ON public.tutorial_faq FOR DELETE USING ((SELECT has_role(auth.uid(), 'superadmin')));

-- tutorial_secoes
DROP POLICY IF EXISTS "Anyone can view active tutorial sections" ON public.tutorial_secoes;
DROP POLICY IF EXISTS "Superadmin can manage tutorial sections" ON public.tutorial_secoes;

CREATE POLICY "View tutorial sections" ON public.tutorial_secoes FOR SELECT USING (ativo = true OR (SELECT has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Superadmin write tutorial sections" ON public.tutorial_secoes FOR INSERT WITH CHECK ((SELECT has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Superadmin update tutorial sections" ON public.tutorial_secoes FOR UPDATE USING ((SELECT has_role(auth.uid(), 'superadmin'))) WITH CHECK ((SELECT has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Superadmin delete tutorial sections" ON public.tutorial_secoes FOR DELETE USING ((SELECT has_role(auth.uid(), 'superadmin')));

-- tutorial_dicas
DROP POLICY IF EXISTS "Anyone can view active tips" ON public.tutorial_dicas;
DROP POLICY IF EXISTS "Superadmin can manage tips" ON public.tutorial_dicas;

CREATE POLICY "View tips" ON public.tutorial_dicas FOR SELECT USING (ativo = true OR (SELECT has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Superadmin write tips" ON public.tutorial_dicas FOR INSERT WITH CHECK ((SELECT has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Superadmin update tips" ON public.tutorial_dicas FOR UPDATE USING ((SELECT has_role(auth.uid(), 'superadmin'))) WITH CHECK ((SELECT has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Superadmin delete tips" ON public.tutorial_dicas FOR DELETE USING ((SELECT has_role(auth.uid(), 'superadmin')));

-- permissoes
DROP POLICY IF EXISTS "Anyone can view permissions" ON public.permissoes;
DROP POLICY IF EXISTS "Admin can manage permissions" ON public.permissoes;

CREATE POLICY "View permissions" ON public.permissoes FOR SELECT USING (true);
CREATE POLICY "Admin write permissions" ON public.permissoes FOR INSERT WITH CHECK ((SELECT has_role(auth.uid(), 'admin')) OR (SELECT has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Admin update permissions" ON public.permissoes FOR UPDATE USING ((SELECT has_role(auth.uid(), 'admin')) OR (SELECT has_role(auth.uid(), 'superadmin'))) WITH CHECK ((SELECT has_role(auth.uid(), 'admin')) OR (SELECT has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Admin delete permissions" ON public.permissoes FOR DELETE USING ((SELECT has_role(auth.uid(), 'admin')) OR (SELECT has_role(auth.uid(), 'superadmin')));

-- role_permissoes
DROP POLICY IF EXISTS "Anyone can view role permissions" ON public.role_permissoes;
DROP POLICY IF EXISTS "Admin can manage role permissions" ON public.role_permissoes;

CREATE POLICY "View role permissions" ON public.role_permissoes FOR SELECT USING (true);
CREATE POLICY "Admin write role permissions" ON public.role_permissoes FOR INSERT WITH CHECK ((SELECT has_role(auth.uid(), 'admin')) OR (SELECT has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Admin update role permissions" ON public.role_permissoes FOR UPDATE USING ((SELECT has_role(auth.uid(), 'admin')) OR (SELECT has_role(auth.uid(), 'superadmin'))) WITH CHECK ((SELECT has_role(auth.uid(), 'admin')) OR (SELECT has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Admin delete role permissions" ON public.role_permissoes FOR DELETE USING ((SELECT has_role(auth.uid(), 'admin')) OR (SELECT has_role(auth.uid(), 'superadmin')));

-- valores_campos_custom
DROP POLICY IF EXISTS "Admin can manage custom field values" ON public.valores_campos_custom;
DROP POLICY IF EXISTS "Admin can manage custom values" ON public.valores_campos_custom;
DROP POLICY IF EXISTS "Public can insert custom values" ON public.valores_campos_custom;
DROP POLICY IF EXISTS "Responsavel can view own custom values" ON public.valores_campos_custom;
DROP POLICY IF EXISTS "Responsavel can view own children custom fields" ON public.valores_campos_custom;

CREATE POLICY "Public insert custom values" ON public.valores_campos_custom FOR INSERT WITH CHECK (true);
CREATE POLICY "View custom values" ON public.valores_campos_custom FOR SELECT USING ((SELECT is_admin(auth.uid())) OR EXISTS (SELECT 1 FROM criancas WHERE criancas.id = valores_campos_custom.crianca_id AND criancas.responsavel_user_id = (SELECT auth.uid())));
CREATE POLICY "Admin update custom values" ON public.valores_campos_custom FOR UPDATE USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));
CREATE POLICY "Admin delete custom values" ON public.valores_campos_custom FOR DELETE USING ((SELECT is_admin(auth.uid())));

-- zonas_atendimento
DROP POLICY IF EXISTS "Admin can manage zones" ON public.zonas_atendimento;
DROP POLICY IF EXISTS "Anyone can view active zones" ON public.zonas_atendimento;

CREATE POLICY "View zones" ON public.zonas_atendimento FOR SELECT USING (ativo = true OR (SELECT is_admin(auth.uid())));
CREATE POLICY "Admin write zones" ON public.zonas_atendimento FOR INSERT WITH CHECK ((SELECT is_admin(auth.uid())));
CREATE POLICY "Admin update zones" ON public.zonas_atendimento FOR UPDATE USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));
CREATE POLICY "Admin delete zones" ON public.zonas_atendimento FOR DELETE USING ((SELECT is_admin(auth.uid())));

-- user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "View roles" ON public.user_roles FOR SELECT USING ((SELECT auth.uid()) = user_id OR (SELECT public.has_role(auth.uid(), 'admin')) OR (SELECT public.has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Admin write roles" ON public.user_roles FOR INSERT WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin')) OR (SELECT public.has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Admin update roles" ON public.user_roles FOR UPDATE USING ((SELECT public.has_role(auth.uid(), 'admin')) OR (SELECT public.has_role(auth.uid(), 'superadmin'))) WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin')) OR (SELECT public.has_role(auth.uid(), 'superadmin')));
CREATE POLICY "Admin delete roles" ON public.user_roles FOR DELETE USING ((SELECT public.has_role(auth.uid(), 'admin')) OR (SELECT public.has_role(auth.uid(), 'superadmin')));

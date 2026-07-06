-- Auto-generated fixes for auth_rls_initplan

DROP POLICY IF EXISTS "Responsavel can insert own chat config" ON public.chat_conversas_config;
CREATE POLICY "Responsavel can insert own chat config" ON public.chat_conversas_config FOR INSERT TO public WITH CHECK ((responsavel_id = ( SELECT (SELECT auth.uid()) AS uid)));

DROP POLICY IF EXISTS "Responsavel can view own chat config" ON public.chat_conversas_config;
CREATE POLICY "Responsavel can view own chat config" ON public.chat_conversas_config FOR SELECT TO public USING ((responsavel_id = ( SELECT (SELECT auth.uid()) AS uid)));

DROP POLICY IF EXISTS "Only admin can view audit logs" ON public.auditoria;
CREATE POLICY "Only admin can view audit logs" ON public.auditoria FOR SELECT TO public USING ((( SELECT has_role((SELECT auth.uid()), 'admin'::app_role) AS has_role) OR ( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role)));

DROP POLICY IF EXISTS "Responsavel can view own conversation labels" ON public.chat_conversa_marcadores;
CREATE POLICY "Responsavel can view own conversation labels" ON public.chat_conversa_marcadores FOR SELECT TO public USING ((responsavel_id = ( SELECT (SELECT auth.uid()) AS uid)));

DROP POLICY IF EXISTS "Directors can view own bindings" ON public.diretor_cmei_vinculo;
CREATE POLICY "Directors can view own bindings" ON public.diretor_cmei_vinculo FOR SELECT TO public USING ((( SELECT (SELECT auth.uid()) AS uid) = user_id));

DROP POLICY IF EXISTS "Responsavel can view own child priorities" ON public.crianca_prioridades;
CREATE POLICY "Responsavel can view own child priorities" ON public.crianca_prioridades FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM criancas
  WHERE ((criancas.id = crianca_prioridades.crianca_id) AND (criancas.responsavel_user_id = ( SELECT (SELECT auth.uid()) AS uid))))));

DROP POLICY IF EXISTS "Responsavel can update own pending documents" ON public.documentos_crianca;
CREATE POLICY "Responsavel can update own pending documents" ON public.documentos_crianca FOR UPDATE TO public USING (((status = 'pendente'::text) AND (EXISTS ( SELECT 1
   FROM criancas
  WHERE ((criancas.id = documentos_crianca.crianca_id) AND (criancas.responsavel_user_id = ( SELECT (SELECT auth.uid()) AS uid)))))));

DROP POLICY IF EXISTS "Responsavel can upload documents for own children" ON public.documentos_crianca;
CREATE POLICY "Responsavel can upload documents for own children" ON public.documentos_crianca FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM criancas
  WHERE ((criancas.id = documentos_crianca.crianca_id) AND (criancas.responsavel_user_id = ( SELECT (SELECT auth.uid()) AS uid))))));

DROP POLICY IF EXISTS "Responsavel can view own children documents" ON public.documentos_crianca;
CREATE POLICY "Responsavel can view own children documents" ON public.documentos_crianca FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM criancas
  WHERE ((criancas.id = documentos_crianca.crianca_id) AND (criancas.responsavel_user_id = ( SELECT (SELECT auth.uid()) AS uid))))));

DROP POLICY IF EXISTS "Responsavel can update own children contact info" ON public.criancas;
CREATE POLICY "Responsavel can update own children contact info" ON public.criancas FOR UPDATE TO public USING ((( SELECT (SELECT auth.uid()) AS uid) = responsavel_user_id)) WITH CHECK ((( SELECT (SELECT auth.uid()) AS uid) = responsavel_user_id));

DROP POLICY IF EXISTS "Responsavel can view own children" ON public.criancas;
CREATE POLICY "Responsavel can view own children" ON public.criancas FOR SELECT TO public USING (((( SELECT auth.uid() AS uid) = responsavel_user_id) OR ( SELECT (SELECT is_admin(auth.uid())) AS is_admin)));

DROP POLICY IF EXISTS "Responsavel can insert own messages" ON public.chat_mensagens;
CREATE POLICY "Responsavel can insert own messages" ON public.chat_mensagens FOR INSERT TO public WITH CHECK (((responsavel_id = ( SELECT (SELECT auth.uid()) AS uid)) AND (direcao = 'responsavel'::text)));

DROP POLICY IF EXISTS "Responsavel can view own messages" ON public.chat_mensagens;
CREATE POLICY "Responsavel can view own messages" ON public.chat_mensagens FOR SELECT TO public USING ((responsavel_id = ( SELECT (SELECT auth.uid()) AS uid)));

DROP POLICY IF EXISTS "Responsavel can insert history for own children" ON public.historico;
CREATE POLICY "Responsavel can insert history for own children" ON public.historico FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM criancas
  WHERE ((criancas.id = historico.crianca_id) AND (criancas.responsavel_user_id = ( SELECT (SELECT auth.uid()) AS uid))))));

DROP POLICY IF EXISTS "Responsavel can view own children history" ON public.historico;
CREATE POLICY "Responsavel can view own children history" ON public.historico FOR SELECT TO public USING (((EXISTS ( SELECT 1
   FROM criancas
  WHERE ((criancas.id = historico.crianca_id) AND (criancas.responsavel_user_id = ( SELECT auth.uid() AS uid))))) OR ( SELECT (SELECT is_admin(auth.uid())) AS is_admin)));

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO public WITH CHECK ((( SELECT (SELECT auth.uid()) AS uid) = id));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO public USING ((( SELECT (SELECT auth.uid()) AS uid) = id));

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO public USING ((( SELECT (SELECT auth.uid()) AS uid) = id));

DROP POLICY IF EXISTS "Admin delete role permissions" ON public.role_permissoes;
CREATE POLICY "Admin delete role permissions" ON public.role_permissoes FOR DELETE TO public USING ((( SELECT has_role((SELECT auth.uid()), 'admin'::app_role) AS has_role) OR ( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role)));

DROP POLICY IF EXISTS "Admin update role permissions" ON public.role_permissoes;
CREATE POLICY "Admin update role permissions" ON public.role_permissoes FOR UPDATE TO public USING ((( SELECT has_role((SELECT auth.uid()), 'admin'::app_role) AS has_role) OR ( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role))) WITH CHECK ((( SELECT has_role((SELECT auth.uid()), 'admin'::app_role) AS has_role) OR ( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role)));

DROP POLICY IF EXISTS "Admin write role permissions" ON public.role_permissoes;
CREATE POLICY "Admin write role permissions" ON public.role_permissoes FOR INSERT TO public WITH CHECK ((( SELECT has_role((SELECT auth.uid()), 'admin'::app_role) AS has_role) OR ( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role)));

DROP POLICY IF EXISTS "Admin delete permissions" ON public.permissoes;
CREATE POLICY "Admin delete permissions" ON public.permissoes FOR DELETE TO public USING ((( SELECT has_role((SELECT auth.uid()), 'admin'::app_role) AS has_role) OR ( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role)));

DROP POLICY IF EXISTS "Admin update permissions" ON public.permissoes;
CREATE POLICY "Admin update permissions" ON public.permissoes FOR UPDATE TO public USING ((( SELECT has_role((SELECT auth.uid()), 'admin'::app_role) AS has_role) OR ( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role))) WITH CHECK ((( SELECT has_role((SELECT auth.uid()), 'admin'::app_role) AS has_role) OR ( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role)));

DROP POLICY IF EXISTS "Admin write permissions" ON public.permissoes;
CREATE POLICY "Admin write permissions" ON public.permissoes FOR INSERT TO public WITH CHECK ((( SELECT has_role((SELECT auth.uid()), 'admin'::app_role) AS has_role) OR ( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role)));

DROP POLICY IF EXISTS "Users can manage own preferences" ON public.user_preferences;
CREATE POLICY "Users can manage own preferences" ON public.user_preferences FOR ALL TO public USING ((( SELECT (SELECT auth.uid()) AS uid) = user_id)) WITH CHECK ((( SELECT (SELECT auth.uid()) AS uid) = user_id));

DROP POLICY IF EXISTS "Admin delete roles" ON public.user_roles;
CREATE POLICY "Admin delete roles" ON public.user_roles FOR DELETE TO public USING ((( SELECT has_role((SELECT auth.uid()), 'admin'::app_role) AS has_role) OR ( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role)));

DROP POLICY IF EXISTS "Admin update roles" ON public.user_roles;
CREATE POLICY "Admin update roles" ON public.user_roles FOR UPDATE TO public USING ((( SELECT has_role((SELECT auth.uid()), 'admin'::app_role) AS has_role) OR ( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role))) WITH CHECK ((( SELECT has_role((SELECT auth.uid()), 'admin'::app_role) AS has_role) OR ( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role)));

DROP POLICY IF EXISTS "Admin write roles" ON public.user_roles;
CREATE POLICY "Admin write roles" ON public.user_roles FOR INSERT TO public WITH CHECK ((( SELECT has_role((SELECT auth.uid()), 'admin'::app_role) AS has_role) OR ( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role)));

DROP POLICY IF EXISTS "View roles" ON public.user_roles;
CREATE POLICY "View roles" ON public.user_roles FOR SELECT TO public USING (((( SELECT (SELECT auth.uid()) AS uid) = user_id) OR ( SELECT has_role((SELECT auth.uid()), 'admin'::app_role) AS has_role) OR ( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role)));

DROP POLICY IF EXISTS "View zones" ON public.zonas_atendimento;
CREATE POLICY "View zones" ON public.zonas_atendimento FOR SELECT TO public USING (((ativo = true) OR ( SELECT (SELECT is_admin(auth.uid())) AS is_admin)));

DROP POLICY IF EXISTS "View custom values" ON public.valores_campos_custom;
CREATE POLICY "View custom values" ON public.valores_campos_custom FOR SELECT TO public USING ((( SELECT (SELECT is_admin(auth.uid())) AS is_admin) OR (EXISTS ( SELECT 1
   FROM criancas
  WHERE ((criancas.id = valores_campos_custom.crianca_id) AND (criancas.responsavel_user_id = ( SELECT auth.uid() AS uid)))))));

DROP POLICY IF EXISTS "View tips" ON public.tutorial_dicas;
CREATE POLICY "View tips" ON public.tutorial_dicas FOR SELECT TO public USING (((ativo = true) OR ( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role)));

DROP POLICY IF EXISTS "View FAQs" ON public.tutorial_faq;
CREATE POLICY "View FAQs" ON public.tutorial_faq FOR SELECT TO public USING (((ativo = true) OR ( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role)));

DROP POLICY IF EXISTS "View tutorial sections" ON public.tutorial_secoes;
CREATE POLICY "View tutorial sections" ON public.tutorial_secoes FOR SELECT TO public USING (((ativo = true) OR ( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role)));


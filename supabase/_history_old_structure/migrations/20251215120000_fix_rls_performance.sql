-- =============================================================================
-- VAGOU - Correção de Performance em RLS (Supabase Linter)
-- =============================================================================
-- Substitui chamadas diretas a auth.uid() e funções de auth por subqueries (SELECT ...)
-- para evitar reavaliação a cada linha (initplan vs filter).
-- =============================================================================

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
CREATE POLICY "Admin can view all profiles" ON public.profiles FOR SELECT USING ((SELECT is_admin(auth.uid())));

-- User Roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING ((SELECT public.has_role(auth.uid(), 'admin')) OR (SELECT public.has_role(auth.uid(), 'superadmin')));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING ((SELECT public.has_role(auth.uid(), 'admin')) OR (SELECT public.has_role(auth.uid(), 'superadmin'))) WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin')) OR (SELECT public.has_role(auth.uid(), 'superadmin')));

-- Configurações do Sistema
DROP POLICY IF EXISTS "Admins can read all configurations" ON public.configuracoes_sistema;
CREATE POLICY "Admins can read all configurations" ON public.configuracoes_sistema FOR SELECT USING ((SELECT is_admin(auth.uid())));

DROP POLICY IF EXISTS "Admin can update configurations" ON public.configuracoes_sistema;
CREATE POLICY "Admin can update configurations" ON public.configuracoes_sistema FOR UPDATE USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- CMEIs
DROP POLICY IF EXISTS "Admin can manage CMEIs" ON public.cmeis;
CREATE POLICY "Admin can manage CMEIs" ON public.cmeis FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- Turmas
DROP POLICY IF EXISTS "Admin can manage turmas" ON public.turmas;
CREATE POLICY "Admin can manage turmas" ON public.turmas FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- Turmas Base
DROP POLICY IF EXISTS "Admin can manage base classes" ON public.turmas_base;
CREATE POLICY "Admin can manage base classes" ON public.turmas_base FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- Crianças
DROP POLICY IF EXISTS "Responsavel can view own children" ON public.criancas;
CREATE POLICY "Responsavel can view own children" ON public.criancas FOR SELECT USING ((SELECT auth.uid()) = responsavel_user_id OR (SELECT is_admin(auth.uid())));

DROP POLICY IF EXISTS "Admin can manage all children" ON public.criancas;
CREATE POLICY "Admin can manage all children" ON public.criancas FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

DROP POLICY IF EXISTS "Responsavel can update own children contact info" ON public.criancas;
CREATE POLICY "Responsavel can update own children contact info" ON public.criancas FOR UPDATE USING ((SELECT auth.uid()) = responsavel_user_id) WITH CHECK ((SELECT auth.uid()) = responsavel_user_id);

-- Histórico
DROP POLICY IF EXISTS "Responsavel can view own children history" ON public.historico;
CREATE POLICY "Responsavel can view own children history" ON public.historico FOR SELECT USING (
  EXISTS (SELECT 1 FROM criancas WHERE criancas.id = historico.crianca_id AND criancas.responsavel_user_id = (SELECT auth.uid())) OR (SELECT is_admin(auth.uid()))
);

DROP POLICY IF EXISTS "Admin can manage history" ON public.historico;
CREATE POLICY "Admin can manage history" ON public.historico FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

DROP POLICY IF EXISTS "Responsavel can insert history for own children" ON public.historico;
CREATE POLICY "Responsavel can insert history for own children" ON public.historico FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM criancas WHERE criancas.id = historico.crianca_id AND criancas.responsavel_user_id = (SELECT auth.uid())));

-- Auditoria
DROP POLICY IF EXISTS "Only admin can view audit logs" ON public.auditoria;
CREATE POLICY "Only admin can view audit logs" ON public.auditoria FOR SELECT USING ((SELECT has_role(auth.uid(), 'admin')) OR (SELECT has_role(auth.uid(), 'superadmin')));

-- Notificações Log
DROP POLICY IF EXISTS "Admin can view all notification logs" ON public.notificacoes_log;
CREATE POLICY "Admin can view all notification logs" ON public.notificacoes_log FOR SELECT USING ((SELECT is_admin(auth.uid())));

DROP POLICY IF EXISTS "Admin can insert notification logs" ON public.notificacoes_log;
CREATE POLICY "Admin can insert notification logs" ON public.notificacoes_log FOR INSERT WITH CHECK ((SELECT is_admin(auth.uid())));

-- Diretor CMEI Vínculo
DROP POLICY IF EXISTS "Admin can manage director bindings" ON public.diretor_cmei_vinculo;
CREATE POLICY "Admin can manage director bindings" ON public.diretor_cmei_vinculo FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

DROP POLICY IF EXISTS "Directors can view own bindings" ON public.diretor_cmei_vinculo;
CREATE POLICY "Directors can view own bindings" ON public.diretor_cmei_vinculo FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- Permissões
DROP POLICY IF EXISTS "Admin can manage permissions" ON public.permissoes;
CREATE POLICY "Admin can manage permissions" ON public.permissoes FOR ALL USING ((SELECT has_role(auth.uid(), 'admin')) OR (SELECT has_role(auth.uid(), 'superadmin'))) WITH CHECK ((SELECT has_role(auth.uid(), 'admin')) OR (SELECT has_role(auth.uid(), 'superadmin')));

-- Role Permissões
DROP POLICY IF EXISTS "Admin can manage role permissions" ON public.role_permissoes;
CREATE POLICY "Admin can manage role permissions" ON public.role_permissoes FOR ALL USING ((SELECT has_role(auth.uid(), 'admin')) OR (SELECT has_role(auth.uid(), 'superadmin'))) WITH CHECK ((SELECT has_role(auth.uid(), 'admin')) OR (SELECT has_role(auth.uid(), 'superadmin')));

-- Documentos Tipos
DROP POLICY IF EXISTS "Admin can manage document types" ON public.documentos_tipos;
CREATE POLICY "Admin can manage document types" ON public.documentos_tipos FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- Documentos Criança
DROP POLICY IF EXISTS "Admin can manage all documents" ON public.documentos_crianca;
CREATE POLICY "Admin can manage all documents" ON public.documentos_crianca FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

DROP POLICY IF EXISTS "Responsavel can view own children documents" ON public.documentos_crianca;
CREATE POLICY "Responsavel can view own children documents" ON public.documentos_crianca FOR SELECT USING (EXISTS (SELECT 1 FROM public.criancas WHERE criancas.id = documentos_crianca.crianca_id AND criancas.responsavel_user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Responsavel can upload documents for own children" ON public.documentos_crianca;
CREATE POLICY "Responsavel can upload documents for own children" ON public.documentos_crianca FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.criancas WHERE criancas.id = crianca_id AND criancas.responsavel_user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Responsavel can update own pending documents" ON public.documentos_crianca;
CREATE POLICY "Responsavel can update own pending documents" ON public.documentos_crianca FOR UPDATE USING (status = 'pendente' AND EXISTS (SELECT 1 FROM public.criancas WHERE criancas.id = documentos_crianca.crianca_id AND criancas.responsavel_user_id = (SELECT auth.uid())));

-- Tipos Prioridade
DROP POLICY IF EXISTS "Admin can manage priority types" ON public.tipos_prioridade;
CREATE POLICY "Admin can manage priority types" ON public.tipos_prioridade FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- Criança Prioridades
DROP POLICY IF EXISTS "Admin can manage child priorities" ON public.crianca_prioridades;
CREATE POLICY "Admin can manage child priorities" ON public.crianca_prioridades FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

DROP POLICY IF EXISTS "Responsavel can view own child priorities" ON public.crianca_prioridades;
CREATE POLICY "Responsavel can view own child priorities" ON public.crianca_prioridades FOR SELECT USING (EXISTS (SELECT 1 FROM criancas WHERE criancas.id = crianca_prioridades.crianca_id AND criancas.responsavel_user_id = (SELECT auth.uid())));

-- Templates Mensagens
DROP POLICY IF EXISTS "Admin can manage templates" ON public.templates_mensagens;
CREATE POLICY "Admin can manage templates" ON public.templates_mensagens FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- Mensagens Status Custom
DROP POLICY IF EXISTS "Admin can manage status messages" ON public.mensagens_status_custom;
CREATE POLICY "Admin can manage status messages" ON public.mensagens_status_custom FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- Feriados Municipais
DROP POLICY IF EXISTS "Admin can manage holidays" ON public.feriados_municipais;
CREATE POLICY "Admin can manage holidays" ON public.feriados_municipais FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- Motivos Padrão
DROP POLICY IF EXISTS "Admin can manage reasons" ON public.motivos_padrao;
CREATE POLICY "Admin can manage reasons" ON public.motivos_padrao FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- Campos Inscrição
DROP POLICY IF EXISTS "Admin can manage form fields" ON public.campos_inscricao;
CREATE POLICY "Admin can manage form fields" ON public.campos_inscricao FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- Campos Inscrição Histórico
DROP POLICY IF EXISTS "Admin can view field history" ON public.campos_inscricao_historico;
CREATE POLICY "Admin can view field history" ON public.campos_inscricao_historico FOR SELECT USING ((SELECT is_admin(auth.uid())));

-- Valores Campos Custom
DROP POLICY IF EXISTS "Admin can manage custom field values" ON public.valores_campos_custom;
CREATE POLICY "Admin can manage custom field values" ON public.valores_campos_custom FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

DROP POLICY IF EXISTS "Responsavel can view own children custom fields" ON public.valores_campos_custom;
CREATE POLICY "Responsavel can view own children custom fields" ON public.valores_campos_custom FOR SELECT USING (EXISTS (SELECT 1 FROM criancas WHERE criancas.id = valores_campos_custom.crianca_id AND criancas.responsavel_user_id = (SELECT auth.uid())));

-- Zonas Atendimento
DROP POLICY IF EXISTS "Admin can manage zones" ON public.zonas_atendimento;
CREATE POLICY "Admin can manage zones" ON public.zonas_atendimento FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- CMEI Zonas
DROP POLICY IF EXISTS "Admin can manage cmei zones" ON public.cmei_zonas;
CREATE POLICY "Admin can manage cmei zones" ON public.cmei_zonas FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- User Preferences
DROP POLICY IF EXISTS "Users can manage own preferences" ON public.user_preferences;
CREATE POLICY "Users can manage own preferences" ON public.user_preferences FOR ALL USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- Planejamento Transição
DROP POLICY IF EXISTS "Admin can manage transition planning" ON public.planejamento_transicao;
CREATE POLICY "Admin can manage transition planning" ON public.planejamento_transicao FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- Chat Mensagens
DROP POLICY IF EXISTS "Admin can manage all chat messages" ON public.chat_mensagens;
CREATE POLICY "Admin can manage all chat messages" ON public.chat_mensagens FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

DROP POLICY IF EXISTS "Responsavel can view own messages" ON public.chat_mensagens;
CREATE POLICY "Responsavel can view own messages" ON public.chat_mensagens FOR SELECT USING (responsavel_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Responsavel can insert own messages" ON public.chat_mensagens;
CREATE POLICY "Responsavel can insert own messages" ON public.chat_mensagens FOR INSERT WITH CHECK (responsavel_id = (SELECT auth.uid()) AND direcao = 'responsavel');

-- Chat Conversas Config
DROP POLICY IF EXISTS "Admin can manage chat config" ON public.chat_conversas_config;
CREATE POLICY "Admin can manage chat config" ON public.chat_conversas_config FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

DROP POLICY IF EXISTS "Responsavel can view own chat config" ON public.chat_conversas_config;
CREATE POLICY "Responsavel can view own chat config" ON public.chat_conversas_config FOR SELECT USING (responsavel_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Responsavel can insert own chat config" ON public.chat_conversas_config;
CREATE POLICY "Responsavel can insert own chat config" ON public.chat_conversas_config FOR INSERT WITH CHECK (responsavel_id = (SELECT auth.uid()));

-- Chat Marcadores
DROP POLICY IF EXISTS "Admin can manage chat labels" ON public.chat_marcadores;
CREATE POLICY "Admin can manage chat labels" ON public.chat_marcadores FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- Chat Conversa Marcadores
DROP POLICY IF EXISTS "Admin can manage conversation labels" ON public.chat_conversa_marcadores;
CREATE POLICY "Admin can manage conversation labels" ON public.chat_conversa_marcadores FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

DROP POLICY IF EXISTS "Responsavel can view own conversation labels" ON public.chat_conversa_marcadores;
CREATE POLICY "Responsavel can view own conversation labels" ON public.chat_conversa_marcadores FOR SELECT USING (responsavel_id = (SELECT auth.uid()));

-- Chat Respostas Rápidas
DROP POLICY IF EXISTS "Admin can manage quick replies" ON public.chat_respostas_rapidas;
CREATE POLICY "Admin can manage quick replies" ON public.chat_respostas_rapidas FOR ALL USING ((SELECT is_admin(auth.uid()))) WITH CHECK ((SELECT is_admin(auth.uid())));

-- Tutoriais
DROP POLICY IF EXISTS "Superadmin can manage tutorials" ON public.tutoriais_videos;
CREATE POLICY "Superadmin can manage tutorials" ON public.tutoriais_videos FOR ALL USING ((SELECT has_role(auth.uid(), 'superadmin'))) WITH CHECK ((SELECT has_role(auth.uid(), 'superadmin')));

DROP POLICY IF EXISTS "Superadmin can manage tutorial sections" ON public.tutorial_secoes;
CREATE POLICY "Superadmin can manage tutorial sections" ON public.tutorial_secoes FOR ALL USING ((SELECT has_role(auth.uid(), 'superadmin'))) WITH CHECK ((SELECT has_role(auth.uid(), 'superadmin')));

DROP POLICY IF EXISTS "Superadmin can manage FAQs" ON public.tutorial_faq;
CREATE POLICY "Superadmin can manage FAQs" ON public.tutorial_faq FOR ALL USING ((SELECT has_role(auth.uid(), 'superadmin'))) WITH CHECK ((SELECT has_role(auth.uid(), 'superadmin')));

DROP POLICY IF EXISTS "Superadmin can manage tips" ON public.tutorial_dicas;
CREATE POLICY "Superadmin can manage tips" ON public.tutorial_dicas FOR ALL USING ((SELECT has_role(auth.uid(), 'superadmin'))) WITH CHECK ((SELECT has_role(auth.uid(), 'superadmin')));
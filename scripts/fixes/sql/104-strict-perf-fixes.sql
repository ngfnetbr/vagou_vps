-- Fixing Admin can manage chat config on chat_conversas_config
DROP POLICY IF EXISTS "Admin can manage chat config" ON public.chat_conversas_config;
CREATE POLICY "Admin can manage chat config" ON public.chat_conversas_config FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage chat labels on chat_marcadores
DROP POLICY IF EXISTS "Admin can manage chat labels" ON public.chat_marcadores;
CREATE POLICY "Admin can manage chat labels" ON public.chat_marcadores FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage form fields on campos_inscricao
DROP POLICY IF EXISTS "Admin can manage form fields" ON public.campos_inscricao;
CREATE POLICY "Admin can manage form fields" ON public.campos_inscricao FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can view field history on campos_inscricao_historico
DROP POLICY IF EXISTS "Admin can view field history" ON public.campos_inscricao_historico;
CREATE POLICY "Admin can view field history" ON public.campos_inscricao_historico FOR SELECT TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage conversation labels on chat_conversa_marcadores
DROP POLICY IF EXISTS "Admin can manage conversation labels" ON public.chat_conversa_marcadores;
CREATE POLICY "Admin can manage conversation labels" ON public.chat_conversa_marcadores FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage director bindings on diretor_cmei_vinculo
DROP POLICY IF EXISTS "Admin can manage director bindings" ON public.diretor_cmei_vinculo;
CREATE POLICY "Admin can manage director bindings" ON public.diretor_cmei_vinculo FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage CMEIs on cmeis
DROP POLICY IF EXISTS "Admin can manage CMEIs" ON public.cmeis;
CREATE POLICY "Admin can manage CMEIs" ON public.cmeis FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can update configurations on configuracoes_sistema
DROP POLICY IF EXISTS "Admin can update configurations" ON public.configuracoes_sistema;
CREATE POLICY "Admin can update configurations" ON public.configuracoes_sistema FOR UPDATE TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admins can read all configurations on configuracoes_sistema
DROP POLICY IF EXISTS "Admins can read all configurations" ON public.configuracoes_sistema;
CREATE POLICY "Admins can read all configurations" ON public.configuracoes_sistema FOR SELECT TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage child priorities on crianca_prioridades
DROP POLICY IF EXISTS "Admin can manage child priorities" ON public.crianca_prioridades;
CREATE POLICY "Admin can manage child priorities" ON public.crianca_prioridades FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage all documents on documentos_crianca
DROP POLICY IF EXISTS "Admin can manage all documents" ON public.documentos_crianca;
CREATE POLICY "Admin can manage all documents" ON public.documentos_crianca FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage holidays on feriados_municipais
DROP POLICY IF EXISTS "Admin can manage holidays" ON public.feriados_municipais;
CREATE POLICY "Admin can manage holidays" ON public.feriados_municipais FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage all children on criancas
DROP POLICY IF EXISTS "Admin can manage all children" ON public.criancas;
CREATE POLICY "Admin can manage all children" ON public.criancas FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Responsavel can view own children on criancas
DROP POLICY IF EXISTS "Responsavel can view own children" ON public.criancas;
CREATE POLICY "Responsavel can view own children" ON public.criancas FOR SELECT TO public USING (((( SELECT auth.uid() AS uid) = responsavel_user_id) OR ( SELECT ( SELECT is_admin((SELECT auth.uid())) AS is_admin) AS is_admin)));

-- Fixing Admin can manage all chat messages on chat_mensagens
DROP POLICY IF EXISTS "Admin can manage all chat messages" ON public.chat_mensagens;
CREATE POLICY "Admin can manage all chat messages" ON public.chat_mensagens FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage quick replies on chat_respostas_rapidas
DROP POLICY IF EXISTS "Admin can manage quick replies" ON public.chat_respostas_rapidas;
CREATE POLICY "Admin can manage quick replies" ON public.chat_respostas_rapidas FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage reasons on motivos_padrao
DROP POLICY IF EXISTS "Admin can manage reasons" ON public.motivos_padrao;
CREATE POLICY "Admin can manage reasons" ON public.motivos_padrao FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can insert notification logs on notificacoes_log
DROP POLICY IF EXISTS "Admin can insert notification logs" ON public.notificacoes_log;
CREATE POLICY "Admin can insert notification logs" ON public.notificacoes_log FOR INSERT TO public WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can view all notification logs on notificacoes_log
DROP POLICY IF EXISTS "Admin can view all notification logs" ON public.notificacoes_log;
CREATE POLICY "Admin can view all notification logs" ON public.notificacoes_log FOR SELECT TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage priority types on tipos_prioridade
DROP POLICY IF EXISTS "Admin can manage priority types" ON public.tipos_prioridade;
CREATE POLICY "Admin can manage priority types" ON public.tipos_prioridade FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage transition planning on planejamento_transicao
DROP POLICY IF EXISTS "Admin can manage transition planning" ON public.planejamento_transicao;
CREATE POLICY "Admin can manage transition planning" ON public.planejamento_transicao FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage templates on templates_mensagens
DROP POLICY IF EXISTS "Admin can manage templates" ON public.templates_mensagens;
CREATE POLICY "Admin can manage templates" ON public.templates_mensagens FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Superadmin can manage tutorials on tutoriais_videos
DROP POLICY IF EXISTS "Superadmin can manage tutorials" ON public.tutoriais_videos;
CREATE POLICY "Superadmin can manage tutorials" ON public.tutoriais_videos FOR ALL TO public USING (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role)) WITH CHECK (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role));

-- Fixing Admin delete zones on zonas_atendimento
DROP POLICY IF EXISTS "Admin delete zones" ON public.zonas_atendimento;
CREATE POLICY "Admin delete zones" ON public.zonas_atendimento FOR DELETE TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin update zones on zonas_atendimento
DROP POLICY IF EXISTS "Admin update zones" ON public.zonas_atendimento;
CREATE POLICY "Admin update zones" ON public.zonas_atendimento FOR UPDATE TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin write zones on zonas_atendimento
DROP POLICY IF EXISTS "Admin write zones" ON public.zonas_atendimento;
CREATE POLICY "Admin write zones" ON public.zonas_atendimento FOR INSERT TO public WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin delete custom values on valores_campos_custom
DROP POLICY IF EXISTS "Admin delete custom values" ON public.valores_campos_custom;
CREATE POLICY "Admin delete custom values" ON public.valores_campos_custom FOR DELETE TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin update custom values on valores_campos_custom
DROP POLICY IF EXISTS "Admin update custom values" ON public.valores_campos_custom;
CREATE POLICY "Admin update custom values" ON public.valores_campos_custom FOR UPDATE TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Superadmin delete tips on tutorial_dicas
DROP POLICY IF EXISTS "Superadmin delete tips" ON public.tutorial_dicas;
CREATE POLICY "Superadmin delete tips" ON public.tutorial_dicas FOR DELETE TO public USING (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role));

-- Fixing Superadmin update tips on tutorial_dicas
DROP POLICY IF EXISTS "Superadmin update tips" ON public.tutorial_dicas;
CREATE POLICY "Superadmin update tips" ON public.tutorial_dicas FOR UPDATE TO public USING (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role)) WITH CHECK (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role));

-- Fixing Superadmin write tips on tutorial_dicas
DROP POLICY IF EXISTS "Superadmin write tips" ON public.tutorial_dicas;
CREATE POLICY "Superadmin write tips" ON public.tutorial_dicas FOR INSERT TO public WITH CHECK (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role));

-- Fixing Admin can manage cmei zones on cmei_zonas
DROP POLICY IF EXISTS "Admin can manage cmei zones" ON public.cmei_zonas;
CREATE POLICY "Admin can manage cmei zones" ON public.cmei_zonas FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage document types on documentos_tipos
DROP POLICY IF EXISTS "Admin can manage document types" ON public.documentos_tipos;
CREATE POLICY "Admin can manage document types" ON public.documentos_tipos FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage status messages on mensagens_status_custom
DROP POLICY IF EXISTS "Admin can manage status messages" ON public.mensagens_status_custom;
CREATE POLICY "Admin can manage status messages" ON public.mensagens_status_custom FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage turmas on turmas
DROP POLICY IF EXISTS "Admin can manage turmas" ON public.turmas;
CREATE POLICY "Admin can manage turmas" ON public.turmas FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Admin can manage base classes on turmas_base
DROP POLICY IF EXISTS "Admin can manage base classes" ON public.turmas_base;
CREATE POLICY "Admin can manage base classes" ON public.turmas_base FOR ALL TO public USING (( SELECT is_admin((SELECT auth.uid())) AS is_admin)) WITH CHECK (( SELECT is_admin((SELECT auth.uid())) AS is_admin));

-- Fixing Superadmin delete FAQs on tutorial_faq
DROP POLICY IF EXISTS "Superadmin delete FAQs" ON public.tutorial_faq;
CREATE POLICY "Superadmin delete FAQs" ON public.tutorial_faq FOR DELETE TO public USING (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role));

-- Fixing Superadmin update FAQs on tutorial_faq
DROP POLICY IF EXISTS "Superadmin update FAQs" ON public.tutorial_faq;
CREATE POLICY "Superadmin update FAQs" ON public.tutorial_faq FOR UPDATE TO public USING (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role)) WITH CHECK (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role));

-- Fixing Superadmin write FAQs on tutorial_faq
DROP POLICY IF EXISTS "Superadmin write FAQs" ON public.tutorial_faq;
CREATE POLICY "Superadmin write FAQs" ON public.tutorial_faq FOR INSERT TO public WITH CHECK (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role));

-- Fixing Superadmin delete tutorial sections on tutorial_secoes
DROP POLICY IF EXISTS "Superadmin delete tutorial sections" ON public.tutorial_secoes;
CREATE POLICY "Superadmin delete tutorial sections" ON public.tutorial_secoes FOR DELETE TO public USING (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role));

-- Fixing Superadmin update tutorial sections on tutorial_secoes
DROP POLICY IF EXISTS "Superadmin update tutorial sections" ON public.tutorial_secoes;
CREATE POLICY "Superadmin update tutorial sections" ON public.tutorial_secoes FOR UPDATE TO public USING (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role)) WITH CHECK (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role));

-- Fixing Superadmin write tutorial sections on tutorial_secoes
DROP POLICY IF EXISTS "Superadmin write tutorial sections" ON public.tutorial_secoes;
CREATE POLICY "Superadmin write tutorial sections" ON public.tutorial_secoes FOR INSERT TO public WITH CHECK (( SELECT has_role((SELECT auth.uid()), 'superadmin'::app_role) AS has_role));

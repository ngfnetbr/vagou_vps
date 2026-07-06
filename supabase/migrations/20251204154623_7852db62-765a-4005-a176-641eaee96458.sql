-- ===========================================
-- FASE 1: Templates de Mensagens
-- ===========================================

-- Tabela de templates de mensagens personalizáveis
CREATE TABLE public.templates_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL, -- convocacao, matricula_confirmada, lembrete, inscricao_realizada, etc.
  titulo TEXT NOT NULL,
  descricao TEXT,
  assunto_email TEXT,
  corpo_email TEXT,
  corpo_sms TEXT,
  corpo_whatsapp TEXT,
  variaveis_disponiveis JSONB DEFAULT '[]'::jsonb,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Tabela de mensagens customizadas por status
CREATE TABLE public.mensagens_status_custom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL UNIQUE,
  titulo_exibicao TEXT NOT NULL,
  mensagem_responsavel TEXT,
  cor_badge TEXT DEFAULT '#3b82f6',
  icone TEXT DEFAULT 'clock',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para templates_mensagens
ALTER TABLE public.templates_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage templates" ON public.templates_mensagens
FOR ALL USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Anyone can view active templates" ON public.templates_mensagens
FOR SELECT USING (ativo = true);

-- RLS para mensagens_status_custom
ALTER TABLE public.mensagens_status_custom ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage status messages" ON public.mensagens_status_custom
FOR ALL USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Anyone can view active status messages" ON public.mensagens_status_custom
FOR SELECT USING (ativo = true);

-- Inserir templates padrão
INSERT INTO public.templates_mensagens (tipo, titulo, descricao, assunto_email, corpo_email, corpo_whatsapp, variaveis_disponiveis) VALUES
('inscricao_realizada', 'Inscrição Realizada', 'Enviado após nova inscrição na fila', 
 'Inscrição realizada - {{crianca_nome}}',
 '<h2>Olá, {{responsavel_nome}}!</h2><p>A inscrição de <strong>{{crianca_nome}}</strong> foi realizada com sucesso.</p><p><strong>Posição na fila:</strong> {{posicao_fila}}</p><p><strong>Turma compatível:</strong> {{turma_nome}}</p><p>Acompanhe sua posição pelo sistema.</p>',
 '✅ *Inscrição realizada!*\n\nOlá, {{responsavel_nome}}!\n\nA inscrição de *{{crianca_nome}}* foi confirmada.\n\n📍 Posição na fila: *{{posicao_fila}}*\n📚 Turma: {{turma_nome}}\n\nAcompanhe pelo sistema.',
 '["crianca_nome", "responsavel_nome", "posicao_fila", "turma_nome", "data_inscricao"]'::jsonb),

('convocacao', 'Convocação para Matrícula', 'Enviado quando criança é convocada',
 'CONVOCAÇÃO - Vaga disponível para {{crianca_nome}}',
 '<h2>Parabéns, {{responsavel_nome}}!</h2><p><strong>{{crianca_nome}}</strong> foi convocada para uma vaga!</p><p><strong>CMEI:</strong> {{cmei_nome}}</p><p><strong>Turma:</strong> {{turma_nome}}</p><p><strong>Prazo para resposta:</strong> {{data_limite}}</p><p style="color: red;"><strong>IMPORTANTE:</strong> Compareça à secretaria com os documentos necessários até a data limite.</p>',
 '🎉 *CONVOCAÇÃO!*\n\nOlá, {{responsavel_nome}}!\n\n*{{crianca_nome}}* foi convocada!\n\n🏫 CMEI: {{cmei_nome}}\n📚 Turma: {{turma_nome}}\n📅 Prazo: *{{data_limite}}*\n\n⚠️ Compareça com os documentos até a data limite!',
 '["crianca_nome", "responsavel_nome", "cmei_nome", "turma_nome", "data_limite", "prazo_dias", "endereco_cmei"]'::jsonb),

('lembrete_prazo', 'Lembrete de Prazo', 'Enviado dias antes do vencimento do prazo',
 'LEMBRETE - Prazo vencendo para {{crianca_nome}}',
 '<h2>Atenção, {{responsavel_nome}}!</h2><p>O prazo para confirmar a matrícula de <strong>{{crianca_nome}}</strong> está acabando.</p><p><strong>Dias restantes:</strong> {{dias_restantes}}</p><p><strong>Data limite:</strong> {{data_limite}}</p><p>Compareça à secretaria para não perder a vaga!</p>',
 '⏰ *LEMBRETE DE PRAZO*\n\nOlá, {{responsavel_nome}}!\n\nO prazo para *{{crianca_nome}}* está acabando!\n\n⏳ Dias restantes: *{{dias_restantes}}*\n📅 Data limite: {{data_limite}}\n\nNão perca a vaga!',
 '["crianca_nome", "responsavel_nome", "dias_restantes", "data_limite", "cmei_nome"]'::jsonb),

('matricula_confirmada', 'Matrícula Confirmada', 'Enviado após confirmação da matrícula',
 'Matrícula confirmada - {{crianca_nome}}',
 '<h2>Matrícula Confirmada!</h2><p>Olá, {{responsavel_nome}}!</p><p>A matrícula de <strong>{{crianca_nome}}</strong> foi confirmada com sucesso!</p><p><strong>CMEI:</strong> {{cmei_nome}}</p><p><strong>Turma:</strong> {{turma_nome}}</p><p>Aguarde informações sobre o início das aulas.</p>',
 '✅ *MATRÍCULA CONFIRMADA!*\n\nOlá, {{responsavel_nome}}!\n\nA matrícula de *{{crianca_nome}}* foi confirmada!\n\n🏫 CMEI: {{cmei_nome}}\n📚 Turma: {{turma_nome}}\n\nAguarde informações sobre o início.',
 '["crianca_nome", "responsavel_nome", "cmei_nome", "turma_nome", "turno"]'::jsonb),

('documentacao_pendente', 'Documentação Pendente', 'Enviado quando há documentos faltando',
 'Documentação pendente - {{crianca_nome}}',
 '<h2>Documentação Pendente</h2><p>Olá, {{responsavel_nome}}!</p><p>Para concluir o processo de <strong>{{crianca_nome}}</strong>, precisamos dos seguintes documentos:</p><p>{{lista_documentos}}</p><p>Envie pelo sistema ou compareça à secretaria.</p>',
 '📄 *DOCUMENTAÇÃO PENDENTE*\n\nOlá, {{responsavel_nome}}!\n\nPara *{{crianca_nome}}*, precisamos de:\n\n{{lista_documentos}}\n\nEnvie pelo sistema ou compareça à secretaria.',
 '["crianca_nome", "responsavel_nome", "lista_documentos"]'::jsonb),

('fim_fila', 'Movido para Fim da Fila', 'Enviado quando criança vai para fim da fila',
 'Atualização na fila - {{crianca_nome}}',
 '<h2>Atualização de Posição</h2><p>Olá, {{responsavel_nome}}!</p><p><strong>{{crianca_nome}}</strong> foi movida para o fim da fila devido a: {{motivo}}</p><p><strong>Nova posição:</strong> {{posicao_fila}}</p><p>Entre em contato se precisar de mais informações.</p>',
 '📍 *ATUALIZAÇÃO NA FILA*\n\nOlá, {{responsavel_nome}}!\n\n*{{crianca_nome}}* foi movida para o fim da fila.\n\nMotivo: {{motivo}}\nNova posição: {{posicao_fila}}\n\nDúvidas? Entre em contato.',
 '["crianca_nome", "responsavel_nome", "motivo", "posicao_fila"]'::jsonb),

('remanejamento_solicitado', 'Remanejamento Solicitado', 'Confirmação de solicitação de remanejamento',
 'Remanejamento solicitado - {{crianca_nome}}',
 '<h2>Solicitação Recebida</h2><p>Olá, {{responsavel_nome}}!</p><p>Recebemos sua solicitação de remanejamento para <strong>{{crianca_nome}}</strong>.</p><p><strong>CMEI solicitado:</strong> {{cmei_destino}}</p><p>Você será notificado quando houver vaga disponível.</p>',
 '📝 *REMANEJAMENTO SOLICITADO*\n\nOlá, {{responsavel_nome}}!\n\nRecebemos a solicitação de remanejamento de *{{crianca_nome}}*.\n\n🏫 CMEI desejado: {{cmei_destino}}\n\nAvisaremos quando houver vaga!',
 '["crianca_nome", "responsavel_nome", "cmei_atual", "cmei_destino"]'::jsonb),

('remanejamento_concluido', 'Remanejamento Concluído', 'Enviado quando remanejamento é efetivado',
 'Remanejamento concluído - {{crianca_nome}}',
 '<h2>Remanejamento Concluído!</h2><p>Olá, {{responsavel_nome}}!</p><p>O remanejamento de <strong>{{crianca_nome}}</strong> foi concluído!</p><p><strong>Novo CMEI:</strong> {{cmei_nome}}</p><p><strong>Nova turma:</strong> {{turma_nome}}</p>',
 '✅ *REMANEJAMENTO CONCLUÍDO!*\n\nOlá, {{responsavel_nome}}!\n\nO remanejamento de *{{crianca_nome}}* foi concluído!\n\n🏫 Novo CMEI: {{cmei_nome}}\n📚 Turma: {{turma_nome}}',
 '["crianca_nome", "responsavel_nome", "cmei_nome", "turma_nome"]'::jsonb);

-- Inserir mensagens padrão por status
INSERT INTO public.mensagens_status_custom (status, titulo_exibicao, mensagem_responsavel, cor_badge, icone) VALUES
('Fila de Espera', 'Na Fila de Espera', 'Sua criança está na posição {{posicao_fila}} da fila de espera. Você será notificado quando houver uma vaga disponível.', '#6366f1', 'clock'),
('Convocado', 'Convocado', 'Parabéns! Sua criança foi convocada para uma vaga. Compareça até {{data_limite}} com os documentos necessários.', '#22c55e', 'bell'),
('Aguardando Documentação', 'Aguardando Documentação', 'Estamos aguardando o envio dos documentos pendentes para dar continuidade ao processo.', '#f59e0b', 'file-text'),
('Aguardando Assinatura', 'Aguardando Assinatura', 'Compareça à secretaria para assinar os documentos de matrícula até {{data_limite}}.', '#8b5cf6', 'pen-tool'),
('Matriculado', 'Matriculado', 'Matrícula confirmada! Aguarde informações sobre o início das atividades.', '#10b981', 'check-circle'),
('Matriculada', 'Matriculada', 'Matrícula confirmada! Aguarde informações sobre o início das atividades.', '#10b981', 'check-circle'),
('Remanejamento Solicitado', 'Remanejamento Solicitado', 'Sua solicitação de remanejamento foi registrada. Você será notificado quando houver vaga no CMEI desejado.', '#0ea5e9', 'refresh-cw'),
('Desistente', 'Desistente', 'A inscrição foi marcada como desistente. Entre em contato com a secretaria se desejar reativar.', '#ef4444', 'x-circle'),
('Recusada', 'Recusada', 'A vaga foi recusada. Entre em contato com a secretaria para mais informações.', '#dc2626', 'x'),
('Concluinte', 'Concluinte', 'A criança concluiu o ciclo na educação infantil. Parabéns!', '#14b8a6', 'graduation-cap'),
('Transferido', 'Transferido', 'A criança foi transferida. Entre em contato com a secretaria para mais informações.', '#64748b', 'arrow-right'),
('Matrícula Trancada', 'Matrícula Trancada', 'A matrícula está temporariamente trancada. Entre em contato com a secretaria para reativar.', '#94a3b8', 'lock');

-- ===========================================
-- FASE 2: Modo de Operação e Horários
-- ===========================================

-- Adicionar campos de modo de operação em configuracoes_sistema
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS modo_manutencao BOOLEAN DEFAULT false;
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS mensagem_manutencao TEXT DEFAULT 'Sistema em manutenção. Tente novamente mais tarde.';
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS ano_letivo_atual INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER;
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS permitir_edicao_apos_inscricao BOOLEAN DEFAULT true;
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS bloquear_novas_inscricoes BOOLEAN DEFAULT false;
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS motivo_bloqueio_inscricoes TEXT;
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS horario_inicio_atendimento TIME DEFAULT '08:00';
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS horario_fim_atendimento TIME DEFAULT '17:00';
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS bloquear_fora_horario BOOLEAN DEFAULT false;
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS mensagem_fora_horario TEXT DEFAULT 'O sistema está disponível apenas em horário comercial.';

-- Tabela de feriados municipais
CREATE TABLE public.feriados_municipais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  data DATE NOT NULL,
  recorrente BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.feriados_municipais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage holidays" ON public.feriados_municipais
FOR ALL USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Anyone can view active holidays" ON public.feriados_municipais
FOR SELECT USING (ativo = true);

-- ===========================================
-- FASE 3: Regras de Workflow
-- ===========================================

-- Adicionar campos de workflow em configuracoes_sistema
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS max_tentativas_convocacao INTEGER DEFAULT 2;
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS estrategia_prazo_vencido TEXT DEFAULT 'fim_fila';
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS intervalo_reenvio_notificacao INTEGER DEFAULT 3;
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS usar_dias_uteis BOOLEAN DEFAULT false;
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS permitir_transferencia BOOLEAN DEFAULT true;
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS periodo_carencia_transferencia INTEGER DEFAULT 30;
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS exigir_justificativa_transferencia BOOLEAN DEFAULT true;
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS aprovar_transferencia_automatico BOOLEAN DEFAULT false;
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS permitir_remanejamento BOOLEAN DEFAULT true;
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS limite_remanejamentos_ano INTEGER DEFAULT 2;
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS exigir_justificativa_remanejamento BOOLEAN DEFAULT true;

-- Tabela de motivos padrão
CREATE TABLE public.motivos_padrao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL, -- desistencia, recusa, transferencia, remanejamento, fim_fila
  descricao TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.motivos_padrao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage reasons" ON public.motivos_padrao
FOR ALL USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Anyone can view active reasons" ON public.motivos_padrao
FOR SELECT USING (ativo = true);

-- Inserir motivos padrão
INSERT INTO public.motivos_padrao (tipo, descricao, ordem) VALUES
('desistencia', 'Mudança de endereço', 1),
('desistencia', 'Optou por outra instituição', 2),
('desistencia', 'Motivos pessoais/familiares', 3),
('desistencia', 'Não compareceu no prazo', 4),
('recusa', 'CMEI não atende às necessidades', 1),
('recusa', 'Distância do CMEI', 2),
('recusa', 'Horário incompatível', 3),
('recusa', 'Optou aguardar vaga em outro CMEI', 4),
('transferencia', 'Mudança de endereço', 1),
('transferencia', 'Proximidade do trabalho', 2),
('transferencia', 'Mudança de horário', 3),
('remanejamento', 'Proximidade da residência', 1),
('remanejamento', 'Proximidade do trabalho', 2),
('remanejamento', 'Irmão(s) no CMEI desejado', 3),
('fim_fila', 'Não compareceu à convocação', 1),
('fim_fila', 'Documentação incompleta', 2),
('fim_fila', 'Solicitação do responsável', 3);

-- ===========================================
-- FASE 4: Campos de Formulário Configuráveis
-- ===========================================

-- Tabela de campos configuráveis do formulário de inscrição
CREATE TABLE public.campos_inscricao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secao TEXT NOT NULL, -- crianca, responsavel, endereco, preferencias, observacoes
  nome_campo TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  tipo TEXT NOT NULL, -- text, number, select, checkbox, date, textarea, cpf, phone, cep, email
  placeholder TEXT,
  obrigatorio BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  opcoes JSONB, -- Para select: [{"value": "M", "label": "Masculino"}]
  validacao JSONB, -- {min: 1, max: 100, pattern: '...', mensagem_erro: '...'}
  mascara TEXT, -- cpf, phone, cep
  campo_sistema BOOLEAN DEFAULT false, -- Campos do sistema não podem ser removidos
  visivel_responsavel BOOLEAN DEFAULT true, -- Visível na área do responsável
  editavel_apos_inscricao BOOLEAN DEFAULT true,
  dica TEXT, -- Texto de ajuda
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela para valores de campos customizados
CREATE TABLE public.valores_campos_custom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crianca_id UUID NOT NULL REFERENCES public.criancas(id) ON DELETE CASCADE,
  campo_id UUID NOT NULL REFERENCES public.campos_inscricao(id) ON DELETE CASCADE,
  valor TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(crianca_id, campo_id)
);

ALTER TABLE public.campos_inscricao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valores_campos_custom ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage form fields" ON public.campos_inscricao
FOR ALL USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Anyone can view active form fields" ON public.campos_inscricao
FOR SELECT USING (ativo = true);

CREATE POLICY "Admin can manage custom values" ON public.valores_campos_custom
FOR ALL USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Responsavel can view own custom values" ON public.valores_campos_custom
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.criancas 
    WHERE criancas.id = valores_campos_custom.crianca_id 
    AND criancas.responsavel_user_id = auth.uid()
  )
);

CREATE POLICY "Public can insert custom values" ON public.valores_campos_custom
FOR INSERT WITH CHECK (true);

-- Inserir campos padrão do sistema
INSERT INTO public.campos_inscricao (secao, nome_campo, label, tipo, placeholder, obrigatorio, campo_sistema, ordem, mascara, dica) VALUES
-- Seção Criança
('crianca', 'nome', 'Nome completo da criança', 'text', 'Nome completo', true, true, 1, NULL, 'Digite o nome completo conforme certidão de nascimento'),
('crianca', 'data_nascimento', 'Data de nascimento', 'date', NULL, true, true, 2, NULL, NULL),
('crianca', 'sexo', 'Sexo', 'select', NULL, true, true, 3, NULL, NULL),
('crianca', 'cpf_crianca', 'CPF da criança', 'cpf', '000.000.000-00', false, true, 4, 'cpf', 'Opcional'),
('crianca', 'certidao_nascimento', 'Número da certidão de nascimento', 'text', 'Número da certidão', false, true, 5, NULL, NULL),
('crianca', 'programas_sociais', 'Participa de programas sociais?', 'checkbox', NULL, false, true, 6, NULL, 'Bolsa Família, BPC, etc.'),
-- Seção Responsável
('responsavel', 'responsavel_nome', 'Nome do responsável', 'text', 'Nome completo', true, true, 1, NULL, NULL),
('responsavel', 'responsavel_cpf', 'CPF do responsável', 'cpf', '000.000.000-00', true, true, 2, 'cpf', NULL),
('responsavel', 'responsavel_telefone', 'Telefone/WhatsApp', 'phone', '(00) 00000-0000', true, true, 3, 'phone', 'Número principal para contato'),
('responsavel', 'responsavel_celular', 'Telefone alternativo', 'phone', '(00) 00000-0000', false, true, 4, 'phone', NULL),
('responsavel', 'responsavel_email', 'E-mail', 'email', 'email@exemplo.com', false, true, 5, NULL, NULL),
-- Seção Endereço
('endereco', 'cep', 'CEP', 'cep', '00000-000', true, true, 1, 'cep', 'Digite o CEP para preenchimento automático'),
('endereco', 'logradouro', 'Logradouro', 'text', 'Rua, Avenida...', true, true, 2, NULL, NULL),
('endereco', 'numero', 'Número', 'text', 'Nº', true, true, 3, NULL, NULL),
('endereco', 'complemento', 'Complemento', 'text', 'Apto, Bloco...', false, true, 4, NULL, NULL),
('endereco', 'bairro', 'Bairro', 'text', 'Bairro', true, true, 5, NULL, NULL),
('endereco', 'cidade', 'Cidade', 'text', 'Cidade', true, true, 6, NULL, NULL),
('endereco', 'estado', 'Estado', 'text', 'UF', true, true, 7, NULL, NULL),
-- Seção Preferências
('preferencias', 'cmei1_preferencia', 'CMEI de 1ª preferência', 'select', NULL, false, true, 1, NULL, 'Escolha o CMEI mais próximo ou de sua preferência'),
('preferencias', 'cmei2_preferencia', 'CMEI de 2ª preferência', 'select', NULL, false, true, 2, NULL, NULL),
('preferencias', 'aceita_qualquer_cmei', 'Aceita vaga em qualquer CMEI?', 'checkbox', NULL, false, true, 3, NULL, 'Aumenta suas chances de conseguir uma vaga'),
-- Seção Observações
('observacoes', 'observacoes', 'Observações', 'textarea', 'Informações adicionais...', false, true, 1, NULL, 'Inclua informações relevantes como necessidades especiais, alergias, etc.');

-- Adicionar opções para o campo sexo
UPDATE public.campos_inscricao 
SET opcoes = '[{"value": "Masculino", "label": "Masculino"}, {"value": "Feminino", "label": "Feminino"}]'::jsonb
WHERE nome_campo = 'sexo';

-- ===========================================
-- FASE 5: Sistema de Prioridades Avançado
-- ===========================================

-- Tabela de tipos de prioridade configuráveis
CREATE TABLE public.tipos_prioridade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  codigo TEXT NOT NULL UNIQUE, -- social, remanejamento, irmao, proximidade, etc.
  peso INTEGER DEFAULT 1, -- Maior = mais prioridade
  cor TEXT DEFAULT '#3b82f6',
  icone TEXT DEFAULT 'star',
  exige_documento BOOLEAN DEFAULT false,
  documento_tipo_id UUID REFERENCES public.documentos_tipos(id),
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de prioridades atribuídas às crianças
CREATE TABLE public.crianca_prioridades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crianca_id UUID NOT NULL REFERENCES public.criancas(id) ON DELETE CASCADE,
  prioridade_id UUID NOT NULL REFERENCES public.tipos_prioridade(id) ON DELETE CASCADE,
  documento_comprovante_url TEXT,
  status TEXT DEFAULT 'pendente', -- pendente, aprovado, recusado
  aprovado_por UUID,
  aprovado_em TIMESTAMPTZ,
  motivo_recusa TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(crianca_id, prioridade_id)
);

ALTER TABLE public.tipos_prioridade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crianca_prioridades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage priority types" ON public.tipos_prioridade
FOR ALL USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Anyone can view active priority types" ON public.tipos_prioridade
FOR SELECT USING (ativo = true);

CREATE POLICY "Admin can manage child priorities" ON public.crianca_prioridades
FOR ALL USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Responsavel can view own child priorities" ON public.crianca_prioridades
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.criancas 
    WHERE criancas.id = crianca_prioridades.crianca_id 
    AND criancas.responsavel_user_id = auth.uid()
  )
);

CREATE POLICY "Public can insert child priorities" ON public.crianca_prioridades
FOR INSERT WITH CHECK (true);

-- Inserir tipos de prioridade padrão
INSERT INTO public.tipos_prioridade (nome, descricao, codigo, peso, cor, icone, exige_documento, ordem) VALUES
('Prioridade Social', 'Famílias em programas sociais (Bolsa Família, BPC, etc.)', 'social', 10, '#ef4444', 'heart', true, 1),
('Remanejamento', 'Criança já matriculada solicitando troca de CMEI', 'remanejamento', 8, '#8b5cf6', 'refresh-cw', false, 2),
('Irmão Matriculado', 'Possui irmão(s) já matriculado(s) no CMEI', 'irmao', 5, '#f59e0b', 'users', false, 3),
('Proximidade', 'Reside na zona de atendimento do CMEI', 'proximidade', 3, '#22c55e', 'map-pin', false, 4),
('Necessidades Especiais', 'Criança com necessidades especiais', 'pne', 15, '#0ea5e9', 'accessibility', true, 5);

-- ===========================================
-- FASE 6: Personalização de Interface
-- ===========================================

-- Adicionar campos de personalização em configuracoes_sistema
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS modo_visualizacao_fila TEXT DEFAULT 'tabela';
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS densidade_tabela TEXT DEFAULT 'normal';
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS itens_por_pagina INTEGER DEFAULT 25;
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS mostrar_foto_crianca BOOLEAN DEFAULT false;
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS tema_padrao TEXT DEFAULT 'system';
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS permitir_troca_tema BOOLEAN DEFAULT true;
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS colunas_visiveis_fila JSONB DEFAULT '["posicao", "nome", "idade", "turma", "status", "prioridade", "data_inscricao"]'::jsonb;
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS widgets_dashboard JSONB DEFAULT '["estatisticas", "convocacoes_recentes", "ocupacao", "fila_evolucao"]'::jsonb;

-- Tabela de preferências do usuário
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  tema TEXT DEFAULT 'system',
  densidade_tabela TEXT DEFAULT 'normal',
  itens_por_pagina INTEGER DEFAULT 25,
  colunas_personalizadas JSONB,
  sidebar_collapsed BOOLEAN DEFAULT false,
  notificacoes_som BOOLEAN DEFAULT true,
  notificacoes_toast BOOLEAN DEFAULT true,
  idioma TEXT DEFAULT 'pt-BR',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences" ON public.user_preferences
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- FASE 7: Geolocalização e Zoneamento
-- ===========================================

-- Adicionar coordenadas aos CMEIs
ALTER TABLE public.cmeis ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.cmeis ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Adicionar campos de zoneamento em configuracoes_sistema
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS habilitar_zoneamento BOOLEAN DEFAULT false;
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS priorizar_zona BOOLEAN DEFAULT true;
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS mostrar_distancia BOOLEAN DEFAULT false;
ALTER TABLE public.configuracoes_sistema ADD COLUMN IF NOT EXISTS raio_proximidade_km NUMERIC DEFAULT 2;

-- Tabela de zonas de atendimento
CREATE TABLE public.zonas_atendimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT DEFAULT '#3b82f6',
  bairros TEXT[], -- Lista de bairros
  ceps TEXT[], -- Lista de CEPs ou prefixos
  poligono JSONB, -- GeoJSON para área no mapa
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de vínculo CMEI-Zona
CREATE TABLE public.cmei_zonas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cmei_id UUID NOT NULL REFERENCES public.cmeis(id) ON DELETE CASCADE,
  zona_id UUID NOT NULL REFERENCES public.zonas_atendimento(id) ON DELETE CASCADE,
  prioridade INTEGER DEFAULT 1, -- 1 = zona principal
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cmei_id, zona_id)
);

ALTER TABLE public.zonas_atendimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmei_zonas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage zones" ON public.zonas_atendimento
FOR ALL USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Anyone can view active zones" ON public.zonas_atendimento
FOR SELECT USING (ativo = true);

CREATE POLICY "Admin can manage cmei zones" ON public.cmei_zonas
FOR ALL USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Anyone can view cmei zones" ON public.cmei_zonas
FOR SELECT USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_templates_mensagens_updated_at BEFORE UPDATE ON public.templates_mensagens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mensagens_status_custom_updated_at BEFORE UPDATE ON public.mensagens_status_custom
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campos_inscricao_updated_at BEFORE UPDATE ON public.campos_inscricao
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_valores_campos_custom_updated_at BEFORE UPDATE ON public.valores_campos_custom
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tipos_prioridade_updated_at BEFORE UPDATE ON public.tipos_prioridade
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crianca_prioridades_updated_at BEFORE UPDATE ON public.crianca_prioridades
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_zonas_atendimento_updated_at BEFORE UPDATE ON public.zonas_atendimento
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
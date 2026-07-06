-- =============================================================================
-- VAGOU - Dados Iniciais do Sistema
-- =============================================================================
-- Execute APÓS os scripts 01 e 02
-- =============================================================================

-- Inserir configuração inicial do sistema
INSERT INTO public.configuracoes_sistema (registro_unico, nome_municipio, nome_secretaria, email_contato, telefone_contato, prazo_resposta_dias)
VALUES (true, 'Município', 'Secretaria Municipal de Educação', 'educacao@municipio.gov.br', '(00) 0000-0000', 15)
ON CONFLICT (registro_unico) WHERE registro_unico = true DO UPDATE SET
  nome_municipio = EXCLUDED.nome_municipio,
  nome_secretaria = EXCLUDED.nome_secretaria,
  email_contato = EXCLUDED.email_contato,
  telefone_contato = EXCLUDED.telefone_contato,
  prazo_resposta_dias = EXCLUDED.prazo_resposta_dias;

-- Turmas Base
INSERT INTO public.turmas_base (nome, idade_minima_meses, idade_maxima_meses, descricao, ordem) VALUES
('Infantil 0', 0, 11, '0 anos na data de corte (31/03)', 1),
('Infantil 1', 12, 23, '1 ano na data de corte (31/03)', 2),
('Infantil 2', 24, 35, '2 anos na data de corte (31/03)', 3),
('Infantil 3', 36, 47, '3 anos na data de corte (31/03)', 4)
ON CONFLICT (nome) DO NOTHING;

-- Tipos de Documentos
INSERT INTO public.documentos_tipos (nome, descricao, obrigatorio, ordem) VALUES
('Certidão de Nascimento', 'Cópia da certidão de nascimento da criança', true, 1),
('Comprovante de Residência', 'Conta de luz, água ou telefone recente', true, 2),
('CPF do Responsável', 'Cópia do CPF do responsável legal', true, 3),
('RG do Responsável', 'Cópia do RG do responsável legal', true, 4),
('Cartão de Vacina', 'Carteira de vacinação atualizada', true, 5),
('Comprovante de Programa Social', 'Para famílias cadastradas em programas sociais', false, 6)
ON CONFLICT DO NOTHING;

-- Tipos de Prioridade
INSERT INTO public.tipos_prioridade (nome, descricao, codigo, peso, cor, icone, exige_documento, ordem) VALUES
('Pessoa com Deficiência', 'Criança com deficiência comprovada', 'pcd', 20, '#dc2626', 'heart', true, 1),
('Bolsa Família', 'Família beneficiária do Bolsa Família', 'bolsa_familia', 15, '#ea580c', 'coins', true, 2),
('Remanejamento', 'Criança já matriculada solicitando troca', 'remanejamento', 10, '#8b5cf6', 'refresh-cw', false, 3),
('Irmão Matriculado', 'Possui irmão(s) no CMEI', 'irmao', 5, '#f59e0b', 'users', false, 4)
ON CONFLICT (codigo) DO NOTHING;

-- Motivos Padrão
INSERT INTO public.motivos_padrao (tipo, descricao, ordem) VALUES
('desistencia', 'Mudança de endereço', 1),
('desistencia', 'Optou por outra instituição', 2),
('desistencia', 'Motivos pessoais/familiares', 3),
('desistencia', 'Não compareceu no prazo', 4),
('recusa', 'CMEI não atende às necessidades', 1),
('recusa', 'Distância do CMEI', 2),
('recusa', 'Horário incompatível', 3),
('remanejamento', 'Proximidade da residência', 1),
('remanejamento', 'Proximidade do trabalho', 2),
('remanejamento', 'Irmão(s) no CMEI desejado', 3),
('transferencia', 'Mudança de endereço', 1),
('transferencia', 'Proximidade do trabalho', 2),
('fim_fila', 'Não compareceu à convocação', 1),
('fim_fila', 'Documentação incompleta', 2)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- TEMPLATES DE MENSAGENS (Completos)
-- =============================================================================
INSERT INTO public.templates_mensagens (tipo, titulo, descricao, assunto_email, corpo_email, corpo_sms, corpo_whatsapp, variaveis_disponiveis, ordem) VALUES
(
  'convocacao', 
  'Convocação para Matrícula', 
  'Enviado quando uma criança é convocada para matrícula',
  'Convocação para Matrícula - {{cmei_nome}}',
  '<h2>Convocação para Matrícula</h2><p>Olá, {{responsavel_nome}}!</p><p><strong>{{crianca_nome}}</strong> foi convocada para matrícula!</p><p><strong>CMEI:</strong> {{cmei_nome}}<br><strong>Turma:</strong> {{turma_nome}}<br><strong>Prazo:</strong> {{data_limite}}</p><p>Compareça à unidade com os documentos necessários.</p>',
  'CONVOCACAO! {{crianca_nome}} foi convocada para {{cmei_nome}}. Prazo: {{data_limite}}. Compareça com documentos.',
  '🎉 *CONVOCAÇÃO!*\n\nOlá, {{responsavel_nome}}!\n\n*{{crianca_nome}}* foi convocada!\n\n🏫 CMEI: {{cmei_nome}}\n📚 Turma: {{turma_nome}}\n📅 Prazo: *{{data_limite}}*\n\n⚠️ Compareça com os documentos!',
  '["crianca_nome", "responsavel_nome", "cmei_nome", "turma_nome", "data_limite"]',
  1
),
(
  'matricula_confirmada', 
  'Matrícula Confirmada', 
  'Enviado quando a matrícula é confirmada',
  'Matrícula Confirmada - {{cmei_nome}}',
  '<h2>Matrícula Confirmada</h2><p>Olá, {{responsavel_nome}}!</p><p>A matrícula de <strong>{{crianca_nome}}</strong> foi confirmada com sucesso!</p><p><strong>CMEI:</strong> {{cmei_nome}}<br><strong>Turma:</strong> {{turma_nome}}</p><p>Parabéns! Aguardamos vocês no início do período letivo.</p>',
  'Matricula de {{crianca_nome}} confirmada no {{cmei_nome}}! Turma: {{turma_nome}}.',
  '✅ *MATRÍCULA CONFIRMADA!*\n\nOlá, {{responsavel_nome}}!\n\nA matrícula de *{{crianca_nome}}* foi confirmada!\n\n🏫 CMEI: {{cmei_nome}}\n📚 Turma: {{turma_nome}}\n\n🎉 Parabéns!',
  '["crianca_nome", "responsavel_nome", "cmei_nome", "turma_nome"]',
  2
),
(
  'lembrete_prazo', 
  'Lembrete de Prazo', 
  'Enviado dias antes do prazo de convocação expirar',
  'Lembrete: Prazo de Matrícula - {{crianca_nome}}',
  '<h2>Lembrete de Prazo</h2><p>Olá, {{responsavel_nome}}!</p><p>O prazo para efetivação da matrícula de <strong>{{crianca_nome}}</strong> está acabando!</p><p><strong>Dias restantes:</strong> {{dias_restantes}}<br><strong>Data limite:</strong> {{data_limite}}</p><p>Não perca a vaga!</p>',
  'LEMBRETE: Prazo de {{crianca_nome}} expira em {{dias_restantes}} dias ({{data_limite}}). Nao perca a vaga!',
  '⏰ *LEMBRETE*\n\nOlá, {{responsavel_nome}}!\n\nO prazo para *{{crianca_nome}}* está acabando!\n\n⏳ Dias restantes: *{{dias_restantes}}*\n📅 Data limite: {{data_limite}}\n\n⚠️ Não perca a vaga!',
  '["crianca_nome", "responsavel_nome", "dias_restantes", "data_limite"]',
  3
),
(
  'inscricao_realizada', 
  'Inscrição Realizada', 
  'Enviado após a inscrição ser concluída com sucesso',
  'Inscrição Realizada com Sucesso',
  '<h2>Inscrição Realizada</h2><p>Olá, {{responsavel_nome}}!</p><p>A inscrição de <strong>{{crianca_nome}}</strong> foi realizada com sucesso!</p><p><strong>Protocolo:</strong> {{protocolo}}<br><strong>Data:</strong> {{data_inscricao}}</p><p>Acompanhe sua posição na fila pelo nosso sistema.</p>',
  'Inscricao de {{crianca_nome}} realizada! Protocolo: {{protocolo}}. Acompanhe sua posicao no sistema.',
  '📝 *INSCRIÇÃO REALIZADA!*\n\nOlá, {{responsavel_nome}}!\n\nA inscrição de *{{crianca_nome}}* foi concluída!\n\n🔢 Protocolo: {{protocolo}}\n📅 Data: {{data_inscricao}}\n\n📊 Acompanhe sua posição na fila pelo sistema.',
  '["crianca_nome", "responsavel_nome", "protocolo", "data_inscricao"]',
  4
),
(
  'desistencia', 
  'Confirmação de Desistência', 
  'Enviado quando a criança é marcada como desistente',
  'Confirmação de Desistência - {{crianca_nome}}',
  '<h2>Confirmação de Desistência</h2><p>Olá, {{responsavel_nome}}!</p><p>Confirmamos o registro de desistência de <strong>{{crianca_nome}}</strong> na fila de espera.</p><p><strong>Data:</strong> {{data}}<br><strong>Motivo:</strong> {{motivo}}</p><p>Caso deseje realizar uma nova inscrição futuramente, acesse nosso sistema.</p>',
  'Desistencia de {{crianca_nome}} registrada. Data: {{data}}.',
  '📋 *DESISTÊNCIA REGISTRADA*\n\nOlá, {{responsavel_nome}}!\n\nA desistência de *{{crianca_nome}}* foi registrada.\n\n📅 Data: {{data}}\n📝 Motivo: {{motivo}}\n\nCaso deseje, você pode fazer nova inscrição futuramente.',
  '["crianca_nome", "responsavel_nome", "data", "motivo"]',
  5
),
(
  'recusa', 
  'Vaga Recusada', 
  'Enviado quando o responsável recusa a vaga oferecida',
  'Confirmação de Recusa de Vaga - {{crianca_nome}}',
  '<h2>Vaga Recusada</h2><p>Olá, {{responsavel_nome}}!</p><p>Registramos a recusa da vaga oferecida para <strong>{{crianca_nome}}</strong>.</p><p><strong>CMEI:</strong> {{cmei_nome}}<br><strong>Data:</strong> {{data}}<br><strong>Motivo:</strong> {{motivo}}</p>',
  'Recusa de vaga de {{crianca_nome}} registrada. CMEI: {{cmei_nome}}.',
  '❌ *VAGA RECUSADA*\n\nOlá, {{responsavel_nome}}!\n\nRegistramos a recusa da vaga para *{{crianca_nome}}*.\n\n🏫 CMEI: {{cmei_nome}}\n📅 Data: {{data}}\n📝 Motivo: {{motivo}}',
  '["crianca_nome", "responsavel_nome", "cmei_nome", "data", "motivo"]',
  6
),
(
  'fim_fila', 
  'Movido para Fim da Fila', 
  'Enviado quando a criança é movida para o fim da fila por não comparecimento',
  'Aviso: Movido para Fim da Fila - {{crianca_nome}}',
  '<h2>Aviso Importante</h2><p>Olá, {{responsavel_nome}}!</p><p><strong>{{crianca_nome}}</strong> foi movida para o fim da fila de espera.</p><p><strong>Motivo:</strong> {{motivo}}<br><strong>Data:</strong> {{data}}</p><p>Você permanece na fila, porém em uma nova posição.</p>',
  'AVISO: {{crianca_nome}} foi movida para fim da fila. Motivo: {{motivo}}.',
  '⚠️ *AVISO IMPORTANTE*\n\nOlá, {{responsavel_nome}}!\n\n*{{crianca_nome}}* foi movida para o fim da fila.\n\n📝 Motivo: {{motivo}}\n📅 Data: {{data}}\n\nVocê permanece na fila, em nova posição.',
  '["crianca_nome", "responsavel_nome", "motivo", "data"]',
  7
),
(
  'remanejamento_solicitado', 
  'Remanejamento Solicitado', 
  'Enviado quando uma solicitação de remanejamento é registrada',
  'Solicitação de Remanejamento Registrada - {{crianca_nome}}',
  '<h2>Remanejamento Solicitado</h2><p>Olá, {{responsavel_nome}}!</p><p>Sua solicitação de remanejamento para <strong>{{crianca_nome}}</strong> foi registrada.</p><p><strong>CMEI Atual:</strong> {{cmei_atual}}<br><strong>CMEI Solicitado:</strong> {{cmei_solicitado}}<br><strong>Motivo:</strong> {{motivo}}</p><p>Você será notificado quando houver vaga disponível.</p>',
  'Remanejamento de {{crianca_nome}} solicitado. De {{cmei_atual}} para {{cmei_solicitado}}.',
  '🔄 *REMANEJAMENTO SOLICITADO*\n\nOlá, {{responsavel_nome}}!\n\nSua solicitação para *{{crianca_nome}}* foi registrada.\n\n🏫 CMEI Atual: {{cmei_atual}}\n🏫 CMEI Solicitado: {{cmei_solicitado}}\n📝 Motivo: {{motivo}}\n\n📬 Você será notificado quando houver vaga.',
  '["crianca_nome", "responsavel_nome", "cmei_atual", "cmei_solicitado", "motivo"]',
  8
),
(
  'remanejamento_aprovado', 
  'Remanejamento Aprovado', 
  'Enviado quando o remanejamento é aprovado e efetivado',
  'Remanejamento Aprovado - {{crianca_nome}}',
  '<h2>Remanejamento Aprovado!</h2><p>Olá, {{responsavel_nome}}!</p><p>O remanejamento de <strong>{{crianca_nome}}</strong> foi aprovado!</p><p><strong>Novo CMEI:</strong> {{cmei_novo}}<br><strong>Nova Turma:</strong> {{turma_nova}}</p><p>Entre em contato com a nova unidade para orientações.</p>',
  'Remanejamento de {{crianca_nome}} APROVADO! Novo CMEI: {{cmei_novo}}.',
  '✅ *REMANEJAMENTO APROVADO!*\n\nOlá, {{responsavel_nome}}!\n\nO remanejamento de *{{crianca_nome}}* foi aprovado!\n\n🏫 Novo CMEI: {{cmei_novo}}\n📚 Nova Turma: {{turma_nova}}\n\n📞 Entre em contato com a nova unidade.',
  '["crianca_nome", "responsavel_nome", "cmei_novo", "turma_nova"]',
  9
),
(
  'transferencia', 
  'Transferência Realizada', 
  'Enviado quando uma transferência é efetivada',
  'Transferência Realizada - {{crianca_nome}}',
  '<h2>Transferência Realizada</h2><p>Olá, {{responsavel_nome}}!</p><p>A transferência de <strong>{{crianca_nome}}</strong> foi processada.</p><p><strong>CMEI Anterior:</strong> {{cmei_anterior}}<br><strong>Data:</strong> {{data}}<br><strong>Motivo:</strong> {{motivo}}</p>',
  'Transferencia de {{crianca_nome}} realizada. CMEI anterior: {{cmei_anterior}}.',
  '📤 *TRANSFERÊNCIA REALIZADA*\n\nOlá, {{responsavel_nome}}!\n\nA transferência de *{{crianca_nome}}* foi processada.\n\n🏫 CMEI Anterior: {{cmei_anterior}}\n📅 Data: {{data}}\n📝 Motivo: {{motivo}}',
  '["crianca_nome", "responsavel_nome", "cmei_anterior", "data", "motivo"]',
  10
),
(
  'prazo_expirado', 
  'Prazo Expirado', 
  'Enviado quando o prazo de resposta à convocação expira',
  'Prazo Expirado - {{crianca_nome}}',
  '<h2>Prazo Expirado</h2><p>Olá, {{responsavel_nome}}!</p><p>Infelizmente, o prazo para efetivação da matrícula de <strong>{{crianca_nome}}</strong> expirou.</p><p><strong>CMEI:</strong> {{cmei_nome}}<br><strong>Data limite:</strong> {{data_limite}}</p><p>Por favor, entre em contato com a Secretaria de Educação para mais informações.</p>',
  'Prazo expirado para {{crianca_nome}}. Entre em contato com a Secretaria.',
  '⏰ *PRAZO EXPIRADO*\n\nOlá, {{responsavel_nome}}!\n\nO prazo para *{{crianca_nome}}* expirou.\n\n🏫 CMEI: {{cmei_nome}}\n📅 Data limite: {{data_limite}}\n\n📞 Entre em contato com a Secretaria.',
  '["crianca_nome", "responsavel_nome", "cmei_nome", "data_limite"]',
  11
),
(
  'lembrete_assinatura', 
  'Lembrete de Assinatura', 
  'Enviado para lembrar sobre assinatura de documentos pendentes',
  'Lembrete: Assinatura Pendente - {{crianca_nome}}',
  '<h2>Lembrete de Assinatura</h2><p>Olá, {{responsavel_nome}}!</p><p>Você possui documentos pendentes de assinatura para <strong>{{crianca_nome}}</strong>.</p><p><strong>Prazo:</strong> {{data_limite}}</p><p>Acesse o sistema para assinar os documentos necessários.</p>',
  'LEMBRETE: Assinatura pendente para {{crianca_nome}}. Prazo: {{data_limite}}.',
  '📝 *ASSINATURA PENDENTE*\n\nOlá, {{responsavel_nome}}!\n\nVocê tem documentos para assinar de *{{crianca_nome}}*.\n\n📅 Prazo: {{data_limite}}\n\n⚠️ Acesse o sistema para assinar.',
  '["crianca_nome", "responsavel_nome", "data_limite"]',
  12
),
(
  'documento_recusado', 
  'Documento Recusado', 
  'Enviado quando um documento é recusado na validação',
  'Documento Recusado - {{crianca_nome}}',
  '<h2>Documento Recusado</h2><p>Olá, {{responsavel_nome}}!</p><p>Um documento de <strong>{{crianca_nome}}</strong> foi recusado.</p><p><strong>Documento:</strong> {{documento_nome}}<br><strong>Motivo:</strong> {{motivo}}</p><p>Por favor, envie um novo documento corrigido.</p>',
  'Documento de {{crianca_nome}} recusado: {{documento_nome}}. Envie novo documento.',
  '❌ *DOCUMENTO RECUSADO*\n\nOlá, {{responsavel_nome}}!\n\nUm documento de *{{crianca_nome}}* foi recusado.\n\n📄 Documento: {{documento_nome}}\n📝 Motivo: {{motivo}}\n\n⚠️ Envie um novo documento.',
  '["crianca_nome", "responsavel_nome", "documento_nome", "motivo"]',
  13
),
(
  'documentos_aprovados', 
  'Documentos Aprovados', 
  'Enviado quando todos os documentos são aprovados',
  'Documentos Aprovados - {{crianca_nome}}',
  '<h2>Documentos Aprovados</h2><p>Olá, {{responsavel_nome}}!</p><p>Todos os documentos de <strong>{{crianca_nome}}</strong> foram aprovados!</p><p>A matrícula está em processamento.</p>',
  'Documentos de {{crianca_nome}} aprovados! Matricula em processamento.',
  '✅ *DOCUMENTOS APROVADOS*\n\nOlá, {{responsavel_nome}}!\n\nTodos os documentos de *{{crianca_nome}}* foram aprovados!\n\n🎉 Matrícula em processamento.',
  '["crianca_nome", "responsavel_nome"]',
  14
),
(
  'remanejamento_concluido', 
  'Remanejamento Concluído', 
  'Enviado quando o remanejamento é finalizado',
  'Remanejamento Concluído - {{crianca_nome}}',
  '<h2>Remanejamento Concluído</h2><p>Olá, {{responsavel_nome}}!</p><p>O remanejamento de <strong>{{crianca_nome}}</strong> foi concluído com sucesso!</p><p><strong>Novo CMEI:</strong> {{cmei_novo}}<br><strong>Nova Turma:</strong> {{turma_nova}}</p><p>A criança já pode frequentar a nova unidade.</p>',
  'Remanejamento de {{crianca_nome}} concluido! Novo CMEI: {{cmei_novo}}.',
  '🔄 *REMANEJAMENTO CONCLUÍDO*\n\nOlá, {{responsavel_nome}}!\n\nO remanejamento de *{{crianca_nome}}* foi concluído!\n\n🏫 Novo CMEI: {{cmei_novo}}\n📚 Nova Turma: {{turma_nova}}\n\n✅ A criança já pode frequentar a nova unidade.',
  '["crianca_nome", "responsavel_nome", "cmei_novo", "turma_nova"]',
  15
),
(
  'inscricao_fila', 
  'Inscrição na Fila', 
  'Enviado quando a inscrição é adicionada à fila de espera',
  'Inscrição Confirmada na Fila - {{crianca_nome}}',
  '<h2>Inscrição na Fila de Espera</h2><p>Olá, {{responsavel_nome}}!</p><p>A inscrição de <strong>{{crianca_nome}}</strong> foi confirmada na fila de espera.</p><p><strong>Posição:</strong> {{posicao_fila}}</p><p>Acompanhe sua posição pelo sistema.</p>',
  'Inscricao de {{crianca_nome}} confirmada na fila. Posicao: {{posicao_fila}}.',
  '📋 *INSCRIÇÃO NA FILA*\n\nOlá, {{responsavel_nome}}!\n\n*{{crianca_nome}}* está na fila de espera!\n\n📊 Posição: {{posicao_fila}}\n\n👀 Acompanhe pelo sistema.',
  '["crianca_nome", "responsavel_nome", "posicao_fila"]',
  16
),
(
  'lembrete', 
  'Lembrete Geral', 
  'Lembrete genérico para responsáveis',
  'Lembrete - {{assunto}}',
  '<h2>Lembrete</h2><p>Olá, {{responsavel_nome}}!</p><p>{{mensagem}}</p>',
  'LEMBRETE: {{mensagem}}',
  '🔔 *LEMBRETE*\n\nOlá, {{responsavel_nome}}!\n\n{{mensagem}}',
  '["responsavel_nome", "assunto", "mensagem"]',
  17
),
(
  'matricula', 
  'Matrícula em Processamento', 
  'Enviado durante o processo de matrícula',
  'Matrícula em Processamento - {{crianca_nome}}',
  '<h2>Matrícula em Processamento</h2><p>Olá, {{responsavel_nome}}!</p><p>A matrícula de <strong>{{crianca_nome}}</strong> está sendo processada.</p><p><strong>CMEI:</strong> {{cmei_nome}}<br><strong>Turma:</strong> {{turma_nome}}</p><p>Você será notificado quando for confirmada.</p>',
  'Matricula de {{crianca_nome}} em processamento no {{cmei_nome}}.',
  '⏳ *MATRÍCULA EM PROCESSAMENTO*\n\nOlá, {{responsavel_nome}}!\n\nA matrícula de *{{crianca_nome}}* está sendo processada.\n\n🏫 CMEI: {{cmei_nome}}\n📚 Turma: {{turma_nome}}\n\n📬 Aguarde confirmação.',
  '["crianca_nome", "responsavel_nome", "cmei_nome", "turma_nome"]',
  18
),
(
  'remanejamento', 
  'Remanejamento', 
  'Notificação geral sobre remanejamento',
  'Atualização de Remanejamento - {{crianca_nome}}',
  '<h2>Atualização de Remanejamento</h2><p>Olá, {{responsavel_nome}}!</p><p>Há uma atualização sobre o remanejamento de <strong>{{crianca_nome}}</strong>.</p><p>{{mensagem}}</p>',
  'Atualizacao de remanejamento de {{crianca_nome}}. Verifique o sistema.',
  '🔄 *REMANEJAMENTO*\n\nOlá, {{responsavel_nome}}!\n\nHá uma atualização sobre o remanejamento de *{{crianca_nome}}*.\n\n{{mensagem}}',
  '["crianca_nome", "responsavel_nome", "mensagem"]',
  19
)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- PERMISSÕES BASE
-- =============================================================================
INSERT INTO public.permissoes (codigo, nome, descricao, modulo) VALUES
('criancas.visualizar', 'Visualizar Crianças', 'Permite visualizar lista de crianças', 'Crianças'),
('criancas.criar', 'Criar Crianças', 'Permite cadastrar novas crianças', 'Crianças'),
('criancas.editar', 'Editar Crianças', 'Permite editar dados de crianças', 'Crianças'),
('criancas.excluir', 'Excluir Crianças', 'Permite excluir crianças', 'Crianças'),
('fila.visualizar', 'Visualizar Fila', 'Permite visualizar fila de espera', 'Fila'),
('fila.convocar', 'Convocar Crianças', 'Permite convocar crianças', 'Fila'),
('fila.gerenciar', 'Gerenciar Fila', 'Permite gerenciar a fila', 'Fila'),
('matriculas.visualizar', 'Visualizar Matrículas', 'Permite visualizar matrículas', 'Matrículas'),
('matriculas.confirmar', 'Confirmar Matrículas', 'Permite confirmar matrículas', 'Matrículas'),
('matriculas.realocar', 'Realocar Alunos', 'Permite realocar alunos', 'Matrículas'),
('matriculas.cancelar', 'Cancelar Matrículas', 'Permite cancelar matrículas', 'Matrículas'),
('cmeis.visualizar', 'Visualizar CMEIs', 'Permite visualizar CMEIs', 'CMEIs'),
('cmeis.criar', 'Criar CMEIs', 'Permite cadastrar CMEIs', 'CMEIs'),
('cmeis.editar', 'Editar CMEIs', 'Permite editar CMEIs', 'CMEIs'),
('cmeis.excluir', 'Excluir CMEIs', 'Permite excluir CMEIs', 'CMEIs'),
('turmas.visualizar', 'Visualizar Turmas', 'Permite visualizar turmas', 'Turmas'),
('turmas.criar', 'Criar Turmas', 'Permite criar turmas', 'Turmas'),
('turmas.editar', 'Editar Turmas', 'Permite editar turmas', 'Turmas'),
('turmas.excluir', 'Excluir Turmas', 'Permite excluir turmas', 'Turmas'),
('usuarios.visualizar', 'Visualizar Usuários', 'Permite visualizar usuários', 'Usuários'),
('usuarios.criar', 'Criar Usuários', 'Permite criar usuários', 'Usuários'),
('usuarios.editar', 'Editar Usuários', 'Permite editar usuários', 'Usuários'),
('usuarios.roles', 'Gerenciar Papéis', 'Permite alterar papéis', 'Usuários'),
('usuarios.desativar', 'Desativar Usuários', 'Permite desativar usuários', 'Usuários'),
('relatorios.visualizar', 'Visualizar Relatórios', 'Permite visualizar relatórios', 'Relatórios'),
('relatorios.exportar', 'Exportar Relatórios', 'Permite exportar relatórios', 'Relatórios'),
('configuracoes.visualizar', 'Visualizar Configurações', 'Permite visualizar configurações', 'Configurações'),
('configuracoes.editar', 'Editar Configurações', 'Permite editar configurações', 'Configurações'),
('auditoria.visualizar', 'Visualizar Auditoria', 'Permite visualizar auditoria', 'Auditoria'),
('documentos.visualizar', 'Visualizar Documentos', 'Permite visualizar documentos', 'Documentos'),
('documentos.aprovar', 'Aprovar Documentos', 'Permite aprovar documentos', 'Documentos'),
('remanejamento.visualizar', 'Visualizar Remanejamentos', 'Permite visualizar solicitações de remanejamento', 'Remanejamento'),
('remanejamento.aprovar', 'Aprovar Remanejamentos', 'Permite aprovar remanejamentos', 'Remanejamento'),
('remanejamento.recusar', 'Recusar Remanejamentos', 'Permite recusar remanejamentos', 'Remanejamento')
ON CONFLICT (codigo) DO NOTHING;

-- Associar permissões aos papéis
INSERT INTO public.role_permissoes (role, permissao_id)
SELECT 'admin', id FROM public.permissoes ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissoes (role, permissao_id)
SELECT 'superadmin', id FROM public.permissoes ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissoes (role, permissao_id)
SELECT 'gestor', id FROM public.permissoes 
WHERE codigo IN (
  'criancas.visualizar', 'criancas.criar', 'criancas.editar', 
  'fila.visualizar', 'fila.convocar', 'fila.gerenciar', 
  'matriculas.visualizar', 'matriculas.confirmar', 'matriculas.realocar', 'matriculas.cancelar',
  'cmeis.visualizar', 'turmas.visualizar', 
  'relatorios.visualizar', 'relatorios.exportar', 
  'documentos.visualizar', 'documentos.aprovar',
  'remanejamento.visualizar', 'remanejamento.aprovar', 'remanejamento.recusar'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissoes (role, permissao_id)
SELECT 'diretor_cmei', id FROM public.permissoes 
WHERE codigo IN (
  'criancas.visualizar', 
  'fila.visualizar', 
  'matriculas.visualizar', 
  'cmeis.visualizar', 'turmas.visualizar', 
  'relatorios.visualizar', 
  'documentos.visualizar', 'documentos.aprovar',
  'remanejamento.visualizar'
)
ON CONFLICT DO NOTHING;

-- Campos de Inscrição (sistema)
INSERT INTO public.campos_inscricao (secao, nome_campo, label, tipo, placeholder, obrigatorio, campo_sistema, ordem, mascara) VALUES
('crianca', 'nome', 'Nome completo da criança', 'text', 'Nome completo', true, true, 1, NULL),
('crianca', 'data_nascimento', 'Data de nascimento', 'date', NULL, true, true, 2, NULL),
('crianca', 'sexo', 'Sexo', 'select', NULL, true, true, 3, NULL),
('responsavel', 'responsavel_nome', 'Nome do responsável', 'text', 'Nome completo', true, true, 1, NULL),
('responsavel', 'responsavel_cpf', 'CPF do responsável', 'cpf', '000.000.000-00', true, true, 2, 'cpf'),
('responsavel', 'responsavel_telefone', 'Telefone/WhatsApp', 'phone', '(00) 00000-0000', true, true, 3, 'phone'),
('endereco', 'cep', 'CEP', 'cep', '00000-000', true, true, 1, 'cep'),
('endereco', 'logradouro', 'Logradouro', 'text', 'Rua, Avenida...', true, true, 2, NULL),
('endereco', 'numero', 'Número', 'text', 'Nº', true, true, 3, NULL),
('endereco', 'bairro', 'Bairro', 'text', 'Bairro', true, true, 5, NULL)
ON CONFLICT (nome_campo) DO NOTHING;

-- Atualizar opções do campo sexo
UPDATE public.campos_inscricao SET opcoes = '[{"value": "Masculino", "label": "Masculino"}, {"value": "Feminino", "label": "Feminino"}]'::jsonb WHERE nome_campo = 'sexo';

-- =============================================================================
-- FIM DOS DADOS INICIAIS
-- =============================================================================

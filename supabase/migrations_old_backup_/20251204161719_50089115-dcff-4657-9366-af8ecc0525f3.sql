-- Inserir templates de mensagens faltantes
INSERT INTO templates_mensagens (tipo, titulo, descricao, assunto_email, corpo_email, corpo_whatsapp, variaveis_disponiveis, ativo, ordem)
VALUES 
(
  'documento_recusado',
  'Documento Recusado',
  'Enviado quando um documento é recusado',
  'Documento Recusado - {{crianca_nome}}',
  '<h2 style="color: #d32f2f;">Documento Precisa ser Reenviado</h2><p>Olá, <strong>{{responsavel_nome}}</strong>!</p><p>Um documento enviado para <strong>{{crianca_nome}}</strong> foi recusado.</p><div style="background: #ffebee; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #d32f2f;"><p><strong>Motivo:</strong> {{motivo}}</p></div><p>Por favor, envie uma nova versão do documento pelo sistema.</p>',
  E'❌ *DOCUMENTO RECUSADO*\n\nOlá, {{responsavel_nome}}!\n\nUm documento de *{{crianca_nome}}* foi recusado.\n\n📋 Motivo: {{motivo}}\n\nPor favor, envie novamente pelo sistema.',
  '["crianca_nome", "responsavel_nome", "motivo", "lista_documentos"]',
  true,
  6
),
(
  'documentos_aprovados',
  'Documentos Aprovados',
  'Enviado quando todos os documentos são aprovados',
  'Documentos Aprovados - {{crianca_nome}}',
  '<h2 style="color: #2e7d32;">Documentação Aprovada!</h2><p>Olá, <strong>{{responsavel_nome}}</strong>!</p><p>Todos os documentos de <strong>{{crianca_nome}}</strong> foram aprovados!</p><div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2e7d32;"><p><strong>Próximo passo:</strong> Compareça ao CMEI <strong>{{cmei_nome}}</strong> para assinar a matrícula.</p><p><strong>Prazo:</strong> {{data_limite}}</p></div><p>Leve um documento de identificação.</p>',
  E'✅ *DOCUMENTOS APROVADOS!*\n\nOlá, {{responsavel_nome}}!\n\nTodos os documentos de *{{crianca_nome}}* foram aprovados!\n\n🏫 Compareça ao CMEI: {{cmei_nome}}\n📅 Prazo: {{data_limite}}\n\nLeve documento de identificação para assinar.',
  '["crianca_nome", "responsavel_nome", "cmei_nome", "data_limite"]',
  true,
  7
),
(
  'aguardando_assinatura',
  'Aguardando Assinatura',
  'Enviado quando é necessário comparecer para assinar',
  'Compareça para Assinar - {{crianca_nome}}',
  '<h2>Compareça para Assinar a Matrícula</h2><p>Olá, <strong>{{responsavel_nome}}</strong>!</p><p>Todos os documentos de <strong>{{crianca_nome}}</strong> foram aprovados!</p><div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #1351B4;"><p><strong>CMEI:</strong> {{cmei_nome}}</p><p><strong>Endereço:</strong> {{cmei_endereco}}</p><p><strong>Prazo:</strong> {{prazo_dias}} dias (até {{data_limite}})</p></div><p><strong>O que levar:</strong></p><ul><li>Documento de identificação (RG ou CNH)</li><li>CPF</li></ul>',
  E'✍️ *COMPAREÇA PARA ASSINAR*\n\nOlá, {{responsavel_nome}}!\n\n*{{crianca_nome}}* está aprovada!\n\n🏫 CMEI: {{cmei_nome}}\n📍 {{cmei_endereco}}\n📅 Prazo: {{prazo_dias}} dias\n\nLeve RG/CNH e CPF.',
  '["crianca_nome", "responsavel_nome", "cmei_nome", "cmei_endereco", "prazo_dias", "data_limite"]',
  true,
  8
);
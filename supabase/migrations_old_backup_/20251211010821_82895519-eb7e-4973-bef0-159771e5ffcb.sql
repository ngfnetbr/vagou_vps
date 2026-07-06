-- Inserir template para Desistência
INSERT INTO templates_mensagens (tipo, titulo, descricao, assunto_email, corpo_email, corpo_whatsapp, corpo_sms, variaveis_disponiveis, ativo, ordem)
VALUES (
  'desistencia',
  'Desistência Registrada',
  'Notificação enviada quando uma criança é marcada como desistente',
  'Desistência Registrada - {{crianca_nome}}',
  '<p>Prezado(a) {{responsavel_nome}},</p><p>Informamos que a desistência da inscrição de <strong>{{crianca_nome}}</strong> foi registrada em nosso sistema.</p><p>Motivo: {{motivo}}</p><p>Caso deseje realizar uma nova inscrição futuramente, acesse nosso portal.</p><p>Atenciosamente,<br>{{secretaria_nome}}<br>{{municipio_nome}}</p>',
  'Olá {{responsavel_nome}}, a desistência de {{crianca_nome}} foi registrada. Motivo: {{motivo}}. Para nova inscrição, acesse nosso portal.',
  'Desistencia de {{crianca_nome}} registrada. Motivo: {{motivo}}',
  '["crianca_nome", "responsavel_nome", "motivo", "municipio_nome", "secretaria_nome"]',
  true,
  11
);

-- Inserir template para Recusa de Vaga
INSERT INTO templates_mensagens (tipo, titulo, descricao, assunto_email, corpo_email, corpo_whatsapp, corpo_sms, variaveis_disponiveis, ativo, ordem)
VALUES (
  'recusa',
  'Recusa de Vaga',
  'Notificação enviada quando o responsável recusa a vaga oferecida',
  'Recusa de Vaga Registrada - {{crianca_nome}}',
  '<p>Prezado(a) {{responsavel_nome}},</p><p>Confirmamos que a recusa da vaga oferecida para <strong>{{crianca_nome}}</strong> no CMEI <strong>{{cmei_nome}}</strong> foi registrada em nosso sistema.</p><p>Motivo: {{motivo}}</p><p>A criança foi removida da fila de espera. Caso deseje realizar uma nova inscrição, acesse nosso portal.</p><p>Atenciosamente,<br>{{secretaria_nome}}<br>{{municipio_nome}}</p>',
  'Olá {{responsavel_nome}}, a recusa da vaga para {{crianca_nome}} no {{cmei_nome}} foi registrada. Motivo: {{motivo}}. Para nova inscrição, acesse nosso portal.',
  'Recusa de vaga de {{crianca_nome}} registrada. Motivo: {{motivo}}',
  '["crianca_nome", "responsavel_nome", "cmei_nome", "turma_nome", "motivo", "municipio_nome", "secretaria_nome"]',
  true,
  12
);
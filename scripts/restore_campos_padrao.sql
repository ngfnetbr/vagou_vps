-- Restaura TODOS os campos padrão do formulário de inscrição
-- Execute este script se a aba "Formulário" estiver vazia em Configurações

-- Seção: Criança
INSERT INTO public.campos_inscricao (secao, nome_campo, label, tipo, placeholder, obrigatorio, campo_sistema, ordem, mascara) VALUES
('crianca', 'nome', 'Nome completo da criança', 'text', 'Nome completo', true, true, 1, NULL),
('crianca', 'data_nascimento', 'Data de nascimento', 'date', NULL, true, true, 2, NULL),
('crianca', 'sexo', 'Sexo', 'select', NULL, true, true, 3, NULL),
('crianca', 'cpf_crianca', 'CPF da criança', 'cpf', '000.000.000-00', false, true, 4, 'cpf'),
('crianca', 'certidao_nascimento', 'Número da certidão de nascimento', 'text', 'Matrícula da certidão', false, true, 5, NULL),
('crianca', 'programas_sociais', 'Participa de programas sociais?', 'checkbox', NULL, false, true, 6, NULL)
ON CONFLICT (nome_campo) DO UPDATE SET 
  label = EXCLUDED.label, 
  tipo = EXCLUDED.tipo, 
  obrigatorio = EXCLUDED.obrigatorio, 
  campo_sistema = true;

-- Seção: Responsável
INSERT INTO public.campos_inscricao (secao, nome_campo, label, tipo, placeholder, obrigatorio, campo_sistema, ordem, mascara) VALUES
('responsavel', 'responsavel_nome', 'Nome do responsável', 'text', 'Nome completo', true, true, 1, NULL),
('responsavel', 'responsavel_cpf', 'CPF do responsável', 'cpf', '000.000.000-00', true, true, 2, 'cpf'),
('responsavel', 'responsavel_telefone', 'Telefone/WhatsApp', 'phone', '(00) 00000-0000', true, true, 3, 'phone'),
('responsavel', 'responsavel_celular', 'Telefone alternativo', 'phone', '(00) 00000-0000', false, true, 4, 'phone'),
('responsavel', 'responsavel_email', 'E-mail', 'email', 'exemplo@email.com', false, true, 5, NULL)
ON CONFLICT (nome_campo) DO UPDATE SET 
  label = EXCLUDED.label, 
  tipo = EXCLUDED.tipo, 
  obrigatorio = EXCLUDED.obrigatorio, 
  campo_sistema = true;

-- Seção: Endereço
INSERT INTO public.campos_inscricao (secao, nome_campo, label, tipo, placeholder, obrigatorio, campo_sistema, ordem, mascara) VALUES
('endereco', 'cep', 'CEP', 'cep', '00000-000', true, true, 1, 'cep'),
('endereco', 'logradouro', 'Logradouro', 'text', 'Rua, Avenida...', true, true, 2, NULL),
('endereco', 'numero', 'Número', 'text', 'Nº', true, true, 3, NULL),
('endereco', 'complemento', 'Complemento', 'text', 'Apto, Bloco, Casa...', false, true, 4, NULL),
('endereco', 'bairro', 'Bairro', 'text', 'Bairro', true, true, 5, NULL),
('endereco', 'cidade', 'Cidade', 'text', 'Cidade', true, true, 6, NULL),
('endereco', 'estado', 'Estado', 'text', 'UF', true, true, 7, NULL)
ON CONFLICT (nome_campo) DO UPDATE SET 
  label = EXCLUDED.label, 
  tipo = EXCLUDED.tipo, 
  obrigatorio = EXCLUDED.obrigatorio, 
  campo_sistema = true;

-- Seção: Preferências
INSERT INTO public.campos_inscricao (secao, nome_campo, label, tipo, placeholder, obrigatorio, campo_sistema, ordem, mascara) VALUES
('preferencias', 'cmei1_preferencia', 'CMEI de 1ª preferência', 'select', NULL, false, true, 1, NULL),
('preferencias', 'cmei2_preferencia', 'CMEI de 2ª preferência', 'select', NULL, false, true, 2, NULL),
('preferencias', 'aceita_qualquer_cmei', 'Aceita vaga em qualquer CMEI?', 'checkbox', NULL, false, true, 3, NULL)
ON CONFLICT (nome_campo) DO UPDATE SET 
  label = EXCLUDED.label, 
  tipo = EXCLUDED.tipo, 
  obrigatorio = EXCLUDED.obrigatorio, 
  campo_sistema = true;

-- Seção: Observações
INSERT INTO public.campos_inscricao (secao, nome_campo, label, tipo, placeholder, obrigatorio, campo_sistema, ordem, mascara) VALUES
('observacoes', 'observacoes', 'Observações', 'textarea', 'Informações adicionais...', false, true, 1, NULL)
ON CONFLICT (nome_campo) DO UPDATE SET 
  label = EXCLUDED.label, 
  tipo = EXCLUDED.tipo, 
  obrigatorio = EXCLUDED.obrigatorio, 
  campo_sistema = true;

-- Atualizar opções do campo sexo
UPDATE public.campos_inscricao 
SET opcoes = '[{"value": "Masculino", "label": "Masculino"}, {"value": "Feminino", "label": "Feminino"}]'::jsonb 
WHERE nome_campo = 'sexo';

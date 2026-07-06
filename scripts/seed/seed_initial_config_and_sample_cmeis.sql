-- Seed de dados iniciais (NÃO é migration).
-- Rode manualmente por município, se/quando fizer sentido.

INSERT INTO public.configuracoes_sistema (
  nome_municipio,
  nome_secretaria,
  email_contato,
  telefone_contato,
  prazo_resposta_dias
) VALUES (
  'Município',
  'Secretaria Municipal de Educação',
  'educacao@municipio.gov.br',
  '(00) 0000-0000',
  15
) ON CONFLICT DO NOTHING;

INSERT INTO public.cmeis (nome, endereco, bairro, capacidade_total) VALUES
  ('CMEI Pequenos Sonhadores', 'Rua das Flores, 123', 'Centro', 120),
  ('CMEI Jardim Colorido', 'Av. Principal, 456', 'Jardim', 150),
  ('CMEI Estrelinhas', 'Rua do Sol, 789', 'Vila Nova', 100),
  ('CMEI Mundo Encantado', 'Av. das Crianças, 321', 'Parque', 180)
ON CONFLICT DO NOTHING;


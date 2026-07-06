INSERT INTO public.niveis_aprendizagem (codigo, descricao, tipo, ordem, ativo) VALUES
  ('PS', 'Pré-silábico', 'escrita', 1, true),
  ('SI', 'Silábico sem valor sonoro', 'escrita', 2, true),
  ('SCV', 'Silábico com valor sonoro', 'escrita', 3, true),
  ('SA', 'Silábico-alfabético', 'escrita', 4, true),
  ('A', 'Alfabético', 'escrita', 5, true),
  ('NP', 'Não produz', 'producao_texto', 1, true),
  ('PA', 'Produz com apoio', 'producao_texto', 2, true),
  ('PP', 'Produz parcialmente', 'producao_texto', 3, true),
  ('PC', 'Produz com autonomia', 'producao_texto', 4, true);

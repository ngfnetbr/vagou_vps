INSERT INTO public.turmas_base (nome, idade_minima_meses, idade_maxima_meses, descricao, ordem, ativo) VALUES
('Infantil 0', 0, 11, '0 anos na data de corte (31/03)', 1, true),
('Infantil 1', 12, 23, '1 ano na data de corte (31/03)', 2, true),
('Infantil 2', 24, 35, '2 anos na data de corte (31/03)', 3, true),
('Infantil 3', 36, 47, '3 anos na data de corte (31/03)', 4, true),
('Infantil 4', 48, 59, '4 anos na data de corte (31/03)', 5, true),
('Infantil 5', 60, 71, '5 anos na data de corte (31/03)', 6, true)
ON CONFLICT (nome) DO UPDATE SET
  idade_minima_meses = EXCLUDED.idade_minima_meses,
  idade_maxima_meses = EXCLUDED.idade_maxima_meses,
  descricao = EXCLUDED.descricao,
  ordem = EXCLUDED.ordem,
  ativo = EXCLUDED.ativo;

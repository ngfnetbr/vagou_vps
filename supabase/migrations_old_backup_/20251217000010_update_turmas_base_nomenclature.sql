-- Atualiza Pré I para Infantil 4
UPDATE public.turmas_base
SET 
  nome = 'Infantil 4',
  descricao = '4 anos na data de corte (31/03)'
WHERE nome = 'Pré I';

-- Atualiza Pré II para Infantil 5
UPDATE public.turmas_base
SET 
  nome = 'Infantil 5',
  descricao = '5 anos na data de corte (31/03)'
WHERE nome = 'Pré II';

INSERT INTO public.periodos (codigo, nome, ativo)
VALUES
  ('2025-1', '2025 - 1º Semestre', true),
  ('2025-2', '2025 - 2º Semestre', true),
  ('2026-1', '2026 - 1º Semestre', true)
ON CONFLICT (codigo) DO UPDATE
SET
  nome = EXCLUDED.nome,
  ativo = EXCLUDED.ativo;

WITH niveis(codigo, descricao, tipo, ordem) AS (
  VALUES
    ('PIC', 'Pictórico', 'escrita', 1),
    ('N1', 'Nível 1', 'escrita', 2),
    ('N2', 'Nível 2', 'escrita', 3),
    ('INT1', 'Inter I', 'escrita', 4),
    ('SIL', 'Silábico', 'escrita', 5),
    ('INT2', 'Inter II', 'escrita', 6),
    ('ALF', 'Alfabético', 'escrita', 7),
    ('TMD', 'Texto com muita dificuldade', 'producao_texto', 1),
    ('TPD', 'Texto com pouca dificuldade', 'producao_texto', 2),
    ('TDP', 'Texto com dificuldade parcial', 'producao_texto', 3),
    ('TAL', 'Texto alfabético', 'producao_texto', 4)
)
UPDATE public.niveis_aprendizagem n
SET
  descricao = niveis.descricao,
  ordem = niveis.ordem,
  ativo = true
FROM niveis
WHERE n.codigo = niveis.codigo
  AND n.tipo = niveis.tipo;

WITH niveis(codigo, descricao, tipo, ordem) AS (
  VALUES
    ('PIC', 'Pictórico', 'escrita', 1),
    ('N1', 'Nível 1', 'escrita', 2),
    ('N2', 'Nível 2', 'escrita', 3),
    ('INT1', 'Inter I', 'escrita', 4),
    ('SIL', 'Silábico', 'escrita', 5),
    ('INT2', 'Inter II', 'escrita', 6),
    ('ALF', 'Alfabético', 'escrita', 7),
    ('TMD', 'Texto com muita dificuldade', 'producao_texto', 1),
    ('TPD', 'Texto com pouca dificuldade', 'producao_texto', 2),
    ('TDP', 'Texto com dificuldade parcial', 'producao_texto', 3),
    ('TAL', 'Texto alfabético', 'producao_texto', 4)
)
INSERT INTO public.niveis_aprendizagem (codigo, descricao, tipo, ordem, ativo)
SELECT
  niveis.codigo,
  niveis.descricao,
  niveis.tipo,
  niveis.ordem,
  true
FROM niveis
WHERE NOT EXISTS (
  SELECT 1
  FROM public.niveis_aprendizagem n
  WHERE n.codigo = niveis.codigo
    AND n.tipo = niveis.tipo
);


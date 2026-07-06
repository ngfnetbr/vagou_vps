DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.documentos_tipos WHERE nome = 'Comprovação - Transferência de renda') THEN
    INSERT INTO public.documentos_tipos (nome, descricao, obrigatorio, ativo, ordem)
    VALUES ('Comprovação - Transferência de renda', 'Extrato/declaração do benefício (ex.: Bolsa Família) ou comprovante equivalente.', false, true, 9001);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.documentos_tipos WHERE nome = 'Comprovação - Família monoparental') THEN
    INSERT INTO public.documentos_tipos (nome, descricao, obrigatorio, ativo, ordem)
    VALUES ('Comprovação - Família monoparental', 'Documentos que comprovem guarda/responsabilidade legal e composição familiar.', false, true, 9002);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.documentos_tipos WHERE nome = 'Comprovação - Medida protetiva') THEN
    INSERT INTO public.documentos_tipos (nome, descricao, obrigatorio, ativo, ordem)
    VALUES ('Comprovação - Medida protetiva', 'Decisão/medida protetiva, boletim de ocorrência, ou documento oficial equivalente.', false, true, 9003);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.documentos_tipos WHERE nome = 'Comprovação - Deficiência') THEN
    INSERT INTO public.documentos_tipos (nome, descricao, obrigatorio, ativo, ordem)
    VALUES ('Comprovação - Deficiência', 'Laudo/relatório médico (com CID quando aplicável) ou documento oficial equivalente.', false, true, 9004);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.documentos_tipos WHERE nome = 'Comprovação - Medida de proteção') THEN
    INSERT INTO public.documentos_tipos (nome, descricao, obrigatorio, ativo, ordem)
    VALUES ('Comprovação - Medida de proteção', 'Documento do Conselho Tutelar, decisão judicial, termo de acolhimento ou equivalente.', false, true, 9005);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.documentos_tipos WHERE nome = 'Comprovação - Medida socioeducativa') THEN
    INSERT INTO public.documentos_tipos (nome, descricao, obrigatorio, ativo, ordem)
    VALUES ('Comprovação - Medida socioeducativa', 'Declaração/documento oficial do órgão/serviço socioeducativo competente.', false, true, 9006);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.documentos_tipos WHERE nome = 'Comprovação - Custódia prisional') THEN
    INSERT INTO public.documentos_tipos (nome, descricao, obrigatorio, ativo, ordem)
    VALUES ('Comprovação - Custódia prisional', 'Declaração/documento oficial da unidade prisional ou equivalente.', false, true, 9007);
  END IF;
END $$;

INSERT INTO public.tipos_prioridade (codigo, nome, descricao, peso, cor, icone, exige_documento, documento_tipo_id, ativo, ordem)
VALUES
(
  'social',
  'Transferência de renda (Bolsa Família / similares)',
  'Famílias beneficiárias de programas de transferência de renda. Lei nº 14.851/2024 (art. 3, § 3º e § 4º), em consonância com o PNE (Lei nº 13.005/2014 e Lei nº 14.934/2024).',
  100,
  '#ef4444',
  'heart',
  true,
  (SELECT id FROM public.documentos_tipos WHERE nome = 'Comprovação - Transferência de renda' ORDER BY created_at DESC LIMIT 1),
  true,
  1
),
(
  'monoparental',
  'Família monoparental',
  'Famílias monoparentais (criança com apenas um responsável legal). Lei nº 14.851/2024 (art. 3, § 3º).',
  60,
  '#f59e0b',
  'user',
  true,
  (SELECT id FROM public.documentos_tipos WHERE nome = 'Comprovação - Família monoparental' ORDER BY created_at DESC LIMIT 1),
  true,
  2
),
(
  'violencia_domestica',
  'Medida protetiva (violência doméstica/familiar)',
  'Mães em medida de proteção por violência doméstica ou familiar. Lei nº 13.882/2019 (Lei Maria da Penha - Lei nº 11.340/2006).',
  120,
  '#db2777',
  'shield',
  true,
  (SELECT id FROM public.documentos_tipos WHERE nome = 'Comprovação - Medida protetiva' ORDER BY created_at DESC LIMIT 1),
  true,
  3
),
(
  'pne',
  'Criança com deficiência',
  'Atendimento prioritário obrigatório. Lei nº 13.146/2015, Lei nº 13.257/2016 e metas do PNE (Lei nº 13.005/2014 e Lei nº 14.934/2024).',
  110,
  '#0ea5e9',
  'accessibility',
  true,
  (SELECT id FROM public.documentos_tipos WHERE nome = 'Comprovação - Deficiência' ORDER BY created_at DESC LIMIT 1),
  true,
  4
),
(
  'medida_protecao',
  'Criança em medida de proteção',
  'Acolhimento, violência intrafamiliar ou determinação judicial. Lei nº 14.344/2022 e ECA (Lei nº 8.069/1990).',
  115,
  '#7c3aed',
  'scale',
  true,
  (SELECT id FROM public.documentos_tipos WHERE nome = 'Comprovação - Medida de proteção' ORDER BY created_at DESC LIMIT 1),
  true,
  5
),
(
  'socioeducativa',
  'Responsável adolescente em medida socioeducativa',
  'Filhos(as) de mãe/pai adolescente em cumprimento de medida socioeducativa. Lei nº 12.594/2012.',
  80,
  '#14b8a6',
  'badge-check',
  true,
  (SELECT id FROM public.documentos_tipos WHERE nome = 'Comprovação - Medida socioeducativa' ORDER BY created_at DESC LIMIT 1),
  true,
  6
),
(
  'custodia_prisional',
  'Mãe sob custódia prisional',
  'Filhos(as) de mães sob custódia prisional. Marco Legal da Primeira Infância (Lei nº 13.257/2016), atualizando art. 8º do ECA.',
  90,
  '#64748b',
  'lock',
  true,
  (SELECT id FROM public.documentos_tipos WHERE nome = 'Comprovação - Custódia prisional' ORDER BY created_at DESC LIMIT 1),
  true,
  7
),
(
  'irmao',
  'Irmãos na mesma unidade escolar',
  'Irmãos na mesma unidade escolar. Lei nº 13.845/2019 (altera ECA, art. 53, inciso V).',
  50,
  '#22c55e',
  'users',
  false,
  NULL,
  true,
  8
)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  peso = EXCLUDED.peso,
  cor = EXCLUDED.cor,
  icone = EXCLUDED.icone,
  exige_documento = EXCLUDED.exige_documento,
  documento_tipo_id = EXCLUDED.documento_tipo_id,
  ativo = EXCLUDED.ativo,
  ordem = EXCLUDED.ordem,
  updated_at = now();

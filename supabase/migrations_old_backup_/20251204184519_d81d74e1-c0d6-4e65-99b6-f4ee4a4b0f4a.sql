-- 1. Criar campo personalizado de exemplo "Tem alergia alimentar?"
INSERT INTO campos_inscricao (
  secao, nome_campo, label, tipo, placeholder, obrigatorio, 
  ativo, ordem, campo_sistema, visivel_responsavel, 
  editavel_apos_inscricao, dica
) VALUES (
  'observacoes', 
  'tem_alergia_alimentar', 
  'A criança tem alguma alergia alimentar?', 
  'checkbox',
  NULL,
  false,
  true,
  1,
  false,
  true,
  true,
  'Marque se a criança possui alguma restrição alimentar. Detalhe nas observações se necessário.'
);

-- 2. Criar zonas de atendimento de exemplo
INSERT INTO zonas_atendimento (nome, descricao, cor, bairros, ceps, ativo) VALUES
  ('Zona Norte', 'Região norte do município', '#ef4444', ARRAY['Vila Nova', 'Jardim Norte', 'Parque Industrial'], ARRAY['89000', '89001'], true),
  ('Zona Sul', 'Região sul do município', '#22c55e', ARRAY['Centro', 'Jardim Sul', 'Vila União'], ARRAY['89100', '89101'], true),
  ('Zona Leste', 'Região leste do município', '#3b82f6', ARRAY['Jardim América', 'Vila Leste', 'Conjunto Habitacional'], ARRAY['89200', '89201'], true),
  ('Zona Oeste', 'Região oeste do município', '#f59e0b', ARRAY['Vila Oeste', 'Jardim das Palmeiras', 'Residencial Primavera'], ARRAY['89300', '89301'], true);

-- 3. Vincular CMEIs às zonas (usando os IDs dos CMEIs existentes)
INSERT INTO cmei_zonas (cmei_id, zona_id, prioridade)
SELECT c.id, z.id, v.prioridade
FROM (
  VALUES
    ('9b0729a0-5c0e-4da5-8c3f-e6912a001e76'::uuid, 'Zona Norte', 1),
    ('d2757618-77cf-4b7c-b068-2adc95e7bb9a'::uuid, 'Zona Sul', 1),
    ('31ada8c8-545c-4805-8c00-5740d4fe3453'::uuid, 'Zona Leste', 1)
) AS v(cmei_id, zona_nome, prioridade)
JOIN cmeis c ON c.id = v.cmei_id
JOIN zonas_atendimento z ON z.nome = v.zona_nome;

-- 4. Habilitar zoneamento nas configurações
UPDATE configuracoes_sistema
SET habilitar_zoneamento = true,
    priorizar_zona = true,
    mostrar_distancia = false
WHERE id = (SELECT id FROM configuracoes_sistema LIMIT 1);
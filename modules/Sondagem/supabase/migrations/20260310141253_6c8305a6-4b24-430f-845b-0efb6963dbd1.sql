-- Insert fictitious sondagens for 10 students across 3 periods with progressive level evolution
-- This is test data only

DO $$
DECLARE
  v_aplicador_id uuid := '3187ce51-0229-4b22-88ac-13256a593028';
  v_modelo_id uuid := '4c7593f5-4bc6-4980-8fa6-2964ca5b257f';
  
  -- Escrita nivel IDs (ordem 1-7)
  esc_pic uuid := '109e1fd3-5153-4af6-b315-934fee7b9740';
  esc_n1  uuid := '36aee211-e01f-4117-9f63-7570e741776a';
  esc_n2  uuid := '44e9ab92-4c31-433c-9e44-438ae12fcb2f';
  esc_int1 uuid := '48de1143-2017-4a0a-a04a-aded2720fc55';
  esc_sil uuid := 'ada25597-e4eb-43df-a81f-853f9cc7b3f4';
  esc_int2 uuid := 'e3317109-9f85-4dc8-a758-76cebeceeb88';
  esc_alf uuid := '8c1009d8-120f-4131-a65f-bc1710c935b8';
  
  -- Producao nivel IDs (ordem 1-4)
  prod_tmd uuid := '744ead9e-8105-4513-b82e-cf09501a6190';
  prod_tpd uuid := '2139d56e-e105-466c-8622-38ce91245de1';
  prod_tdp uuid := '81dc17ed-877e-46b6-a751-704de6c65991';
  prod_tal uuid := '164a7f10-bf05-4acf-99b9-9e21d3310df0';
  
  v_sondagem_id uuid;
  
  -- Arrays of student IDs
  type_crianca_rec RECORD;
BEGIN
  -- Student 1: Ana Silva - PIC -> N2 -> SIL | TMD -> TPD -> TDP
  -- Period 2025-1
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, '347d232f-84f8-40c9-b7ff-07d2922bfd0a', v_modelo_id, '2025-1', 'finalizado', '2025-03-15'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_pic), (v_sondagem_id, prod_tmd);
  
  -- Period 2025-2
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, '347d232f-84f8-40c9-b7ff-07d2922bfd0a', v_modelo_id, '2025-2', 'finalizado', '2025-08-10'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_n2), (v_sondagem_id, prod_tpd);
  
  -- Period 2026-1
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, '347d232f-84f8-40c9-b7ff-07d2922bfd0a', v_modelo_id, '2026-1', 'finalizado', '2026-02-20'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_sil), (v_sondagem_id, prod_tdp);

  -- Student 2: João Santos - N1 -> INT1 -> ALF | TMD -> TDP -> TAL
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, 'a653b307-1695-4b91-b0d2-a3830b4d5ad2', v_modelo_id, '2025-1', 'finalizado', '2025-04-05'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_n1), (v_sondagem_id, prod_tmd);
  
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, 'a653b307-1695-4b91-b0d2-a3830b4d5ad2', v_modelo_id, '2025-2', 'finalizado', '2025-09-12'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_int1), (v_sondagem_id, prod_tdp);
  
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, 'a653b307-1695-4b91-b0d2-a3830b4d5ad2', v_modelo_id, '2026-1', 'finalizado', '2026-03-01'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_alf), (v_sondagem_id, prod_tal);

  -- Student 3: Maria Oliveira - PIC -> PIC -> N1 (slow progression) | TMD -> TMD -> TPD
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, '8a16cc8f-6e14-46b5-95ce-9a362276bcc2', v_modelo_id, '2025-1', 'finalizado', '2025-03-20'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_pic), (v_sondagem_id, prod_tmd);
  
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, '8a16cc8f-6e14-46b5-95ce-9a362276bcc2', v_modelo_id, '2025-2', 'finalizado', '2025-08-25'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_pic), (v_sondagem_id, prod_tmd);
  
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, '8a16cc8f-6e14-46b5-95ce-9a362276bcc2', v_modelo_id, '2026-1', 'finalizado', '2026-02-15'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_n1), (v_sondagem_id, prod_tpd);

  -- Student 4: Pedro Costa - N2 -> SIL -> ALF | TPD -> TDP -> TAL
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, '1a6996b6-2c31-47cb-b13b-81d286c74aa8', v_modelo_id, '2025-1', 'finalizado', '2025-04-10'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_n2), (v_sondagem_id, prod_tpd);
  
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, '1a6996b6-2c31-47cb-b13b-81d286c74aa8', v_modelo_id, '2025-2', 'finalizado', '2025-09-05'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_sil), (v_sondagem_id, prod_tdp);
  
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, '1a6996b6-2c31-47cb-b13b-81d286c74aa8', v_modelo_id, '2026-1', 'finalizado', '2026-03-05'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_alf), (v_sondagem_id, prod_tal);

  -- Student 5: Laura Souza - INT1 -> INT2 -> ALF | TDP -> TDP -> TAL
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, '3d747bb5-f59c-4306-944d-7db4a6823e74', v_modelo_id, '2025-1', 'finalizado', '2025-03-25'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_int1), (v_sondagem_id, prod_tdp);
  
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, '3d747bb5-f59c-4306-944d-7db4a6823e74', v_modelo_id, '2025-2', 'finalizado', '2025-08-18'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_int2), (v_sondagem_id, prod_tdp);
  
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, '3d747bb5-f59c-4306-944d-7db4a6823e74', v_modelo_id, '2026-1', 'finalizado', '2026-02-28'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_alf), (v_sondagem_id, prod_tal);

  -- Student 6: Lucas Lima - PIC -> N1 -> INT1 | TMD -> TPD -> TDP
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, '72af7a1f-a894-43fb-82fa-87086477bf0a', v_modelo_id, '2025-1', 'finalizado', '2025-04-15'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_pic), (v_sondagem_id, prod_tmd);
  
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, '72af7a1f-a894-43fb-82fa-87086477bf0a', v_modelo_id, '2025-2', 'finalizado', '2025-09-20'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_n1), (v_sondagem_id, prod_tpd);
  
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, '72af7a1f-a894-43fb-82fa-87086477bf0a', v_modelo_id, '2026-1', 'finalizado', '2026-03-08'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_int1), (v_sondagem_id, prod_tdp);

  -- Student 7: Beatriz Alves - SIL -> ALF -> ALF | TDP -> TAL -> TAL
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, 'e7ab1d3a-4b27-473b-9dec-b34714bf8008', v_modelo_id, '2025-1', 'finalizado', '2025-03-18'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_sil), (v_sondagem_id, prod_tdp);
  
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, 'e7ab1d3a-4b27-473b-9dec-b34714bf8008', v_modelo_id, '2025-2', 'finalizado', '2025-08-22'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_alf), (v_sondagem_id, prod_tal);
  
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, 'e7ab1d3a-4b27-473b-9dec-b34714bf8008', v_modelo_id, '2026-1', 'finalizado', '2026-02-25'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_alf), (v_sondagem_id, prod_tal);

  -- Student 8: Gabriel Pereira - N1 -> N2 -> SIL | TMD -> TPD -> TDP
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, 'e2790e9c-ad3e-4ce3-93c4-022821f40152', v_modelo_id, '2025-1', 'finalizado', '2025-04-02'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_n1), (v_sondagem_id, prod_tmd);
  
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, 'e2790e9c-ad3e-4ce3-93c4-022821f40152', v_modelo_id, '2025-2', 'finalizado', '2025-09-15'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_n2), (v_sondagem_id, prod_tpd);
  
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, 'e2790e9c-ad3e-4ce3-93c4-022821f40152', v_modelo_id, '2026-1', 'finalizado', '2026-03-03'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_sil), (v_sondagem_id, prod_tdp);

  -- Student 9: Sofia Ferreira - INT2 -> ALF -> ALF | TDP -> TAL -> TAL
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, '1f8d0014-ac48-4bc5-84c9-76a9a08d4366', v_modelo_id, '2025-1', 'finalizado', '2025-03-22'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_int2), (v_sondagem_id, prod_tdp);
  
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, '1f8d0014-ac48-4bc5-84c9-76a9a08d4366', v_modelo_id, '2025-2', 'finalizado', '2025-08-30'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_alf), (v_sondagem_id, prod_tal);
  
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, '1f8d0014-ac48-4bc5-84c9-76a9a08d4366', v_modelo_id, '2026-1', 'finalizado', '2026-02-18'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_alf), (v_sondagem_id, prod_tal);

  -- Student 10: Lorenzo Dias - PIC -> N2 -> INT2 | TMD -> TDP -> TAL
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, 'c1a3d035-3b52-4240-a453-dd6d0380087b', v_modelo_id, '2025-1', 'finalizado', '2025-04-08'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_pic), (v_sondagem_id, prod_tmd);
  
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, 'c1a3d035-3b52-4240-a453-dd6d0380087b', v_modelo_id, '2025-2', 'finalizado', '2025-09-08'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_n2), (v_sondagem_id, prod_tdp);
  
  INSERT INTO sondagens (aplicador_id, crianca_id, modelo_id, periodo, status, created_at)
  VALUES (v_aplicador_id, 'c1a3d035-3b52-4240-a453-dd6d0380087b', v_modelo_id, '2026-1', 'finalizado', '2026-03-06'::timestamptz)
  RETURNING id INTO v_sondagem_id;
  INSERT INTO respostas_sondagem (sondagem_id, nivel_id) VALUES (v_sondagem_id, esc_int2), (v_sondagem_id, prod_tal);

END $$;

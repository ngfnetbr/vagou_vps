-- Profiles
INSERT INTO public.profiles (id, nome_completo, cpf, email, telefone, created_at, updated_at, avatar_url, ativo)
VALUES 
('8a45cc42-a408-4a43-8995-477df55f33fa', 'Nelson Gonçalves Filho', '069.447.719-26', 'ti@ngf.net.br', '(44) 99704-2798', '2025-12-15 14:55:47.973206+00', '2025-12-15 14:55:48.011501+00', null, true),
('2910f747-81c5-4bd8-9d85-92f932b755e7', 'Lucas Henrique dos Santos Souza', '128.489.629-05', 'lucasprefdte@gmail.com', '(44) 99943-3609', '2025-12-15 17:07:15.293126+00', '2025-12-15 17:07:15.334315+00', null, true),
('dbede5b0-06f3-4d2e-9379-a2f5dc930584', 'Administrador', '10239951905', 'admin@gmail.com', '44997004237', '2025-12-02 02:33:13.915404+00', '2025-12-17 13:32:29.998356+00', null, true),
('b850f96d-40a0-4baf-ba84-47904dfe1752', 'Leonardo Gardin', '102.399.519-05', 'admin@vagou.net.br', '(44) 99700-4237', '2025-12-18 00:42:34.809899+00', '2025-12-18 00:42:34.872151+00', null, true),
('9e89d513-ec9a-471b-b00b-ff01794c70cd', null, null, 'test-recovery-1767210589788@example.com', null, '2025-12-31 19:49:50.00649+00', '2025-12-31 19:49:50.00649+00', null, true),
('fd860e6d-0d74-4175-a837-aba3f7a25a46', 'Administrador', '10655121048', 'tutorial@vagou.net.br', null, '2026-03-11 13:48:14.66238+00', '2026-03-11 13:49:12.859266+00', null, true)
ON CONFLICT (id) DO NOTHING;

-- Zonas de Atendimento
INSERT INTO public.zonas_atendimento (id, nome, descricao, cor, bairros, ceps, poligono, ativo, created_at, updated_at)
VALUES
('81b43a3e-b609-4223-87a0-ed07ae06cd90', 'Zona Sul', 'Região sul do município', '#22c55e', '{"Centro", "Jardim Sul", "Vila União"}', '{"89100", "89101"}', null, true, '2025-12-04 18:45:18.259264+00', '2025-12-04 18:45:18.259264+00'),
('51989b7e-bf6a-4c21-bdd9-ab8ea1559fa2', 'Zona Norte', 'Região norte do município', '#ef4444', '{"Vila Nova", "Jardim Norte", "Parque Industrial"}', '{"89000", "89001"}', null, true, '2025-12-04 18:45:18.259264+00', '2025-12-15 12:57:11.177794+00'),
('e3ade89e-7946-460c-ae45-4167f5a35f8b', 'Zona Leste', 'Região leste do municipio', '#3b82f6', '{"Jardim América", "Vila Leste", "Conjunto Habitacional"}', '{"89200", "89201"}', null, true, '2025-12-04 18:45:18.259264+00', '2025-12-15 12:57:40.668908+00'),
('1f0c9725-8d68-405b-9f1a-3b4ce0c1dab0', 'Zona Oeste', 'Região oeste do municipio', '#f59e0b', '{"Vila Oeste", "Jardim das Palmeiras", "Residencial Primavera"}', '{"89300", "89301"}', null, true, '2025-12-04 18:45:18.259264+00', '2025-12-15 12:57:51.837152+00')
ON CONFLICT (id) DO NOTHING;

-- Turmas
INSERT INTO public.turmas (id, cmei_id, nome, turma_base, capacidade, idade_minima, idade_maxima, turno, ativo, created_at, updated_at)
VALUES
('d82b891d-987d-4f7e-91f3-50fd90cf0efe', 'f6bc2e36-9b02-4581-af8b-14d29c5fd0dc', 'Infantil 3 A', 'Infantil 3', 30, 36, 47, 'Integral', true, '2025-12-18 00:29:11.138919+00', '2025-12-18 00:29:11.138919+00'),
('4f694529-0865-4323-b538-ecb1e3f71d7c', 'f6bc2e36-9b02-4581-af8b-14d29c5fd0dc', 'Infantil 3 B', 'Infantil 3', 30, 36, 47, 'Integral', true, '2025-12-18 00:29:23.839271+00', '2025-12-18 00:29:23.839271+00'),
('17d78fad-4e4f-430f-8d81-00c7697c340e', '87b68ce1-6413-451a-9063-3fa57ff90dfc', 'Infantil 4 A', 'Infantil 4', 30, 48, 59, 'Integral', true, '2025-12-18 00:25:49.734721+00', '2025-12-18 00:25:49.734721+00'),
('f52b777c-54d5-412c-a5f9-96cc75056fc9', '87b68ce1-6413-451a-9063-3fa57ff90dfc', 'Infantil 4 B', 'Infantil 4', 30, 48, 59, 'Integral', true, '2025-12-18 00:26:04.970127+00', '2025-12-18 00:26:04.970127+00'),
('8b96aca8-81a5-4584-9d29-224be76ed317', '87b68ce1-6413-451a-9063-3fa57ff90dfc', 'Infantil 5 A', 'Infantil 5', 30, 60, 71, 'Integral', true, '2025-12-18 00:26:21.40755+00', '2025-12-18 00:26:21.40755+00'),
('40966442-9f3a-42b3-8583-33f664c23097', '87b68ce1-6413-451a-9063-3fa57ff90dfc', 'Infantil 5 B', 'Infantil 5', 30, 60, 71, 'Integral', true, '2025-12-18 00:26:35.005932+00', '2025-12-18 00:26:35.005932+00'),
('0ce21047-e12b-4370-b81d-30b31206f7b5', 'f6bc2e36-9b02-4581-af8b-14d29c5fd0dc', 'Infantil 0 A', 'Infantil 0', 30, null, 11, 'Integral', true, '2025-12-18 00:27:01.606481+00', '2025-12-18 00:27:01.606481+00'),
('0aeaa8f3-3af5-4e56-894c-cd99a5768a4f', 'f6bc2e36-9b02-4581-af8b-14d29c5fd0dc', 'Infantil 1 A', 'Infantil 1', 30, 12, 23, 'Integral', true, '2025-12-18 00:27:18.896726+00', '2025-12-18 00:27:18.896726+00'),
('a0eb1515-3850-47db-8eb9-5a49c496d936', 'f6bc2e36-9b02-4581-af8b-14d29c5fd0dc', 'Infantil 1 B', 'Infantil 1', 30, 12, 23, 'Integral', true, '2025-12-18 00:27:46.040475+00', '2025-12-18 00:27:46.040475+00'),
('c9cc157d-ed70-4e97-8698-a8bb6687616a', 'f6bc2e36-9b02-4581-af8b-14d29c5fd0dc', 'Infantil 2 A', 'Infantil 2', 30, 24, 35, 'Integral', true, '2025-12-18 00:28:26.892748+00', '2025-12-18 00:28:26.892748+00'),
('a251d735-3631-46b3-b022-a912d4fe9edb', 'f6bc2e36-9b02-4581-af8b-14d29c5fd0dc', 'Infantil 2 B', 'Infantil 2', 30, 24, 35, 'Integral', true, '2025-12-18 00:28:38.115569+00', '2025-12-18 00:28:38.115569+00'),
('dc5973de-4e87-4c63-8099-7cad4902f112', 'f6bc2e36-9b02-4581-af8b-14d29c5fd0dc', 'Infantil 2 C', 'Infantil 2', 30, 24, 35, 'Integral', true, '2025-12-18 00:28:50.894593+00', '2025-12-18 00:28:50.894593+00'),
('326e0611-e52a-441b-80bb-a3b81a95815f', '87b68ce1-6413-451a-9063-3fa57ff90dfc', 'Infantil 4 C', 'Infantil 4', 30, 48, 59, 'Integral', true, '2026-02-25 13:27:44.104468+00', '2026-02-25 13:27:44.104468+00')
ON CONFLICT (id) DO NOTHING;

-- CMEIs
INSERT INTO public.cmeis (id, nome, endereco, bairro, telefone, email, capacidade_total, ativo, created_at, updated_at, latitude, longitude)
VALUES
('87b68ce1-6413-451a-9063-3fa57ff90dfc', 'CMEI João Trizzi', 'Av. Lidia Calabreta Massi, 821', 'Centro', '(44) 3429-1420', null, 500, true, '2025-12-15 00:25:11.647264+00', '2025-12-15 11:44:26.257342+00', -22.6605837, -53.8621184),
('f6bc2e36-9b02-4581-af8b-14d29c5fd0dc', 'CMEI Anjo da Guarda', 'Rua Antonio Cavalheiro Martins, 495', 'Centro', null, null, 240, true, '2025-12-15 00:27:35.384923+00', '2025-12-15 11:44:26.387937+00', -22.6589614, -52.8582589)
ON CONFLICT (id) DO NOTHING;

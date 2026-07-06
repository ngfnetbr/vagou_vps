
-- Script de importação de turmas e alunos 2025
-- Gerado automaticamente
DO $$
DECLARE
    v_cmei_id uuid;
    v_turma_id uuid;
BEGIN
    -- Obter o primeiro CMEI (ajuste se necessário)
    SELECT id INTO v_cmei_id FROM cmeis LIMIT 1;

    IF v_cmei_id IS NULL THEN
        RAISE EXCEPTION 'Nenhum CMEI encontrado no banco de dados.';
    END IF;

    -- Turma Base: INFANTIL 4
    INSERT INTO turmas_base (nome, idade_minima_meses, idade_maxima_meses, descricao)
    VALUES ('INFANTIL 4', 0, 72, 'Turma de INFANTIL 4')
    ON CONFLICT (nome) DO NOTHING;

    -- Turma: INFANTIL 4 - A
    INSERT INTO turmas (cmei_id, nome, turma_base, capacidade, turno, ativo)
    VALUES (v_cmei_id, 'INFANTIL 4 - A', 'INFANTIL 4', 30, 'Manhã', true)
    RETURNING id INTO v_turma_id;

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ANTONELLA MAITÊ DOS SANTOS BOTELHO', '2021-02-09', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99104-7324',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'BETINA MOREIRA BINTERCOURT', '2020-09-08', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99127-0863',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'BIANCA ARISSA ITO', '2020-05-07', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99977-1337',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'BRAYAN OLIVEIRA CARDOSO', '2020-05-01', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99180-0725',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'EMILLY VITORIA DOS SANTOS SOUZA', '2020-08-20', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99178-8447',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'GAEL GONÇALVES RONCHI DE ARAUJO', '2021-02-26', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99759-6660',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'HELENA DA SILVA AGUIAR', '2021-02-01', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99137-9510',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ISABELA CECOTE BONFIM', '2021-01-26', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99113-1783',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'KALLEO RAVI RODRIGUES DE OLIVEIRA', '2020-05-07', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99121-3282',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MARIA CECÍLIA SOARES GUTIERRES NASCINBENE', '2020-10-20', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99136-6523',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MARIA EDUARDA DA SILVA MANZALE', '2020-05-26', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99163-0421',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MARIA EDUARDA MERCATI', '2020-05-26', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99148-2861',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MARIA EMANUELLY RODRIGUES DA SILVA', '2020-04-07', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99175-2368',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MIGUEL RODRIGUES VICENTE MACHADO', '2020-09-02', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99143-8283',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'OLÍVIA NUNES CARVALHO', '2021-03-23', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99116-5714',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'RAUL FELICIANO SIQUEIRA CAMPOS', '2020-08-20', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99157-0244',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MATTEO DA COSTA SILVA', '2020-06-30', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99102-0133',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'CARLOS JUNIO SILVA MARTINS', '2020-05-19', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(31)99064-7361',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'LEIKER DAVID GONZALEZ HIDALGO', '2020-05-24', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(42)99842-7729',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    -- Turma Base: INFANTIL 4
    INSERT INTO turmas_base (nome, idade_minima_meses, idade_maxima_meses, descricao)
    VALUES ('INFANTIL 4', 0, 72, 'Turma de INFANTIL 4')
    ON CONFLICT (nome) DO NOTHING;

    -- Turma: INFANTIL 4 - B
    INSERT INTO turmas (cmei_id, nome, turma_base, capacidade, turno, ativo)
    VALUES (v_cmei_id, 'INFANTIL 4 - B', 'INFANTIL 4', 30, 'Tarde', true)
    RETURNING id INTO v_turma_id;

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ALLANNA MANUELLA DE OLIVEIRA', '2020-12-24', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(14)99105-6597',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ANA CLARA DOS SANTOS ZAMPOLO', '2020-12-27', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99718-5628',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ARTHUR DOS SANTOS RAMOS', '2020-11-05', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99146-7138',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ARTHUR RAFAEL DE SOUZA LOPES', '2021-01-06', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99111-7690',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'BENJAMIN ARAGÃO MARIQUITO MOREIRA', '2020-09-30', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(43)99101-4973',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'EMILLY SOPHIA DOS SANTOS BUENO', '2021-03-23', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99183-3099',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ERICK VINICIUS OLIVEIRA SANTANA', '2020-08-04', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99169-0629',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'HELENA GONÇALVES DE FRANÇA', '2021-01-03', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99930-4178',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'HEYTOR BATISTA DE OLIVEIRA', '2021-02-16', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99174-6194',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'KEMILLY VITÓRIA MOREIRA ROCHA', '2021-02-23', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99893-5417',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'LUANA APARECIDA HONORIO SEBASTIÃO', '2020-11-26', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99115-3470',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'LUCAS PACHECO', '2021-01-21', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99143-8227',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MANUELA VITÓRIA DA COSTA SANTOS', '2020-05-16', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99108-7147',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MIGUEL ASSUNÇÃO DE LIMA', '2020-06-17', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99168-9358',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MIGUEL FELIPE WEISS AGUIAR', '2020-07-30', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99117-1847',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'LUCAS FIGUEIREDO', '2020-06-22', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99141-0318',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'BETINA MOREIRA BINTERCOURT', '2020-09-08', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99127-0863',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MARIA EDUARDA DA SILVA MANZALE', '2020-05-26', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99163-0421',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'THAUANY VITÓRIA FERREIRA DE OLIVEIRA', '2020-04-08', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(67)99820-4567',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    -- Turma Base: INFANTIL 5
    INSERT INTO turmas_base (nome, idade_minima_meses, idade_maxima_meses, descricao)
    VALUES ('INFANTIL 5', 0, 72, 'Turma de INFANTIL 5')
    ON CONFLICT (nome) DO NOTHING;

    -- Turma: INFANTIL 5 - A
    INSERT INTO turmas (cmei_id, nome, turma_base, capacidade, turno, ativo)
    VALUES (v_cmei_id, 'INFANTIL 5 - A', 'INFANTIL 5', 30, 'Manhã', true)
    RETURNING id INTO v_turma_id;

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ALÍCIA MANUELA VALINI DOS SANTOS', '2019-09-10', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99909-5451',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ARTHUR NEVES DA SILVA', '2019-07-09', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99176-3409',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'BENÍCIO FERREIRA DE SOUZA', '2020-03-22', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99117-4986',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'BERNARDO TENDULO', '2019-07-08', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99179-1987',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'EMANUEL FERMINO ILÁRIO', '2020-03-10', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99148-3470',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'EMANUEL PEREIRA DA SILVA SOUZA', '2020-01-04', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99148-8453',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'GUILHERME TORRES RIBEIRO DA CRUZ', '2020-01-08', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99136-3132',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'HELENA SOUZA PASQUALETO', '2019-07-05', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)92002-5167',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ISABELY RODRIGUES MOREIRA', '2019-11-19', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99166-2590',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'LIZ BENICHIO MARTINS DE LIMA', '2020-01-27', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)92002-4763',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'LORENZO RUIPERES MARQUES DE JESUS', '2019-10-08', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99128-3102',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MIGUEL GARCIA XAVIER', '2019-04-30', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99146-3878',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'PEDRO HENRIQUE BORBA DA COSTA', '2019-08-12', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99132-8408',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'STELLA LOPES MOREIRA FRANCISCO', '2019-05-14', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99772-4809',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    -- Turma Base: INFANTIL 5
    INSERT INTO turmas_base (nome, idade_minima_meses, idade_maxima_meses, descricao)
    VALUES ('INFANTIL 5', 0, 72, 'Turma de INFANTIL 5')
    ON CONFLICT (nome) DO NOTHING;

    -- Turma: INFANTIL 5 - B
    INSERT INTO turmas (cmei_id, nome, turma_base, capacidade, turno, ativo)
    VALUES (v_cmei_id, 'INFANTIL 5 - B', 'INFANTIL 5', 30, 'Tarde', true)
    RETURNING id INTO v_turma_id;

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ANTHONY FERREIRA SALES', '2020-02-25', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99183-2307',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'EMILY MENDONÇA DA SILVA', '2020-01-10', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99129-9258',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'GABRIEL JUNIOR OLIVEIRA TOMAELLO', '2019-07-30', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99103-3648',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'HELENA COSTA SILVA', '2019-06-18', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99165-9645',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'HENRIQUE MARTINS BONFIM', '2019-09-03', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99144-3757',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'JASMYNIE VITÓRIA DE OLIVEIRA LIMA', '2020-01-05', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99158-2987',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'LARA HELENA DE SOUZA SILVA', '2019-07-02', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99706-0002',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'LÍVIA PEREIRA CANO', '2019-07-24', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99169-2683',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'LUIZ OTÁVIO DOS SANTOS ILÁRIO', '2019-07-16', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99162-3950',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MELLYSSA MARIA VICTÓRIA ALENCAR REIS DE', '2019-12-25', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99155-1244',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MIGUEL OTÁVIO OLIVEIRA DA SILVA', '2019-11-16', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99724-0767',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'SAMUEL HENRIQUE SILVA SANTOS', '2019-05-21', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99745-9595',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MIGUEL SANTOS FIGUEREDO', '2019-09-24', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99109-2990',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MATHEUS GABRIEL RUBENS BERSI PACHECO', '2019-12-19', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(11)99925-2607',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'EMANUELE VITÓRIA FERREIRA DE SOUZA', '2020-02-26', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(43)99116-0094',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MIGUEL OTÁVIO OLIVEIRA DA SILVA', '2019-11-16', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99724-0767',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    -- Turma Base: Infantil 2
    INSERT INTO turmas_base (nome, idade_minima_meses, idade_maxima_meses, descricao)
    VALUES ('Infantil 2', 0, 72, 'Turma de Infantil 2')
    ON CONFLICT (nome) DO NOTHING;

    -- Turma: Infantil 2 - A
    INSERT INTO turmas (cmei_id, nome, turma_base, capacidade, turno, ativo)
    VALUES (v_cmei_id, 'Infantil 2 - A', 'Infantil 2', 30, 'Integral', true)
    RETURNING id INTO v_turma_id;

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'AGHATA SOFIA DIAS XAVIER', '2023-03-27', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99722-1362',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'DAVI SECOTI FURLAN', '2023-06-13', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99729-1458',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'FELICITY MIRANDA APOLINÁRIO', '2023-05-04', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99183-0242',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'GABRIEL MORAIS BRIGANTINI', '2023-05-03', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99143-1023',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'HEITOR PEREIRA DA SILVA', '2023-05-27', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(41)99946-9183',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'HELENA CELESTINO FERNANDES', '2023-02-07', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99723-7161',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ISABELA DOS SANTOS CORREIA', '2023-03-13', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99148-9003',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ISIS HELENA RODRIGUES SANTOS', '2023-03-07', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99101-3063',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ISIS NOVAIS FERREIRA', '2023-01-03', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99136-7724',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'JOAQUIM DE LIMA RODRIGUES', '2023-01-24', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99964-2491',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MARIA CECÍLIA SILVA LIMA', '2023-03-26', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(11)98202-0131',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MARIANA DA CRUZ RIBEIRO', '2023-06-05', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99123-6558',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MELYSSA AZEVEDO SILVA SIQUEIRA', '2023-01-03', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99173-1001',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'SOFIA VILELA SANTOS', '2023-06-09', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99922-9765',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'YURI RODRIGUES VIANA', '2023-05-17', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99136-2294',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'WILLIAN NETO DE OLIVEIRA PALARO', '2023-01-17', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99103-3648',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    -- Turma Base: Infantil 2
    INSERT INTO turmas_base (nome, idade_minima_meses, idade_maxima_meses, descricao)
    VALUES ('Infantil 2', 0, 72, 'Turma de Infantil 2')
    ON CONFLICT (nome) DO NOTHING;

    -- Turma: Infantil 2 - B
    INSERT INTO turmas (cmei_id, nome, turma_base, capacidade, turno, ativo)
    VALUES (v_cmei_id, 'Infantil 2 - B', 'Infantil 2', 30, 'Integral', true)
    RETURNING id INTO v_turma_id;

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'BERNARDO PEREIRA DE ALMEIDA', '2022-09-20', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99108-3774',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'DAVI BONFIM PERES', '2022-08-09', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99107-9236',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ELISA MURZIN BISSONI', '2022-11-29', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99161-1982',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'EMANUELLY CARDOSO DE OLIVEIRA', '2022-12-20', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99153-1847',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'GAEL DOS SANTOS MACIEL', '2022-08-18', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99835-2293',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'GAEL PATROCINIO DA SILVA', '2022-10-11', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99708-5926',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'HELOISA DOS SANTOS REIS', '2022-12-25', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99166-0569',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'LARA AYNA SHIGUIHARA DOS SANTOS', '2022-07-26', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99169-3088',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'LOUISE APOLINARIO DE SOUZA', '2022-08-30', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99175-7670',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MARIA ALICE GOIS DOCINE', '2022-08-16', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99176-9155',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MIGUEL BARBOZA DA SILVA', '2022-12-20', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99135-0206',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'SOPHIA PEREIRA LOPES', '2022-11-12', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99109-0533',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'EMANUELLY ZAMPOLO ALVES', '2022-12-02', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99136-3920',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'HELLENA DOS SANTOS BUENO', '2022-02-06', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99181-0731',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MARIA LUISA TOMIOKA FERREIRA', '2022-11-29', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99121-3636',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ALANA GABRIELLY CRUZ SOUZA', '2022-11-20', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(11)96824-8473',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'LAURA BATISTA DE OLIVEIRA', '2022-07-04', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99803-0352',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    -- Turma Base: Infantil 2
    INSERT INTO turmas_base (nome, idade_minima_meses, idade_maxima_meses, descricao)
    VALUES ('Infantil 2', 0, 72, 'Turma de Infantil 2')
    ON CONFLICT (nome) DO NOTHING;

    -- Turma: Infantil 2 - C
    INSERT INTO turmas (cmei_id, nome, turma_base, capacidade, turno, ativo)
    VALUES (v_cmei_id, 'Infantil 2 - C', 'Infantil 2', 30, 'Integral', true)
    RETURNING id INTO v_turma_id;

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'CECÍLIA CUSTODIO SANTOS', '2022-07-12', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99859-9660',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'CLARA TIETZ LUCAS', '2022-07-12', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99125-3969',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'DAVI LUCAS INÁCIO ZAMPOLO', '2022-03-06', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99117-7901',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ELISA SANTOS AMARO', '2022-05-17', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99139-3991',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'GAEL SOARES LEITE PEREIRA', '2022-06-19', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99178-4978',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ISAAC DE OLIVEIRA DOS SANTOS', '2022-06-26', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99707-2076',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ISÍS BONFIGLIO KOLI', '2022-07-07', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99173-6267',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'LARA HELLOÁ FERMINO', '2022-02-22', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99168-2137',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'LAURA KELLY DE OLIVEIRA VALLIM', '2022-05-31', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99809-8058',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MAITÊ GONÇALVES NASCIMENTO', '2022-06-21', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99912-2085',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MARIA ALICE PATROCINIO MONTALVÃO', '2022-01-11', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99101-6242',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MARIA JÚLIA DA SILVA SAVIERI', '2022-02-17', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99162-8717',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'NARA JASMIN FERNANDES ZAMPOLO', '2022-06-21', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99134-6221',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'PEDRO MIGUEL INÁCIO ZAMPOLO', '2022-03-06', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99117-7901',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'HEITOR BENTO MORENO CIMINO', '2022-06-10', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(21)97898-0026',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    -- Turma Base: Infantil 3
    INSERT INTO turmas_base (nome, idade_minima_meses, idade_maxima_meses, descricao)
    VALUES ('Infantil 3', 0, 72, 'Turma de Infantil 3')
    ON CONFLICT (nome) DO NOTHING;

    -- Turma: Infantil 3 - A
    INSERT INTO turmas (cmei_id, nome, turma_base, capacidade, turno, ativo)
    VALUES (v_cmei_id, 'Infantil 3 - A', 'Infantil 3', 30, 'Integral', true)
    RETURNING id INTO v_turma_id;

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ANTONELLA GONÇALVES DOS SANTOS', '2022-02-23', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99267-9040',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'BENJAMIN CORREIA', '2022-02-15', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(42)99918-2972',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'CLARA SOFIA GUIMARÃES DE BRITO', '2021-10-21', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99712-9764',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'EMANUEL FERREIRA DE LIMA', '2021-12-14', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99148-0573',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'GAEL HENRIQUE GOMES MACHADO', '2022-02-22', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99921-8659',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'GAEL MARTIN BENEDITO', '2021-11-18', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99752-2018',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'GUILHERME EDNO MONTE DA SILVA CANO', '2021-09-08', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99103-7978',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'GUSTAVO LUIZ MONTE DA SIVA CANO', '2021-09-08', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99103-7978',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'JOÃO LUCAS SOARES MANARIM', '2021-11-02', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99151-7475',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'JOSÉ CAETANO ARIZA', '2021-11-02', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99124-0915',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MANUELLA DA SILVA ALEGRANCI', '2022-02-27', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99147-9497',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MANUELLY RAYANE DE OLIVEIRA SANTOS', '2021-12-06', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99117-4712',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MARIA CECÍLIA GOMES RIBEIRO', '2021-10-12', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99922-0857',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'PEDRO GARCIA XAVIER', '2021-11-09', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99146-3878',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'RAVI RUIPERES MARQUES DE JESUS', '2021-10-24', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99997-7910',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ANDRÉ GOMES ZILIO', '2021-05-06', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(49)99938-7723',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'LORENZO HENRIQUE SILVA MARTINS', '2022-03-08', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(31)99064-7361',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MARIA LUÍZA MOLINA DE OLIVEIRA', '2021-06-01', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99135-8268',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'DEIKER DAVID GONZALEZ HIDALGO', '2022-03-25', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(42)99842-7729',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    -- Turma Base: Infantil 3
    INSERT INTO turmas_base (nome, idade_minima_meses, idade_maxima_meses, descricao)
    VALUES ('Infantil 3', 0, 72, 'Turma de Infantil 3')
    ON CONFLICT (nome) DO NOTHING;

    -- Turma: Infantil 3 - B
    INSERT INTO turmas (cmei_id, nome, turma_base, capacidade, turno, ativo)
    VALUES (v_cmei_id, 'Infantil 3 - B', 'Infantil 3', 30, 'Integral', true)
    RETURNING id INTO v_turma_id;

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ATÍLIO MONTEIRO SANTOS', '2021-04-08', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99128-7713',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'BENICIO MARTINS DA SILVA', '2021-04-23', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99143-1168',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'BENJAMIM PONTES LIMA', '2021-05-25', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(61)99935-4678',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'JOÃO GUILHERME DA SILVA FAJARDO', '2021-04-16', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99139-2736',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'KETLYN ARAUJO PIRES', '2021-05-06', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99136-4810',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'LORENA FERREIRA SALES', '2021-05-11', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99143-4273',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'LUIZ RICARDO ALVES VIANA', '2021-06-24', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99117-7207',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'NOAH DOS SANTOS RISSARDO', '2021-05-04', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99122-0888',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'RAFAELLY SOPHIA DE LIMA ROCHA', '2021-08-10', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99161-6266',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'RAUAN LORENZO MIRANDA SOARES', '2021-08-23', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99876-3208',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'SAMUEL LIMA DE OLIVEIRA RAMBO', '2021-05-01', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99717-8726',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'TAILAN SANTOS DE SÁ', '2021-06-29', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99959-2056',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'TAYLLOR BENÍCIO DOS SANTOS', '2021-04-06', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99183-5623',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'CADU MIGUEL TENDULO', '2021-11-26', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99179-1987',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'DAVI LUCCA OLIVEIRA DA SILVA', '2021-07-09', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99724-0767',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ANA LÍVIA DE JESUS DE OLIVEIRA', '2021-04-12', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(18)98124-9588',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MAYSA VITORIA LAMIM PAUFERRO', '2021-06-28', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99146-0587',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    -- Turma Base: Infantil 0
    INSERT INTO turmas_base (nome, idade_minima_meses, idade_maxima_meses, descricao)
    VALUES ('Infantil 0', 0, 72, 'Turma de Infantil 0')
    ON CONFLICT (nome) DO NOTHING;

    -- Turma: Infantil 0 - A
    INSERT INTO turmas (cmei_id, nome, turma_base, capacidade, turno, ativo)
    VALUES (v_cmei_id, 'Infantil 0 - A', 'Infantil 0', 30, 'Integral', true)
    RETURNING id INTO v_turma_id;

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'RAEL LUCCA MIRANDA SOARES', '2024-06-11', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99967-9720',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'SARA VILELA SANTOS', '2025-01-21', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99922-9765',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'HELISA HADASSA VILELA DOS ANJOS', '2025-02-04', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99134-2558',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'EMANUELY SOUZA SANTOS', '2025-02-25', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99953-8544',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ÍSIS NOVAIS DELVECHIO', '2024-08-06', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99767-5454',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MARIA LIZ SILVA ILÁRIO', '2024-09-10', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99138-0945',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'GAEL HENRIQUE DA SILVA', '2024-06-11', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99117-5455',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    -- Turma Base: Infantil 1
    INSERT INTO turmas_base (nome, idade_minima_meses, idade_maxima_meses, descricao)
    VALUES ('Infantil 1', 0, 72, 'Turma de Infantil 1')
    ON CONFLICT (nome) DO NOTHING;

    -- Turma: Infantil 1 - A
    INSERT INTO turmas (cmei_id, nome, turma_base, capacidade, turno, ativo)
    VALUES (v_cmei_id, 'Infantil 1 - A', 'Infantil 1', 30, 'Integral', true)
    RETURNING id INTO v_turma_id;

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ISAAC HENRIQUE BONO DE SANTANA', '2024-01-09', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99812-8336',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ÍSIS MARIA GREGIANIN', '2024-02-13', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99129-7040',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'JOSÉ PIETRO CARNEVALI DE OLIVEIRA GAZOLA', '2024-03-11', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99824-2485',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'LÍVIA GREGIANIN RIBAS', '2024-04-16', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99126-0411',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MAITÊ DA SILVA APOLINARIO', '2024-03-29', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99729-2047',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'OTÁVIO BARROS ALAVARSE', '2024-04-16', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99937-5771',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'JOAQUIM RODRIGUES BEM', '2024-06-12', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(18)99691-1993',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'IZADORA BISSONI LATZENCO', '2024-03-12', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99114-0383',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'THÉO MORENO CIMINO', '2024-03-01', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(21)97898-0026',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'GAEL FRANCO MACHADO', '2024-03-06', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99137-5565',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    -- Turma Base: Infantil 1
    INSERT INTO turmas_base (nome, idade_minima_meses, idade_maxima_meses, descricao)
    VALUES ('Infantil 1', 0, 72, 'Turma de Infantil 1')
    ON CONFLICT (nome) DO NOTHING;

    -- Turma: Infantil 1 - B
    INSERT INTO turmas (cmei_id, nome, turma_base, capacidade, turno, ativo)
    VALUES (v_cmei_id, 'Infantil 1 - B', 'Infantil 1', 30, 'Integral', true)
    RETURNING id INTO v_turma_id;

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'HELENA ALMEIDA GONÇALVES', '2023-12-26', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99135-4896',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'HELENA LUIZA SILVA SALES', '2023-07-25', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99165-9076',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'KAUÊ YURI TAGUCHI FERMINO', '2023-11-14', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99107-2544',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'LEVI AUGUSTO DE OLIVEIRA RODRIGUES', '2023-09-08', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99176-7803',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MARIA ALICE ILÁRIO CONSTANTINO', '2023-09-12', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99161-4335',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MARIA CECÍLIA FERNANDES PASSOS', '2023-06-09', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99175-2051',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'MURILO ANGELO DIAS', '2023-12-26', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99121-1438',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'REBECA DOS SANTOS LAURENTINO', '2023-07-23', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(19)99486-2774',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'BRAYAN DAVI SOUZA SANTOS', '2023-12-07', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99953-8544',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

    INSERT INTO criancas (
        nome, data_nascimento, sexo, 
        responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone, 
        cep, status, cmei_atual_id, turma_atual_id,
        aceita_qualquer_cmei, programas_sociais
    ) VALUES (
        'ANTONELLA BONOME DE OLIVEIRA', '2023-07-26', 'Feminino',
        'Administrador', '178.409.019-05', 'admin@diamantedonorte.pr.gov.br', '(44)99147-4706',
        '87990-000', 'Matriculado', v_cmei_id, v_turma_id,
        false, false
    );

END $$;

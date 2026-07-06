import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autenticado');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    // Verificar se é superadmin
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError || !roles?.some(r => r.role === 'superadmin')) {
      throw new Error('Acesso negado. Apenas superadmin pode gerar dados fictícios.');
    }

    console.log('Iniciando geração de dados fictícios...');

    // 1. Criar CMEIs fictícios
    const cmeis = [
      {
        nome: 'CMEI Jardim das Flores',
        endereco: 'Rua das Acácias, 123',
        bairro: 'Centro',
        telefone: '(41) 3333-4444',
        email: 'jardimflores@educacao.gov.br',
        capacidade_total: 120,
        ativo: true,
      },
      {
        nome: 'CMEI Pequenos Sonhadores',
        endereco: 'Av. Principal, 456',
        bairro: 'Jardim América',
        telefone: '(41) 3333-5555',
        email: 'sonhadores@educacao.gov.br',
        capacidade_total: 100,
        ativo: true,
      },
      {
        nome: 'CMEI Arco-Íris',
        endereco: 'Rua Colorida, 789',
        bairro: 'Vila Nova',
        telefone: '(41) 3333-6666',
        email: 'arcoiris@educacao.gov.br',
        capacidade_total: 80,
        ativo: true,
      },
    ];

    const { data: cmeisInseridos, error: cmeiError } = await supabase
      .from('cmeis')
      .insert(cmeis)
      .select();

    if (cmeiError) throw cmeiError;
    console.log(`${cmeisInseridos.length} CMEIs criados`);

    // 2. Criar turmas para cada CMEI
    const turmas = [];
    const turmasBase = ['Berçário I', 'Berçário II', 'Maternal I', 'Maternal II', 'Pré I', 'Pré II'];
    
    for (const cmei of cmeisInseridos) {
      for (const turmaBase of turmasBase) {
        turmas.push({
          nome: `${turmaBase} - Manhã`,
          turma_base: turmaBase,
          turno: 'Manhã',
          cmei_id: cmei.id,
          capacidade: 20,
          idade_minima: turmaBase === 'Berçário I' ? 0 : turmaBase === 'Berçário II' ? 12 : turmaBase === 'Maternal I' ? 24 : turmaBase === 'Maternal II' ? 36 : turmaBase === 'Pré I' ? 48 : 60,
          idade_maxima: turmaBase === 'Berçário I' ? 11 : turmaBase === 'Berçário II' ? 23 : turmaBase === 'Maternal I' ? 35 : turmaBase === 'Maternal II' ? 47 : turmaBase === 'Pré I' ? 59 : 71,
          ativo: true,
        });
      }
    }

    const { data: turmasInseridas, error: turmaError } = await supabase
      .from('turmas')
      .insert(turmas)
      .select();

    if (turmaError) throw turmaError;
    console.log(`${turmasInseridas.length} turmas criadas`);

    // 3. Criar crianças fictícias
    const nomesCriancas = [
      'Ana Silva', 'João Santos', 'Maria Oliveira', 'Pedro Costa', 'Laura Souza',
      'Lucas Lima', 'Beatriz Alves', 'Gabriel Pereira', 'Sofia Ferreira', 'Miguel Rodrigues',
      'Alice Martins', 'Rafael Carvalho', 'Helena Gomes', 'Davi Ribeiro', 'Isabella Barbosa',
      'Enzo Cardoso', 'Manuela Rocha', 'Arthur Araújo', 'Julia Monteiro', 'Lorenzo Dias',
    ];

    const responsaveis = [
      { nome: 'Carlos Silva', cpf: '111.111.111-11', telefone: '(41) 99999-0001' },
      { nome: 'Mariana Santos', cpf: '222.222.222-22', telefone: '(41) 99999-0002' },
      { nome: 'Roberto Oliveira', cpf: '333.333.333-33', telefone: '(41) 99999-0003' },
      { nome: 'Juliana Costa', cpf: '444.444.444-44', telefone: '(41) 99999-0004' },
      { nome: 'Fernando Souza', cpf: '555.555.555-55', telefone: '(41) 99999-0005' },
    ];

    const criancas = [];
    
    // Criar crianças matriculadas
    let contadorMatriculadas = 0;
    for (const turma of turmasInseridas.slice(0, 9)) {
      for (let i = 0; i < 15; i++) {
        const responsavel = responsaveis[contadorMatriculadas % responsaveis.length];
        const idadeMeses = turma.idade_minima + Math.floor(Math.random() * (turma.idade_maxima - turma.idade_minima));
        const dataNascimento = new Date();
        dataNascimento.setMonth(dataNascimento.getMonth() - idadeMeses);

        criancas.push({
          nome: nomesCriancas[contadorMatriculadas % nomesCriancas.length] + ` ${contadorMatriculadas + 1}`,
          data_nascimento: dataNascimento.toISOString().split('T')[0],
          sexo: Math.random() > 0.5 ? 'Masculino' : 'Feminino',
          responsavel_nome: responsavel.nome,
          responsavel_cpf: responsavel.cpf,
          responsavel_telefone: responsavel.telefone,
          responsavel_email: `${responsavel.nome.toLowerCase().replace(' ', '.')}@email.com`,
          cmei_atual_id: turma.cmei_id,
          turma_atual_id: turma.id,
          // Manter preferências mesmo após matrícula para transparência
          cmei1_preferencia: turma.cmei_id,
          cmei2_preferencia: cmeisInseridos[(contadorMatriculadas + 1) % cmeisInseridos.length].id,
          aceita_qualquer_cmei: Math.random() > 0.5,
          status: 'Matriculado',
          prioridade: Math.random() > 0.7 ? 'Social' : 'Geral',
          programas_sociais: Math.random() > 0.7,
          logradouro: 'Rua Teste',
          numero: String(Math.floor(Math.random() * 1000)),
          bairro: 'Bairro Teste',
          cidade: 'Curitiba',
          estado: 'PR',
          cep: '80000-000',
        });
        contadorMatriculadas++;
      }
    }

    // Criar crianças na fila
    let posicaoFila = 1;
    for (let i = 0; i < 50; i++) {
      const responsavel = responsaveis[i % responsaveis.length];
      const idadeMeses = Math.floor(Math.random() * 72);
      const dataNascimento = new Date();
      dataNascimento.setMonth(dataNascimento.getMonth() - idadeMeses);

      criancas.push({
        nome: nomesCriancas[i % nomesCriancas.length] + ` Fila ${i + 1}`,
        data_nascimento: dataNascimento.toISOString().split('T')[0],
        sexo: Math.random() > 0.5 ? 'Masculino' : 'Feminino',
        responsavel_nome: responsavel.nome,
        responsavel_cpf: `${String(i).padStart(3, '0')}.${String(i).padStart(3, '0')}.${String(i).padStart(3, '0')}-${String(i).padStart(2, '0')}`,
        responsavel_telefone: `(41) 99999-${String(i).padStart(4, '0')}`,
        responsavel_email: `fila${i + 1}@email.com`,
        cmei1_preferencia: cmeisInseridos[i % cmeisInseridos.length].id,
        cmei2_preferencia: cmeisInseridos[(i + 1) % cmeisInseridos.length].id,
        aceita_qualquer_cmei: Math.random() > 0.5,
        status: 'Fila de Espera',
        posicao_fila: posicaoFila++,
        prioridade: Math.random() > 0.7 ? 'Social' : 'Geral',
        programas_sociais: Math.random() > 0.7,
        logradouro: 'Rua Teste Fila',
        numero: String(Math.floor(Math.random() * 1000)),
        bairro: 'Bairro Teste',
        cidade: 'Curitiba',
        estado: 'PR',
        cep: '80000-000',
      });
    }

    const { data: criancasInseridas, error: criancaError } = await supabase
      .from('criancas')
      .insert(criancas)
      .select();

    if (criancaError) throw criancaError;
    console.log(`${criancasInseridas.length} crianças criadas`);

    const resultado = {
      sucesso: true,
      dados: {
        cmeis: cmeisInseridos.length,
        turmas: turmasInseridas.length,
        criancas: criancasInseridas.length,
        matriculadas: criancasInseridas.filter(c => c.status === 'Matriculado').length,
        fila: criancasInseridas.filter(c => c.status === 'Fila de Espera').length,
      },
    };

    return new Response(JSON.stringify(resultado), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro ao gerar dados fictícios:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        sucesso: false, 
        erro: errorMessage 
      }),
      {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    );
  }
});

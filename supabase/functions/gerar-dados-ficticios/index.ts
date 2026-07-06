import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders } from "../_shared/cors.ts";

const TELEFONE_SEGURO = '44 9 9999-9999';
const EMAIL_SEGURO_DOMAIN = 'example.invalid';

const normalizarTexto = (value: string | null | undefined) => (value ?? '').toLowerCase().trim();

const escolherAleatorio = <T>(itens: T[]): T => {
  if (!itens.length) {
    throw new Error('Lista vazia');
  }
  return itens[Math.floor(Math.random() * itens.length)];
};

const gerarCpfValido = (base9: string) => {
  const digits = base9.replace(/\D/g, '').slice(0, 9).padEnd(9, '0');
  const nums = digits.split('').map((d) => Number(d));
  if (nums.every((n) => n === nums[0])) {
    nums[8] = (nums[8] + 1) % 10;
  }

  const calcDigit = (arr: number[], factorStart: number) => {
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
      sum += arr[i] * (factorStart - i);
    }
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const d1 = calcDigit(nums, 10);
  const d2 = calcDigit([...nums, d1], 11);
  const all = [...nums, d1, d2].join('');
  return `${all.slice(0, 3)}.${all.slice(3, 6)}.${all.slice(6, 9)}-${all.slice(9)}`;
};

const gerarEmailSeguro = (nome: string, sufixo: string) => {
  const base = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '');
  const extra = sufixo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '');
  return `${base || 'user'}.${extra || 'dev'}@${EMAIL_SEGURO_DOMAIN}`;
};

const formatarCepPorPrefixo = (prefixo: string) => {
  const digits = prefixo.replace(/\D/g, '');
  const base = digits.padEnd(8, '0').slice(0, 8);
  return `${base.slice(0, 5)}-${base.slice(5)}`;
};

const escolherCepDaZona = (zona: { ceps: string[] | null }) => {
  const ceps = zona.ceps ?? [];
  if (!ceps.length) return '00000-000';
  return formatarCepPorPrefixo(escolherAleatorio(ceps));
};

const escolherDataCadastroJanAte02Abr2026 = () => {
  const start = Date.UTC(2026, 0, 1, 8, 0, 0);
  const end = Date.UTC(2026, 3, 2, 18, 0, 0);
  const t = start + Math.floor(Math.random() * (end - start));
  return new Date(t);
};

const escolherDataCadastroAteMax = (maxInclusiveUtc: number) => {
  const start = Date.UTC(2026, 0, 1, 8, 0, 0);
  const end = Math.max(start, maxInclusiveUtc);
  const t = start + Math.floor(Math.random() * (end - start));
  return new Date(t);
};

const clampDateToRange = (d: Date) => {
  const start = Date.UTC(2026, 0, 1, 8, 0, 0);
  const end = Date.UTC(2026, 3, 2, 18, 0, 0);
  const t = Math.min(end, Math.max(start, d.getTime()));
  return new Date(t);
};

const randomBetween = (startUtcMs: number, endUtcMs: number) => {
  const a = Math.min(startUtcMs, endUtcMs);
  const b = Math.max(startUtcMs, endUtcMs);
  if (a === b) return new Date(a);
  return new Date(a + Math.floor(Math.random() * (b - a)));
};

const escolherConvocacaoDeadline = (createdAt: Date) => {
  const end = Date.UTC(2026, 3, 2, 18, 0, 0);
  const dias = 3 + Math.floor(Math.random() * 8); // 3..10
  const d = new Date(createdAt);
  d.setUTCDate(d.getUTCDate() + dias);
  if (d.getTime() > end) return new Date(end);
  return d;
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const corsHeaders = getCorsHeaders(req);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autenticado');
    }

    const token = (() => {
      const trimmed = authHeader.trim();
      const parts = trimmed.split(/\s+/).filter(Boolean);
      if (!parts.length) return '';
      if (parts.length === 1) return parts[0];
      return parts[parts.length - 1];
    })();
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

    const zonasDesejadas = [
      {
        nome: 'Zona Norte',
        descricao: 'Região norte do município',
        cor: '#ef4444',
        bairros: ['Vila Nova', 'Jardim Norte', 'Parque Industrial', 'Parque São Pedro', 'Jardim Universal', 'Jardim Ouro Verde', 'Jardim Independência'],
        ceps: ['89000', '89001'],
        ativo: true,
      },
      {
        nome: 'Zona Sul',
        descricao: 'Região sul do município',
        cor: '#22c55e',
        bairros: ['Jardim Sul', 'Vila União', 'Sarandi III', 'Jardim Social', 'Residencial São José', 'Residencial São José III', 'Conj. Mauá', 'Conj. Floresta', 'Vale Azul'],
        ceps: ['89100', '89101'],
        ativo: true,
      },
      {
        nome: 'Zona Leste',
        descricao: 'Região leste do município',
        cor: '#3b82f6',
        bairros: ['Jardim América', 'Vila Leste', 'Conjunto Habitacional', 'Jardim Verão', 'Jardim Novo Paulista', 'Jardim Novo Panorama'],
        ceps: ['89200', '89201'],
        ativo: true,
      },
      {
        nome: 'Zona Oeste',
        descricao: 'Região oeste do município',
        cor: '#f59e0b',
        bairros: ['Parque', 'Vila Oeste', 'Jardim das Palmeiras', 'Residencial Primavera', 'Conj. Bela Vista', 'Jardim Monte Rey'],
        ceps: ['89300', '89301'],
        ativo: true,
      },
      {
        nome: 'Centro',
        descricao: 'Região central do município',
        cor: '#64748b',
        bairros: ['Centro', 'Jardim Europa', 'Jardim Castelo', 'Jardim Bela Vista'],
        ceps: ['87000', '87001'],
        ativo: true,
      },
    ];

    const { data: zonasExistentes, error: zonasExistentesError } = await supabase
      .from('zonas_atendimento')
      .select('id,nome,bairros,ceps,ativo')
      .in('nome', zonasDesejadas.map((z) => z.nome));

    if (zonasExistentesError) throw zonasExistentesError;

    const zonasPorNome = new Map<string, any>();
    for (const z of zonasExistentes ?? []) {
      zonasPorNome.set(z.nome, z);
    }

    const zonasParaInserir = zonasDesejadas.filter((z) => !zonasPorNome.has(z.nome));
    if (zonasParaInserir.length) {
      const { data: zonasInseridas, error: zonasInserirError } = await supabase
        .from('zonas_atendimento')
        .insert(zonasParaInserir)
        .select('id,nome,bairros,ceps,ativo');

      if (zonasInserirError) throw zonasInserirError;
      for (const z of zonasInseridas ?? []) {
        zonasPorNome.set(z.nome, z);
      }
    }

    const zonasAtivas = Array.from(zonasPorNome.values()).filter((z) => z.ativo);
    console.log(`${zonasAtivas.length} zonas ativas`);

    const { data: configRow } = await supabase
      .from('configuracoes_sistema')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (configRow?.id) {
      await supabase
        .from('configuracoes_sistema')
        .update({
          habilitar_zoneamento: true,
          priorizar_zona: true,
          mostrar_distancia: false,
          prioridade_zona_habilitada: true,
          prioridade_zona_bonus_dentro: 5,
          prioridade_zona_bonus_fora: 0,
          preferencias_cmei_qtd: 3,
          prioridades_comprovacao_na_inscricao: true,
        })
        .eq('id', configRow.id);
    }

    const cmeis = [
      {
        nome: 'CMEI Gente Pequena',
        endereco: 'Rua Manoel Abrantes Filho, 199 - Jardim Bela Vista, Iguaraçu/PR',
        bairro: 'Jardim Bela Vista',
        capacidade_total: 120,
        latitude: -23.19891261,
        longitude: -51.82724791,
        telefone: TELEFONE_SEGURO,
        email: `contato.gentepequena@${EMAIL_SEGURO_DOMAIN}`,
        ativo: true,
      },
      {
        nome: 'CMEI Vamos Crescer Juntos',
        endereco: 'Rua Jefferson Xavier dos Santos, 48 - Jardim Bela Vista, Iguaraçu/PR',
        bairro: 'Jardim Bela Vista',
        capacidade_total: 120,
        latitude: -23.19850188,
        longitude: -51.82822261,
        telefone: TELEFONE_SEGURO,
        email: `contato.vamoscrescerjuntos@${EMAIL_SEGURO_DOMAIN}`,
        ativo: true,
      },
    ];

    const { data: cmeisExistentes, error: cmeisExistentesError } = await supabase
      .from('cmeis')
      .select('id,nome,bairro')
      .in('nome', cmeis.map((c) => c.nome));

    if (cmeisExistentesError) throw cmeisExistentesError;

    const cmeisPorNome = new Map<string, any>();
    for (const c of cmeisExistentes ?? []) {
      cmeisPorNome.set(c.nome, c);
    }

    const cmeisParaInserir = cmeis.filter((c) => !cmeisPorNome.has(c.nome));
    if (cmeisParaInserir.length) {
      const { data: cmeisInseridos, error: cmeiError } = await supabase
        .from('cmeis')
        .insert(cmeisParaInserir)
        .select('id,nome,bairro');

      if (cmeiError) throw cmeiError;
      for (const c of cmeisInseridos ?? []) {
        cmeisPorNome.set(c.nome, c);
      }
    }

    const cmeisInseridos = Array.from(cmeisPorNome.values());
    console.log(`${cmeisInseridos.length} CMEIs disponíveis`);

    const zonaPrincipalPorCmeiId = new Map<string, any>();
    const cmeiZonaPorNome = new Map<string, string>([
      ['CMEI Gente Pequena', 'Centro'],
      ['CMEI Vamos Crescer Juntos', 'Centro'],
    ]);

    for (const cmei of cmeisInseridos) {
      const zonaNome = cmeiZonaPorNome.get(cmei.nome);
      let zonaEscolhida = zonaNome ? zonasPorNome.get(zonaNome) : null;
      if (!zonaEscolhida) {
        const bairro = normalizarTexto(cmei.bairro);
        zonaEscolhida = zonasAtivas.find((z: any) =>
          (z.bairros ?? []).some((b: string) => normalizarTexto(b) === bairro)
        ) ?? null;
      }
      zonaPrincipalPorCmeiId.set(cmei.id, zonaEscolhida ?? escolherAleatorio(zonasAtivas));
    }

    const vinculos: { cmei_id: string; zona_id: string; prioridade: number }[] = [];
    for (const cmei of cmeisInseridos) {
      const zonaPrincipal = zonaPrincipalPorCmeiId.get(cmei.id);
      if (zonaPrincipal?.id) {
        vinculos.push({ cmei_id: cmei.id, zona_id: zonaPrincipal.id, prioridade: 1 });
      }
      const outrasZonas = zonasAtivas.filter((z: any) => z.id !== zonaPrincipal?.id);
      if (outrasZonas.length) {
        const secundaria = escolherAleatorio(outrasZonas);
        vinculos.push({ cmei_id: cmei.id, zona_id: secundaria.id, prioridade: 2 });
      }
    }

    if (vinculos.length) {
      const { error: vinculoError } = await supabase
        .from('cmei_zonas')
        .upsert(vinculos, { onConflict: 'cmei_id,zona_id' });

      if (vinculoError) throw vinculoError;
    }

    console.log(`${vinculos.length} vínculos CMEI-Zona criados/atualizados`);

    // 2. Criar turmas para cada CMEI (Infantil 0 a 3, Letras A, B, C)
    const turmas = [];
    const turmasBase = ['Infantil 0', 'Infantil 1', 'Infantil 2', 'Infantil 3'];
    const letras = ['A', 'B', 'C'];
    const turnos = ['Integral', 'Manhã', 'Tarde'];

    const cmeiIds = cmeisInseridos.map((c) => c.id);
    const { data: turmasExistentes, error: turmasExistentesError } = await supabase
      .from('turmas')
      .select('id,cmei_id,idade_minima,idade_maxima')
      .in('cmei_id', cmeiIds);

    if (turmasExistentesError) throw turmasExistentesError;

    const cmeiComTurmas = new Set((turmasExistentes ?? []).map((t) => t.cmei_id));

    for (const cmei of cmeisInseridos) {
      if (cmeiComTurmas.has(cmei.id)) continue;
      for (const tb of turmasBase) {
        const numVariacoes = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numVariacoes; i++) {
          const letra = letras[i];
          const turno = turnos[Math.floor(Math.random() * turnos.length)];

          let idadeMin = 0;
          let idadeMax = 0;

          if (tb === 'Infantil 0') { idadeMin = 0; idadeMax = 11; }
          else if (tb === 'Infantil 1') { idadeMin = 12; idadeMax = 23; }
          else if (tb === 'Infantil 2') { idadeMin = 24; idadeMax = 35; }
          else if (tb === 'Infantil 3') { idadeMin = 36; idadeMax = 47; }

          turmas.push({
            nome: `${tb} ${letra}`,
            turma_base: tb,
            turno: turno,
            cmei_id: cmei.id,
            capacidade: 20,
            idade_minima: idadeMin,
            idade_maxima: idadeMax,
            ativo: true,
          });
        }
      }
    }

    let turmasInseridas: any[] = turmasExistentes ?? [];
    if (turmas.length) {
      const { data: turmasCriadas, error: turmaError } = await supabase
        .from('turmas')
        .insert(turmas)
        .select('id,cmei_id,idade_minima,idade_maxima');

      if (turmaError) throw turmaError;
      turmasInseridas = [...turmasInseridas, ...(turmasCriadas ?? [])];
      console.log(`${turmasCriadas?.length ?? 0} turmas criadas`);
    } else {
      console.log('Turmas já existentes para todos os CMEIs');
    }

    // 3. Criar crianças fictícias
    const nomesCriancas = [
      'Ana Silva', 'João Santos', 'Maria Oliveira', 'Pedro Costa', 'Laura Souza',
      'Lucas Lima', 'Beatriz Alves', 'Gabriel Pereira', 'Sofia Ferreira', 'Miguel Rodrigues',
      'Alice Martins', 'Rafael Carvalho', 'Helena Gomes', 'Davi Ribeiro', 'Isabella Barbosa',
      'Enzo Cardoso', 'Manuela Rocha', 'Arthur Araújo', 'Julia Monteiro', 'Lorenzo Dias',
      'Valentina Lima', 'Bernardo Silva', 'Heitor Santos', 'Antonella Oliveira', 'Noah Costa',
    ];

    const responsaveis = [
      { nome: 'Carlos Silva' },
      { nome: 'Mariana Santos' },
      { nome: 'Roberto Oliveira' },
      { nome: 'Juliana Costa' },
      { nome: 'Fernando Souza' },
    ];

    const criancas = [];
    const coresRaca = ['amarela', 'branca', 'indigena', 'parda', 'preta', 'nao_declarada'];
    const nacionalidades = ['brasileira', 'brasileira_naturalizado', 'estrangeira'];
    const formasOcupacao = ['optou_nao_informar', 'propria', 'alugada', 'cedida', 'pensionato', 'casa_lar_abrigo', 'outro'];
    const parentescos = ['pai', 'mae', 'avo', 'avoa', 'tio', 'tia', 'padrasto', 'madrasta', 'irmao', 'irma', 'tutor_legal', 'guardiao', 'outro'];
    
    // Criar crianças matriculadas (preencher turmas)
    let contadorMatriculadas = 0;
    for (const turma of turmasInseridas) {
      // Matricular entre 5 e 15 crianças por turma
      const numCriancas = 5 + Math.floor(Math.random() * 11);
      for (let i = 0; i < numCriancas; i++) {
        const responsavel = responsaveis[contadorMatriculadas % responsaveis.length];
        const zonaCmei = zonaPrincipalPorCmeiId.get(turma.cmei_id);
        const createdAt = escolherDataCadastroJanAte02Abr2026();
        const seed = String(100000000 + contadorMatriculadas);
        const responsavelCpf = gerarCpfValido(seed);
        const filiacao1Cpf = gerarCpfValido(String(300000000 + contadorMatriculadas));
        const filiacao2Cpf = gerarCpfValido(String(400000000 + contadorMatriculadas));
        const corAutodeclarada = escolherAleatorio(coresRaca);
        const corCertidao = escolherAleatorio(coresRaca);
        const nacionalidade = escolherAleatorio(nacionalidades);
        const estrangeiroPossuiDocumentos = nacionalidade === 'estrangeira' ? Math.random() < 0.9 : null;
        const quilomboRemanescente = Math.random() < 0.05;
        const formaOcupacao = escolherAleatorio(formasOcupacao);
        const parentesco = escolherAleatorio(parentescos);
        const parentescoOutro = parentesco === 'outro' ? 'responsavel_legal' : null;
        const filiacao2NaoDeclarada = Math.random() < 0.2;
        const nis = Math.random() < 0.4 ? String(80000000000 + contadorMatriculadas).slice(0, 11) : null;
        
        // Calcular data de nascimento baseada na idade da turma e data de corte (31/03)
        const anoAtual = new Date().getFullYear();
        const dataCorte = new Date(anoAtual, 2, 31); // 31 de março
        
        // idadeMeses entre min e max da turma
        const idadeMeses = turma.idade_minima + Math.floor(Math.random() * (turma.idade_maxima - turma.idade_minima + 1));
        
        const dataNascimento = new Date(dataCorte);
        dataNascimento.setMonth(dataNascimento.getMonth() - idadeMeses);
        // Ajuste aleatório de dias para não ser sempre o mesmo dia do mês
        dataNascimento.setDate(1 + Math.floor(Math.random() * 28));

        const statusMatricula = (() => {
          const r = Math.random();
          if (r < 0.06) return 'Desistente';
          if (r < 0.12) return 'Concluinte';
          return 'Matriculado';
        })();

        criancas.push({
          nome: nomesCriancas[contadorMatriculadas % nomesCriancas.length] + ` ${contadorMatriculadas + 1}`,
          data_nascimento: dataNascimento.toISOString().split('T')[0],
          sexo: Math.random() > 0.5 ? 'Masculino' : 'Feminino',
          responsavel_nome: responsavel.nome,
          responsavel_cpf: responsavelCpf,
          responsavel_telefone: TELEFONE_SEGURO,
          responsavel_email: gerarEmailSeguro(responsavel.nome, `resp${seed}`),
          responsavel_celular: TELEFONE_SEGURO,
          responsavel_telefone_comercial: TELEFONE_SEGURO,
          responsavel_rg: `RG${seed}`,
          responsavel_parentesco: parentesco,
          responsavel_parentesco_outro: parentescoOutro,
          canal_notificacao_preferido: 'email',
          cor_raca_autodeclarada: corAutodeclarada,
          cor_raca_certidao: corCertidao,
          etnia_indigena: corAutodeclarada === 'indigena' ? 'guarani' : null,
          etnia_indigena_outra: null,
          quilombo_remanescente: quilomboRemanescente,
          quilombo_nome: quilomboRemanescente ? 'Quilombo Exemplo' : null,
          nacionalidade,
          estrangeiro_possui_documentos: estrangeiroPossuiDocumentos,
          nis,
          unidade_consumidora: String(9000000000 + contadorMatriculadas),
          forma_ocupacao_moradia: formaOcupacao,
          forma_ocupacao_moradia_outro: formaOcupacao === 'outro' ? 'outro' : null,
          filiacao1_nao_declarada: false,
          filiacao1_nome: 'Maria da Silva',
          filiacao1_rg: `RGF1${seed}`,
          filiacao1_cpf: filiacao1Cpf,
          filiacao1_email: gerarEmailSeguro('Maria da Silva', `f1${seed}`),
          filiacao1_celular: TELEFONE_SEGURO,
          filiacao1_telefone_comercial: TELEFONE_SEGURO,
          filiacao2_nao_declarada: filiacao2NaoDeclarada,
          filiacao2_nome: filiacao2NaoDeclarada ? null : 'José da Silva',
          filiacao2_rg: filiacao2NaoDeclarada ? null : `RGF2${seed}`,
          filiacao2_cpf: filiacao2NaoDeclarada ? null : filiacao2Cpf,
          filiacao2_email: filiacao2NaoDeclarada ? null : gerarEmailSeguro('José da Silva', `f2${seed}`),
          filiacao2_celular: filiacao2NaoDeclarada ? null : TELEFONE_SEGURO,
          filiacao2_telefone_comercial: filiacao2NaoDeclarada ? null : TELEFONE_SEGURO,
          cmei_atual_id: turma.cmei_id,
          turma_atual_id: turma.id,
          cmei1_preferencia: turma.cmei_id,
          cmei2_preferencia: cmeisInseridos[(contadorMatriculadas + 1) % cmeisInseridos.length].id,
          aceita_qualquer_cmei: Math.random() > 0.5,
          status: statusMatricula,
          prioridade: 'Geral',
          programas_sociais: false,
          logradouro: 'Rua Teste',
          numero: String(Math.floor(Math.random() * 1000)),
          bairro: (cmeisInseridos.find((c) => c.id === turma.cmei_id)?.bairro as string) ?? 'Centro',
          cidade: 'Iguaraçu',
          estado: 'PR',
          cep: zonaCmei ? escolherCepDaZona(zonaCmei) : '00000-000',
          zona_atendimento_id: zonaCmei?.id ?? null,
          created_at: createdAt.toISOString(),
        });
        contadorMatriculadas++;
      }
    }

    // Criar crianças na fila (50 crianças)
    const convocadasSet = new Set<number>(
      [...Array(50).keys()].sort(() => Math.random() - 0.5).slice(0, 10)
    );
    for (let i = 0; i < 50; i++) {
      const responsavel = responsaveis[i % responsaveis.length];
      const zona = escolherAleatorio(zonasAtivas);
      const bairrosZona = (zona.bairros ?? []) as string[];
      const bairroZona = bairrosZona.length ? escolherAleatorio(bairrosZona) : 'Centro';
      const seed = String(200000000 + i);
      const responsavelCpf = gerarCpfValido(seed);
      const filiacao1Cpf = gerarCpfValido(String(500000000 + i));
      const filiacao2Cpf = gerarCpfValido(String(600000000 + i));
      const corAutodeclarada = escolherAleatorio(coresRaca);
      const corCertidao = escolherAleatorio(coresRaca);
      const nacionalidade = escolherAleatorio(nacionalidades);
      const estrangeiroPossuiDocumentos = nacionalidade === 'estrangeira' ? Math.random() < 0.9 : null;
      const quilomboRemanescente = Math.random() < 0.05;
      const formaOcupacao = escolherAleatorio(formasOcupacao);
      const parentesco = escolherAleatorio(parentescos);
      const parentescoOutro = parentesco === 'outro' ? 'responsavel_legal' : null;
      const filiacao2NaoDeclarada = Math.random() < 0.2;
      const nis = Math.random() < 0.4 ? String(70000000000 + i).slice(0, 11) : null;
      
      // Idade aleatória entre 0 e 47 meses (Infantil 0 a 3)
      const idadeMeses = Math.floor(Math.random() * 48);
      const anoAtual = new Date().getFullYear();
      const dataCorte = new Date(anoAtual, 2, 31);
      const dataNascimento = new Date(dataCorte);
      dataNascimento.setMonth(dataNascimento.getMonth() - idadeMeses);
      dataNascimento.setDate(1 + Math.floor(Math.random() * 28));

      const cmeisMesmaZona = cmeisInseridos.filter((c) => zonaPrincipalPorCmeiId.get(c.id)?.id === zona.id);
      const cmei1 = (i % 2 === 0 && cmeisMesmaZona.length) ? escolherAleatorio(cmeisMesmaZona) : escolherAleatorio(cmeisInseridos);
      const restantes = cmeisInseridos.filter((c) => c.id !== cmei1.id);
      const cmei2 = restantes.length ? escolherAleatorio(restantes) : cmei1;
      const restantes2 = restantes.filter((c) => c.id !== cmei2.id);
      const cmei3 = restantes2.length ? escolherAleatorio(restantes2) : null;
      const createdAt = (() => {
        if (!convocadasSet.has(i)) return escolherDataCadastroJanAte02Abr2026();
        const endMinus10Days = Date.UTC(2026, 3, 2, 18, 0, 0) - 10 * 24 * 60 * 60 * 1000;
        return escolherDataCadastroAteMax(endMinus10Days);
      })();
      const isConvocada = convocadasSet.has(i);
      const convocatoriaDeadline = isConvocada ? escolherConvocacaoDeadline(createdAt) : null;
      const dataRetornoFila = (() => {
        if (isConvocada) return null;
        if (Math.random() >= 0.2) return null;
        const end = Date.UTC(2026, 3, 2, 18, 0, 0);
        const start = createdAt.getTime();
        if (start >= end) return null;
        const t = start + Math.floor(Math.random() * (end - start));
        return new Date(t);
      })();

      criancas.push({
        nome: nomesCriancas[i % nomesCriancas.length] + ` Fila ${i + 1}`,
        data_nascimento: dataNascimento.toISOString().split('T')[0],
        sexo: Math.random() > 0.5 ? 'Masculino' : 'Feminino',
        responsavel_nome: responsavel.nome,
        responsavel_cpf: responsavelCpf,
        responsavel_telefone: TELEFONE_SEGURO,
        responsavel_email: gerarEmailSeguro(responsavel.nome, `fila${seed}`),
        responsavel_celular: TELEFONE_SEGURO,
        responsavel_telefone_comercial: TELEFONE_SEGURO,
        responsavel_rg: `RG${seed}`,
        responsavel_parentesco: parentesco,
        responsavel_parentesco_outro: parentescoOutro,
        canal_notificacao_preferido: 'email',
        cor_raca_autodeclarada: corAutodeclarada,
        cor_raca_certidao: corCertidao,
        etnia_indigena: corAutodeclarada === 'indigena' ? 'kaingang' : null,
        etnia_indigena_outra: null,
        quilombo_remanescente: quilomboRemanescente,
        quilombo_nome: quilomboRemanescente ? 'Quilombo Exemplo' : null,
        nacionalidade,
        estrangeiro_possui_documentos: estrangeiroPossuiDocumentos,
        nis,
        unidade_consumidora: String(9100000000 + i),
        forma_ocupacao_moradia: formaOcupacao,
        forma_ocupacao_moradia_outro: formaOcupacao === 'outro' ? 'outro' : null,
        filiacao1_nao_declarada: false,
        filiacao1_nome: 'Maria da Silva',
        filiacao1_rg: `RGF1${seed}`,
        filiacao1_cpf: filiacao1Cpf,
        filiacao1_email: gerarEmailSeguro('Maria da Silva', `f1${seed}`),
        filiacao1_celular: TELEFONE_SEGURO,
        filiacao1_telefone_comercial: TELEFONE_SEGURO,
        filiacao2_nao_declarada: filiacao2NaoDeclarada,
        filiacao2_nome: filiacao2NaoDeclarada ? null : 'José da Silva',
        filiacao2_rg: filiacao2NaoDeclarada ? null : `RGF2${seed}`,
        filiacao2_cpf: filiacao2NaoDeclarada ? null : filiacao2Cpf,
        filiacao2_email: filiacao2NaoDeclarada ? null : gerarEmailSeguro('José da Silva', `f2${seed}`),
        filiacao2_celular: filiacao2NaoDeclarada ? null : TELEFONE_SEGURO,
        filiacao2_telefone_comercial: filiacao2NaoDeclarada ? null : TELEFONE_SEGURO,
        cmei1_preferencia: cmei1.id,
        cmei2_preferencia: cmei2.id,
        cmei3_preferencia: cmei3?.id ?? null,
        aceita_qualquer_cmei: Math.random() > 0.5,
        status: isConvocada ? 'Convocado' : 'Fila de Espera',
        prioridade: 'Geral',
        programas_sociais: false,
        logradouro: 'Rua Teste Fila',
        numero: String(Math.floor(Math.random() * 1000)),
        bairro: bairroZona,
        cidade: 'Iguaraçu',
        estado: 'PR',
        cep: escolherCepDaZona(zona),
        zona_atendimento_id: zona.id,
        created_at: createdAt.toISOString(),
        convocacao_deadline: convocatoriaDeadline ? convocatoriaDeadline.toISOString().split('T')[0] : null,
        data_retorno_fila: dataRetornoFila ? dataRetornoFila.toISOString() : null,
      });
    }

    const { data: criancasInseridas, error: criancaError } = await supabase
      .from('criancas')
      .insert(criancas)
      .select();

    if (criancaError) throw criancaError;
    console.log(`${criancasInseridas.length} crianças criadas`);

    // 4. Atribuir prioridades federais para parte das crianças da fila
    const { data: tiposPrioridadeAtivos, error: tiposError } = await supabase
      .from('tipos_prioridade')
      .select('id,nome,peso,ativo,exige_documento,documento_tipo_id')
      .eq('ativo', true);
    if (tiposError) throw tiposError;

    const criancasFila = (criancasInseridas ?? []).filter((c: any) => c.status === 'Fila de Espera' || c.status === 'Convocado');
    const prioridadesParaInserir: any[] = [];
    for (const c of criancasFila) {
      const sorteio = Math.random();
      let qtd = 0;
      if (sorteio < 0.6) qtd = 1;
      else if (sorteio < 0.85) qtd = 2;
      else qtd = 0;
      const prioridadesEscolhidas = [...(tiposPrioridadeAtivos ?? [])].sort(() => Math.random() - 0.5).slice(0, qtd);
      for (const p of prioridadesEscolhidas) {
        const aprovado = Math.random() < 0.7;
        prioridadesParaInserir.push({
          crianca_id: c.id,
          prioridade_id: p.id,
          status: aprovado ? 'aprovado' : 'pendente',
          documento_comprovante_url: null,
        });
      }
    }
    if (prioridadesParaInserir.length) {
      const { error: prioInsertError } = await supabase
        .from('crianca_prioridades')
        .insert(prioridadesParaInserir);
      if (prioInsertError) throw prioInsertError;
      console.log(`${prioridadesParaInserir.length} vínculos de prioridades criados`);
    }

    // 5. Recalcular posições de fila
    await supabase.rpc('recalcular_posicoes_fila');

    // 6. Gerar histórico (fila e matrículas)
    const historicos: any[] = [];
    const rangeEnd = Date.UTC(2026, 3, 2, 18, 0, 0);

    for (const c of criancasInseridas ?? []) {
      const createdAt = c.created_at ? new Date(c.created_at) : escolherDataCadastroJanAte02Abr2026();
      const createdAtClamped = clampDateToRange(createdAt);

      const inscricaoAt = clampDateToRange(randomBetween(createdAtClamped.getTime(), Math.min(rangeEnd, createdAtClamped.getTime() + 2 * 24 * 60 * 60 * 1000)));
      historicos.push({
        crianca_id: c.id,
        acao: 'Inscrição Realizada',
        descricao: 'Inscrição registrada no sistema',
        status_anterior: null,
        status_novo: 'Fila de Espera',
        usuario_id: user.id,
        created_at: inscricaoAt.toISOString(),
      });

      if (c.status === 'Convocado') {
        const convAt = clampDateToRange(randomBetween(inscricaoAt.getTime(), Math.min(rangeEnd, inscricaoAt.getTime() + 15 * 24 * 60 * 60 * 1000)));
        historicos.push({
          crianca_id: c.id,
          acao: 'Convocação para Matrícula',
          descricao: 'Convocada para confirmar matrícula',
          status_anterior: 'Fila de Espera',
          status_novo: 'Convocado',
          cmei_novo: c.cmei1_preferencia ?? null,
          usuario_id: user.id,
          created_at: convAt.toISOString(),
        });
      }

      if (c.status === 'Matriculado' || c.status === 'Matriculada' || c.status === 'Desistente' || c.status === 'Concluinte') {
        const convAt = clampDateToRange(randomBetween(inscricaoAt.getTime(), Math.min(rangeEnd, inscricaoAt.getTime() + 10 * 24 * 60 * 60 * 1000)));
        historicos.push({
          crianca_id: c.id,
          acao: 'Convocação para Matrícula',
          descricao: 'Convocada para confirmar matrícula',
          status_anterior: 'Fila de Espera',
          status_novo: 'Convocado',
          cmei_novo: c.cmei1_preferencia ?? c.cmei_atual_id ?? null,
          usuario_id: user.id,
          created_at: convAt.toISOString(),
        });

        const matriculaAt = clampDateToRange(randomBetween(convAt.getTime(), Math.min(rangeEnd, convAt.getTime() + 7 * 24 * 60 * 60 * 1000)));
        historicos.push({
          crianca_id: c.id,
          acao: 'Matrícula Confirmada',
          descricao: 'Matrícula confirmada e vaga preenchida',
          status_anterior: 'Convocado',
          status_novo: 'Matriculado',
          cmei_novo: c.cmei_atual_id ?? c.cmei1_preferencia ?? null,
          turma_novo: c.turma_atual_id ?? null,
          usuario_id: user.id,
          created_at: matriculaAt.toISOString(),
        });

        if (c.status === 'Desistente') {
          const desistAt = clampDateToRange(randomBetween(matriculaAt.getTime(), Math.min(rangeEnd, matriculaAt.getTime() + 10 * 24 * 60 * 60 * 1000)));
          historicos.push({
            crianca_id: c.id,
            acao: 'Desistência',
            descricao: 'Matrícula marcada como desistente',
            status_anterior: 'Matriculado',
            status_novo: 'Desistente',
            cmei_anterior: c.cmei_atual_id ?? c.cmei1_preferencia ?? null,
            turma_anterior: c.turma_atual_id ?? null,
            usuario_id: user.id,
            created_at: desistAt.toISOString(),
          });
        }

        if (c.status === 'Concluinte') {
          const conclAt = clampDateToRange(randomBetween(matriculaAt.getTime(), Math.min(rangeEnd, matriculaAt.getTime() + 20 * 24 * 60 * 60 * 1000)));
          historicos.push({
            crianca_id: c.id,
            acao: 'Concluinte',
            descricao: 'Ciclo concluído na educação infantil',
            status_anterior: 'Matriculado',
            status_novo: 'Concluinte',
            cmei_anterior: c.cmei_atual_id ?? c.cmei1_preferencia ?? null,
            turma_anterior: c.turma_atual_id ?? null,
            usuario_id: user.id,
            created_at: conclAt.toISOString(),
          });
        }
      }
    }

    if (historicos.length) {
      const { error: histError } = await supabase.from('historico').insert(historicos);
      if (histError) throw histError;
      console.log(`${historicos.length} registros de histórico criados`);
    }

    const resultado = {
      sucesso: true,
      dados: {
        cmeis: cmeisInseridos.length,
        turmas: turmasInseridas.length,
        criancas: criancasInseridas.length,
        matriculadas: criancasInseridas.filter(c => c.status === 'Matriculado' || c.status === 'Matriculada').length,
        desistentes: criancasInseridas.filter(c => c.status === 'Desistente').length,
        concluintes: criancasInseridas.filter(c => c.status === 'Concluinte').length,
        fila: criancasInseridas.filter(c => c.status === 'Fila de Espera').length,
        zonas: zonasAtivas.length,
        vinculos_cmei_zona: vinculos.length,
        convocadas: criancasInseridas.filter(c => c.status === 'Convocado').length,
        historico: historicos.length,
      },
    };

    return new Response(JSON.stringify(resultado), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro ao gerar dados fictícios:', error);
    const anyErr = error as any;
    const errorMessage =
      (anyErr && typeof anyErr.message === 'string' && anyErr.message) ||
      (anyErr && typeof anyErr.error === 'string' && anyErr.error) ||
      'Erro desconhecido';
    const details =
      (anyErr && typeof anyErr.details === 'string' && anyErr.details) ||
      (anyErr && typeof anyErr.hint === 'string' && anyErr.hint) ||
      null;
    const code =
      (anyErr && typeof anyErr.code === 'string' && anyErr.code) ||
      null;
    return new Response(
      JSON.stringify({ 
        sucesso: false, 
        erro: errorMessage,
        detalhes: details,
        codigo: code,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface SetupConfig {
  supabase_url: string;
  supabase_anon_key: string;
  supabase_service_role_key: string;
  cidade: {
    nome_municipio: string;
    nome_secretaria: string;
    email_contato: string;
    telefone_contato?: string;
    endereco_secretaria?: string;
    tema_cor_primaria?: string;
    tema_cor_secundaria?: string;
  };
  admin: {
    email: string;
    nome_completo: string;
    senha: string;
  };
  opcoes: {
    gerar_dados_ficticios?: boolean;
  };
}

interface SetupStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const config: SetupConfig = await req.json();
    const steps: SetupStep[] = [];

    if (!config.supabase_url || !config.supabase_service_role_key) {
      throw new Error('Credenciais do Supabase são obrigatórias');
    }

    const supabase = createClient(config.supabase_url, config.supabase_service_role_key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // PASSO 1: Verificar conexão
    steps.push({ id: 'conexao', name: 'Verificar conexão', status: 'running' });
    const { error: pingError } = await supabase.from('configuracoes_sistema').select('id').limit(1);
    if (pingError && !pingError.message.includes('0 rows')) {
      steps[steps.length - 1] = { ...steps[steps.length - 1], status: 'error', message: pingError.message };
      throw new Error(`Erro de conexão: ${pingError.message}`);
    }
    steps[steps.length - 1].status = 'success';

    // PASSO 2: Verificar se já está configurado
    steps.push({ id: 'verificar', name: 'Verificar configuração existente', status: 'running' });
    const { data: configExistente } = await supabase.from('configuracoes_sistema').select('id, nome_municipio').limit(1).single();
    if (configExistente?.nome_municipio && configExistente.nome_municipio !== 'Município') {
      steps[steps.length - 1] = { ...steps[steps.length - 1], status: 'success', message: 'Já configurado' };
      return new Response(JSON.stringify({
        success: false,
        message: `Projeto já configurado para ${configExistente.nome_municipio}`,
        steps,
      }), { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } });
    }
    steps[steps.length - 1].status = 'success';

    // PASSO 3: Configurar sistema
    steps.push({ id: 'config', name: 'Configurar sistema', status: 'running' });
    const configData = {
      nome_municipio: config.cidade.nome_municipio,
      nome_secretaria: config.cidade.nome_secretaria,
      email_contato: config.cidade.email_contato,
      telefone_contato: config.cidade.telefone_contato || null,
      endereco_secretaria: config.cidade.endereco_secretaria || null,
      tema_cor_primaria: config.cidade.tema_cor_primaria || '#1351B4',
      tema_cor_secundaria: config.cidade.tema_cor_secundaria || '#071D41',
      sistema_nome: 'VAGOU',
      app_nome: 'VAGOU',
    };
    if (configExistente?.id) {
      await supabase.from('configuracoes_sistema').update(configData).eq('id', configExistente.id);
    } else {
      await supabase.from('configuracoes_sistema').insert(configData);
    }
    steps[steps.length - 1].status = 'success';

    // PASSO 4: Turmas base
    steps.push({ id: 'turmas', name: 'Criar turmas base', status: 'running' });
    const turmasBase = [
      { nome: 'Berçário', idade_minima_meses: 0, idade_maxima_meses: 11, ordem: 1 },
      { nome: 'Infantil 1', idade_minima_meses: 12, idade_maxima_meses: 23, ordem: 2 },
      { nome: 'Infantil 2', idade_minima_meses: 24, idade_maxima_meses: 35, ordem: 3 },
      { nome: 'Infantil 3', idade_minima_meses: 36, idade_maxima_meses: 47, ordem: 4 },
    ];
    const { data: turmasExist } = await supabase.from('turmas_base').select('nome');
    const nomesExist = turmasExist?.map(t => t.nome) || [];
    const turmasNovas = turmasBase.filter(t => !nomesExist.includes(t.nome));
    if (turmasNovas.length > 0) await supabase.from('turmas_base').insert(turmasNovas);
    steps[steps.length - 1] = { ...steps[steps.length - 1], status: 'success', message: `${turmasNovas.length} criadas` };

    // PASSO 5: Tipos de documentos
    steps.push({ id: 'docs', name: 'Criar tipos de documentos', status: 'running' });
    const docsTipos = [
      { nome: 'Certidão de Nascimento', obrigatorio: true, ordem: 1 },
      { nome: 'CPF da Criança', obrigatorio: false, ordem: 2 },
      { nome: 'RG do Responsável', obrigatorio: true, ordem: 3 },
      { nome: 'CPF do Responsável', obrigatorio: true, ordem: 4 },
      { nome: 'Comprovante de Residência', obrigatorio: true, ordem: 5 },
      { nome: 'Cartão de Vacina', obrigatorio: true, ordem: 6 },
    ];
    const { data: docsExist } = await supabase.from('documentos_tipos').select('nome');
    const docsNomesExist = docsExist?.map(d => d.nome) || [];
    const docsNovos = docsTipos.filter(d => !docsNomesExist.includes(d.nome));
    if (docsNovos.length > 0) await supabase.from('documentos_tipos').insert(docsNovos);
    steps[steps.length - 1] = { ...steps[steps.length - 1], status: 'success', message: `${docsNovos.length} criados` };

    // PASSO 6: Tipos de prioridade
    steps.push({ id: 'prioridades', name: 'Criar tipos de prioridade', status: 'running' });
    const prioridades = [
      { codigo: 'PCD', nome: 'Pessoa com Deficiência', peso: 100, cor: '#9333ea', ordem: 1, exige_documento: true },
      { codigo: 'CADUNICO', nome: 'CadÚnico', peso: 80, cor: '#16a34a', ordem: 2, exige_documento: true },
      { codigo: 'BPC', nome: 'BPC', peso: 90, cor: '#0891b2', ordem: 3, exige_documento: true },
      { codigo: 'IRMAO', nome: 'Irmão Matriculado', peso: 50, cor: '#ea580c', ordem: 4, exige_documento: false },
    ];
    const { data: prioExist } = await supabase.from('tipos_prioridade').select('codigo');
    const codExist = prioExist?.map(p => p.codigo) || [];
    const prioNovas = prioridades.filter(p => !codExist.includes(p.codigo));
    if (prioNovas.length > 0) await supabase.from('tipos_prioridade').insert(prioNovas);
    steps[steps.length - 1] = { ...steps[steps.length - 1], status: 'success', message: `${prioNovas.length} criados` };

    // PASSO 7: Motivos padrão
    steps.push({ id: 'motivos', name: 'Criar motivos padrão', status: 'running' });
    const motivos = [
      { tipo: 'desistencia', descricao: 'Mudança de endereço', ordem: 1 },
      { tipo: 'desistencia', descricao: 'Optou por escola particular', ordem: 2 },
      { tipo: 'recusa', descricao: 'Não compareceu no prazo', ordem: 1 },
      { tipo: 'recusa', descricao: 'Documentação incompleta', ordem: 2 },
      { tipo: 'remanejamento', descricao: 'CMEI mais próximo', ordem: 1 },
      { tipo: 'transferencia', descricao: 'Mudança para outro município', ordem: 1 },
    ];
    const { data: motExist } = await supabase.from('motivos_padrao').select('descricao, tipo');
    const motChaves = motExist?.map(m => `${m.tipo}:${m.descricao}`) || [];
    const motNovos = motivos.filter(m => !motChaves.includes(`${m.tipo}:${m.descricao}`));
    if (motNovos.length > 0) await supabase.from('motivos_padrao').insert(motNovos);
    steps[steps.length - 1] = { ...steps[steps.length - 1], status: 'success', message: `${motNovos.length} criados` };

    // PASSO 8: Templates
    steps.push({ id: 'templates', name: 'Criar templates', status: 'running' });
    const templates = [
      { 
        tipo: 'inscricao_realizada', 
        titulo: 'Confirmação de Inscrição', 
        assunto_email: 'Inscrição Realizada - {{crianca_nome}}', 
        corpo_whatsapp: 'Olá {{responsavel_nome}}! A inscrição de {{crianca_nome}} foi realizada com sucesso. Protocolo: {{protocolo}}. Você pode acompanhar a posição na fila pelo sistema.', 
        ordem: 0 
      },
      { 
        tipo: 'convocacao', 
        titulo: 'Convocação para Matrícula', 
        assunto_email: 'Convocação - {{crianca_nome}}', 
        corpo_whatsapp: 'Olá {{responsavel_nome}}! {{crianca_nome}} (Protocolo: {{protocolo}}) foi convocado para matrícula no {{cmei_nome}}. Por favor, compareça ao CMEI em até {{prazo_dias}} dias para confirmar a vaga.', 
        ordem: 1 
      },
      { 
        tipo: 'lembrete', 
        titulo: 'Lembrete de Prazo', 
        assunto_email: 'Lembrete - {{crianca_nome}}', 
        corpo_whatsapp: 'Lembrete: o prazo de matrícula de {{crianca_nome}} (Protocolo: {{protocolo}}) vence em {{dias_restantes}} dias. Compareça ao {{cmei_nome}} para não perder a vaga.', 
        ordem: 2 
      },
      { 
        tipo: 'matricula_confirmada', 
        titulo: 'Matrícula Confirmada', 
        assunto_email: 'Matrícula Confirmada - {{crianca_nome}}', 
        corpo_whatsapp: 'Parabéns {{responsavel_nome}}! A matrícula de {{crianca_nome}} (Protocolo: {{protocolo}}) foi confirmada no {{cmei_nome}}.', 
        ordem: 3 
      },
    ];
    const { data: tplExist } = await supabase.from('templates_mensagens').select('tipo');
    const tiposExist = tplExist?.map(t => t.tipo) || [];
    const tplNovos = templates.filter(t => !tiposExist.includes(t.tipo));
    if (tplNovos.length > 0) await supabase.from('templates_mensagens').insert(tplNovos);
    steps[steps.length - 1] = { ...steps[steps.length - 1], status: 'success', message: `${tplNovos.length} criados` };

    // PASSO 9: Permissões RBAC
    steps.push({ id: 'permissoes', name: 'Criar permissões', status: 'running' });
    const permissoes = [
      { modulo: 'dashboard', codigo: 'dashboard.view', nome: 'Visualizar Dashboard' },
      { modulo: 'criancas', codigo: 'criancas.view', nome: 'Visualizar Crianças' },
      { modulo: 'criancas', codigo: 'criancas.manage', nome: 'Gerenciar Crianças' },
      { modulo: 'fila', codigo: 'fila.view', nome: 'Visualizar Fila' },
      { modulo: 'fila', codigo: 'fila.manage', nome: 'Gerenciar Fila' },
      { modulo: 'matriculas', codigo: 'matriculas.view', nome: 'Visualizar Matrículas' },
      { modulo: 'matriculas', codigo: 'matriculas.manage', nome: 'Gerenciar Matrículas' },
      { modulo: 'cmeis', codigo: 'cmeis.view', nome: 'Visualizar CMEIs' },
      { modulo: 'cmeis', codigo: 'cmeis.manage', nome: 'Gerenciar CMEIs' },
      { modulo: 'turmas', codigo: 'turmas.view', nome: 'Visualizar Turmas' },
      { modulo: 'turmas', codigo: 'turmas.manage', nome: 'Gerenciar Turmas' },
      { modulo: 'usuarios', codigo: 'usuarios.view', nome: 'Visualizar Usuários' },
      { modulo: 'usuarios', codigo: 'usuarios.manage', nome: 'Gerenciar Usuários' },
      { modulo: 'configuracoes', codigo: 'configuracoes.view', nome: 'Visualizar Configurações' },
      { modulo: 'configuracoes', codigo: 'configuracoes.manage', nome: 'Gerenciar Configurações' },
      { modulo: 'relatorios', codigo: 'relatorios.view', nome: 'Visualizar Relatórios' },
      { modulo: 'auditoria', codigo: 'auditoria.view', nome: 'Visualizar Auditoria' },
    ];
    const { data: permExist } = await supabase.from('permissoes').select('codigo');
    const codPermExist = permExist?.map(p => p.codigo) || [];
    const permNovas = permissoes.filter(p => !codPermExist.includes(p.codigo));
    if (permNovas.length > 0) await supabase.from('permissoes').insert(permNovas);
    steps[steps.length - 1] = { ...steps[steps.length - 1], status: 'success', message: `${permNovas.length} criadas` };

    // PASSO 10: Super Admin
    steps.push({ id: 'superadmin', name: 'Criar Super Admin', status: 'running' });
    try {
      const { data: existingProfile } = await supabase.from('profiles').select('id').eq('email', config.admin.email).maybeSingle();
      let userId: string;

      if (existingProfile) {
        userId = existingProfile.id;
        steps[steps.length - 1].message = 'Usuário existe, atualizando';
      } else {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: config.admin.email,
          password: config.admin.senha,
          email_confirm: true,
          user_metadata: { nome_completo: config.admin.nome_completo },
        });
        if (authError) throw new Error(authError.message);
        userId = authData.user.id;

        await supabase.from('profiles').upsert({
          id: userId,
          email: config.admin.email,
          nome_completo: config.admin.nome_completo,
          ativo: true,
        });
      }

      const { data: existingRole } = await supabase.from('user_roles').select('id').eq('user_id', userId).eq('role', 'superadmin').maybeSingle();
      if (!existingRole) {
        await supabase.from('user_roles').insert({ user_id: userId, role: 'superadmin' });
      }
      steps[steps.length - 1] = { ...steps[steps.length - 1], status: 'success', message: existingProfile ? 'Role atribuída' : 'Criado com sucesso' };
    } catch (adminErr: any) {
      steps[steps.length - 1] = { ...steps[steps.length - 1], status: 'error', message: adminErr.message };
    }

    // PASSO 11: Storage
    steps.push({ id: 'storage', name: 'Configurar Storage', status: 'running' });
    for (const bucket of ['brasoes', 'avatars', 'assets', 'documentos']) {
      await supabase.storage.createBucket(bucket, { public: bucket !== 'documentos' });
    }
    steps[steps.length - 1].status = 'success';

    const hasErrors = steps.some(s => s.status === 'error');
    return new Response(JSON.stringify({
      success: !hasErrors,
      message: hasErrors ? 'Setup com erros' : `Setup concluído para ${config.cidade.nome_municipio}!`,
      steps,
      nextSteps: ['Acesse com as credenciais do Super Admin', 'Configure CMEIs e turmas', 'Personalize brasão e cores', 'Configure notificações'],
    }), { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Erro no setup:', error);
    return new Response(JSON.stringify({ success: false, message: error.message, steps: [] }), { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } });
  }
});

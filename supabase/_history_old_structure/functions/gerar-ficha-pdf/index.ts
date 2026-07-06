import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";

const gerarCabecalhoPDF = (config: any) => {
  const brasaoHtml = config?.brasao_url 
    ? `<div style="text-align: center; margin-bottom: 10px;"><img src="${config.brasao_url}" alt="Brasão" style="height: 60px; width: auto; display: inline-block;" /></div>`
    : '';

  return `
    <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #1351B4;">
      ${brasaoHtml}
      <h1 style="color: #071D41; margin: 0 0 5px 0; font-size: 18px; font-weight: bold;">
        ${config?.nome_municipio || 'Município'}
      </h1>
      <h2 style="color: #1351B4; margin: 0 0 5px 0; font-size: 16px; font-weight: 600;">
        ${config?.nome_secretaria || 'Secretaria de Educação'}
      </h2>
      <p style="color: #666; margin: 0; font-size: 11px;">
        ${config?.email_contato ? `E-mail: ${config.email_contato}` : ''}
        ${config?.email_contato && config?.telefone_contato ? ' | ' : ''}
        ${config?.telefone_contato ? `Tel: ${config.telefone_contato}` : ''}
      </p>
    </div>
  `;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    // ========== AUTHENTICATION CHECK ==========
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[PDF] Acesso negado: Authorization header ausente');
      return new Response(
        JSON.stringify({ sucesso: false, erro: 'Authorization header required' }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Extract JWT token from Authorization header
    const token = authHeader.replace('Bearer ', '');
    
    // Service role client for database operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify the JWT token using service role client
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error('[PDF] Acesso negado: Token inválido ou expirado', userError);
      return new Response(
        JSON.stringify({ sucesso: false, erro: 'Invalid or expired token' }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log(`[PDF] Usuário autenticado: ${user.id}`);

    // Parse request body
    let body;
    try {
      body = await req.json();
      console.log('[PDF] Body recebido:', JSON.stringify(body));
    } catch (e) {
      console.error('[PDF] Erro ao parsear body:', e);
      body = {};
    }
    
    const crianca_id = body?.crianca_id;

    if (!crianca_id) {
      console.error('[PDF] crianca_id não encontrado no body:', body);
      throw new Error('crianca_id é obrigatório');
    }

    // ========== AUTHORIZATION CHECK ==========
    // Check if user is admin
    const { data: isAdminResult } = await supabaseClient.rpc('is_admin', { _user_id: user.id });
    const isAdmin = isAdminResult === true;

    // Buscar dados da criança
    const { data: crianca, error } = await supabaseClient
      .from('criancas')
      .select(`
        *,
        cmei_atual:cmeis!criancas_cmei_atual_id_fkey(nome, endereco, bairro, telefone),
        turma_atual:turmas!criancas_turma_atual_id_fkey(nome, turno),
        cmei1:cmeis!criancas_cmei1_preferencia_fkey(nome),
        cmei2:cmeis!criancas_cmei2_preferencia_fkey(nome)
      `)
      .eq('id', crianca_id)
      .single();

    if (error) {
      console.error('[PDF] Erro ao buscar criança:', error);
      throw new Error('Criança não encontrada');
    }

    // Check if user is the responsible (owner)
    const isResponsavel = crianca.responsavel_user_id === user.id;

    if (!isAdmin && !isResponsavel) {
      console.error(`[PDF] Acesso negado: Usuário ${user.id} não é admin nem responsável pela criança ${crianca_id}`);
      return new Response(
        JSON.stringify({ sucesso: false, erro: 'Access denied. You are not authorized to view this document.' }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log(`[PDF] Gerando ficha para criança: ${crianca_id} (isAdmin: ${isAdmin}, isResponsavel: ${isResponsavel})`);

    // Buscar configurações
    const { data: config } = await supabaseClient
      .from('configuracoes_sistema')
      .select('*')
      .single();

    // Gerar HTML da ficha
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 30px 40px; 
            color: #1a1a1a;
            line-height: 1.4;
          }
          .section { 
            margin-bottom: 20px; 
          }
          .section-title { 
            font-weight: bold; 
            font-size: 13px; 
            margin-bottom: 10px; 
            color: #1351B4; 
            border-bottom: 1px solid #e2e8f0; 
            padding-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .field { 
            margin-bottom: 6px; 
            font-size: 12px;
          }
          .field-label { 
            font-weight: 600; 
            display: inline-block; 
            width: 160px; 
            color: #374151;
          }
          .field-value { 
            display: inline-block; 
            color: #1a1a1a;
          }
          .badge { 
            display: inline-block; 
            padding: 3px 10px; 
            border-radius: 10px; 
            font-size: 11px; 
            font-weight: bold; 
          }
          .badge-success { 
            background: #dcfce7; 
            color: #166534; 
          }
          .badge-warning { 
            background: #fef3c7; 
            color: #92400e; 
          }
          .titulo-documento {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            color: #071D41;
            margin-bottom: 25px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .footer {
            margin-top: 40px; 
            padding-top: 15px;
            border-top: 1px solid #e2e8f0; 
            text-align: center; 
            font-size: 10px; 
            color: #666;
          }
        </style>
      </head>
      <body>
        ${gerarCabecalhoPDF(config)}

        <div class="titulo-documento">Ficha de Matrícula</div>

        <div class="section">
          <div class="section-title">Dados da Criança</div>
          <div class="field"><span class="field-label">Nome Completo:</span><span class="field-value">${crianca.nome}</span></div>
          <div class="field"><span class="field-label">Data de Nascimento:</span><span class="field-value">${new Date(crianca.data_nascimento).toLocaleDateString('pt-BR')}</span></div>
          <div class="field"><span class="field-label">Sexo:</span><span class="field-value">${crianca.sexo}</span></div>
          ${crianca.cpf_crianca ? `<div class="field"><span class="field-label">CPF:</span><span class="field-value">${crianca.cpf_crianca}</span></div>` : ''}
          ${crianca.certidao_nascimento ? `<div class="field"><span class="field-label">Certidão de Nascimento:</span><span class="field-value">${crianca.certidao_nascimento}</span></div>` : ''}
        </div>

        <div class="section">
          <div class="section-title">Situação da Matrícula</div>
          <div class="field"><span class="field-label">Status:</span><span class="badge ${crianca.status?.includes('Matricul') ? 'badge-success' : 'badge-warning'}">${crianca.status}</span></div>
          <div class="field"><span class="field-label">CMEI:</span><span class="field-value">${crianca.cmei_atual?.nome || '-'}</span></div>
          <div class="field"><span class="field-label">Turma:</span><span class="field-value">${crianca.turma_atual?.nome || '-'}</span></div>
          <div class="field"><span class="field-label">Turno:</span><span class="field-value">${crianca.turma_atual?.turno || '-'}</span></div>
        </div>

        <div class="section">
          <div class="section-title">Dados do Responsável</div>
          <div class="field"><span class="field-label">Nome:</span><span class="field-value">${crianca.responsavel_nome}</span></div>
          <div class="field"><span class="field-label">CPF:</span><span class="field-value">${crianca.responsavel_cpf}</span></div>
          <div class="field"><span class="field-label">Telefone:</span><span class="field-value">${crianca.responsavel_telefone}</span></div>
          ${crianca.responsavel_celular ? `<div class="field"><span class="field-label">Celular:</span><span class="field-value">${crianca.responsavel_celular}</span></div>` : ''}
          ${crianca.responsavel_email ? `<div class="field"><span class="field-label">E-mail:</span><span class="field-value">${crianca.responsavel_email}</span></div>` : ''}
        </div>

        <div class="section">
          <div class="section-title">Endereço</div>
          ${crianca.logradouro ? `<div class="field"><span class="field-label">Logradouro:</span><span class="field-value">${crianca.logradouro}, ${crianca.numero || 'S/N'}</span></div>` : ''}
          ${crianca.complemento ? `<div class="field"><span class="field-label">Complemento:</span><span class="field-value">${crianca.complemento}</span></div>` : ''}
          ${crianca.bairro ? `<div class="field"><span class="field-label">Bairro:</span><span class="field-value">${crianca.bairro}</span></div>` : ''}
          ${crianca.cidade && crianca.estado ? `<div class="field"><span class="field-label">Cidade/UF:</span><span class="field-value">${crianca.cidade} - ${crianca.estado}</span></div>` : ''}
          ${crianca.cep ? `<div class="field"><span class="field-label">CEP:</span><span class="field-value">${crianca.cep}</span></div>` : ''}
        </div>

        <div class="footer">
          <p>Documento gerado em: ${new Date().toLocaleString('pt-BR')}</p>
          <p style="margin-top: 5px;">Sistema VAGOU - Gestão de Vagas em CMEIs</p>
        </div>
      </body>
      </html>
    `;

    console.log('[PDF] HTML gerado, retornando para frontend converter');

    return new Response(
      JSON.stringify({
        sucesso: true,
        html: htmlContent,
        crianca_nome: crianca.nome,
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[PDF] Erro:', error);
    return new Response(
      JSON.stringify({
        sucesso: false,
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

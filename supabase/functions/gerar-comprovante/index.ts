/// <reference path="../deno-shims.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDatePtBr = (value: unknown, fallback = "") => {
  if (!value) return fallback;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleDateString("pt-BR");
};

const gerarCabecalhoPDF = (config: any, titulo: string) => {
  const brasaoHtml = config?.brasao_url 
    ? `<div style="display: flex; justify-content: center; margin-bottom: 8px;">
        <img src="${escapeHtml(config.brasao_url)}" alt="Brasão" style="height: 50px; width: auto; display: block; margin: 0 auto;" />
       </div>`
    : '';

  const contatoInfo = [];
  if (config?.email_contato) contatoInfo.push(`E-mail: ${escapeHtml(config.email_contato)}`);
  if (config?.telefone_contato) contatoInfo.push(`Tel: ${escapeHtml(config.telefone_contato)}`);

  return `
    <div style="text-align: center; border-bottom: 2px solid #1351B4; padding-bottom: 12px; margin-bottom: 15px;">
      ${brasaoHtml}
      <h1 style="color: #071D41; margin: 0 0 3px 0; font-size: 14px; font-weight: bold;">
        ${config?.nome_municipio || 'Município'}
      </h1>
      <h2 style="color: #1351B4; margin: 0 0 5px 0; font-size: 12px; font-weight: 600;">
        ${config?.nome_secretaria || 'Secretaria de Educação'}
      </h2>
      ${contatoInfo.length > 0 ? `
        <p style="color: #666; margin: 0 0 10px 0; font-size: 9px;">
          ${contatoInfo.join(' | ')}
        </p>
      ` : ''}
      <h3 style="color: #071D41; margin: 0; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
        ${titulo}
      </h3>
    </div>
  `;
};

const gerarRodapePDF = (mensagem: string) => {
  const dataEmissao = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return `
    <div style="margin-top: 20px; padding: 10px 0 20px 0; border-top: 1px solid #e2e8f0; text-align: center; color: #666; font-size: 9px; page-break-inside: avoid;">
      <p style="margin: 0 0 5px 0;">Documento emitido em ${dataEmissao}</p>
      <p style="margin: 0 0 5px 0;">${mensagem}</p>
      <p style="margin: 8px 0 0 0; color: #999; font-size: 8px;">Sistema VAGOU - Gestão de Vagas em CMEIs</p>
    </div>
  `;
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    // ========== AUTHENTICATION CHECK ==========
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[Comprovante] Acesso negado: Authorization header ausente');
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Create user client with the provided JWT to verify authentication
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } }
      }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
    if (userError || !user) {
      console.error('[Comprovante] Acesso negado: Token inválido ou expirado', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log(`[Comprovante] Usuário autenticado: ${user.id}`);

    // Service role client for database operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const crianca_id = body.crianca_id || body.criancaId;
    const tipo = body.tipo;

    if (!crianca_id || !tipo) {
      throw new Error('crianca_id e tipo são obrigatórios');
    }

    // ========== AUTHORIZATION CHECK ==========
    // Check if user is admin
    const { data: isAdminResult } = await supabaseClient.rpc('is_admin', { _user_id: user.id });
    const isAdmin = isAdminResult === true;

    // Fetch child data first to check ownership
    const { data: crianca, error: criancaError } = await supabaseClient
      .from('criancas')
      .select(`
        *,
        cmei_atual:cmeis!criancas_cmei_atual_id_fkey(nome, endereco, telefone),
        turma_atual:turmas!criancas_turma_atual_id_fkey(nome, turno),
        cmei1:cmeis!criancas_cmei1_preferencia_fkey(nome),
        cmei2:cmeis!criancas_cmei2_preferencia_fkey(nome)
      `)
      .eq('id', crianca_id)
      .single();

    if (criancaError) {
      console.error('[Comprovante] Erro ao buscar criança:', criancaError);
      throw new Error('Criança não encontrada');
    }

    // Check if user is the responsible (owner)
    const isResponsavel = crianca.responsavel_user_id === user.id;

    if (!isAdmin && !isResponsavel) {
      console.error(`[Comprovante] Acesso negado: Usuário ${user.id} não é admin nem responsável pela criança ${crianca_id}`);
      return new Response(
        JSON.stringify({ error: 'Access denied. You are not authorized to view this document.' }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log(`[Comprovante] Gerando ${tipo} para criança: ${crianca_id} (isAdmin: ${isAdmin}, isResponsavel: ${isResponsavel})`);

    // Buscar configurações do sistema
    const { data: config } = await supabaseClient
      .from('configuracoes_sistema')
      .select('*')
      .single();

    // Buscar histórico da criança
    const { data: historico } = await supabaseClient
      .from('historico')
      .select('*')
      .eq('crianca_id', crianca_id)
      .order('created_at', { ascending: true });
    
    // Buscar nomes dos CMEIs e Turmas para o histórico
    const cmeiIds = [...new Set([
      ...((historico || []).map((h: any) => h.cmei_anterior).filter(Boolean)),
      ...((historico || []).map((h: any) => h.cmei_novo).filter(Boolean))
    ])];
    const turmaIds = [...new Set([
      ...((historico || []).map((h: any) => h.turma_anterior).filter(Boolean)),
      ...((historico || []).map((h: any) => h.turma_novo).filter(Boolean))
    ])];
    
    const { data: cmeisData } = cmeiIds.length > 0 
      ? await supabaseClient.from('cmeis').select('id, nome').in('id', cmeiIds)
      : { data: [] };
    const { data: turmasData } = turmaIds.length > 0 
      ? await supabaseClient.from('turmas').select('id, nome').in('id', turmaIds)
      : { data: [] };
    
    const cmeiMap = Object.fromEntries((cmeisData || []).map((c: any) => [c.id, c.nome]));
    const turmaMap = Object.fromEntries((turmasData || []).map((t: any) => [t.id, t.nome]));

    let html = '';

    const estilosBase = `
      * {
        box-sizing: border-box;
      }
      body { 
        font-family: Arial, sans-serif; 
        padding: 20px 25px 30px 25px; 
        max-width: 100%; 
        margin: 0 auto; 
        color: #1a1a1a;
        line-height: 1.4;
        font-size: 11px;
      }
      .section { 
        margin: 15px 0; 
        page-break-inside: avoid;
      }
      .section-title { 
        font-size: 12px; 
        font-weight: bold; 
        color: #1351B4; 
        border-bottom: 1px solid #e2e8f0; 
        padding-bottom: 5px; 
        margin-bottom: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .info-grid {
        display: table;
        width: 100%;
        border-collapse: collapse;
      }
      .info-row { 
        display: table-row;
      }
      .info-label { 
        display: table-cell;
        font-weight: 600; 
        width: 150px; 
        color: #374151;
        padding: 4px 8px 4px 0;
        vertical-align: top;
      }
      .info-value { 
        display: table-cell;
        color: #1a1a1a;
        padding: 4px 0;
        vertical-align: top;
      }
      .protocolo { 
        background: #f8fafc; 
        padding: 10px; 
        border-radius: 4px; 
        text-align: center; 
        margin: 15px 0;
        border: 1px solid #e2e8f0;
        page-break-inside: avoid;
      }
      .protocolo strong {
        color: #1351B4;
        font-size: 13px;
      }
      .alert { 
        background: #fef3c7; 
        border: 1px solid #fde68a; 
        border-left: 4px solid #f59e0b;
        padding: 12px; 
        border-radius: 4px; 
        margin: 15px 0;
        page-break-inside: avoid;
      }
      .alert-title { 
        font-weight: bold; 
        color: #92400e; 
        margin-bottom: 6px; 
        font-size: 12px;
      }
      .alert p {
        margin: 4px 0;
        font-size: 11px;
        color: #78350f;
      }
      .success { 
        background: #dcfce7; 
        border: 1px solid #bbf7d0; 
        border-left: 4px solid #22c55e;
        padding: 12px; 
        border-radius: 4px; 
        margin: 15px 0; 
        text-align: center;
        color: #166534;
        font-weight: 600;
        font-size: 13px;
        page-break-inside: avoid;
      }
      .timeline {
        margin: 10px 0;
      }
      .timeline-item {
        display: flex;
        gap: 10px;
        padding: 8px 0;
        border-left: 2px solid #1351B4;
        margin-left: 6px;
        padding-left: 15px;
        position: relative;
      }
      .timeline-item:before {
        content: '';
        position: absolute;
        left: -5px;
        top: 12px;
        width: 8px;
        height: 8px;
        background: #1351B4;
        border-radius: 50%;
      }
      .timeline-date {
        font-size: 9px;
        color: #64748b;
        min-width: 70px;
      }
      .timeline-content {
        flex: 1;
      }
      .timeline-action {
        font-weight: 600;
        color: #1351B4;
        font-size: 10px;
      }
      .timeline-desc {
        font-size: 9px;
        color: #374151;
        margin-top: 2px;
      }
    `;

    // Função para gerar HTML do histórico
    const gerarHistoricoHTML = (historicoItems: any[]) => {
      if (!historicoItems || historicoItems.length === 0) {
        return '<p style="color: #64748b; font-size: 10px; text-align: center;">Nenhum registro no histórico.</p>';
      }

      return `
        <div class="timeline">
          ${historicoItems.map(item => {
            const data = new Date(item.created_at).toLocaleDateString('pt-BR', { 
              day: '2-digit', 
              month: '2-digit', 
              year: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            });
            
            let descricao = item.descricao || '';
            if (item.status_novo && item.status_anterior) {
              descricao += ` (${item.status_anterior} → ${item.status_novo})`;
            } else if (item.status_novo) {
              descricao += ` (Status: ${item.status_novo})`;
            }
            if (item.cmei_novo && cmeiMap[item.cmei_novo]) {
              descricao += ` - CMEI: ${cmeiMap[item.cmei_novo]}`;
            }
            if (item.turma_novo && turmaMap[item.turma_novo]) {
              descricao += ` - Turma: ${turmaMap[item.turma_novo]}`;
            }
            if (item.justificativa) {
              descricao += ` | Motivo: ${item.justificativa}`;
            }

            return `
              <div class="timeline-item">
                <div class="timeline-date">${data}</div>
                <div class="timeline-content">
                  <div class="timeline-action">${item.acao}</div>
                  ${descricao ? `<div class="timeline-desc">${descricao}</div>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    };

    if (tipo === 'inscricao') {
      html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${estilosBase}</style>
</head>
<body>
  ${gerarCabecalhoPDF(config, 'Comprovante de Inscrição')}

  <div class="protocolo">
    <strong>Protocolo:</strong> ${escapeHtml(crianca.protocolo || crianca.id.substring(0, 8).toUpperCase())}
  </div>

  <div class="section">
    <div class="section-title">Dados da Criança</div>
    <div class="info-grid">
      <div class="info-row">
        <div class="info-label">Nome:</div>
        <div class="info-value">${escapeHtml(crianca.nome)}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Data de Nascimento:</div>
        <div class="info-value">${escapeHtml(formatDatePtBr(crianca.data_nascimento))}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Sexo:</div>
        <div class="info-value">${escapeHtml(crianca.sexo)}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Dados do Responsável</div>
    <div class="info-grid">
      <div class="info-row">
        <div class="info-label">Nome:</div>
        <div class="info-value">${escapeHtml(crianca.responsavel_nome)}</div>
      </div>
      <div class="info-row">
        <div class="info-label">CPF:</div>
        <div class="info-value">${escapeHtml(crianca.responsavel_cpf)}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Telefone:</div>
        <div class="info-value">${escapeHtml(crianca.responsavel_telefone)}</div>
      </div>
      ${crianca.responsavel_email ? `
      <div class="info-row">
        <div class="info-label">E-mail:</div>
        <div class="info-value">${escapeHtml(crianca.responsavel_email)}</div>
      </div>
      ` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Situação da Inscrição</div>
    <div class="info-grid">
      <div class="info-row">
        <div class="info-label">Status:</div>
        <div class="info-value">${escapeHtml(crianca.status)}</div>
      </div>
      ${crianca.posicao_fila ? `
      <div class="info-row">
        <div class="info-label">Posição na Fila:</div>
        <div class="info-value">${escapeHtml(`${crianca.posicao_fila}ª posição`)}</div>
      </div>
      ` : ''}
      <div class="info-row">
        <div class="info-label">Data da Inscrição:</div>
        <div class="info-value">${escapeHtml(formatDatePtBr(crianca.created_at))}</div>
      </div>
      ${crianca.cmei1?.nome ? `
      <div class="info-row">
        <div class="info-label">1ª Preferência CMEI:</div>
        <div class="info-value">${escapeHtml(crianca.cmei1.nome)}</div>
      </div>
      ` : ''}
      ${crianca.cmei2?.nome ? `
      <div class="info-row">
        <div class="info-label">2ª Preferência CMEI:</div>
        <div class="info-value">${escapeHtml(crianca.cmei2.nome)}</div>
      </div>
      ` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Histórico</div>
    ${gerarHistoricoHTML(historico || [])}
  </div>

  ${gerarRodapePDF('Este comprovante não substitui a matrícula oficial')}
</body>
</html>
      `;
    } else if (tipo === 'convocacao') {
      html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${estilosBase}</style>
</head>
<body>
  ${gerarCabecalhoPDF(config, 'Comprovante de Convocação')}

  <div class="alert">
    <div class="alert-title">⚠️ ATENÇÃO - PRAZO PARA MATRÍCULA</div>
    <p>Você tem até <strong>${escapeHtml(formatDatePtBr(crianca.convocacao_deadline, 'a definir'))}</strong> para comparecer ao CMEI e realizar a matrícula.</p>
    <p>O não comparecimento no prazo resultará na perda da vaga.</p>
  </div>

  <div class="section">
    <div class="section-title">Dados da Criança Convocada</div>
    <div class="info-grid">
      <div class="info-row">
        <div class="info-label">Nome:</div>
        <div class="info-value">${escapeHtml(crianca.nome)}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Data de Nascimento:</div>
        <div class="info-value">${escapeHtml(formatDatePtBr(crianca.data_nascimento))}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">CMEI de Destino</div>
    <div class="info-grid">
      <div class="info-row">
        <div class="info-label">CMEI:</div>
        <div class="info-value">${escapeHtml(crianca.cmei_atual?.nome || 'A definir')}</div>
      </div>
      ${crianca.turma_atual?.nome ? `
      <div class="info-row">
        <div class="info-label">Turma:</div>
        <div class="info-value">${escapeHtml(crianca.turma_atual.nome)}</div>
      </div>
      ` : ''}
      ${crianca.turma_atual?.turno ? `
      <div class="info-row">
        <div class="info-label">Turno:</div>
        <div class="info-value">${escapeHtml(crianca.turma_atual.turno)}</div>
      </div>
      ` : ''}
      ${crianca.cmei_atual?.endereco ? `
      <div class="info-row">
        <div class="info-label">Endereço:</div>
        <div class="info-value">${escapeHtml(crianca.cmei_atual.endereco)}</div>
      </div>
      ` : ''}
      ${crianca.cmei_atual?.telefone ? `
      <div class="info-row">
        <div class="info-label">Telefone:</div>
        <div class="info-value">${escapeHtml(crianca.cmei_atual.telefone)}</div>
      </div>
      ` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Responsável</div>
    <div class="info-grid">
      <div class="info-row">
        <div class="info-label">Nome:</div>
        <div class="info-value">${escapeHtml(crianca.responsavel_nome)}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Telefone:</div>
        <div class="info-value">${escapeHtml(crianca.responsavel_telefone)}</div>
      </div>
    </div>
  </div>

  ${gerarRodapePDF('Compareça ao CMEI com os documentos necessários dentro do prazo estabelecido')}
</body>
</html>
      `;
    } else if (tipo === 'matricula') {
      html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${estilosBase}</style>
</head>
<body>
  ${gerarCabecalhoPDF(config, 'Comprovante de Matrícula')}

  <div class="success">
    ✓ Matrícula Efetivada com Sucesso!
  </div>

  <div class="section">
    <div class="section-title">Dados do Aluno</div>
    <div class="info-grid">
      <div class="info-row">
        <div class="info-label">Nome:</div>
        <div class="info-value">${escapeHtml(crianca.nome)}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Data de Nascimento:</div>
        <div class="info-value">${escapeHtml(formatDatePtBr(crianca.data_nascimento))}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Sexo:</div>
        <div class="info-value">${escapeHtml(crianca.sexo)}</div>
      </div>
      ${crianca.cpf_crianca ? `
      <div class="info-row">
        <div class="info-label">CPF:</div>
        <div class="info-value">${escapeHtml(crianca.cpf_crianca)}</div>
      </div>
      ` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Informações da Matrícula</div>
    <div class="info-grid">
      <div class="info-row">
        <div class="info-label">CMEI:</div>
        <div class="info-value">${escapeHtml(crianca.cmei_atual?.nome || 'Não informado')}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Turma:</div>
        <div class="info-value">${escapeHtml(crianca.turma_atual?.nome || 'Não informado')}</div>
      </div>
      ${crianca.turma_atual?.turno ? `
      <div class="info-row">
        <div class="info-label">Turno:</div>
        <div class="info-value">${escapeHtml(crianca.turma_atual.turno)}</div>
      </div>
      ` : ''}
      <div class="info-row">
        <div class="info-label">Ano Letivo:</div>
        <div class="info-value">${escapeHtml(new Date().getFullYear())}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Responsável</div>
    <div class="info-grid">
      <div class="info-row">
        <div class="info-label">Nome:</div>
        <div class="info-value">${escapeHtml(crianca.responsavel_nome)}</div>
      </div>
      <div class="info-row">
        <div class="info-label">CPF:</div>
        <div class="info-value">${escapeHtml(crianca.responsavel_cpf)}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Telefone:</div>
        <div class="info-value">${escapeHtml(crianca.responsavel_telefone)}</div>
      </div>
      ${crianca.responsavel_email ? `
      <div class="info-row">
        <div class="info-label">E-mail:</div>
        <div class="info-value">${escapeHtml(crianca.responsavel_email)}</div>
      </div>
      ` : ''}
    </div>
  </div>

  ${gerarRodapePDF('Este comprovante confirma a matrícula do aluno')}
</body>
</html>
      `;
    }

    console.log(`[Comprovante] HTML gerado com sucesso para ${tipo}`);

    return new Response(
      JSON.stringify({ 
        html, 
        crianca_nome: crianca.nome,
        tipo
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[Comprovante] Erro:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

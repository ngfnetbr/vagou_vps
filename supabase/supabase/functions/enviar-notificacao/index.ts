import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendEmail } from "../_shared/email-sender.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

interface NotificacaoPayload {
  crianca_id: string;
  tipo: string;
  dados_adicionais?: Record<string, string | number | null | undefined>;
}

interface SistemaConfig {
  tema_cor_primaria?: string;
  tema_cor_secundaria?: string;
  brasao_url?: string;
  nome_municipio?: string;
  nome_secretaria?: string;
  sistema_nome?: string;
  email_contato?: string;
  telefone_contato?: string;
  [key: string]: unknown;
}

interface TemplateMensagem {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  assunto_email: string | null;
  corpo_email: string | null;
  corpo_sms: string | null;
  corpo_whatsapp: string | null;
  variaveis_disponiveis: string[];
  ativo: boolean;
}

// Função para processar template substituindo variáveis
const processarTemplate = (
  template: string,
  variaveis: Record<string, string | number | null | undefined>
): string => {
  let resultado = template;
  
  Object.entries(variaveis).forEach(([chave, valor]) => {
    const regex = new RegExp(`{{${chave}}}`, "g");
    resultado = resultado.replace(regex, String(valor ?? ""));
  });
  
  return resultado;
};

// Função para gerar o header do email
const getEmailHeader = (config: SistemaConfig) => `
  <div style="background: linear-gradient(135deg, ${config.tema_cor_primaria || '#1351B4'} 0%, ${config.tema_cor_secundaria || '#071D41'} 100%); padding: 20px; text-align: center;">
    ${config.brasao_url ? `<img src="${config.brasao_url}" alt="Brasão" style="height: 60px; margin-bottom: 10px;">` : ''}
    <h1 style="color: white; margin: 0; font-size: 24px;">${config.nome_municipio || 'Município'}</h1>
    <p style="color: #ccc; margin: 5px 0 0 0;">${config.nome_secretaria || 'Secretaria de Educação'}</p>
  </div>
`;

// Função para gerar o footer do email
const getEmailFooter = (config: SistemaConfig) => `
  <div style="background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
    <p style="margin: 0;">Este é um e-mail automático do sistema ${config.sistema_nome || 'VAGOU'}.</p>
    ${config.email_contato ? `<p style="margin: 5px 0 0 0;">Contato: ${config.email_contato}</p>` : ''}
    ${config.telefone_contato ? `<p style="margin: 5px 0 0 0;">Telefone: ${config.telefone_contato}</p>` : ''}
  </div>
`;

// Função para gerar email HTML a partir do corpo do template
const gerarEmailHtml = (corpo: string, config: SistemaConfig) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    ${getEmailHeader(config)}
    <div style="padding: 30px;">
      ${corpo}
      <div style="margin-top: 30px;">
        <p>Atenciosamente,</p>
        <p><strong>${config.nome_secretaria || 'Secretaria de Educação'}</strong></p>
      </div>
    </div>
    ${getEmailFooter(config)}
  </div>
`;

// Templates de email padrão (fallback)
const getDefaultEmailTemplate = (tipo: string, data: any) => {
  const { crianca, responsavel, cmei, turma, convocacao, config, dados_adicionais } = data;

  const templates: Record<string, { subject: string; html: string }> = {
    convocacao: {
      subject: `🎉 Convocação para Matrícula - ${crianca.nome}`,
      html: gerarEmailHtml(`
        <h2 style="color: ${config.tema_cor_primaria || '#1351B4'};">Parabéns! Seu(sua) filho(a) foi convocado(a)!</h2>
        <p>Olá, <strong>${responsavel.nome}</strong>!</p>
        <p>Temos o prazer de informar que <strong>${crianca.nome}</strong> foi convocado(a) para matrícula no CMEI.</p>
        
        <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: ${config.tema_cor_primaria || '#1351B4'}; margin-top: 0;">Detalhes da Convocação:</h3>
          <p><strong>CMEI:</strong> ${cmei || 'A definir'}</p>
          <p><strong>Turma:</strong> ${turma || 'A definir'}</p>
          ${convocacao?.prazo ? `<p style="color: #d32f2f;"><strong>⚠️ Prazo para resposta:</strong> ${new Date(convocacao.prazo).toLocaleDateString('pt-BR')}</p>` : ''}
        </div>

        <p><strong>Importante:</strong> Compareça ao CMEI indicado dentro do prazo com os documentos necessários para efetuar a matrícula.</p>
      `, config),
    },
    
    documentacao_pendente: {
      subject: `📄 Documentação Necessária - ${crianca.nome}`,
      html: gerarEmailHtml(`
        <h2 style="color: ${config.tema_cor_primaria || '#1351B4'};">Documentação Pendente</h2>
        <p>Olá, <strong>${responsavel.nome}</strong>!</p>
        <p><strong>${crianca.nome}</strong> foi convocado(a) e agora precisa enviar a documentação necessária para prosseguir com a matrícula.</p>
        
        <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
          <h3 style="color: #e65100; margin-top: 0;">📋 Ação Necessária:</h3>
          <p>Acesse o sistema para enviar os documentos obrigatórios.</p>
          ${convocacao?.prazo ? `<p style="color: #d32f2f;"><strong>⚠️ Prazo:</strong> ${new Date(convocacao.prazo).toLocaleDateString('pt-BR')}</p>` : ''}
        </div>

        <p>Após o envio, nossa equipe analisará os documentos e você receberá uma confirmação.</p>
      `, config),
    },

    documento_recusado: {
      subject: `⚠️ Documento Recusado - ${crianca.nome}`,
      html: gerarEmailHtml(`
        <h2 style="color: #d32f2f;">Documento Precisa ser Reenviado</h2>
        <p>Olá, <strong>${responsavel.nome}</strong>!</p>
        <p>Um documento enviado para <strong>${crianca.nome}</strong> foi recusado e precisa ser reenviado.</p>
        
        <div style="background: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d32f2f;">
          <h3 style="color: #d32f2f; margin-top: 0;">❌ Motivo da Recusa:</h3>
          <p>${dados_adicionais?.motivo || 'Documento não atende aos requisitos necessários.'}</p>
        </div>

        <p><strong>O que fazer:</strong></p>
        <ol>
          <li>Acesse o sistema</li>
          <li>Verifique o documento recusado</li>
          <li>Envie uma nova versão do documento</li>
        </ol>
      `, config),
    },

    documentos_aprovados: {
      subject: `✅ Documentação Aprovada - ${crianca.nome}`,
      html: gerarEmailHtml(`
        <h2 style="color: #2e7d32;">Documentação Aprovada!</h2>
        <p>Olá, <strong>${responsavel.nome}</strong>!</p>
        <p>Todos os documentos de <strong>${crianca.nome}</strong> foram aprovados com sucesso!</p>
        
        <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2e7d32;">
          <h3 style="color: #2e7d32; margin-top: 0;">✓ Próximos Passos:</h3>
          <p>Compareça ao CMEI para <strong>assinar a matrícula presencialmente</strong>.</p>
          <p><strong>CMEI:</strong> ${cmei || 'A definir'}</p>
          ${convocacao?.prazo ? `<p style="color: #d32f2f;"><strong>⚠️ Prazo para comparecer:</strong> ${new Date(convocacao.prazo).toLocaleDateString('pt-BR')}</p>` : ''}
        </div>

        <p><strong>Importante:</strong> Leve um documento de identificação para assinar a matrícula.</p>
      `, config),
    },

    aguardando_assinatura: {
      subject: `✍️ Compareça ao CMEI/Secretaria - ${crianca.nome}`,
      html: gerarEmailHtml(`
        <h2 style="color: ${config.tema_cor_primaria || '#1351B4'};">Compareça para Assinar a Matrícula</h2>
        <p>Olá, <strong>${responsavel.nome}</strong>!</p>
        <p>Todos os documentos de <strong>${crianca.nome}</strong> foram aprovados!</p>
        
        <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${config.tema_cor_primaria || '#1351B4'};">
          <h3 style="color: ${config.tema_cor_primaria || '#1351B4'}; margin-top: 0;">📍 Próximo Passo: Comparecer Presencialmente</h3>
          <p>Compareça ao <strong>CMEI</strong> ou à <strong>Secretaria de Educação</strong> para assinar a matrícula.</p>
          <p><strong>CMEI:</strong> ${cmei || 'A definir'}</p>
          ${dados_adicionais?.prazo_dias ? `<p><strong>Prazo:</strong> ${dados_adicionais.prazo_dias} dias</p>` : ''}
          ${convocacao?.prazo ? `<p style="color: #d32f2f;"><strong>⚠️ Data limite:</strong> ${new Date(convocacao.prazo).toLocaleDateString('pt-BR')}</p>` : ''}
        </div>

        <p><strong>O que levar:</strong></p>
        <ul>
          <li>Documento de identificação do responsável (RG ou CNH)</li>
          <li>CPF do responsável</li>
        </ul>
      `, config),
    },

    matricula_confirmada: {
      subject: `🎉 Matrícula Confirmada - ${crianca.nome}`,
      html: gerarEmailHtml(`
        <h2 style="color: #2e7d32;">🎉 Matrícula Confirmada com Sucesso!</h2>
        <p>Olá, <strong>${responsavel.nome}</strong>!</p>
        <p>A matrícula de <strong>${crianca.nome}</strong> foi confirmada com sucesso!</p>
        
        <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2e7d32;">
          <h3 style="color: #2e7d32; margin-top: 0;">✓ Dados da Matrícula:</h3>
          <p><strong>CMEI:</strong> ${cmei || 'N/A'}</p>
          <p><strong>Turma:</strong> ${turma || 'N/A'}</p>
        </div>

        <p>Parabéns! Seu(sua) filho(a) está oficialmente matriculado(a) em nossa rede de educação infantil.</p>
        <p>Aguarde o contato do CMEI com informações sobre o início das aulas e orientações adicionais.</p>
      `, config),
    },

    remanejamento_solicitado: {
      subject: `📋 Solicitação de Remanejamento Recebida - ${crianca.nome}`,
      html: gerarEmailHtml(`
        <h2 style="color: #7c3aed;">Solicitação de Remanejamento Recebida</h2>
        <p>Olá, <strong>${responsavel.nome}</strong>!</p>
        <p>Recebemos sua solicitação de remanejamento para <strong>${crianca.nome}</strong>.</p>
        
        <div style="background: #f3e8ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
          <h3 style="color: #7c3aed; margin-top: 0;">Detalhes da Solicitação:</h3>
          <p><strong>CMEI Atual:</strong> ${cmei || 'N/A'}</p>
          <p><strong>CMEI Solicitado:</strong> ${dados_adicionais?.cmei_destino || 'N/A'}</p>
          ${dados_adicionais?.justificativa ? `<p><strong>Justificativa:</strong> ${dados_adicionais.justificativa}</p>` : ''}
        </div>

        <p><strong>Como funciona:</strong></p>
        <ul>
          <li>A criança continua matriculada no CMEI atual</li>
          <li>Ela entra na fila com prioridade máxima para o CMEI solicitado</li>
          <li>Quando surgir uma vaga, você será notificado</li>
        </ul>
      `, config),
    },

    remanejamento_concluido: {
      subject: `🔄 Remanejamento Concluído - ${crianca.nome}`,
      html: gerarEmailHtml(`
        <h2 style="color: #7c3aed;">Remanejamento Concluído com Sucesso!</h2>
        <p>Olá, <strong>${responsavel.nome}</strong>!</p>
        <p>O remanejamento de <strong>${crianca.nome}</strong> foi concluído com sucesso!</p>
        
        <div style="background: #f3e8ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
          <h3 style="color: #7c3aed; margin-top: 0;">Detalhes da Transferência:</h3>
          ${dados_adicionais?.cmei_anterior ? `<p><strong>CMEI Anterior:</strong> ${dados_adicionais.cmei_anterior}</p>` : ''}
          <p><strong>Novo CMEI:</strong> ${cmei || dados_adicionais?.cmei_novo || 'N/A'}</p>
          ${turma ? `<p><strong>Turma:</strong> ${turma}</p>` : ''}
        </div>

        <p>A criança foi transferida e já pode frequentar o novo CMEI.</p>
      `, config),
    },

    lembrete_prazo: {
      subject: `⏰ Lembrete: Prazo de Resposta - ${crianca.nome}`,
      html: gerarEmailHtml(`
        <h2 style="color: #ff9800;">Lembrete Importante!</h2>
        <p>Olá, <strong>${responsavel.nome}</strong>!</p>
        <p>Este é um lembrete sobre a convocação de <strong>${crianca.nome}</strong>.</p>
        
        <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
          ${convocacao?.prazo ? `<p style="color: #e65100;"><strong>⚠️ Prazo para resposta:</strong> ${new Date(convocacao.prazo).toLocaleDateString('pt-BR')}</p>` : ''}
          <p>Por favor, compareça ao CMEI para confirmar a matrícula antes do prazo.</p>
        </div>
      `, config),
    },

    inscricao_realizada: {
      subject: `✅ Inscrição Realizada - ${crianca.nome}`,
      html: gerarEmailHtml(`
        <h2 style="color: #2e7d32;">Inscrição Realizada com Sucesso!</h2>
        <p>Olá, <strong>${responsavel.nome}</strong>!</p>
        <p>A inscrição de <strong>${crianca.nome}</strong> foi realizada com sucesso!</p>
        
        <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2e7d32;">
          <h3 style="color: #2e7d32; margin-top: 0;">✓ Dados da Inscrição:</h3>
          <p><strong>Criança:</strong> ${crianca.nome}</p>
          ${dados_adicionais?.posicao_fila ? `<p><strong>Posição na Fila:</strong> ${dados_adicionais.posicao_fila}</p>` : ''}
        </div>

        <p>Acompanhe sua posição na fila pelo sistema. Você será notificado quando houver uma vaga disponível.</p>
      `, config),
    },

    fim_fila: {
      subject: `⚠️ Movido para Fim da Fila - ${crianca.nome}`,
      html: gerarEmailHtml(`
        <h2 style="color: #ff9800;">Aviso: Fim da Fila</h2>
        <p>Olá, <strong>${responsavel.nome}</strong>!</p>
        <p><strong>${crianca.nome}</strong> foi movido(a) para o final da fila de espera.</p>
        
        <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
          <h3 style="color: #e65100; margin-top: 0;">Motivo:</h3>
          <p>${dados_adicionais?.motivo || 'Prazo de resposta excedido.'}</p>
        </div>

        <p>Você continuará na fila e será chamado novamente quando houver vaga disponível.</p>
      `, config),
    },
  };

  // Mapear tipos alternativos
  const tipoMapeado = tipo === 'lembrete' ? 'lembrete_prazo' : 
                      tipo === 'matricula' ? 'matricula_confirmada' :
                      tipo === 'remanejamento' ? 'remanejamento_concluido' :
                      tipo === 'inscricao_fila' ? 'inscricao_realizada' :
                      tipo;

  return templates[tipoMapeado] || {
    subject: `Notificação - ${crianca.nome}`,
    html: gerarEmailHtml(`
      <h2 style="color: ${config.tema_cor_primaria || '#1351B4'};">Notificação</h2>
      <p>Olá, <strong>${responsavel.nome}</strong>!</p>
      <p>Você recebeu uma notificação sobre <strong>${crianca.nome}</strong>.</p>
      <p>Para mais informações, acesse o sistema.</p>
    `, config),
  };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { crianca_id, tipo, dados_adicionais }: NotificacaoPayload = await req.json();

    console.log(`[Notificação] Processando notificação tipo: ${tipo} para criança: ${crianca_id}`);

    // Buscar dados da criança
    const { data: crianca, error: criancaError } = await supabaseClient
      .from('criancas')
      .select('*, cmeis!cmei_atual_id(nome, endereco), turmas:turma_atual_id(nome)')
      .eq('id', crianca_id)
      .single();

    if (criancaError) {
      console.error('[Notificação] Erro ao buscar criança:', criancaError);
      throw criancaError;
    }

    // Buscar configurações do sistema
    const { data: config, error: configError } = await supabaseClient
      .from('configuracoes_sistema')
      .select('*')
      .single();

    if (configError) {
      console.error('[Notificação] Erro ao buscar configurações:', configError);
      throw configError;
    }

    // Buscar template do banco de dados
    const tipoTemplate = tipo === 'lembrete' ? 'lembrete_prazo' : 
                         tipo === 'matricula' ? 'matricula_confirmada' :
                         tipo === 'remanejamento' ? 'remanejamento_concluido' :
                         tipo === 'inscricao_fila' ? 'inscricao_realizada' :
                         tipo;

    const { data: template, error: templateError } = await supabaseClient
      .from('templates_mensagens')
      .select('*')
      .eq('tipo', tipoTemplate)
      .eq('ativo', true)
      .maybeSingle();

    if (templateError) {
      console.error('[Notificação] Erro ao buscar template:', templateError);
    }

    console.log(`[Notificação] Template encontrado: ${template ? 'Sim' : 'Não (usando fallback)'}`);
    console.log(`[Notificação] Configurações: Email=${config.notificacao_email}, SMS=${config.notificacao_sms}, WhatsApp=${config.notificacao_whatsapp}`);

    const results = [];

    // Preparar variáveis para substituição nos templates
    const dataLimite = crianca.convocacao_deadline 
      ? new Date(crianca.convocacao_deadline).toLocaleDateString('pt-BR')
      : '';
    
    const diasRestantes = crianca.convocacao_deadline
      ? Math.ceil((new Date(crianca.convocacao_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : config.prazo_resposta_dias || 15;

    const variaveis: Record<string, string | number | null | undefined> = {
      crianca_nome: crianca.nome,
      responsavel_nome: crianca.responsavel_nome,
      responsavel_telefone: crianca.responsavel_telefone,
      responsavel_email: crianca.responsavel_email,
      cmei_nome: crianca.cmeis?.nome || '',
      cmei_endereco: crianca.cmeis?.endereco || '',
      turma_nome: crianca.turmas?.nome || '',
      posicao_fila: crianca.posicao_fila || '',
      data_limite: dataLimite,
      prazo_dias: config.prazo_resposta_dias || 15,
      dias_restantes: diasRestantes,
      data_inscricao: crianca.created_at ? new Date(crianca.created_at).toLocaleDateString('pt-BR') : '',
      municipio_nome: config.nome_municipio || '',
      secretaria_nome: config.nome_secretaria || '',
      lista_documentos: dados_adicionais?.lista_documentos || '',
      motivo: dados_adicionais?.motivo || '',
    };

    // Preparar payload para o webhook
    const webhookPayload = {
      tipo,
      timestamp: new Date().toISOString(),
      crianca: {
        nome: crianca.nome,
        cpf_crianca: crianca.cpf_crianca,
        data_nascimento: crianca.data_nascimento,
        status: crianca.status,
      },
      responsavel: {
        nome: crianca.responsavel_nome,
        cpf: crianca.responsavel_cpf,
        telefone: crianca.responsavel_telefone,
        celular: crianca.responsavel_celular,
        email: crianca.responsavel_email,
      },
      cmei: crianca.cmeis?.nome || null,
      turma: crianca.turmas?.nome || null,
      convocacao: ['convocacao', 'lembrete', 'lembrete_prazo', 'documentacao_pendente', 'documentos_aprovados', 'aguardando_assinatura'].includes(tipo) ? {
        data_convocacao: crianca.data_convocacao,
        prazo: crianca.convocacao_deadline,
      } : null,
      dados_adicionais,
      variaveis, // Inclui variáveis processadas no payload do webhook
    };

    // Enviar notificação via Email (SMTP/Resend)
    if (config.notificacao_email && crianca.responsavel_email) {
      try {
        console.log(`[Notificação] Enviando email para: ${crianca.responsavel_email}`);
        
        let emailData: { subject: string; html: string };

        // Usar template do banco de dados se disponível
        if (template && template.corpo_email && template.assunto_email) {
          const assuntoProcessado = processarTemplate(template.assunto_email, variaveis);
          const corpoProcessado = processarTemplate(template.corpo_email, variaveis);
          
          emailData = {
            subject: assuntoProcessado,
            html: gerarEmailHtml(corpoProcessado, config),
          };
          console.log('[Notificação] Usando template do banco de dados');
        } else {
          // Fallback para template padrão
          emailData = getDefaultEmailTemplate(tipo, {
            crianca: { nome: crianca.nome },
            responsavel: { nome: crianca.responsavel_nome },
            cmei: crianca.cmeis?.nome,
            turma: crianca.turmas?.nome,
            convocacao: {
              data_convocacao: crianca.data_convocacao,
              prazo: crianca.convocacao_deadline,
            },
            config,
            dados_adicionais,
          });
          console.log('[Notificação] Usando template padrão (fallback)');
        }

        const emailResult = await sendEmail({
          to: crianca.responsavel_email,
          subject: emailData.subject,
          html: emailData.html,
        });

        console.log('[Notificação] Email enviado com sucesso:', emailResult);

        // Salvar log da notificação
        await supabaseClient.from('notificacoes_log').insert({
          crianca_id,
          tipo,
          canal: 'email',
          status: 'sucesso',
          destinatario_nome: crianca.responsavel_nome,
          destinatario_contato: crianca.responsavel_email,
          payload: webhookPayload,
          resposta: emailResult,
        });

        results.push({
          canal: 'email',
          sucesso: true,
          id: emailResult?.id,
          template_usado: template ? 'banco_de_dados' : 'padrao',
        });
      } catch (error) {
        console.error('[Notificação] Erro ao enviar email:', error);
        
        await supabaseClient.from('notificacoes_log').insert({
          crianca_id,
          tipo,
          canal: 'email',
          status: 'falha',
          destinatario_nome: crianca.responsavel_nome,
          destinatario_contato: crianca.responsavel_email,
          payload: webhookPayload,
          erro: error instanceof Error ? error.message : 'Erro desconhecido',
        });

        results.push({
          canal: 'email',
          sucesso: false,
          erro: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    } else {
      if (!config.notificacao_email) console.log('[Notificação] Envio de email desativado nas configurações');
      if (!crianca.responsavel_email) console.log('[Notificação] Responsável sem email cadastrado');
    }

    // Enviar notificação via WhatsApp (webhook)
    if (config.notificacao_whatsapp && config.webhook_url_notificacao) {
      try {
        console.log(`[Notificação] Enviando para webhook: ${config.webhook_url_notificacao}`);
        
        // Adicionar mensagem WhatsApp processada ao payload
        let mensagemWhatsApp = '';
        if (template && template.corpo_whatsapp) {
          mensagemWhatsApp = processarTemplate(template.corpo_whatsapp, variaveis);
        }
        
        const webhookPayloadComMensagem = {
          ...webhookPayload,
          mensagem_whatsapp: mensagemWhatsApp || null,
        };

        const webhookResponse = await fetch(config.webhook_url_notificacao, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayloadComMensagem),
        });

        const webhookResult = {
          canal: 'whatsapp',
          sucesso: webhookResponse.ok,
          status: webhookResponse.status,
          template_usado: template?.corpo_whatsapp ? 'banco_de_dados' : 'nenhum',
        };

        if (webhookResponse.ok) {
          console.log('[Notificação] Webhook enviado com sucesso');
        } else {
          console.error('[Notificação] Erro no webhook:', await webhookResponse.text());
        }

        // Salvar log da notificação
        await supabaseClient.from('notificacoes_log').insert({
          crianca_id,
          tipo,
          canal: 'whatsapp',
          status: webhookResponse.ok ? 'sucesso' : 'falha',
          destinatario_nome: crianca.responsavel_nome,
          destinatario_contato: crianca.responsavel_celular || crianca.responsavel_telefone,
          payload: webhookPayloadComMensagem,
          resposta: { status: webhookResponse.status },
          erro: webhookResponse.ok ? null : 'Erro no webhook',
        });

        results.push(webhookResult);
      } catch (error) {
        console.error('[Notificação] Erro ao enviar webhook:', error);
        
        await supabaseClient.from('notificacoes_log').insert({
          crianca_id,
          tipo,
          canal: 'whatsapp',
          status: 'falha',
          destinatario_nome: crianca.responsavel_nome,
          destinatario_contato: crianca.responsavel_celular || crianca.responsavel_telefone,
          payload: webhookPayload,
          erro: error instanceof Error ? error.message : 'Erro desconhecido',
        });

        results.push({
          canal: 'whatsapp',
          sucesso: false,
          erro: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    // SMS (com template do banco de dados)
    if (config.notificacao_sms && crianca.responsavel_telefone) {
      console.log('[Notificação] SMS habilitado mas não implementado ainda');
      
      // Processar mensagem SMS se template disponível
      let mensagemSMS = '';
      if (template && template.corpo_sms) {
        mensagemSMS = processarTemplate(template.corpo_sms, variaveis);
      }
      
      await supabaseClient.from('notificacoes_log').insert({
        crianca_id,
        tipo,
        canal: 'sms',
        status: 'pendente',
        destinatario_nome: crianca.responsavel_nome,
        destinatario_contato: crianca.responsavel_telefone,
        payload: { ...webhookPayload, mensagem_sms: mensagemSMS || null },
        erro: 'Implementação pendente - requer integração com provedor SMS',
      });

      results.push({
        canal: 'sms',
        sucesso: false,
        mensagem: 'Implementação pendente',
        template_disponivel: !!template?.corpo_sms,
      });
    }

    // Registrar log no histórico
    await supabaseClient.from('historico').insert({
      crianca_id,
      acao: `notificacao_${tipo}`,
      descricao: `Notificação de ${tipo} enviada`,
      status_novo: crianca.status,
    });

    console.log('[Notificação] Processo concluído:', results);

    return new Response(
      JSON.stringify({
        sucesso: true,
        resultados: results,
        payload: webhookPayload,
        template_usado: template ? template.titulo : 'Template padrão',
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Notificação] Erro geral:', error);
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

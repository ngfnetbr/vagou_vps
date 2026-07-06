import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limiter.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/email-sender.ts";

interface ContatoPayload {
  nome: string;
  email: string;
  telefone?: string;
  assunto: string;
  mensagem: string;
  destinatario?: 'suporte' | 'contato'; // suporte = dev, contato = email_contato
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    // Rate limiting: 3 requisições a cada 10 minutos por IP
    const clientIP = getClientIP(req);
    const rateLimitResult = await checkRateLimit(clientIP, {
      endpoint: 'enviar-contato',
      maxRequests: 3,
      windowSeconds: 600, // 10 minutos
    });

    if (!rateLimitResult.allowed) {
      console.log(`[Enviar Contato] Rate limit excedido para IP: ${clientIP}`);
      return rateLimitResponse(rateLimitResult, getCorsHeaders(req));
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Buscar configurações do sistema
    const { data: config, error: configError } = await supabaseClient
      .from('configuracoes_sistema')
      .select('email_contato, nome_secretaria, nome_municipio, suporte_dev_email')
      .single();

    if (configError) {
      console.error('[Enviar Contato] Erro ao buscar configurações:', configError);
      throw new Error('Erro ao buscar configurações do sistema');
    }

    const payload: ContatoPayload = await req.json();
    const { nome: rawNome, email: rawEmail, telefone: rawTelefone, assunto: rawAssunto, mensagem: rawMensagem, destinatario = 'contato' } = payload;

    // Sanitização HTML para prevenir XSS/injeção
    const escapeHtml = (str: string): string => {
      if (!str) return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\n/g, '<br>');
    };

    const nome = escapeHtml(rawNome?.trim() || '');
    const email = rawEmail?.trim()?.toLowerCase() || ''; // Email não precisa escape HTML
    const telefone = escapeHtml(rawTelefone?.trim() || '');
    const assunto = escapeHtml(rawAssunto?.trim() || '');
    const mensagem = escapeHtml(rawMensagem?.trim() || '');

    // Validação de email básica
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ sucesso: false, erro: 'E-mail inválido' }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Determinar email de destino baseado no tipo
    const emailDestino = destinatario === 'suporte' 
      ? config?.suporte_dev_email 
      : config?.email_contato;

    if (!emailDestino) {
      console.error(`[Enviar Contato] Email de ${destinatario} não configurado`);
      throw new Error(`Email de ${destinatario === 'suporte' ? 'suporte técnico' : 'contato'} não configurado no sistema`);
    }

    // Validação básica
    if (!nome || !email || !assunto || !mensagem) {
      return new Response(
        JSON.stringify({ sucesso: false, erro: 'Campos obrigatórios não preenchidos' }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[Enviar Contato] Processando mensagem de ${nome} (${email}) para ${emailDestino}`);

    // Montar HTML do email
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1351B4 0%, #071D41 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; font-size: 14px; }
    .content { padding: 30px; }
    .field { margin-bottom: 20px; }
    .field label { display: block; font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 5px; font-weight: 600; }
    .field p { margin: 0; font-size: 16px; color: #333; background: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 4px solid #1351B4; }
    .message-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px; }
    .message-box h3 { margin: 0 0 15px; color: #1351B4; font-size: 14px; text-transform: uppercase; }
    .message-box p { margin: 0; line-height: 1.8; color: #333; white-space: pre-wrap; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📧 Nova Mensagem de Contato</h1>
      <p>${config.nome_secretaria} - ${config.nome_municipio}</p>
    </div>
    <div class="content">
      <div class="field">
        <label>Nome</label>
        <p>${nome}</p>
      </div>
      <div class="field">
        <label>E-mail</label>
        <p>${email}</p>
      </div>
      ${telefone ? `
      <div class="field">
        <label>Telefone</label>
        <p>${telefone}</p>
      </div>
      ` : ''}
      <div class="field">
        <label>Assunto</label>
        <p>${assunto}</p>
      </div>
      <div class="message-box">
        <h3>Mensagem</h3>
        <p>${mensagem}</p>
      </div>
    </div>
    <div class="footer">
      <p>Esta mensagem foi enviada através do formulário de contato do sistema VAGOU.</p>
      <p>Responda diretamente para: <strong>${email}</strong></p>
    </div>
  </div>
</body>
</html>
    `;

    // Enviar email usando a função compartilhada (SMTP/Resend)
    const emailResult = await sendEmail({
      to: emailDestino,
      subject: `[${destinatario === 'suporte' ? 'Suporte VAGOU' : 'Contato VAGOU'}] ${assunto}`,
      html: htmlContent,
      replyTo: email,
    });

    console.log('[Enviar Contato] Email enviado com sucesso:', emailResult);

    return new Response(
      JSON.stringify({
        sucesso: true,
        mensagem: 'Mensagem enviada com sucesso!',
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Enviar Contato] Erro geral:', error);
    return new Response(
      JSON.stringify({
        sucesso: false,
        erro: error instanceof Error ? error.message : 'Erro ao enviar mensagem',
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

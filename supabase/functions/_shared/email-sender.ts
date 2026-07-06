import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { Resend } from 'https://esm.sh/resend@4.0.0'
import nodemailer from "npm:nodemailer@6.9.13";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail(params: SendEmailParams) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // 1. Buscar configurações de SMTP
  const { data: config } = await supabase
    .from('configuracoes_sistema')
    .select('*')
    .limit(1)
    .maybeSingle();

  // Defaults
  const senderName = config?.smtp_sender_name || config?.sistema_nome || 'VAGOU';
  const senderEmail = config?.smtp_sender_email || 'nao-responda@vagou.com.br';
  
  // 2. Tentar enviar via SMTP Personalizado
  if (config?.smtp_host && config?.smtp_port && config?.smtp_user && config?.smtp_password) {
    console.log('Usando configurações SMTP personalizadas:', config.smtp_host);
    
    try {
      const tlsRejectUnauthorizedRaw = Deno.env.get("SMTP_TLS_REJECT_UNAUTHORIZED");
      const tlsRejectUnauthorized =
        tlsRejectUnauthorizedRaw === undefined || tlsRejectUnauthorizedRaw === null || tlsRejectUnauthorizedRaw.trim() === ""
          ? true
          : !["0", "false", "no", "off"].includes(tlsRejectUnauthorizedRaw.trim().toLowerCase());

      const transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: config.smtp_port,
        secure: config.smtp_secure || false, // true for 465, false for other ports
        auth: {
          user: config.smtp_user,
          pass: config.smtp_password,
        },
        tls: {
          rejectUnauthorized: tlsRejectUnauthorized
        }
      });

      const info = await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
        replyTo: params.replyTo
      });

      console.log('Email enviado via SMTP:', info.messageId);
      return { success: true, provider: 'smtp', id: info.messageId };
    } catch (error) {
      console.error('Erro ao enviar via SMTP:', error);
      // Não retorna erro imediatamente, tenta fallback se possível (mas geralmente SMTP é a preferência explícita)
      throw error; 
    }
  }

  // 3. Fallback para Resend (se configurado via variável de ambiente)
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (resendApiKey) {
    console.log('Usando Resend (fallback)');
    const resend = new Resend(resendApiKey);
    
    const { data, error } = await resend.emails.send({
      from: `${senderName} <onboarding@resend.dev>`, // Resend requer domínio verificado ou onboarding
      to: [params.to],
      subject: params.subject,
      html: params.html,
      reply_to: params.replyTo
    });

    if (error) {
      console.error('Erro Resend:', error);
      throw error;
    }

    return { success: true, provider: 'resend', data };
  }

  throw new Error('Nenhum provedor de e-mail configurado (SMTP ou Resend)');
}

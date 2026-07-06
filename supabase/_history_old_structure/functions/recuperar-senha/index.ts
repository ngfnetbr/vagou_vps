import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"
import { sendEmail } from "../_shared/email-sender.ts"
import { getResetPasswordTemplate } from "../_shared/email-templates.ts"
import { getCorsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) })
  }

  try {
    const { email, redirectTo } = await req.json()

    if (!email) {
      throw new Error('Email é obrigatório')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    // Admin client to generate link
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Generate Recovery Link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: redirectTo || undefined
      }
    })

    if (linkError) {
      console.error('Error generating link:', linkError)
      throw linkError
    }

    const { user } = linkData
    const resetLink = linkData.properties.action_link

    // 2. Get System Config for Template
    let nomeSistema = 'VAGOU'
    let nomeMunicipio = 'Município'
    
    const { data: config } = await supabaseAdmin
      .from('configuracoes_sistema')
      .select('sistema_nome, nome_municipio')
      .limit(1)
      .maybeSingle()
    
    if (config) {
      nomeSistema = config.sistema_nome || 'VAGOU'
      nomeMunicipio = config.nome_municipio || 'Município'
    }

    // 3. Get User Name (optional)
    const nomeUsuario = user?.user_metadata?.nome_completo || user?.user_metadata?.nome

    // 4. Prepare Email
    let html = ''
    let subject = `Redefinição de Senha - ${nomeSistema}`

    // Tentar buscar template personalizado
    const { data: templateDB } = await supabaseAdmin
      .from('templates_email')
      .select('*')
      .eq('tipo', 'recuperacao_senha')
      .eq('ativo', true)
      .maybeSingle();

    if (templateDB) {
      console.log('Usando template personalizado de recuperação de senha');
      
      // Processar assunto
      if (templateDB.assunto_email) {
        subject = templateDB.assunto_email
          .replace(/{{responsavel_nome}}/g, nomeUsuario || 'Usuário')
          .replace(/{{nome_sistema}}/g, nomeSistema)
          .replace(/{{nome_municipio}}/g, nomeMunicipio);
      }

      // Processar corpo
      if (templateDB.corpo_email) {
        html = templateDB.corpo_email
          .replace(/{{link_recuperacao}}/g, resetLink)
          .replace(/{{responsavel_nome}}/g, nomeUsuario || 'Usuário')
          .replace(/{{nome_sistema}}/g, nomeSistema)
          .replace(/{{nome_municipio}}/g, nomeMunicipio);
          
        // Envolver em estrutura HTML básica se não tiver
        if (!html.includes('<!DOCTYPE html>')) {
          html = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>${subject}</title>
            </head>
            <body style="font-family: sans-serif; line-height: 1.5; color: #333;">
              ${html}
            </body>
            </html>
          `;
        }
      } else {
        html = getResetPasswordTemplate({
          resetLink,
          nomeUsuario,
          nomeSistema,
          nomeMunicipio,
        });
      }
    } else {
      // Fallback para template padrão
      html = getResetPasswordTemplate({
        resetLink,
        nomeUsuario,
        nomeSistema,
        nomeMunicipio,
      });
    }

    // 5. Send Email
    await sendEmail({
      to: email,
      subject,
      html,
    })

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('Error in recuperar-senha:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } 
      }
    )
  }
})

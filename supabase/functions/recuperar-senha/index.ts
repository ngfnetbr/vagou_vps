import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"
import { sendEmail } from "../_shared/email-sender.ts"
import { getResetPasswordTemplate } from "../_shared/email-templates.ts"
import { getCorsHeaders, getSafeRedirectTo, isAllowedOrigin } from "../_shared/cors.ts"
import { checkRateLimit, getClientIP } from "../_shared/rate-limiter.ts"

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) })
  }

  try {
    const corsHeaders = getCorsHeaders(req)
    const origin = req.headers.get("origin") || ""
    const isLocalDevOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    const ok = (body: Record<string, unknown> = { success: true }) =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    const body = await req.json().catch(() => ({}))
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
    const redirectTo = body?.redirectTo

    const clientIP = getClientIP(req)
    const byIp = await checkRateLimit(clientIP, {
      endpoint: "recuperar-senha-ip",
      maxRequests: 20,
      windowSeconds: 60,
      failOpen: true,
    })
    if (!byIp.allowed) {
      console.warn("[recuperar-senha] rate limit (ip)", { clientIP })
      return ok()
    }

    if (email) {
      const byEmail = await checkRateLimit(email, {
        endpoint: "recuperar-senha-email",
        maxRequests: 5,
        windowSeconds: 60 * 60,
        failOpen: true,
      })
      if (!byEmail.allowed) {
        console.warn("[recuperar-senha] rate limit (email)")
        return ok()
      }
    }

    if (!email || !email.includes("@")) {
      return ok()
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    // Admin client to generate link
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Generate Recovery Link
    let safeRedirectTo: string | undefined;
    if (typeof redirectTo === "string" && redirectTo.trim()) {
      try {
        const url = new URL(redirectTo);
        if (isAllowedOrigin(url.origin)) {
          safeRedirectTo = url.toString();
        }
      } catch {
        safeRedirectTo = undefined;
      }
    }

    if (!safeRedirectTo) {
      safeRedirectTo = getSafeRedirectTo(req, "/auth/redefinir-senha");
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: safeRedirectTo || undefined
      }
    })

    if (linkError) {
      console.error('Error generating link:', linkError)
      return ok()
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
    try {
      await sendEmail({
        to: email,
        subject,
        html,
      })
    } catch (sendError) {
      console.error("Error sending recovery email:", sendError)

      if (isLocalDevOrigin && resetLink) {
        return ok({
          success: true,
          emailSent: false,
          devResetLink: resetLink,
        })
      }

      throw sendError
    }

    return ok()

  } catch (error: any) {
    console.error('Error in recuperar-senha:', error)
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    )
  }
})

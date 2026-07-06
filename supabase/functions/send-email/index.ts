import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"
import { sendEmail } from "../_shared/email-sender.ts"
import { getResetPasswordTemplate } from "../_shared/email-templates.ts"
import { getCorsHeaders } from "../_shared/cors.ts"

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "nao_autorizado" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      })
    }

    const { 
      email, 
      resetLink, 
      nomeUsuario,
      tipo = 'reset_password' 
    } = await req.json()

    if (!email || !resetLink) {
      throw new Error('Email e resetLink são obrigatórios')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""))
    const tokenUserId = user?.id || null
    if (!tokenUserId) {
      return new Response(JSON.stringify({ error: "token_invalido" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      })
    }

    // Buscar configurações do sistema para obter nomes corretos
    let nomeSistema = 'VAGOU'
    let nomeMunicipio = 'Município'

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      const { data: config } = await supabase
        .from('configuracoes_sistema')
        .select('sistema_nome, nome_municipio')
        .limit(1)
        .maybeSingle()
    
      if (config) {
        nomeSistema = config.sistema_nome || 'VAGOU'
        nomeMunicipio = config.nome_municipio || 'Município'
      }
    }

    const html = getResetPasswordTemplate({
      resetLink,
      nomeUsuario,
      nomeSistema,
      nomeMunicipio,
    })

    // Enviar email usando a função compartilhada que suporta SMTP e Resend
    const result = await sendEmail({
      to: email,
      subject: `Redefinição de Senha - ${nomeSistema}`,
      html,
    })

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Error sending email:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } 
      }
    )
  }
})

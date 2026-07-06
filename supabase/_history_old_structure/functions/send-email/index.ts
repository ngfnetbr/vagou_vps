import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"
import { sendEmail } from "../_shared/email-sender.ts"
import { getResetPasswordTemplate } from "../_shared/email-templates.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get('Origin')
  if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }
  }
  return corsHeaders
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { 
      email, 
      resetLink, 
      nomeUsuario,
      tipo = 'reset_password' 
    } = await req.json()

    if (!email || !resetLink) {
      throw new Error('Email e resetLink são obrigatórios')
    }

    // Buscar configurações do sistema para obter nomes corretos
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
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

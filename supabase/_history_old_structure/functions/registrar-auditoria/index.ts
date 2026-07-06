import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Get auth header to identify user
    const authHeader = req.headers.get('Authorization')
    
    // Extract IP from headers (Supabase edge functions receive these)
    const ipAddress = 
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      req.headers.get('cf-connecting-ip') ||
      'unknown'
    
    // Extract User Agent
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Parse request body
    const { tabela, operacao, registro_id, dados_antigos, dados_novos } = await req.json()

    if (!tabela || !operacao) {
      return new Response(
        JSON.stringify({ error: 'tabela e operacao são obrigatórios' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Create supabase client with user's auth if provided
    const supabase = authHeader 
      ? createClient(supabaseUrl, supabaseServiceKey, {
          global: { headers: { Authorization: authHeader } }
        })
      : createClient(supabaseUrl, supabaseServiceKey)

    // Get user ID from auth if available
    let userId = null
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
      userId = user?.id || null
    }

    // Insert audit record directly
    const { data, error } = await supabase
      .from('auditoria')
      .insert({
        tabela,
        operacao,
        registro_id: registro_id || null,
        dados_antigos: dados_antigos || null,
        dados_novos: dados_novos || null,
        usuario_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Erro ao registrar auditoria:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id, ip: ipAddress, userAgent }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro na edge function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }
})
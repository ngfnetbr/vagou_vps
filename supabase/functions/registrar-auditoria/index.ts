import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limiter.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    // Get auth header to identify user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "nao_autorizado" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }
    
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

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    })


    // Get user ID from auth if available
    let userId = null
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    userId = user?.id || null
    if (authError || !userId) {
      return new Response(JSON.stringify({ error: "token_invalido" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const clientIP = getClientIP(req)
    const rateLimitResult = await checkRateLimit(userId || clientIP, {
      endpoint: "registrar-auditoria",
      maxRequests: 120,
      windowSeconds: 60,
      failOpen: true,
    })
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult, getCorsHeaders(req))
    }

    // Use the SECURITY DEFINER RPC so audit writes remain locked down by RLS
    // while authenticated users can still request a controlled audit record.
    const { data, error } = await supabase.rpc('registrar_auditoria', {
      p_tabela: tabela,
      p_operacao: operacao,
      p_registro_id: registro_id || null,
      p_dados_antigos: dados_antigos || null,
      p_dados_novos: dados_novos || null,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
    })

    if (error) {
      console.error('Erro ao registrar auditoria:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, id: data, ip: ipAddress, userAgent }),
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

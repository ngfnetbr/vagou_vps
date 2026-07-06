import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface RateLimitConfig {
  endpoint: string;
  maxRequests: number;
  windowSeconds: number;
  failOpen?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const windowStart = new Date(Date.now() - config.windowSeconds * 1000);

  // Buscar entradas existentes na janela de tempo
  const { data: entries, error: fetchError } = await supabase
    .from('rate_limit_entries')
    .select('*')
    .eq('identifier', identifier)
    .eq('endpoint', config.endpoint)
    .gte('window_start', windowStart.toISOString());

  if (fetchError) {
    console.error('[Rate Limiter] Erro ao buscar entradas:', fetchError);
    const failOpen = Boolean(config.failOpen);
    return {
      allowed: failOpen,
      remaining: failOpen ? config.maxRequests : 0,
      resetAt: new Date(Date.now() + config.windowSeconds * 1000),
    };
  }

  const totalRequests =
    entries?.reduce((sum: number, e: { request_count?: number }) => sum + (e.request_count || 1), 0) || 0;

  if (totalRequests >= config.maxRequests) {
    // Limite atingido
    const oldestEntry = entries?.sort(
      (a: { window_start: string }, b: { window_start: string }) =>
        new Date(a.window_start).getTime() - new Date(b.window_start).getTime(),
    )[0];
    
    const resetAt = oldestEntry 
      ? new Date(new Date(oldestEntry.window_start).getTime() + config.windowSeconds * 1000)
      : new Date(Date.now() + config.windowSeconds * 1000);

    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  // Registrar nova requisição
  const { error: insertError } = await supabase
    .from('rate_limit_entries')
    .insert({
      identifier,
      endpoint: config.endpoint,
      request_count: 1,
      window_start: new Date().toISOString(),
    });

  if (insertError) {
    console.error('[Rate Limiter] Erro ao registrar requisição:', insertError);
  }

  return {
    allowed: true,
    remaining: config.maxRequests - totalRequests - 1,
    resetAt: new Date(Date.now() + config.windowSeconds * 1000),
  };
}

export function getClientIP(req: Request): string {
  // Tentar obter IP de headers comuns de proxy
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback para identificador genérico
  return 'unknown';
}

export function rateLimitResponse(result: RateLimitResult, corsHeaders: Record<string, string>) {
  const retryAfter = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000);
  
  return new Response(
    JSON.stringify({
      erro: 'Muitas requisições. Tente novamente mais tarde.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.resetAt.toISOString(),
      },
    }
  );
}

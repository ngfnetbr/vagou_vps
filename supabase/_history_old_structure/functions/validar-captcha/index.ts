import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders } from "../_shared/cors.ts";

interface ValidarCaptchaPayload {
  token: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar configurações do sistema
    const { data: config, error: configError } = await supabase
      .from('configuracoes_sistema')
      .select('captcha_habilitado, captcha_secret_key')
      .single();

    if (configError) {
      console.error('[Validar CAPTCHA] Erro ao buscar config:', configError);
      throw new Error('Erro ao verificar configuração de CAPTCHA');
    }

    // Se CAPTCHA não está habilitado, retorna sucesso
    if (!config?.captcha_habilitado) {
      return new Response(
        JSON.stringify({ valido: true, motivo: 'CAPTCHA não habilitado' }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    if (!config?.captcha_secret_key) {
      console.error('[Validar CAPTCHA] Secret key não configurada');
      throw new Error('CAPTCHA não configurado corretamente');
    }

    const payload: ValidarCaptchaPayload = await req.json();
    const { token } = payload;

    if (!token) {
      return new Response(
        JSON.stringify({ valido: false, erro: 'Token CAPTCHA não fornecido' }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('[Validar CAPTCHA] Verificando token...');

    // Verificar com hCaptcha
    const verifyResponse = await fetch('https://api.hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `response=${token}&secret=${config.captcha_secret_key}`,
    });

    const verifyResult = await verifyResponse.json();

    console.log('[Validar CAPTCHA] Resultado:', verifyResult.success);

    if (!verifyResult.success) {
      return new Response(
        JSON.stringify({
          valido: false,
          erro: 'Verificação CAPTCHA falhou',
          codigos: verifyResult['error-codes'],
        }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    return new Response(
      JSON.stringify({ valido: true }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Validar CAPTCHA] Erro:', error);
    return new Response(
      JSON.stringify({
        valido: false,
        erro: error instanceof Error ? error.message : 'Erro ao validar CAPTCHA',
      }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
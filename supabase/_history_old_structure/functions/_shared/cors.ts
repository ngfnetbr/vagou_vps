export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const getCorsHeaders = (req: Request) => {
  // Em produção, você deve configurar a variável de ambiente ALLOWED_ORIGINS
  // com os domínios permitidos separados por vírgula.
  // Ex: https://meu-app.com,https://admin.meu-app.com
  
  const origin = req.headers.get("origin");
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:54321", // Supabase local
  ];
  
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");
  if (envOrigins) {
    allowedOrigins.push(...envOrigins.split(",").map(o => o.trim()));
  }

  if (origin && allowedOrigins.includes(origin)) {
    return {
      ...corsHeaders,
      "Access-Control-Allow-Origin": origin,
    };
  }

  // Fallback para * em desenvolvimento se não houver ALLOWED_ORIGINS definido,
  // mas idealmente deveria ser restrito.
  return corsHeaders;
};

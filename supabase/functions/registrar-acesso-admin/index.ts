import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limiter.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    const userAgent = req.headers.get("user-agent") || "unknown";

    const { path, motivo } = await req.json();

    if (!path || typeof path !== "string") {
      return new Response(JSON.stringify({ error: "path_obrigatorio" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (!path.startsWith("/admin")) {
      return new Response(JSON.stringify({ error: "path_invalido" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const clientIP = getClientIP(req);
    const rateLimitResult = await checkRateLimit(clientIP, {
      endpoint: "registrar-acesso-admin",
      maxRequests: 120,
      windowSeconds: 60,
      failOpen: true,
    });
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult, getCorsHeaders(req));
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from("auditoria")
      .insert({
        tabela: "painel_admin",
        operacao: "tentativa_sem_auth",
        registro_id: null,
        dados_antigos: null,
        dados_novos: { path, motivo: typeof motivo === "string" ? motivo : null },
        usuario_id: null,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Erro ao registrar tentativa de acesso ao admin:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro na edge function:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});

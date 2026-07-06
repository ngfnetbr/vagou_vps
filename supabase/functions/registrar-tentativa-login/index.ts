import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limiter.ts";

function maskEmail(email: string) {
  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.indexOf("@");
  if (atIndex <= 0) return { masked: null, domain: null };
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  const prefix = local.slice(0, 2);
  const maskedLocal = `${prefix}${"*".repeat(Math.max(1, local.length - prefix.length))}`;
  return { masked: `${maskedLocal}@${domain}`, domain };
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

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

    const { email, provider, sucesso, motivo, path } = await req.json();

    const providerNormalized =
      typeof provider === "string" && provider.trim() ? provider.trim().toLowerCase() : "unknown";

    if (typeof sucesso !== "boolean") {
      return new Response(JSON.stringify({ error: "sucesso_obrigatorio" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const emailNormalized =
      typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;

    const clientIP = getClientIP(req);
    const rateLimitResult = await checkRateLimit(`${clientIP}:${providerNormalized}`, {
      endpoint: "registrar-tentativa-login",
      maxRequests: 120,
      windowSeconds: 60,
      failOpen: true,
    });
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult, getCorsHeaders(req));
    }

    const emailHash = emailNormalized ? await sha256Hex(emailNormalized) : null;
    const { masked: emailMasked, domain: emailDomain } = emailNormalized ? maskEmail(emailNormalized) : { masked: null, domain: null };

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from("auditoria")
      .insert({
        tabela: "auth",
        operacao: sucesso ? "login_sucesso" : "login_falha",
        registro_id: null,
        dados_antigos: null,
        dados_novos: {
          provider: providerNormalized,
          path: typeof path === "string" ? path : null,
          motivo: typeof motivo === "string" ? motivo : null,
          email_hash: emailHash,
          email_masked: emailMasked,
          email_domain: emailDomain,
        },
        usuario_id: null,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Erro ao registrar tentativa de login:", error);
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

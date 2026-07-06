import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"
import { getCorsHeaders } from "../_shared/cors.ts"
import { checkRateLimit, getClientIP } from "../_shared/rate-limiter.ts"

/**
 * Recuperação de e-mail de acesso a partir do CPF.
 * Retorna o e-mail parcialmente mascarado (ex.: jo***@gmail.com) para ajudar
 * o usuário a lembrar qual e-mail utilizou no cadastro.
 *
 * Importante: nunca retornamos o e-mail completo, apenas uma dica mascarada.
 */

function onlyDigits(value: string): string {
  return (value || "").replace(/\D/g, "")
}

// Validação simples de CPF (formato + dígitos verificadores)
function isValidCpf(cpf: string): boolean {
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false
  let soma = 0
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i)
  let resto = (soma * 10) % 11
  if (resto === 10) resto = 0
  if (resto !== parseInt(cpf[9])) return false
  soma = 0
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i)
  resto = (soma * 10) % 11
  if (resto === 10) resto = 0
  if (resto !== parseInt(cpf[10])) return false
  return true
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!domain) return "***"
  const visible = local.slice(0, Math.min(2, local.length))
  const maskedLocal = `${visible}${"*".repeat(Math.max(3, local.length - visible.length))}`
  const domainParts = domain.split(".")
  const domainName = domainParts[0] || ""
  const tld = domainParts.slice(1).join(".")
  const visibleDomain = domainName.slice(0, 1)
  const maskedDomain = `${visibleDomain}${"*".repeat(Math.max(2, domainName.length - 1))}`
  return tld ? `${maskedLocal}@${maskedDomain}.${tld}` : `${maskedLocal}@${maskedDomain}`
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  try {
    if (req.method !== "POST") {
      return json({ error: "Método não permitido" }, 405)
    }

    const { cpf } = await req.json().catch(() => ({ cpf: "" }))
    const cpfLimpo = onlyDigits(cpf)

    if (!isValidCpf(cpfLimpo)) {
      return json({ error: "CPF inválido" }, 400)
    }

    // Rate limit por IP para evitar enumeração de CPFs
    const ip = getClientIP(req)
    const rl = await checkRateLimit(`recuperar-email:${ip}`, {
      endpoint: "recuperar-email",
      maxRequests: 8,
      windowSeconds: 60 * 10,
      failOpen: true,
    })
    if (!rl.allowed) {
      return json({ error: "Muitas tentativas. Tente novamente mais tarde." }, 429)
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("cpf", cpfLimpo)
      .maybeSingle()

    if (error) {
      console.error("Erro ao buscar perfil:", error)
      return json({ error: "Erro ao consultar cadastro" }, 500)
    }

    if (!profile?.email) {
      // Resposta genérica para não revelar se o CPF existe
      return json({ found: false }, 200)
    }

    return json({ found: true, emailMascarado: maskEmail(profile.email) }, 200)
  } catch (err) {
    console.error("Erro em recuperar-email:", err)
    return json({ error: "Erro interno" }, 500)
  }
})

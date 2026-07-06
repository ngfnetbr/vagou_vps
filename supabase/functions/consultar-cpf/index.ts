import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limiter.ts";

type InputBody = {
  cpf?: string;
  tipo?: "crianca" | "responsavel" | string;
};

type ProviderResult = {
  nome?: string;
  data_nascimento?: string;
};

const toIsoDate = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;

  return null;
};

const fetchCpfHub = async (cpf: string, apiKey: string): Promise<ProviderResult | null> => {
  const providerResponse = await fetch(`https://api.cpfhub.io/cpf/${cpf}`, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
      Accept: "application/json",
    },
  });

  if (!providerResponse.ok) return null;

  const providerJson = (await providerResponse.json().catch(() => ({}))) as Record<string, unknown>;
  const success = providerJson?.success === true;
  const data =
    providerJson?.data && typeof providerJson.data === "object" && !Array.isArray(providerJson.data)
      ? (providerJson.data as Record<string, unknown>)
      : null;

  if (!success || !data) return null;

  const nome = (typeof data.name === "string" && data.name.trim()) || "";
  const dataNascimento = toIsoDate(data.birthDate) ?? null;

  const result: ProviderResult = {};
  if (nome) result.nome = nome;
  if (dataNascimento) result.data_nascimento = dataNascimento;
  return Object.keys(result).length ? result : null;
};

const fetchApiCpf = async (cpf: string, apiKey: string): Promise<ProviderResult | null> => {
  const providerResponse = await fetch(`https://apicpf.com/api/consulta?cpf=${encodeURIComponent(cpf)}`, {
    method: "GET",
    headers: {
      "X-API-KEY": apiKey,
      Accept: "application/json",
    },
  });

  if (!providerResponse.ok) return null;

  const providerJson = (await providerResponse.json().catch(() => ({}))) as Record<string, unknown>;
  const code = typeof providerJson.code === "number" ? providerJson.code : null;
  const data =
    providerJson?.data && typeof providerJson.data === "object" && !Array.isArray(providerJson.data)
      ? (providerJson.data as Record<string, unknown>)
      : null;

  if (code !== 200 || !data) return null;

  const nome = (typeof data.nome === "string" && data.nome.trim()) || "";
  const dataNascimento = toIsoDate(data.data_nascimento) ?? null;

  const result: ProviderResult = {};
  if (nome) result.nome = nome;
  if (dataNascimento) result.data_nascimento = dataNascimento;
  return Object.keys(result).length ? result : null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const headers = { ...getCorsHeaders(req), "Content-Type": "application/json" };

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ found: false, error: "method_not_allowed" }), {
      status: 405,
      headers,
    });
  }

  try {
    const clientIP = getClientIP(req);
    const rateLimitResult = await checkRateLimit(clientIP, {
      endpoint: "consultar-cpf",
      maxRequests: 10,
      windowSeconds: 60,
      failOpen: true,
    });
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult, getCorsHeaders(req));
    }

    const body = (await req.json().catch(() => ({}))) as InputBody;
    const cpf = String(body?.cpf ?? "").replace(/\D/g, "");

    if (cpf.length !== 11) {
      return new Response(JSON.stringify({ found: false, error: "invalid_cpf" }), { status: 400, headers });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ found: false, error: "server_not_configured" }), { status: 500, headers });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: config, error: configError } = await supabase
      .from("configuracoes_sistema")
      .select("cpfhub_habilitado, cpfhub_api_key, apicpf_habilitado, apicpf_api_key")
      .maybeSingle();

    if (configError) {
      return new Response(JSON.stringify({ found: false, error: "config_error" }), { headers });
    }

    const providers = [
      { id: "cpfhub" as const, enabled: config?.cpfhub_habilitado === true, apiKey: config?.cpfhub_api_key ?? null },
      { id: "apicpf" as const, enabled: config?.apicpf_habilitado === true, apiKey: config?.apicpf_api_key ?? null },
    ];

    let providerData: ProviderResult | null = null;

    for (const provider of providers) {
      if (!provider.enabled || !provider.apiKey) continue;
      try {
        providerData =
          provider.id === "cpfhub"
            ? await fetchCpfHub(cpf, provider.apiKey)
            : await fetchApiCpf(cpf, provider.apiKey);
      } catch {
        providerData = null;
      }
      if (providerData) break;
    }

    if (!providerData) {
      return new Response(JSON.stringify({ found: false }), { headers });
    }

    const found = Boolean(providerData.nome || providerData.data_nascimento);

    return new Response(
      JSON.stringify({
        found,
        ...(providerData.nome ? { nome: providerData.nome } : {}),
        ...(providerData.data_nascimento ? { data_nascimento: providerData.data_nascimento } : {}),
      }),
      { headers }
    );
  } catch {
    return new Response(JSON.stringify({ found: false, error: "internal_error" }), { headers });
  }
});

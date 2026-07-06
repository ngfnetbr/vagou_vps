import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (o: unknown) => JSON.stringify(o);
const nowIso = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();
const timeoutMs = Number(Deno.env.get("SYNC_TIMEOUT_MS") || "25000");
const minIntervalMs = Number(Deno.env.get("SYNC_MIN_INTERVAL_MS") || "10000");
const chunkSize = Number(Deno.env.get("SYNC_CHUNK_SIZE") || "500");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const rid = req.headers.get("x-request-id") || uuid();

  // ---- Auth guard: require authenticated admin ----
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(json({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(json({ error: "Invalid token" }), { status: 401, headers: corsHeaders });
  }

  const userId = claimsData.claims.sub as string;

  // Verify admin role using service client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: roleCheck } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleCheck) {
    return new Response(json({ error: "Forbidden: admin role required" }), { status: 403, headers: corsHeaders });
  }

  try {
    const log = (level: string, msg: string, extra: Record<string, unknown> = {}) =>
      console.log(json({ level, rid, msg, t: nowIso(), ...extra }));

    const abort = new AbortController();
    const t = setTimeout(() => abort.abort("timeout"), timeoutMs);

    // ---- Controle de sincronização incremental ----
    const { data: controle, error: controleError } = await supabase
      .from("sync_controle")
      .select("ultima_sincronizacao")
      .eq("entidade", "criancas")
      .maybeSingle();

    if (controleError) throw new Error(`Erro ao ler sync_controle: ${controleError.message}`);

    const ultimaSyncRaw = controle?.ultima_sincronizacao as string | null;
    const parsed = ultimaSyncRaw ? new Date(ultimaSyncRaw.replace(" ", "T")) : null;
    const ultimaSync =
      parsed && !isNaN(parsed.getTime()) ? parsed.toISOString() : "1970-01-01T00:00:00.000Z";

    if (Date.now() - new Date(ultimaSync).getTime() < minIntervalMs) {
      log("info", "debounced", { ultimaSync });
      clearTimeout(t);
      return new Response(
        json({ success: true, debounced: true, ultima_sincronizacao: ultimaSync }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- Variáveis do sistema principal (Vagou) ----
    const principalUrl = Deno.env.get("VAGOU_API_URL");
    const principalKey = Deno.env.get("VAGOU_API_KEY");

    if (!principalUrl || !principalKey) {
      throw new Error(
        "Variáveis obrigatórias ausentes: VAGOU_API_URL e VAGOU_API_KEY devem ser configuradas nos secrets do Supabase."
      );
    }

    const baseUrl = principalUrl.endsWith("/") ? principalUrl.slice(0, -1) : principalUrl;
    const encodedSync = encodeURIComponent(ultimaSync);

    // ---- Busca incremental das crianças ----
    const fetchUrl =
      `${baseUrl}/rest/v1/criancas` +
      `?select=` +
      [
        "id",
        "nome",
        "data_nascimento",
        "responsavel_nome",
        "logradouro",
        "numero",
        "responsavel_telefone",
        "cmei_atual_id",
        "turma_atual_id",
        "cmei_atual:criancas_cmei_atual_id_fkey(nome)",
        "turma_atual:turmas(nome)",
        "updated_at",
        "deleted_at",
      ].join(",") +
      `&updated_at=gt.${encodedSync}`;

    log("info", "fetching", { fetchUrl });

    const response = await fetch(fetchUrl, {
      headers: {
        apikey: principalKey,
        Authorization: `Bearer ${principalKey}`,
        Accept: "application/json",
      },
      signal: abort.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erro API Principal ${response.status}: ${errText}`);
    }

    const criancasRaw: unknown = await response.json();
    if (!Array.isArray(criancasRaw)) throw new Error("Resposta inválida — esperado array");

    if (criancasRaw.length === 0) {
      clearTimeout(t);
      log("info", "nenhuma atualização", { ultimaSync });
      return new Response(
        json({ success: true, sincronizados: 0, ultima_sincronizacao: ultimaSync }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const agora = nowIso();

    // ---- Mapeia para o schema cache_criancas ----
    type PrincipalCriancaRaw = {
      id: string | number;
      nome: string;
      data_nascimento?: string | null;
      cmei_atual_id?: string | number | null;
      cmei_atual?: { nome?: string | null } | null;
      turma_atual_id?: string | number | null;
      turma_atual?: { nome?: string | null } | null;
      deleted_at?: string | null;
      responsavel_nome?: string | null;
      responsavel_telefone?: string | null;
      logradouro?: string | null;
      numero?: string | null;
      updated_at: string;
    };

    const criancas = criancasRaw as PrincipalCriancaRaw[];

    const criancasParaCache = criancas.map((c) => ({
      external_id: String(c.id),
      nome: c.nome,
      data_nascimento: c.data_nascimento || null,
      cmei_id: c.cmei_atual_id ? String(c.cmei_atual_id) : null,
      cmei_nome: c.cmei_atual?.nome ?? null,
      turma_id: c.turma_atual_id ? String(c.turma_atual_id) : null,
      turma_nome: c.turma_atual?.nome ?? null,
      ativo: c.deleted_at ? false : true,
      responsavel: c.responsavel_nome || null,
      telefone: c.responsavel_telefone || null,
      dados_json: {
        responsavel_nome: c.responsavel_nome,
        logradouro: c.logradouro,
        numero: c.numero,
        responsavel_telefone: c.responsavel_telefone,
        updated_at_principal: c.updated_at,
        deleted_at: c.deleted_at,
      },
      sincronizado_em: agora,
      updated_at: agora,
    }));

    // ---- Upsert em chunks ----
    let totalErros = 0;
    for (let i = 0; i < criancasParaCache.length; i += chunkSize) {
      const slice = criancasParaCache.slice(i, i + chunkSize);
      const { error: upsertError } = await supabase
        .from("cache_criancas")
        .upsert(slice, { onConflict: "external_id" });

      if (upsertError) {
        log("error", "upsert chunk error", { i, error: upsertError.message });
        totalErros++;
      }
    }

    // ---- Atualiza controle com a maior data ----
    const novaData = criancas.reduce(
      (max: string, item) => (item.updated_at > max ? item.updated_at : max),
      ultimaSync
    );

    const { error: controleUpsertError } = await supabase
      .from("sync_controle")
      .upsert(
        { entidade: "criancas", ultima_sincronizacao: novaData, updated_at: agora },
        { onConflict: "entidade" }
      );

    if (controleUpsertError) {
      log("error", "sync_controle update failed", { error: controleUpsertError.message });
    }

    // ---- Log de sincronização ----
    await supabase.from("logs_sincronizacao").insert({
      tipo: "sync_vagou_criancas",
      status: totalErros > 0 ? "parcial" : "sucesso",
      registros_processados: criancasParaCache.length,
      registros_erro: totalErros,
      detalhes: { ultima_sync_anterior: ultimaSync, nova_sync: novaData },
    });

    clearTimeout(t);
    log("info", "ok", { count: criancasRaw.length, erros: totalErros });

    return new Response(
      json({
        success: true,
        sincronizados: criancasRaw.length,
        erros: totalErros,
        ultima_sincronizacao: novaData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(json({ level: "error", rid, t: nowIso(), error: message }));
    return new Response(
      json({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS permissivo: reflete a origem da requisição. O endpoint é protegido por
// JWT + verificação de superadmin, então refletir a origem é seguro e evita
// bloqueios por allow-list de origens.
function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    Vary: "Origin",
  };
}

interface ListActivityRequest {
  action: "list-activity";
}

interface ImpersonateRequest {
  action: "impersonate";
  user_id: string;
}

type RequestBody = ListActivityRequest | ImpersonateRequest;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);

    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !caller) return json({ error: "Não autorizado" }, 401);

    // Apenas superadmin
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const isSuperAdmin = (callerRoles || []).some((r) => r.role === "superadmin");
    if (!isSuperAdmin) {
      return json({ error: "Acesso restrito ao Super Admin." }, 403);
    }

    const body: RequestBody = await req.json();

    switch (body.action) {
      case "list-activity": {
        // Lista todos os usuários do auth com metadados de sessão
        const users: any[] = [];
        let page = 1;
        const perPage = 1000;
        while (true) {
          const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
          if (error) return json({ error: error.message }, 500);
          users.push(...(data?.users || []));
          if (!data || data.users.length < perPage) break;
          page += 1;
          if (page > 20) break;
        }

        // Buscar nomes dos profiles
        const ids = users.map((u) => u.id);
        const profilesById: Record<string, { nome: string | null; avatar: string | null }> = {};
        if (ids.length > 0) {
          const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("id, nome_completo, avatar_url");
          (profiles || []).forEach((p) => {
            profilesById[p.id] = { nome: p.nome_completo, avatar: p.avatar_url };
          });
        }

        const result = users.map((u) => ({
          id: u.id,
          email: u.email,
          nome: profilesById[u.id]?.nome ?? null,
          avatar_url: profilesById[u.id]?.avatar ?? null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          email_confirmed_at: u.email_confirmed_at ?? null,
          banned_until: (u as any).banned_until ?? null,
        }));

        // ordenar por último login desc
        result.sort((a, b) => {
          const ta = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
          const tb = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
          return tb - ta;
        });

        return json({ users: result });
      }

      case "impersonate": {
        const { user_id } = body;
        if (!user_id) return json({ error: "user_id é obrigatório" }, 400);
        if (user_id === caller.id) return json({ error: "Você já está logado como este usuário." }, 400);

        const { data: target, error: targetError } = await supabaseAdmin.auth.admin.getUserById(user_id);
        if (targetError || !target?.user?.email) {
          return json({ error: "Usuário alvo não encontrado." }, 404);
        }

        // Impede impersonar outro superadmin
        const { data: targetRoles } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", user_id);
        if ((targetRoles || []).some((r) => r.role === "superadmin")) {
          return json({ error: "Não é permitido acessar como outro Super Admin." }, 403);
        }

        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: target.user.email,
        });

        if (linkError || !linkData?.properties?.hashed_token) {
          return json({ error: "Não foi possível gerar o acesso." }, 500);
        }

        // registrar auditoria best-effort
        try {
          await supabaseAdmin.from("auditoria").insert({
            usuario_id: caller.id,
            acao: "impersonate",
            entidade: "usuario",
            entidade_id: user_id,
            detalhes: { target_email: target.user.email },
          });
        } catch (_) { /* tabela opcional */ }

        return json({
          token_hash: linkData.properties.hashed_token,
          email: target.user.email,
          target: {
            id: user_id,
            email: target.user.email,
          },
        });
      }

      default:
        return json({ error: "Ação inválida" }, 400);
    }
  } catch (e) {
    console.error("superadmin-painel error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});

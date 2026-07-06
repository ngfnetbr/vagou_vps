import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error("Não autenticado");

    const { data: roleCheck } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["admin", "superadmin", "gestor"]);

    if (!roleCheck || roleCheck.length === 0) throw new Error("Apenas administradores podem listar usuários");

    // List all auth users
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw error;

    // Get profiles and roles
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, nome, cmei_id");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const { data: cacheUsers } = await supabaseAdmin.from("cache_usuarios").select("email, cmei_id, cmei_nome, cargo, external_id");

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
    const cacheMap = new Map(cacheUsers?.map(c => [c.email, c]) || []);

    const result = users.map(u => {
      const profile = profileMap.get(u.id);
      const role = roleMap.get(u.id);
      const cached = cacheMap.get(u.email);
      return {
        id: u.id,
        email: u.email,
        nome: profile?.nome || u.user_metadata?.nome || u.email,
        cmei_id: profile?.cmei_id || cached?.cmei_id || "",
        cmei_nome: cached?.cmei_nome || "",
        role: role || cached?.cargo || "",
        external_id: cached?.external_id || "",
        created_at: u.created_at,
      };
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

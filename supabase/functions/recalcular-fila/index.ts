import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Verificar se é admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Verificar role
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem recalcular a fila" }), {
        status: 403,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Chamar a função de recálculo
    const { error: rpcError } = await supabase.rpc("recalcular_posicoes_fila");
    
    if (rpcError) {
      throw rpcError;
    }

    // Buscar estatísticas atualizadas
    const { data: stats } = await supabase
      .from("criancas")
      .select("status, posicao_fila, data_penalidade, data_retorno_fila")
      .in("status", ["Fila de Espera", "Convocado"]);

    const totalNaFila = stats?.length || 0;
    const comPenalidade = stats?.filter(c => c.data_penalidade)?.length || 0;
    const reativados = stats?.filter(c => c.data_retorno_fila)?.length || 0;

    return new Response(
      JSON.stringify({
        sucesso: true,
        mensagem: "Posições recalculadas com sucesso!",
        estatisticas: {
          total_na_fila: totalNaFila,
          com_penalidade: comPenalidade,
          reativados: reativados,
        },
      }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro ao recalcular fila:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});

// @ts-nocheck
import { supabase } from "@sondagem/integrations/supabase/client";
import type { Json } from "@sondagem/integrations/supabase/types";

interface AuditEntry {
  acao: string;
  tabela: string;
  registro_id?: string;
  dados_antes?: Record<string, unknown> | null;
  dados_depois?: Record<string, unknown> | null;
  detalhes?: string;
}

export async function registrarAuditoria(entry: AuditEntry) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("audit_logs").insert([{
      user_id: user.id,
      user_email: user.email || "",
      acao: entry.acao,
      tabela: entry.tabela,
      registro_id: entry.registro_id || null,
      dados_antes: (entry.dados_antes as unknown as Json) || null,
      dados_depois: (entry.dados_depois as unknown as Json) || null,
      detalhes: entry.detalhes || null,
    }]);
  } catch (err) {
    console.error("Erro ao registrar auditoria:", err);
  }
}

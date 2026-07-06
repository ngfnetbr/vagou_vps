import { supabase } from "@/integrations/supabase/client";

// VAGOU só deve considerar unidades do tipo CMEI/creche.
// Escolas (tipo_unidade = 'escola') pertencem aos módulos SAM e Sondagem
// e NÃO devem aparecer nos gráficos/indicadores do VAGOU.
//
// O backend atual expõe RPCs (get_ocupacao_cmeis, bi_get_*_por_cmei) que
// retornam todas as unidades sem distinguir o tipo. Como não temos acesso
// administrativo para alterar essas funções, filtramos no cliente usando
// o conjunto de IDs de unidades cmei_creche.

let cache: { ids: Set<string>; ts: number } | null = null;
const TTL = 60_000;

export async function getCmeiCrecheIds(): Promise<Set<string>> {
  if (cache && Date.now() - cache.ts < TTL) return cache.ids;

  const { data, error } = await supabase
    .from("cmeis")
    .select("id, tipo_unidade")
    .eq("ativo", true);

  if (error) throw error;

  // Trata null/'' como cmei_creche (compatibilidade com registros antigos)
  const ids = new Set<string>(
    (data || [])
      .filter((c: any) => (c.tipo_unidade || "cmei_creche") === "cmei_creche")
      .map((c: any) => c.id as string),
  );

  cache = { ids, ts: Date.now() };
  return ids;
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@sondagem/integrations/supabase/client";

export interface HistoricoSondagem {
  id: string;
  periodo: string;
  status: string;
  observacoes: string | null;
  created_at: string | null;
  respostas: {
    nivel_id: string;
    codigo: string;
    descricao: string;
    tipo: string;
    ordem: number;
  }[];
}

interface HistoricoSondagemQueryRow {
  id: string;
  periodo: string;
  status: string;
  observacoes: string | null;
  created_at: string | null;
  respostas_sondagem: Array<{
    nivel_id: string;
    niveis_aprendizagem:
      | {
          id: string;
          codigo: string;
          descricao: string;
          tipo: string;
          ordem: number;
        }
      | null;
  }> | null;
}

export function useHistoricoSondagens(criancaId: string) {
  return useQuery({
    queryKey: ["historico-sondagens", criancaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sondagens")
        .select(`
          id, periodo, status, observacoes, created_at,
          respostas_sondagem(
            nivel_id,
            niveis_aprendizagem(id, codigo, descricao, tipo, ordem)
          )
        `)
        .eq("crianca_id", criancaId)
        .eq("status", "finalizado")
        .order("created_at", { ascending: true });

      if (error) throw error;

      return ((data || []) as HistoricoSondagemQueryRow[]).map((s) => ({
        id: s.id,
        periodo: s.periodo,
        status: s.status,
        observacoes: s.observacoes,
        created_at: s.created_at,
        respostas: (s.respostas_sondagem || []).map((r) => ({
          nivel_id: r.nivel_id,
          codigo: r.niveis_aprendizagem?.codigo || "",
          descricao: r.niveis_aprendizagem?.descricao || "",
          tipo: r.niveis_aprendizagem?.tipo || "",
          ordem: r.niveis_aprendizagem?.ordem || 0,
        })),
      })) as HistoricoSondagem[];
    },
    enabled: !!criancaId,
  });
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@sondagem/integrations/supabase/client";
import type { Tables } from "@sondagem/integrations/supabase/db";

export interface SondagemExistente {
  id: string;
  crianca_id: string;
  aplicador_id: string;
  aplicador_nome: string;
  modelo_id: string;
  periodo: string;
  observacoes: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  respostas: {
    nivel_id: string;
    tipo: string;
  }[];
}

type SondagemRow = Tables<"sondagens">;
type ProfileRow = Tables<"profiles">;
type RespostaRow = Tables<"respostas_sondagem">;
type NivelRow = Tables<"niveis_aprendizagem">;

type SondagemSelectRow = Pick<
  SondagemRow,
  | "id"
  | "crianca_id"
  | "aplicador_id"
  | "modelo_id"
  | "periodo"
  | "observacoes"
  | "status"
  | "created_at"
  | "updated_at"
>;

export function useSondagensExistentes(
  criancaIds: string[],
  periodoId: string,
  enabled = false
) {
  return useQuery({
    queryKey: ["sondagens-existentes", criancaIds.sort().join(","), periodoId],
    queryFn: async () => {
      if (criancaIds.length === 0 || !periodoId) return [];

      const { data: sondagens, error } = await supabase
        .from("sondagens")
        .select("id, crianca_id, aplicador_id, modelo_id, periodo, observacoes, status, created_at, updated_at")
        .in("crianca_id", criancaIds)
        .eq("periodo", periodoId)
        .eq("status", "finalizado");

      if (error) throw error;

      const rows = (sondagens || []) as SondagemSelectRow[];
      const aplicadorIds = [
        ...new Set(rows.map((s) => s.aplicador_id).filter((id): id is string => !!id)),
      ];
      const sondagemIds = [...new Set(rows.map((s) => s.id))];
      const nameMap = new Map<string, string>();
      const respostasPorSondagem = new Map<string, { nivel_id: string; tipo: string }[]>();

      if (aplicadorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nome")
          .in("id", aplicadorIds);
        (profiles as Array<Pick<ProfileRow, "id" | "nome">> | null | undefined)?.forEach((p) =>
          nameMap.set(p.id, p.nome || "Desconhecido"),
        );
      }

      if (sondagemIds.length > 0) {
        const { data: respostas, error: respostasError } = await supabase
          .from("respostas_sondagem")
          .select("sondagem_id, nivel_id")
          .in("sondagem_id", sondagemIds);
        if (respostasError) throw respostasError;

        const respostasRows = (respostas || []) as Array<Pick<RespostaRow, "sondagem_id" | "nivel_id">>;
        const nivelIds = [
          ...new Set(respostasRows.map((r) => r.nivel_id).filter((id): id is string => !!id)),
        ];
        const niveisMap = new Map<string, string>();

        if (nivelIds.length > 0) {
          const { data: niveis, error: niveisError } = await supabase
            .from("niveis_aprendizagem")
            .select("id, tipo")
            .in("id", nivelIds);
          if (niveisError) throw niveisError;
          (niveis as Array<Pick<NivelRow, "id" | "tipo">> | null | undefined)?.forEach((nivel) =>
            niveisMap.set(nivel.id, nivel.tipo || ""),
          );
        }

        respostasRows.forEach((resposta) => {
          const atual = respostasPorSondagem.get(resposta.sondagem_id) || [];
          atual.push({
            nivel_id: resposta.nivel_id,
            tipo: niveisMap.get(resposta.nivel_id) || "",
          });
          respostasPorSondagem.set(resposta.sondagem_id, atual);
        });
      }

      return rows.map((s) => ({
        id: s.id,
        crianca_id: s.crianca_id,
        aplicador_id: s.aplicador_id,
        aplicador_nome: nameMap.get(s.aplicador_id) || "Desconhecido",
        modelo_id: s.modelo_id,
        periodo: s.periodo,
        observacoes: s.observacoes,
        status: s.status,
        created_at: s.created_at,
        updated_at: s.updated_at,
        respostas: respostasPorSondagem.get(s.id) || [],
      })) as SondagemExistente[];
    },
    enabled: enabled && criancaIds.length > 0 && !!periodoId,
  });
}

// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@sondagem/integrations/supabase/client";
import { isMockAlunoId, metasSondagemMock, resultadosSondagemMock } from "@sondagem/data/mockData";
import { fetchPrincipalCriancas } from "@sondagem/lib/principalData";
import { chunkArray } from "@sondagem/lib/queryUtils";

interface RankingRespostaRow {
  sondagem_id: string;
  nivel_id: string;
}

export interface CMEIRanking {
  cmeiId: string;
  cmeiNome: string;
  totalAvaliados: number;
  atingiramMeta: number;
  percentual: number;
  metaNivel: string;
}

export function useDashboardRanking(scopeCmeiId?: string) {
  return useQuery({
    queryKey: ["dashboard-ranking", scopeCmeiId],
    queryFn: async () => {
      // 1. Get active metas (escrita type as primary)
      const { data: metas } = await supabase
        .from("metas_sondagem")
        .select("*")
        .eq("tipo", "escrita");

      // 2. Get all niveis for ordem comparison
      const { data: niveis } = await supabase
        .from("niveis_aprendizagem")
        .select("*")
        .eq("ativo", true)
        .eq("tipo", "escrita");

      if (!niveis) return [];

      const metasBase = metas && metas.length > 0
        ? metas
        : metasSondagemMock.filter((item) => item.tipo === "escrita").map((item) => ({
            periodo_codigo: item.periodoCodigo,
            nivel_codigo: item.nivelCodigo,
          }));

      if (metasBase.length === 0) return [];

      const nivelByCode = new Map(niveis.map(n => [n.codigo, n]));

      // 3. Get finalized sondagens with respostas
      const { data: sondagens } = await supabase
        .from("sondagens")
        .select("id, crianca_id, periodo")
        .eq("status", "finalizado");

      if (!sondagens || sondagens.length === 0) {
        const criancasMock = await fetchPrincipalCriancas(scopeCmeiId ? { cmeiId: scopeCmeiId } : undefined);
        const usingMockData = criancasMock.length > 0 && criancasMock.every((item) => isMockAlunoId(item.id));
        if (!usingMockData) return [];

        const nivelByCodeMock = new Map(niveis.map((n) => [n.codigo, n]));
        const meta = metasBase[0];
        const metaNivel = meta ? nivelByCodeMock.get(meta.nivel_codigo) : null;
        if (!metaNivel) return [];

        const statMap = new Map<string, { nome: string; total: number; atingiram: number }>();
        resultadosSondagemMock
          .filter((item) => criancasMock.some((crianca) => crianca.id === item.alunoId))
          .forEach((item) => {
            const crianca = criancasMock.find((current) => current.id === item.alunoId);
            const nivel = nivelByCodeMock.get(item.nivelEscritaCodigo);
            if (!crianca || !nivel) return;

            const current = statMap.get(crianca.cmei_id) || { nome: crianca.cmei_nome, total: 0, atingiram: 0 };
            current.total += 1;
            if (nivel.ordem >= metaNivel.ordem) current.atingiram += 1;
            statMap.set(crianca.cmei_id, current);
          });

        return Array.from(statMap.entries())
          .map(([cmeiId, stat]) => ({
            cmeiId,
            cmeiNome: stat.nome,
            totalAvaliados: stat.total,
            atingiramMeta: stat.atingiram,
            percentual: stat.total > 0 ? Math.round((stat.atingiram / stat.total) * 100) : 0,
            metaNivel: metasBase[0]?.nivel_codigo || "",
          }))
          .sort((a, b) => b.percentual - a.percentual);
      }

      // 4. Get criancas for CMEI mapping
      const criancaIds = [...new Set(sondagens.map(s => s.crianca_id))];
      const criancas = await fetchPrincipalCriancas(scopeCmeiId ? { ids: criancaIds, cmeiId: scopeCmeiId } : { ids: criancaIds });

      if (!criancas) return [];

      const criancaMap = new Map(criancas.map(c => [c.id, c]));
      const usingMockData = criancas.length > 0 && criancas.every((item) => isMockAlunoId(item.id));

      // 5. Get respostas with nivel info
      const sondagemIds = sondagens.map(s => s.id);
      const respostasChunks = await Promise.all(
        chunkArray(sondagemIds, 500).map(async (idsChunk) => {
          const { data, error } = await supabase
            .from("respostas_sondagem")
            .select("sondagem_id, nivel_id")
            .in("sondagem_id", idsChunk);

          if (error) throw error;
          return (data || []) as RankingRespostaRow[];
        }),
      );
      const respostas = respostasChunks.flat();

      if (!respostas.length) return [];

      const nivelById = new Map(niveis.map(n => [n.id, n]));

      // 6. Build per-CMEI stats
      // For each sondagem, find the escrita nivel and check against the meta
      const sondagemMap = new Map(sondagens.map(s => [s.id, s]));

      // Group: cmei -> { total, atingiram }
      const cmeiStats = new Map<string, { nome: string; total: number; atingiram: number }>();

      // Use the first meta as reference (or match by periodo)
      for (const resp of respostas) {
        const sond = sondagemMap.get(resp.sondagem_id);
        if (!sond) continue;

        const crianca = criancaMap.get(sond.crianca_id);
        if (!crianca || !crianca.cmei_id) continue;

        const nivel = nivelById.get(resp.nivel_id);
        if (!nivel) continue;

        // Find matching meta for this periodo
        const meta = metasBase.find(m => m.periodo_codigo === sond.periodo) || metasBase[0];
        if (!meta) continue;

        const metaNivel = nivelByCode.get(meta.nivel_codigo);
        if (!metaNivel) continue;

        if (!cmeiStats.has(crianca.cmei_id)) {
          cmeiStats.set(crianca.cmei_id, { nome: crianca.cmei_nome || "Sem nome", total: 0, atingiram: 0 });
        }

        const stat = cmeiStats.get(crianca.cmei_id)!;
        stat.total++;
        if (nivel.ordem >= metaNivel.ordem) {
          stat.atingiram++;
        }
      }

      // 7. Build ranking sorted by percentual desc
      const ranking: CMEIRanking[] = Array.from(cmeiStats.entries())
        .map(([cmeiId, stat]) => ({
          cmeiId,
          cmeiNome: stat.nome,
          totalAvaliados: stat.total,
          atingiramMeta: stat.atingiram,
          percentual: stat.total > 0 ? Math.round((stat.atingiram / stat.total) * 100) : 0,
          metaNivel: metasBase[0]?.nivel_codigo || "",
        }))
        .sort((a, b) => b.percentual - a.percentual);

      if (ranking.length === 0 && usingMockData) {
        const statMap = new Map<string, { nome: string; total: number; atingiram: number }>();
        const meta = metasBase[0];
        const metaNivel = meta ? nivelByCode.get(meta.nivel_codigo) : null;

        resultadosSondagemMock
          .filter((item) => criancaMap.has(item.alunoId))
          .forEach((item) => {
            const crianca = criancaMap.get(item.alunoId);
            const nivel = nivelByCode.get(item.nivelEscritaCodigo);
            if (!crianca || !nivel || !metaNivel) return;

            const current = statMap.get(crianca.cmei_id) || { nome: crianca.cmei_nome, total: 0, atingiram: 0 };
            current.total += 1;
            if (nivel.ordem >= metaNivel.ordem) current.atingiram += 1;
            statMap.set(crianca.cmei_id, current);
          });

        return Array.from(statMap.entries())
          .map(([cmeiId, stat]) => ({
            cmeiId,
            cmeiNome: stat.nome,
            totalAvaliados: stat.total,
            atingiramMeta: stat.atingiram,
            percentual: stat.total > 0 ? Math.round((stat.atingiram / stat.total) * 100) : 0,
            metaNivel: metasBase[0]?.nivel_codigo || "",
          }))
          .sort((a, b) => b.percentual - a.percentual);
      }

      return ranking;
    },
  });
}

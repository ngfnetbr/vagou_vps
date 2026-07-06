import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { eachMonthOfInterval, format, subDays, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { encontrarZonasEndereco, type ZonaAtendimento } from "@/hooks/api/zonas-hooks";
import { buildBIRpcParams, resolveBIStatusList, type BIFiltros, type BIPeriodo } from "./bi-filters";
import { getCmeiCrecheIds } from "./cmei-tipo-filter";

export type { BIFiltros, BIPeriodo, BIStatusFiltro, BIZonaFiltro, BITurnoFiltro } from "./bi-filters";
export { buildBIRpcParams, resolveBIStatusList } from "./bi-filters";

// Ocupação por CMEI para gráfico de barras
export const useOcupacaoPorCMEI = () => {
  return useQuery({
    queryKey: ["dashboard-ocupacao-cmei"],
    queryFn: async () => {
      const [{ data, error }, crecheIds] = await Promise.all([
        supabase.rpc("get_ocupacao_cmeis"),
        getCmeiCrecheIds(),
      ]);
      if (error) throw error;

      return (data || [])
        .filter((item: any) => crecheIds.has(item.id))
        .map((item: any) => {
        const capacidade = Number(item.capacidade_total) || 0;
        const ocupados = Number(item.ocupados) || 0;
        const percentual =
          typeof item.percentual === "number"
            ? item.percentual
            : capacidade > 0
              ? Math.round((ocupados / capacidade) * 100)
              : 0;

        return {
          nome: item.nome,
          ocupados,
          capacidade,
          percentual,
          vagas: capacidade - ocupados,
        };
      });
    },
  });
};

// Evolução da fila ao longo do ano
export const useEvolucaoFila = () => {
  return useQuery({
    queryKey: ["dashboard-evolucao-fila"],
    queryFn: async () => {
      const hoje = new Date();
      const meses = eachMonthOfInterval({ start: subMonths(hoje, 11), end: hoje });

      const { data, error } = await supabase
        .from("criancas")
        .select("created_at")
        .eq("status", "Fila de Espera");

      if (error) throw error;

      const timestamps = (data || [])
        .map((row: any) => (row?.created_at ? new Date(row.created_at).getTime() : NaN))
        .filter((t: number) => Number.isFinite(t))
        .sort((a: number, b: number) => a - b);

      let idx = 0;
      return meses.map((mes) => {
        const fimMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
        while (idx < timestamps.length && timestamps[idx] <= fimMes) idx += 1;

        return {
          mes: format(mes, "MMM", { locale: ptBR }),
          quantidade: idx,
        };
      });
    },
  });
};

// Distribuição por status para gráfico de pizza
export const useMatriculasPorStatus = () => {
  return useQuery({
    queryKey: ["dashboard-status-distribuicao"],
    queryFn: async () => {
      const status = [
        "Fila de Espera",
        "Convocado",
        "Matriculado",
        "Matriculada",
        "Desistente",
        "Recusada",
      ];

      const { data, error } = await supabase
        .from("criancas")
        .select("status")
        .in("status", status as any);

      if (error) throw error;

      const counts: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        const st = row?.status;
        if (typeof st === "string") counts[st] = (counts[st] || 0) + 1;
      });

      return status
        .map((st) => ({ status: st, quantidade: counts[st] || 0 }))
        .filter((d) => d.quantidade > 0);
    },
  });
};

// Convocações mensais para gráfico de área
export const useConvocacoesMensais = () => {
  return useQuery({
    queryKey: ["dashboard-convocacoes-mensais"],
    queryFn: async () => {
      const hoje = new Date();
      const meses = eachMonthOfInterval({ start: subMonths(hoje, 11), end: hoje });

      const inicioPeriodo = new Date(meses[0].getFullYear(), meses[0].getMonth(), 1, 0, 0, 0, 0);
      const fimPeriodo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999);

      const { data, error } = await supabase
        .from("criancas")
        .select("data_convocacao")
        .eq("status", "Convocado")
        .not("data_convocacao", "is", null)
        .gte("data_convocacao", inicioPeriodo.toISOString())
        .lte("data_convocacao", fimPeriodo.toISOString());

      if (error) throw error;

      const byMonthKey: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        if (!row?.data_convocacao) return;
        const d = new Date(row.data_convocacao);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        byMonthKey[key] = (byMonthKey[key] || 0) + 1;
      });

      return meses.map((mes) => {
        const key = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, "0")}`;
        return {
          mes: format(mes, "MMM", { locale: ptBR }),
          quantidade: byMonthKey[key] || 0,
        };
      });
    },
  });
};

export const useDistribuicaoSexo = () => {
  return useQuery({
    queryKey: ["dashboard-sexo-distribuicao"],
    queryFn: async () => {
      const { data, error } = await supabase.from("criancas").select("sexo");
      if (error) throw error;

      let masculino = 0;
      let feminino = 0;
      (data || []).forEach((row: any) => {
        if (row?.sexo === "Masculino") masculino += 1;
        if (row?.sexo === "Feminino") feminino += 1;
      });

      return [
        { sexo: "Masculino", quantidade: masculino },
        { sexo: "Feminino", quantidade: feminino },
      ].filter((item) => item.quantidade > 0);
    },
  });
};

const getPeriodoStart = (periodo: BIPeriodo) => {
  if (periodo === "30d") return subDays(new Date(), 30);
  if (periodo === "90d") return subDays(new Date(), 90);
  if (periodo === "365d") return subDays(new Date(), 365);
  return null;
};

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
};

const fetchCriancasPaginado = async (select: string, periodo: BIPeriodo, statuses?: string[]) => {
  const inicio = getPeriodoStart(periodo);
  const pageSize = 5000;
  let from = 0;
  const rows: any[] = [];

  for (;;) {
    let query = supabase.from("criancas").select(select).range(from, from + pageSize - 1);

    if (statuses?.length) {
      query = query.in("status", statuses as any);
    }

    if (inicio) {
      query = query.gte("created_at", inicio.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    const batch = data || [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return rows;
};

export const useBIDemandaPorCMEI = (filtros: BIFiltros) => {
  return useQuery({
    queryKey: ["bi-demanda-por-cmei", filtros],
    queryFn: async () => {
      const params = buildBIRpcParams(filtros);
      try {
        const [{ data, error }, crecheIds] = await Promise.all([
          supabase.rpc("bi_get_demanda_por_cmei" as any, params as any),
          getCmeiCrecheIds(),
        ]);
        if (error) throw error;
        return (data || [])
          .filter((row: any) => crecheIds.has(row.cmei_id))
          .map((row: any) => ({
          cmeiId: row.cmei_id,
          pref1: Number(row.pref1) || 0,
          pref2: Number(row.pref2) || 0,
          pref3: Number(row.pref3) || 0,
          score: Number(row.score) || 0,
        }));
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (!msg.toLowerCase().includes("bi_get_demanda_por_cmei") && !msg.toLowerCase().includes("does not exist")) {
          throw err;
        }

        const statuses = resolveBIStatusList(filtros.status) ?? undefined;
        const criancas = await fetchCriancasPaginado(
          "cmei1_preferencia,cmei2_preferencia,cmei3_preferencia,status",
          filtros.periodo,
          statuses,
        );

        const byCmei: Record<
          string,
          { cmeiId: string; pref1: number; pref2: number; pref3: number; score: number }
        > = {};

        const add = (cmeiId: string, key: "pref1" | "pref2" | "pref3", weight: number) => {
          const entry = byCmei[cmeiId] || { cmeiId, pref1: 0, pref2: 0, pref3: 0, score: 0 };
          entry[key] += 1;
          entry.score += weight;
          byCmei[cmeiId] = entry;
        };

        for (const row of criancas) {
          if (filtros.cmeiId !== "all") {
            const foco = filtros.cmeiId;
            const hasFoco =
              row?.cmei1_preferencia === foco || row?.cmei2_preferencia === foco || row?.cmei3_preferencia === foco;
            if (!hasFoco) continue;
          }

          if (row?.cmei1_preferencia) add(row.cmei1_preferencia, "pref1", 2);
          if (row?.cmei2_preferencia) add(row.cmei2_preferencia, "pref2", 1);
          if (row?.cmei3_preferencia) add(row.cmei3_preferencia, "pref3", 0.5);
        }

        const crecheIds = await getCmeiCrecheIds();
        const rows = Object.values(byCmei)
          .filter((r) => crecheIds.has(r.cmeiId))
          .sort((a, b) => b.score - a.score);
        if (filtros.cmeiId !== "all") return rows.filter((r) => r.cmeiId === filtros.cmeiId);
        return rows;
      }
    },
    staleTime: 60000,
  });
};

export const useBIDemandaPorZona = (filtros: BIFiltros) => {
  return useQuery({
    queryKey: ["bi-demanda-por-zona", filtros],
    queryFn: async () => {
      const params = buildBIRpcParams(filtros);
      try {
        const { data, error } = await supabase.rpc("bi_get_demanda_por_zona" as any, params as any);
        if (error) throw error;
        return (data || []).map((row: any) => ({
          zonaId: row.zona_key,
          nome: row.nome,
          cor: row.cor,
          quantidade: Number(row.quantidade) || 0,
        }));
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (!msg.toLowerCase().includes("bi_get_demanda_por_zona") && !msg.toLowerCase().includes("does not exist")) {
          throw err;
        }

        const statuses = resolveBIStatusList(filtros.status) ?? undefined;
        const [{ data: zonas, error: zonasError }, criancas] = await Promise.all([
          supabase.from("zonas_atendimento").select("*").eq("ativo", true),
          fetchCriancasPaginado("bairro,cep,cmei1_preferencia,cmei2_preferencia,cmei3_preferencia", filtros.periodo, statuses),
        ]);

        if (zonasError) throw zonasError;
        const zonasAtivas = ((zonas || []) as any[]).map((z) => ({
          id: z.id,
          nome: z.nome,
          descricao: z.descricao ?? null,
          cor: z.cor || "#64748b",
          bairros: z.bairros ?? null,
          ceps: z.ceps ?? null,
          poligono: z.poligono ?? null,
          ativo: z.ativo ?? true,
          created_at: z.created_at || "",
          updated_at: z.updated_at || "",
        })) as ZonaAtendimento[];

        const byZona: Record<string, { zonaId: string; nome: string; cor: string; quantidade: number }> = {};
        for (const z of zonasAtivas) {
          byZona[z.id] = { zonaId: z.id, nome: z.nome, cor: z.cor, quantidade: 0 };
        }

        let semZona = 0;
        for (const row of criancas) {
          if (filtros.cmeiId !== "all") {
            const foco = filtros.cmeiId;
            const hasFoco =
              row?.cmei1_preferencia === foco || row?.cmei2_preferencia === foco || row?.cmei3_preferencia === foco;
            if (!hasFoco) continue;
          }

          const bairro = row?.bairro ?? null;
          const cep = row?.cep ?? null;
          const matches = encontrarZonasEndereco(bairro, cep, zonasAtivas);
          if (!matches.length) {
            semZona += 1;
            continue;
          }
          for (const z of matches) {
            if (!byZona[z.id]) continue;
            byZona[z.id].quantidade += 1;
          }
        }

        const result = Object.values(byZona)
          .filter((i) => i.quantidade > 0)
          .sort((a, b) => b.quantidade - a.quantidade);

        if (semZona > 0) {
          result.push({ zonaId: "__sem_zona__", nome: "Sem zona", cor: "#64748b", quantidade: semZona });
        }

        if (filtros.zonaId === "__sem_zona__") return result.filter((r) => r.zonaId === "__sem_zona__");
        if (filtros.zonaId !== "all") return result.filter((r) => r.zonaId === filtros.zonaId);

        return result;
      }
    },
    staleTime: 60000,
  });
};

export const useBIDemandaPorBairro = (filtros: BIFiltros) => {
  return useQuery({
    queryKey: ["bi-demanda-por-bairro", filtros],
    queryFn: async () => {
      const params = buildBIRpcParams(filtros);
      try {
        const { data, error } = await supabase.rpc("bi_get_demanda_por_bairro" as any, params as any);
        if (error) throw error;
        return (data || []).map((row: any) => ({
          bairro: row.bairro,
          quantidade: Number(row.quantidade) || 0,
        }));
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (!msg.toLowerCase().includes("bi_get_demanda_por_bairro") && !msg.toLowerCase().includes("does not exist")) {
          throw err;
        }

        const statuses = resolveBIStatusList(filtros.status) ?? undefined;
        const criancas = await fetchCriancasPaginado("bairro,cmei1_preferencia,cmei2_preferencia,cmei3_preferencia", filtros.periodo, statuses);

        const byBairro: Record<string, number> = {};
        let semBairro = 0;

        for (const row of criancas) {
          if (filtros.cmeiId !== "all") {
            const foco = filtros.cmeiId;
            const hasFoco =
              row?.cmei1_preferencia === foco || row?.cmei2_preferencia === foco || row?.cmei3_preferencia === foco;
            if (!hasFoco) continue;
          }

          const bairro = normalizeText(row?.bairro);
          if (!bairro) {
            semBairro += 1;
            continue;
          }
          if (filtros.bairro?.trim()) {
            const term = normalizeText(filtros.bairro);
            if (!bairro.includes(term)) continue;
          }
          byBairro[bairro] = (byBairro[bairro] || 0) + 1;
        }

        const result = Object.entries(byBairro)
          .map(([bairro, quantidade]) => ({ bairro, quantidade }))
          .sort((a, b) => b.quantidade - a.quantidade);

        if (semBairro > 0) {
          result.push({ bairro: "__sem_bairro__", quantidade: semBairro });
        }

        return result;
      }
    },
    staleTime: 60000,
  });
};

export const useBIDemandaPorTurnoInteresse = (filtros: BIFiltros) => {
  return useQuery({
    queryKey: ["bi-demanda-por-periodo", filtros],
    queryFn: async () => {
      const params = buildBIRpcParams(filtros);
      try {
        const { data, error } = await supabase.rpc("bi_get_demanda_por_turno" as any, params as any);
        if (error) throw error;
        return (data || []).map((row: any) => ({
          periodoTurno: row.turno,
          quantidade: Number(row.quantidade) || 0,
        }));
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (!msg.toLowerCase().includes("bi_get_demanda_por_turno") && !msg.toLowerCase().includes("does not exist")) {
          throw err;
        }

        const statuses = resolveBIStatusList(filtros.status) ?? undefined;
        const [{ data: campos, error: camposError }, criancas] = await Promise.all([
          supabase
            .from("campos_inscricao")
            .select("id,nome_campo,label,ativo")
            .eq("ativo", true)
            .or(
              "nome_campo.eq.periodo,nome_campo.eq.turno,nome_campo.ilike.%turno%,label.ilike.%turno%,nome_campo.ilike.%period%,label.ilike.%periodo%,label.ilike.%período%",
            ),
          fetchCriancasPaginado("id,cmei1_preferencia,cmei2_preferencia,cmei3_preferencia", filtros.periodo, statuses),
        ]);

        if (camposError) throw camposError;

        const prioridade = (c: { nome_campo: string | null; label: string | null }) => {
          const nome = (c.nome_campo || "").toLowerCase();
          const label = (c.label || "").toLowerCase();
          if (nome === "periodo") return 0;
          if (nome === "turno") return 1;
          if (nome.includes("turno")) return 2;
          if (nome.includes("period")) return 3;
          if (label.includes("turno")) return 4;
          if (label.includes("período") || label.includes("periodo") || label.includes("period")) return 5;
          return 9;
        };

        const campo = (campos || [])
          .filter((c: any) => !!c?.id)
          .sort((a: any, b: any) => prioridade(a) - prioridade(b))[0];

        if (!campo?.id) return [];

        const criancaIds = (criancas || [])
          .filter((c: any) => {
            if (filtros.cmeiId === "all") return true;
            const foco = filtros.cmeiId;
            return c?.cmei1_preferencia === foco || c?.cmei2_preferencia === foco || c?.cmei3_preferencia === foco;
          })
          .map((c: any) => c.id)
          .filter(Boolean) as string[];
        if (criancaIds.length === 0) return [];

        const byPeriodo: Record<string, number> = {};
        const idsBatchSize = 500;
        let semPeriodo = 0;

        for (let i = 0; i < criancaIds.length; i += idsBatchSize) {
          const batchIds = criancaIds.slice(i, i + idsBatchSize);
          const { data: valores, error: valoresError } = await supabase
            .from("valores_campos_custom")
            .select("crianca_id,valor")
            .eq("campo_id", campo.id)
            .in("crianca_id", batchIds);

          if (valoresError) throw valoresError;

          const byCrianca = new Map<string, string>();
          (valores || []).forEach((v: any) => {
            if (!v?.crianca_id) return;
            if (typeof v?.valor !== "string") return;
            byCrianca.set(v.crianca_id, v.valor);
          });

          batchIds.forEach((id) => {
            const val = normalizeText(byCrianca.get(id));
            if (!val) {
              semPeriodo += 1;
              return;
            }
            if (filtros.turno === "__sem_periodo__") return;
            if (filtros.turno !== "all") {
              const target = normalizeText(filtros.turno);
              if (val !== target) return;
            }
            byPeriodo[val] = (byPeriodo[val] || 0) + 1;
          });
        }

        const result = Object.entries(byPeriodo)
          .map(([periodoTurno, quantidade]) => ({ periodoTurno, quantidade }))
          .sort((a, b) => b.quantidade - a.quantidade);

        if (semPeriodo > 0) {
          result.push({ periodoTurno: "__sem_periodo__", quantidade: semPeriodo });
        }

        return result;
      }
    },
    staleTime: 60000,
  });
};

export const useBIStatusDistribuicao = (filtros: BIFiltros) => {
  return useQuery({
    queryKey: ["bi-status-distribuicao", filtros],
    queryFn: async () => {
      const params = buildBIRpcParams(filtros);
      try {
        const { data, error } = await supabase.rpc("bi_get_status_distribuicao" as any, params as any);
        if (error) throw error;
        return (data || []).map((row: any) => ({
          status: row.status,
          quantidade: Number(row.quantidade) || 0,
        }));
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (!msg.toLowerCase().includes("bi_get_status_distribuicao") && !msg.toLowerCase().includes("does not exist")) {
          throw err;
        }

        const statuses = resolveBIStatusList(filtros.status) ?? undefined;
        const criancas = await fetchCriancasPaginado("status,cmei1_preferencia,cmei2_preferencia,cmei3_preferencia", filtros.periodo, statuses);

        const counts: Record<string, number> = {};
        let semStatus = 0;

        for (const row of criancas) {
          if (filtros.cmeiId !== "all") {
            const foco = filtros.cmeiId;
            const hasFoco =
              row?.cmei1_preferencia === foco || row?.cmei2_preferencia === foco || row?.cmei3_preferencia === foco;
            if (!hasFoco) continue;
          }

          const st = row?.status;
          if (typeof st !== "string" || !st.trim()) {
            semStatus += 1;
            continue;
          }
          counts[st] = (counts[st] || 0) + 1;
        }

        const result = Object.entries(counts)
          .map(([status, quantidade]) => ({ status, quantidade }))
          .sort((a, b) => b.quantidade - a.quantidade);

        if (semStatus > 0) {
          result.push({ status: "Sem status", quantidade: semStatus });
        }

        return result;
      }
    },
    staleTime: 60000,
  });
};

export const useBINovasInscricoesMensal = (filtros: BIFiltros) => {
  return useQuery({
    queryKey: ["bi-novas-inscricoes-mensal", filtros],
    queryFn: async () => {
      const params = buildBIRpcParams(filtros);
      try {
        const { data, error } = await supabase.rpc("bi_get_novas_inscricoes_mensal" as any, params as any);
        if (error) throw error;
        return (data || []).map((row: any) => ({
          mes: (() => {
            const d = row?.mes ? new Date(row.mes) : null;
            if (d && Number.isFinite(d.getTime())) return format(d, "MMM", { locale: ptBR });
            return String(row?.mes || "");
          })(),
          quantidade: Number(row.quantidade) || 0,
        }));
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (!msg.toLowerCase().includes("bi_get_novas_inscricoes_mensal") && !msg.toLowerCase().includes("does not exist")) {
          throw err;
        }

        const hoje = new Date();
        const meses = eachMonthOfInterval({ start: subMonths(hoje, 11), end: hoje });
        const inicio = new Date(meses[0].getFullYear(), meses[0].getMonth(), 1, 0, 0, 0, 0);

        const statuses = resolveBIStatusList(filtros.status) ?? undefined;
        const rows = await fetchCriancasPaginado("created_at,cmei1_preferencia,cmei2_preferencia,cmei3_preferencia", "365d", statuses);
        const byMonthKey: Record<string, number> = {};

        (rows || []).forEach((row: any) => {
          if (filtros.cmeiId !== "all") {
            const foco = filtros.cmeiId;
            const hasFoco =
              row?.cmei1_preferencia === foco || row?.cmei2_preferencia === foco || row?.cmei3_preferencia === foco;
            if (!hasFoco) return;
          }

          if (!row?.created_at) return;
          const d = new Date(row.created_at);
          if (!(d instanceof Date) || Number.isNaN(d.getTime())) return;
          if (d < inicio) return;
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          byMonthKey[key] = (byMonthKey[key] || 0) + 1;
        });

        return meses.map((mes) => {
          const key = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, "0")}`;
          return {
            mes: format(mes, "MMM", { locale: ptBR }),
            quantidade: byMonthKey[key] || 0,
          };
        });
      }
    },
    staleTime: 60000,
  });
};

export const useBIMediaDiasNaFilaPorCMEI = (filtros: BIFiltros) => {
  return useQuery({
    queryKey: ["bi-media-dias-fila-por-cmei", filtros],
    queryFn: async () => {
      const params = buildBIRpcParams(filtros);
      try {
        const [{ data, error }, crecheIds] = await Promise.all([
          supabase.rpc("bi_get_media_dias_fila_por_cmei" as any, params as any),
          getCmeiCrecheIds(),
        ]);
        if (error) throw error;
        return (data || [])
          .filter((row: any) => crecheIds.has(row.cmei_id))
          .map((row: any) => ({
          cmeiId: row.cmei_id,
          quantidade: Number(row.quantidade) || 0,
          mediaDias: Number(row.media_dias) || 0,
          maxDias: Number(row.max_dias) || 0,
        }));
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (!msg.toLowerCase().includes("bi_get_media_dias_fila_por_cmei") && !msg.toLowerCase().includes("does not exist")) {
          throw err;
        }

        const statuses = resolveBIStatusList(filtros.status) ?? ["Fila de Espera", "Convocado"];
        const criancas = await fetchCriancasPaginado(
          "created_at,cmei1_preferencia,cmei2_preferencia,cmei3_preferencia",
          filtros.periodo,
          statuses,
        );

        const now = Date.now();
        const byCmei: Record<string, { cmeiId: string; count: number; totalDays: number; maxDays: number }> = {};

        for (const row of criancas) {
          if (filtros.cmeiId !== "all") {
            const foco = filtros.cmeiId;
            const hasFoco =
              row?.cmei1_preferencia === foco || row?.cmei2_preferencia === foco || row?.cmei3_preferencia === foco;
            if (!hasFoco) continue;
          }

          const cmeiId = row?.cmei1_preferencia;
          const createdAt = row?.created_at;
          if (!cmeiId || typeof cmeiId !== "string") continue;
          if (!createdAt || typeof createdAt !== "string") continue;
          const t = new Date(createdAt).getTime();
          if (!Number.isFinite(t)) continue;

          const days = Math.max(0, Math.floor((now - t) / (1000 * 60 * 60 * 24)));
          const entry = byCmei[cmeiId] || { cmeiId, count: 0, totalDays: 0, maxDays: 0 };
          entry.count += 1;
          entry.totalDays += days;
          entry.maxDays = Math.max(entry.maxDays, days);
          byCmei[cmeiId] = entry;
        }

        const crecheIds = await getCmeiCrecheIds();
        const rows = Object.values(byCmei)
          .filter((e) => crecheIds.has(e.cmeiId))
          .map((e) => ({
            cmeiId: e.cmeiId,
            quantidade: e.count,
            mediaDias: e.count > 0 ? Math.round((e.totalDays / e.count) * 10) / 10 : 0,
            maxDias: e.maxDays,
          }))
          .sort((a, b) => b.mediaDias - a.mediaDias);

        if (filtros.cmeiId !== "all") return rows.filter((r) => r.cmeiId === filtros.cmeiId);
        return rows;
      }
    },
    staleTime: 60000,
  });
};

export const useBIConvocadosPorCMEI = (filtros: BIFiltros) => {
  return useQuery({
    queryKey: ["bi-convocados-por-cmei", filtros],
    queryFn: async () => {
      const params = buildBIRpcParams({ ...filtros, status: "convocado" });
      try {
        const [{ data, error }, crecheIds] = await Promise.all([
          supabase.rpc("bi_get_convocados_por_cmei" as any, params as any),
          getCmeiCrecheIds(),
        ]);
        if (error) throw error;
        return (data || [])
          .filter((row: any) => crecheIds.has(row.cmei_id))
          .map((row: any) => ({
          cmeiId: row.cmei_id,
          quantidade: Number(row.quantidade) || 0,
        }));
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (!msg.toLowerCase().includes("bi_get_convocados_por_cmei") && !msg.toLowerCase().includes("does not exist")) {
          throw err;
        }

        const criancas = await fetchCriancasPaginado(
          "cmei1_preferencia,cmei2_preferencia,cmei3_preferencia",
          filtros.periodo,
          ["Convocado"],
        );

        const byCmei: Record<string, number> = {};
        for (const row of criancas) {
          if (filtros.cmeiId !== "all") {
            const foco = filtros.cmeiId;
            const hasFoco =
              row?.cmei1_preferencia === foco || row?.cmei2_preferencia === foco || row?.cmei3_preferencia === foco;
            if (!hasFoco) continue;
          }

          const cmeiId = row?.cmei1_preferencia;
          if (!cmeiId || typeof cmeiId !== "string") continue;
          byCmei[cmeiId] = (byCmei[cmeiId] || 0) + 1;
        }

        const crecheIds = await getCmeiCrecheIds();
        const rows = Object.entries(byCmei)
          .filter(([cmeiId]) => crecheIds.has(cmeiId))
          .map(([cmeiId, quantidade]) => ({ cmeiId, quantidade }))
          .sort((a, b) => b.quantidade - a.quantidade);

        if (filtros.cmeiId !== "all") return rows.filter((r) => r.cmeiId === filtros.cmeiId);
        return rows;
      }
    },
    staleTime: 60000,
  });
};

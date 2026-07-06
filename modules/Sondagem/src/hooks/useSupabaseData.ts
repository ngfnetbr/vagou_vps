import { useQuery } from "@tanstack/react-query";
import { supabase } from "@sondagem/integrations/supabase/client";
import {
  isMockAlunoId,
  modelosSondagem,
  niveisEscrita,
  niveisProducaoTexto,
  periodos as mockPeriodos,
  resultadosSondagemMock,
} from "@sondagem/data/mockData";
import {
  fetchPrincipalCmeis,
  fetchPrincipalCriancas,
  fetchPrincipalTurmas,
  type PrincipalCrianca,
} from "@sondagem/lib/principalData";
import { useAuth } from "@root/contexts/AuthContext";
import type { Tables } from "@sondagem/integrations/supabase/db";

export interface CMEIOption { id: string; nome: string; }
export interface TurmaOption { id: string; nome: string; cmeiId: string; }
export interface AlunoData {
  id: string;
  nome: string;
  dataNascimento: string;
  turma: string;
  cmei: string;
  cmeiNome: string;
  turmaNome: string;
}
export interface NivelData {
  id: string;
  codigo: string;
  descricao: string;
  ordem: number;
  tipo: string;
  ativo: boolean;
}
export interface ResultadoSondagem {
  alunoId: string;
  nivelEscritaCodigo: string;
  nivelProducaoCodigo: string;
  periodo: string;
}

type NivelRow = Tables<"niveis_aprendizagem">;
type PeriodoRow = Tables<"periodos">;

interface SondagemRelatorioRow {
  id: string;
  crianca_id: string;
  periodo: string;
  observacoes: string | null;
  respostas_sondagem: Array<{
    nivel_id: string;
    niveis_aprendizagem: {
      codigo: string;
      descricao: string;
      tipo: string;
    } | null;
  }> | null;
}

export function useCMEIs(scopeCmeiId?: string) {
  return useQuery({
    queryKey: ["cmeis", scopeCmeiId],
    queryFn: async () => {
      const principalCmeis = await fetchPrincipalCmeis();
      return (principalCmeis || [])
        .map((item) => ({ id: item.id, nome: item.nome }))
        .filter((item) => !scopeCmeiId || item.id === scopeCmeiId)
        .sort((a, b) => a.nome.localeCompare(b.nome)) as CMEIOption[];
    },
  });
}

export function useTurmas(cmeiId?: string) {
  return useQuery({
    queryKey: ["turmas", cmeiId],
    queryFn: async () => {
      const principalTurmas = await fetchPrincipalTurmas(cmeiId);
      return (principalTurmas || [])
        .map((item) => ({ id: item.id, nome: item.nome, cmeiId: item.cmei_id || "" }))
        .filter((item) => !cmeiId || item.cmeiId === cmeiId)
        .sort((a, b) => a.nome.localeCompare(b.nome)) as TurmaOption[];
    },
  });
}

export function useNiveis() {
  const { user, loading } = useAuth();
  return useQuery({
    queryKey: ["niveis"],
    queryFn: async () => {
      const query = supabase
        .from("niveis_aprendizagem")
        .select("*")
        .eq("ativo", true)
        .order("ordem");
      const { data, error } = await query;
      if (error) throw error;
      const mapped = ((data || []) as NivelRow[]).map((n) => {
        const t = typeof n.tipo === "string" ? n.tipo.toLowerCase() : "";
        const tipo =
          t.includes("produc") ? "producao_texto" :
          t.includes("escrit") ? "escrita" :
          n.tipo;
        const codigo = typeof n.codigo === "string" ? n.codigo.trim().toUpperCase() : n.codigo;
        return { ...n, tipo, codigo } as NivelData;
      });
      // Deduplicar por (tipo, codigo) mantendo menor ordem
      const uniq = new Map<string, NivelData>();
      for (const n of mapped) {
        const key = `${n.tipo}|${(n.codigo || "").toUpperCase()}`;
        const prev = uniq.get(key);
        if (!prev || (n.ordem ?? 999) < (prev.ordem ?? 999)) uniq.set(key, n);
      }
      const uniqueRows = Array.from(uniq.values()) as NivelData[];
      if (uniqueRows.length > 0) {
        return uniqueRows;
      }

      return [...niveisEscrita, ...niveisProducaoTexto] as NivelData[];
    },
    enabled: !loading && !!user,
  });
}

export function useAlunos(cmeiId?: string, turmaId?: string, enabled = true) {
  return useQuery({
    queryKey: ["alunos", cmeiId, turmaId],
    queryFn: async () => {
      const principalData = await fetchPrincipalCriancas({ cmeiId, turmaId });
      return (principalData || [])
        .filter((d: PrincipalCrianca) => !cmeiId || d.cmei_id === cmeiId)
        .filter((d: PrincipalCrianca) => !turmaId || d.turma_id === turmaId)
        .map((d: PrincipalCrianca) => ({
          id: d.id,
          nome: d.nome,
          dataNascimento: d.data_nascimento || "",
          turma: d.turma_id || "",
          cmei: d.cmei_id || "",
          cmeiNome: d.cmei_nome || "",
          turmaNome: d.turma_nome || "",
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome)) as AlunoData[];
    },
    enabled,
  });
}

export function useModelos() {
  const { user, loading } = useAuth();
  return useQuery({
    queryKey: ["modelos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modelos_sondagem")
        .select("id, nome, descricao, ativo")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      if ((data || []).length > 0) {
        return data || [];
      }
      return modelosSondagem
        .filter((item) => item.ativo)
        .map((item) => ({
          id: item.id,
          nome: item.nome,
          descricao: item.descricao,
          ativo: item.ativo,
        }));
    },
    enabled: !loading && !!user,
  });
}

export function useDashboardStats(scopeCmeiId?: string) {
  return useQuery({
    queryKey: ["dashboard-stats", scopeCmeiId],
    queryFn: async () => {
      const principalCriancas = await fetchPrincipalCriancas(scopeCmeiId ? { cmeiId: scopeCmeiId } : undefined);
      const criancaIds = principalCriancas.map((item) => item.id);
      const criancaIdSet = new Set(criancaIds);
      const usingMockData = principalCriancas.length > 0 && principalCriancas.every((item) => isMockAlunoId(item.id));

      const sondagensBaseQ = supabase.from("sondagens").select("crianca_id, id").eq("status", "finalizado");
      const niveisQ = supabase.from("niveis_aprendizagem").select("id", { count: "exact", head: true }).eq("ativo", true);

      const [{ count: niveisAtivos }, { data: sondagensData }] = await Promise.all([
        niveisQ,
        sondagensBaseQ,
      ]);
      const sondagens = ((sondagensData || []) as { id: string; crianca_id: string }[])
        .filter((item) => criancaIdSet.size === 0 || criancaIdSet.has(item.crianca_id));

      if (usingMockData && sondagens.length === 0) {
        const resultadosMock = resultadosSondagemMock.filter((item) => criancaIdSet.has(item.alunoId));
        const avaliados = new Set(resultadosMock.map((item) => item.alunoId)).size;
        const alfabetizados = resultadosMock.filter((item) => ["A", "ALF"].includes(item.nivelEscritaCodigo)).length;

        return {
          totalCriancas: principalCriancas.length,
          avaliados,
          pendentes: Math.max(0, principalCriancas.length - avaliados),
          alfabetizados,
          percentAlfabetizados: avaliados > 0 ? Math.round((alfabetizados / avaliados) * 100) : 0,
          niveisAtivos: (niveisAtivos || 0) || niveisEscrita.length + niveisProducaoTexto.length,
          recentSondagens: resultadosMock
            .slice()
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 5)
            .map((item) => ({
              id: `${item.alunoId}-${item.periodo}`,
              criancaNome: principalCriancas.find((crianca) => crianca.id === item.alunoId)?.nome || "Aluno",
              periodo: item.periodo,
              created_at: item.createdAt,
              status: "finalizado",
            })),
        };
      }

      const avaliados = new Set(sondagens.map(s => s.crianca_id)).size;
      const pendentes = Math.max(0, principalCriancas.length - avaliados);

      // Check for 'ALF' nivel (alfabético)
      const { data: nivelA } = await supabase
        .from("niveis_aprendizagem")
        .select("id")
        .eq("codigo", "ALF")
        .eq("tipo", "escrita")
        .maybeSingle();

      let alfabetizados = 0;
      if (nivelA && sondagens && sondagens.length > 0) {
        const sondagemIds = sondagens.map(s => s.id);
        const { data: respostasA } = await supabase
          .from("respostas_sondagem")
          .select("sondagem_id")
          .eq("nivel_id", nivelA.id)
          .in("sondagem_id", sondagemIds);
        alfabetizados = new Set(respostasA?.map(r => r.sondagem_id)).size;
      }

      const percentAlfabetizados = avaliados > 0 ? Math.round((alfabetizados / avaliados) * 100) : 0;

      // Recent sondagens
      const recentSondagensQ = supabase
        .from("sondagens")
        .select("id, crianca_id, periodo, created_at, status")
        .order("created_at", { ascending: false })
        .limit(5);
      const { data: recentSondagens } = await recentSondagensQ;

      let recentWithNames: { id: string; criancaNome: string; periodo: string; created_at: string | null; status: string }[] = [];
      const recentCriancaIds = (recentSondagens?.map(s => s.crianca_id) || []).filter((id) => criancaIdSet.has(id));
      if (recentCriancaIds.length > 0) {
        const criancas = await fetchPrincipalCriancas({ ids: recentCriancaIds });
        const nameMap = new Map(criancas?.map(c => [c.id, c.nome]) || []);
        recentWithNames = (recentSondagens || [])
          .filter((item) => criancaIdSet.has(item.crianca_id))
          .map(s => ({
          id: s.id,
          criancaNome: nameMap.get(s.crianca_id) || "Desconhecido",
          periodo: s.periodo,
          created_at: s.created_at,
          status: s.status,
        }));
      }

      return {
        totalCriancas: principalCriancas.length,
        avaliados,
        pendentes,
        alfabetizados,
        percentAlfabetizados,
        niveisAtivos: niveisAtivos || 0,
        recentSondagens: recentWithNames,
      };
    },
  });
}

export function useSondagensRelatorio(periodoId: string) {
  return useQuery({
    queryKey: ["relatorio-sondagens", periodoId],
    queryFn: async () => {
      // Fetch sondagens with nested respostas -> niveis
      const { data, error } = await supabase
        .from("sondagens")
        .select(`
          id, crianca_id, periodo, observacoes,
          respostas_sondagem(
            nivel_id,
            niveis_aprendizagem(codigo, descricao, tipo)
          )
        `)
        .eq("periodo", periodoId)
        .eq("status", "finalizado");

      if (error) throw error;

      return ((data || []) as SondagemRelatorioRow[]).map((s) => {
        const respostas = s.respostas_sondagem || [];
        const escritaResp = respostas.find((r) => r.niveis_aprendizagem?.tipo === "escrita");
        const producaoResp = respostas.find((r) => r.niveis_aprendizagem?.tipo === "producao_texto");
        return {
          alunoId: s.crianca_id,
          nivelEscritaCodigo: escritaResp?.niveis_aprendizagem?.codigo || "",
          nivelProducaoCodigo: producaoResp?.niveis_aprendizagem?.codigo || "",
          periodo: s.periodo,
        } as ResultadoSondagem;
      });
    },
    enabled: !!periodoId,
  });
}

export interface AuthUser {
  id: string;
  email: string;
  nome: string;
  cmei_id: string;
  cmei_nome: string;
  role: string;
  external_id: string;
  created_at: string;
}

export function useAuthUsers() {
  return useQuery({
    queryKey: ["auth-users"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("list-users");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return (data || []) as AuthUser[];
    },
  });
}

export function useCacheUsuarios() {
  return useQuery({
    queryKey: ["cache-usuarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cache_usuarios")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useSyncLogs(limit = 10) {
  return useQuery({
    queryKey: ["sync-logs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logs_sincronizacao")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
  });
}

export interface PeriodoOption {
  id: string;
  nome: string;
  codigo: string;
  inicio_em?: string | null;
  fim_em?: string | null;
  fechado_em?: string | null;
  isOpen: boolean;
}

export function usePeriodos(options?: { onlyOpen?: boolean }) {
  const { user, loading } = useAuth();
  const onlyOpen = !!options?.onlyOpen;
  return useQuery({
    queryKey: ["periodos", onlyOpen ? "open" : "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("periodos")
        .select("*")
        .eq("ativo", true)
        .order("codigo");
      if (error) throw error;
      const now = Date.now();
      const mapped = ((data || []) as PeriodoRow[]).map((p) => {
        const inicio = p.inicio_em ? new Date(p.inicio_em).getTime() : null;
        const fim = p.fim_em ? new Date(p.fim_em).getTime() : null;
        const isOpen = !p.fechado_em && (!inicio || now >= inicio) && (!fim || now < fim);
        return {
          id: p.codigo,
          nome: p.nome,
          codigo: p.codigo,
          inicio_em: p.inicio_em ?? null,
          fim_em: p.fim_em ?? null,
          fechado_em: p.fechado_em ?? null,
          isOpen,
        } as PeriodoOption;
      });
      const periodosBase = mapped.length > 0
        ? mapped
        : mockPeriodos.map((p, index) => ({
            id: p.id,
            nome: p.nome,
            codigo: p.id,
            inicio_em: null,
            fim_em: null,
            fechado_em: null,
            isOpen: index === 0,
          } as PeriodoOption));
      return onlyOpen ? periodosBase.filter((p) => p.isOpen) : periodosBase;
    },
    enabled: !loading && !!user,
  });
}

export function useAuditLogs(limit = 50) {
  return useQuery({
    queryKey: ["audit-logs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
  });
}

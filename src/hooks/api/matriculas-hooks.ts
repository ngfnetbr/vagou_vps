import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
type StatusCrianca = string;

interface MatriculasFilters {
  search?: string;
  cmei?: string;
  turma?: string;
  status?: string;
}

// Statuses que representam matrículas ativas
const MATRICULAS_ATIVAS_STATUS: StatusCrianca[] = [
  "Matriculado",
  "Matriculada", 
  "Convocado",
  "Remanejamento Solicitado"
];

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const collapseSearchText = (value: unknown) => normalizeText(value).replace(/[^a-z0-9]/g, "");

export function useMatriculas(filters?: MatriculasFilters) {
  return useQuery({
    queryKey: ["matriculas-ativas", filters],
    queryFn: async () => {
      const buildQuery = () => {
        let query = supabase
          .from("criancas")
          .select(`
            *,
            cmei_atual:cmeis!criancas_cmei_atual_id_fkey(id, nome, tipo_unidade),
            turma_atual:turmas!criancas_turma_atual_id_fkey(id, nome, turno, turma_base),
            cmei1:cmeis!criancas_cmei1_preferencia_fkey(id, nome),
            cmei2:cmeis!criancas_cmei2_preferencia_fkey(id, nome),
            cmei_remanejamento:cmeis!criancas_cmei_remanejamento_id_fkey(id, nome)
          `)
          .in("status", MATRICULAS_ATIVAS_STATUS)
          .order("nome", { ascending: true });

        if (filters?.cmei && filters.cmei !== "all") {
          query = query.eq("cmei_atual_id", filters.cmei);
        }

        if (filters?.turma && filters.turma !== "all") {
          query = query.eq("turma_atual_id", filters.turma);
        }

        if (filters?.status && filters.status !== "all" && filters.status !== "Remanejamento Solicitado") {
          query = query.eq("status", filters.status as StatusCrianca);
        }

        return query;
      };

      const pageSize = 1000;
      const maxRows = 20000;
      const allData: any[] = [];

      for (let from = 0; from < maxRows; from += pageSize) {
        const to = from + pageSize - 1;
        const { data, error } = await buildQuery().range(from, to);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < pageSize) break;
      }

      let filteredData = allData;
      filteredData = filteredData.filter((c) => (c.cmei_atual?.tipo_unidade || "cmei_creche") === "cmei_creche");
      
      // Filtro especial para remanejamento: inclui quem tem cmei_remanejamento_id OU status "Remanejamento Solicitado"
      if (filters?.status === "Remanejamento Solicitado") {
        filteredData = filteredData.filter(c => 
          c.cmei_remanejamento_id !== null || c.status === "Remanejamento Solicitado"
        );
      }
      
      if (filters?.search && filters.search.trim() !== "") {
        const searchLower = normalizeText(filters.search);
        const searchCollapsed = collapseSearchText(filters.search);
        const searchDigits = String(filters.search).replace(/\D/g, "");
        filteredData = filteredData.filter(c => 
          normalizeText(c.nome).includes(searchLower) ||
          normalizeText(c.responsavel_nome).includes(searchLower) ||
          (searchCollapsed !== "" &&
            (collapseSearchText(c.nome).includes(searchCollapsed) ||
              collapseSearchText(c.responsavel_nome).includes(searchCollapsed))) ||
          (searchDigits !== "" &&
            String(c.responsavel_cpf ?? "")
              .replace(/\D/g, "")
              .includes(searchDigits))
        );
      }

      return filteredData;
    },
  });
}

// Histórico de matrículas encerradas - apenas quem ESTAVA matriculado e saiu
// Não inclui quem nunca foi matriculado (recusas de convocação, etc.)
// Não inclui quem ainda está ativo na listagem de matrículas
export function useHistoricoMatriculas() {
  return useQuery({
    queryKey: ["historico-matriculas-encerradas"],
    queryFn: async () => {
      // Ações que representam saída de uma matrícula ativa
      const acoesMatriculaEncerrada = [
        "Desistência de Matrícula",
        "Transferência para Outro Município",
        "Transição Anual - Conclusão",
        "Transição Anual - Desistência",
        "Concluinte",
      ];

      const { data, error } = await supabase
        .from("historico")
        .select(`
          *,
          crianca:criancas(id, nome, responsavel_nome, status)
        `)
        .in("acao", acoesMatriculaEncerrada)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      // Filtra para mostrar apenas crianças que NÃO estão mais ativas
      // (não estão em Matriculado, Matriculada, Convocado ou Remanejamento Solicitado)
      const statusAtivos = ["Matriculado", "Matriculada", "Convocado", "Remanejamento Solicitado"];
      
      const filteredData = data?.filter(item => {
        const statusAtual = item.crianca?.status;
        // Só mostra no histórico se a criança NÃO está mais ativa
        return statusAtual && !statusAtivos.includes(statusAtual);
      });

      return filteredData || [];
    },
  });
}

export function useMatriculasStats() {
  return useQuery({
    queryKey: ["matriculas-stats"],
    queryFn: async () => {
      const pageSize = 1000;
      const maxRows = 20000;
      const allData: any[] = [];

      for (let from = 0; from < maxRows; from += pageSize) {
        const to = from + pageSize - 1;
        const { data, error } = await supabase
          .from("criancas")
          .select("status, cmei_remanejamento_id, cmei_atual:cmeis!criancas_cmei_atual_id_fkey(tipo_unidade)")
          .in("status", MATRICULAS_ATIVAS_STATUS)
          .range(from, to);

        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...(data as any));
        if (data.length < pageSize) break;
      }

      const stats = {
        totalMatriculados: 0,
        totalConvocados: 0,
        totalRemanejamentos: 0,
      };

      allData.forEach(c => {
        if ((c.cmei_atual?.tipo_unidade || "cmei_creche") !== "cmei_creche") {
          return;
        }
        // Conta como remanejamento se tem cmei_remanejamento_id OU status "Remanejamento Solicitado"
        if (c.cmei_remanejamento_id || c.status === "Remanejamento Solicitado") {
          stats.totalRemanejamentos++;
        } else if (c.status === "Matriculado" || c.status === "Matriculada") {
          stats.totalMatriculados++;
        } else if (c.status === "Convocado") {
          stats.totalConvocados++;
        }
      });

      return stats;
    },
  });
}

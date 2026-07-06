import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CriancaVinculada {
  id: string;
  nome: string;
  status: string;
  tipo?: string; // 'atual' | 'preferencia1' | 'preferencia2' | 'remanejamento'
}

export interface CriancasVinculadasResult {
  count: number;
  criancas: CriancaVinculada[];
  countMatriculadas: number;
  countPreferencias: number;
  countTurmas: number;
}

// Get children linked to a CMEI (atual, preferencias e remanejamento)
export const useCriancasVinculadasCMEI = (cmeiId: string | null) => {
  return useQuery({
    queryKey: ["criancas-vinculadas-cmei", cmeiId],
    queryFn: async () => {
      if (!cmeiId) return { count: 0, criancas: [], countMatriculadas: 0, countPreferencias: 0, countTurmas: 0 };

      // Buscar crianças com cmei_atual_id
      const { data: atuais, error: errorAtuais, count: countAtuais } = await supabase
        .from("criancas")
        .select("id, nome, status", { count: "exact" })
        .eq("cmei_atual_id", cmeiId)
        .limit(5);

      if (errorAtuais) throw errorAtuais;

      // Buscar crianças com preferência 1 (apenas na fila de espera)
      const { data: pref1, error: errorPref1, count: countPref1 } = await supabase
        .from("criancas")
        .select("id, nome, status", { count: "exact" })
        .eq("cmei1_preferencia", cmeiId)
        .in("status", ["Fila de Espera", "Convocado"])
        .limit(3);

      if (errorPref1) throw errorPref1;

      // Buscar crianças com preferência 2 (apenas na fila de espera)
      const { data: pref2, error: errorPref2, count: countPref2 } = await supabase
        .from("criancas")
        .select("id, nome, status", { count: "exact" })
        .eq("cmei2_preferencia", cmeiId)
        .in("status", ["Fila de Espera", "Convocado"])
        .limit(3);

      if (errorPref2) throw errorPref2;

      // Buscar turmas vinculadas
      const { count: countTurmas, error: errorTurmas } = await supabase
        .from("turmas")
        .select("*", { count: "exact", head: true })
        .eq("cmei_id", cmeiId);

      if (errorTurmas) throw errorTurmas;

      const criancasAtuais = (atuais || []).map(c => ({ ...c, tipo: 'atual' }));
      const criancasPref1 = (pref1 || []).map(c => ({ ...c, tipo: 'preferencia1' }));
      const criancasPref2 = (pref2 || []).map(c => ({ ...c, tipo: 'preferencia2' }));
      
      // Remove duplicates by id
      const allCriancas = [...criancasAtuais, ...criancasPref1, ...criancasPref2];
      const uniqueCriancas = allCriancas.filter((c, index, self) => 
        index === self.findIndex(t => t.id === c.id)
      );

      const countMatriculadas = countAtuais || 0;
      const countPreferencias = (countPref1 || 0) + (countPref2 || 0);

      return { 
        count: countMatriculadas + (countTurmas || 0), // Bloqueia se tem crianças OU turmas
        criancas: uniqueCriancas as CriancaVinculada[],
        countMatriculadas,
        countPreferencias,
        countTurmas: countTurmas || 0
      };
    },
    enabled: !!cmeiId,
  });
};

// Get children linked to a Turma
export const useCriancasVinculadasTurma = (turmaId: string | null) => {
  return useQuery({
    queryKey: ["criancas-vinculadas-turma", turmaId],
    queryFn: async () => {
      if (!turmaId) return { count: 0, criancas: [] };

      const { data, error, count } = await supabase
        .from("criancas")
        .select("id, nome, status", { count: "exact" })
        .eq("turma_atual_id", turmaId)
        .limit(10);

      if (error) throw error;
      return { 
        count: count || 0, 
        criancas: (data || []) as CriancaVinculada[] 
      };
    },
    enabled: !!turmaId,
  });
};

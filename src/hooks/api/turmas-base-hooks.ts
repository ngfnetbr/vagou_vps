import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TurmaBase {
  id: string;
  nome: string;
  idade_minima_meses: number;
  idade_maxima_meses: number;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// Get all turmas base
export const useTurmasBase = () => {
  return useQuery({
    queryKey: ["turmas-base"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("turmas_base")
        .select("*")
        .order("ordem");

      if (error) throw error;
      return data as TurmaBase[];
    },
  });
};

// Create turma base
export const useCreateTurmaBase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (turmaBase: Omit<TurmaBase, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("turmas_base")
        .insert(turmaBase)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["turmas-base"] });
      toast.success("Turma base criada com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar turma base: " + error.message);
    },
  });
};

// Update turma base
export const useUpdateTurmaBase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TurmaBase> & { id: string }) => {
      const { data, error } = await supabase
        .from("turmas_base")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["turmas-base"] });
      toast.success("Turma base atualizada com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar turma base: " + error.message);
    },
  });
};

// Check if turma base is in use
export const useCheckTurmaBaseInUse = (turmaBaseNome: string | undefined) => {
  return useQuery({
    queryKey: ["turma-base-usage", turmaBaseNome],
    queryFn: async () => {
      if (!turmaBaseNome) return { turmasCount: 0, turmas: [] };

      const { data, error, count } = await supabase
        .from("turmas")
        .select("id, nome, cmeis(nome)", { count: "exact" })
        .eq("turma_base", turmaBaseNome)
        .limit(5);

      if (error) throw error;
      return { turmasCount: count || 0, turmas: data || [] };
    },
    enabled: !!turmaBaseNome,
  });
};

// Delete turma base (hard delete)
export const useDeleteTurmaBase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      // Check if any turmas are using this turma_base (active or inactive)
      const { count: turmasUsando, error: countError } = await supabase
        .from("turmas")
        .select("*", { count: "exact", head: true })
        .eq("turma_base", nome);

      if (countError) throw countError;

      if (turmasUsando && turmasUsando > 0) {
        throw new Error(`Não é possível excluir esta turma base porque existem ${turmasUsando} turma(s) (ativas ou inativas) utilizando este modelo. Remova ou altere as turmas antes de excluir.`);
      }

      const { error } = await supabase
        .from("turmas_base")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["turmas-base"] });
      toast.success("Turma base removida permanentemente!");
    },
    onError: (error: any) => {
      console.error("Erro ao excluir turma base:", error);
      toast.error(error.message || "Erro ao excluir turma base");
    },
  });
};
